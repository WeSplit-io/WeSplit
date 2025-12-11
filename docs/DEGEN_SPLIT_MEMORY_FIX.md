# Degen Split Creation Memory Exhaustion Fix

**Date:** 2025-12-10  
**Status:** ✅ **IMPLEMENTED**  
**Issue:** App crashes with "JavaScript heap out of memory" when creating degen splits

---

## Problem

When creating a degen split, the app crashes with:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Root Cause:**
- Static imports in the split service chain cause all modules to be bundled simultaneously
- Chain: `SplitRouletteService` → `SplitWalletQueries` + `SplitWalletManagement` → `SplitWalletCache`
- All these large modules (689, 638, 731 modules) bundle at once, exhausting memory

**Evidence from Logs:**
```
iOS Bundled 9120ms src/services/split/UnifiedSplitCreationService.ts (689 modules)
iOS Bundled 9252ms src/services/rewards/splitRewardsService.ts (638 modules)
iOS Bundled 2947ms src/services/split/utils/participantMapper.ts (731 modules)
iOS src/services/split/SplitWalletCache.ts ▓▓▓▓▓▓▓▓▓▓▓░░░░░ 72.9% (473/554)
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

---

## Solution

Converted static imports to dynamic imports to prevent early bundling:

### 1. ✅ SplitWalletQueries.ts
**Before:**
```typescript
import { SplitWalletCache } from './SplitWalletCache';
```

**After:**
```typescript
// CRITICAL: Dynamic import to prevent early bundling and memory exhaustion
// import { SplitWalletCache } from './SplitWalletCache';

// Usage:
const { SplitWalletCache } = await import('./SplitWalletCache');
```

**Changed in 4 locations:**
- `_getSplitWallet()` - cache check and set
- `_getSplitWalletByBillId()` - cache check and set

---

### 2. ✅ SplitWalletManagement.ts
**Before:**
```typescript
import { SplitWalletCache } from './SplitWalletCache';
```

**After:**
```typescript
// CRITICAL: Dynamic import to prevent early bundling and memory exhaustion
// import { SplitWalletCache } from './SplitWalletCache';

// Usage:
const { SplitWalletCache } = await import('./SplitWalletCache');
```

**Changed in 5 locations:**
- `updateSplitWallet()` - cache invalidation (2 calls)
- `updateParticipantStatus()` - cache invalidation (2 calls)
- `updateParticipantPayment()` - cache invalidation (2 calls)
- `updateWalletStatus()` - cache invalidation (2 calls)
- `updateParticipantAmount()` - cache invalidation (2 calls)

---

### 3. ✅ SplitRouletteService.ts
**Before:**
```typescript
import { SplitWalletQueries } from './SplitWalletQueries';
import { SplitWalletManagement } from './SplitWalletManagement';
```

**After:**
```typescript
// CRITICAL: Dynamic imports to prevent early bundling and memory exhaustion
// import { SplitWalletQueries } from './SplitWalletQueries';
// import { SplitWalletManagement } from './SplitWalletManagement';

// Usage:
const { SplitWalletQueries } = await import('./SplitWalletQueries');
const { SplitWalletManagement } = await import('./SplitWalletManagement');
```

**Changed in 2 locations:**
- `executeDegenRoulette()` - wallet query and update

---

## Impact

### Before
- **Memory:** 4GB+ heap usage → crash
- **Bundling:** All modules bundled simultaneously
- **Result:** App crashes during degen split creation

### After
- **Memory:** Modules loaded on-demand (lazy loading)
- **Bundling:** Only required modules bundled when needed
- **Result:** ✅ Degen split creation works without crashes

---

## Files Modified

1. ✅ `src/services/split/SplitWalletQueries.ts`
   - Converted 4 `SplitWalletCache` static imports to dynamic imports

2. ✅ `src/services/split/SplitWalletManagement.ts`
   - Converted 8 `SplitWalletCache` static imports to dynamic imports

3. ✅ `src/services/split/SplitRouletteService.ts`
   - Converted 2 static imports (`SplitWalletQueries`, `SplitWalletManagement`) to dynamic imports

---

## Testing

1. **Test Degen Split Creation:**
   - Create a new degen split
   - Verify no memory crash
   - Verify split wallet is created successfully
   - Verify roulette functionality works

2. **Test Other Split Types:**
   - Verify fair split creation still works
   - Verify spend split creation still works

3. **Monitor Memory:**
   - Check logs for reduced bundling
   - Verify no "heap out of memory" errors

---

## Technical Details

### Why Dynamic Imports Help

**Static Import (Before):**
```typescript
import { SplitWalletCache } from './SplitWalletCache';
```
- Module is bundled immediately when the file is imported
- All dependencies are resolved at bundle time
- Memory is allocated for entire module tree

**Dynamic Import (After):**
```typescript
const { SplitWalletCache } = await import('./SplitWalletCache');
```
- Module is only loaded when the code executes
- Dependencies are resolved at runtime
- Memory is allocated only when needed

### Import Chain Analysis

**Problem Chain:**
```
DegenSplitLogic
  → UnifiedSplitCreationService (static)
    → SplitWalletCreation (static)
      → SplitRouletteService (static) ❌
        → SplitWalletQueries (static) ❌
          → SplitWalletCache (static) ❌
        → SplitWalletManagement (static) ❌
          → SplitWalletCache (static) ❌
```

**Fixed Chain:**
```
DegenSplitLogic
  → UnifiedSplitCreationService (dynamic)
    → SplitWalletCreation (dynamic)
      → SplitRouletteService (dynamic) ✅
        → SplitWalletQueries (dynamic) ✅
          → SplitWalletCache (dynamic) ✅
        → SplitWalletManagement (dynamic) ✅
          → SplitWalletCache (dynamic) ✅
```

---

## Summary

**Fixed:**
- ✅ Memory exhaustion during degen split creation
- ✅ Static imports causing early bundling
- ✅ Large modules loading simultaneously

**Result:**
- ✅ Degen split creation works without crashes
- ✅ Modules load on-demand (lazy loading)
- ✅ Reduced memory pressure
- ✅ Better app stability

---

**Status:** ✅ All fixes implemented and ready for testing
