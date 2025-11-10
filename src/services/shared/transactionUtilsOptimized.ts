/**
 * Memory-Optimized Transaction Utilities
 * Reduces heap usage by using lazy imports and minimal memory footprint
 */

import { Platform } from 'react-native';

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
  instructions: any[];
  add(instruction: any): void;
  sign(...signers: any[]): void;
  serialize(): Buffer;
}

// Lazy loading cache
const cachedModules: any = {};

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
        cachedModules[moduleName] = await import('../../config/constants/transactionConfig');
        break;
      case 'logger':
        cachedModules[moduleName] = await import('../core');
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
    if (this.initialized) {return;}

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
    
    const connectionOptions: any = {
      commitment: getConfig().blockchain.commitment,
      confirmTransactionInitialTimeout: TRANSACTION_CONFIG.timeout.transaction,
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
    };

    // Only add wsEndpoint if it's configured and valid to avoid WebSocket errors
    const wsUrl = getConfig().blockchain.wsUrl;
    if (wsUrl && wsUrl.trim() !== '') {
      connectionOptions.wsEndpoint = wsUrl;
    }

    return new Connection(currentEndpoint, connectionOptions);
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
          errorMessage.includes('Failed to fetch') ||
          // Treat RPC auth/permission errors as failover triggers
          errorMessage.includes('403') ||
          errorMessage.includes('-32052') ||
          errorMessage.toLowerCase().includes('api key is not allowed') ||
          errorMessage.toLowerCase().includes('not allowed to access blockchain')
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
    priority: 'low' | 'medium' | 'high' = 'medium',
    disableRebroadcast: boolean = false
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

        // Get logger for logging
        const loggerModule = await loadModule('logger');
        const logger = loggerModule.logger;

        // Log transaction details before sending
        logger.debug('Transaction details', {
          instructionCount: transaction.instructions.length,
          recentBlockhash: transaction.recentBlockhash,
          feePayer: transaction.feePayer?.toBase58(),
          signersCount: signers.length,
          signerAddresses: signers.map((s: any) => s.publicKey.toBase58())
        }, 'OptimizedTransactionUtils');

        if (!this.connection) {
          this.connection = await this.createConnection();
        }

        // Log which RPC endpoint we're using
        const currentEndpoint = this.rpcEndpoints[this.currentEndpointIndex];
        logger.debug('Using RPC endpoint', { endpoint: currentEndpoint }, 'OptimizedTransactionUtils');

        // Send transaction
        logger.debug('Attempting to send transaction to blockchain', null, 'OptimizedTransactionUtils');
        const serializedTransaction = transaction.serialize();
        logger.debug('Serialized transaction size', { size: serializedTransaction.length }, 'OptimizedTransactionUtils');
        
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
          let signatureStatus = await this.connection.getSignatureStatus(signature, { searchTransactionHistory: true });

          if (!signatureStatus.value && !disableRebroadcast) {
            // Propagation assist: rebroadcast to next RPC endpoint if signature not visible yet
            // Skip if we get authentication errors (401/403) to avoid spamming errors
            try {
              console.log(`🔁 Rebroadcasting transaction to next RPC endpoint to improve propagation...`);
              await this.switchToNextEndpoint();
              const rebroadcastEndpoint = this.rpcEndpoints[this.currentEndpointIndex];
              if (!this.connection) {
                this.connection = await this.createConnection();
              }
              await this.connection.sendRawTransaction(serializedTransaction, {
                skipPreflight: true,
                preflightCommitment: 'confirmed',
                maxRetries: 0,
              });
              console.log(`📡 Rebroadcast attempted via ${rebroadcastEndpoint}`);
              // Check again on the new endpoint
              signatureStatus = await this.connection.getSignatureStatus(signature, { searchTransactionHistory: true });
            } catch (rebroadcastError) {
              const errorMessage = rebroadcastError instanceof Error ? rebroadcastError.message : String(rebroadcastError);
              // Skip logging auth errors to reduce noise
              if (!errorMessage.includes('401') && !errorMessage.includes('403') && !errorMessage.includes('api key') && !errorMessage.includes('missing api key')) {
                console.log(`⚠️ Rebroadcast failed:`, errorMessage);
              }
            }
          } else if (!signatureStatus.value && disableRebroadcast) {
            console.log(`🚫 Rebroadcast disabled - skipping propagation assist`);
          }

          if (signatureStatus.value) {
            console.log(`✅ Transaction found on blockchain:`, {
              signature,
              confirmationStatus: signatureStatus.value.confirmationStatus,
              err: signatureStatus.value.err
            });
          } else {
            console.log(`⚠️ Transaction signature returned but not found on blockchain after verification attempts: ${signature}`);
            // Don't fail immediately; confirmation loop will handle further polling
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
        const em = error instanceof Error ? error.message : String(error);
        const isNetworkError = (
          em.includes('fetch') || 
          em.includes('network') || 
          em.includes('timeout') ||
          em.includes('ECONNREFUSED') ||
          em.includes('ENOTFOUND') ||
          em.includes('AbortSignal') ||
          em.includes('aborted') ||
          em.includes('AbortError') ||
          // Treat RPC auth/permission errors as failover triggers
          em.includes('403') ||
          em.includes('-32052') ||
          em.toLowerCase().includes('api key is not allowed') ||
          em.toLowerCase().includes('not allowed to access blockchain')
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

      // Fast-path: try quick HTTP status polling first to avoid WS flakiness
      try {
        const quickStart = Date.now();
        const quickPollDuration = Math.min(timeout, 3000); // Max 3s quick poll
        while (Date.now() - quickStart < quickPollDuration) {
          const quickStatus = await this.connection.getSignatureStatus(signature, { searchTransactionHistory: true });
          if (quickStatus.value && !quickStatus.value.err) {
            return true;
          }
          await new Promise(resolve => setTimeout(resolve, 300)); // Reduced from 500ms to 300ms
        }
      } catch (_) {
        // ignore and continue to main flow
      }

      // Use a more resilient confirmation strategy with reduced timeout
      // Reduced timeouts for faster response - transactions will eventually confirm
      const isIOS = Platform.OS === 'ios';
      const isProduction = __DEV__ === false;
      const maxTimeout = isIOS && isProduction ? 30000 : 20000; // Reduced: 30s for iOS production, 20s for others
      const shortTimeout = Math.min(timeout, maxTimeout);
      
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
        
        // Try alternative confirmation method with polling for the remaining time
        const remainingTime = Math.max(0, Math.min(timeout - shortTimeout, 5000)); // Cap at 5s max
        const pollIntervalMs = 1000; // Reduced: poll every 1s instead of 3s
        const deadline = Date.now() + remainingTime;
        let pollCount = 0;
        while (Date.now() < deadline) {
          try {
            const signatureStatus = await this.connection.getSignatureStatus(signature, { searchTransactionHistory: true });
            if (signatureStatus.value && !signatureStatus.value.err) {
              return true;
            }
          } catch (_) {
            // ignore and continue polling
          }

          // Periodically rotate RPC endpoint to improve visibility (less frequently)
          pollCount += 1;
          if (pollCount % 5 === 0) { // Reduced frequency: every 5 polls instead of 3
            try {
              await this.switchToNextEndpoint();
            } catch (_) {}
          }

          const sleepMs = Math.min(pollIntervalMs, Math.max(0, deadline - Date.now()));
          if (sleepMs <= 0) {break;}
          await new Promise(resolve => setTimeout(resolve, sleepMs));
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
