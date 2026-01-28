/**
 * Transaction Processor
 * Handles the core transaction processing logic
 */

import { 
  Connection, 
  PublicKey, 
  Keypair, 
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
} from '../secureTokenUtils';
import { USDC_CONFIG } from '../../shared/walletConstants';
import { getConfig } from '../../../config/unified';
import { TRANSACTION_CONFIG } from '../../../config/constants/transactionConfig';  
import { FeeService } from '../../../config/constants/feeConfig';
import { transactionUtils } from '../../shared/transactionUtils';
import { logger } from '../../analytics/loggingService';
import { TransactionParams, TransactionResult } from './types';
import { processUsdcTransfer } from './transactionSigningService';
import { 
  getFreshBlockhash, 
  isBlockhashTooOld, 
  BLOCKHASH_MAX_AGE_MS, 
  shouldRebuildTransaction 
} from '../../shared/blockhashUtils';
import { 
  rebuildTransactionBeforeFirebase, 
  rebuildTransactionWithFreshBlockhash 
} from '../../shared/transactionUtils';

export class TransactionProcessor {
  constructor() {
    // Connection management now handled by transactionUtils
    // This ensures we use optimized RPC endpoints with rotation and rate limit handling
  }

  /**
   * Get optimized connection with RPC endpoint rotation
   */
  private async getConnection(): Promise<Connection> {
    return await transactionUtils.getConnection();
  }

