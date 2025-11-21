# Firebase Functions Log Check Commands

**Date:** 2025-11-21  
**Purpose:** Quick reference for checking duplicate transaction logs

---

## Quick Log Check Commands

### 1. Check for Duplicate Check Messages
```bash
firebase functions:log --only processUsdcTransfer 2>&1 | grep -E "Duplicate|duplicate|already-exists|hash check|timeout" | head -50
```

### 2. Check for Success/Error Indicators
```bash
firebase functions:log --only processUsdcTransfer 2>&1 | grep -E "✅|❌|⚠️" | head -50
```

### 3. Check Recent Transactions
```bash
firebase functions:log --only processUsdcTransfer 2>&1 | tail -100
```

### 4. Check for Specific Log Messages
```bash
# Duplicate check passed
firebase functions:log --only processUsdcTransfer 2>&1 | grep "Duplicate check passed"

# Duplicate detected
firebase functions:log --only processUsdcTransfer 2>&1 | grep "DUPLICATE TRANSACTION DETECTED"

# Timeout rejection
firebase functions:log --only processUsdcTransfer 2>&1 | grep "timed out - REJECTING"
```

---

## What to Look For

### ✅ Good Signs (Duplicate Check Working)

1. **Duplicate Check Passed:**
   ```
   ✅ Duplicate check passed
   checkTimeMs: <time>
   note: Transaction hash verified as unique
   ```

2. **Duplicate Detected and Rejected:**
   ```
   ❌ DUPLICATE TRANSACTION DETECTED
   error: This transaction has already been processed
   note: Rejecting to prevent duplicate
   ```

3. **Timeout Rejection (Preventing Duplicates):**
   ```
   ❌ Duplicate check timed out - REJECTING to prevent duplicates
   error: Transaction hash check timeout
   note: Rejecting to prevent potential duplicates
   ```

### ❌ Bad Signs (Duplicate Check Not Working)

1. **No Duplicate Check Logs:**
   - If you don't see ANY of the above messages
   - Means duplicate check isn't running

2. **Old Behavior (Proceeding on Timeout):**
   ```
   ⚠️ Duplicate check timed out - proceeding anyway
   ```
   - This is the OLD behavior (should NOT see this)

3. **Multiple Transactions with Same Parameters:**
   - If you see multiple transactions processed with same amount/to
   - Means duplicates are getting through

---

## Testing After Deployment

1. **Send a test transaction**
2. **Immediately check logs:**
   ```bash
   firebase functions:log --only processUsdcTransfer 2>&1 | tail -50
   ```
3. **Look for duplicate check messages**
4. **If you see "✅ Duplicate check passed"** → Working correctly
5. **If you see no duplicate check logs** → Not working, need to investigate

---

## Next Steps After Log Check

- ✅ If logs show duplicate check working → Great! Test with rapid clicks
- ❌ If logs show no duplicate check → Need to verify deployment
- ⚠️ If logs show old behavior → Code not deployed correctly

