/**
 * Rewards Configuration (Legacy)
 * 
 * ⚠️ DEPRECATED: This file is kept for backward compatibility only.
 * 
 * All reward values have been moved to the season-based system.
 * 
 * NEW SYSTEM: Use `src/services/rewards/seasonRewardsConfig.ts`
 * 
 * To modify reward amounts or percentages:
 * 1. Edit `src/services/rewards/seasonRewardsConfig.ts`
 * 2. This is the SINGLE SOURCE OF TRUTH for all reward values
 * 3. All changes automatically apply across the entire codebase
 * 
 * See: `docs/guides/REWARDS_MAINTENANCE_GUIDE.md` for detailed instructions
 */

/**
 * Minimum transaction amount to earn points
 * Transactions below this amount won't earn points
 * 
 * This is a system constant and should remain at $1 minimum
 */
export const MIN_TRANSACTION_AMOUNT_FOR_POINTS = 1; // $1 minimum

/**
 * Calculate points for a transaction amount (Legacy)
 * 
 * ⚠️ DEPRECATED: This function is kept for backward compatibility.
 * 
 * New code should use the season-based reward system:
 * - Use `getSeasonReward()` from `seasonRewardsConfig.ts`
 * - Use `calculateRewardPoints()` from `seasonRewardsConfig.ts`
 * 
 * This function is only used for:
 * - Backfilling old transaction points
 * - Migration scripts
 * - Legacy code that hasn't been updated yet
 * 
 * @deprecated Use season-based rewards instead
 * @param transactionAmount The transaction amount in USDC
 * @returns Points awarded (rounded to nearest integer, minimum 1 point for transactions >= $1)
 */
export function calculateTransactionPoints(transactionAmount: number): number {
  // This uses a fixed 10% for legacy compatibility
  // New transactions use season-based percentages from seasonRewardsConfig.ts
  const LEGACY_TRANSACTION_POINTS_PERCENTAGE = 0.10; // 10%
  const calculatedPoints = Math.round(transactionAmount * LEGACY_TRANSACTION_POINTS_PERCENTAGE);
  
  // Ensure minimum 1 point for any transaction >= $1 (to avoid 0 points for $1-$9 transactions)
  // For transactions < $1, use rounded calculation (may be 0)
  if (transactionAmount >= MIN_TRANSACTION_AMOUNT_FOR_POINTS && calculatedPoints === 0) {
    return 1;
  }
  
  return calculatedPoints;
}

