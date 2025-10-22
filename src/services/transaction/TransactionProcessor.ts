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
import { USDC_CONFIG } from '../shared/walletConstants';
import { getConfig } from '../../config/unified';
import { TRANSACTION_CONFIG } from '../../config/constants/transactionConfig';  
import { FeeService } from '../../config/constants/feeConfig';
import { TransactionUtils } from '../shared/transactionUtils';
import { optimizedTransactionUtils } from '../shared/transactionUtilsOptimized';
import { logger } from '../core';
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
      let createTokenAccountInstruction: TransactionInstruction | null = null;
      try {
        await getAccount(this.connection, toTokenAccount);
      } catch (error) {
        // Token account doesn't exist, create it
        // Use fee payer (company wallet) as the payer for token account creation
        createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
          feePayerPublicKey, // payer - use company wallet to pay for token account creation
          toTokenAccount, // associated token account
          toPublicKey, // owner
          usdcMintPublicKey // mint
        );
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

      // Add create token account instruction if needed
      if (createTokenAccountInstruction) {
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
        
        transaction.add(createTokenAccountInstruction);
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
      
      // Add company wallet keypair for fee payment
      const { COMPANY_WALLET_CONFIG } = await import('../../config/constants/feeConfig');
      
      if (COMPANY_WALLET_CONFIG.secretKey) {
        try {
          let companySecretKeyBuffer: Buffer;
          
          // Handle different secret key formats
          if (COMPANY_WALLET_CONFIG.secretKey.includes(',') || COMPANY_WALLET_CONFIG.secretKey.includes('[')) {
            const cleanKey = COMPANY_WALLET_CONFIG.secretKey.replace(/[\[\]]/g, '');
            const keyArray = cleanKey.split(',').map(num => parseInt(num.trim(), 10));
            companySecretKeyBuffer = Buffer.from(keyArray);
          } else {
            companySecretKeyBuffer = Buffer.from(COMPANY_WALLET_CONFIG.secretKey, 'base64');
          }
          
          // Validate and trim if needed
          if (companySecretKeyBuffer.length === 65) {
            companySecretKeyBuffer = companySecretKeyBuffer.slice(0, 64);
          }
          
          const companyKeypair = Keypair.fromSecretKey(companySecretKeyBuffer);
          signers.push(companyKeypair);
        } catch (error) {
          throw new Error('Company wallet keypair not available for signing');
        }
      }

      // Send transaction with retry logic
      let signature: string;
      try {
        signature = await optimizedTransactionUtils.sendTransactionWithRetry(
          transaction,
          signers,
          priority as 'low' | 'medium' | 'high'
        );
        
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
      
      // Enhanced confirmation and verification (matching split logic)
      const confirmationTimeout = priority === 'high' ? 30000 : TRANSACTION_CONFIG.timeout.confirmation; // 30s for high priority, 60s for others
      const confirmed = await optimizedTransactionUtils.confirmTransactionWithTimeout(signature, confirmationTimeout);
      
      if (!confirmed) {
        logger.warn('Transaction confirmation timed out, attempting enhanced verification', { signature }, 'TransactionProcessor');
        
        // Enhanced verification with multiple attempts (matching split logic)
        const verificationResult = await this.verifyTransactionOnBlockchain(signature, transactionType);
        if (!verificationResult.success) {
          logger.error('Enhanced verification failed', { 
            signature, 
            error: verificationResult.error 
          }, 'TransactionProcessor');
          return {
            signature: '',
            txId: '',
            success: false,
            error: verificationResult.error || 'Transaction verification failed'
          };
        }
        
        logger.info('Enhanced verification succeeded after timeout', { signature }, 'TransactionProcessor');
      } else {
        logger.info('Transaction confirmed successfully', { signature }, 'TransactionProcessor');
      }

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

      // Enhanced verification with multiple attempts (matching split logic)
      const maxAttempts = 10;
      const delayMs = 1000; // 1 second delay between attempts

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

      // Different handling based on transaction type (matching split logic)
      if (transactionType === 'send' || transactionType === 'settlement') {
        // For send transactions, be strict about verification
        return {
          success: false,
          error: 'Transaction verification timeout - transaction may have failed'
        };
      } else {
        // For other transaction types, assume likely succeeded
        logger.info('Transaction likely succeeded despite verification timeout', {
          signature,
          transactionType
        }, 'TransactionProcessor');
        return { success: true };
      }
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


