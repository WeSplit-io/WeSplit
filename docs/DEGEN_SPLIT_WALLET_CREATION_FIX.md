# Degen Split Wallet Creation Fix

**Date:** 2025-12-10  
**Status:** ✅ **IMPLEMENTED**  
**Issue:** Wallet creation fails with "Participant name is required" or "Participant walletAddress is required"

---

## Problem

When creating a degen split wallet, the app fails with validation errors:
1. `"Participant 1: Participant name is required"` - even though participant has name
2. `"Participant 1: Participant walletAddress is required"` - participant has empty walletAddress

**Root Cause:**
- Participants passed to `handleCreateSplitWallet` may have empty or missing `walletAddress`
- The mapping doesn't fetch missing wallet addresses from Firebase
- No validation before mapping to catch missing data early

**Evidence from Logs:**
```
LOG  [INFO] [DegenSplitLogic] Mapped participants for wallet creation {"mappedParticipants": [{"amountOwed": 0.116, "name": "Haxxolotto", "userId": "GymQMVM4niW8v1DdEwNSnY5VePq1", "walletAddress": ""}], "mappedParticipantsCount": 1}
LOG  [ERROR] [UnifiedSplitCreationService] Validation failed for split creation {"billId": "bill_1765389385506_a52fyq1l4", "errors": ["Participant 1: Participant walletAddress is required"]}
```

---

## Solution

### 1. ✅ Fetch Missing Wallet Addresses

**File:** `src/screens/DegenSplit/hooks/useDegenSplitLogic.ts`

**Changes:**
- Before mapping participants, check if `walletAddress` is missing or empty
- If missing, fetch from Firebase using `firebaseDataService.user.getCurrentUser()`
- Ensure both `walletAddress` and `wallet_address` are populated
- Throw descriptive error if wallet address cannot be fetched

**Code:**
```typescript
// CRITICAL: Ensure all participants have walletAddress before mapping
const participantsWithWalletAddresses = await Promise.all(
  participants.map(async (p: any) => {
    const walletAddress = p.walletAddress || p.wallet_address || '';
    
    if (!walletAddress || walletAddress.trim() === '') {
      // Try to fetch from Firebase
      try {
        const { firebaseDataService } = await import('../../../services/data');
        const userData = await firebaseDataService.user.getCurrentUser(p.userId || p.id);
        const fetchedWalletAddress = userData?.wallet_address || userData?.walletAddress || '';
        
        if (!fetchedWalletAddress || fetchedWalletAddress.trim() === '') {
          throw new Error(`Participant ${p.name || p.userId || p.id} is missing a wallet address.`);
        }
        
        return {
          ...p,
          walletAddress: fetchedWalletAddress,
          wallet_address: fetchedWalletAddress
        };
      } catch (error) {
        throw new Error(`Failed to get wallet address for participant ${p.name || p.userId || p.id}.`);
      }
    }
    
    return {
      ...p,
      walletAddress: walletAddress,
      wallet_address: walletAddress
    };
  })
);
```

---

### 2. ✅ Enhanced Participant Mapping

**File:** `src/screens/DegenSplit/hooks/useDegenSplitLogic.ts`

**Changes:**
- Map participants with both `walletAddress` and `wallet_address` fields
- Ensure `name` defaults to 'Unknown' if missing
- Ensure `userId` and `id` are both populated

**Code:**
```typescript
const mappedParticipants = mapParticipantsToSplitWallet(participantsWithWalletAddresses.map(p => ({
  userId: p.userId || p.id,
  id: p.userId || p.id,
  name: p.name || 'Unknown',
  walletAddress: p.walletAddress || p.wallet_address || '',
  wallet_address: p.walletAddress || p.wallet_address || '',
  amountOwed: totalAmount,
})));
```

---

### 3. ✅ Pre-Validation Before Wallet Creation

**File:** `src/screens/DegenSplit/hooks/useDegenSplitLogic.ts`

**Changes:**
- Validate mapped participants before calling `UnifiedSplitCreationService`
- Check for `name`, `walletAddress`, and `userId`
- Provide clear error messages indicating which participant and field is missing

