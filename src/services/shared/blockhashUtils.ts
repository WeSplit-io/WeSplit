/**
 * Shared Blockhash Utilities
 * Centralized blockhash handling to eliminate duplication
 * Best practices: Get fresh blockhash, track age, rebuild if needed
 */

import { Connection } from '@solana/web3.js';
import { getConfig } from '../../config/unified';
import { logger } from '../analytics/loggingService';

/**
 * Maximum age for blockhash before rebuilding transaction (20 seconds)
 * Blockhashes expire after ~60 seconds, but network latency + Firebase processing
 * can take 10-15 seconds, so we rebuild at 20s to have sufficient buffer
 * This ensures transactions reach the backend with plenty of time remaining
 */
export const BLOCKHASH_MAX_AGE_MS = 20000; // 20 seconds - reduced for better reliability

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

