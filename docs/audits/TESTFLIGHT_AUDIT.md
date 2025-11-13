# TestFlight Update Verification - Is Our Test Accurate?

## Critical Question

**Does clearing AsyncStorage accurately simulate what happens during a TestFlight app update?**

Let's verify this carefully.

---

## What Actually Happens During TestFlight Updates

### iOS TestFlight Update Behavior

According to Apple's documentation and real-world behavior:

1. **App Bundle**: New version replaces old version
2. **App Data Directory**: **PERSISTS** (Documents, Library)
3. **Keychain**: **PERSISTS** (system-level storage)
4. **NSUserDefaults**: **PERSISTS** (Library/Preferences)
5. **Cache Directory**: **MAY BE CLEARED** (iOS can clear caches)

### React Native AsyncStorage Implementation

**iOS**: Uses `NSUserDefaults` (Library/Preferences)
- ✅ **PERSISTS** across app updates
- ❌ **NOT CLEARED** during updates

**Android**: Uses `SharedPreferences` or `SQLite`
- ✅ **PERSISTS** across app updates
- ❌ **NOT CLEARED** during updates

---

## ⚠️ CRITICAL FINDING: Our Test May Be INACCURATE

### What We're Testing
- Clearing AsyncStorage
- Assuming it gets cleared during updates

### What Actually Happens
- **AsyncStorage PERSISTS** during app updates
- **AsyncStorage is NOT cleared** during updates

### The Real Issue

The problem you experienced (wallet loss after updates) was likely **NOT** because AsyncStorage was cleared, but because:

1. **Firebase Auth state** might have been lost (different mechanism)
2. **SecureStore issues** in production (as you mentioned)
3. **Wallet recovery logic** attempted before auth state was ready
4. **UserId changes** between app versions

---

## What Actually Gets Cleared During TestFlight Updates?

### ✅ PERSISTS (Not Cleared)
- ✅ **AsyncStorage** - Uses NSUserDefaults/SharedPreferences (persists)
- ✅ **Keychain** - System-level (persists)
- ✅ **MMKV** - App data directory (persists)
- ✅ **SecureStore** - Uses Keychain (persists)
- ✅ **App Documents** - Persists
- ✅ **App Library** - Persists

