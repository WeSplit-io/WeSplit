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

