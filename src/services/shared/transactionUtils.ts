/**
 * Shared Transaction Utilities
 * Centralized connection management, retry logic, and transaction utilities
 * Used by both consolidatedTransactionService and internalTransferService
 */

// Lazy imports to reduce memory usage and avoid circular dependencies
let Connection: any;
let Transaction: any;
let Keypair: any;
let PublicKey: any;
let getConfig: any;
let TRANSACTION_CONFIG: any;
let logger: any;

// Lazy loading function to import modules only when needed
async function loadDependencies() {
  if (!Connection) {
    const solanaWeb3 = await import('@solana/web3.js');
    Connection = solanaWeb3.Connection;
    Transaction = solanaWeb3.Transaction;
    Keypair = solanaWeb3.Keypair;
    PublicKey = solanaWeb3.PublicKey;
    
    const configModule = await import('../../config/unified');
    getConfig = configModule.getConfig;
    
    const transactionConfigModule = await import('../../config/transactionConfig');
    TRANSACTION_CONFIG = transactionConfigModule.TRANSACTION_CONFIG;
    
    const loggerModule = await import('../loggingService');
    logger = loggerModule.logger;
  }
}

export class TransactionUtils {
  private static instance: TransactionUtils;
  private connection: any;
  private rpcEndpoints: string[];
  private currentEndpointIndex: number = 0;
  private dependenciesLoaded: boolean = false;

  private constructor() {
    // Initialize with empty arrays, will be populated when dependencies are loaded
    this.rpcEndpoints = [];
  }

  public static getInstance(): TransactionUtils {
    if (!TransactionUtils.instance) {
      TransactionUtils.instance = new TransactionUtils();
    }
    return TransactionUtils.instance;
  }

  private async ensureDependenciesLoaded(): Promise<void> {
    if (!this.dependenciesLoaded) {
      await loadDependencies();
      this.rpcEndpoints = getConfig().blockchain.rpcEndpoints || [getConfig().blockchain.rpcUrl];
      this.connection = this.createOptimizedConnection();
      this.dependenciesLoaded = true;
    }
  }

