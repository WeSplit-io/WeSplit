# Production Timeout Error Fixes

**Date:** 2025-01-16  
**Issue:** Frontend showing timeout errors even though backend transactions complete successfully

---

## Problem

In production (mainnet), transactions were completing successfully on the backend, but the frontend was showing timeout errors. This happened because:

1. **Firebase Function timeout too short**: 30 seconds wasn't enough for mainnet transactions
2. **Frontend timeout too short**: 20-30 seconds wasn't enough for production/mainnet
3. **Poor error handling**: Frontend didn't distinguish between actual failures and timeout scenarios where transaction might have succeeded

---

## Solutions Implemented

### 1. ✅ Increased Firebase Function Timeout

**File:** `services/firebase-functions/src/transactionFunctions.js`

**Change:**
```javascript
// Before
timeoutSeconds: 30,

// After
timeoutSeconds: 60, // Increased from 30s to 60s for production/mainnet
```

**Why:** Mainnet transactions can take 30-60 seconds to process, especially during high network traffic. The function needs enough time to:
- Sign the transaction
- Submit to blockchain
- Verify transaction status
- Handle RPC indexing delays

---

### 2. ✅ Increased Frontend Timeout for Production/Mainnet

**File:** `src/services/blockchain/transaction/transactionSigningService.ts`

**Change:**
```typescript
// Before
timeout: 90000 // 90 seconds for all environments

// After
const isProduction = !__DEV__;
const isMainnet = config.getConfig().blockchain.network === 'mainnet';
const timeout = (isProduction && isMainnet) ? 120000 : 90000; // 120s for production mainnet, 90s otherwise
```

**Why:** Production mainnet needs longer timeouts because:
- Network latency is higher
- RPC endpoints can be slower
- Transaction indexing takes longer

---

### 3. ✅ Increased Confirmation Timeout for Production/Mainnet

**File:** `src/services/shared/transactionUtilsOptimized.ts`

**Change:**
```typescript
// Before
const maxTimeout = isIOS && isProduction ? 30000 : 20000; // 30s for iOS production, 20s for others

// After
let maxTimeout: number;
if (isProduction && isMainnet) {
  maxTimeout = 60000; // 60s for production mainnet (RPC indexing can be slow)
} else if (isProduction) {
  maxTimeout = 45000; // 45s for production devnet
} else if (isIOS) {
  maxTimeout = 30000; // 30s for iOS dev
} else {
  maxTimeout = 20000; // 20s for Android dev
}
```

**Why:** Mainnet RPC indexing can take 10-30 seconds. The confirmation timeout needs to account for this.

---

### 4. ✅ Improved Timeout Error Handling

**File:** `src/services/blockchain/transaction/transactionSigningService.ts`

**Change:**
- Added detection for timeout errors (`deadline-exceeded`, `timeout`)
- Provides user-friendly error messages for timeout scenarios
- Suggests checking transaction history when timeout occurs

**File:** `src/services/blockchain/transaction/TransactionProcessor.ts`

**Change:**
- Detects timeout errors specifically
- On mainnet, treats timeout as "transaction may have succeeded"
- Provides helpful error message directing users to check transaction history

---

## Timeout Configuration Summary

| Environment | Firebase Function | Frontend Call | Confirmation |
|-------------|------------------|---------------|--------------|
| **Production Mainnet** | 60s | 120s | 60s |
| **Production Devnet** | 60s | 90s | 45s |
| **Development** | 30s | 90s | 20-30s |

---

## Error Messages

### Before
```
Transaction failed: Firebase Function error (deadline-exceeded): Request timeout
```

### After
```
Transaction processing timed out. The transaction may have succeeded on the blockchain. Please check your transaction history or try again.
```

---

## Testing

After deploying these changes:

1. **Deploy Firebase Functions:**
   ```bash
   cd services/firebase-functions
   firebase deploy --only functions
   ```

2. **Rebuild AAB:**
   ```bash
   cd android
   export APP_ENV=production
   export NODE_ENV=production
   ./gradlew bundleRelease
   ```

3. **Test in Production:**
   - Make a transaction
   - If timeout occurs, check if transaction actually succeeded
   - Verify error message is user-friendly

---

## Monitoring

Check Firebase Functions logs to see actual processing times:

```bash
firebase functions:log --only processUsdcTransfer
```

Look for:
- Function execution time
- Timeout errors
- Successful transactions that took > 30 seconds

---

## Additional Notes

- **Mainnet is slower**: Expect 30-60 second processing times during high traffic
- **RPC indexing delays**: Transactions can take 5-15 seconds to appear in RPC queries
- **User experience**: Timeout errors now suggest checking transaction history instead of just "failed"

---

## Related Files

- `services/firebase-functions/src/transactionFunctions.js` - Backend timeout
- `src/services/blockchain/transaction/transactionSigningService.ts` - Frontend timeout
- `src/services/shared/transactionUtilsOptimized.ts` - Confirmation timeout
- `src/services/blockchain/transaction/TransactionProcessor.ts` - Error handling

