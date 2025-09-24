/**
 * Amount Formatting Utilities
 * Centralized formatting for currency amounts, balances, and financial values
 */

import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Format SOL amount from lamports to human-readable format
 */
function formatSolAmount(lamports: number, decimals: number = 6): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  return formatNumber(sol, decimals);
}

/**
 * Format USDC amount from micro-units to human-readable format
 */
function formatUsdcAmount(microUnits: number, decimals: number = 2): string {
  const usdc = microUnits / Math.pow(10, 6); // USDC has 6 decimals
  return formatNumber(usdc, decimals);
}

/**
 * Format any amount with specified decimals
 */
function formatAmount(amount: number, decimals: number = 2): string {
  return formatNumber(amount, decimals);
}

/**
 * Format number with specified decimal places
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
 */
function formatCurrency(amount: number, currency: string = 'USD', decimals: number = 2): string {
  const formattedAmount = formatNumber(amount, decimals);
  return `${currency} ${formattedAmount}`;
}

/**
 * Format percentage
 */
function formatPercentage(value: number, decimals: number = 2): string {
  const percentage = value * 100;
  return `${formatNumber(percentage, decimals)}%`;
}

/**
 * Format large numbers with K, M, B suffixes
 */
function formatCompactNumber(value: number): string {
  if (value < 1000) {
    return value.toString();
  }

  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const magnitude = Math.floor(Math.log10(value) / 3);
  const scaled = value / Math.pow(1000, magnitude);

  return `${formatNumber(scaled, 1)}${suffixes[magnitude]}`;
}

/**
 * Parse amount string to number
 */
export function parseAmount(amountString: string): number {
  const cleaned = amountString.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert amount to lamports (for SOL)
 */
function toLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Convert amount to micro-units (for USDC)
 */
function toMicroUnits(usdc: number): number {
  return Math.floor(usdc * Math.pow(10, 6));
}

/**
 * Validate amount format
 */
export function isValidAmount(amount: string): boolean {
  const parsed = parseAmount(amount);
  return parsed > 0 && parsed < Number.MAX_SAFE_INTEGER;
}

/**
 * Get display precision for amount
 */
function getDisplayPrecision(amount: number): number {
  if (amount >= 1000) return 2;
  if (amount >= 1) return 4;
  if (amount >= 0.01) return 6;
  return 8;
}
