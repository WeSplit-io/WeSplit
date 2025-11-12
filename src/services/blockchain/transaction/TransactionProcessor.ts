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
import { TransactionUtils } from '../../shared/transactionUtils';
import { optimizedTransactionUtils } from '../../shared/transactionUtilsOptimized';
import { logger } from '../../analytics/loggingService';
import { TransactionParams, TransactionResult } from './types';
import { signTransaction as signTransactionWithCompanyWallet, submitTransaction as submitTransactionToBlockchain } from './transactionSigningService';
import { getFreshBlockhash, isBlockhashTooOld, BLOCKHASH_MAX_AGE_MS } from '../../shared/blockhashUtils';
import { verifyTransactionOnBlockchain } from '../../shared/transactionVerificationUtils';

export class TransactionProcessor {
  private connection: Connection;
  private isProduction: boolean;

  constructor() {
    this.connection = new Connection(getConfig().blockchain.rpcUrl, {
      commitment: getConfig().blockchain.commitment,
      confirmTransactionInitialTimeout: getConfig().blockchain.timeout,
    });
    this.isProduction = !__DEV__;
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
      try {
        await getAccount(this.connection, toTokenAccount);
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
          await getAccount(this.connection, companyTokenAccount);
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

      // IMPORTANT: Get fresh blockhash RIGHT BEFORE creating the transaction
      // Blockhashes expire after ~60 seconds, so we get it as late as possible
      // to minimize the time between creation and submission
      // Best practice: Use shared utility for consistent blockhash handling
      const blockhashData = await getFreshBlockhash(this.connection, 'confirmed');
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
      if (createRecipientTokenAccountInstruction) {
        // Check if company wallet has enough SOL for rent exemption
        const companySolBalance = await this.connection.getBalance(feePayerPublicKey);
        const rentExemptionAmount = 2039280; // ~0.00203928 SOL for token account rent exemption
        
        if (companySolBalance < rentExemptionAmount) {
          return {
            success: false,
            error: `Company wallet has insufficient SOL for transaction. Required: ${(rentExemptionAmount / 1e9).toFixed(6)} SOL, Available: ${(companySolBalance / 1e9).toFixed(6)} SOL. Please contact support to fund the company wallet.`,
            signature: '',
            txId: ''
          };
        }
        
        transaction.add(createRecipientTokenAccountInstruction);
      }

      // Add create company token account instruction if needed (must be before company fee transfer)
      if (createCompanyTokenAccountInstruction) {
        // Check if company wallet has enough SOL for rent exemption (for its own token account)
        const companySolBalance = await this.connection.getBalance(feePayerPublicKey);
        const rentExemptionAmount = 2039280; // ~0.00203928 SOL for token account rent exemption
        const totalRentNeeded = createRecipientTokenAccountInstruction ? rentExemptionAmount * 2 : rentExemptionAmount;
        
        if (companySolBalance < totalRentNeeded) {
          return {
            success: false,
            error: `Company wallet has insufficient SOL for transaction. Required: ${(totalRentNeeded / 1e9).toFixed(6)} SOL (for token account creation), Available: ${(companySolBalance / 1e9).toFixed(6)} SOL. Please contact support to fund the company wallet.`,
            signature: '',
            txId: ''
          };
        }
        
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

      // CRITICAL: Check blockhash age before sending to Firebase
      // Best practice: Use shared utility for consistent blockhash age checking
      let currentTxArray = txArray;
      
      if (isBlockhashTooOld(blockhashTimestamp)) {
        logger.warn('Blockhash too old before Firebase call, rebuilding transaction', {
          blockhashAge: Date.now() - blockhashTimestamp,
          maxAge: BLOCKHASH_MAX_AGE_MS
        }, 'TransactionProcessor');
        
        // Get fresh blockhash and rebuild transaction using shared utility
        const freshBlockhashData = await getFreshBlockhash(this.connection, 'confirmed');
        const freshBlockhash = freshBlockhashData.blockhash;
        const freshBlockhashTimestamp = freshBlockhashData.timestamp;
        
        // Rebuild transaction with fresh blockhash
        const freshTransaction = new Transaction({
          recentBlockhash: freshBlockhash,
          feePayer: feePayerPublicKey
        });
        
        // Re-add all instructions
        transaction.instructions.forEach(ix => freshTransaction.add(ix));
        
        // Re-sign with fresh transaction
        const freshVersionedTransaction = new VersionedTransaction(freshTransaction.compileMessage());
        freshVersionedTransaction.sign([keypair]);
        currentTxArray = freshVersionedTransaction.serialize();
        
        logger.info('Transaction rebuilt with fresh blockhash before Firebase call', {
          transactionSize: currentTxArray.length,
          blockhashAge: Date.now() - blockhashTimestamp,
          newBlockhashTimestamp: freshBlockhashTimestamp
        }, 'TransactionProcessor');
      }

      logger.info('Transaction ready for Firebase Function', {
        transactionSize: currentTxArray.length,
        transactionType: typeof currentTxArray,
        isUint8Array: currentTxArray instanceof Uint8Array,
        txArrayConstructor: currentTxArray.constructor.name,
        firstBytes: Array.from(currentTxArray.slice(0, 10)),
        blockhashAge: Date.now() - blockhashTimestamp
      }, 'TransactionProcessor');

      // Use Firebase Function to add company wallet signature
      let fullySignedTransaction: Uint8Array;
      try {
        logger.info('Calling signTransactionWithCompanyWallet', {
          txArrayLength: currentTxArray.length,
          txArrayType: typeof currentTxArray
        }, 'TransactionProcessor');
        fullySignedTransaction = await signTransactionWithCompanyWallet(currentTxArray);
        logger.info('Company wallet signature added successfully', {
          transactionSize: fullySignedTransaction.length
        }, 'TransactionProcessor');
      } catch (signingError) {
        logger.error('Failed to add company wallet signature', { 
          error: signingError,
          errorMessage: signingError instanceof Error ? signingError.message : String(signingError),
          errorName: signingError instanceof Error ? signingError.name : typeof signingError,
          errorStack: signingError instanceof Error ? signingError.stack : undefined,
          txArrayLength: txArray.length,
          txArrayType: typeof txArray,
          isUint8Array: txArray instanceof Uint8Array
        }, 'TransactionProcessor');
        
        // Re-throw with more context
        const errorMessage = signingError instanceof Error ? signingError.message : String(signingError);
        throw new Error(`Failed to sign transaction with company wallet: ${errorMessage}`);
      }

      // Submit the fully signed transaction
      let signature: string;
      try {
        const result = await submitTransactionToBlockchain(fullySignedTransaction);
        signature = result.signature;
        logger.info('Transaction submitted successfully', { signature }, 'TransactionProcessor');
      } catch (submissionError) {
        logger.error('Transaction submission failed', { 
          error: submissionError,
          errorMessage: submissionError instanceof Error ? submissionError.message : String(submissionError)
        }, 'TransactionProcessor');
        throw submissionError;
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
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify transaction with proper mainnet-aware logic using shared utility
        const verificationResult = await verifyTransactionOnBlockchain(this.connection, signature);
        
        if (!verificationResult.success) {
          logger.error('Transaction verification failed on mainnet', {
            signature,
            error: verificationResult.error,
            transactionType,
            note: 'Transaction may have failed or is still processing'
          }, 'TransactionProcessor');
          
          // Don't return success if verification explicitly failed (not just timeout)
          if (verificationResult.error && !verificationResult.error.includes('timeout')) {
            return {
              signature,
              txId: signature,
              success: false,
              error: verificationResult.error || 'Transaction verification failed on mainnet',
              companyFee,
              netAmount: recipientAmount
            };
          }
          
          // If it's just a timeout, assume success (transaction was accepted by network)
          logger.warn('Transaction verification timed out on mainnet, assuming success', {
            signature,
            note: 'Transaction was accepted by network, verification timeout likely due to RPC rate limits'
          }, 'TransactionProcessor');
        } else {
          logger.info('Transaction verified successfully on mainnet', {
            signature,
            transactionType
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
    const result = await verifyTransactionOnBlockchain(this.connection, signature);
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


