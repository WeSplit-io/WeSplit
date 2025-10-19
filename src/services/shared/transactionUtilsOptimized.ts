/**
 * Memory-Optimized Transaction Utilities
 * Reduces heap usage by using lazy imports and minimal memory footprint
 */

// Minimal interface definitions to avoid heavy imports
interface Connection {
  getLatestBlockhash(commitment: string): Promise<{ blockhash: string }>;
  sendRawTransaction(buffer: Buffer, options: any): Promise<string>;
  confirmTransaction(signature: string, commitment: string): Promise<any>;
  getSignatureStatus(signature: string, options: any): Promise<any>;
}

interface Transaction {
  recentBlockhash: string | undefined;
  feePayer: any;
  add(instruction: any): void;
  sign(...signers: any[]): void;
  serialize(): Buffer;
}

// Lazy loading cache
let cachedModules: any = {};

async function loadModule(moduleName: string): Promise<any> {
  if (!cachedModules[moduleName]) {
    switch (moduleName) {
      case 'solana-web3':
        cachedModules[moduleName] = await import('@solana/web3.js');
        break;
      case 'config':
        cachedModules[moduleName] = await import('../../config/unified');
        break;
      case 'transactionConfig':
        cachedModules[moduleName] = await import('../../config/transactionConfig');
        break;
      case 'logger':
        cachedModules[moduleName] = await import('../loggingService');
        break;
      default:
        throw new Error(`Unknown module: ${moduleName}`);
    }
  }
  return cachedModules[moduleName];
}

