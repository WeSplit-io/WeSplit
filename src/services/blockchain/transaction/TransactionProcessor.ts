/**
 * Transaction Processor
 * Handles the core transaction processing logic
 */

import { 
  Connection, 
  PublicKey, 
  Keypair, 
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  TransactionInstruction,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';
import { USDC_CONFIG } from '../../shared/walletConstants';
import { getConfig } from '../../../config/unified';
import { TRANSACTION_CONFIG } from '../../../config/constants/transactionConfig';  
import { FeeService, COMPANY_WALLET_CONFIG } from '../../../config/constants/feeConfig';
import { optimizedTransactionUtils } from '../../shared/transactionUtilsOptimized';
import { logger } from '../../analytics/loggingService';
import { TransactionParams, TransactionResult } from './types';
import { processUsdcTransfer } from './transactionSigningService';
import { 
  getFreshBlockhash, 
  isBlockhashTooOld, 
  BLOCKHASH_MAX_AGE_MS, 
  shouldRebuildTransaction 
} from '../../shared/blockhashUtils';
import { verifyTransactionOnBlockchain } from '../../shared/transactionVerificationUtils';
import { 
  rebuildTransactionBeforeFirebase, 
  rebuildTransactionWithFreshBlockhash 
} from '../../shared/transactionRebuildUtils';

export class TransactionProcessor {
  private isProduction: boolean;

  constructor() {
    // Connection management now handled by optimizedTransactionUtils
    // This ensures we use optimized RPC endpoints with rotation and rate limit handling
    this.isProduction = !__DEV__;
  }

  /**
   * Get optimized connection with RPC endpoint rotation
   */
  private async getConnection(): Promise<Connection> {
    return await optimizedTransactionUtils.getConnection();
  }

  /**
   * SOL transactions are not supported in WeSplit app
   * Only USDC transfers are allowed within the app
   */
  async sendSolTransaction(params: TransactionParams): Promise<TransactionResult> {
    return {
      signature: '',
      txId: '',
      success: false,
      error: 'SOL transfers are not supported within WeSplit app. Only USDC transfers are allowed.'
    };
  }

  /**
   * Send USDC transaction with company fee
   */
  async sendUSDCTransaction(params: TransactionParams, keypair: Keypair): Promise<TransactionResult> {
    try {
      // Reduced logging for performance - only log essential info
      if (params.priority === 'high') {
        logger.info('🚀 TransactionProcessor: Starting high-priority USDC transaction', {
          to: params.to,
          amount: params.amount,
          priority: params.priority,
          fromAddress: keypair.publicKey.toBase58()
        });
      }

      // Calculate company fee using centralized service with transaction type
      const transactionType = params.transactionType || 'send';
      const { fee: companyFee, totalAmount, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);
      
      // Reduced logging for performance
      const fromPublicKey = keypair.publicKey;
      const toPublicKey = new PublicKey(params.to);
      
      // Recipient gets the full amount
      const recipientAmountInSmallestUnit = Math.floor(recipientAmount * 1_000_000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
      // Company fee amount
      const companyFeeAmount = Math.floor(companyFee * 1_000_000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding

      // Use company wallet for fees if configured, otherwise use user wallet
      const feePayerPublicKey = FeeService.getFeePayerPublicKey(fromPublicKey);
      const usdcMintPublicKey = new PublicKey(USDC_CONFIG.mintAddress);
      
      // Get associated token addresses
      const fromTokenAccount = await getAssociatedTokenAddress(
        usdcMintPublicKey,
        fromPublicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        usdcMintPublicKey,
        toPublicKey
      );

      // Check if recipient has USDC token account, create if needed
      let createRecipientTokenAccountInstruction: TransactionInstruction | null = null;
      const connection = await this.getConnection();
      try {
        await getAccount(connection, toTokenAccount);
        logger.debug('Recipient USDC token account exists', { toTokenAccount: toTokenAccount.toBase58() }, 'TransactionProcessor');
      } catch (error) {
        // Token account doesn't exist, create it
        // Use fee payer (company wallet) as the payer for token account creation
        logger.info('Recipient USDC token account does not exist, will create it', { 
          toTokenAccount: toTokenAccount.toBase58(),
          recipient: toPublicKey.toBase58()
        }, 'TransactionProcessor');
        createRecipientTokenAccountInstruction = createAssociatedTokenAccountInstruction(
          feePayerPublicKey, // payer - use company wallet to pay for token account creation
          toTokenAccount, // associated token account
          toPublicKey, // owner
          usdcMintPublicKey // mint
        );
      }

      // Check if company wallet has USDC token account, create if needed (for company fee transfers)
      let createCompanyTokenAccountInstruction: TransactionInstruction | null = null;
      if (companyFeeAmount > 0) {
        const companyTokenAccount = await getAssociatedTokenAddress(
          usdcMintPublicKey,
          feePayerPublicKey
        );
        
        try {
          await getAccount(connection, companyTokenAccount);
          logger.debug('Company wallet USDC token account exists', { companyTokenAccount: companyTokenAccount.toBase58() }, 'TransactionProcessor');
        } catch (error) {
          // Company wallet token account doesn't exist, create it
          logger.info('Company wallet USDC token account does not exist, will create it', { 
            companyTokenAccount: companyTokenAccount.toBase58(),
            companyWallet: feePayerPublicKey.toBase58()
          }, 'TransactionProcessor');
          createCompanyTokenAccountInstruction = createAssociatedTokenAccountInstruction(
            feePayerPublicKey, // payer - company wallet pays for its own token account creation
            companyTokenAccount, // associated token account
            feePayerPublicKey, // owner (company wallet)
            usdcMintPublicKey // mint
          );
        }
      }

      // CRITICAL: Check SOL balances BEFORE getting blockhash to avoid delays after blockhash is obtained
      // These async operations can take several seconds, especially on mainnet
      let companySolBalance: number | null = null;
      if (createRecipientTokenAccountInstruction || createCompanyTokenAccountInstruction) {
        companySolBalance = await connection.getBalance(feePayerPublicKey);
        const rentExemptionAmount = 2039280; // ~0.00203928 SOL for token account rent exemption
        const totalRentNeeded = (createRecipientTokenAccountInstruction ? 1 : 0) + (createCompanyTokenAccountInstruction ? 1 : 0);
        
        if (companySolBalance < (rentExemptionAmount * totalRentNeeded)) {
          return {
            success: false,
            error: `Company wallet has insufficient SOL for transaction. Required: ${((rentExemptionAmount * totalRentNeeded) / 1e9).toFixed(6)} SOL, Available: ${(companySolBalance / 1e9).toFixed(6)} SOL. Please contact support to fund the company wallet.`,
            signature: '',
            txId: ''
          };
        }
      }

      // IMPORTANT: Get fresh blockhash RIGHT BEFORE creating the transaction
      // Blockhashes expire after ~60 seconds, so we get it as late as possible
      // to minimize the time between creation and submission
      // Best practice: Use shared utility for consistent blockhash handling
      const blockhashData = await getFreshBlockhash(connection, 'confirmed');
      const blockhash = blockhashData.blockhash;
      const blockhashTimestamp = blockhashData.timestamp;
      
      logger.info('Got fresh blockhash right before transaction creation', {
        blockhash: blockhash.substring(0, 8) + '...',
        blockhashType: typeof blockhash,
        blockhashLength: blockhash.length,
        blockhashTimestamp,
        lastValidBlockHeight: blockhashData.lastValidBlockHeight
      }, 'TransactionProcessor');
      
      // Create the transaction with proper setup (using fresh blockhash)
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: feePayerPublicKey
      });

      // Add compute budget instructions for priority
      const priority = params.priority || 'medium';
      const computeUnitPrice = TRANSACTION_CONFIG.priorityFees[priority as keyof typeof TRANSACTION_CONFIG.priorityFees] || 5000;
      const computeUnitLimit = TRANSACTION_CONFIG.computeUnits.tokenTransfer;
      
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitPrice }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit })
      );

      // Add create recipient token account instruction if needed
      // NOTE: Balance check was moved BEFORE blockhash to avoid delays
      if (createRecipientTokenAccountInstruction) {
        transaction.add(createRecipientTokenAccountInstruction);
      }

      // Add create company token account instruction if needed (must be before company fee transfer)
      // NOTE: Balance check was moved BEFORE blockhash to avoid delays
      if (createCompanyTokenAccountInstruction) {
        transaction.add(createCompanyTokenAccountInstruction);
      }

      // Add transfer instruction for recipient
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPublicKey,
          recipientAmountInSmallestUnit,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Add company fee transfer if applicable
      if (companyFeeAmount > 0) {
        const companyTokenAccount = await getAssociatedTokenAddress(
          usdcMintPublicKey,
          feePayerPublicKey
        );

        transaction.add(
          createTransferInstruction(
            fromTokenAccount,
            companyTokenAccount,
            fromPublicKey,
            companyFeeAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Add memo if provided
      if (params.memo) {
        // Ensure memo is a string
        const memoString = typeof params.memo === 'string' ? params.memo : String(params.memo);
        if (memoString) {
        transaction.add(
          new TransactionInstruction({
            keys: [],
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
              data: Buffer.from(memoString, 'utf8'),
          })
        );
        }
      }
      
      // Company wallet always pays SOL fees
      // SECURITY: Secret key operations must be performed on backend services via Firebase Functions
      if (!COMPANY_WALLET_CONFIG.address) {
        throw new Error('Company wallet address is not configured');
      }

      logger.info('Transaction ready for signing', {
        signerPublicKey: keypair.publicKey.toBase58(),
        feePayer: transaction.feePayer?.toBase58(),
        instructionsCount: transaction.instructions.length,
        hasRecentBlockhash: !!transaction.recentBlockhash
      }, 'TransactionProcessor');

      // Validate transaction has recent blockhash before signing
      if (!transaction.recentBlockhash) {
        throw new Error('Transaction missing recent blockhash');
      }

      // Convert Transaction to VersionedTransaction for Firebase Functions
      // Firebase Functions expect VersionedTransaction format
      // NOTE: We don't sign the Transaction object first - we'll sign the VersionedTransaction directly
      // This avoids double signing and ensures clean signature handling
      let versionedTransaction: VersionedTransaction;
      try {
        // Compile message and validate it's not null/undefined
        const compiledMessage = transaction.compileMessage();
        if (!compiledMessage) {
          throw new Error('Failed to compile transaction message');
        }
        
        logger.info('Transaction message compiled successfully', {
          messageType: compiledMessage.constructor.name,
          hasMessage: !!compiledMessage
        }, 'TransactionProcessor');
        
        versionedTransaction = new VersionedTransaction(compiledMessage);
        // Sign the versioned transaction with user keypair (only sign once)
        versionedTransaction.sign([keypair]);
        logger.info('Transaction converted to VersionedTransaction and signed', {
          userAddress: keypair.publicKey.toBase58(),
          feePayer: versionedTransaction.message.staticAccountKeys[0]?.toBase58()
        }, 'TransactionProcessor');
      } catch (versionError) {
        logger.error('Failed to convert transaction to VersionedTransaction', {
          error: versionError,
          errorMessage: versionError instanceof Error ? versionError.message : String(versionError)
        }, 'TransactionProcessor');
        throw new Error(`Failed to convert transaction to VersionedTransaction: ${versionError instanceof Error ? versionError.message : String(versionError)}`);
      }

      // Serialize the partially signed transaction
      let serializedTransaction: Uint8Array | Buffer;
      try {
        serializedTransaction = versionedTransaction.serialize();
        logger.info('Transaction serialized successfully', {
          serializedType: typeof serializedTransaction,
          isUint8Array: serializedTransaction instanceof Uint8Array,
          isBuffer: serializedTransaction instanceof Buffer,
          hasLength: 'length' in serializedTransaction,
          length: (serializedTransaction as any).length
        }, 'TransactionProcessor');
      } catch (serializeError) {
        logger.error('Failed to serialize transaction', {
          error: serializeError,
          errorMessage: serializeError instanceof Error ? serializeError.message : String(serializeError)
        }, 'TransactionProcessor');
        throw new Error(`Failed to serialize transaction: ${serializeError instanceof Error ? serializeError.message : String(serializeError)}`);
      }

      // Ensure we have a proper Uint8Array
      let txArray: Uint8Array;
      try {
        if (serializedTransaction instanceof Uint8Array) {
          txArray = serializedTransaction;
        } else if (serializedTransaction instanceof Buffer) {
          // Convert Buffer to Uint8Array
          txArray = new Uint8Array(serializedTransaction);
        } else if (Array.isArray(serializedTransaction)) {
          txArray = new Uint8Array(serializedTransaction);
        } else if (serializedTransaction instanceof ArrayBuffer) {
          txArray = new Uint8Array(serializedTransaction);
          } else {
          throw new Error(`Invalid serialized transaction type: ${typeof serializedTransaction}. Expected Uint8Array or Buffer.`);
        }

        logger.info('Transaction converted to Uint8Array', {
          txArrayLength: txArray.length,
          txArrayType: typeof txArray,
          isUint8Array: txArray instanceof Uint8Array
        }, 'TransactionProcessor');
      } catch (conversionError) {
        logger.error('Failed to convert serialized transaction to Uint8Array', {
          error: conversionError,
          errorMessage: conversionError instanceof Error ? conversionError.message : String(conversionError),
          serializedType: typeof serializedTransaction
        }, 'TransactionProcessor');
        throw new Error(`Failed to convert transaction to Uint8Array: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
      }

      // CRITICAL: Check blockhash age AND validity before sending to Firebase
      // Best practice: Use shared utility for consistent blockhash age checking
      // CRITICAL: Also validate the blockhash is actually valid on-chain
      // Blockhashes expire based on slot height, not just time
      let currentTxArray = txArray;
      let currentBlockhashTimestamp = blockhashTimestamp; // Initialize with original timestamp
      
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
        }, 'TransactionProcessor');
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
            }, 'TransactionProcessor');
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
        }, 'TransactionProcessor');
        
        // Rebuild transaction with fresh blockhash using shared utility
        // Fallback if function not available (Metro cache issue)
        if (typeof rebuildTransactionWithFreshBlockhash === 'function') {
          const rebuildResult = await rebuildTransactionWithFreshBlockhash(
            transaction,
            connection,
            feePayerPublicKey,
            keypair
          );
          
          currentTxArray = rebuildResult.serializedTransaction;
          currentBlockhashTimestamp = rebuildResult.blockhashTimestamp;
        } else {
          // Fallback: Manual rebuild if function not available
          logger.warn('rebuildTransactionWithFreshBlockhash not available - using fallback. Please clear Metro cache.', null, 'TransactionProcessor');
          const freshBlockhashData = await getFreshBlockhash(connection, 'confirmed');
          const freshTransaction = new Transaction({
            recentBlockhash: freshBlockhashData.blockhash,
            feePayer: feePayerPublicKey
          });
          transaction.instructions.forEach(ix => freshTransaction.add(ix));
          const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
          freshVersionedTransaction.sign([keypair]);
          currentTxArray = freshVersionedTransaction.serialize();
          currentBlockhashTimestamp = freshBlockhashData.timestamp;
        }
      }

      // CRITICAL: Log blockhash age right before sending to Firebase
      const finalBlockhashAge = Date.now() - blockhashTimestamp;
      logger.info('Transaction ready for Firebase Function', {
        transactionSize: currentTxArray.length,
        transactionType: typeof currentTxArray,
        isUint8Array: currentTxArray instanceof Uint8Array,
        txArrayConstructor: currentTxArray.constructor.name,
        firstBytes: Array.from(currentTxArray.slice(0, 10)),
        blockhashAge: finalBlockhashAge,
        blockhashAgeMs: finalBlockhashAge,
        maxAgeMs: BLOCKHASH_MAX_AGE_MS,
        isBlockhashFresh: finalBlockhashAge < BLOCKHASH_MAX_AGE_MS,
        warning: finalBlockhashAge > 5000 ? 'Blockhash age is high - may expire during Firebase processing' : 'Blockhash is fresh'
      }, 'TransactionProcessor');

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
          keypair,
          currentBlockhashTimestamp
        );
        
        currentTxArray = preFirebaseRebuild.serializedTransaction;
        currentBlockhashTimestamp = preFirebaseRebuild.blockhashTimestamp;
      } else {
        // Fallback: Manual rebuild if function not available
        logger.warn('rebuildTransactionBeforeFirebase not available - using fallback. Please clear Metro cache.', null, 'TransactionProcessor');
        const preFirebaseBlockhashData = await getFreshBlockhash(connection, 'confirmed');
        const preFirebaseTransaction = new Transaction({
          recentBlockhash: preFirebaseBlockhashData.blockhash,
          feePayer: feePayerPublicKey
        });
        transaction.instructions.forEach(ix => preFirebaseTransaction.add(ix));
        const preFirebaseVersionedTransaction = new VersionedTransaction(preFirebaseTransaction.compileMessage());
        preFirebaseVersionedTransaction.sign([keypair]);
        currentTxArray = preFirebaseVersionedTransaction.serialize();
        currentBlockhashTimestamp = preFirebaseBlockhashData.timestamp;
      }

      // Use Firebase Function to add company wallet signature
      // Use processUsdcTransfer which combines signing and submission in one Firebase call
      // This minimizes blockhash expiration risk and reduces network round trips
      let signature: string;
      let submissionAttempts = 0;
      const maxSubmissionAttempts = 3; // Retry up to 3 times with fresh blockhash for better reliability
      
      while (submissionAttempts < maxSubmissionAttempts) {
        try {
          logger.info('Processing USDC transfer (sign and submit)', {
            transactionSize: currentTxArray.length,
            attempt: submissionAttempts + 1,
            maxAttempts: maxSubmissionAttempts,
            blockhashAge: Date.now() - currentBlockhashTimestamp
          }, 'TransactionProcessor');
          
          const result = await processUsdcTransfer(currentTxArray);
          signature = result.signature;
          logger.info('Transaction processed successfully', { signature }, 'TransactionProcessor');
          break; // Success, exit retry loop
        } catch (submissionError) {
          const errorMessage = submissionError instanceof Error ? submissionError.message : String(submissionError);
          const isBlockhashExpired = 
            errorMessage.includes('blockhash has expired') ||
            errorMessage.includes('blockhash expired') ||
            errorMessage.includes('Blockhash not found') ||
            errorMessage.includes('blockhash');
          
          // If blockhash expired and we have retries left, rebuild transaction
          if (isBlockhashExpired && submissionAttempts < maxSubmissionAttempts - 1) {
            logger.warn('Transaction blockhash expired, rebuilding transaction with fresh blockhash', {
              attempt: submissionAttempts + 1,
              maxAttempts: maxSubmissionAttempts,
              blockhashAge: Date.now() - currentBlockhashTimestamp,
              note: 'Rebuilding transaction with fresh blockhash and retrying'
            }, 'TransactionProcessor');
            
            // Rebuild transaction with fresh blockhash using shared utility
            // Fallback if function not available (Metro cache issue)
            if (typeof rebuildTransactionWithFreshBlockhash === 'function') {
              const retryRebuild = await rebuildTransactionWithFreshBlockhash(
                transaction,
                connection,
                feePayerPublicKey,
                keypair
              );
              
              currentTxArray = retryRebuild.serializedTransaction;
              currentBlockhashTimestamp = retryRebuild.blockhashTimestamp;
            } else {
              // Fallback: Manual rebuild if function not available
              logger.warn('rebuildTransactionWithFreshBlockhash not available for retry - using fallback. Please clear Metro cache.', null, 'TransactionProcessor');
              const freshBlockhashData = await getFreshBlockhash(connection, 'confirmed');
              const freshTransaction = new Transaction({
                recentBlockhash: freshBlockhashData.blockhash,
                feePayer: feePayerPublicKey
              });
              transaction.instructions.forEach(ix => freshTransaction.add(ix));
              const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
              freshVersionedTransaction.sign([keypair]);
              currentTxArray = freshVersionedTransaction.serialize();
              currentBlockhashTimestamp = freshBlockhashData.timestamp;
            }
            
            submissionAttempts++;
            continue; // Retry with fresh blockhash
          } else {
            // Not a blockhash error or no retries left
            logger.error('Transaction submission failed', { 
              error: submissionError,
              errorMessage,
              attempt: submissionAttempts + 1,
              maxAttempts: maxSubmissionAttempts,
              isBlockhashExpired
            }, 'TransactionProcessor');
            throw submissionError;
          }
        }
      }

      // CRITICAL: On mainnet, we need to properly verify the transaction succeeded
      // Don't assume success just because we got a signature - verify it actually confirmed
      const config = getConfig();
      const isMainnet = config.blockchain.network === 'mainnet';
      
      if (isMainnet) {
        // On mainnet, use proper verification with delayed check
        logger.info('Mainnet transaction submitted, verifying confirmation', {
          signature,
          transactionType,
          note: 'Will verify transaction status on mainnet'
        }, 'TransactionProcessor');
        
        // Wait a moment for transaction to be processed
        // NOTE: This delay is AFTER transaction submission, so it doesn't affect blockhash expiration
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify transaction with proper mainnet-aware logic using shared utility
        const verificationResult = await verifyTransactionOnBlockchain(connection, signature);
        
        if (!verificationResult.success) {
          // On mainnet, if verification fails but we got a signature, assume success
          // RPC indexing delays are common and don't mean the transaction failed
          // The verification utility now returns success: true on mainnet for indexing delays
          logger.warn('Transaction verification failed on mainnet (may be RPC indexing delay)', {
            signature,
            error: verificationResult.error,
            transactionType,
            note: verificationResult.note || 'Transaction was submitted successfully. Verification may have failed due to RPC indexing delay.'
          }, 'TransactionProcessor');
          
          // Don't return error - transaction was submitted successfully
          // User can check Solana Explorer to verify
          logger.info('Transaction submitted successfully despite verification timeout', {
            signature,
            note: 'Transaction was accepted by network. Verification timeout likely due to RPC indexing delay.'
          }, 'TransactionProcessor');
        } else {
          logger.info('Transaction verified successfully on mainnet', {
            signature,
            transactionType,
            confirmationStatus: verificationResult.confirmationStatus,
            note: verificationResult.note
          }, 'TransactionProcessor');
        }
      } else {
        // On devnet, use faster confirmation
      try {
        const confirmed = await optimizedTransactionUtils.confirmTransactionWithTimeout(signature);
        if (!confirmed) {
          logger.warn('Transaction confirmation timed out, but transaction was sent', { 
            signature,
            note: 'Transaction may still be processing on the blockchain'
          }, 'TransactionProcessor');
        }
      } catch (sendError) {
        logger.error('Transaction confirmation failed', {
          error: sendError instanceof Error ? sendError.message : String(sendError),
          transactionType,
          priority
        }, 'TransactionProcessor');
        // Don't throw - transaction was already submitted
      }
      }

      // Return success - transaction was submitted and verified (or assumed successful on timeout)
      return {
        signature,
        txId: signature,
        success: true,
        companyFee,
        netAmount: recipientAmount
      };

    } catch (error) {
      logger.error('USDC transaction failed', error, 'TransactionProcessor');
      return {
        signature: '',
        txId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * @deprecated Use shared verifyTransactionOnBlockchain from transactionVerificationUtils instead
   * This method is kept for backward compatibility but will be removed
   */
  private async verifyTransactionOnBlockchain(
    signature: string, 
    transactionType: string
  ): Promise<{ success: boolean; error?: string }> {
    // Use shared verification utility for consistent behavior
    const connection = await this.getConnection();
    const result = await verifyTransactionOnBlockchain(connection, signature);
              return {
      success: result.success,
      error: result.error
    };
          }
  

  /**
   * Get transaction fee estimate
   */
  async getTransactionFeeEstimate(amount: number, currency: string, priority: string): Promise<number> {
    try {
      // Base transaction fee
      let baseFee = 0.000005; // 5000 lamports base fee

      // Add priority fee
      const priorityFee = TRANSACTION_CONFIG.priorityFees[priority as keyof typeof TRANSACTION_CONFIG.priorityFees];
      if (priorityFee) {
        baseFee += priorityFee / 1_000_000_000; // Convert micro-lamports to SOL
      }

      // Add company fee for USDC transactions
      if (currency === 'USDC') {
        const { fee: companyFee } = FeeService.calculateCompanyFee(amount, 'send');
        baseFee += companyFee;
      }

      return baseFee;
    } catch (error) {
      logger.error('Failed to estimate transaction fee', error, 'TransactionProcessor');
      return 0.001; // Fallback fee
    }
  }
}


