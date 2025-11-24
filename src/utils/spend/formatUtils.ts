/**
 * Format amount with comma as decimal separator (European format)
 * Example: 65.6 -> "65,6" or 21.87 -> "21,87"
 * 
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with comma as decimal separator
 */
export function formatAmountWithComma(amount: number, decimals: number = 2): string {
  return amount.toFixed(decimals).replace('.', ',');
}

