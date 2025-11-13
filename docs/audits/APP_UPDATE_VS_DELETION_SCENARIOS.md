# App Update vs App Deletion - Wallet Persistence Scenarios

## Critical Question: What Actually Happens?

You're right to ask - we need to test **both scenarios**:
1. **App Update** (AsyncStorage cleared, Keychain persists)
2. **App Deletion** (Everything cleared, need cloud backup/seed phrase)

---

## What Happens During App Updates

### iOS App Update (TestFlight/App Store)
- ✅ **Keychain data PERSISTS** - Wallet credentials remain
- ❌ **AsyncStorage is CLEARED** - Firebase Auth state lost
- ✅ **MMKV data PERSISTS** - Encrypted wallet data remains
- ✅ **SecureStore data PERSISTS** (if using Keychain backend)

**Result**: Wallet should persist ✅

### Android App Update
- ✅ **Android Keystore PERSISTS** - Wallet credentials remain
- ❌ **AsyncStorage is CLEARED** - Firebase Auth state lost
- ✅ **MMKV data PERSISTS** - Encrypted wallet data remains
- ⚠️ **SecureStore may be cleared** (depends on implementation)

**Result**: Wallet should persist ✅ (if using Keychain/MMKV)

---

## What Happens During App Deletion

### iOS App Deletion
- ❌ **Keychain data DELETED** - Wallet credentials lost
- ❌ **All app data DELETED**
- ✅ **iCloud Keychain** - May persist if enabled (not guaranteed)

**Result**: Wallet is LOST ❌ (unless cloud backup exists)

### Android App Deletion
- ❌ **Android Keystore DELETED** - Wallet credentials lost
- ❌ **All app data DELETED**
- ❌ **No automatic backup**

**Result**: Wallet is LOST ❌ (unless cloud backup exists)

---

## Current Test Coverage

### ✅ What Our Test Covers (AsyncStorage Clear)
- **Scenario**: App update (AsyncStorage cleared)
- **Simulates**: Real TestFlight/App Store update
- **Expected**: Wallet persists via Keychain/MMKV ✅

### ❌ What Our Test DOESN'T Cover
- **Scenario**: App deletion (everything cleared)
- **Reality**: Wallet would be lost without cloud backup
- **Solution Needed**: Cloud backup or seed phrase recovery

---

## Real-World Scenarios

### Scenario 1: TestFlight Update ✅
```
User has app v1.0
  ↓
Downloads v1.1 via TestFlight
  ↓
AsyncStorage cleared (iOS/Android behavior)
  ↓
Keychain/MMKV persists (our storage)
  ↓
Wallet recovered ✅
```

**Our test simulates this** ✅

### Scenario 2: App Store Update ✅
```
User has app v1.0
  ↓
Updates to v1.1 via App Store
  ↓
AsyncStorage cleared
  ↓
Keychain/MMKV persists
  ↓
Wallet recovered ✅
```

**Our test simulates this** ✅

### Scenario 3: App Deletion ❌
```
User has app v1.0
  ↓
Deletes app from device
  ↓
ALL data deleted (Keychain, AsyncStorage, everything)
  ↓
Reinstalls app
  ↓
Wallet is LOST ❌
  ↓
Need: Cloud backup or seed phrase recovery
```

**Our test DOESN'T cover this** ❌

---

## Testing Both Scenarios

### Test 1: App Update (Current Test) ✅
**What it tests**: AsyncStorage cleared, Keychain persists
**Relevance**: ✅ **YES** - This is what happens during real app updates
**Method**: Clear AsyncStorage button in Dashboard

### Test 2: App Deletion (Need to Add) ⚠️
**What it tests**: Everything cleared, wallet recovery from backup
**Relevance**: ✅ **YES** - Users may delete and reinstall
**Method**: Need to test cloud backup recovery

---

## Verification: Is Our Test Relevant?

### ✅ YES - For App Updates
- AsyncStorage IS cleared during app updates
- Keychain/MMKV DOES persist
- Our test accurately simulates this
- Wallet SHOULD persist ✅

### ⚠️ PARTIAL - For App Deletion
- Everything IS cleared when app is deleted
- Our test doesn't cover this scenario
- Need cloud backup or seed phrase for recovery

---

## Recommendations

### 1. Current Test is Valid ✅
The AsyncStorage clear test **IS relevant** for app updates because:
- ✅ AsyncStorage is actually cleared during updates
- ✅ Keychain/MMKV actually persists
- ✅ This is the real scenario users face

### 2. Add App Deletion Test ⚠️
We should also test:
- Cloud backup recovery
- Seed phrase recovery
- What happens when everything is cleared

### 3. User Education
Users should be informed:
- ✅ Wallet persists across app updates (automatic)
- ⚠️ Wallet is lost if app is deleted (need backup)

---

## Conclusion

**Your current test IS relevant** for app updates ✅

The AsyncStorage clear test accurately simulates what happens during:
- TestFlight updates
- App Store updates
- App version updates

**However**, we should also test:
- App deletion scenario (everything cleared)
- Cloud backup recovery
- Seed phrase recovery

The wallet WILL persist during app updates (our test confirms this).
The wallet WILL be lost during app deletion (unless backup exists).

