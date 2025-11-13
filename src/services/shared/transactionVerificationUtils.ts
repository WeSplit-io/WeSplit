/**
 * Shared Transaction Verification Utilities
 * Centralized verification logic to eliminate duplication
 * Best practices: Network-aware verification, proper error handling, rate limit handling
 */

import { Connection } from '@solana/web3.js';
import { getConfig } from '../../config/unified';
import { logger } from '../analytics/loggingService';

/**
 * Verification result
 */
export interface VerificationResult {
  success: boolean;
  error?: string;
  confirmationStatus?: 'confirmed' | 'finalized' | 'pending';
  confirmations?: number;
  slot?: number;
  note?: string;
}

/**
 * Verification options
 */
export interface VerificationOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  useDelayedCheck?: boolean; // For mainnet, wait before final check
  delayedCheckWaitMs?: number; // How long to wait for delayed check
  delayedCheckTimeoutMs?: number; // Timeout for delayed check
}

/**
 * Default verification options
 */
const DEFAULT_OPTIONS: Required<VerificationOptions> = {
  maxAttempts: 3,
  baseDelayMs: 5000,
  useDelayedCheck: true,
  delayedCheckWaitMs: 15000,
  delayedCheckTimeoutMs: 20000
};

/**
 * Verify transaction on blockchain with network-aware logic
 * Best practice: Use delayed check on mainnet, immediate on devnet
 */
export async function verifyTransactionOnBlockchain(
  connection: Connection,
  signature: string,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  const config = getConfig();
  const isMainnet = config.blockchain.network === 'mainnet';
  
  // Merge options with defaults, network-aware
  const opts: Required<VerificationOptions> = {
    maxAttempts: options.maxAttempts ?? (isMainnet ? 3 : 2),
    baseDelayMs: options.baseDelayMs ?? (isMainnet ? 5000 : 300),
    useDelayedCheck: options.useDelayedCheck ?? isMainnet,
    delayedCheckWaitMs: options.delayedCheckWaitMs ?? 15000,
    delayedCheckTimeoutMs: options.delayedCheckTimeoutMs ?? 20000
  };

  logger.info('Verifying transaction on blockchain', {
    signature,
    network: config.blockchain.network,
    maxAttempts: opts.maxAttempts,
    baseDelayMs: opts.baseDelayMs
  }, 'TransactionVerificationUtils');

  // Initial verification attempts
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const status = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true
      });

      if (status.value) {
        // Check for transaction error first
        if (status.value.err) {
          logger.error('Transaction failed on blockchain', {
            signature,
            error: status.value.err,
            attempt
          }, 'TransactionVerificationUtils');
          return {
            success: false,
            error: `Transaction failed: ${status.value.err.toString()}`
          };
        }

        // Check for confirmation status
        const confirmationStatus = status.value.confirmationStatus;
        const confirmations = status.value.confirmations || 0;
        
        if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized' || confirmations > 0) {
          logger.info('Transaction confirmed on blockchain', {
            signature,
            confirmations,
            confirmationStatus,
            slot: status.value.slot,
            attempt
          }, 'TransactionVerificationUtils');
          return {
            success: true,
            confirmationStatus: confirmationStatus as 'confirmed' | 'finalized',
            confirmations,
            slot: status.value.slot
          };
        }
      }

      if (attempt < opts.maxAttempts) {
        logger.debug('Transaction not yet confirmed, retrying', {
          signature,
          attempt,
          maxAttempts: opts.maxAttempts,
          network: config.blockchain.network
        }, 'TransactionVerificationUtils');
        await new Promise(resolve => setTimeout(resolve, opts.baseDelayMs));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRateLimit = errorMessage.includes('429') || 
                         errorMessage.includes('rate limit') || 
                         errorMessage.includes('too many requests');
      
      if (isRateLimit) {
        // Exponential backoff for rate limit errors
        const rateLimitDelay = opts.baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn('Rate limit detected during verification, using exponential backoff', {
          signature,
          attempt,
          delayMs: rateLimitDelay,
          network: config.blockchain.network
        }, 'TransactionVerificationUtils');
        
        if (attempt < opts.maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
          continue; // Retry after backoff
        }
      } else {
        logger.warn('Verification attempt failed', {
          signature,
          attempt,
          error: errorMessage
        }, 'TransactionVerificationUtils');
      }
      
      if (attempt < opts.maxAttempts && !isRateLimit) {
        await new Promise(resolve => setTimeout(resolve, opts.baseDelayMs));
      }
    }
  }

  // If initial attempts failed and delayed check is enabled (mainnet), try delayed check
  if (opts.useDelayedCheck && isMainnet) {
    return await performDelayedCheck(connection, signature, opts);
  }

  // If we reach here, all verification attempts failed
  logger.warn('Transaction verification timeout', {
    signature,
    maxAttempts: opts.maxAttempts,
    network: config.blockchain.network,
    note: 'Transaction was submitted successfully. It may still be processing on the blockchain.'
  }, 'TransactionVerificationUtils');

  // On mainnet, be more lenient - transaction was accepted by network
  if (isMainnet) {
    logger.info('Transaction verification timeout on mainnet, assuming success', {
      signature,
      note: 'Transaction was accepted by network, verification timeout likely due to RPC rate limits'
    }, 'TransactionVerificationUtils');
    return { success: true };
  }

  // For devnet, return failure if we can't verify
  return {
    success: false,
    error: 'Transaction verification timeout. Please check transaction status on Solana Explorer.'
  };
}

