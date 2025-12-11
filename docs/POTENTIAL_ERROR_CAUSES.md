# Potential Causes of Recurring Errors in Split Flows

## 🔴 Critical Issues That Could Cause Recurring Errors

### 1. **Static Firebase Imports in Handlers (Memory Crashes)**

**Problem:**
Several handlers still have static Firebase imports that cause Metro bundler to analyze and bundle large Firebase dependencies:

- ❌ `DegenLoserPaymentHandler.ts` - Lines 7-8: Static imports of `doc`, `updateDoc`, `db`
- ❌ `WalletAccessHandlers.ts` - Lines 7-8: Static imports of Firebase Firestore functions
- ✅ `FairSplitWithdrawalHandler.ts` - Fixed (uses dynamic imports)
- ✅ `DegenWinnerPayoutHandler.ts` - Fixed (uses dynamic imports)

**Impact:**
- Metro bundler statically analyzes these imports
- Pulls in entire Firebase SDK during bundling
- Causes "JavaScript heap out of memory" crashes
- Happens at different stages depending on which handler is loaded

**Fix Required:**
Convert all static Firebase imports to dynamic imports in handlers.

---

### 2. **Race Condition: Split Creation vs Wallet Creation**

**Problem:**
Splits and wallets are created in separate steps, creating a window for inconsistency:

1. **Split is created first** in `SplitDetailsScreen` or `SplitStorageService.createSplit()`
2. **Wallet is created later** in `FairSplitScreen` or `DegenSplitLogic`
3. **Synchronization happens asynchronously** in `SplitWalletCreation.createSplitWallet()`

**Flow:**
```
SplitDetailsScreen.createSplit() 
  → SplitStorageService.createSplit() 
    → Split document created in 'splits' collection
      → (User navigates to FairSplit/DegenSplit screen)
        → FairSplitScreen.handleCreateSplitWallet()
          → SplitWalletService.createSplitWallet()
            → Wallet created in 'splitWallets' collection
              → SplitWalletCreation tries to update split (may fail silently)
```

**Issues:**
- If wallet creation fails, split exists without wallet
- If synchronization fails, split and wallet are out of sync
- If split doesn't exist yet when wallet is created, sync fails silently
- Multiple code paths create wallets (FairSplitScreen, DegenSplitLogic, spendWalletUtils)

**Impact:**
- "Split not found" errors during participant synchronization
- Wallet exists but split doesn't have `walletId`/`walletAddress`
- Participant status updates fail because split lookup fails

**Fix Required:**
- Ensure split exists before creating wallet
- Make synchronization failures fail the wallet creation (or retry)
- Add retry logic for failed synchronizations

---

### 3. **Inconsistent ID Usage (billId vs splitId)**

**Problem:**
The codebase uses both `billId` and `splitId` inconsistently:

- `SplitWalletCreation.createSplitWallet()` uses `billId` as parameter
- `SplitDataSynchronizer.syncParticipantFromSplitWalletToSplitStorage()` uses `billId`
- `updateParticipantStatus()` was expecting `splitId` (now fixed to handle both)
- Some screens pass `splitData.id` (splitId) instead of `splitData.billId`

**Example Issues:**
```typescript
// FairSplitScreen.tsx line 1969 - WRONG:
const walletResult = await SplitWalletService.createSplitWallet(
  splitData!.id,  // ❌ This is splitId, not billId!
  ...
);

// FairSplitScreen.tsx line 1481 - CORRECT:
const walletResult = await SplitWalletService.createSplitWallet(
  splitData!.billId,  // ✅ Correct
  ...
);
```

**Impact:**
- Wallet created with wrong `billId` in wallet document
- Synchronization fails because `updateSplitByBillId()` can't find split
- Participant updates fail because split lookup uses wrong ID

**Fix Required:**
- Standardize on using `billId` for wallet creation
- Add validation to ensure `billId` is provided
- Fix all call sites to use `billId` consistently

---

### 4. **Silent Synchronization Failures**

**Problem:**
In `SplitWalletCreation.createSplitWallet()`, synchronization failures are logged but don't fail the operation:

```typescript
// Lines 384-413 in SplitWalletCreation.ts
try {
  const splitUpdateResult = await SplitStorageService.updateSplitByBillId(billId, {
    walletId: createdSplitWallet.id,
    walletAddress: createdSplitWallet.walletAddress,
    updatedAt: new Date().toISOString()
  });
  
  if (splitUpdateResult.success) {
    logger.info('Split document updated...');
  } else {
    logger.warn('Failed to update split document...');  // ⚠️ Only warns, doesn't fail
    // Don't fail - wallet is created, split can be updated later
  }
} catch (syncError) {
  logger.warn('Error updating split document...');  // ⚠️ Only warns, doesn't fail
  // Don't fail - wallet is created, split can be updated later
}
```

