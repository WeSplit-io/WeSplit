# Deep Duplicate Transaction Audit

**Date:** 2025-11-21  
**Status:** 🔴 **CRITICAL RACE CONDITION FOUND**

---

## Problem Statement

**User Report:**
- Timeout errors in frontend
- 3 transactions occurring at the same time
- All fixes deployed but issue persists

---

## Critical Race Condition Found

### The Issue: Non-Atomic Check-and-Register

**Location:** `TransactionDeduplicationService.ts` + `ConsolidatedTransactionService.ts`

**Problem:**
1. `checkInFlight()` uses `Date.now()` to generate key
2. `registerInFlight()` uses `Date.now()` to generate key (different timestamp!)
3. Between check and register, another call can pass the check
4. Multiple calls can all pass the check before any registers

**Timeline of Race Condition:**
```
Time 0ms:   Click 1: checkInFlight() → key with timestamp 0ms → NOT FOUND
Time 1ms:   Click 2: checkInFlight() → key with timestamp 1ms → NOT FOUND (Click 1 hasn't registered yet!)
Time 2ms:   Click 3: checkInFlight() → key with timestamp 2ms → NOT FOUND (Click 1 & 2 haven't registered yet!)
Time 50ms:  Click 1: registerInFlight() → key with timestamp 50ms → REGISTERED
Time 51ms:  Click 2: registerInFlight() → key with timestamp 51ms → REGISTERED (DIFFERENT KEY!)
Time 52ms:  Click 3: registerInFlight() → key with timestamp 52ms → REGISTERED (DIFFERENT KEY!)

Result: All 3 clicks create separate transactions!
```

### Root Cause

**The key generation uses different timestamps:**
- `checkInFlight()` generates key with `Date.now()` at check time
- `registerInFlight()` generates key with `Date.now()` at register time
- Even milliseconds apart can create different keys if they fall in different time windows

**Time Window Issue:**
- 30-second windows: `Math.floor(timestamp / 30000)`
- If check happens at 29999ms and register at 30001ms → different windows!
- Even within same window, different timestamps create different keys

---

## Additional Issues Found

### 1. Button Guards May Not Be Working

**Location:** `SendConfirmationScreen.tsx`

**Issue:**
- Button guards use refs, which should work
- But if user clicks VERY rapidly (< 1ms), all clicks might pass before ref is set
- React's event batching might delay ref updates

### 2. Deduplication Service Key Collision

**Location:** `TransactionDeduplicationService.ts:127-136`

**Code:**
```typescript
// Check if already exists (shouldn't happen if checkInFlight was called first)
const existing = this.inFlightTransactions.get(key);
if (existing) {
  logger.warn('⚠️ Transaction key collision - overwriting existing transaction');
}
```

**Problem:**
- This warns but doesn't prevent the overwrite!
- If two calls register with same key, the second overwrites the first
- The first transaction's promise is lost

### 3. Frontend Not Deployed

**Possible Issue:**
- Frontend fixes (button guards, deduplication service) may not be in deployed app
- User is testing with old app version
- Need to verify app version has latest fixes

---

## Solutions Required

### ✅ Fix 1: Make Check-and-Register Atomic

**Problem:** Check and register use different timestamps

**Solution:** Generate key ONCE and pass it to both methods

**Implementation:**
```typescript
// Generate key ONCE at the start
const timestamp = Date.now();
const key = generateTransactionKey(userId, to, amount, timestamp);

// Check using the SAME key
const existing = inFlightTransactions.get(key);

// Register using the SAME key
inFlightTransactions.set(key, transaction);
```

### ✅ Fix 2: Use Synchronous Lock

**Problem:** Async operations allow race conditions

**Solution:** Use a synchronous Map check-and-set

**Implementation:**
```typescript
// Synchronous check-and-set
const key = generateTransactionKey(userId, to, amount, Date.now());
if (inFlightTransactions.has(key)) {
  return inFlightTransactions.get(key).promise;
}

// Create promise and register IMMEDIATELY (synchronous)
const promise = createTransactionPromise();
inFlightTransactions.set(key, { promise, timestamp: Date.now() });
return promise;
```

### ✅ Fix 3: Verify Frontend Deployment

**Action:** Check if latest app version is deployed with:
- Button guards
- Deduplication service
- Race condition fixes

---

## Immediate Actions

1. **Fix the atomic check-and-register** (CRITICAL)
2. **Verify frontend is deployed** (CRITICAL)
3. **Add more logging** to track the race condition
4. **Test with rapid clicks** to verify fix

---

## Expected Behavior After Fix

1. Click 1: checkInFlight() → NOT FOUND → registerInFlight() → REGISTERED
2. Click 2: checkInFlight() → FOUND → return existing promise ✅
3. Click 3: checkInFlight() → FOUND → return existing promise ✅

**Result:** Only 1 transaction created, all clicks share same promise

