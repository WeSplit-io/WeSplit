# Transaction Points Attribution Fix

## Issues Identified

1. **No Idempotency Check**: The `awardTransactionPoints` function didn't check if points were already awarded for a transaction, leading to potential duplicate awards if called multiple times.

2. **Multiple Entry Points**: Points could be awarded from two places:
   - `saveTransactionAndAwardPoints` (main flow)
   - `userActionSyncService.checkAndBackfillTransactionPoints` (backfill)
   - This created a risk of duplicate awards even with the backfill check.

3. **Transaction Amount Verification**: Needed to ensure the correct amount (full amount, not net) is used for point calculation.

## Fixes Implemented

### 1. Added Idempotency Check in `awardTransactionPoints`

**Location**: `src/services/rewards/pointsService.ts`

- Added `getPointsTransactionBySourceId()` private method to check if points were already awarded for a transaction signature
- Added idempotency check at the start of `awardTransactionPoints()` to prevent duplicate awards
- If points were already awarded, returns the existing award instead of creating a duplicate

**Benefits**:
- Prevents duplicate point awards even if the function is called multiple times
- Safe to call from multiple places (main flow + backfill)
- Returns existing award information for consistency

### 2. Enhanced Documentation

**Location**: `src/services/shared/transactionPostProcessing.ts`

- Added JSDoc comment clarifying that `amount` should be the full transaction amount (before fees)
- Added inline comment in the points awarding section to emphasize this requirement

**Benefits**:
- Clear documentation for developers
- Prevents future bugs from using net amount instead of full amount

### 3. Verified Transaction Amount Flow

**Verified**:
- `saveTransactionAndAwardPoints` receives `params.amount` which is the full transaction amount
- Point calculation uses this full amount correctly
- All call sites (`sendInternal.ts`, `sendExternal.ts`, etc.) pass the correct full amount

## Point Calculation Flow

```
Transaction Completed
    ↓
saveTransactionAndAwardPoints() [Centralized Utility]
    ↓
    Checks: Is internal transfer? Is recipient a user?
    ↓
awardTransactionPoints() [Points Service]
    ↓
    ✅ NEW: Check if points already awarded (idempotency)
    ↓
    Validate: Amount >= $1, transaction type = 'send'
    ↓
    Calculate: Get season reward → Calculate percentage of full amount
    ↓
    Award: Apply community badge bonus → Update user points → Record transaction
```

## Key Points

1. **Single Source of Truth**: All transaction point awarding goes through `saveTransactionAndAwardPoints()` which calls `awardTransactionPoints()`

2. **Idempotent**: `awardTransactionPoints()` now checks for existing awards before awarding, making it safe to call multiple times

3. **Correct Amount**: Points are calculated as a percentage of the **full transaction amount** (before fees), not the net amount

4. **Season-Based**: Points use season-based rewards from `seasonRewardsConfig.ts`:
   - Season 1: 8% of transaction amount
   - Season 2: 7% of transaction amount
   - Season 3: 6% of transaction amount
   - Season 4: 5% of transaction amount
   - Season 5: 4% of transaction amount

5. **Community Badge Bonus**: Automatically applied (2x multiplier) for users with active community badges

## Testing Recommendations

1. **Test Idempotency**: Call `awardTransactionPoints()` twice with the same transaction signature - should only award once
2. **Test Amount Calculation**: Verify points are calculated correctly for different transaction amounts
3. **Test Season Rewards**: Verify correct percentage is used for each season
4. **Test Community Badge Bonus**: Verify 2x multiplier is applied for users with active badges

## Files Modified

- `src/services/rewards/pointsService.ts`: Added idempotency check and helper method
- `src/services/shared/transactionPostProcessing.ts`: Added documentation comments

## Backward Compatibility

✅ All changes are backward compatible:
- Existing code continues to work
- No breaking changes to function signatures
- Idempotency check is transparent to callers

