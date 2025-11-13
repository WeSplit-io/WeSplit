/**
 * Shared Blockhash Utilities
 * Centralized blockhash handling to eliminate duplication
 * Best practices: Get fresh blockhash, track age, rebuild if needed
 */

import { Connection } from '@solana/web3.js';
import { getConfig } from '../../config/unified';
import { logger } from '../analytics/loggingService';

/**
 * Maximum age for blockhash before rebuilding transaction (2 seconds)
 * Blockhashes expire after ~60 seconds, but Firebase processing can take significant time:
 * - Network latency to Firebase (100-500ms)
 * - Firebase cold start (1-3 seconds on first call)
 * - Transaction signing time (100-200ms)
 * - Transaction submission time (500-2000ms)
 * - Client-side async operations (token account checks, etc.) can add 500-2000ms
 * Total: ~2-7 seconds, so 2s threshold ensures blockhash is extremely fresh
 * CRITICAL: On mainnet, even with optimized RPC, async operations between blockhash and Firebase can take 1-2 seconds
 * We rebuild at 2s to ensure blockhash is extremely fresh when Firebase processes it
 */
export const BLOCKHASH_MAX_AGE_MS = 2000; // 2 seconds - extremely aggressive refresh for mainnet reliability

/**
 * Blockhash with timestamp for age tracking
 */
export interface BlockhashWithTimestamp {
  blockhash: string;
  lastValidBlockHeight: number;
  timestamp: number;
}

/**
 * Get fresh blockhash with timestamp tracking
 * Best practice: Get blockhash right before transaction creation
 */
export async function getFreshBlockhash(
  connection: Connection,
  commitment: 'confirmed' | 'finalized' = 'confirmed'
): Promise<BlockhashWithTimestamp> {
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);
    
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