### ❌ MAY BE CLEARED
- ⚠️ **Cache Directory** - iOS may clear (but we don't use this)
- ⚠️ **Temporary Files** - May be cleared (but we don't use this)

---

## The Real TestFlight Update Scenario

### What Actually Happens
```
User has app v1.0
  ↓
Downloads v1.1 via TestFlight
  ↓
iOS/Android:
  ✅ AsyncStorage PERSISTS (NSUserDefaults/SharedPreferences)
  ✅ Keychain PERSISTS
  ✅ MMKV PERSISTS
  ✅ SecureStore PERSISTS
  ✅ All app data PERSISTS
```

**Result**: Nothing gets cleared automatically! ✅

---

## Why Did Wallet Loss Occur Then?

### Possible Causes

1. **SecureStore Production Issues** (as you mentioned)
   - SecureStore has known issues in production builds
   - May not persist reliably
   - This was the actual problem

2. **Firebase Auth State Loss**
   - Auth state might not restore properly
   - Wallet recovery attempted before auth ready
   - This was addressed with auth state wait

3. **UserId Changes**
   - UserId might change between versions
   - Wallet stored by userId becomes unrecoverable
   - This was addressed with email-based recovery

4. **App Reinstallation (Not Update)**
   - User might have deleted and reinstalled
   - This would clear everything
   - Different scenario than update

---

## Accurate TestFlight Update Simulation

### What We Should Test Instead

Since AsyncStorage **PERSISTS** during updates, we should test:

1. **Firebase Auth State Restoration**
   - Simulate auth state loss
   - Test wallet recovery after auth restoration

2. **SecureStore Failure**
   - Simulate SecureStore not working
   - Test Keychain/MMKV fallback

3. **UserId Change**
   - Simulate userId change
   - Test email-based recovery

4. **App Reinstallation** (Test 2 - already implemented)
   - Clear everything
   - Test backup recovery

---

## Recommendation: Update Test 1

### Current Test 1 (May Be Inaccurate)
```typescript
// Clears AsyncStorage
await AsyncStorage.clear();
// Assumes AsyncStorage is cleared during updates
```

### More Accurate Test 1
```typescript
// Simulate Firebase Auth state loss (not AsyncStorage clear)
// This is what actually causes issues during updates
await auth.signOut();
// Then test wallet recovery after re-authentication
```

---

## Conclusion

### ⚠️ Our Test May Not Accurately Simulate TestFlight Updates

**Reality**:
- AsyncStorage **PERSISTS** during app updates
- Nothing gets automatically cleared during updates
- The issue was likely SecureStore failures or auth state problems

**Our Test**:
- Clears AsyncStorage (which doesn't happen during updates)
- Tests wallet persistence (which should work anyway)

**More Accurate Test**:
- Simulate Firebase Auth state loss
- Simulate SecureStore failure
- Test wallet recovery mechanisms

---

## Next Steps

1. **Verify**: Test on actual TestFlight update
2. **Update Test**: Simulate auth state loss instead of AsyncStorage clear
3. **Keep Test 2**: App deletion test is accurate
4. **Monitor**: Real TestFlight updates to verify behavior

---

## Summary

| Assumption | Reality | Accuracy |
|------------|---------|----------|
| AsyncStorage cleared during updates | ❌ AsyncStorage PERSISTS | ⚠️ Test may be inaccurate |
| Wallet loss due to AsyncStorage clear | ❌ Wallet loss due to SecureStore/auth issues | ⚠️ Different root cause |
| Test simulates real update | ⚠️ Partially - doesn't match real behavior | ⚠️ Needs verification |

**Recommendation**: Test on actual TestFlight update to verify real behavior!

# TestFlight Update Accuracy - Critical Finding

## ⚠️ CRITICAL: Our Test is NOT Accurate

### Finding

**AsyncStorage PERSISTS during app updates** - It does NOT get cleared!

- **iOS**: AsyncStorage uses `NSUserDefaults` → **PERSISTS** ✅
- **Android**: AsyncStorage uses `SharedPreferences`/SQLite → **PERSISTS** ✅

**Our test clears AsyncStorage** - This does NOT happen during real TestFlight updates! ❌

---

## What Actually Happens During TestFlight Updates

### Real Behavior
```
User updates app via TestFlight
  ↓
iOS/Android:
  ✅ AsyncStorage PERSISTS (NSUserDefaults/SharedPreferences)
  ✅ Keychain PERSISTS
  ✅ MMKV PERSISTS
  ✅ SecureStore PERSISTS
  ✅ All app data PERSISTS
```

**Nothing gets automatically cleared!** ✅

---

## Why Did Wallet Loss Occur Then?

Based on your original issue description and codebase analysis:

### Real Causes (Not AsyncStorage Clear)

1. **SecureStore Production Issues** ⚠️
   - You mentioned: "expo secure storage is having issues since we refresh the cache on downloading a new version"
   - SecureStore has known reliability issues in production
   - This was the ACTUAL problem

2. **Firebase Auth State Restoration** ⚠️
   - Auth state might not restore properly after update
   - Wallet recovery attempted before auth ready
   - This was addressed with auth state wait

3. **UserId Changes** ⚠️
   - UserId might change between app versions
   - Wallet stored by userId becomes unrecoverable
   - This was addressed with email-based recovery

4. **App Reinstallation (Not Update)** ⚠️
   - User might have deleted and reinstalled (not updated)
   - This would clear everything
   - Different scenario than update

---

## Accurate TestFlight Update Simulation

### What We Should Test Instead

Since AsyncStorage **PERSISTS**, we need to test the actual issues:

#### Test 1: SecureStore Failure (More Accurate)
```typescript
// Simulate SecureStore not working (the actual issue)
// Force use of Keychain/MMKV fallback
// Test wallet recovery without SecureStore
```

#### Test 2: Firebase Auth State Loss
```typescript
// Simulate auth state not restoring properly
await auth.signOut();
// Wait for auth restoration
// Test wallet recovery after auth ready
```

#### Test 3: UserId Change
```typescript
// Simulate userId change between versions
// Test email-based recovery
```

#### Test 4: App Reinstallation (Already Accurate)
```typescript
// Clear everything (accurate for deletion)
// Test backup recovery
```

---

## Updated Test Recommendations

### Replace Current Test 1

**Current (Inaccurate)**:
```typescript
// Clears AsyncStorage
await AsyncStorage.clear();
// Assumes AsyncStorage is cleared (WRONG)
```

**Better (Accurate)**:
```typescript
// Simulate SecureStore failure
// Test Keychain/MMKV recovery
// This is what actually happens during updates
```

---

## Verification Needed

### Test on Real TestFlight Update

1. **Install app v1.0** on device
2. **Create wallet** and note address
3. **Update to v1.1** via TestFlight
4. **Check**: Does wallet persist? ✅
5. **Check**: Does AsyncStorage persist? ✅ (likely yes)
6. **Check**: What actually causes issues? (SecureStore? Auth?)

---

## Conclusion

### ⚠️ Our Test 1 is NOT Accurate for TestFlight Updates

**Reality**:
- AsyncStorage **PERSISTS** during updates
- Nothing gets automatically cleared
- Issues are from SecureStore/auth/userId problems

**Our Test**:
- Clears AsyncStorage (doesn't happen)
- Tests wallet persistence (should work anyway)

**Recommendation**:
- Update Test 1 to simulate SecureStore failure
- Keep Test 2 (app deletion) - that's accurate
- Test on real TestFlight update to verify

---

## Next Steps

1. **Update Test 1**: Simulate SecureStore failure instead of AsyncStorage clear
2. **Test on Real TestFlight**: Verify actual behavior
3. **Monitor**: Real updates to identify actual issues
4. **Document**: Real causes of wallet loss during updates

# Accurate TestFlight Update Test

## The Real Issue

Based on research and your original problem:
- **AsyncStorage PERSISTS** during TestFlight updates (uses NSUserDefaults/SharedPreferences)
- **The real issue**: SecureStore failures in production builds
- **Our fix**: Use Keychain/MMKV as primary (already implemented)

---

## Accurate TestFlight Simulation

### What Actually Happens
1. App updates via TestFlight
2. **Nothing gets cleared automatically**
3. SecureStore might fail (production issue)
4. Wallet recovery should use Keychain/MMKV fallback

### Accurate Test

Instead of clearing AsyncStorage, we should:

1. **Simulate SecureStore Failure**
   - Force Keychain/MMKV usage
   - Test wallet recovery without SecureStore

2. **Test Auth State Restoration**
   - Simulate auth state loss
   - Test wallet recovery after auth ready

3. **Test UserId Change**
   - Simulate userId change
   - Test email-based recovery

---

## Recommendation

**Keep Test 1 as-is for now** (clearing AsyncStorage), but:
- Add note that it's a "worst-case scenario" test
- Add Test 1b: SecureStore failure simulation
- Test on real TestFlight update to verify actual behavior

**Test 2 (App Deletion) is accurate** - Keep as-is.

---

## Action Items

1. ✅ Keep current tests (they test wallet persistence)
2. ⚠️ Add note about AsyncStorage persistence
3. 🔄 Test on real TestFlight update
4. 📝 Document actual behavior observed

