# Critical Bug Found - Deduplication Cleanup Issue

**Date:** 2025-11-21  
**Status:** 🔴 **CRITICAL BUG IDENTIFIED**

---

## The Problem

**User Report:**
- 3 transactions happening seconds apart
- Same amount, from, and to wallets
- All fixes deployed but issue persists

---

## Critical Bug Found

### Issue: Cleanup Happens Too Early

**Location:** `ConsolidatedTransactionService.ts:197-206`

**The Problem:**
```typescript
} catch (error) {
  // Re-throw error so caller can handle it
  cleanup(); // ❌ Cleanup happens on error
  throw error;
} finally {
  // Always cleanup, even on error (if not already cleaned up)
  if (isNewTransaction) {
    cleanup(); // ❌ Cleanup happens in finally
  }
}
```

**What Happens:**
1. Transaction 1 starts → registered in deduplication service
2. Transaction 1 fails/times out → cleanup() called → removed from deduplication
3. Transaction 2 starts → NOT FOUND (Transaction 1 was cleaned up!) → registered
4. Transaction 3 starts → NOT FOUND (Transaction 1 was cleaned up!) → registered

**Result:** All 3 transactions get through!

---

## Root Cause Analysis

### Scenario: Timeout Error

1. **Click 1 (Time 0ms):**
   - Atomic check → NOT FOUND → Register → Start transaction
   - Transaction times out after 2 seconds
   - Cleanup called → Removed from deduplication service

2. **Click 2 (Time 2000ms):**
   - Atomic check → NOT FOUND (Click 1 was cleaned up!) → Register → Start transaction
   - Transaction times out
   - Cleanup called

3. **Click 3 (Time 4000ms):**
   - Atomic check → NOT FOUND (Click 1 & 2 were cleaned up!) → Register → Start transaction

**Result:** All 3 transactions processed separately!

---

## The Fix

### Problem: Cleanup on Error

When a transaction fails or times out, we're cleaning it up immediately. But if the user retries (or if there are multiple simultaneous calls), the deduplication service no longer has the record, so it allows a new transaction.

### Solution: Don't Cleanup on Error Immediately

**Option 1: Keep Failed Transactions in Deduplication Service**
- Don't cleanup on error
- Keep failed transactions for the full timeout window (60 seconds)
- This prevents retries within the window

**Option 2: Only Cleanup on Success**
- Only cleanup when transaction succeeds
- Failed transactions stay in deduplication service
- Prevents retries after failures

**Option 3: Separate Success/Failure Tracking**
- Track successful transactions separately
- Keep failed transactions in deduplication for shorter time (10 seconds)
- Prevents immediate retries but allows retries after delay

---

## Recommended Fix

**Keep failed transactions in deduplication service for at least 10 seconds:**

```typescript
} catch (error) {
  // Don't cleanup immediately on error
  // Keep in deduplication service to prevent immediate retries
  // Cleanup will happen automatically after timeout (60s) or on success
  throw error;
} finally {
  // Only cleanup on success
  if (isNewTransaction && result?.success) {
    cleanup();
  }
  // Failed transactions stay in deduplication service
}
```

---

## Additional Issue: Timeout Window

The 30-second time window might be too short if transactions take longer than 30 seconds. If a transaction takes 35 seconds:
- It's registered in window 0
- After 30 seconds, it moves to window 1
- A retry at 35 seconds checks window 1 → NOT FOUND → Creates duplicate

**Solution:** Increase timeout window or use a different deduplication strategy.

---

## Immediate Actions

1. **Fix cleanup logic** - Don't cleanup on error immediately
2. **Increase timeout window** - Or use signature-based deduplication
3. **Add logging** - Track when cleanup happens
4. **Test** - Verify deduplication works with failed transactions