**Code:**
```typescript
// CRITICAL: Validate mapped participants before creating wallet
for (let i = 0; i < mappedParticipants.length; i++) {
  const p = mappedParticipants[i];
  if (!p.name || p.name.trim() === '') {
    throw new Error(`Participant ${i + 1}: Participant name is required but was empty`);
  }
  if (!p.walletAddress || p.walletAddress.trim() === '') {
    throw new Error(`Participant ${i + 1}: Participant walletAddress is required but was empty`);
  }
  if (!p.userId || p.userId.trim() === '') {
    throw new Error(`Participant ${i + 1}: Participant userId is required but was empty`);
  }
}
```

---

### 4. ✅ Enhanced Logging

**File:** `src/screens/DegenSplit/hooks/useDegenSplitLogic.ts`

**Changes:**
- Log mapped participants with masked wallet addresses for security
- Include validation status in logs
- Better error messages with participant details

**Code:**
```typescript
logger.info('Mapped participants for wallet creation', {
  mappedParticipantsCount: mappedParticipants.length,
  mappedParticipants: mappedParticipants.map(p => ({
    userId: p.userId,
    name: p.name,
    walletAddress: p.walletAddress ? `${p.walletAddress.substring(0, 10)}...` : 'MISSING',
    amountOwed: p.amountOwed
  }))
}, 'DegenSplitLogic');
```

---

## Impact

### Before
- **Error:** "Participant walletAddress is required" when walletAddress is empty
- **Error:** "Participant name is required" when name is missing
- **Result:** Wallet creation fails, no fallback to fetch missing data

### After
- **Auto-fetch:** Missing wallet addresses are fetched from Firebase
- **Validation:** Pre-validation catches issues before service call
- **Error Messages:** Clear errors indicating which participant and field is missing
- **Result:** ✅ Wallet creation succeeds if data can be fetched, or fails with clear error

---

## Files Modified

1. ✅ `src/screens/DegenSplit/hooks/useDegenSplitLogic.ts`
   - Added wallet address fetching for missing addresses
   - Enhanced participant mapping with both `walletAddress` and `wallet_address`
   - Added pre-validation before wallet creation
   - Enhanced logging with masked addresses

---

## Testing

1. **Test with Missing Wallet Address:**
   - Create degen split with participant that has empty walletAddress
   - Verify wallet address is fetched from Firebase
   - Verify wallet creation succeeds

2. **Test with Missing Name:**
   - Create degen split with participant that has empty name
   - Verify error message is clear
   - Verify wallet creation fails gracefully

3. **Test with Valid Data:**
   - Create degen split with all participant data present
   - Verify wallet creation succeeds
   - Verify no unnecessary Firebase calls

---

## Technical Details

### Participant Data Flow

**Before Fix:**
```
participants (from route)
  → mapParticipantsToSplitWallet()
    → Validation fails if walletAddress is empty ❌
```

**After Fix:**
```
participants (from route)
  → Check walletAddress
    → If missing: Fetch from Firebase ✅
  → participantsWithWalletAddresses
    → mapParticipantsToSplitWallet()
      → Pre-validation ✅
        → UnifiedSplitCreationService.createSplitWallet()
```

### Wallet Address Sources

1. **Primary:** `p.walletAddress` (from participant object)
2. **Secondary:** `p.wallet_address` (alternative field name)
3. **Fallback:** `userData.wallet_address` (from Firebase)
4. **Final Fallback:** `userData.walletAddress` (alternative Firebase field)

---

## Summary

**Fixed:**
- ✅ Missing wallet addresses causing validation failures
- ✅ No fallback to fetch wallet addresses from Firebase
- ✅ Unclear error messages
- ✅ No pre-validation before service call

**Result:**
- ✅ Wallet addresses are automatically fetched if missing
- ✅ Clear error messages if data cannot be fetched
- ✅ Pre-validation catches issues early
- ✅ Better logging for debugging

---

**Status:** ✅ All fixes implemented and ready for testing
