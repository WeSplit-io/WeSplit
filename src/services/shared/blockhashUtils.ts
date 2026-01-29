/**
 * Shared Blockhash Utilities
 * Centralized blockhash handling to eliminate duplication
 * Best practices: Get fresh blockhash, track age, rebuild if needed
 */

import { Connection } from '@solana/web3.js';
import { getConfig } from '../../config/unified';
import { logger } from '../analytics/loggingService';

/**
 * Maximum age for blockhash before rebuilding transaction (1 second)
 * Blockhashes expire after ~60 seconds, but Firebase processing can take significant time:
 * - Network latency to Firebase (100-500ms)
 * - Firebase Firestore checks (400-1000ms) - CRITICAL DELAY
 * - Firebase cold start (1-3 seconds on first call)
 * - Transaction signing time (100-200ms)
 * - Transaction submission time (500-2000ms)
 * - Client-side async operations (token account checks, etc.) can add 500-2000ms
 * Total: ~2.5-8 seconds, so 1s threshold ensures blockhash is extremely fresh
 * CRITICAL: On mainnet, Firebase Firestore operations alone add 400-1000ms delay
 * We rebuild at 1s to ensure blockhash is extremely fresh when Firebase processes it
 * This is very aggressive but necessary for mainnet reliability
 */
export const BLOCKHASH_MAX_AGE_MS = 1000; // 1 second - extremely aggressive refresh for mainnet reliability

/**
 * Blockhash with timestamp for age tracking
 */
export interface BlockhashWithTimestamp {
  blockhash: string;
  lastValidBlockHeight: number;
  timestamp: number;
}

/**
 * Default retry/backoff for getLatestBlockhash (used by split and shared wallet withdrawals)
 */
const DEFAULT_BLOCKHASH_RETRIES = 3;
const DEFAULT_BLOCKHASH_BACKOFF_MS = [1000, 2000];

/**
 * Get latest blockhash with retry for transient network errors.
 * Shared by Fair Split and Shared Wallet withdrawal handlers (centralized RPC usage).
 * @returns { blockhash, lastValidBlockHeight }
 */
export async function getLatestBlockhashWithRetry(
  connection: Connection,
  commitment: 'confirmed' | 'finalized' = 'confirmed',
  maxRetries: number = DEFAULT_BLOCKHASH_RETRIES,
  backoffMs: number[] = DEFAULT_BLOCKHASH_BACKOFF_MS
): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await connection.getLatestBlockhash(commitment);
      return result;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isNetworkError =
        msg.includes('Network request failed') ||
        msg.includes('get recent blockhash') ||
        msg.includes('failed to get recent blockhash') ||
        msg.includes('fetch failed');
      if (!isNetworkError || attempt === maxRetries) {
        throw err;
      }
      logger.warn('getLatestBlockhash failed, retrying', {
        attempt,
        maxAttempts: maxRetries,
        error: msg,
      }, 'BlockhashUtils');
      await new Promise((r) => setTimeout(r, backoffMs[attempt - 1] ?? 2000));
    }
  }
  throw lastError;
}

/**
 * Get fresh blockhash with timestamp tracking
 * Best practice: Get blockhash right before transaction creation
 * CRITICAL: Also validates the blockhash is actually valid on-chain
 */
export async function getFreshBlockhash(
  connection: Connection,
  commitment: 'confirmed' | 'finalized' = 'confirmed'
): Promise<BlockhashWithTimestamp> {
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);
    
    // CRITICAL: Validate the blockhash is actually valid on-chain
    // This ensures we're not using a blockhash that's already expired
    // Blockhashes expire based on slot height, not just time
    try {
      const isValid = await connection.isBlockhashValid(blockhash, { commitment });
      const isValidValue = isValid && (typeof isValid === 'boolean' ? isValid : isValid.value === true);
      
      if (!isValidValue) {
        logger.warn('Blockhash from getLatestBlockhash is already invalid, getting new one', {
          blockhash: `${blockhash.substring(0, 8)}...`,
          lastValidBlockHeight
        }, 'BlockhashUtils');
        
        // Get a fresh one - the previous one was already expired
        const freshResult = await connection.getLatestBlockhash(commitment);
        return {
          blockhash: freshResult.blockhash,
          lastValidBlockHeight: freshResult.lastValidBlockHeight,
          timestamp: Date.now()
        };
      }
    } catch (validationError) {
      // If validation fails (network error), log but proceed with the blockhash
      // The actual submission will catch if it's expired
      logger.warn('Failed to validate blockhash, proceeding anyway', {
        error: validationError instanceof Error ? validationError.message : String(validationError),
        blockhash: `${blockhash.substring(0, 8)}...`
      }, 'BlockhashUtils');
    }
    
    logger.debug('Got fresh blockhash', {
      blockhash: `${blockhash.substring(0, 8)}...`,
      lastValidBlockHeight,
      commitment,
      timestamp: Date.now()
    }, 'BlockhashUtils');
    
    return {
      blockhash,
      lastValidBlockHeight,
      timestamp: Date.now()
    };
  } catch (error) {
    logger.error('Failed to get fresh blockhash', {
      error: error instanceof Error ? error.message : String(error),
      commitment
    }, 'BlockhashUtils');
    throw error;
  }
}

