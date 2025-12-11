# Memory Management Fixes for Split Transactions

## Problem
OOM crashes occurring right after split transactions complete successfully. The crash happens when loading `transactionPostProcessing.ts` which bundles 675 modules, even though we're trying to skip it.

## Root Cause
Even though we were skipping the actual call to `saveTransactionAndAwardPoints`, we were still dynamically importing `transactionPostProcessing.ts` for split flows. The dynamic import itself loads all 675 modules, causing OOM.

## Solution

### 1. **Complete Import Skip for Split Flows** ✅
- **File**: `src/services/blockchain/transaction/ConsolidatedTransactionService.ts`
- **Change**: Completely skip the import for split flows, not just the function call
- **Impact**: Prevents loading 675 modules entirely for split transactions

```typescript
// Before: Still imported even though we skipped the call
const { saveTransactionAndAwardPoints } = await import('../../shared/transactionPostProcessing');

// After: Complete skip - no import at all
if (isSplitPayment) {
  logger.info('Skipping post-processing for split flow (prevents OOM)');
  // Do nothing - skip entirely to prevent loading 675 modules
}
```

### 2. **Expanded Split Flow Detection** ✅
- Added detection for all split-related contexts:
  - `split_payment`
  - `split_wallet_withdrawal`
  - `fair_split_contribution`
  - `degen_split_lock`
  - `fair_split_withdrawal`

### 3. **Memory Cleanup After Transactions** ✅
- Added explicit cleanup in `FairSplitHandler` to null out large wallet objects
- Added GC hint after split transactions complete
- Cache invalidation already in place

### 4. **Transaction Type Consistency** ✅
- Ensured all split transaction types are consistently detected
- Both `transactionType` and `context` parameters checked

---

## Files Modified

1. **`src/services/blockchain/transaction/ConsolidatedTransactionService.ts`**
   - Complete skip of `transactionPostProcessing` import for split flows
   - Expanded split flow detection
   - Added memory cleanup hints

2. **`src/services/blockchain/transaction/handlers/FairSplitHandler.ts`**
   - Added explicit memory cleanup after participant updates
   - Null out wallet reference to help GC

---

## Expected Results

- **No OOM Crashes**: Split transactions should complete without loading heavy modules
- **Faster Transactions**: No time spent loading 675 modules
- **Lower Memory Usage**: ~675 modules worth of memory saved per split transaction
- **Stable Performance**: Consistent memory usage during split flows

---

## Testing Checklist

- [ ] Fair split contribution completes without OOM
- [ ] Fair split withdrawal completes without OOM
- [ ] Degen split lock completes without OOM
- [ ] No `transactionPostProcessing` module loaded for split flows
- [ ] Memory usage remains stable during split transactions
- [ ] On-chain transactions still succeed
- [ ] Database updates still work via handlers

---

## Notes

- On-chain transactions are authoritative
- Database updates happen via split handlers (not post-processing)
- Post-processing is only needed for non-split transactions
- The 675 modules in `transactionPostProcessing` are only loaded for regular transfers
