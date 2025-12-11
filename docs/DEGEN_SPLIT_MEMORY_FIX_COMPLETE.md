# Degen Split Creation Memory Fix - Complete

## Problem
OOM crashes when creating a degen split after doing some transactions. The crash happens because heavy `walletService` imports (720 modules) are being loaded during degen split creation when memory is already high from previous transactions.

## Root Cause
Multiple split services were importing the full `walletService` (720 modules) instead of the lighter `simplifiedWalletService` (~100 modules):
- `SplitWalletCreation.ts` - `ensureUserWalletInitialized()` and `checkUsdcBalance()`
- `ParticipantPaymentHandlers.ts` - `processParticipantPayment()` and `processDegenFundLocking()`
- `TransferHandlers.ts` - wallet info retrieval
- `SplitWalletCleanup.ts` - `getUserWallet()`

## Solution

### 1. **Replaced Heavy Wallet Service Imports** ✅
- **Files Modified**:
  - `src/services/split/SplitWalletCreation.ts`
  - `src/services/split/handlers/ParticipantPaymentHandlers.ts`
  - `src/services/split/handlers/TransferHandlers.ts`
  - `src/services/split/SplitWalletCleanup.ts`
- **Change**: Replaced `walletService` with `simplifiedWalletService` in all locations
- **Impact**: Reduces module load from 720 modules to ~100 modules per operation

### 2. **Fixed Property Access** ✅
- Updated checks to handle both `secretKey` (legacy) and `privateKey` (simplifiedWalletService)
- Ensures compatibility with both wallet service implementations

---

## Files Modified

1. **`src/services/split/SplitWalletCreation.ts`**
   - `ensureUserWalletInitialized()` - uses simplifiedWalletService
   - `checkUsdcBalance()` - uses simplifiedWalletService

2. **`src/services/split/handlers/ParticipantPaymentHandlers.ts`**
   - `processParticipantPayment()` - uses simplifiedWalletService
   - `processDegenFundLocking()` - uses simplifiedWalletService
   - Fixed property checks for secretKey/privateKey

3. **`src/services/split/handlers/TransferHandlers.ts`**
   - Wallet info retrieval - uses simplifiedWalletService

4. **`src/services/split/SplitWalletCleanup.ts`**
   - `getUserWallet()` - uses simplifiedWalletService

---

## Expected Results

- **No OOM Crashes**: Degen split creation should complete without crashes even after transactions
- **Lower Memory Usage**: ~620 fewer modules loaded per operation
- **Faster Operations**: Lighter wallet service loads faster
- **Stable Performance**: Consistent memory usage during split creation

---

## Testing Checklist

- [ ] Create degen split after doing transactions - should complete without OOM
- [ ] Create degen split on fresh app - should work normally
- [ ] Fair split creation still works
- [ ] Degen split funding still works
- [ ] Degen split withdrawal still works
- [ ] Wallet operations still function correctly

---

## Notes

- `simplifiedWalletService` is lighter (~100 modules) vs full `walletService` (720 modules)
- All split services now use the lighter wallet service
- Property checks handle both `secretKey` and `privateKey` for compatibility
- Memory optimizations work together with previous fixes for sequential transactions
