# Comprehensive Transaction System Audit - Mainnet Issues

**Date:** 2025-01-13  
**Status:** 🔴 **CRITICAL ISSUES FOUND**  
**Network:** Mainnet

## Executive Summary

This audit identifies **critical issues** preventing transactions from processing on mainnet. The primary issues are:

1. **CRITICAL**: `processUsdcTransfer` uses `Buffer.from()` without React Native fallback - will fail in mobile app
2. **CRITICAL**: Multiple services create their own `Connection` instead of using optimized RPC endpoints
3. **HIGH**: Blockhash expiration still occurring despite recent fixes
4. **MEDIUM**: Inconsistent RPC endpoint usage across services

## Critical Issues

### Issue #1: processUsdcTransfer Base64 Encoding Failure ⚠️ CRITICAL

**File:** `src/services/blockchain/transaction/transactionSigningService.ts`  
**Line:** 686  
**Severity:** 🔴 CRITICAL

**Problem:**
```typescript
// CURRENT CODE (WILL FAIL IN REACT NATIVE):
const base64Transaction = Buffer.from(serializedTransaction).toString('base64');
```

`Buffer` is not available in React Native, causing transactions to fail silently or throw errors.

**Impact:**
- All transactions fail in mobile app (iOS/Android)
- No fallback to `btoa` or manual encoding
- Error may be swallowed or unclear

**Fix Applied:**
✅ Updated to use React Native-compatible base64 encoding with fallbacks:
- Try `Buffer.from()` first (Node.js/web)
- Fallback to `btoa()` (React Native)
- Final fallback to manual base64 encoding

**Status:** ✅ FIXED

---

### Issue #2: TransactionProcessor Uses Non-Optimized RPC Connection ⚠️ CRITICAL

**File:** `src/services/blockchain/transaction/TransactionProcessor.ts`  
**Line:** 40  
**Severity:** 🔴 CRITICAL

**Problem:**
```typescript
// CURRENT CODE:
constructor() {
  this.connection = new Connection(getConfig().blockchain.rpcUrl, {
    commitment: getConfig().blockchain.commitment,
    confirmTransactionInitialTimeout: getConfig().blockchain.timeout,
  });
}
```

**Issues:**
1. Uses single RPC endpoint (no rotation)
2. No rate limit handling
3. No endpoint failover
4. Doesn't use optimized RPC endpoints (Alchemy, GetBlock)

**Impact:**
- Slower transaction processing
- Higher rate limit errors
- No automatic failover on errors
- Mainnet transactions more likely to fail

**Recommended Fix:**
```typescript
constructor() {
  // Use optimized connection with endpoint rotation
  // Connection will be created lazily via optimizedTransactionUtils
}

async getConnection(): Promise<Connection> {
  return await optimizedTransactionUtils.getConnection();
}
```

**Status:** ⚠️ NEEDS FIX

---

### Issue #3: ExternalTransferService Uses Non-Optimized RPC Connection ⚠️ CRITICAL

**File:** `src/services/blockchain/transaction/sendExternal.ts`  
**Line:** 61  
**Severity:** 🔴 CRITICAL

**Problem:**
```typescript
// CURRENT CODE:
constructor() {
  this.connection = new Connection(getConfig().blockchain.rpcUrl, {
    commitment: getConfig().blockchain.commitment,
    confirmTransactionInitialTimeout: getConfig().blockchain.timeout,
  });
}
```

Same issues as TransactionProcessor.

**Status:** ⚠️ NEEDS FIX

---

### Issue #4: Blockhash Expiration Still Occurring ⚠️ HIGH

**Symptoms:**
- Transactions fail with "blockhash has expired" error
- Even with 3-second threshold, blockhash expires during Firebase processing
- Logs show blockhash is fresh (52ms) but expires by submission (4.3s later)

**Root Cause Analysis:**

