# Sequential Transaction Memory Fix

## Problem
OOM crashes when doing a funding transaction right after a withdrawal (or vice versa). The crash happens when Metro bundler tries to load `wallet/index.ts` (720 modules) during the second transaction, when memory is already high from the first transaction.

## Root Cause
1. **Heavy wallet service import**: `ConsolidatedTransactionService.sendUSDCTransaction` was importing the full `walletService` (720 modules) instead of the lighter `simplifiedWalletService`
2. **No memory cleanup**: Large objects (wallet results, keypairs) weren't being cleared between transactions
3. **Metro bundler memory pressure**: Loading 720 modules during transaction flow when memory is already high causes OOM

## Solution

### 1. **Replace Heavy Wallet Service Import** ✅
- **File**: `src/services/blockchain/transaction/ConsolidatedTransactionService.ts`
- **Change**: Replaced `walletService` with `simplifiedWalletService` in:
  - `loadWallet()` method
  - `getWalletInfo()` method  
  - `sendUSDCTransaction()` method
- **Impact**: Reduces module load from 720 modules to ~100 modules

### 2. **Memory Cleanup After Transactions** ✅
- Clear `walletResult` reference after extracting needed data
- Clear `keypair` reference after transaction completes
- Clear wallet objects in `FairSplitHandler` after participant updates
- This helps GC reclaim memory between sequential transactions

### 3. **Balance Subscription Deduplication** ✅
- `LiveBalanceService` now reuses existing subscriptions per address
- Prevents multiple subscriptions from accumulating memory

---

## Files Modified

1. **`src/services/blockchain/transaction/ConsolidatedTransactionService.ts`**
   - Replaced `walletService` with `simplifiedWalletService` (3 locations)
   - Added memory cleanup after keypair extraction
   - Added memory cleanup after transaction completion

2. **`src/services/blockchain/transaction/handlers/FairSplitHandler.ts`**
   - Added memory cleanup after participant updates

3. **`src/services/blockchain/balance/LiveBalanceService.ts`**
   - Hard cap: Only one subscription per address (prevents memory growth)

---

## Expected Results

- **No OOM Crashes**: Sequential transactions should complete without crashes
- **Lower Memory Usage**: ~620 fewer modules loaded per transaction
- **Faster Transactions**: Lighter wallet service loads faster
- **Stable Performance**: Memory cleanup prevents buildup between transactions

---

## Testing Checklist

- [ ] Funding transaction after withdrawal completes without OOM
- [ ] Withdrawal transaction after funding completes without OOM
- [ ] Multiple sequential transactions work smoothly
- [ ] Wallet operations still function correctly
- [ ] No memory leaks during transaction sequences

---

## Notes

- `simplifiedWalletService` is lighter (~100 modules) vs full `walletService` (720 modules)
- Memory cleanup happens immediately after data extraction
- Balance subscriptions are now deduplicated to prevent memory growth
- On-chain transactions are still authoritative; database updates happen via handlers
