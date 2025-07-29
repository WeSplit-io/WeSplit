/**
 * Centralized balance calculation service
 * Eliminates duplicate balance calculation logic across components
 */

import { GroupWithDetails, Balance } from '../types';
import { logger } from './loggingService';
import { getTotalSpendingInUSDC } from './priceService';

export interface BalanceSummary {
  totalOwed: number;
  totalOwes: number;
  netBalance: number;
  totalSpent: number;
  balanceByCurrency: Record<string, number>;
}

export interface GroupBalanceSummary {
  totalAmount: number;
  memberCount: number;
  expenseCount: number;
  hasData: boolean;
  usdAmount: number;
}

class BalanceCalculationService {
  /**
   * Calculate user balances across all groups
   */
  calculateUserBalances(
    groups: GroupWithDetails[], 
    userId: string | number
  ): BalanceSummary {
    if (!groups || groups.length === 0) {
      return {
        totalOwed: 0,
        totalOwes: 0,
        netBalance: 0,
        totalSpent: 0,
        balanceByCurrency: {}
      };
    }

    let totalSpentUSDC = 0;
    const balanceByCurrency: Record<string, number> = {};

    groups.forEach(group => {
      try {
        if (group.expenses_by_currency && Array.isArray(group.expenses_by_currency)) {
          group.expenses_by_currency.forEach(expenseByCurrency => {
            const currency = expenseByCurrency.currency || 'SOL';
            const totalAmount = expenseByCurrency.total_amount || 0;

            if (totalAmount > 0) {
              // Use simple fallback rates for now
              const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
              const usdcAmount = totalAmount * rate;
              totalSpentUSDC += usdcAmount;

              if (!balanceByCurrency[currency]) {
                balanceByCurrency[currency] = 0;
              }
              balanceByCurrency[currency] += totalAmount;
            }
          });
        }
      } catch (error) {
        logger.error(`Error calculating balance for group ${group.id}`, error, 'BalanceCalculation');
      }
    });

    return {
      totalOwed: 0, // Will be calculated when individual group details are loaded
      totalOwes: 0, // Will be calculated when individual group details are loaded  
      netBalance: 0, // Simplified for now - shows total spending instead
      totalSpent: totalSpentUSDC,
      balanceByCurrency
    };
  }

  /**
   * Calculate group summary for display
   */
  calculateGroupSummary(group: GroupWithDetails): GroupBalanceSummary {
    try {
      let totalAmount = 0;
      let memberCount = group.member_count || group.members?.length || 0;
      let expenseCount = group.expense_count || group.expenses?.length || 0;

      // Calculate total amount from expenses_by_currency
      if (group.expenses_by_currency && Array.isArray(group.expenses_by_currency) && group.expenses_by_currency.length > 0) {
        totalAmount = group.expenses_by_currency.reduce((sum, expense) => {
          return sum + (expense.total_amount || 0);
        }, 0);
      }

      // Check if group has any meaningful data
      const hasData = totalAmount > 0 || memberCount > 0 || expenseCount > 0;

      return {
        totalAmount,
        memberCount,
        expenseCount,
        hasData,
        usdAmount: 0 // Will be calculated separately
      };
    } catch (error) {
      logger.error(`Error calculating group summary for ${group.id}`, error, 'BalanceCalculation');
      return {
        totalAmount: 0,
        memberCount: 0,
        expenseCount: 0,
        hasData: false,
        usdAmount: 0
      };
    }
  }

  /**
   * Convert group amounts to USD for display
   */
  async convertGroupAmountsToUSD(groups: GroupWithDetails[]): Promise<Record<string | number, number>> {
    try {
      const usdAmounts: Record<string | number, number> = {};

      for (const group of groups) {
        try {
          let totalUSD = 0;

          // Check if we have expenses_by_currency data
          if (group.expenses_by_currency && Array.isArray(group.expenses_by_currency) && group.expenses_by_currency.length > 0) {
            const expenses = group.expenses_by_currency.map(expense => ({
              amount: expense.total_amount || 0,
              currency: expense.currency || 'SOL'
            }));

            // Filter out zero amounts
            const validExpenses = expenses.filter(exp => exp.amount > 0);

            if (validExpenses.length > 0) {
              try {
                totalUSD = await getTotalSpendingInUSDC(validExpenses);
              } catch (error) {
                logger.error(`Price service failed for group ${group.id}`, error, 'BalanceCalculation');

                // Enhanced fallback with better rate handling
                for (const expense of validExpenses) {
                  const currency = (expense.currency || 'SOL').toUpperCase();

                  let rate = 1;
                  switch (currency) {
                    case 'SOL':
                      rate = 200;
                      break;
                    case 'USDC':
                    case 'USDT':
                      rate = 1;
                      break;
                    case 'BTC':
                      rate = 50000;
                      break;
                    default:
                      logger.warn(`Unknown currency: ${currency}, using rate 100`, null, 'BalanceCalculation');
                      rate = 100;
                  }

                  totalUSD += expense.amount * rate;
                }
              }
            }
          }

          usdAmounts[group.id] = totalUSD;

        } catch (error) {
          logger.error(`Error processing group ${group.id}`, error, 'BalanceCalculation');
          usdAmounts[group.id] = 0;
        }
      }

      return usdAmounts;
    } catch (error) {
      logger.error('Error converting group amounts to USD', error, 'BalanceCalculation');
      return {};
    }
  }

  /**
   * Calculate group balances for settlement
   */
  async calculateGroupBalances(group: GroupWithDetails, currentUserId?: string): Promise<Balance[]> {
    try {
      // This would implement the full balance calculation logic
      // For now, return empty array as this is handled by other services
      return [];
    } catch (error) {
      logger.error(`Error calculating group balances for ${group.id}`, error, 'BalanceCalculation');
      return [];
    }
  }
}

export const balanceCalculationService = new BalanceCalculationService(); 