/**
 * Number Formatting Utilities
 * General number formatting and manipulation functions
 */

/**
 * Format number with thousands separator
 */
function formatNumberWithSeparator(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Format number with specified decimal places
 */
function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Round number to specified decimal places
 */
function roundToDecimals(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Clamp number between min and max values
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Check if number is within range
 */
function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Generate random number between min and max
 */
function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate random integer between min and max (inclusive)
 */
function randomIntBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculate percentage of value
 */
function percentageOf(value: number, percentage: number): number {
  return (value * percentage) / 100;
}

/**
 * Calculate percentage change between two values
 */
function percentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Check if number is even
 */
function isEven(value: number): boolean {
  return value % 2 === 0;
}

/**
 * Check if number is odd
 */
function isOdd(value: number): boolean {
  return value % 2 !== 0;
}

/**
 * Get sign of number (-1, 0, or 1)
 */
function getSign(value: number): number {
  return Math.sign(value);
}

/**
 * Convert number to ordinal (1st, 2nd, 3rd, etc.)
 */
function toOrdinal(value: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const remainder = value % 100;
  return value + (suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]);
}
