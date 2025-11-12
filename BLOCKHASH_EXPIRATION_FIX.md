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

## Solution Implemented

### 1. Client-Side Blockhash Age Check

**File**: `src/services/blockchain/transaction/sendExternal.ts`

- Added blockhash timestamp tracking when blockhash is obtained
- Before sending to Firebase, check if blockhash is >45 seconds old
- If too old, automatically rebuild transaction with fresh blockhash
- This prevents sending expired blockhashes to Firebase

```typescript
// Check blockhash age before Firebase call
const blockhashAge = Date.now() - blockhashTimestamp;
const BLOCKHASH_MAX_AGE_MS = 45000; // 45 seconds

if (blockhashAge > BLOCKHASH_MAX_AGE_MS) {
  // Rebuild with fresh blockhash
}
```

### 2. Firebase Functions Blockhash Validation

**File**: `services/firebase-functions/src/transactionSigningService.js`

- Added blockhash validation in `processUsdcTransfer()` BEFORE signing
- Added blockhash validation in `addCompanySignature()` BEFORE signing
- Validates blockhash age by comparing current block height vs last valid block height
- Rejects transactions with blockhashes within 20 slots of expiration (safety margin)
- This prevents wasting time signing transactions that will fail

```javascript
// Validate blockhash before signing
const slotsSinceLastValid = currentBlockHeight - lastValidBlockHeight;
if (slotsSinceLastValid > 130) { // 150 slots = expiration, 130 = safety margin
  throw new Error('Transaction blockhash has expired');
}
```

### 3. Increased Retry Attempts

**File**: `src/services/blockchain/transaction/sendExternal.ts`

- Increased max retry attempts from 2 to 3
- Better handling of transient network issues

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

## Files Modified

1. `src/services/blockchain/transaction/sendExternal.ts`
   - Added blockhash timestamp tracking
   - Added blockhash age check before Firebase call
   - Added automatic rebuild if blockhash too old
   - Increased retry attempts

2. `services/firebase-functions/src/transactionSigningService.js`
   - Added blockhash validation in `processUsdcTransfer()`
   - Added blockhash validation in `addCompanySignature()`
   - Early rejection of expired blockhashes

## Future Improvements

1. Consider using `processUsdcTransfer` everywhere (combines sign + submit)
2. Add blockhash caching for rapid successive transactions
3. Monitor blockhash expiration rates to optimize timing

