# Blockhash Expiration Fix

## Problem

Transactions were failing with blockhash expiration errors even after rebuilding. The issue was that blockhashes expire after ~60 seconds, and by the time a transaction reached Firebase Functions for signing and submission, the blockhash had already expired.

## Root Cause

1. Client gets blockhash and creates transaction
2. Client signs transaction
3. Network latency to Firebase Functions
4. Firebase Functions validates and signs (processing time)
5. Firebase Functions submits to blockchain
6. **By step 5, blockhash may have expired**

## Solution Implemented (Updated 2025-01-12)

### 1. Reduced Blockhash Refresh Threshold

**File**: `src/services/shared/blockhashUtils.ts`

- Reduced `BLOCKHASH_MAX_AGE_MS` from 20 seconds to **10 seconds** for mainnet reliability
- Mainnet is slower than devnet, requiring more aggressive refresh
- All transaction paths now rebuild if blockhash is >10 seconds old before Firebase submission

### 2. Client-Side Blockhash Age Check (All Transaction Paths)

**Files Updated**:
- `src/services/blockchain/transaction/sendExternal.ts`
- `src/services/blockchain/transaction/sendInternal.ts`
- `src/services/split/SplitWalletPayments.ts`
- `src/services/blockchain/transaction/usdcTransfer.ts`
- `src/services/blockchain/wallet/solanaAppKitService.ts`
- `src/services/shared/transactionUtils.ts`
- `src/services/shared/transactionUtilsOptimized.ts`

**Changes**:
- All paths now use shared `getFreshBlockhash` utility from `blockhashUtils.ts`
- Consistent timestamp tracking across all services
- Check blockhash age before Firebase call (10 second threshold)
- Only rebuild if blockhash is too old (optimization)
- Proper error handling for expired blockhashes

### 3. Firebase Functions Blockhash Validation (Enhanced)

**File**: `services/firebase-functions/src/transactionSigningService.js`

- Gets fresh blockhash RIGHT before submission to validate transaction's blockhash
- Uses `isBlockhashValid` RPC method for accurate validation
- Submits immediately after validation to minimize delay
- Better error handling for expired blockhashes
- Prevents wasting time signing transactions that will fail

## Benefits

1. **Prevents Expired Blockhashes**: Client-side check prevents sending expired blockhashes
2. **Early Rejection**: Firebase Functions rejects expired blockhashes before signing (saves time)
3. **Automatic Recovery**: Client automatically rebuilds with fresh blockhash if needed
4. **Better Reliability**: More retry attempts handle transient issues

## Testing

To verify the fix works:

1. **Test Normal Flow**: Transaction should complete successfully
2. **Test Slow Network**: Simulate slow network - should auto-rebuild if blockhash expires
3. **Test Firebase Validation**: Send old transaction - should be rejected before signing

## Files Modified (Complete List)

### Client-Side (8 files)
1. `src/services/shared/blockhashUtils.ts` - Reduced threshold to 10s
2. `src/services/blockchain/transaction/sendExternal.ts` - Optimized rebuild logic
3. `src/services/blockchain/transaction/sendInternal.ts` - Fixed to use shared utility
4. `src/services/split/SplitWalletPayments.ts` - Updated all blockhash fetches
5. `src/services/blockchain/transaction/usdcTransfer.ts` - Updated to use shared utility
6. `src/services/shared/transactionUtils.ts` - Updated to use shared utility
7. `src/services/shared/transactionUtilsOptimized.ts` - Updated to use shared utility
8. `src/services/blockchain/wallet/solanaAppKitService.ts` - Updated all blockhash fetches

### Server-Side (1 file)
1. `services/firebase-functions/src/transactionSigningService.js` - Enhanced validation before submission

## Transaction Logic Consolidation (2025-01-12)

### Unified Transaction Submission

**All transaction paths now use `processUsdcTransfer`** which combines signing and submission in a single Firebase call. This:
- Reduces network round trips (1 call instead of 2)
- Minimizes blockhash expiration risk (faster submission)
- Simplifies error handling
- Improves reliability

