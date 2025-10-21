// Transaction Utilities

import { Connection, Transaction, PublicKey, Keypair } from '@solana/web3.js';
import { logger } from '../loggingService';

export interface TransactionOptions {
  skipPreflight?: boolean;
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
  slot?: number;
}

export class TransactionUtils {
  static async sendTransaction(
    connection: Connection,
    transaction: Transaction,
    signers: Keypair[],
    options: TransactionOptions = {}
  ): Promise<TransactionResult> {
    try {
      const {
        skipPreflight = false,
        preflightCommitment = 'confirmed',
        maxRetries = 3,
        commitment = 'confirmed'
      } = options;

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash(commitment);
      transaction.recentBlockhash = blockhash;

      // Sign transaction
      transaction.sign(...signers);

      // Send transaction
      const signature = await connection.sendTransaction(transaction, signers, {
        skipPreflight,
        preflightCommitment,
        maxRetries
      });

      // Confirm transaction
      const confirmation = await connection.confirmTransaction(signature, commitment);

      if (confirmation.value.err) {
        return {
          signature,
          success: false,
          error: `Transaction failed: ${confirmation.value.err}`
        };
      }

      return {
        signature,
        success: true,
        slot: confirmation.value.slot
      };
    } catch (error) {
      logger.error('Transaction failed', error as Error);
      return {
        signature: '',
        success: false,
        error: (error as Error).message
      };
    }
  }

  static async simulateTransaction(
    connection: Connection,
    transaction: Transaction,
    commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'
  ) {
    try {
      const { blockhash } = await connection.getLatestBlockhash(commitment);
      transaction.recentBlockhash = blockhash;

      const simulation = await connection.simulateTransaction(transaction);
      return simulation;
    } catch (error) {
      logger.error('Transaction simulation failed', error as Error);
      throw error;
    }
  }

  static async getLatestBlockhashWithRetry(
    connection: Connection,
    commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed',
    maxRetries: number = 3
  ) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await connection.getLatestBlockhash(commitment);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
}

// Export singleton instance
export const transactionUtils = new TransactionUtils();

// Export as default for backward compatibility
export default TransactionUtils;