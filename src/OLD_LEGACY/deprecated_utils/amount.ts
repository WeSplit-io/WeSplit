/**
 * Amount Formatting Utilities
 * @deprecated Use formatUtils from src/utils/format.ts instead
 */

// Re-export from unified format utils for backward compatibility
export { 
  formatNumber,
  formatSolAmount,
  formatUsdcAmount,
  formatAmount,
  formatCurrency
} from '../../utils/format';

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
  if (amountString == null) {
    return 0;
  }

  const input = String(amountString).trim();
  if (input === '') {
    return 0;
  }

  // Keep only digits, separators and sign for analysis
  const sanitized = input.replace(/[^0-9.,-]/g, '');

  // Identify separators
  const hasDot = sanitized.indexOf('.') !== -1;
  const hasComma = sanitized.indexOf(',') !== -1;

  let normalized = sanitized;

  if (hasDot && hasComma) {
    // Assume the last occurring separator is the decimal separator
    const lastDot = sanitized.lastIndexOf('.');
    const lastComma = sanitized.lastIndexOf(',');
    const decimalSep = lastDot > lastComma ? '.' : ',';
    const groupSep = decimalSep === '.' ? ',' : '.';

    // Remove all grouping separators
    normalized = sanitized.split(groupSep).join('');
    // Replace decimal separator with '.'
    if (decimalSep === ',') {
      normalized = normalized.replace(/,/g, '.');
    }
  } else if (hasComma && !hasDot) {
    // Treat comma as decimal separator
    normalized = sanitized.replace(/,/g, '.');
  } else {
    // Either dot-decimal or integer, leave as-is (but remove stray commas)
    normalized = sanitized.replace(/,/g, '');
  }

  // Handle multiple minus signs or misplaced minus
  const isNegative = /^-/.test(normalized);
  normalized = normalized.replace(/-/g, '');
  if (isNegative) {
    normalized = '-' + normalized;
  }

  const parsed = parseFloat(normalized);
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
  if (amount >= 1000) {return 2;}
  if (amount >= 1) {return 4;}
  if (amount >= 0.01) {return 6;}
  return 8;
}
