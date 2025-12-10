# Transaction Private Key & React Best Practices Audit

## 🔐 Private Key Retrieval Status

### ✅ Shared Wallet Withdrawal - PROPERLY SET UP
**Location:** `src/services/blockchain/transaction/ConsolidatedTransactionService.ts:1360-1600`

**Status:** ✅ **CORRECT**
- Retrieves private key using `SharedWalletService.getSharedWalletPrivateKey(sharedWalletId, userId)`
- Verifies user is in participants list
- Creates keypair from private key
- Uses Firebase Functions for company wallet signing
- Properly handles fee payment

### ❌ Fair Split Withdrawal - NEEDS FIX
**Location:** `src/services/blockchain/transaction/ConsolidatedTransactionService.ts:873-914`

**Issue:** Currently uses `externalTransferService` which sends from **user's personal wallet**, not from the **split wallet**.

**Current Code:**
```typescript
// ❌ WRONG: Sends from user wallet, not split wallet
const result = await externalTransferService.instance.sendExternalTransfer({
  to: userWalletAddress,
  amount: amount,
  userId: userId, // Uses user's wallet, not split wallet!
  // ...
});
```

**Should Be:**
```typescript
// ✅ CORRECT: Should retrieve split wallet private key and send from split wallet
const { SplitWalletService } = await import('../../split');
const privateKeyResult = await SplitWalletService.getSplitWalletPrivateKey(splitWalletId, userId);
// Then use split wallet keypair to send funds
```

**Fix Required:** Update `handleFairSplitWithdrawal` to:
1. Get split wallet private key using `SplitWalletService.getSplitWalletPrivateKey`
2. Create keypair from split wallet private key
3. Send from split wallet address (not user wallet)
4. Use Firebase Functions for company wallet signing (if needed)

### ✅ Degen Split & Spend Split
- Degen Split lock: Uses user wallet (correct - funding)
- Spend Split payment: Uses split wallet private key (correct)

---

## ⚛️ React Best Practices Issues

### 1. Missing Dependencies in useEffect

#### Issue 1: `CentralizedTransactionModal.tsx:660-665`
```typescript
// ❌ Missing handleExecuteTransaction in dependencies
useEffect(() => {
  if (config.context === 'spend_split_payment' && effectiveSplitId && effectiveSplitWalletId) {
    handleExecuteTransaction();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [config.context, effectiveSplitId, effectiveSplitWalletId]);
```

**Fix:**
```typescript
// ✅ Add handleExecuteTransaction to dependencies (it's memoized with useCallback)
useEffect(() => {
  if (config.context === 'spend_split_payment' && effectiveSplitId && effectiveSplitWalletId) {
    handleExecuteTransaction();
  }
}, [config.context, effectiveSplitId, effectiveSplitWalletId, handleExecuteTransaction]);
```

#### Issue 2: `CentralizedTransactionScreen.tsx:588-592`
```typescript
// ❌ Missing handleExecuteTransaction in dependencies
useEffect(() => {
  if (context === 'spend_split_payment' && splitId && splitWalletId) {
    handleExecuteTransaction();
  }
}, [context, splitId, splitWalletId]);
```

**Fix:**
```typescript
// ✅ Add handleExecuteTransaction to dependencies
useEffect(() => {
  if (context === 'spend_split_payment' && splitId && splitWalletId) {
    handleExecuteTransaction();
  }
}, [context, splitId, splitWalletId, handleExecuteTransaction]);
```

### 2. Missing Dependencies in useCallback

#### Issue: `CentralizedTransactionModal.tsx:657`
```typescript
// ⚠️ Missing some dependencies
}, [amount, config.context, currentUser, finalRecipientInfo, contact, wallet, requestId, isSettlement, effectiveSplitWalletId, effectiveSplitId, effectiveBillId, effectiveSharedWalletId, centralizedTransactionHandler]);
```

**Missing:**
- `config.onSuccess`
- `config.onError`
- `config.onClose`
- `buildTransactionParams` (if it's a function)

**Note:** This might be intentional if these are stable references, but should be verified.

### 3. Potential Memoization Opportunities

#### `CentralizedTransactionModal.tsx`
- `buildTransactionParams` could be memoized with `useMemo` if it's expensive
- `sendComponentRecipientInfo` is already memoized ✅
- `finalRecipientInfo` calculation could be memoized

#### `CentralizedTransactionScreen.tsx`
- `buildTransactionParams` could be memoized
- `recipientInfo` calculation could be memoized

### 4. Unnecessary Re-renders

**Potential Issues:**
- `config` object passed as prop might cause re-renders if not memoized by parent
- `currentUser` from context might cause re-renders if context updates frequently

**Recommendations:**
- Use `React.memo` for `CentralizedTransactionModal` if parent re-renders frequently
- Memoize `config` object in parent components before passing

---

## 🔧 Recommended Fixes

### Priority 1: Fix Fair Split Withdrawal Private Key
1. Update `handleFairSplitWithdrawal` to retrieve split wallet private key
2. Use split wallet keypair instead of user wallet
3. Test withdrawal flow

### Priority 2: Fix React Hook Dependencies
1. Add `handleExecuteTransaction` to useEffect dependencies
2. Review and add missing dependencies to useCallback
3. Remove unnecessary eslint-disable comments

### Priority 3: Optimize Performance
1. Memoize expensive calculations
2. Use React.memo for components that receive stable props
3. Review context usage to prevent unnecessary re-renders

---

## ✅ Verification Checklist

- [ ] Fair split withdrawal uses split wallet private key
- [ ] All useEffect hooks have correct dependencies
- [ ] All useCallback hooks have correct dependencies
- [ ] Expensive calculations are memoized
- [ ] Components are optimized to prevent unnecessary re-renders
- [ ] No eslint-disable comments for exhaustive-deps (unless justified)