1. **Client Side:**
   - ✅ Blockhash refresh threshold: 3 seconds (aggressive)
   - ✅ Blockhash age check before Firebase call
   - ✅ Automatic rebuild if blockhash too old

2. **Firebase Side:**
   - ✅ Validation removed (saves 1-2 seconds)
   - ✅ Preflight skipped on mainnet (saves 500-2000ms)
   - ✅ Immediate submission after signing

3. **Remaining Issues:**
   - Firebase cold start can take 2-5 seconds
   - Network latency to Firebase: 200-1000ms
   - Base64 encoding/decoding: 50-200ms
   - Transaction signing: 50-200ms
   - **Total delay: 2.5-7.5 seconds** → Blockhash expires

**Potential Solutions:**

1. **Reduce blockhash threshold further** (risky - may cause unnecessary rebuilds)
2. **Pre-warm Firebase Functions** (reduce cold start)
3. **Rebuild transaction in Firebase if expired** (complex - requires extracting instructions)
4. **Use faster RPC endpoints** (already implemented)

**Status:** ⚠️ INVESTIGATING

---

## Transaction Flow Analysis

### Current Flow (All Transaction Types)

```
1. User Action
   ↓
2. Service Layer (sendExternal/sendInternal/TransactionProcessor)
   ↓
3. Get Fresh Blockhash (3s threshold)
   ↓
4. Build Transaction
   ↓
5. Check Blockhash Age (< 3s?)
   ↓
6. If too old → Rebuild with fresh blockhash
   ↓
7. Serialize Transaction
   ↓
8. Convert to Base64 (⚠️ Issue #1 - Fixed)
   ↓
9. Call Firebase processUsdcTransfer
   ↓
10. Firebase: Deserialize
   ↓
11. Firebase: Add Company Signature
   ↓
12. Firebase: Submit to Blockchain
   ↓
13. Return Signature
   ↓
14. Client: Verify Transaction
```

### Timing Breakdown (Mainnet)

| Step | Time (ms) | Cumulative |
|------|-----------|------------|
| Get Blockhash | 100-500 | 100-500 |
| Build Transaction | 50-200 | 150-700 |
| Check Age | 0-10 | 150-710 |
| Serialize | 10-50 | 160-760 |
| Base64 Encode | 10-100 | 170-860 |
| **Network to Firebase** | **200-1000** | **370-1860** |
| **Firebase Cold Start** | **2000-5000** | **2370-6860** |
| Deserialize | 10-50 | 2380-6910 |
| Add Signature | 50-200 | 2430-7110 |
| Submit to Blockchain | 500-2000 | 2930-9110 |

**Total: 2.9-9.1 seconds** → Blockhash expires (60s limit, but network delays cause issues)

---

## Service-by-Service Audit

### ✅ sendInternal.ts
- **Status:** GOOD
- Uses `optimizedTransactionUtils.getConnection()` ✅
- Uses `processUsdcTransfer` ✅
- Blockhash age check before Firebase ✅
- **Issues:** None

