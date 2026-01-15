/**
 * Transaction Post-Processing Utility
 * Centralized helper for saving transactions and awarding points
 * Ensures consistency across all transaction types
 */

import { logger } from '../analytics/loggingService';
import { FeeService, TransactionType } from '../../config/constants/feeConfig';

// ✅ CRITICAL: Request deduplication map to prevent race conditions
// Key: transaction signature, Value: Promise that resolves when save completes
// This prevents multiple simultaneous calls with the same signature from creating duplicates
const pendingTransactionSaves = new Map<string, Promise<{
  transactionSaved: boolean;
  pointsAwarded: boolean;
  error?: string;
}>>();

export interface TransactionPostProcessingParams {
  userId: string;
  toAddress: string;
  /** Full transaction amount (before fees) - used for point calculation */
  amount: number;
  signature: string;
  transactionType: TransactionType;
  companyFee?: number;
  netAmount?: number;
  memo?: string;
  groupId?: string;
  currency?: 'USDC' | 'SOL';
}

/**
 * Save transaction to Firestore and award points (if applicable)
 * This ensures all transaction types follow the same pattern
 * 
 * ✅ CRITICAL: Uses request deduplication to prevent race conditions
 * Multiple simultaneous calls with the same signature will share the same promise
 */
export async function saveTransactionAndAwardPoints(
  params: TransactionPostProcessingParams
): Promise<{
  transactionSaved: boolean;
  pointsAwarded: boolean;
  error?: string;
}> {
  // ✅ CRITICAL: Deduplicate simultaneous saves for the same transaction signature
  // This prevents race conditions where multiple calls check before either saves
  const signature = params.signature;
  
  // ✅ ATOMIC: Check if promise exists, if not create and store atomically
  // This prevents race condition where two calls both check before either sets
  let existingPromise = pendingTransactionSaves.get(signature);
  if (existingPromise) {
    logger.debug('Transaction save already in progress for this signature, waiting...', {
      signature: signature.substring(0, 16) + '...',
      userId: params.userId,
      transactionType: params.transactionType
    }, 'TransactionPostProcessing');
    return await existingPromise;
  }

  // ✅ CRITICAL: Create promise and store it IMMEDIATELY in one atomic operation
  // The promise is created synchronously and stored before any async operations
  // This ensures that if two calls happen simultaneously, only one creates the promise
  const savePromise = (async () => {
  const result = {
    transactionSaved: false,
    pointsAwarded: false,
    error: undefined as string | undefined
  };

  try {
    // Calculate fees if not provided
    let companyFee = params.companyFee;
    let netAmount = params.netAmount;
    
    if (companyFee === undefined || netAmount === undefined) {
      const feeCalculation = FeeService.calculateCompanyFee(params.amount, params.transactionType);
      companyFee = companyFee ?? feeCalculation.fee;
      netAmount = netAmount ?? feeCalculation.recipientAmount;
    }

    // Save transaction to Firestore
    try {
      const { firebaseDataService } = await import('../data/firebaseDataService');
      
      // ✅ OPTIMIZATION: For split flows, skip recipient lookup (split wallets aren't user wallets)
      // This prevents memory-intensive queries and OOM crashes
      const isSplitFlow =
        params.transactionType === 'split_payment' ||
        params.transactionType === 'split_wallet_withdrawal';
      let recipientUser = null;
      let recipientUserId = params.toAddress;
      
      if (!isSplitFlow) {
        // Only lookup recipient for non-split payments
        try {
          recipientUser = await firebaseDataService.user.getUserByWalletAddress(params.toAddress);
          recipientUserId = recipientUser ? recipientUser.id.toString() : params.toAddress;
        } catch (lookupError) {
          logger.warn('Could not lookup recipient user (non-critical)', {
            toAddress: params.toAddress.substring(0, 10) + '...',
            error: lookupError instanceof Error ? lookupError.message : String(lookupError)
          }, 'TransactionPostProcessing');
          // Continue with wallet address as recipient ID
        }
      } else {
        logger.debug('Skipping recipient lookup for split flow (optimization)', {
          toAddress: params.toAddress.substring(0, 10) + '...',
          transactionType: params.transactionType
        }, 'TransactionPostProcessing');
      }

      // Get user's wallet address for transaction record
      // ✅ OPTIMIZATION: For split flows, use cached wallet info or skip if not critical
      let fromWalletAddress = params.toAddress; // Fallback (will be overridden)
      if (!isSplitFlow) {
        // Only fetch wallet for non-split payments to reduce memory usage
        try {
          const { walletService } = await import('../blockchain/wallet');
          const walletResult = await walletService.ensureUserWallet(params.userId);
          if (walletResult.success && walletResult.wallet?.address) {
            fromWalletAddress = walletResult.wallet.address;
          }
        } catch (walletError) {
          logger.warn('Could not get user wallet address for transaction record', {
            userId: params.userId,
            error: walletError instanceof Error ? walletError.message : String(walletError)
          }, 'TransactionPostProcessing');
        }
      } else {
        // For split flows, try to get from simplified service (lighter weight)
        try {
          const { simplifiedWalletService } = await import('../blockchain/wallet/simplifiedWalletService');
          const walletInfo = await simplifiedWalletService.getWalletInfo(params.userId);
          if (walletInfo?.address) {
            fromWalletAddress = walletInfo.address;
          }
        } catch (walletError) {
          // Non-critical for split payments - use fallback
          logger.debug('Could not get wallet address for split payment (using fallback)', {
            userId: params.userId
          }, 'TransactionPostProcessing');
        }
      }

      // Create sender transaction record
      // Map transaction types to Firestore transaction types
      let firestoreTransactionType: 'send' | 'receive' | 'deposit' | 'withdraw';
      if (params.transactionType === 'deposit') {
        firestoreTransactionType = 'deposit';
      } else if (params.transactionType === 'external_payment' || params.transactionType === 'withdraw' || params.transactionType === 'split_wallet_withdrawal') {
        firestoreTransactionType = 'withdraw';
      } else {
        firestoreTransactionType = 'send';
      }
      
      // ✅ CRITICAL: Check if transaction with this signature already exists to prevent duplicates
      // Use direct Firestore query by tx_hash for reliability (not just recent transactions)
      // This prevents race conditions where multiple calls check before either saves
      let existingTransaction: Transaction | null = null;
      try {
        // ✅ FIX: Pass userId to satisfy Firestore security rules (must filter by user)
        existingTransaction = await firebaseDataService.transaction.getTransactionBySignature(params.signature, params.userId);
        
        if (existingTransaction) {
          logger.warn('⚠️ Transaction with this signature already exists, skipping duplicate save', {
            signature: params.signature,
            existingTransactionId: existingTransaction.id,
            existingFromUser: existingTransaction.from_user,
            existingToUser: existingTransaction.to_user,
            existingAmount: existingTransaction.amount,
            userId: params.userId,
            transactionType: params.transactionType,
            note: 'This transaction was already saved. Possible causes: retry, race condition, or duplicate call.'
          }, 'TransactionPostProcessing');
          result.transactionSaved = true; // Mark as saved since it already exists
          // Continue to award points if needed (points might not have been awarded yet)
        } else {
          // Transaction doesn't exist, create it
      const senderTransactionData = {
        type: firestoreTransactionType,
        amount: params.amount,
        currency: params.currency || 'USDC',
        from_user: params.userId,
        to_user: recipientUserId,
        from_wallet: fromWalletAddress,
        to_wallet: params.toAddress,
        tx_hash: params.signature,
        note: params.memo || `${params.transactionType} transfer`,
        status: 'completed' as const,
        group_id: params.groupId || null,
        company_fee: companyFee,
        net_amount: netAmount,
        gas_fee: 0, // Gas fees are covered by the company
        blockchain_network: 'solana',
        confirmation_count: 0,
        block_height: 0
      };

      await firebaseDataService.transaction.createTransaction(senderTransactionData);
      result.transactionSaved = true;
        }
      } catch (duplicateCheckError) {
        // If duplicate check fails, this is a critical error - don't save to prevent duplicates
        logger.error('❌ CRITICAL: Failed to check for duplicate transaction - NOT saving to prevent potential duplicates', {
          signature: params.signature,
          error: duplicateCheckError instanceof Error ? duplicateCheckError.message : String(duplicateCheckError),
          errorStack: duplicateCheckError instanceof Error ? duplicateCheckError.stack : undefined,
          note: 'Transaction will need to be saved manually or retried after fixing the duplicate check'
        }, 'TransactionPostProcessing');
        
        // Don't save if we can't check for duplicates - this prevents creating duplicates
        result.error = `Failed to verify transaction uniqueness: ${duplicateCheckError instanceof Error ? duplicateCheckError.message : String(duplicateCheckError)}`;
        throw duplicateCheckError; // Re-throw to prevent saving
      }

      // Log transaction save status (only if actually saved, not if duplicate)
      if (result.transactionSaved) {
      logger.info('✅ Transaction saved to database', {
        signature: params.signature,
        userId: params.userId,
        transactionType: params.transactionType,
        amount: params.amount
      }, 'TransactionPostProcessing');
      }

      // Award points for internal transfers only (not external or withdrawals)
      // Points are awarded for: send, payment_request, settlement
      // Points are NOT awarded for: split flows, external_payment, withdraw, split_wallet_withdrawal
      // ✅ OPTIMIZATION: Skip points for split flows to reduce memory usage (points can be awarded later)
      const shouldAwardPoints = 
        !isSplitFlow && (
          params.transactionType === 'send' ||
          params.transactionType === 'payment_request' ||
          params.transactionType === 'settlement'
        );

      if (shouldAwardPoints && recipientUser) {
        // This is an internal wallet-to-wallet transfer, award points
        // ✅ CRITICAL: params.amount should be the FULL transaction amount (before fees)
        // Points are calculated as a percentage of the full amount, not the net amount
        try {
          const { pointsService } = await import('../rewards/pointsService');
          const pointsResult = await pointsService.awardTransactionPoints(
            params.userId,
            params.amount, // Full transaction amount (before fees)
            params.signature,
            'send'
          );

          if (pointsResult.success) {
            result.pointsAwarded = true;
            logger.info('✅ Points awarded for transaction', {
              userId: params.userId,
              pointsAwarded: pointsResult.pointsAwarded,
              totalPoints: pointsResult.totalPoints,
              transactionAmount: params.amount,
              transactionType: params.transactionType
            }, 'TransactionPostProcessing');
          } else {
            logger.warn('⚠️ Failed to award points for transaction', {
              userId: params.userId,
              error: pointsResult.error,
              transactionType: params.transactionType
            }, 'TransactionPostProcessing');
          }
        } catch (pointsError) {
          logger.error('❌ Error awarding points for transaction', pointsError, 'TransactionPostProcessing');
          // Don't fail the transaction if points award fails
        }
      } else if (shouldAwardPoints && !recipientUser) {
        logger.info('ℹ️ Points not awarded - recipient is not a registered user', {
          userId: params.userId,
          toAddress: params.toAddress,
          transactionType: params.transactionType
        }, 'TransactionPostProcessing');
      } else {
        logger.info('ℹ️ Points not awarded - transaction type does not qualify', {
          userId: params.userId,
          transactionType: params.transactionType
        }, 'TransactionPostProcessing');
      }

      // Create recipient transaction record (only if recipient is a registered user)
      // For deposits, create a 'receive' record for the recipient
      // For withdrawals/external payments, don't create recipient records (they're going to external wallets)
      // ✅ OPTIMIZATION: Skip recipient record for split flows (split wallets don't need receive records)
      if (recipientUser && 
          !isSplitFlow &&
          params.transactionType !== 'external_payment' && 
          params.transactionType !== 'withdraw' && 
          params.transactionType !== 'split_wallet_withdrawal') {
        try {
          // ✅ CRITICAL: Check if recipient transaction already exists using direct query
          const existingRecipientTransaction = await firebaseDataService.transaction.getRecipientTransactionBySignature(params.signature, recipientUserId);
          
          if (existingRecipientTransaction) {
            logger.warn('⚠️ Recipient transaction with this signature already exists, skipping duplicate save', {
              signature: params.signature,
              existingTransactionId: existingRecipientTransaction.id,
              recipientUserId,
              transactionType: params.transactionType,
              note: 'Recipient transaction was already saved. Possible causes: retry, race condition, or duplicate call.'
            }, 'TransactionPostProcessing');
          } else {
          const recipientTransactionData = {
            type: 'receive' as const,
            amount: params.amount,
            currency: params.currency || 'USDC',
            from_user: params.userId,
            to_user: recipientUserId,
            from_wallet: fromWalletAddress,
            to_wallet: params.toAddress,
            tx_hash: params.signature,
            note: params.memo || `${params.transactionType} transfer`,
            status: 'completed' as const,
            group_id: params.groupId || null,
            company_fee: 0, // Recipient doesn't pay fees
            net_amount: params.amount,
            gas_fee: 0,
            blockchain_network: 'solana',
            confirmation_count: 0,
            block_height: 0
          };

          await firebaseDataService.transaction.createTransaction(recipientTransactionData);
          logger.info('✅ Recipient transaction saved to database', {
            signature: params.signature,
            recipientUserId,
            transactionType: params.transactionType
          }, 'TransactionPostProcessing');
          }
        } catch (recipientSaveError) {
          logger.error('❌ Failed to save recipient transaction to database', recipientSaveError, 'TransactionPostProcessing');
          // Don't fail - sender transaction is already saved
        }
      }

    } catch (saveError) {
      logger.error('❌ Failed to save transaction to database', saveError, 'TransactionPostProcessing');
      result.error = saveError instanceof Error ? saveError.message : 'Failed to save transaction';
      // Don't throw - transaction was successful on blockchain
    }

    return result;
  } catch (error) {
    logger.error('❌ Error in transaction post-processing', error, 'TransactionPostProcessing');
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
    } finally {
      // Remove from pending saves map
      pendingTransactionSaves.delete(signature);
    }
  })();

  // ✅ CRITICAL: Store the promise IMMEDIATELY (synchronously, before any await)
  // This must happen before awaiting, so other simultaneous calls can find it
  // This eliminates the race condition window between check and set
  pendingTransactionSaves.set(signature, savePromise);
  
  try {
    return await savePromise;
  } catch (error) {
    // If promise fails, remove from map so it can be retried
    pendingTransactionSaves.delete(signature);
    throw error;
  }
}

