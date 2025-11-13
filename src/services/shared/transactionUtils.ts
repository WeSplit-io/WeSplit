/**
 * Transaction Utilities
 * 
 * @deprecated This file is deprecated and no longer actively used.
 * All transaction utilities have been migrated to transactionUtilsOptimized.ts.
 * This file is kept for backward compatibility and global type declarations.
 * 
 * Use optimizedTransactionUtils from transactionUtilsOptimized.ts instead.
 */

import { Connection, Transaction, PublicKey, Keypair } from '@solana/web3.js';
import { logger } from '../analytics/loggingService';
import { getFreshBlockhash } from './blockhashUtils';

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

      // Get fresh blockhash using shared utility for consistent handling
      const blockhashData = await getFreshBlockhash(connection, commitment);
      transaction.recentBlockhash = blockhashData.blockhash;

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
      // Get fresh blockhash using shared utility for consistent handling
      const blockhashData = await getFreshBlockhash(connection, commitment);
      transaction.recentBlockhash = blockhashData.blockhash;

      const simulation = await connection.simulateTransaction(transaction);
      return simulation;
    } catch (error) {
      logger.error('Transaction simulation failed', error as Error);
      throw error;
    }
  }

  /**
   * @deprecated Use getFreshBlockhash from blockhashUtils instead
   * This method is kept for backward compatibility but will be removed
   */
  static async getLatestBlockhashWithRetry(
    connection: Connection,
    commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed',
    maxRetries: number = 3
  ) {
    // Use shared utility for consistent blockhash handling
    const blockhashData = await getFreshBlockhash(connection, commitment);
    return blockhashData.blockhash;
  }
}

// Export singleton instance
// Lazy singleton to avoid initialization issues during module loading
let _transactionUtils: TransactionUtils | null = null;

export const transactionUtils = {
  get instance() {
    if (!_transactionUtils) {
      _transactionUtils = new TransactionUtils();
    }
    return _transactionUtils;
  }
};

// Export as default for backward compatibility
export default TransactionUtils;