export class OptimizedTransactionUtils {
  private static instance: OptimizedTransactionUtils;
  private connection: Connection | null = null;
  private rpcEndpoints: string[] = [];
  private currentEndpointIndex: number = 0;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): OptimizedTransactionUtils {
    if (!OptimizedTransactionUtils.instance) {
      OptimizedTransactionUtils.instance = new OptimizedTransactionUtils();
    }
    return OptimizedTransactionUtils.instance;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const [configModule, transactionConfigModule, loggerModule] = await Promise.all([
      loadModule('config'),
      loadModule('transactionConfig'),
      loadModule('logger')
    ]);

    const getConfig = configModule.getConfig;
    const TRANSACTION_CONFIG = transactionConfigModule.TRANSACTION_CONFIG;
    const logger = loggerModule.logger;

    this.rpcEndpoints = getConfig().blockchain.rpcEndpoints || [getConfig().blockchain.rpcUrl];
    this.connection = await this.createConnection();
    this.initialized = true;
  }

  private async createConnection(): Promise<Connection> {
    const solanaWeb3 = await loadModule('solana-web3');
    const configModule = await loadModule('config');
    const transactionConfigModule = await loadModule('transactionConfig');
    
    const { Connection } = solanaWeb3;
    const getConfig = configModule.getConfig;
    const TRANSACTION_CONFIG = transactionConfigModule.TRANSACTION_CONFIG;

    const currentEndpoint = this.rpcEndpoints[this.currentEndpointIndex];
    
    return new Connection(currentEndpoint, {
      commitment: getConfig().blockchain.commitment,
      confirmTransactionInitialTimeout: TRANSACTION_CONFIG.timeout.transaction,
      wsEndpoint: getConfig().blockchain.wsUrl,
      disableRetryOnRateLimit: false,
      httpHeaders: {
        'User-Agent': 'WeSplit/1.0',
        'Connection': 'keep-alive',
      },
      fetch: (url: string, options: any) => {
        const controller = new AbortController();
        const timeoutDuration = url.includes('getLatestBlockhash') ? 30000 : TRANSACTION_CONFIG.timeout.connection;
        const timeoutId = setTimeout(() => {
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

  public async getLatestBlockhashWithRetry(commitment: 'confirmed' | 'finalized' = 'confirmed'): Promise<string> {
    await this.initialize();
    
    const maxRetries = 5;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (!this.connection) {
          this.connection = await this.createConnection();
        }

        const { blockhash } = await this.connection.getLatestBlockhash(commitment);
        return blockhash;
      } catch (error) {
        lastError = error as Error;
        const errorMessage = lastError.message;
        
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
          await this.switchToNextEndpoint();
        }

        // Wait before retry (exponential backoff with jitter)
        if (attempt < maxRetries - 1) {
          const baseDelay = 1000 * Math.pow(2, attempt);
          const jitter = Math.random() * 1000;
          const delay = baseDelay + jitter;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If all attempts failed, try one more time with a different commitment level
    if (commitment === 'confirmed') {
      try {
        if (!this.connection) {
          this.connection = await this.createConnection();
        }
        const { blockhash } = await this.connection.getLatestBlockhash('finalized');
        return blockhash;
      } catch (finalError) {
        // Ignore final error
      }
    }

    throw new Error(`Failed to get blockhash after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  public async sendTransactionWithRetry(
    transaction: Transaction, 
    signers: any[], 
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    await this.initialize();
    
    const transactionConfigModule = await loadModule('transactionConfig');
    const TRANSACTION_CONFIG = transactionConfigModule.TRANSACTION_CONFIG;
    
    const maxRetries = TRANSACTION_CONFIG.retry.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get fresh blockhash for each attempt with retry logic
        const blockhash = await this.getLatestBlockhashWithRetry('confirmed');
        transaction.recentBlockhash = blockhash;

        // Sign the transaction
        transaction.sign(...signers);

        // Log transaction details before sending
        console.log(`📋 Transaction details:`, {
          instructionCount: transaction.instructions.length,
          recentBlockhash: transaction.recentBlockhash,
          feePayer: transaction.feePayer?.toBase58(),
          signersCount: signers.length,
          signerAddresses: signers.map(s => s.publicKey.toBase58())
        });

        if (!this.connection) {
          this.connection = await this.createConnection();
        }

        // Log which RPC endpoint we're using
        const currentEndpoint = this.rpcEndpoints[this.currentEndpointIndex];
        console.log(`🌐 Using RPC endpoint: ${currentEndpoint}`);

        // Send transaction
        console.log(`🚀 Attempting to send transaction to blockchain...`);
        const serializedTransaction = transaction.serialize();
        console.log(`📦 Serialized transaction size: ${serializedTransaction.length} bytes`);
        
        let signature: string;
        try {
          signature = await this.connection.sendRawTransaction(serializedTransaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 0,
          });
        } catch (sendError) {
          console.log(`❌ sendRawTransaction failed:`, {
            error: sendError instanceof Error ? sendError.message : String(sendError),
            stack: sendError instanceof Error ? sendError.stack : undefined
          });
          throw sendError;
        }

        // CRITICAL: Verify the signature is valid
        if (!signature || signature.length < 80) {
          throw new Error(`Invalid signature returned from sendRawTransaction: ${signature}`);
        }

        console.log(`✅ Transaction sent successfully with signature: ${signature}`);
        
        // CRITICAL: Immediately verify the transaction exists on blockchain
        try {
          console.log(`🔍 Verifying transaction exists on blockchain using endpoint: ${currentEndpoint}...`);
          const signatureStatus = await this.connection.getSignatureStatus(signature, { searchTransactionHistory: true });
          
          if (signatureStatus.value) {
            console.log(`✅ Transaction found on blockchain:`, {
              signature,
              confirmationStatus: signatureStatus.value.confirmationStatus,
              err: signatureStatus.value.err
            });
          } else {
            console.log(`⚠️ Transaction signature returned but not found on blockchain: ${signature}`);
            // Don't fail immediately, but log the warning
          }
        } catch (verifyError) {
          console.log(`⚠️ Could not verify transaction on blockchain:`, verifyError instanceof Error ? verifyError.message : String(verifyError));
        }
        
        return signature;
      } catch (error) {
        lastError = error as Error;
        
        console.log(`❌ Transaction send attempt ${attempt + 1} failed:`, {
          error: error instanceof Error ? error.message : String(error),
          attempt: attempt + 1,
          maxRetries
        });
        
        // Check if it's a network error that might benefit from RPC failover
        const isNetworkError = error instanceof Error && (
          error.message.includes('fetch') || 
          error.message.includes('network') || 
          error.message.includes('timeout') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('AbortSignal') ||
          error.message.includes('aborted') ||
          error.message.includes('AbortError')
        );
        
        if (isNetworkError) {
          console.log(`🔄 Network error detected, switching to next RPC endpoint`);
          await this.switchToNextEndpoint();
        }

        // Wait before retry
        if (attempt < maxRetries - 1) {
          const delay = TRANSACTION_CONFIG.retry.retryDelay * Math.pow(2, attempt);
          console.log(`⏳ Waiting ${delay}ms before retry attempt ${attempt + 2}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to send transaction after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  public async confirmTransactionWithTimeout(signature: string, customTimeout?: number): Promise<boolean> {
    await this.initialize();
    
    const transactionConfigModule = await loadModule('transactionConfig');
    const TRANSACTION_CONFIG = transactionConfigModule.TRANSACTION_CONFIG;
    
    const timeout = customTimeout || TRANSACTION_CONFIG.timeout.confirmation;
    
    try {
      if (!this.connection) {
        this.connection = await this.createConnection();
      }

      // Use a more aggressive confirmation strategy with shorter timeouts
      const shortTimeout = Math.min(timeout, 30000); // Max 30 seconds for initial confirmation
      
      // Try confirmation with shorter timeout first
      const confirmationPromise = this.connection.confirmTransaction(signature, 'confirmed');
      const shortTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Initial confirmation timeout after ${shortTimeout/1000} seconds`)), shortTimeout);
      });

      try {
        const result = await Promise.race([confirmationPromise, shortTimeoutPromise]);
        
        if (result.value?.err) {
          throw new Error(`Transaction failed: ${result.value.err.toString()}`);
        }

        // Additional verification using signature status
        try {
          const signatureStatus = await this.connection.getSignatureStatus(signature, { searchTransactionHistory: true });
          if (signatureStatus.value && !signatureStatus.value.err) {
            return true;
          }
        } catch (statusError) {
          // Ignore status check errors
        }

        return true;
      } catch (shortTimeoutError) {
        // If short timeout fails, try alternative confirmation method immediately
        console.log(`Initial confirmation timed out, trying alternative method for signature: ${signature}`);
        
        // Try alternative confirmation method with remaining time
        const remainingTime = timeout - shortTimeout;
        if (remainingTime > 5000) { // Only if we have at least 5 seconds left
          const alternativePromise = this.connection.getSignatureStatus(signature, { searchTransactionHistory: true });
          const alternativeTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Alternative confirmation timeout after ${remainingTime/1000} seconds`)), remainingTime);
          });

          try {
            const signatureStatus = await Promise.race([alternativePromise, alternativeTimeoutPromise]);
            if (signatureStatus.value && !signatureStatus.value.err) {
              return true;
            }
          } catch (altError) {
            console.log(`Alternative confirmation also failed: ${altError instanceof Error ? altError.message : String(altError)}`);
          }
        }
        
        throw shortTimeoutError;
      }
    } catch (error) {
      // Final fallback: try one more time with getSignatureStatus
      try {
        if (!this.connection) {
          this.connection = await this.createConnection();
        }
        
        // Quick final check with a short timeout
        const finalCheckPromise = this.connection.getSignatureStatus(signature, { searchTransactionHistory: true });
        const finalTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Final confirmation check timeout')), 5000);
        });

        const signatureStatus = await Promise.race([finalCheckPromise, finalTimeoutPromise]);
        if (signatureStatus.value && !signatureStatus.value.err) {
          return true;
        }
      } catch (finalError) {
        console.log(`Final confirmation check failed: ${finalError instanceof Error ? finalError.message : String(finalError)}`);
      }

      return false;
    }
  }

  public async getConnection(): Promise<Connection> {
    await this.initialize();
    if (!this.connection) {
      this.connection = await this.createConnection();
    }
    return this.connection;
  }

  public async switchToNextEndpoint(): Promise<void> {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length;
    this.connection = await this.createConnection();
  }
}

// Export singleton instance
export const optimizedTransactionUtils = OptimizedTransactionUtils.getInstance();
