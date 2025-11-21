# Root Cause Analysis - Why 3 Transactions Still Happening

**Date:** 2025-11-21  
**Status:** 🔴 **ROOT CAUSE IDENTIFIED**

---

## The Problem

**User Report:**
- 3 transactions happening seconds apart
- Same amount, from, and to wallets
- All fixes deployed but issue persists

---

## Root Cause: Cleanup on Error

### The Critical Bug

**Location:** `ConsolidatedTransactionService.ts` and `sendExternal.ts`

**The Problem:**
```typescript
} catch (error) {
  cleanup(); // ❌ Removes from deduplication service
  throw error;
}
```

**What Happens:**
1. **Transaction 1 (Time 0s):**
   - Atomic check → NOT FOUND → Register → Start transaction
   - Transaction times out after 2 seconds
   - **Cleanup called** → Removed from deduplication service ❌

2. **Transaction 2 (Time 2s):**
   - Atomic check → NOT FOUND (Transaction 1 was cleaned up!) → Register → Start transaction
   - Transaction times out
   - **Cleanup called** → Removed from deduplication service ❌

3. **Transaction 3 (Time 4s):**
   - Atomic check → NOT FOUND (Transaction 1 & 2 were cleaned up!) → Register → Start transaction

**Result:** All 3 transactions get through! ❌

---

## Why This Happens

### Scenario: Timeout Error Flow

1. User clicks "Sign transaction"
2. Transaction starts → Registered in deduplication service
3. Transaction times out (blockhash expired, network slow, etc.)
4. **Error caught → Cleanup called → Removed from deduplication** ❌
5. User sees timeout error
6. User retries (or automatic retry happens)
7. **New transaction starts → NOT FOUND (was cleaned up!) → Registered** ❌
8. Repeat...

---

## The Fix Applied

### ✅ Don't Cleanup on Error

**Changed:**
```typescript
// OLD (BROKEN):
} catch (error) {
  cleanup(); // ❌ Allows retries
  throw error;
}

// NEW (FIXED):
} catch (error) {
  // Don't cleanup - keep in deduplication service
  // This prevents retries within 60s window
  throw error;
}

// Only cleanup on SUCCESS:
if (result.success) {
  cleanup();
}
```

**Result:**
- Failed transactions stay in deduplication service for 60 seconds
- Retries within 60 seconds are blocked ✅
- Only successful transactions are cleaned up immediately ✅

---

## Additional Issues Found

### 1. Async Import Breaks Atomicity

**Issue:** The `await import()` before atomic check creates a window for race conditions.

**Fix:** Import should happen before creating placeholder promise.

### 2. Time Window Edge Cases

**Issue:** 30-second windows might miss transactions that span window boundaries.

**Fix:** Dual-window registration (current + previous) should handle this.

---

## Verification

After this fix:
1. Transaction fails → Stays in deduplication service
2. User retries → Blocked by deduplication service ✅
3. Transaction succeeds → Cleaned up immediately ✅

---

## Next Steps

1. ✅ Deploy this fix
2. ✅ Test with timeout scenarios
3. ✅ Verify retries are blocked
4. ✅ Monitor logs for deduplication messages

