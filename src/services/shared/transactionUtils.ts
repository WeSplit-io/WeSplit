/**
 * Shared Transaction Utilities
 * Centralized connection management, retry logic, and transaction utilities
 * Used by both consolidatedTransactionService and internalTransferService
 */

import { 
  Connection, 
  Transaction, 
  Keypair,
  PublicKey
} from '@solana/web3.js';
import { CURRENT_NETWORK, TRANSACTION_CONFIG } from '../../config/chain';
import { logger } from '../loggingService';

export class TransactionUtils {
  private static instance: TransactionUtils;
  private connection: Connection;
  private rpcEndpoints: string[];
  private currentEndpointIndex: number = 0;

  private constructor() {
    this.rpcEndpoints = CURRENT_NETWORK.rpcEndpoints || [CURRENT_NETWORK.rpcUrl];
    this.connection = this.createOptimizedConnection();
  }

  public static getInstance(): TransactionUtils {
    if (!TransactionUtils.instance) {
      TransactionUtils.instance = new TransactionUtils();
    }
    return TransactionUtils.instance;
  }

  private createOptimizedConnection(): Connection {
    const currentEndpoint = this.rpcEndpoints[this.currentEndpointIndex];
    
    return new Connection(currentEndpoint, {
      commitment: CURRENT_NETWORK.commitment,
      confirmTransactionInitialTimeout: TRANSACTION_CONFIG.timeout.transaction,
      wsEndpoint: CURRENT_NETWORK.wsUrl,
      disableRetryOnRateLimit: false,
      // Performance optimizations
      httpHeaders: {
        'User-Agent': 'WeSplit/1.0',
        'Connection': 'keep-alive',
      },
      // Connection pooling with React Native compatible timeout
      fetch: (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TRANSACTION_CONFIG.timeout.connection);
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    });
  }

  public getConnection(): Connection {
    return this.connection;
  }

  public async switchToNextEndpoint(): Promise<void> {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length;
    this.connection = this.createOptimizedConnection();
    logger.info(`Switched to RPC endpoint: ${this.rpcEndpoints[this.currentEndpointIndex]}`, {}, 'TransactionUtils');
  }

  /**
   * Get latest blockhash with retry logic and RPC failover
   */
  public async getLatestBlockhashWithRetry(commitment: 'confirmed' | 'finalized' = 'confirmed'): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { blockhash } = await this.connection.getLatestBlockhash(commitment);
        return blockhash;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Failed to get blockhash on attempt ${attempt + 1}/${maxRetries}`, { error: lastError.message }, 'TransactionUtils');
        
        // Check if it's a network error that might benefit from RPC failover
        if (error instanceof Error && (
          error.message.includes('fetch') || 
          error.message.includes('network') || 
          error.message.includes('timeout') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('AbortSignal') ||
          error.message.includes('aborted')
        )) {
          logger.info('Switching RPC endpoint due to network error', {}, 'TransactionUtils');
          await this.switchToNextEndpoint();
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          logger.info(`Waiting ${delay}ms before retry`, {}, 'TransactionUtils');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to get blockhash after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Send transaction with retry logic and RPC failover
   */
  public async sendTransactionWithRetry(
    transaction: Transaction, 
    signers: Keypair[], 
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    const maxRetries = TRANSACTION_CONFIG.retry.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get fresh blockhash for each attempt with retry logic
        const blockhash = await this.getLatestBlockhashWithRetry('confirmed');
        transaction.recentBlockhash = blockhash;

        // Sign the transaction
        transaction.sign(...signers);

        // Send transaction (faster than sendAndConfirmTransaction)
        const signature = await this.connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 0, // We handle retries ourselves
        });

        logger.info('Transaction sent successfully', { 
          signature, 
          attempt: attempt + 1,
          endpoint: this.rpcEndpoints[this.currentEndpointIndex]
        }, 'TransactionUtils');

        return signature;

      } catch (error) {
        lastError = error as Error;
        logger.warn(`Transaction send attempt ${attempt + 1} failed`, { 
          error: lastError.message,
          endpoint: this.rpcEndpoints[this.currentEndpointIndex]
        }, 'TransactionUtils');

        // Switch to next RPC endpoint if available
        if (this.rpcEndpoints.length > 1) {
          await this.switchToNextEndpoint();
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = TRANSACTION_CONFIG.retry.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Confirm transaction with timeout and retry logic
   */
  public async confirmTransactionWithTimeout(signature: string): Promise<boolean> {
    const timeout = TRANSACTION_CONFIG.timeout.confirmation;
    
    try {
      const confirmationPromise = this.connection.confirmTransaction(signature, 'confirmed');
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Transaction was not confirmed in ${timeout/1000} seconds. It is unknown if it succeeded or failed. Check signature ${signature} using the Solana Explorer or CLI tools.`)), timeout);
      });

      const result = await Promise.race([confirmationPromise, timeoutPromise]);
      
      if (result.value?.err) {
        throw new Error(`Transaction failed: ${result.value.err.toString()}`);
      }

      return true;
    } catch (error) {
      logger.warn('Transaction confirmation failed or timed out', { 
        signature, 
        error: error instanceof Error ? error.message : String(error)
      }, 'TransactionUtils');
      return false;
    }
  }

  /**
   * Get transaction status with better error handling
   */
  public async getTransactionStatus(signature: string): Promise<{
    status: 'pending' | 'confirmed' | 'finalized' | 'failed';
    confirmations?: number;
    error?: string;
  }> {
    try {
      const status = await this.connection.getSignatureStatus(signature, {
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
      logger.warn('Failed to get transaction status', { 
        signature,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'TransactionUtils');
      
      return { 
        status: 'pending', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get priority fee based on priority level
   */
  public getPriorityFee(priority: 'low' | 'medium' | 'high'): number {
    return TRANSACTION_CONFIG.priorityFees[priority];
  }

  /**
   * Estimate blockchain fee
   */
  public estimateBlockchainFee(transaction: Transaction): number {
    // Rough estimate: 5000 lamports per signature + compute units
    const signatureCount = transaction.signatures.length;
    const computeUnits = TRANSACTION_CONFIG.computeUnits.tokenTransfer;
    const feePerComputeUnit = 0.000001; // 1 micro-lamport per compute unit
    
    return (signatureCount * 5000 + computeUnits * feePerComputeUnit) / 1000000000; // Convert to SOL
  }
}

// Export singleton instance
export const transactionUtils = TransactionUtils.getInstance();
