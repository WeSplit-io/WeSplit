/**
 * Transaction Post-Processing Utility
 * Centralized helper for saving transactions and awarding points
 * Ensures consistency across all transaction types
 */

import { logger } from '../analytics/loggingService';
import { FeeService, TransactionType } from '../../config/constants/feeConfig';

export interface TransactionPostProcessingParams {
  userId: string;
  toAddress: string;
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
 */
export async function saveTransactionAndAwardPoints(
  params: TransactionPostProcessingParams
): Promise<{
  transactionSaved: boolean;
  pointsAwarded: boolean;
  error?: string;
}> {
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
      
      // Find recipient user by wallet address to get their user ID
      const recipientUser = await firebaseDataService.user.getUserByWalletAddress(params.toAddress);
      const recipientUserId = recipientUser ? recipientUser.id.toString() : params.toAddress;

      // Get user's wallet address for transaction record
      let fromWalletAddress = params.toAddress; // Fallback (will be overridden)
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

      // Create sender transaction record
      const senderTransactionData = {
        type: params.transactionType === 'external_payment' || params.transactionType === 'withdraw' 
          ? 'withdraw' as const 
          : 'send' as const,
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

      logger.info('✅ Transaction saved to database', {
        signature: params.signature,
        userId: params.userId,
        transactionType: params.transactionType,
        amount: params.amount
      }, 'TransactionPostProcessing');

      // Award points for internal transfers only (not external or withdrawals)
      // Points are awarded for: send, split_payment (funding), payment_request, settlement
      // Points are NOT awarded for: external_payment, withdraw, split_wallet_withdrawal
      const shouldAwardPoints = 
        params.transactionType === 'send' ||
        params.transactionType === 'split_payment' ||
        params.transactionType === 'payment_request' ||
        params.transactionType === 'settlement';

      if (shouldAwardPoints && recipientUser) {
        // This is an internal wallet-to-wallet transfer, award points
        try {
          const { pointsService } = await import('../rewards/pointsService');
          const pointsResult = await pointsService.awardTransactionPoints(
            params.userId,
            params.amount,
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
      if (recipientUser && params.transactionType !== 'external_payment' && params.transactionType !== 'withdraw') {
        try {
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
  }
}

