/**
 * Rewards Configuration
 * Centralized configuration for points and rewards system
 * 
 * POINTS CALCULATION FLAGS:
 * ========================
 * 
 * 1. Transaction Points (10% of transaction amount)
 *    - Trigger: Internal wallet-to-wallet transfers (send type only)
 *    - Location: ConsolidatedTransactionService.sendUSDCTransaction()
 *                 sendInternal.ts.sendInternalTransfer()
 *                 userActionSyncService.checkAndBackfillTransactionPoints()
 *                 pointsMigrationService.backfillTransactionPoints()
 *    - Calculation: calculateTransactionPoints(transactionAmount)
 *    - Minimum: $1 transaction = 1 point
 * 
 * 2. Quest Completion Points:
 *    - complete_onboarding: 25 points
 *      Trigger: OnboardingScreen.markOnboardingCompleted()
 *               CreateProfileScreen (after profile creation)
 *               userActionSyncService.syncOnboardingCompletion()
 * 
 *    - profile_image: 50 points
 *      Trigger: CreateProfileScreen (after avatar upload)
 *               AccountSettingsScreen (after avatar update)
 *               userActionSyncService.syncProfileImage()
 * 
 *    - first_transaction: 100 points
 *      Trigger: ConsolidatedTransactionService.sendUSDCTransaction()
 *               sendInternal.ts.sendInternalTransfer()
 *               userActionSyncService.syncFirstTransaction()
 * 
 *    - add_first_contact: 30 points
 *      Trigger: useContactActions.addContact()
 *               userActionSyncService.syncFirstContact()
 * 
 *    - create_first_split: 75 points
 *      Trigger: SplitStorageService.createSplit()
 *               userActionSyncService.syncFirstSplit()
 * 
 * 3. All flags are automatically synced when:
 *    - RewardsScreen loads (verifyAndSyncUserActions)
 *    - User actions occur (via userActionSyncService)
 *    - Points migration runs (pointsMigrationService)
 */

/**
 * Transaction points percentage
 * Users earn 10% of transaction amount as points
 * Example: $10 transfer = 1 point (10 * 0.10 = 1)
 */
export const TRANSACTION_POINTS_PERCENTAGE = 0.10; // 10%

/**
 * Calculate points for a transaction amount
 * @param transactionAmount The transaction amount in USDC
 * @returns Points awarded (rounded to nearest integer, minimum 1 point for transactions >= $1)
 */
export function calculateTransactionPoints(transactionAmount: number): number {
  const calculatedPoints = Math.round(transactionAmount * TRANSACTION_POINTS_PERCENTAGE);
  
  // Ensure minimum 1 point for any transaction >= $1 (to avoid 0 points for $1-$9 transactions)
  // For transactions < $1, use rounded calculation (may be 0)
  if (transactionAmount >= MIN_TRANSACTION_AMOUNT_FOR_POINTS && calculatedPoints === 0) {
    return 1;
  }
  
  return calculatedPoints;
}

/**
 * Minimum transaction amount to earn points
 * Transactions below this amount won't earn points
 */
export const MIN_TRANSACTION_AMOUNT_FOR_POINTS = 1; // $1 minimum

