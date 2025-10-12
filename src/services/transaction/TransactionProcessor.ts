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
import { TRANSACTION_CONFIG } from '../../config/transactionConfig';
import { FeeService } from '../../config/feeConfig';
import { transactionUtils } from '../shared/transactionUtils';
import { logger } from '../loggingService';
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
      logger.debug('Sending USDC transaction', {
        to: params.to,
        amount: params.amount,
        currency: params.currency,
        userId: params.userId,
        priority: params.priority,
        isProduction: this.isProduction,
      });

      // Calculate company fee using centralized service with transaction type
      const transactionType = params.transactionType || 'send';
      const { fee: companyFee, totalAmount, recipientAmount } = FeeService.calculateCompanyFee(params.amount, transactionType);

      const fromPublicKey = keypair.publicKey;
      const toPublicKey = new PublicKey(params.to);
      
      // Recipient gets the full amount
      const recipientAmountInSmallestUnit = Math.floor(recipientAmount * 1_000_000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding
      // Company fee amount
      const companyFeeAmount = Math.floor(companyFee * 1_000_000 + 0.5); // USDC has 6 decimals, add 0.5 for proper rounding

      // Use company wallet for fees if configured, otherwise use user wallet
      const feePayerPublicKey = FeeService.getFeePayerPublicKey(fromPublicKey);

      // Get associated token addresses
      const fromTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(USDC_CONFIG.mintAddress),
        fromPublicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(USDC_CONFIG.mintAddress),
        toPublicKey
      );

      // Check if recipient has USDC token account, create if needed
      let createTokenAccountInstruction: TransactionInstruction | null = null;
      try {
        await getAccount(this.connection, toTokenAccount);
      } catch (error) {
        // Token account doesn't exist, create it
        createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
          fromPublicKey, // payer
          toTokenAccount, // associated token account
          toPublicKey, // owner
          new PublicKey(USDC_CONFIG.mintAddress) // mint
        );
      }

      // Create the transaction
      const transaction = new Transaction();

      // Add compute budget instructions for priority
      const { computeUnitPrice, computeUnitLimit } = TRANSACTION_CONFIG.priority[params.priority || 'medium'];
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitPrice }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit })
      );

      // Add create token account instruction if needed
      if (createTokenAccountInstruction) {
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
          new PublicKey(USDC_CONFIG.mintAddress),
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
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2'),
            data: Buffer.from(params.memo, 'utf8'),
          })
        );
      }

      // Send and confirm transaction
      const signature = await transactionUtils.sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair],
        {
          commitment: getConfig().blockchain.commitment,
          maxRetries: getConfig().blockchain.retries,
        }
      );

      logger.info('USDC transaction completed successfully', {
        signature,
        amount: params.amount,
        recipientAmount,
        companyFee,
        to: params.to
      });

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
   * Get transaction fee estimate
   */
  async getTransactionFeeEstimate(amount: number, currency: string, priority: string): Promise<number> {
    try {
      // Base transaction fee
      let baseFee = 0.000005; // 5000 lamports base fee

      // Add priority fee
      const priorityConfig = TRANSACTION_CONFIG.priority[priority as keyof typeof TRANSACTION_CONFIG.priority];
      if (priorityConfig) {
        baseFee += priorityConfig.computeUnitPrice / 1_000_000_000; // Convert micro-lamports to SOL
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