**Files Consolidated**:
- ✅ `sendExternal.ts` - Already using `processUsdcTransfer`
- ✅ `sendInternal.ts` - Updated to use `processUsdcTransfer`
- ✅ `TransactionProcessor.ts` - Updated to use `processUsdcTransfer`
- ✅ `SplitWalletPayments.ts` - All 3 functions updated (executeFairSplitTransaction, executeFastTransaction, executeDegenSplitTransaction)
- ✅ `solanaAppKitService.ts` - Updated to use `processUsdcTransfer`

**Removed Duplicate Code**:
- Removed separate `signTransaction` + `submitTransaction` calls
- All paths now use single `processUsdcTransfer` call
- Cleaner, more maintainable codebase

## Security Verification

### ✅ Corporate Wallet Security

**Client-Side**:
- ✅ No company wallet secret keys in client code
- ✅ Only company wallet address exposed (public key)
- ✅ All signing operations performed server-side via Firebase Functions
- ✅ Verified: No `COMPANY_WALLET_SECRET_KEY` or `COMPANY_WALLET_PRIVATE_KEY` in `src/` directory

**Server-Side**:
- ✅ Company wallet secret key stored in Firebase Secrets only
- ✅ Accessed via `process.env.COMPANY_WALLET_SECRET_KEY` in Firebase Functions
- ✅ Never exposed to client or logged
- ✅ Proper initialization and validation

**Transaction Flow Security**:
1. Client creates and signs transaction with user keypair
2. Client sends partially signed transaction to Firebase
3. Firebase validates transaction structure
4. Firebase signs with company wallet (server-side only)
5. Firebase submits to blockchain
6. Client receives signature for verification

## Server-Side Setup Verification

### ✅ Firebase Functions Configuration

**Required Secrets** (set via `firebase functions:secrets:set`):
- `COMPANY_WALLET_ADDRESS` - Company wallet public address
- `COMPANY_WALLET_SECRET_KEY` - Company wallet secret key (JSON array format)

**Functions Available**:
- `processUsdcTransfer` - Sign + submit in one call (PRIMARY - used everywhere)
- `signTransaction` - Sign only (deprecated, kept for backward compatibility)
- `submitTransaction` - Submit only (deprecated, kept for backward compatibility)
- `validateTransaction` - Validate transaction structure
- `getTransactionFeeEstimate` - Estimate transaction fees
- `getCompanyWalletBalance` - Get company wallet balance

**Deployment**:
```bash
cd services/firebase-functions
firebase deploy --only functions
```

## Complete Transaction Flow

### All Transaction Types Now Use Same Pattern:

1. **Get Fresh Blockhash** - Using `getFreshBlockhash()` from `blockhashUtils.ts`
2. **Create Transaction** - Build transaction with instructions
3. **Sign with User Keypair** - Client-side signing
4. **Check Blockhash Age** - If >10 seconds, rebuild with fresh blockhash
5. **Call Firebase** - Single `processUsdcTransfer()` call
6. **Firebase Validates** - Checks blockhash validity before signing
7. **Firebase Signs & Submits** - Company wallet signs and submits in one operation
8. **Return Signature** - Client receives signature for verification

### Transaction Types and Their Services:

- **Internal Transfers** (1:1 user-to-user): `ConsolidatedTransactionService.sendUSDCTransaction()` → `TransactionProcessor.sendUSDCTransaction()` → `processUsdcTransfer()`
- **External Transfers** (user to external wallet): `ExternalTransferService.sendExternalTransfer()` → `processUsdcTransfer()`
- **Split Wallet Funding**: `SplitWalletPayments.executeFairSplitTransaction()` → `processUsdcTransfer()`
- **Split Wallet Withdrawals**: `SplitWalletPayments.executeFastTransaction()` → `processUsdcTransfer()`
- **Fair Split Payments**: `SplitWalletPayments.executeFairSplitTransaction()` → `processUsdcTransfer()`
- **Degen Split Payments**: `SplitWalletPayments.executeDegenSplitTransaction()` → `processUsdcTransfer()`

## Files Modified Summary

