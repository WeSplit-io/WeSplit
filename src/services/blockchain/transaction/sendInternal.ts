/**
 * Internal P2P Send Flow - Real On-Chain Transactions
 * Handles user-to-user transfers within the app
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Keypair
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction, 
  getAccount,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { getConfig } from '../../../config/unified';
import { FeeService, COMPANY_WALLET_CONFIG, TransactionType } from '../../../config/constants/feeConfig';
import { solanaWalletService } from '../wallet';
import { logger } from '../../analytics/loggingService';
import { optimizedTransactionUtils } from '../../shared/transactionUtilsOptimized';
import { notificationUtils } from '../../shared/notificationUtils';
import { TRANSACTION_CONFIG } from '../../../config/constants/transactionConfig';
import { processUsdcTransfer } from './transactionSigningService';
import { VersionedTransaction } from '@solana/web3.js';
import { getFreshBlockhash, isBlockhashTooOld, BLOCKHASH_MAX_AGE_MS, shouldRebuildTransaction } from '../../shared/blockhashUtils';
import { rebuildTransactionBeforeFirebase, rebuildTransactionWithFreshBlockhash } from '../../shared/transactionRebuildUtils';

export interface InternalTransferParams {
  to: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  memo?: string;
  groupId?: string;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
  transactionType?: TransactionType; // Add transaction type for fee calculation
}

export interface InternalTransferToAddressParams {
  to: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  memo?: string;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface InternalTransferResult {
  success: boolean;
  signature?: string;
  txId?: string;
  companyFee?: number;
  netAmount?: number;
  blockchainFee?: number;
  error?: string;
}

export interface BalanceCheckResult {
  hasSufficientBalance: boolean;
  currentBalance: number;
  requiredAmount: number;
  shortfall?: number;
}

class InternalTransferService {
  constructor() {
    // Connection management now handled by shared transactionUtils
  }


  /**
   * Send internal P2P transfer
   */
  async sendInternalTransfer(params: InternalTransferParams): Promise<InternalTransferResult> {
    try {
      logger.info('Starting internal transfer', {
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        userId: params.userId
      }, 'InternalTransferService');

      // ✅ CRITICAL: Create placeholder promise IMMEDIATELY for atomic check-and-register
      // This ensures atomic check-and-register before any async operations
      let resolveTransaction: (result: InternalTransferResult) => void;
      let rejectTransaction: (error: any) => void;
      
      const placeholderPromise = new Promise<InternalTransferResult>((resolve, reject) => {
        resolveTransaction = resolve;
        rejectTransaction = reject;
      });
      
      // ✅ CRITICAL: Atomic check-and-register to prevent race conditions
      // Internal transfers need deduplication just like external transfers
      const { transactionDeduplicationService } = await import('./TransactionDeduplicationService');
      const { existing: existingPromise, cleanup: dedupCleanup } = transactionDeduplicationService.checkAndRegisterInFlight(
        params.userId,
        params.to,
        params.amount,
        placeholderPromise
      );
      
      if (existingPromise) {
        logger.warn('⚠️ Duplicate internal transfer detected (atomic) - returning existing promise', {
          userId: params.userId,
          to: params.to.substring(0, 8) + '...',
          amount: params.amount
        }, 'InternalTransferService');
        
        // Wait for existing transaction to complete
        try {
          const existingResult = await existingPromise;
          return existingResult;
        } catch (existingError) {
          // If existing transaction failed, allow new attempt
          logger.warn('Existing internal transfer failed, allowing new attempt', {
            error: existingError instanceof Error ? existingError.message : String(existingError)
          }, 'InternalTransferService');
        }
      }

      // Validate recipient address
      const recipientValidation = this.validateRecipientAddress(params.to);
      if (!recipientValidation.isValid) {
        dedupCleanup();
        return {
          success: false,
          error: recipientValidation.error
        };
      }

      // Calculate company fee using centralized service with transaction type
      const transactionType = params.transactionType || 'send';
      const { fee: companyFee, totalAmount, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);

      // Check balance before proceeding
      const balanceCheck = await this.checkBalance(params.userId, params.amount, params.currency, false, transactionType);
      if (!balanceCheck.hasSufficientBalance) {
        return {
          success: false,
          error: `Insufficient ${params.currency} balance. Required: ${balanceCheck.requiredAmount}, Available: ${balanceCheck.currentBalance}`
        };
      }

      // Load wallet using the existing userWalletService
      const { walletService } = await import('../wallet');
      const walletResult = await walletService.ensureUserWallet(params.userId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Failed to load user wallet'
        };
      }

      // Load the wallet into solanaWalletService for signing
      const expectedWalletAddress = walletResult.wallet.address;
      logger.info('Loading wallet into solanaWalletService for signing', { 
        userId: params.userId, 
        expectedWalletAddress 
      }, 'InternalTransferService');
      
      // Use the new method that ensures we load the wallet with sufficient balance
      const walletLoaded = await solanaWalletService.loadWalletWithBalance(params.userId, expectedWalletAddress, params.currency);
      if (!walletLoaded) {
        logger.error('Cannot proceed with transaction - no wallet with sufficient balance found', {
          userId: params.userId,
          expectedWalletAddress,
          currency: params.currency,
          issue: 'No wallet with sufficient balance found. Please ensure you have the correct wallet credentials.'
        }, 'InternalTransferService');
        
        // Try comprehensive wallet recovery as a last resort
        logger.info('Attempting comprehensive wallet recovery', { userId: params.userId, expectedWalletAddress }, 'InternalTransferService');
        const recoveryResult = await walletService.recoverWalletForUser(params.userId, expectedWalletAddress);
        
        if (recoveryResult.success && recoveryResult.wallet) {
          logger.info('✅ Wallet recovered successfully, retrying transaction', { 
            userId: params.userId, 
            recoveredAddress: recoveryResult.wallet.address 
          }, 'InternalTransferService');
          
          // Retry loading the wallet after recovery
          const retryWalletLoaded = await solanaWalletService.loadWalletWithBalance(params.userId, expectedWalletAddress, params.currency);
          if (!retryWalletLoaded) {
            return {
              success: false,
              error: 'Wallet recovery succeeded but wallet still cannot be loaded for transaction.'
            };
          }
        } else {
          return {
            success: false,
            error: 'Wallet mismatch: No wallet with sufficient balance found. Please import your existing wallet or ensure you have the correct credentials.'
          };
        }
      }
      logger.info('Wallet loaded successfully for signing', { 
        userId: params.userId, 
        expectedWalletAddress 
      }, 'InternalTransferService');

      // Build and send transaction
      logger.info('Building transaction', {
        currency: params.currency,
        recipientAmount,
        companyFee
      }, 'InternalTransferService');

      // ✅ CRITICAL: Execute actual transaction and resolve placeholder promise
      // This ensures all waiting calls get the same result
      const actualTransactionPromise = (async () => {
        let result: InternalTransferResult;
        if (params.currency === 'USDC') {
          logger.info('Sending USDC transfer', { recipientAmount, companyFee }, 'InternalTransferService');
          try {
            result = await this.sendUsdcTransfer(params, recipientAmount, companyFee);
            logger.info('USDC transfer method completed', { 
              success: result.success, 
              signature: result.signature,
              error: result.error 
            }, 'InternalTransferService');
          } catch (error) {
            logger.error('USDC transfer method threw error', error, 'InternalTransferService');
            result = {
              success: false,
              error: error instanceof Error ? error.message : 'USDC transfer method failed'
            };
          }
        } else {
          logger.error('Unsupported currency for internal transfer', { currency: params.currency }, 'InternalTransferService');
          result = {
            success: false,
            error: 'WeSplit only supports USDC transfers. SOL transfers are not supported within the app.'
          };
        }
        return result;
      })();
      
      // Execute transaction and resolve/reject placeholder
      actualTransactionPromise
        .then((result) => {
          resolveTransaction!(result);
        })
        .catch((error) => {
          rejectTransaction!(error);
        });

      // Execute transaction with cleanup on completion
      let result: InternalTransferResult;
      try {
        result = await placeholderPromise;
        
        logger.info('Transaction result', {
          success: result.success,
          signature: result.signature,
          error: result.error
        }, 'InternalTransferService');

        // Update deduplication service with signature if successful
        if (result.success && result.signature) {
          transactionDeduplicationService.updateTransactionSignature(
            params.userId,
            params.to,
            params.amount,
            result.signature
          );
        }
        
        // ✅ CRITICAL: Only cleanup on SUCCESS
        // Failed transactions stay in deduplication service to prevent retries
        // This ensures that if a transaction fails, retries within 60s are blocked
        if (result.success) {
          dedupCleanup();
        }
      } catch (error) {
        // ✅ CRITICAL: Don't cleanup on error immediately
        // Keep failed transaction in deduplication service to prevent immediate retries
        // This prevents duplicates when transaction fails/times out and user retries
        // Cleanup will happen automatically after timeout (60s) or on success
        logger.warn('Internal transfer failed - keeping in deduplication service to prevent retries', {
          userId: params.userId,
          to: params.to.substring(0, 8) + '...',
          amount: params.amount,
          error: error instanceof Error ? error.message : String(error),
          note: 'Transaction will be cleaned up automatically after 60s timeout. Retries within 60s will be blocked.'
        }, 'InternalTransferService');
        // Don't cleanup - let it expire naturally (60s timeout) to prevent retries
        throw error;
      }

      if (result.success) {
        logger.info('Internal transfer completed successfully', {
          signature: result.signature,
          amount: params.amount,
          netAmount: result.netAmount,
          companyFee: result.companyFee
        }, 'InternalTransferService');

        // Save transaction and award points using centralized helper
        // This replaces the old notificationUtils.saveTransactionToFirestore call
        try {
          const { saveTransactionAndAwardPoints } = await import('../../shared/transactionPostProcessing');
          const { FeeService } = await import('../../../config/constants/feeConfig');
          
          // Calculate company fee for transaction
          const transactionType = params.transactionType || 'send';
          const { fee: companyFee, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);
          
          await saveTransactionAndAwardPoints({
            userId: params.userId,
            toAddress: params.to,
            amount: params.amount,
            signature: result.signature!,
            transactionType: transactionType,
            companyFee: companyFee,
            netAmount: recipientAmount,
            memo: params.memo,
            groupId: params.groupId,
            currency: params.currency
          });
          
          logger.info('✅ Internal transfer post-processing completed', {
            signature: result.signature,
            userId: params.userId,
            transactionType
          }, 'InternalTransferService');
        } catch (postProcessingError) {
          logger.error('❌ Error in internal transfer post-processing', postProcessingError, 'InternalTransferService');
          // Don't fail the transaction if post-processing fails
        }
      } else {
        logger.error('Internal transfer failed', {
          error: result.error,
          amount: params.amount,
          currency: params.currency
        }, 'InternalTransferService');
      }

      return result;
    } catch (error) {
      logger.error('Internal transfer failed', error, 'InternalTransferService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check user balance
   */
  async checkBalance(userId: string, amount: number, currency: 'SOL' | 'USDC', skipCompanyFee: boolean = false, transactionType: TransactionType = 'send'): Promise<BalanceCheckResult> {
    try {
      // Use the existing userWalletService to get balance
      const { walletService } = await import('../wallet');
      const balance = await walletService.getUserWalletBalance(userId);
      
      const currentBalance = balance?.usdcBalance || 0; // WeSplit only supports USDC
      
      // Calculate total required amount (including company fee unless skipped)
      const requiredAmount = skipCompanyFee ? amount : (() => {
        const { fee: companyFee } = FeeService.calculateCompanyFee(amount, transactionType);
        return amount + companyFee;
      })();

      logger.info('Balance check completed', {
        userId,
        currency,
        currentBalance,
        requiredAmount,
        skipCompanyFee,
        transactionType,
        hasSufficientBalance: currentBalance >= requiredAmount
      }, 'InternalTransferService');

      return {
        hasSufficientBalance: currentBalance >= requiredAmount,
        currentBalance,
        requiredAmount,
        shortfall: currentBalance < requiredAmount ? requiredAmount - currentBalance : undefined
      };
    } catch (error) {
      logger.error('Failed to check balance', error, 'InternalTransferService');
      return {
        hasSufficientBalance: false,
        currentBalance: 0,
        requiredAmount: amount
      };
    }
  }

  /**
   * Get real-time balance from on-chain
   */
  async getRealTimeBalance(userId: string): Promise<{ sol: number; usdc: number }> {
    try {
      return await solanaWalletService.getBalance();
    } catch (error) {
      logger.error('Failed to get real-time balance', error, 'InternalTransferService');
      throw error;
    }
  }

  /**
   * SOL transfers are not supported in WeSplit app
   * Only USDC transfers are allowed within the app
   */
  private async sendSolTransfer(
    params: InternalTransferParams, 
    recipientAmount: number, 
    companyFee: number
  ): Promise<InternalTransferResult> {
    logger.error('SOL transfer attempted - not supported in WeSplit app', { 
      currency: params.currency 
    }, 'InternalTransferService');
    
    return {
      success: false,
      error: 'SOL transfers are not supported within WeSplit app. Only USDC transfers are allowed.'
    };
  }

  /**
   * Send USDC transfer
   */
  private async sendUsdcTransfer(
    params: InternalTransferParams, 
    recipientAmount: number, 
    companyFee: number
  ): Promise<InternalTransferResult> {
    try {
      logger.info('Starting USDC transfer', {
        to: params.to,
        recipientAmount,
        companyFee,
        originalAmount: params.amount
      }, 'InternalTransferService');

      // CRITICAL: Get wallet info FIRST to minimize delay after blockhash
      // This async operation can take 100-500ms, so we do it before getting blockhash
      const walletInfo = await solanaWalletService.getWalletInfo();
      if (!walletInfo || !walletInfo.secretKey) {
        throw new Error('Wallet keypair not available for signing');
      }

      // Get wallet public key
      logger.info('Getting wallet public key', {}, 'InternalTransferService');
      const publicKey = solanaWalletService.getPublicKey();
      if (!publicKey) {
        logger.error('Wallet not loaded - no public key available', {}, 'InternalTransferService');
        throw new Error('Wallet not loaded - no public key available');
      }
      logger.info('Wallet public key retrieved', { publicKey }, 'InternalTransferService');

      const fromPublicKey = new PublicKey(publicKey);
      const toPublicKey = new PublicKey(params.to);
      const usdcMint = new PublicKey(getConfig().blockchain.usdcMintAddress);

      logger.info('USDC transfer setup', {
        fromPublicKey: fromPublicKey.toBase58(),
        toPublicKey: toPublicKey.toBase58(),
        usdcMint: usdcMint.toBase58()
      }, 'InternalTransferService');

      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPublicKey);
      const toTokenAccount = await getAssociatedTokenAddress(usdcMint, toPublicKey);

      logger.info('Token accounts', {
        fromTokenAccount: fromTokenAccount.toBase58(),
        toTokenAccount: toTokenAccount.toBase58()
      }, 'InternalTransferService');

      // CRITICAL: Get fresh blockhash FIRST, then do async operations
      // This ensures blockhash is as fresh as possible when we send to Firebase
      // Best practice: Get blockhash before any async operations that might delay
      const connection = await optimizedTransactionUtils.getConnection();
      const blockhashData = await getFreshBlockhash(connection, 'confirmed');
      
      // Check if recipient has USDC token account, create if needed
      // NOTE: This check happens AFTER getting blockhash to minimize delay
      let needsTokenAccountCreation = false;
      try {
        await getAccount(connection, toTokenAccount);
        logger.info('Recipient USDC token account exists', { toTokenAccount: toTokenAccount.toBase58() }, 'InternalTransferService');
      } catch (error) {
        // Token account doesn't exist, we need to create it
        logger.warn('Recipient USDC token account does not exist, will create it', { toTokenAccount: toTokenAccount.toBase58() }, 'InternalTransferService');
        needsTokenAccountCreation = true;
      }
      const blockhash = blockhashData.blockhash;
      const blockhashTimestamp = blockhashData.timestamp;
      logger.info('Got fresh blockhash right before transaction creation', { 
        blockhash: blockhash.substring(0, 8) + '...',
        blockhashTimestamp,
        lastValidBlockHeight: blockhashData.lastValidBlockHeight,
        note: 'Blockhash will expire after approximately 60 seconds'
      }, 'InternalTransferService');

      // Use company wallet for fees if configured, otherwise use user wallet
      // Fetch from Firebase Secrets (not EAS secrets)
      const feePayerPublicKey = await FeeService.getFeePayerPublicKey(fromPublicKey);
      
      // Create transaction (using fresh blockhash)
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayerPublicKey // Company wallet pays fees (fetched from Firebase)
      });

      logger.info('Transaction created', {
        feePayer: feePayerPublicKey.toBase58(),
        recentBlockhash: blockhash,
        instructionsCount: transaction.instructions.length
      }, 'InternalTransferService');

      // Add priority fee
      const priorityFee = this.getPriorityFee(params.priority || 'medium');
      if (priorityFee > 0) {
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          })
        );
        logger.info('Added priority fee', { priorityFee }, 'InternalTransferService');
      }

      // Add token account creation instruction if needed
      if (needsTokenAccountCreation) {
        logger.info('Adding token account creation instruction', { toTokenAccount: toTokenAccount.toBase58() }, 'InternalTransferService');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            feePayerPublicKey, // Fee payer pays ATA creation
            toTokenAccount, // associated token account
            toPublicKey, // owner
            usdcMint // mint
          )
        );
      }

      // Add USDC transfer instruction for recipient (full amount)
      const transferAmount = Math.floor(recipientAmount * Math.pow(10, 6) + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
      logger.info('Adding USDC transfer instruction for recipient', { 
        transferAmount, 
        recipientAmount,
        fromTokenAccount: fromTokenAccount.toBase58(),
        toTokenAccount: toTokenAccount.toBase58(),
        authority: fromPublicKey.toBase58(),
        feePayer: feePayerPublicKey.toBase58()
      }, 'InternalTransferService');
      
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey, // User is the authority for the token transfer
          transferAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Add company fee transfer instruction to admin wallet
      if (companyFee > 0) {
        const companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6) + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
        
        // Get company wallet address from Firebase Secrets (not EAS secrets)
        const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
        
        // Get company wallet's USDC token account
        const companyTokenAccount = await getAssociatedTokenAddress(usdcMint, new PublicKey(companyWalletAddress));
        
        logger.info('Adding company fee transfer instruction', { 
          companyFeeAmount, 
          companyFee,
          fromTokenAccount: fromTokenAccount.toBase58(),
          companyTokenAccount: companyTokenAccount.toBase58(),
          companyWalletAddress: companyWalletAddress,
          authority: fromPublicKey.toBase58()
        }, 'InternalTransferService');
        
        transaction.add(
          createTransferInstruction(
            fromTokenAccount,
            companyTokenAccount,
            fromPublicKey, // User is the authority for the token transfer
            companyFeeAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Add memo if provided
      if (params.memo) {
        transaction.add(
          new TransactionInstruction({
            keys: [{ pubkey: feePayerPublicKey, isSigner: true, isWritable: true }],
            data: Buffer.from(params.memo, 'utf8'),
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
          })
        );
        logger.info('Added memo instruction', { 
          memo: params.memo, 
          memoSigner: feePayerPublicKey.toBase58() 
        }, 'InternalTransferService');
      }

      logger.info('All instructions added to transaction', {
        instructionsCount: transaction.instructions.length,
        feePayer: transaction.feePayer?.toBase58(),
        recentBlockhash: transaction.recentBlockhash
      }, 'InternalTransferService');

      // Wallet info already retrieved at the start of the function
      // Create keypair from cached wallet info
      const secretKeyBuffer = Buffer.from(walletInfo.secretKey, 'base64');
      const userKeypair = Keypair.fromSecretKey(secretKeyBuffer);

      // Company wallet always pays SOL fees
      // SECURITY: Secret key operations must be performed on backend services via Firebase Functions
      // Get company wallet address from Firebase Secrets (not EAS secrets)
      const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
      logger.info('Company wallet configuration check', {
        companyWalletRequired: true,
        companyWalletAddress: companyWalletAddress,
        feePayerAddress: feePayerPublicKey.toBase58()
      }, 'InternalTransferService');

      // Debug transaction before serialization
      logger.info('Transaction ready for signing', {
        signerPublicKey: userKeypair.publicKey.toBase58(),
        feePayer: feePayerPublicKey.toBase58(),
        instructionsCount: transaction.instructions.length
          }, 'InternalTransferService');

      // Convert Transaction to VersionedTransaction for Firebase Functions
      // Firebase Functions expect VersionedTransaction format
      // NOTE: We don't sign the Transaction object first - we'll sign the VersionedTransaction directly
      // This avoids double signing and ensures clean signature handling
      let versionedTransaction: VersionedTransaction;
      try {
        versionedTransaction = new VersionedTransaction(transaction.compileMessage());
        // Sign the versioned transaction with user keypair (only sign once)
        versionedTransaction.sign([userKeypair]);
        logger.info('Transaction converted to VersionedTransaction and signed', {
          userAddress: userKeypair.publicKey.toBase58(),
          feePayer: versionedTransaction.message.staticAccountKeys[0]?.toBase58()
        }, 'InternalTransferService');
      } catch (versionError) {
        logger.error('Failed to convert transaction to VersionedTransaction', {
          error: versionError,
          errorMessage: versionError instanceof Error ? versionError.message : String(versionError)
        }, 'InternalTransferService');
        throw new Error(`Failed to convert transaction to VersionedTransaction: ${versionError instanceof Error ? versionError.message : String(versionError)}`);
      }

      // Serialize the partially signed transaction
      const serializedTransaction = versionedTransaction.serialize();
              
      // Ensure we have a proper Uint8Array
      const txArray = serializedTransaction instanceof Uint8Array 
        ? serializedTransaction 
        : new Uint8Array(serializedTransaction);

      // CRITICAL: Check blockhash age AND validity before sending to Firebase
      // Best practice: Use shared utility for consistent blockhash age checking
      // CRITICAL: Also validate the blockhash is actually valid on-chain
      // Blockhashes expire based on slot height, not just time
      let currentTxArray = txArray;
      let currentBlockhashTimestamp = blockhashTimestamp;
      
      // Use shared utility to check if rebuild is needed (age + on-chain validation)
      // Fallback to old logic if function not available (Metro bundler cache issue)
      let needsRebuild = false;
      let rebuildReason: string | undefined;
      
      if (typeof shouldRebuildTransaction === 'function') {
        const rebuildCheck = await shouldRebuildTransaction(connection, blockhash, blockhashTimestamp);
        needsRebuild = rebuildCheck.needsRebuild;
        rebuildReason = rebuildCheck.reason;
      } else {
        // Fallback: Use old logic if function not available (Metro cache issue)
        logger.warn('shouldRebuildTransaction not available - using fallback logic. Please clear Metro cache: npx react-native start --reset-cache', {
          shouldRebuildTransactionType: typeof shouldRebuildTransaction
        }, 'InternalTransferService');
        needsRebuild = isBlockhashTooOld(blockhashTimestamp);
        
        if (!needsRebuild) {
          try {
            const isValid = await connection.isBlockhashValid(blockhash, { commitment: 'confirmed' });
            const isValidValue = isValid && (typeof isValid === 'boolean' ? isValid : isValid.value === true);
            if (!isValidValue) {
              needsRebuild = true;
              rebuildReason = 'Blockhash expired based on slot height';
            }
          } catch (validationError) {
            // If validation fails, proceed without rebuild
            logger.warn('Failed to validate blockhash on-chain, proceeding anyway', {
              error: validationError instanceof Error ? validationError.message : String(validationError)
            }, 'InternalTransferService');
          }
        } else {
          rebuildReason = `Blockhash age (${Date.now() - blockhashTimestamp}ms) exceeds maximum (${BLOCKHASH_MAX_AGE_MS}ms)`;
        }
      }
      
      if (needsRebuild) {
        logger.warn('Blockhash needs rebuild before Firebase call', {
          blockhashAge: Date.now() - blockhashTimestamp,
          maxAge: BLOCKHASH_MAX_AGE_MS,
          reason: rebuildReason
        }, 'InternalTransferService');
        
        // Rebuild transaction with fresh blockhash using shared utility
        // Fallback if function not available (Metro cache issue)
        if (typeof rebuildTransactionWithFreshBlockhash === 'function') {
          const rebuildResult = await rebuildTransactionWithFreshBlockhash(
            transaction,
            connection,
            feePayerPublicKey,
            userKeypair
          );
          
          currentTxArray = rebuildResult.serializedTransaction;
          currentBlockhashTimestamp = rebuildResult.blockhashTimestamp;
        } else {
          // Fallback: Manual rebuild if function not available
          logger.warn('rebuildTransactionWithFreshBlockhash not available - using fallback. Please clear Metro cache.', null, 'InternalTransferService');
          const freshBlockhashData = await getFreshBlockhash(connection, 'confirmed');
          const freshTransaction = new Transaction({
            recentBlockhash: freshBlockhashData.blockhash,
            feePayer: feePayerPublicKey
          });
          transaction.instructions.forEach(ix => freshTransaction.add(ix));
          const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
          freshVersionedTransaction.sign([userKeypair]);
          currentTxArray = freshVersionedTransaction.serialize();
          currentBlockhashTimestamp = freshBlockhashData.timestamp;
        }
      } else {
        logger.info('Blockhash is still fresh, using existing transaction', {
          blockhashAge: Date.now() - blockhashTimestamp,
          maxAge: BLOCKHASH_MAX_AGE_MS,
          note: 'Blockhash is within acceptable age, proceeding without rebuild'
        }, 'InternalTransferService');
      }

      // CRITICAL: Get a fresh blockhash RIGHT BEFORE sending to Firebase
      // Firebase takes 4-5 seconds to process, so we need the freshest possible blockhash
      // Even if the current blockhash is only 1-2 seconds old, we rebuild to ensure it's fresh
      // Use shared utility for consistent rebuild logic
      // Fallback if function not available (Metro cache issue)
      if (typeof rebuildTransactionBeforeFirebase === 'function') {
        const preFirebaseRebuild = await rebuildTransactionBeforeFirebase(
          transaction,
          connection,
          feePayerPublicKey,
          userKeypair,
          currentBlockhashTimestamp
        );
        
        currentTxArray = preFirebaseRebuild.serializedTransaction;
        currentBlockhashTimestamp = preFirebaseRebuild.blockhashTimestamp;
      } else {
        // Fallback: Manual rebuild if function not available
        logger.warn('rebuildTransactionBeforeFirebase not available - using fallback. Please clear Metro cache.', null, 'InternalTransferService');
        const preFirebaseBlockhashData = await getFreshBlockhash(connection, 'confirmed');
        const preFirebaseTransaction = new Transaction({
          recentBlockhash: preFirebaseBlockhashData.blockhash,
          feePayer: feePayerPublicKey
        });
        transaction.instructions.forEach(ix => preFirebaseTransaction.add(ix));
        const preFirebaseVersionedTransaction = new VersionedTransaction(preFirebaseTransaction.compileMessage());
        preFirebaseVersionedTransaction.sign([userKeypair]);
        currentTxArray = preFirebaseVersionedTransaction.serialize();
        currentBlockhashTimestamp = preFirebaseBlockhashData.timestamp;
      }

      // Use processUsdcTransfer which combines signing and submission in one Firebase call
      // This minimizes blockhash expiration risk and reduces network round trips
      // CRITICAL: Add retry logic with automatic blockhash refresh for blockhash expiration errors
      let signature: string;
      let submissionAttempts = 0;
      const maxSubmissionAttempts = 3; // Retry up to 3 times with fresh blockhash
      
      while (submissionAttempts < maxSubmissionAttempts) {
        try {
          logger.info('Processing USDC transfer (sign and submit)', {
            connectionEndpoint: (await optimizedTransactionUtils.getConnection()).rpcEndpoint,
            commitment: getConfig().blockchain.commitment,
            priority: params.priority || 'medium',
            transactionSize: currentTxArray.length,
            attempt: submissionAttempts + 1,
            maxAttempts: maxSubmissionAttempts,
            blockhashAge: Date.now() - currentBlockhashTimestamp
          }, 'InternalTransferService');
          
          const result = await processUsdcTransfer(currentTxArray);
          signature = result.signature;
          
          logger.info('Transaction processed successfully', { signature }, 'InternalTransferService');
          break; // Success, exit retry loop
        } catch (submissionError) {
          const errorMessage = submissionError instanceof Error ? submissionError.message : String(submissionError);
          
          // Check for timeout errors first - these need special handling to prevent duplicates
          const isTimeout = 
            errorMessage.includes('timed out') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('deadline exceeded') ||
            errorMessage.includes('deadline-exceeded');
          
          // CRITICAL: On timeout, don't retry - transaction may have succeeded
          // Retrying could cause duplicate submission
          if (isTimeout) {
            logger.warn('Transaction processing timed out - not retrying to prevent duplicate submission', {
              errorMessage,
              attempt: submissionAttempts + 1,
              maxAttempts: maxSubmissionAttempts,
              note: 'Transaction may have succeeded. User should check transaction history. Retrying could cause duplicate submission.'
            }, 'InternalTransferService');
            throw new Error(`Transaction processing timed out. The transaction may have succeeded on the blockchain. Please check your transaction history. If the transaction didn't go through, please try again.`);
          }
          
          const isBlockhashExpired = 
            errorMessage.includes('blockhash has expired') ||
            errorMessage.includes('blockhash expired') ||
            errorMessage.includes('Blockhash not found') ||
            errorMessage.includes('blockhash');
          
          // If blockhash expired and we have retries left, rebuild transaction with fresh blockhash
          if (isBlockhashExpired && submissionAttempts < maxSubmissionAttempts - 1) {
            logger.warn('Transaction blockhash expired, rebuilding transaction with fresh blockhash', {
              attempt: submissionAttempts + 1,
              maxAttempts: maxSubmissionAttempts,
              blockhashAge: Date.now() - currentBlockhashTimestamp,
              note: 'Rebuilding transaction with fresh blockhash and retrying'
            }, 'InternalTransferService');
            
            try {
              // Rebuild transaction with fresh blockhash using shared utility
              // Fallback if function not available (Metro cache issue)
              const rebuildConnection = await optimizedTransactionUtils.getConnection();
              if (typeof rebuildTransactionWithFreshBlockhash === 'function') {
                const retryRebuild = await rebuildTransactionWithFreshBlockhash(
                  transaction,
                  rebuildConnection,
                  feePayerPublicKey,
                  userKeypair
                );
                
                currentTxArray = retryRebuild.serializedTransaction;
                currentBlockhashTimestamp = retryRebuild.blockhashTimestamp;
              } else {
                // Fallback: Manual rebuild if function not available
                logger.warn('rebuildTransactionWithFreshBlockhash not available for retry - using fallback. Please clear Metro cache.', null, 'InternalTransferService');
                const freshBlockhashData = await getFreshBlockhash(rebuildConnection, 'confirmed');
                const freshTransaction = new Transaction({
                  recentBlockhash: freshBlockhashData.blockhash,
                  feePayer: feePayerPublicKey
                });
                transaction.instructions.forEach(ix => freshTransaction.add(ix));
                const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
                freshVersionedTransaction.sign([userKeypair]);
                currentTxArray = freshVersionedTransaction.serialize();
                currentBlockhashTimestamp = freshBlockhashData.timestamp;
              }
              
              submissionAttempts++;
              // Wait a brief moment before retry to avoid immediate failure
              await new Promise(resolve => setTimeout(resolve, 100));
              continue; // Retry with fresh blockhash
            } catch (rebuildError) {
              logger.error('Failed to rebuild transaction with fresh blockhash', {
                error: rebuildError,
                errorMessage: rebuildError instanceof Error ? rebuildError.message : String(rebuildError)
              }, 'InternalTransferService');
              // If rebuild fails, throw the original error
              throw submissionError;
            }
          } else {
            // Not a blockhash error or no retries left
            logger.error('Transaction submission failed', { 
              error: submissionError,
              errorMessage,
              attempt: submissionAttempts + 1,
              maxAttempts: maxSubmissionAttempts,
              isBlockhashExpired
            }, 'InternalTransferService');
            throw submissionError;
          }
        }
      }
      
      if (!signature) {
        throw new Error('Transaction submission failed after all retry attempts');
      }

      logger.info('Transaction sent successfully', { signature }, 'InternalTransferService');

      // Confirm transaction with optimized timeout handling
      const confirmed = await optimizedTransactionUtils.confirmTransactionWithTimeout(signature);
      
      if (!confirmed) {
        logger.warn('Transaction confirmation timed out, but transaction was sent', { 
          signature,
          note: 'Transaction may still be processing on the blockchain'
        }, 'InternalTransferService');
        
        // Try to check transaction status one more time after a short delay
        try {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          const status = await this.getTransactionStatus(signature);
          
          if (status.status === 'confirmed' || status.status === 'finalized') {
            logger.info('Transaction confirmed on retry check', { signature, status }, 'InternalTransferService');
          } else {
            logger.warn('Transaction still not confirmed on retry', { signature, status }, 'InternalTransferService');
          }
        } catch (error) {
          logger.warn('Failed to check transaction status on retry', { signature, error }, 'InternalTransferService');
        }
        
        // Don't fail the transaction - it might still succeed
      } else {
        logger.info('Transaction confirmed successfully', { signature }, 'InternalTransferService');
      }

      // Notifications are now handled by the shared notificationUtils in saveTransactionToFirestore

      return {
        success: true,
        signature,
        txId: signature,
        companyFee,
        netAmount: recipientAmount,
        blockchainFee: this.estimateBlockchainFee(transaction)
      };
    } catch (error) {
      logger.error('USDC transfer failed', error, 'InternalTransferService');
      
      // Failed transfer notifications can be handled by the calling service if needed
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'USDC transfer failed'
      };
    }
  }

  /**
   * Validate recipient address
   */
  private validateRecipientAddress(address: string): { isValid: boolean; error?: string } {
    try {
      // Check if it's a valid Solana address
      new PublicKey(address);
      
      // Check address length and format
      if (address.length < 32 || address.length > 44) {
        return {
          isValid: false,
          error: 'Invalid address length'
        };
      }

      // Check if it's a valid base58 string
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
      if (!base58Regex.test(address)) {
        return {
          isValid: false,
          error: 'Invalid address format'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid Solana address'
      };
    }
  }

  // Fee calculation now handled by centralized FeeService


  /**
   * Get priority fee
   */
  private getPriorityFee(priority: 'low' | 'medium' | 'high'): number {
    return TRANSACTION_CONFIG.priorityFees[priority];
  }

  /**
   * Estimate blockchain fee
   */
  private estimateBlockchainFee(transaction: Transaction): number {
    // Rough estimate: 5000 lamports per signature + compute units
    const signatureCount = transaction.signatures.length;
    const computeUnits = TRANSACTION_CONFIG.computeUnits.tokenTransfer;
    const feePerComputeUnit = 0.000001; // 1 micro-lamport per compute unit
    
    return (signatureCount * 5000 + computeUnits * feePerComputeUnit) / LAMPORTS_PER_SOL;
  }


  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string): Promise<{
    status: 'pending' | 'confirmed' | 'finalized' | 'failed';
    confirmations?: number;
    error?: string;
  }> {
    try {
      const status = await (await optimizedTransactionUtils.getConnection()).getSignatureStatus(signature, {
        searchTransactionHistory: true
      });

      if (!status.value) {
        return { status: 'pending' };
      }

      if (status.value.err) {
        return { 
          status: 'failed', 
          error: status.value.err.toString() 
        };
      }

      const confirmations = status.value.confirmations || 0;
      if (confirmations >= 32) {
        return { status: 'finalized', confirmations };
      } else if (confirmations > 0) {
        return { status: 'confirmed', confirmations };
      } else {
        return { status: 'pending' };
      }
    } catch (error) {
      logger.warn('Failed to get transaction status, trying next RPC endpoint', { 
        signature,
        error: error instanceof Error ? error.message : 'Unknown error',
        endpoint: (await optimizedTransactionUtils.getConnection()).rpcEndpoint
      }, 'InternalTransferService');
      
      // Switch to next RPC endpoint if available
      if ((await optimizedTransactionUtils.getConnection())) {
        await optimizedTransactionUtils.switchToNextEndpoint();
        // Retry once with new endpoint
        try {
          const retryStatus = await (await optimizedTransactionUtils.getConnection()).getSignatureStatus(signature, {
            searchTransactionHistory: true
          });
          
          if (retryStatus.value?.err) {
            return { 
              status: 'failed', 
              error: retryStatus.value.err.toString() 
            };
          }
          
          return { status: 'pending' };
        } catch (retryError) {
          return { 
            status: 'pending', 
            error: 'Unable to verify transaction status' 
          };
        }
      }
      
      return { 
        status: 'pending', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send internal transfer to any address (for split wallets, external addresses, etc.)
   * This method doesn't try to find the recipient as a user in the database
   */

}

// Export singleton instance
// Lazy singleton to avoid initialization issues during module loading
let _internalTransferService: InternalTransferService | null = null;

export const internalTransferService = {
  get instance() {
    if (!_internalTransferService) {
      _internalTransferService = new InternalTransferService();
    }
    return _internalTransferService;
  }
};