  private createOptimizedConnection(): Connection {
    const currentEndpoint = this.rpcEndpoints[this.currentEndpointIndex];
    
    return new Connection(currentEndpoint, {
      commitment: getConfig().blockchain.commitment,
      confirmTransactionInitialTimeout: TRANSACTION_CONFIG.timeout.transaction,
      wsEndpoint: getConfig().blockchain.wsUrl,
      disableRetryOnRateLimit: false,
      // Performance optimizations
      httpHeaders: {
        'User-Agent': 'WeSplit/1.0',
        'Connection': 'keep-alive',
      },
      // Enhanced connection pooling with better timeout handling
      fetch: (url, options) => {
        const controller = new AbortController();
        // Use a more generous timeout for blockhash requests (30 seconds)
        const timeoutDuration = url.toString().includes('getLatestBlockhash') ? 30000 : TRANSACTION_CONFIG.timeout.connection;
        const timeoutId = setTimeout(() => {
          logger.warn('Request timeout, aborting', { 
            url: url.toString(), 
            timeout: timeoutDuration,
            endpoint: currentEndpoint 
          }, 'TransactionUtils');
          controller.abort();
        }, timeoutDuration);
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    });
  }

  public async getConnection(): Promise<any> {
    await this.ensureDependenciesLoaded();
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
    await this.ensureDependenciesLoaded();
    const maxRetries = 5; // Increased from 3 to 5 for better reliability
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logger.info(`Getting blockhash attempt ${attempt + 1}/${maxRetries}`, { 
          endpoint: this.rpcEndpoints[this.currentEndpointIndex],
          commitment 
        }, 'TransactionUtils');
        
        const { blockhash } = await this.connection.getLatestBlockhash(commitment);
        
        logger.info('Successfully retrieved blockhash', { 
          blockhash: blockhash.slice(0, 8) + '...',
          attempt: attempt + 1,
          endpoint: this.rpcEndpoints[this.currentEndpointIndex]
        }, 'TransactionUtils');
        
        return blockhash;
      } catch (error) {
        lastError = error as Error;
        const errorMessage = lastError.message;
        
        logger.warn(`Failed to get blockhash on attempt ${attempt + 1}/${maxRetries}`, { 
          error: errorMessage,
          endpoint: this.rpcEndpoints[this.currentEndpointIndex],
          attempt: attempt + 1
        }, 'TransactionUtils');
        
        // Check if it's a network error that might benefit from RPC failover
        const isNetworkError = error instanceof Error && (
          errorMessage.includes('fetch') || 
          errorMessage.includes('network') || 
          errorMessage.includes('timeout') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('AbortSignal') ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('AbortError') ||
          errorMessage.includes('Failed to fetch')
        );
        
        if (isNetworkError) {
          logger.info('Switching RPC endpoint due to network error', { 
            currentEndpoint: this.rpcEndpoints[this.currentEndpointIndex],
            error: errorMessage
          }, 'TransactionUtils');
          await this.switchToNextEndpoint();
        }

        // Wait before retry (exponential backoff with jitter)
        if (attempt < maxRetries - 1) {
          const baseDelay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
          const jitter = Math.random() * 1000; // Add up to 1s of jitter
          const delay = baseDelay + jitter;
          
          logger.info(`Waiting ${Math.round(delay)}ms before retry`, { 
            baseDelay,
            jitter: Math.round(jitter),
            attempt: attempt + 1
          }, 'TransactionUtils');
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If all attempts failed, try one more time with a different commitment level
    if (commitment === 'confirmed') {
      logger.warn('All confirmed blockhash attempts failed, trying with finalized commitment', {}, 'TransactionUtils');
      try {
        const { blockhash } = await this.connection.getLatestBlockhash('finalized');
        logger.info('Successfully retrieved blockhash with finalized commitment', { 
          blockhash: blockhash.slice(0, 8) + '...'
        }, 'TransactionUtils');
        return blockhash;
      } catch (finalError) {
        logger.error('Final blockhash attempt with finalized commitment also failed', { 
          error: finalError instanceof Error ? finalError.message : String(finalError)
        }, 'TransactionUtils');
      }
    }

    throw new Error(`Failed to get blockhash after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Send transaction with retry logic and RPC failover
   */
  public async sendTransactionWithRetry(
    transaction: any, 
    signers: any[], 
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    await this.ensureDependenciesLoaded();
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
  public async confirmTransactionWithTimeout(signature: string, customTimeout?: number): Promise<boolean> {
    await this.ensureDependenciesLoaded();
    const timeout = customTimeout || TRANSACTION_CONFIG.timeout.confirmation;
    
    try {
      // Try multiple confirmation methods for better reliability
      const confirmationPromise = this.connection.confirmTransaction(signature, 'confirmed');
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Transaction was not confirmed in ${timeout/1000} seconds. It is unknown if it succeeded or failed. Check signature ${signature} using the Solana Explorer or CLI tools.`)), timeout);
      });

      const result = await Promise.race([confirmationPromise, timeoutPromise]);
      
      if (result.value?.err) {
        throw new Error(`Transaction failed: ${result.value.err.toString()}`);
      }

      // Additional verification using signature status
      try {
        const signatureStatus = await this.connection.getSignatureStatus(signature, { searchTransactionHistory: true });
        if (signatureStatus.value && !signatureStatus.value.err) {
          logger.info('Transaction confirmed via signature status', { 
            signature, 
            confirmationStatus: signatureStatus.value.confirmationStatus 
          }, 'TransactionUtils');
          return true;
        }
      } catch (statusError) {
        logger.warn('Signature status check failed, but transaction may still be confirmed', { 
          signature, 
          error: statusError instanceof Error ? statusError.message : String(statusError)
        }, 'TransactionUtils');
      }

      return true;
    } catch (error) {
      // Try alternative confirmation method before giving up
      try {
        const signatureStatus = await this.connection.getSignatureStatus(signature, { searchTransactionHistory: true });
        if (signatureStatus.value && !signatureStatus.value.err) {
          logger.info('Transaction confirmed via alternative signature status check', { 
            signature, 
            confirmationStatus: signatureStatus.value.confirmationStatus 
          }, 'TransactionUtils');
          return true;
        }
      } catch (statusError) {
        // Ignore status check errors, we'll return false below
      }

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