**Impact:**
- Wallet is created successfully
- Split document is not updated with wallet info
- Later operations fail because split doesn't have `walletId`
- Participant synchronization fails because split lookup fails

**Fix Required:**
- Make synchronization a critical step (fail if it fails)
- OR: Add retry mechanism for failed synchronizations
- OR: Add background job to sync orphaned wallets

---

### 5. **Missing Split Document When Wallet Created**

**Problem:**
Wallet creation tries to update split document, but split might not exist yet:

**Scenario 1: Degen Split**
- `createDegenSplitWallet()` tries to find existing split by `billId`
- If not found, creates a "fallback" split
- But this fallback might not match the actual split created in UI

**Scenario 2: Fair Split**
- Split is created in `SplitDetailsScreen`
- User navigates to `FairSplitScreen`
- Wallet is created, tries to sync with split
- If split creation failed or was delayed, sync fails

**Impact:**
- Wallet exists but split doesn't have wallet info
- Participant updates fail
- Withdrawal operations may fail

**Fix Required:**
- Ensure split exists before creating wallet
- Add validation to check split exists
- Create split if it doesn't exist (with proper error handling)

---

### 6. **Multiple Wallet Creation Paths**

**Problem:**
Wallets can be created from multiple places:

1. `FairSplitScreen.handleCreateSplitWallet()` - Fair splits
2. `useDegenSplitLogic.handleCreateSplitWallet()` - Degen splits
3. `createSpendSplitWallet()` in `spendWalletUtils.ts` - SPEND splits
4. `SplitWalletCreation.createSplitWallet()` - Direct creation

Each path has different:
- Error handling
- Synchronization logic
- Validation
- ID usage (billId vs splitId)

**Impact:**
- Inconsistent behavior across split types
- Some paths might miss synchronization
- Hard to debug which path was used

**Fix Required:**
- Consolidate wallet creation logic
- Use single entry point with consistent validation
- Ensure all paths have same synchronization logic

---

### 7. **Metro Bundler Static Analysis**

**Problem:**
Even with dynamic imports, Metro bundler performs static analysis:

- Analyzes all `import()` calls
- Tries to determine what modules will be loaded
- May still bundle dependencies if it can statically determine the path
- Large modules like Firebase, transaction services get pulled in

**Impact:**
- Memory crashes during bundling
- Happens at different stages (creation, payment, withdrawal)
- Depends on which handler is being bundled

**Fix Required:**
- Use more aggressive code splitting
- Move heavy imports deeper into functions
- Use string-based dynamic imports (harder for Metro to analyze)
- Consider lazy-loading entire handler modules

---

## 🔧 Recommended Fixes (Priority Order)

### Priority 1: Fix Static Imports
1. Convert `DegenLoserPaymentHandler.ts` Firebase imports to dynamic
2. Convert `WalletAccessHandlers.ts` Firebase imports to dynamic
3. Verify all handlers use dynamic imports for heavy modules

### Priority 2: Fix Synchronization
1. Make split-wallet synchronization critical (fail if it fails)
2. Add retry logic for failed synchronizations
3. Ensure split exists before creating wallet
4. Add validation to check split exists after wallet creation

### Priority 3: Fix ID Consistency
1. Standardize on `billId` for all wallet operations
2. Fix all call sites to use `billId` consistently
3. Add validation to ensure `billId` is provided
4. Add mapping from `splitId` to `billId` if needed

### Priority 4: Consolidate Creation Paths
1. Create single wallet creation entry point
2. Ensure all paths use same validation and sync logic
3. Add consistent error handling across all paths

### Priority 5: Add Monitoring
1. Add alerts for failed synchronizations
2. Add background job to fix orphaned wallets
3. Add validation checks to detect inconsistencies

---

## 🧪 Testing Checklist

After fixes, test:
- [ ] Fair split creation → wallet creation → payment → withdrawal
- [ ] Degen split creation → wallet creation → locking → roulette → payout
- [ ] SPEND split creation → wallet creation → payment
- [ ] Split created but wallet creation fails (should handle gracefully)
- [ ] Wallet created but split doesn't exist (should create or fail)
- [ ] Synchronization fails (should retry or fail wallet creation)
- [ ] Participant update with billId (should work)
- [ ] Participant update with splitId (should work)
