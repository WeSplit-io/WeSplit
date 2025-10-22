/**
 * Currency utility functions for consistent handling of USDC amounts
 * @deprecated Use formatUtils from src/utils/formatUtils.ts instead
 */

// Re-export from unified format utils for backward compatibility
import { logger } from '../services/loggingService';
export { roundUsdcAmount, formatUsdcAmount } from './formatUtils';

// Verify export at module load time
if (__DEV__) {
  const { roundUsdcAmount: testFunc } = require('./formatUtils');
  logger.debug('roundUsdcAmount export verified', { type: typeof testFunc }, 'currencyUtils');
}

/**
 * Calculate equal split amount with consistent rounding
 * @param totalAmount Total bill amount
 * @param participantCount Number of participants
 * @returns Amount each person should pay
 */
export function calculateEqualSplit(totalAmount: number, participantCount: number): number {
  if (participantCount <= 0) {
    console.warn('CurrencyUtils: Invalid participant count:', participantCount);
    return 0;
  }
  
  if (totalAmount < 0) {
    console.warn('CurrencyUtils: Invalid total amount:', totalAmount);
    return 0;
  }
  
  const amountPerPerson = totalAmount / participantCount;
  // Use inline rounding to avoid circular dependency issues
  return Math.round(amountPerPerson * 1000000) / 1000000;
}

/**
 * Validate that amounts sum correctly with tolerance for floating point precision
 * @param amounts Array of amounts to sum
 * @param expectedTotal Expected total
 * @param tolerance Allowed difference (default: 0.000001)
 * @returns True if amounts sum to expected total within tolerance
 */
export function validateAmountSum(amounts: number[], expectedTotal: number, tolerance: number = 0.000001): boolean {
  const actualSum = amounts.reduce((sum, amount) => sum + amount, 0);
  const difference = Math.abs(actualSum - expectedTotal);
  return difference <= tolerance;
}

/**
 * Convert USDC amount to smallest unit (for blockchain transactions)
 * @param usdcAmount Amount in USDC
 * @returns Amount in smallest USDC unit (6 decimals)
 */
export function usdcToSmallestUnit(usdcAmount: number): number {
  return Math.floor(usdcAmount * 1000000 + 0.5);
}

/**
 * Convert smallest USDC unit to USDC amount
 * @param smallestUnit Amount in smallest USDC unit
 * @returns Amount in USDC
 */
export function smallestUnitToUsdc(smallestUnit: number): number {
  return smallestUnit / 1000000;
}
