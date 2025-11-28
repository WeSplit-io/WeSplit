/**
 * Unified Format Utilities
 * Consolidates all formatting functions to eliminate duplication
 * Replaces: formatUsdcAmount, formatCurrencyAmount, formatNumber, etc.
 */

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { logger } from '../../../services/analytics/loggingService';

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
 * Format balance for display (handles USDC specially)
 * This is the unified function for formatting balances across the app
 * @param amount Amount to format
 * @param currency Currency code (default: 'USDC')
 * @param decimals Number of decimal places (default: 2 for display, 6 for USDC)
 * @returns Formatted string with currency
 */
export function formatBalance(amount: number, currency: string = 'USDC', decimals?: number): string {
  if (currency === 'USDC') {
    const displayDecimals = decimals ?? 6;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: displayDecimals,
    }).format(amount) + ' USDC';
  }
  
  // For other currencies, use standard currency formatting
  const displayDecimals = decimals ?? 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: displayDecimals,
  }).format(amount);
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
 * Handles both US (dot) and European (comma) decimal separators
 * @param amountString String representation of amount
 * @returns Parsed number or 0 if invalid
 */
export function parseAmount(amountString: string): number {
  if (!amountString || typeof amountString !== 'string') {
    return 0;
  }
  
  // Handle European number format (comma as decimal separator)
  // Convert comma to dot for parsing, but be careful about thousands separators
  let cleaned = amountString.trim();
  
  // If there's a comma and it's likely a decimal separator (not thousands)
  // Check if there are 1-3 digits after the comma
  const commaMatch = cleaned.match(/(\d+),(\d{1,3})$/);
  if (commaMatch) {
    // Replace comma with dot for decimal parsing
    cleaned = cleaned.replace(',', '.');
  } else {
    // Remove any non-numeric characters except decimal point, comma, and minus sign
    cleaned = cleaned.replace(/[^0-9.,-]/g, '');
    
    // If there's a comma and it's not followed by exactly 1-3 digits, treat it as thousands separator
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');
    
    if (hasComma && !hasDot) {
      // Only comma, treat as decimal separator
      cleaned = cleaned.replace(',', '.');
    } else if (hasComma && hasDot) {
      // Both comma and dot - assume comma is thousands separator
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate equal split amount with consistent rounding
 * @param totalAmount Total bill amount
 * @param participantCount Number of participants
 * @returns Amount each person should pay
 */
export function calculateEqualSplit(totalAmount: number, participantCount: number): number {
  if (participantCount <= 0) {
    console.warn('calculateEqualSplit: Invalid participant count:', participantCount);
    return 0;
  }
  
  if (totalAmount < 0) {
    console.warn('calculateEqualSplit: Invalid total amount:', totalAmount);
    return 0;
  }
  
  const splitAmount = totalAmount / participantCount;
  return roundUsdcAmount(splitAmount);
}

/**
 * Check if a URL points to an SVG file
 * @param url URL to check
 * @returns true if URL is an SVG
 */
export function isSvgUrl(url?: string): boolean {
  return !!url && url.toLowerCase().includes('.svg');
}

/**
 * Check if a URL is safe to use (not a gs:// URL or placeholder)
 * @param url URL to check
 * @returns true if URL is safe to use
 */
export function isSafeUrl(url?: string): boolean {
  if (!url) return false;
  return !url.startsWith('gs://') && !url.includes('PLACEHOLDER');
}

export const formatUtils = {
  usdc: formatUsdcAmount,
  sol: formatSolAmount,
  amount: formatAmount,
  number: formatNumber,
  currency: formatCurrency,
  balance: formatBalance,
  roundUsdc: roundUsdcAmount,
  usdcDisplay: formatUsdcForDisplay,
  walletAddress: formatWalletAddress,
  percentage: formatPercentage,
  largeNumber: formatLargeNumber,
  parseAmount,
  calculateEqualSplit,
  isSvgUrl,
  isSafeUrl,
};

export default formatUtils;
