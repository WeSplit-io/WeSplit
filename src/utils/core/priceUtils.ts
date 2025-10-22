/**
 * Price Utilities
 * Centralized price calculation and formatting utilities
 */

export class PriceUtils {
  /**
   * Convert fiat amount to USDC
   */
  static convertFiatToUSDC(amount: number, rate: number): number {
    return amount * rate;
  }

  /**
   * Format currency amount for display
   */
  static formatCurrencyAmount(amount: number, currency: string = 'USDC'): string {
    return `${amount.toFixed(2)} ${currency}`;
  }

  /**
   * Calculate percentage of amount
   */
  static calculatePercentage(amount: number, percentage: number): number {
    return (amount * percentage) / 100;
  }

  /**
   * Round to specified decimal places
   */
  static roundToDecimals(amount: number, decimals: number = 2): number {
    return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}