/**
 * Check if blockhash is too old and needs refresh
 * Best practice: Check before sending to backend
 */
export function isBlockhashTooOld(blockhashTimestamp: number): boolean {
  const age = Date.now() - blockhashTimestamp;
  const isTooOld = age > BLOCKHASH_MAX_AGE_MS;
  
  if (isTooOld) {
    logger.warn('Blockhash is too old, needs refresh', {
      ageMs: age,
      maxAgeMs: BLOCKHASH_MAX_AGE_MS
    }, 'BlockhashUtils');
  }
  
  return isTooOld;
}

/**
 * Get blockhash age in milliseconds
 */
export function getBlockhashAge(blockhashTimestamp: number): number {
  return Date.now() - blockhashTimestamp;
}

/**
 * Check if blockhash needs rebuild (age check + on-chain validation)
 * This combines both time-based and slot-based expiration checks
 */
export async function shouldRebuildTransaction(
  connection: Connection,
  blockhash: string,
  blockhashTimestamp: number
): Promise<{ needsRebuild: boolean; reason?: string }> {
  // First check: Is blockhash too old based on time?
  if (isBlockhashTooOld(blockhashTimestamp)) {
    return {
      needsRebuild: true,
      reason: `Blockhash age (${getBlockhashAge(blockhashTimestamp)}ms) exceeds maximum (${BLOCKHASH_MAX_AGE_MS}ms)`
    };
  }

  // Second check: Is blockhash still valid on-chain?
  // Blockhashes expire based on slot height, not just time
  try {
    const isValid = await connection.isBlockhashValid(blockhash, { commitment: 'confirmed' });
    const isValidValue = isValid && (typeof isValid === 'boolean' ? isValid : isValid.value === true);
    
    if (!isValidValue) {
      return {
        needsRebuild: true,
        reason: 'Blockhash expired based on slot height (not just time)'
      };
    }
  } catch (validationError) {
    // If validation fails (network error), log but don't force rebuild
    // The actual submission will catch if it's expired
    logger.warn('Failed to validate blockhash on-chain, proceeding anyway', {
      error: validationError instanceof Error ? validationError.message : String(validationError),
      blockhash: `${blockhash.substring(0, 8)}...`
    }, 'BlockhashUtils');
  }

  return { needsRebuild: false };
}

/**
 * Verify blockhash is correctly embedded in transaction at all steps
 * This ensures blockhash integrity throughout the transaction building process
 */
export function verifyBlockhashInTransaction(
  transaction: any,
  expectedBlockhash: string,
  step: 'Transaction' | 'CompiledMessage' | 'VersionedTransaction' | 'SerializedTransaction'
): void {
  let actualBlockhash: string | null = null;

  try {
    if (step === 'Transaction') {
      actualBlockhash = transaction.recentBlockhash?.toString() || null;
    } else if (step === 'CompiledMessage') {
      actualBlockhash = transaction.recentBlockhash?.toString() || null;
    } else if (step === 'VersionedTransaction') {
      actualBlockhash = transaction.message.recentBlockhash?.toString() || null;
    } else if (step === 'SerializedTransaction') {
      // For serialized, we need to deserialize first
      const { VersionedTransaction } = require('@solana/web3.js');
      const deserialized = VersionedTransaction.deserialize(transaction);
      actualBlockhash = deserialized.message.recentBlockhash?.toString() || null;
    }

    if (!actualBlockhash || actualBlockhash !== expectedBlockhash) {
      logger.error(`CRITICAL: Blockhash mismatch in ${step}!`, {
        expected: expectedBlockhash.substring(0, 8) + '...',
        actual: actualBlockhash?.substring(0, 8) + '...',
        note: `${step} blockhash does not match the expected blockhash`
      }, 'BlockhashUtils');
      throw new Error(`Blockhash mismatch: ${step} does not contain the expected blockhash`);
    }

    logger.debug(`Verified blockhash in ${step}`, {
      blockhash: actualBlockhash.substring(0, 8) + '...',
      blockhashFull: actualBlockhash,
      matches: actualBlockhash === expectedBlockhash,
      note: `Blockhash is correctly embedded in ${step}`
    }, 'BlockhashUtils');
  } catch (error) {
    if (error instanceof Error && error.message.includes('Blockhash mismatch')) {
      throw error;
    }
    logger.error(`Failed to verify blockhash in ${step}`, {
      error: error instanceof Error ? error.message : String(error),
      step
    }, 'BlockhashUtils');
    throw error;
  }
}

