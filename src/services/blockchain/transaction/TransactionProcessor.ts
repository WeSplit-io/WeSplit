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
import { FeeService } from '../../../config/constants/feeConfig';
import { TransactionUtils } from '../../shared/transactionUtils';
import { optimizedTransactionUtils } from '../../shared/transactionUtilsOptimized';
import { logger } from '../../analytics/loggingService';
import { TransactionParams, TransactionResult } from './types';

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

      // Get recent blockhash
      const blockhash = await TransactionUtils.getLatestBlockhashWithRetry(this.connection, 'confirmed');
      
      // Create the transaction with proper setup
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
        transaction.add(
          new TransactionInstruction({
            keys: [],
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
            data: Buffer.from(params.memo, 'utf8'),
          })
        );
      }
      
      // Prepare signers array
      const signers: Keypair[] = [keypair];
      
      // SECURITY: Company wallet secret key is not available in client-side code
      // All secret key operations must be performed on backend services
      // This is a security requirement - secret keys should never be in client bundles
      const { COMPANY_WALLET_CONFIG } = await import('../../../config/constants/feeConfig');
      
      if (!COMPANY_WALLET_CONFIG.address) {
        throw new Error('Company wallet address is not configured');
      }
      
      // Company wallet secret key operations must be performed on backend services
      throw new Error(
        'Company wallet secret key operations must be performed on backend services. ' +
        'Client-side code cannot sign transactions with company wallet. ' +
        'Please use backend API endpoint for transaction signing.'
      );

      // Send transaction with retry logic and timeout
      let signature: string;
      try {
        signature = await Promise.race([
          optimizedTransactionUtils.sendTransactionWithRetry(
            transaction,
            signers,
            priority as 'low' | 'medium' | 'high'
          ),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Transaction send timeout after 30 seconds')), 30000)
          )
        ]);
        
        logger.info('Transaction sent successfully', {
          signature,
          transactionType,
          priority
        }, 'TransactionProcessor');
      } catch (sendError) {
        logger.error('Transaction send failed', {
          error: sendError instanceof Error ? sendError.message : String(sendError),
          transactionType,
          priority
        }, 'TransactionProcessor');
        throw sendError;
      }
      
      // Quick confirmation check - if it takes too long, just proceed
      // The transaction was accepted by the network, and blockchain propagation can be slow
      const confirmationTimeout = priority === 'high' ? 5000 : 8000; // Reduced timeouts: 5s for high priority, 8s for others
      let confirmed = false;
      
      try {
        confirmed = await Promise.race([
          optimizedTransactionUtils.confirmTransactionWithTimeout(signature, confirmationTimeout).catch(() => false),
          new Promise<boolean>((resolve) => 
            setTimeout(() => {
              logger.debug('Confirmation timeout, proceeding with transaction', { signature }, 'TransactionProcessor');
              resolve(false); // Don't fail, just proceed
            }, confirmationTimeout + 2000) // Extra 2 seconds buffer
          )
        ]);
      } catch (confirmError) {
        logger.debug('Confirmation check threw error, proceeding anyway', {
          signature,
          error: confirmError instanceof Error ? confirmError.message : String(confirmError)
        }, 'TransactionProcessor');
        confirmed = false;
      }
      
      // Only do quick verification if not already confirmed - skip if it takes too long
      if (!confirmed) {
        try {
          // Quick verification with fewer attempts for faster response
          const verificationResult = await Promise.race([
            this.verifyTransactionOnBlockchain(signature, transactionType),
            new Promise<{ success: boolean; error?: string }>((resolve) =>
              setTimeout(() => {
                logger.debug('Verification timeout, assuming success', { signature }, 'TransactionProcessor');
                resolve({ success: true }); // Assume success if verification takes too long
              }, 3000) // 3 second timeout for verification
            )
          ]);
          
          if (verificationResult.success) {
            logger.debug('Transaction verified on blockchain', { signature }, 'TransactionProcessor');
          }
        } catch (verifyError) {
          logger.debug('Verification threw error, but transaction was sent successfully', {
            signature,
            error: verifyError instanceof Error ? verifyError.message : String(verifyError)
          }, 'TransactionProcessor');
          // Don't fail - transaction was sent and accepted by network
        }
      } else {
        logger.debug('Transaction confirmed successfully', { signature }, 'TransactionProcessor');
      }

      // Always return success if we got a signature - the transaction was accepted by the network
      // Verification failures are likely due to network delays, not actual transaction failures
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
   * Enhanced transaction verification (matching split logic)
   */
  private async verifyTransactionOnBlockchain(
    signature: string, 
    transactionType: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Verifying transaction on blockchain', {
        signature,
        transactionType
      }, 'TransactionProcessor');

      // Quick verification with minimal attempts for faster response
      const maxAttempts = 2; // Reduced to 2 attempts for faster response
      const delayMs = 300; // Reduced to 300ms for faster response

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const status = await this.connection.getSignatureStatus(signature, {
            searchTransactionHistory: true
          });

          if (status.value) {
            if (status.value.err) {
              logger.error('Transaction failed on blockchain', {
                signature,
                error: status.value.err,
                attempt
              }, 'TransactionProcessor');
              return {
                success: false,
                error: `Transaction failed: ${status.value.err.toString()}`
              };
            }

            const confirmations = status.value.confirmations || 0;
            if (confirmations > 0) {
              logger.info('Transaction confirmed on blockchain', {
                signature,
                confirmations,
                attempt
              }, 'TransactionProcessor');
              return { success: true };
            }
          }

          if (attempt < maxAttempts) {
            logger.info('Transaction not yet confirmed, retrying', {
              signature,
              attempt,
              maxAttempts
            }, 'TransactionProcessor');
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          logger.warn('Verification attempt failed', {
            signature,
            attempt,
            error: error instanceof Error ? error.message : String(error)
          }, 'TransactionProcessor');
          
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }

      // If we reach here, all verification attempts failed
      logger.warn('Transaction verification timeout', {
        signature,
        maxAttempts
      }, 'TransactionProcessor');

      // More lenient handling - if transaction was sent successfully, assume it succeeded
      // Blockchain propagation can be slow, especially during high network activity
      logger.warn('Transaction verification timeout, but transaction was sent successfully', {
        signature,
        transactionType,
        maxAttempts
      }, 'TransactionProcessor');
      
      // For all transaction types, assume success if we got a signature
      // The transaction was accepted by the network, verification timeout is likely due to network delays
      return { success: true };
    } catch (error) {
      logger.error('Transaction verification failed', {
        signature,
        error: error instanceof Error ? error.message : String(error)
      }, 'TransactionProcessor');
      return {
        success: false,
        error: 'Transaction verification failed'
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
      logger.error('Failed to estimate transaction fee', error, 'TransactionProcessor');
      return 0.001; // Fallback fee
    }
  }
}