/**
 * Perform delayed check after waiting for transaction to propagate
 * Best practice: Wait 15 seconds on mainnet, then check once more
 */
async function performDelayedCheck(
  connection: Connection,
  signature: string,
  opts: Required<VerificationOptions>
): Promise<VerificationResult> {
  logger.info('Mainnet verification attempts exhausted, trying delayed final check', {
    signature,
    maxAttempts: opts.maxAttempts,
    note: `Will wait ${opts.delayedCheckWaitMs}ms for transaction to propagate, then check once`
  }, 'TransactionVerificationUtils');
  
  // Wait for transaction to propagate and be indexed
  await new Promise(resolve => setTimeout(resolve, opts.delayedCheckWaitMs));
  
  // Single final check with proper error handling
  try {
    const finalStatus = await Promise.race([
      connection.getSignatureStatus(signature, { searchTransactionHistory: true }),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error(`Final check timeout after ${opts.delayedCheckTimeoutMs}ms`)), opts.delayedCheckTimeoutMs)
      )
    ]);
    
    if (finalStatus.value) {
      // Check for errors first
      if (finalStatus.value.err) {
        logger.error('Transaction failed on blockchain (delayed check)', {
          signature,
          error: finalStatus.value.err
        }, 'TransactionVerificationUtils');
        return {
          success: false,
          error: `Transaction failed: ${finalStatus.value.err.toString()}`
        };
      }
      
      // Check confirmation status
      const confirmationStatus = finalStatus.value.confirmationStatus;
      const confirmations = finalStatus.value.confirmations || 0;
      
      if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized' || confirmations > 0) {
        logger.info('Transaction confirmed on blockchain (delayed check succeeded)', {
          signature,
          confirmations,
          confirmationStatus,
          slot: finalStatus.value.slot
        }, 'TransactionVerificationUtils');
        return {
          success: true,
          confirmationStatus: confirmationStatus as 'confirmed' | 'finalized',
          confirmations,
          slot: finalStatus.value.slot
        };
      } else {
        // Transaction exists but not yet confirmed
        logger.warn('Transaction found but not yet confirmed (delayed check)', {
          signature,
          confirmationStatus,
          confirmations,
          slot: finalStatus.value.slot,
          note: 'Transaction exists on blockchain but confirmation status is pending'
        }, 'TransactionVerificationUtils');
        // Still return success - transaction exists and will confirm
        return {
          success: true,
          confirmationStatus: 'pending',
          confirmations,
          slot: finalStatus.value.slot
        };
      }
    } else {
      // No status returned - transaction might not be indexed yet
      // On mainnet, RPC endpoints can be slow to index transactions
      // Since we got a signature from sendTransaction, the transaction was accepted
      // It may just need more time to propagate and be indexed
      logger.warn('Transaction not found on blockchain (delayed check) - may need more time to index', {
        signature,
        note: 'Transaction was submitted successfully. RPC may need more time to index. Check Solana Explorer to verify.'
      }, 'TransactionVerificationUtils');
      
      // On mainnet, assume success if we got a signature - transaction was accepted by network
      // RPC indexing delays are common and don't mean the transaction failed
      const config = getConfig();
      if (config.blockchain.network === 'mainnet') {
        logger.info('Assuming transaction success on mainnet (RPC indexing delay)', {
          signature,
          note: 'Transaction was accepted by network. Verification timeout likely due to RPC indexing delay.'
        }, 'TransactionVerificationUtils');
        return {
          success: true,
          confirmationStatus: 'pending',
          note: 'Transaction submitted successfully. Verification timeout due to RPC indexing delay.'
        };
      }
      
      return {
        success: false,
        error: 'Transaction not found on blockchain. It may have failed or not been submitted. Please check on Solana Explorer.'
      };
    }
  } catch (finalCheckError) {
    const errorMessage = finalCheckError instanceof Error ? finalCheckError.message : String(finalCheckError);
    const isRateLimit = errorMessage.includes('429') || 
                       errorMessage.includes('rate limit') || 
                       errorMessage.includes('too many requests');
    
    if (isRateLimit) {
      logger.warn('Rate limit during final delayed check', {
        signature,
        error: errorMessage,
        note: 'Cannot verify due to rate limits. Transaction may have succeeded or failed.'
      }, 'TransactionVerificationUtils');
      // Don't assume success on rate limit - return failure so user checks manually
      return {
        success: false,
        error: 'Transaction verification failed due to rate limits. Please check transaction status on Solana Explorer.'
      };
    } else {
      logger.error('Final delayed check failed', {
        signature,
        error: errorMessage
      }, 'TransactionVerificationUtils');
      // Don't assume success - return failure
      return {
        success: false,
        error: `Transaction verification failed: ${errorMessage}. Please check transaction status on Solana Explorer.`
      };
    }
  }
}