  /**
   * SOL transactions are not supported in WeSplit app
   * Only USDC transfers are allowed within the app
   */
  async sendSolTransaction(_params: TransactionParams): Promise<TransactionResult> {
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
      const { fee: companyFee, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);
      
      // Reduced logging for performance
      const fromPublicKey = keypair.publicKey;
      const toPublicKey = new PublicKey(params.to);
      
      // Recipient gets the full amount
      const recipientAmountInSmallestUnit = Math.floor(recipientAmount * 1_000_000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
      // Company fee amount
      const companyFeeAmount = Math.floor(companyFee * 1_000_000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding

      // Use company wallet for fees if configured, otherwise use user wallet
      // Fetch from Firebase Secrets (not EAS secrets)
      const feePayerPublicKey = await FeeService.getFeePayerPublicKey(fromPublicKey);
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
        // This is expected behavior for new recipients - not an error
        // Use fee payer (company wallet) as the payer for token account creation
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Token account not found') || errorMessage.includes('not found')) {
          logger.debug('Recipient USDC token account does not exist, will create it', { 
          toTokenAccount: toTokenAccount.toBase58(),
            recipient: toPublicKey.toBase58(),
            note: 'This is expected for new recipients - account will be created automatically'
        }, 'TransactionProcessor');
        } else {
          // Unexpected error - log as warning
          logger.warn('Error checking recipient token account, will attempt to create it', { 
            toTokenAccount: toTokenAccount.toBase58(),
            recipient: toPublicKey.toBase58(),
            error: errorMessage
          }, 'TransactionProcessor');
        }
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
      // Address is fetched from Firebase Secrets (not EAS secrets) via getFeePayerPublicKey above
      // No need to check here since getFeePayerPublicKey will throw if not available

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

      // ✅ FIX: Simulate transaction before submission to catch errors early
      // This provides faster feedback and prevents unnecessary network calls
      try {
        const simulationResult = await connection.simulateTransaction(transaction);
        if (simulationResult.value.err) {
          const errorMessage = JSON.stringify(simulationResult.value.err);
          logger.error('Transaction simulation failed', {
            error: errorMessage,
            logs: simulationResult.value.logs || [],
            signerPublicKey: keypair.publicKey.toBase58(),
            feePayer: transaction.feePayer?.toBase58()
          }, 'TransactionProcessor');
          
          // Provide user-friendly error messages for common failures
          if (errorMessage.includes('InsufficientFundsForFee')) {
            return {
              success: false,
              error: 'Insufficient SOL for transaction fees. Please ensure you have at least 0.001 SOL in your wallet.',
              signature: '',
              txId: ''
            };
          }
          
          if (errorMessage.includes('AccountNotFound') || errorMessage.includes('InvalidAccountData')) {
            return {
              success: false,
              error: 'Transaction validation failed: One or more accounts are invalid or not found. Please try again or contact support.',
              signature: '',
              txId: ''
            };
          }
          
          // Return generic error for other simulation failures
          return {
            success: false,
            error: `Transaction validation failed: ${errorMessage}`,
            signature: '',
            txId: ''
          };
        }
        
        logger.debug('Transaction simulation passed', {
          signerPublicKey: keypair.publicKey.toBase58(),
          computeUnitsConsumed: simulationResult.value.unitsConsumed
        }, 'TransactionProcessor');
      } catch (simulationError) {
        // Simulation is not always reliable (network issues, RPC problems)
        // Log warning but continue with transaction submission
        logger.warn('Transaction simulation failed (non-critical, continuing)', {
          error: simulationError instanceof Error ? simulationError.message : String(simulationError),
          signerPublicKey: keypair.publicKey.toBase58(),
          note: 'Simulation failures are not always accurate. Proceeding with transaction submission.'
        }, 'TransactionProcessor');
        // Continue with transaction submission - simulation is not always reliable
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
        } else if (typeof Buffer !== 'undefined' && (serializedTransaction as any).constructor?.name === 'Buffer') {
          // Convert Buffer to Uint8Array (check constructor name to avoid instanceof issues)
          txArray = new Uint8Array(serializedTransaction as any);
        } else if (Array.isArray(serializedTransaction)) {
          txArray = new Uint8Array(serializedTransaction);
        } else if (serializedTransaction && typeof serializedTransaction === 'object' && 'buffer' in serializedTransaction) {
          // Handle ArrayBuffer-like objects
          const buffer = (serializedTransaction as any).buffer;
          txArray = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(serializedTransaction as any);
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
        currentBlockhashTimestamp = preFirebaseRebuild.newBlockhashTimestamp;
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
      let signature: string | undefined;
      let submissionAttempts = 0;
      const maxSubmissionAttempts = 3; // Retry up to 3 times with fresh blockhash for better reliability
      
      // Track transaction submission to prevent duplicates
      logger.info('Starting transaction submission process', {
        recipientAmount,
        companyFee,
        totalAmount: recipientAmount + companyFee,
        transactionSize: currentTxArray.length,
        note: 'This transaction will be submitted once. Retries only occur on specific errors.'
      }, 'TransactionProcessor');
      
      // Get network info for logging (unified logic for both networks)
      const config = getConfig();
      const isMainnet = config.blockchain.network === 'mainnet';
      const networkNameForSubmission = isMainnet ? 'mainnet' : 'devnet';
      
      while (submissionAttempts < maxSubmissionAttempts) {
        try {
          // Log lightweight transaction details before submission to track duplicates
          // NOTE: Avoid deserializing the full VersionedTransaction here to reduce memory usage
          logger.info('Processing USDC transfer (sign and submit)', {
            transactionSize: currentTxArray.length,
            attempt: submissionAttempts + 1,
            maxAttempts: maxSubmissionAttempts,
            blockhashAge: Date.now() - currentBlockhashTimestamp,
            isMainnet,
            recipientAmount,
            companyFee,
            note: submissionAttempts > 0 ? 'RETRY ATTEMPT - previous attempt may have succeeded' : 'Initial submission'
          }, 'TransactionProcessor');
          
          const result = await processUsdcTransfer(currentTxArray);
          signature = result.signature;
          logger.info('Transaction processed successfully', { 
            signature,
            attempt: submissionAttempts + 1,
            recipientAmount,
            companyFee,
            totalAmount: recipientAmount + companyFee
          }, 'TransactionProcessor');
          break; // Success, exit retry loop
        } catch (submissionError) {
          const errorMessage = submissionError instanceof Error ? submissionError.message : String(submissionError);
          
          // Check for timeout errors - transaction might have succeeded
          const isTimeout = 
            errorMessage.includes('timed out') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('deadline exceeded') ||
            errorMessage.includes('deadline-exceeded');
          
          // CRITICAL: On timeout, check if transaction was actually submitted before retrying
          // This prevents duplicate submissions when the transaction succeeded but Firebase timed out
          if (isTimeout) {
            logger.warn('Transaction processing timed out - checking if transaction was submitted', {
              errorMessage,
              isMainnet,
              attempt: submissionAttempts + 1,
              note: 'Checking blockchain to see if transaction was submitted before retrying'
            }, 'TransactionProcessor');
            
            // Try to extract signature from the transaction to check if it was submitted
            // If we can't extract signature, check recent transactions from the wallet
            try {
              // UNIFIED TIMEOUT HANDLING: Same logic for both mainnet and devnet
              // Check if transaction was actually submitted before retrying
              // Extract signature from error message if available
              const signatureMatch = errorMessage.match(/Signature:\s*([A-Za-z0-9]{88})/);
              const possibleSignature = signatureMatch?.[1];
              if (possibleSignature) {
                logger.warn(`${networkNameForSubmission} timeout but signature found in error - checking if transaction succeeded`, {
                  signature: possibleSignature,
                  network: networkNameForSubmission,
                  attempt: submissionAttempts + 1,
                  note: 'Transaction may have succeeded. Checking on-chain before retrying.'
                }, 'TransactionProcessor');
                
                try {
                  // Check if transaction exists on-chain
                  const checkConnection = await this.getConnection();
                  const status = await checkConnection.getSignatureStatus(possibleSignature, {
                    searchTransactionHistory: true
                  });
                  
                  if (status.value) {
                    if (status.value.err) {
                      // Transaction failed - allow retry
                      logger.warn('Transaction found on-chain but failed - allowing retry', {
                        signature: possibleSignature,
                        network: networkNameForSubmission,
                        error: status.value.err
                      }, 'TransactionProcessor');
                    } else {
                      // Transaction succeeded! Don't retry
                      logger.info('Transaction found on-chain and succeeded - not retrying', {
                        signature: possibleSignature,
                        network: networkNameForSubmission,
                        confirmationStatus: status.value.confirmationStatus
                      }, 'TransactionProcessor');
                      signature = possibleSignature;
                      break; // Success, exit retry loop
                    }
                  }
                } catch (checkError) {
                  logger.warn('Failed to check transaction status - allowing retry', {
                    network: networkNameForSubmission,
                    error: checkError instanceof Error ? checkError.message : String(checkError)
                  }, 'TransactionProcessor');
                }
              }
              
              // UNIFIED RETRY LOGIC: Same for both networks
              // Only retry if we didn't find a successful transaction
              if (!signature && submissionAttempts < maxSubmissionAttempts - 1) {
                logger.warn(`${networkNameForSubmission} timeout - checking recent transactions before retrying`, {
                  network: networkNameForSubmission,
                  attempt: submissionAttempts + 1,
                  maxAttempts: maxSubmissionAttempts,
                  note: '⚠️ WARNING: Retrying may cause duplicate transaction if first attempt succeeded. Checking on-chain first.'
                }, 'TransactionProcessor');
                
                // Wait a bit and check recent transactions to see if one succeeded
                await new Promise(resolve => setTimeout(resolve, 3000));
                try {
                  const checkConnection = await this.getConnection();
                  // Check recent signatures from the wallet (last 10 transactions)
                  const recentSignatures = await checkConnection.getSignaturesForAddress(fromPublicKey, { limit: 10 });
                  const recentTx = recentSignatures.find(tx => {
                    const txTime = tx.blockTime ? tx.blockTime * 1000 : 0;
                    return Date.now() - txTime < 30000; // Within last 30 seconds
                  });
                  if (recentTx && !recentTx.err) {
                    logger.warn('Recent successful transaction found - not retrying to prevent duplicate', {
                      signature: recentTx.signature,
                      network: networkNameForSubmission,
                      blockTime: recentTx.blockTime
                    }, 'TransactionProcessor');
                    signature = recentTx.signature;
                    break; // Use the found signature, don't retry
                  }
                } catch (checkError) {
                  logger.debug('Could not check recent transactions, proceeding with retry', {
                    network: networkNameForSubmission,
                    error: checkError instanceof Error ? checkError.message : String(checkError)
                  }, 'TransactionProcessor');
                }
                
                if (!signature) {
                  submissionAttempts++;
                  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                  continue; // Retry once (same for both networks)
                }
              } else if (!signature) {
                throw new Error(`Transaction processing timed out after ${maxSubmissionAttempts} attempts. Please check your transaction history.`);
              }
            } catch (checkError) {
              // If checking fails, don't retry on timeout
              logger.error('Failed to check transaction status on timeout', {
                error: checkError instanceof Error ? checkError.message : String(checkError),
                errorMessage
              }, 'TransactionProcessor');
              throw new Error(`Transaction processing timed out. Please check your transaction history to see if the transaction succeeded.`);
            }
          }
          
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

      // UNIFIED VERIFICATION: Same logic for both mainnet and devnet
      // Verify transaction exists on blockchain before showing success
      // This prevents false positives where we show success but transaction doesn't exist
      if (!signature) {
        throw new Error('Transaction signature is missing - cannot verify transaction');
      }

      const networkNameForVerification = isMainnet ? 'mainnet' : 'devnet';
      const maxAttempts = 6; // Same for both networks
      const attemptDelay = 1000; // 1 second between attempts (same for both)
      const timeoutPerAttempt = 2500; // 2.5 seconds per attempt (same for both)
      const initialWait = 1000; // 1 second initial wait (same for both)
      
      logger.info(`${networkNameForVerification} transaction submitted, verifying on blockchain`, {
        signature,
        network: networkNameForVerification,
        note: `Verifying transaction exists before showing success (${maxAttempts} attempts, ~${maxAttempts * attemptDelay / 1000 + initialWait / 1000} seconds)`
      }, 'TransactionProcessor');
      
      try {
        const connection = await this.getConnection();
        let verified = false;
        let transactionFound = false;
        
        // Initial wait for RPC indexing (same for both networks)
        await new Promise(resolve => setTimeout(resolve, initialWait));
        
        // Unified verification: Same attempts and delays for both networks
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, attemptDelay));
          }
          
          try {
            const status = await Promise.race([
              connection.getSignatureStatus(signature, {
                searchTransactionHistory: true
              }),
              new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error('Verification timeout')), timeoutPerAttempt)
              )
            ]) as any;
            
            if (status && status.value) {
              transactionFound = true;
              
              if (status.value.err) {
                // Transaction failed on blockchain - fail immediately
                logger.error('Transaction failed on blockchain', {
                  signature,
                  error: status.value.err,
                  attempt: attempt + 1,
                  network: networkNameForVerification,
                  note: 'Transaction was submitted but failed during execution'
                }, 'TransactionProcessor');
                throw new Error(`Transaction failed on blockchain: ${JSON.stringify(status.value.err)}`);
              }
              
              // Transaction found and no error - verified!
              verified = true;
              logger.info('Transaction verified on blockchain', {
                signature,
                confirmationStatus: status.value.confirmationStatus,
                attempt: attempt + 1,
                network: networkNameForVerification,
                slot: status.value.slot
              }, 'TransactionProcessor');
              break;
            }
          } catch (statusError) {
            // If it's a transaction failure error, re-throw it
            if (statusError instanceof Error && statusError.message.includes('failed on blockchain')) {
              throw statusError;
            }
            // If timeout, continue to next attempt
            if (statusError instanceof Error && statusError.message.includes('timeout')) {
              logger.debug('Verification attempt timed out, retrying', {
                signature,
                attempt: attempt + 1,
                network: networkNameForVerification
              }, 'TransactionProcessor');
              continue;
            }
            // Other errors - log and continue
            logger.debug('Verification attempt failed, retrying', {
              signature,
              attempt: attempt + 1,
              network: networkNameForVerification,
              error: statusError instanceof Error ? statusError.message : String(statusError)
            }, 'TransactionProcessor');
          }
        }
        
        if (!transactionFound) {
          // Transaction not found after all attempts - fail the transaction
          // Same behavior for both networks: strict verification, no false positives
          logger.error('Transaction not found on blockchain after verification attempts', {
            signature,
            attempts: maxAttempts,
            network: networkNameForVerification,
            note: 'Transaction was submitted but not found on blockchain. This likely indicates the transaction failed.'
          }, 'TransactionProcessor');
          throw new Error(`Transaction not found on blockchain after ${maxAttempts} attempts. Transaction may have failed. Network: ${networkNameForVerification}`);
        }
        
        if (!verified) {
          // This shouldn't happen (transactionFound but not verified), but handle it
          logger.warn('Transaction found but verification incomplete', {
            signature,
            network: networkNameForVerification,
            note: 'Transaction exists but verification status unclear'
          }, 'TransactionProcessor');
          throw new Error('Transaction verification incomplete');
        }
      } catch (verifyError) {
        // If verification fails, throw the error (don't show success)
        // Same strict behavior for both networks
        logger.error('Transaction verification failed', {
          signature,
          network: networkNameForVerification,
          error: verifyError instanceof Error ? verifyError.message : String(verifyError),
          note: 'Transaction verification failed. Not showing success state.'
        }, 'TransactionProcessor');
        throw verifyError;
      }

      // Return success - transaction was submitted and verified
      return {
        signature: signature!,
        txId: signature!,
        success: true,
        companyFee,
        netAmount: recipientAmount
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('USDC transaction failed', {
        error: errorMessage,
        errorName: error instanceof Error ? error.name : 'Unknown'
      }, 'TransactionProcessor');
      return {
        signature: '',
        txId: '',
        success: false,
        error: errorMessage
      };
    }
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to estimate transaction fee', {
        error: errorMessage,
        errorName: error instanceof Error ? error.name : 'Unknown'
      }, 'TransactionProcessor');
      return 0.001; // Fallback fee
    }
  }
}