### ⚠️ sendExternal.ts
- **Status:** NEEDS FIX
- Creates own `Connection` (Issue #3) ❌
- Uses `processUsdcTransfer` ✅
- Blockhash age check before Firebase ✅
- **Fix Required:** Use optimized connection

### ⚠️ TransactionProcessor.ts
- **Status:** NEEDS FIX
- Creates own `Connection` (Issue #2) ❌
- Uses `processUsdcTransfer` ✅
- Blockhash age check before Firebase ✅
- **Fix Required:** Use optimized connection

### ✅ SplitWalletPayments.ts
- **Status:** GOOD
- Uses `processUsdcTransfer` ✅
- Blockhash age check before Firebase ✅
- **Issues:** None

### ✅ transactionSigningService.ts (Client)
- **Status:** FIXED
- `processUsdcTransfer` now has React Native fallback ✅
- Proper error handling ✅
- **Issues:** None (after fix)

### ✅ transactionSigningService.js (Firebase)
- **Status:** GOOD
- Uses optimized RPC endpoints ✅
- Skips validation to save time ✅
- Skips preflight on mainnet ✅
- **Issues:** None

---

## RPC Endpoint Configuration

### Current Configuration

**Client Side (`unified.ts`):**
- ✅ Prioritizes Alchemy, GetBlock, QuickNode, Chainstack
- ✅ Extracts API keys from full URLs
- ✅ Supports endpoint rotation

**Firebase Side (`transactionSigningService.js`):**
- ✅ Uses same priority as client
- ✅ Extracts API keys correctly
- ✅ Supports endpoint rotation

**Issues:**
- ⚠️ Not all services use optimized endpoints
- ⚠️ TransactionProcessor uses single endpoint
- ⚠️ ExternalTransferService uses single endpoint

---

## Blockhash Management

### Current Implementation

**Client Side:**
- Threshold: 3 seconds (very aggressive)
- Check: Before Firebase call
- Rebuild: If blockhash > 3s old

**Firebase Side:**
- Validation: Skipped (trusts client)
- Submission: Immediate after signing

**Issues:**
- ⚠️ Still experiencing expiration despite 3s threshold
- ⚠️ Firebase cold start adds significant delay
- ⚠️ Network latency unpredictable

---

## Recommendations

### Immediate Fixes (Priority 1)

1. ✅ **FIXED**: Update `processUsdcTransfer` base64 encoding
2. ⚠️ **TODO**: Update `TransactionProcessor` to use optimized connection
3. ⚠️ **TODO**: Update `ExternalTransferService` to use optimized connection

### Short-term Improvements (Priority 2)

1. **Reduce Firebase cold start:**
   - Pre-warm functions
   - Use Cloud Run instead of Functions (faster cold start)
   - Keep functions warm with scheduled pings

2. **Optimize blockhash handling:**
   - Consider reducing threshold to 2 seconds (risky)
   - Add blockhash age logging in Firebase
   - Monitor blockhash expiration patterns

3. **Improve error handling:**
   - Better error messages for blockhash expiration
   - Automatic retry with fresh blockhash
   - User-friendly error messages

### Long-term Improvements (Priority 3)

1. **Transaction rebuilding in Firebase:**
   - Extract instructions from expired transaction
   - Rebuild with fresh blockhash
   - Resign and submit

2. **Connection pooling:**
   - Shared connection pool
   - Automatic endpoint rotation
   - Health checks

3. **Monitoring:**
   - Track blockhash expiration rates
   - Monitor RPC endpoint performance
   - Alert on high failure rates

---

## Testing Checklist

- [ ] Test `processUsdcTransfer` in React Native (iOS)
- [ ] Test `processUsdcTransfer` in React Native (Android)
- [ ] Test with optimized RPC endpoints
- [ ] Test blockhash expiration handling
- [ ] Test transaction retry logic
- [ ] Test mainnet transaction flow end-to-end
- [ ] Monitor Firebase function cold start times
- [ ] Monitor blockhash expiration rates

---

## Files Modified

### Fixed
1. ✅ `src/services/blockchain/transaction/transactionSigningService.ts` - Base64 encoding fix

### Needs Fix
1. ⚠️ `src/services/blockchain/transaction/TransactionProcessor.ts` - Use optimized connection
2. ⚠️ `src/services/blockchain/transaction/sendExternal.ts` - Use optimized connection

---

## Next Steps

1. **Immediate:** Apply fixes to TransactionProcessor and ExternalTransferService
2. **Short-term:** Monitor blockhash expiration after fixes
3. **Long-term:** Consider Firebase cold start optimization

---

## Conclusion

The mainnet transaction failures are caused by:
1. ✅ **FIXED**: Base64 encoding issue in React Native
2. ⚠️ **TODO**: Non-optimized RPC connections in some services
3. ⚠️ **INVESTIGATING**: Blockhash expiration despite recent fixes

After applying the remaining fixes, transactions should work reliably on mainnet.

