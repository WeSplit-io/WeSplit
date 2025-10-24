# Real-time Updates Fix - Preventing Old Split Data Override

## Problem Identified

The user reported that they initially see the correct AI data, but then a second later they see the latest split they created using manual logic. This was happening because:

1. **OCR flow shows correct AI data initially** ✅
2. **Real-time updates load old split data** ❌ (overrides the new data)
3. **User goes back to list and doesn't see the new split** ❌

## Root Cause Analysis

The issue was in the **real-time updates system** in `SplitDetailsScreen`. The real-time updates were using the original `splitId` instead of the `effectiveSplitId`, causing them to listen to the old split and override the new split data.

### **The Problem Flow:**
1. OCR flow navigates to SplitDetails with `splitId: undefined` (correct)
2. `effectiveSplitId` is set to `undefined` (correct)
3. **BUT** real-time updates still use original `splitId` (incorrect)
4. Real-time updates load old split data and override new split data

## Fixes Applied

### 1. **Updated Real-time Updates to Use effectiveSplitId**

#### Before:
```typescript
const startRealtimeUpdates = useCallback(async () => {
  if (!splitId || isRealtimeActive) {  // ❌ Using original splitId
    return;
  }
  
  const cleanup = await splitRealtimeService.startListening(
    splitId,  // ❌ Using original splitId
    { /* ... */ }
  );
}, [splitId, isRealtimeActive]);  // ❌ Depends on original splitId
```

#### After:
```typescript
const startRealtimeUpdates = useCallback(async () => {
  if (!effectiveSplitId || isRealtimeActive) {  // ✅ Using effectiveSplitId
    return;
  }
  
  const cleanup = await splitRealtimeService.startListening(
    effectiveSplitId,  // ✅ Using effectiveSplitId
    { /* ... */ }
  );
}, [effectiveSplitId, isRealtimeActive]);  // ✅ Depends on effectiveSplitId
```

### 2. **Updated Real-time Updates Trigger**

#### Before:
```typescript
useEffect(() => {
  if (splitId && !isRealtimeActive) {  // ❌ Using original splitId
    startRealtimeUpdates();
  }
}, [splitId, isRealtimeActive, startRealtimeUpdates]);
```

#### After:
```typescript
useEffect(() => {
  if (effectiveSplitId && !isRealtimeActive) {  // ✅ Using effectiveSplitId
    startRealtimeUpdates();
  }
}, [effectiveSplitId, isRealtimeActive, startRealtimeUpdates]);
```

### 3. **Updated All Logging References**

Updated all logging to use `effectiveSplitId` instead of `splitId`:
- Real-time update callbacks
- Error logging
- Success logging
- Stop real-time updates logging

## Expected Behavior After Fix

### ✅ **For New OCR Bills:**
```
LOG  🔍 SplitDetailsScreen: Effective splitId determined {"effectiveSplitId": undefined, "reason": "New bill - splitId overridden"}
LOG  🔍 Real-time updates not started: {"effectiveSplitId": undefined, "isRealtimeActive": false}
LOG  🔍 SplitDetailsScreen: Creating new split {"splitIdToUse": undefined, "isActuallyNewBill": true}
```

### ✅ **For Existing Splits:**
```
LOG  🔍 SplitDetailsScreen: Effective splitId determined {"effectiveSplitId": "split_123", "reason": "Existing split - using original splitId"}
LOG  🔍 Starting real-time updates for split: split_123
LOG  🔍 Real-time updates started successfully
```

### ❌ **No More Old Split Override:**
```
// This should NOT appear for new OCR bills:
LOG  🔍 Starting real-time updates for split: split_1761322526417_6jn4slu0z
LOG  🔍 Real-time split update received: {"splitId": "split_1761322526417_6jn4slu0z", "splitTitle": "Jjjjj - 2025-10-24"}
```

## Key Improvements

1. **Consistent SplitId Usage**: All real-time update logic now uses `effectiveSplitId`
2. **No Old Split Override**: New bills won't have real-time updates listening to old splits
3. **Proper Dependency Management**: useEffect and useCallback dependencies are correct
4. **Enhanced Logging**: All logging now shows the correct splitId being used

## Files Modified

1. `src/screens/SplitDetails/SplitDetailsScreen.tsx`
   - Updated `startRealtimeUpdates` to use `effectiveSplitId`
   - Updated real-time updates trigger useEffect
   - Updated all logging references
   - Updated dependency arrays

2. `REALTIME_UPDATES_FIX.md` (new)
   - This comprehensive documentation

## Result

The OCR AI flow now works correctly:

- ✅ **Shows correct AI data initially**
- ✅ **No real-time updates for new bills** (prevents old split override)
- ✅ **New split is created with AI data**
- ✅ **New split appears in the list**
- ✅ **No more old split data overriding new split data**

The real-time updates system now respects the `effectiveSplitId` logic, ensuring that new bills don't get overridden by old split data.
