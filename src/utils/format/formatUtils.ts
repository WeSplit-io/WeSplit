/**
 * Unified Format Utilities
 * Consolidates all formatting functions to eliminate duplication
 * Replaces: formatUsdcAmount, formatCurrencyAmount, formatNumber, etc.
 */

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logger } from '../../services/core/loggingService';

/**
 * Format USDC amount from micro-units to human-readable format
 * @param microUnits Amount in micro-units (6 decimals)
 * @param decimals Number of decimal places to show (default: 2)
 * @returns Formatted string
 */
export function formatUsdcAmount(microUnits: number, decimals: number = 2): string {
  const usdc = microUnits / Math.pow(10, 6); // USDC has 6 decimals
  return formatNumber(usdc, decimals);
}

/**
 * Format SOL amount from lamports to human-readable format
 * @param lamports Amount in lamports
 * @param decimals Number of decimal places to show (default: 6)
 * @returns Formatted string
 */
export function formatSolAmount(lamports: number, decimals: number = 6): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  return formatNumber(sol, decimals);
}

/**
 * Format any amount with specified decimals
 * @param amount Amount to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatAmount(amount: number, decimals: number = 2): string {
  return formatNumber(amount, decimals);
}

/**
 * Format number with specified decimal places
 * @param value Number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) {
    return '0.00';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency with symbol
 * @param amount Amount to format
 * @param currency Currency symbol (default: 'USD')
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string with currency symbol
 */
export function formatCurrency(amount: number, currency: string = 'USD', decimals: number = 2): string {
  const formattedAmount = formatNumber(amount, decimals);
  return `${currency} ${formattedAmount}`;
}

/**
 * Round USDC amount to proper precision (6 decimal places)
 * Uses proper rounding to avoid floating point precision issues
 * @param amount Amount to round
 * @returns Rounded amount
 */
export function roundUsdcAmount(amount: number): number {
  if (__DEV__) {
    logger.debug('roundUsdcAmount called with', { amount }, 'formatUtils');
  }
  return Math.round(amount * 1000000) / 1000000;
}

/**
 * Format USDC amount for display (removes trailing zeros and weird precision)
 * @param amount Amount in USDC
 * @param decimals Number of decimal places to show (default: 6)
 * @returns Formatted string
 */
export function formatUsdcForDisplay(amount: number, decimals: number = 6): string {
  const rounded = roundUsdcAmount(amount);
  return rounded.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Format wallet address for display (truncated)
 * @param address Full wallet address
 * @param startChars Number of characters to show at start (default: 6)
 * @param endChars Number of characters to show at end (default: 4)
 * @returns Truncated address string
 */
export function formatWalletAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format percentage
 * @param value Percentage value (0-100)
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format large numbers with K, M, B suffixes
 * @param value Number to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted string with suffix
 */
export function formatLargeNumber(value: number, decimals: number = 1): string {
  if (value >= 1000000000) {
    return `${formatNumber(value / 1000000000, decimals)}B`;
  } else if (value >= 1000000) {
    return `${formatNumber(value / 1000000, decimals)}M`;
  } else if (value >= 1000) {
    return `${formatNumber(value / 1000, decimals)}K`;
  }
  return formatNumber(value, 0);
}

// Export all functions as a single object for convenience
/**
 * Parse amount string to number
 * @param amountString String representation of amount
 * @returns Parsed number or 0 if invalid
 */
export function parseAmount(amountString: string): number {
  if (!amountString || typeof amountString !== 'string') {
    return 0;
  }
  
  // Remove any non-numeric characters except decimal point and minus sign
  const cleaned = amountString.replace(/[^0-9.-]/g, '');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export const formatUtils = {
  usdc: formatUsdcAmount,
  sol: formatSolAmount,
  amount: formatAmount,
  number: formatNumber,
  currency: formatCurrency,
  roundUsdc: roundUsdcAmount,
  usdcDisplay: formatUsdcForDisplay,
  walletAddress: formatWalletAddress,
  percentage: formatPercentage,
  largeNumber: formatLargeNumber,
  parseAmount,
};

export default formatUtils;