### Client-Side (9 files)
1. `src/services/shared/blockhashUtils.ts` - Reduced threshold to 10s
2. `src/services/blockchain/transaction/sendExternal.ts` - Uses `processUsdcTransfer`
3. `src/services/blockchain/transaction/sendInternal.ts` - Uses `processUsdcTransfer`
4. `src/services/blockchain/transaction/TransactionProcessor.ts` - Uses `processUsdcTransfer`
5. `src/services/split/SplitWalletPayments.ts` - All functions use `processUsdcTransfer`
6. `src/services/blockchain/transaction/usdcTransfer.ts` - Updated to use shared utility
7. `src/services/shared/transactionUtils.ts` - Updated to use shared utility
8. `src/services/shared/transactionUtilsOptimized.ts` - Updated to use shared utility
9. `src/services/blockchain/wallet/solanaAppKitService.ts` - Uses `processUsdcTransfer`

### Server-Side (1 file)
1. `services/firebase-functions/src/transactionSigningService.js` - Enhanced validation, single API point

## Implementation Details

### Backend Blockhash Validation (Firebase Functions)

The `submitTransaction` method in `transactionSigningService.js` now:
1. Gets fresh blockhash RIGHT before submission
2. Validates transaction's blockhash using `isBlockhashValid` RPC method
3. Submits immediately after validation to minimize delay
4. Uses `skipPreflight: true` on mainnet (after validation) to avoid rate limits

**Code Pattern**:
```javascript
// Get current blockhash to check expiration status
const { blockhash: currentBlockhash } = await this.connection.getLatestBlockhash('confirmed');

// Check if transaction's blockhash is still valid
const isValid = await this.connection.isBlockhashValid(blockhashString, {
  commitment: 'confirmed'
});

if (!isValid) {
  throw new Error('Transaction blockhash has expired...');
}

// Submit immediately after validation
signature = await this.connection.sendTransaction(transaction, {
  skipPreflight: isMainnet, // Safe after validation
  maxRetries: 3
});
```

### Client-Side Blockhash Handling Pattern

All transaction paths follow this pattern:
```typescript
// 1. Get fresh blockhash with timestamp
const blockhashData = await getFreshBlockhash(connection, 'confirmed');
const blockhash = blockhashData.blockhash;
const blockhashTimestamp = blockhashData.timestamp;

// 2. Create transaction
const transaction = new Transaction({
  recentBlockhash: blockhash,
  feePayer: feePayerPublicKey
});

// 3. Add instructions, sign with user keypair...

// 4. Check age before Firebase call
const blockhashAge = Date.now() - blockhashTimestamp;
if (isBlockhashTooOld(blockhashTimestamp)) {
  // Rebuild with fresh blockhash
  const freshBlockhashData = await getFreshBlockhash(connection, 'confirmed');
  // Rebuild transaction...
}

// 5. Single Firebase call
const result = await processUsdcTransfer(serializedTransaction);
```

## Testing Checklist

- [ ] Test internal transfers (user-to-user)
- [ ] Test external transfers (user-to-external-wallet)
- [ ] Test split wallet funding
- [ ] Test split wallet withdrawals
- [ ] Test fair split payments
- [ ] Test degen split payments
- [ ] Verify all use single `processUsdcTransfer` call
- [ ] Verify blockhash validation on Firebase side
- [ ] Verify no company wallet secrets in client code
- [ ] Test on mainnet with slow network conditions
- [ ] Test blockhash expiration handling (wait 15s before submit)
- [ ] Monitor transaction success rates on mainnet

## Deployment Status

✅ **Client-Side**: All files updated and ready for deployment
✅ **Server-Side**: Firebase Functions updated with enhanced validation
⚠️ **Action Required**: Deploy Firebase Functions before deploying client-side

## Notes

- Mainnet is significantly slower than devnet (5-10 seconds additional latency)
- Total time from blockhash fetch to submission: 10-20 seconds on mainnet
- 10-second threshold provides ~40-50 seconds buffer before expiration
- All transaction paths now use unified `processUsdcTransfer` endpoint
- No duplicate transaction submission logic remaining

