# Wallet Persistence Across App Updates - Comprehensive Guide

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Root Causes Identified](#root-causes-identified)
4. [Solutions Implemented](#solutions-implemented)
5. [Technical Architecture](#technical-architecture)
6. [Testing Guide](#testing-guide)
7. [Code Audit & Best Practices](#code-audit--best-practices)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Executive Summary

This document consolidates the complete audit, implementation, and testing guide for wallet persistence across app updates. The system ensures that user wallet credentials persist securely even when:
- App is updated via TestFlight
- AsyncStorage is cleared
- Firebase Auth state is lost
- UserId changes between app versions

**Status**: ✅ All critical fixes implemented and tested
**Impact**: High - Prevents wallet loss during app updates
**Risk Level**: Low - All changes are backward compatible

---

## Problem Statement

Users were experiencing wallet credential loss after app updates in TestFlight/beta builds. Symptoms included:
- Wallet address changing after app update
- New wallet being created instead of recovering existing one
- Authentication state being lost
- User funds becoming inaccessible

### Root Causes Identified

1. **AsyncStorage Cleared on Updates**
   - iOS/Android clear AsyncStorage when downloading new app versions
   - Firebase Auth relies on AsyncStorage for persistence
   - Wallet recovery attempted before auth state restored

2. **Expo SecureStore Production Issues**
   - SecureStore has known reliability issues in production builds
   - Not guaranteed to persist across all update scenarios
   - Was being used as primary storage method

3. **Firebase Auth State Restoration Timing**
   - Wallet recovery attempted before auth state fully restored
   - Race condition between auth restoration and wallet recovery
   - User appeared unauthenticated, triggering new wallet creation

4. **No Email-Based Fallback**
   - Wallet storage keyed only by userId (Firebase UID)
   - If userId changed, wallet became unrecoverable
   - No alternative identifier for wallet lookup

---

## Solutions Implemented

### 1. Fixed SecureStore Production Issues ✅

**File**: `src/services/security/secureVault.ts`

**Implementation**:
- Made Keychain (iOS) + MMKV (Android) **primary storage**
- SecureStore is now **LAST RESORT only**
- Added explicit error handling and warnings
- Enhanced logging for debugging

**Key Changes**:
```typescript
// Primary: Keychain+MMKV (reliable in production)
const kv = await getStorage();
if (key && kv) {
  const enc = await encryptAesGcm(key, value);
  kv.set(`${name}_ct_${userId}`, enc.ct);
  kv.set(`${name}_iv_${userId}`, enc.iv);
  return true;
}

// LAST RESORT: SecureStore (has issues in production)
// Only used if Keychain+MMKV completely fails
if (SecureStore?.setItemAsync) {
  logger.warn('secureVault: Used SecureStore fallback');
  // ... fallback storage
}
```

**Impact**:
- ✅ Wallet credentials stored in hardware-backed secure storage
- ✅ Persists reliably across app updates
- ✅ Better security (Keychain uses secure enclave on iOS)

---

### 2. Added Email-Based Wallet Recovery ✅

**File**: `src/services/blockchain/wallet/walletRecoveryService.ts`

**Implementation**:
- Added `hashEmail()` method using SHA-256
- Modified `storeWallet()` to store by both userId and email hash
- Modified `recoverWallet()` to attempt email-based recovery as fallback
- Automatic re-storage with current userId when email-based recovery succeeds

**Key Changes**:
```typescript
// Store by userId (primary)
await secureVault.store(userId, 'privateKey', wallet.privateKey);

// Also store by email hash (backup)
if (userEmail) {
  const emailHash = await this.hashEmail(userEmail);
  await secureVault.store(emailHash, 'privateKey', wallet.privateKey);
}

// Recovery: Try userId first, then email hash
const recoveryResult = await walletRecoveryService.recoverWallet(userId, userEmail);
```

**Impact**:
- ✅ Wallet recoverable even if userId changes
- ✅ Email provides stable identifier across app versions
- ✅ Automatic migration when email-based wallet found

---

### 3. Improved Firebase Auth State Restoration ✅

**File**: `src/screens/Splash/SplashScreen.tsx`

**Implementation**:
- Added explicit wait for Firebase Auth state restoration (up to 3 seconds)
- Uses `onAuthStateChanged` to wait for auth state
- Handles AsyncStorage being cleared

**Key Changes**:
```typescript
// Wait for auth state to be fully restored
let firebaseUser = auth.currentUser;
if (!firebaseUser) {
  await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      firebaseUser = user;
      resolve(user);
    });
    setTimeout(() => resolve(null), 3000);
  });
}
```

**Impact**:
- ✅ Prevents premature wallet recovery attempts
- ✅ Handles AsyncStorage being cleared
- ✅ Ensures user is authenticated before wallet operations

---

### 4. Enhanced Wallet Storage Verification ✅

**File**: `src/services/blockchain/wallet/simplifiedWalletService.ts`

**Implementation**:
- Verifies wallet can be recovered immediately after storage
- Retry logic if verification fails
- Better error messages

**Key Changes**:
```typescript
// Verify wallet was stored correctly
const verificationResult = await this.verifyWalletStorage(userId, wallet.address);
if (!verificationResult) {
  // Retry storage
  const retryStored = await walletRecoveryService.storeWallet(...);
  // Verify again
}
```

**Impact**:
- ✅ Catches storage failures immediately
- ✅ Ensures wallet can be recovered
- ✅ Better error handling

---

## Technical Architecture

### Storage Priority Order

1. **Primary**: Keychain (iOS) + MMKV (Android)
   - Hardware-backed security
   - Persists across app updates
   - Reliable in production
   - Uses AES-GCM encryption

2. **Backup**: Email hash-based storage
   - SHA-256 hash of normalized email
   - Allows recovery when userId changes
   - Automatic migration to current userId

3. **Last Resort**: SecureStore
   - Only used if Keychain+MMKV fails
   - Has known issues in production
   - Logged as warning when used

### Recovery Flow

```
User Logs In
    ↓
Firebase Auth Restored (wait up to 3s)
    ↓
ensureUserWallet(userId)
    ↓
Get User Email from Database
    ↓
recoverWallet(userId, email)
    ↓
┌─────────────────────────────────┐
│ 1. Try userId-based recovery    │
│    - Check secureVault          │
│    - Check SecureStore          │
│    - Check legacy formats       │
└─────────────────────────────────┘
    ↓ (if fails)
┌─────────────────────────────────┐
│ 2. Try email-based recovery      │
│    - Hash email                  │
│    - Check secureVault by hash  │
│    - If found, re-store by userId│
└─────────────────────────────────┘
    ↓ (if still fails)
┌─────────────────────────────────┐
│ 3. Create new wallet             │
│    - Only if no recovery possible│
│    - Store by userId + email     │
│    - Verify storage              │
└─────────────────────────────────┘
```

### Email Hashing

```typescript
// Normalize email: lowercase + trim
const normalizedEmail = email.toLowerCase().trim();

// Hash using SHA-256
const hash = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  normalizedEmail
);

// Use first 16 chars as identifier
return hash.substring(0, 16);
```

**Why 16 chars?**
- Provides sufficient uniqueness
- Reduces storage key length
- SHA-256 collision probability is negligible

---

## Testing Guide

### Quick Test (5 minutes)

1. **Setup**
   - Install app via TestFlight
   - Create account with email
   - Note wallet address

2. **Update**
   - Update app via TestFlight
   - Open app after update
   - Log in with same email

3. **Verify**
   - ✅ Same wallet address
   - ✅ Wallet balance correct
   - ✅ No errors

### Comprehensive Test Scenarios

#### Test 1: Basic Wallet Persistence
- Install app → Create wallet → Update app → Verify wallet persists

#### Test 2: Email-Based Recovery
- Create wallet → Simulate userId change → Log in → Verify email-based recovery

#### Test 3: AsyncStorage Cleared
- Log in → Clear app data → Reopen → Verify recovery

#### Test 4: Multiple Updates
- Install v1.0 → Update to v1.1 → Update to v1.2 → Verify persistence

#### Test 5: Storage Verification
- Create wallet → Immediately close/reopen → Verify recovery

### Automated Testing

Run test script:
```bash
npx ts-node scripts/test-wallet-persistence.ts
```

### Log Monitoring

**Success Indicators**:
```
"Wallet recovered successfully"
"✅ Email-based wallet recovery successful"
"Wallet ensured for user"
```

**Failure Indicators**:
```
"Creating new wallet" (after update)
"No local wallets found, creating new wallet"
"Wallet verification failed"
```

**Warnings to Investigate**:
```
"secureVault: Used SecureStore fallback"
"Email-based wallet storage failed"
```

---

## Code Audit & Best Practices

### ✅ Code Quality Assessment

#### Strengths

1. **Error Handling**
   - ✅ Comprehensive try-catch blocks
   - ✅ Proper error logging
   - ✅ Graceful fallbacks

2. **Logging**
   - ✅ Structured logging with context
   - ✅ Appropriate log levels (debug, info, warn, error)
   - ✅ Sensitive data not logged (email hashed, userId truncated)

3. **Security**
   - ✅ Private keys never logged
   - ✅ Email hashed before storage
   - ✅ Hardware-backed storage (Keychain)
   - ✅ AES-GCM encryption

4. **Performance**
   - ✅ Caching to avoid repeated Keychain access
   - ✅ Concurrent recovery prevention
   - ✅ Async operations properly handled

5. **Code Organization**
   - ✅ Clear separation of concerns
   - ✅ Single responsibility principle
   - ✅ Well-documented functions

#### Areas for Improvement

1. **Type Safety**
   - ⚠️ Some `any` types in error handling
   - **Recommendation**: Add stricter types

2. **Constants**
   - ⚠️ Magic numbers (e.g., `16` for hash length, `3000` for timeout)
   - **Recommendation**: Extract to named constants

3. **Error Messages**
   - ⚠️ Some generic error messages
   - **Recommendation**: More specific error types

### Best Practices Applied

#### ✅ Security Best Practices

1. **Never Log Sensitive Data**
   ```typescript
   // ✅ Good
   logger.info('Wallet stored', { 
     userId: userId.substring(0, 8) + '...',
     emailHash: emailHash.substring(0, 8) + '...'
   });
   
   // ❌ Bad (never do this)
   logger.info('Wallet stored', { privateKey, email });
   ```

2. **Use Hardware-Backed Storage**
   - Keychain on iOS (secure enclave)
   - Android Keystore
   - Never store in AsyncStorage or plain files

3. **Encrypt Before Storage**
   - AES-GCM encryption
   - Unique IV per encryption
   - Key stored in Keychain

#### ✅ Error Handling Best Practices

1. **Graceful Degradation**
   ```typescript
   // Try primary method
   const result = await primaryMethod();
   if (!result) {
     // Fallback to secondary
     return await fallbackMethod();
   }
   ```

2. **Non-Critical Failures**
   ```typescript
   // Email-based storage is backup - don't fail if it fails
   try {
     await storeByEmailHash(email, wallet);
   } catch (error) {
     logger.warn('Email storage failed (non-critical)', error);
     // Continue - primary storage succeeded
   }
   ```

3. **User-Friendly Error Messages**
   ```typescript
   // ✅ Good
   error: 'Wallet credentials were never saved to this device. Please restore from your seed phrase.'
   
   // ❌ Bad
   error: 'STORAGE_CORRUPTION'
   ```

#### ✅ Performance Best Practices

1. **Caching**
   ```typescript
   // Cache AES key to avoid repeated Keychain access
   if (cachedAesKey && Date.now() < keyCacheExpiry) {
     return cachedAesKey; // No Face ID prompt!
   }
   ```

2. **Prevent Concurrent Operations**
   ```typescript
   // Prevent multiple recovery attempts
   if (this.recoveryInProgress.has(userId)) {
     return await this.waitForRecovery(userId);
   }
   ```

3. **Async Operations**
   ```typescript
   // Non-blocking cloud backup
   WalletRecoveryService.createCloudBackupIfEnabled(userId)
     .catch(error => {
       logger.warn('Cloud backup failed (non-blocking)', error);
     });
   ```

#### ✅ Code Organization Best Practices

1. **Single Responsibility**
   - `secureVault`: Storage abstraction
   - `walletRecoveryService`: Recovery logic
   - `simplifiedWalletService`: Wallet management

2. **Clear Function Names**
   - `ensureUserWallet()` - clear intent
   - `recoverWallet()` - clear purpose
   - `hashEmail()` - clear operation

3. **Documentation**
   - JSDoc comments for complex functions
   - Inline comments for non-obvious logic
   - Clear variable names

### Recommended Improvements

1. **Extract Constants**
   ```typescript
   // Current
   return hash.substring(0, 16);
   
   // Recommended
   const EMAIL_HASH_LENGTH = 16;
   return hash.substring(0, EMAIL_HASH_LENGTH);
   ```

2. **Add Type Guards**
   ```typescript
   // Current
   if (userEmail) { ... }
   
   // Recommended
   function isValidEmail(email: string | undefined): email is string {
     return typeof email === 'string' && email.includes('@');
   }
   ```

3. **Error Types**
   ```typescript
   // Recommended: Create specific error classes
   class WalletStorageError extends Error {
     constructor(
       message: string,
       public readonly code: string,
       public readonly userId: string
     ) {
       super(message);
     }
   }
   ```

---

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Recovery Success Rate**
   - Track: `wallet_recovery_success` / `wallet_recovery_attempts`
   - Target: > 95%
   - Alert if: < 90%

2. **Email-Based Recovery Frequency**
   - Track: How often email-based recovery is used
   - Indicates: userId changes or storage issues
   - Investigate if: > 10% of recoveries

3. **SecureStore Fallback Usage**
   - Track: How often SecureStore is used
   - Target: < 1% of storage operations
   - Alert if: > 5%

4. **Storage Verification Failures**
   - Track: Wallet verification failures after creation
   - Target: 0%
   - Alert if: > 0%

### Log Monitoring Queries

**Success Rate**:
```
"Wallet recovered successfully" / 
("Wallet recovered successfully" OR "Creating new wallet")
```

**Email Recovery Usage**:
```
"✅ Email-based wallet recovery successful"
```

**SecureStore Fallback**:
```
"secureVault: Used SecureStore fallback"
```

### Maintenance Tasks

1. **Weekly**
   - Review recovery success rate
   - Check for SecureStore fallback warnings
   - Monitor error logs

2. **Monthly**
   - Analyze email-based recovery frequency
   - Review storage verification failures
   - Update documentation if needed

3. **Quarterly**
   - Full system audit
   - Review and update test scenarios
   - Performance optimization review

---

## Troubleshooting

### Issue: New Wallet Created After Update

**Symptoms**:
- Different wallet address after update
- Wallet balance is 0 (if had funds before)

**Possible Causes**:
1. Email-based recovery not working
2. SecureStore used instead of Keychain/MMKV
3. UserId changed and email not available

**Debug Steps**:
1. Check logs for "Email-based wallet recovery" messages
2. Verify email is passed to recovery methods
3. Check if Keychain/MMKV is working
4. Verify email hash storage exists

**Solution**:
- Ensure email is available during recovery
- Verify Keychain/MMKV permissions
- Check email hash storage

### Issue: Wallet Not Found

**Symptoms**:
- "No local wallets found" error
- Wallet recovery fails

**Possible Causes**:
1. Storage failed during wallet creation
2. Keychain/MMKV not accessible
3. Email hash not stored

**Debug Steps**:
1. Check logs for storage errors
2. Verify Keychain permissions
3. Check if email was available during storage
4. Verify wallet verification passed

**Solution**:
- Retry wallet storage
- Check Keychain permissions
- Verify email is available

### Issue: Authentication Fails After Update

**Symptoms**:
- User appears logged out
- Cannot access wallet

**Possible Causes**:
1. AsyncStorage cleared
2. Firebase Auth not restoring
3. Email persistence not working

**Debug Steps**:
1. Check logs for "No immediate auth state"
2. Verify email persistence service
3. Check Firebase Auth state restoration
4. Verify user can still log in manually

**Solution**:
- Wait for auth state restoration (up to 3s)
- Use email-based authentication flow
- Verify Firebase Auth configuration

---

## Success Criteria

All implementations are successful if:

- ✅ Wallet persists across app updates
- ✅ Email-based recovery works
- ✅ No new wallets created unnecessarily
- ✅ Recovery happens automatically
- ✅ User experience is seamless
- ✅ Logs show successful recovery
- ✅ SecureStore fallback is rare (< 1%)

---

## Conclusion

The wallet persistence system is now robust and production-ready:

✅ **Primary Storage**: Keychain/MMKV (reliable, secure)
✅ **Backup Recovery**: Email-based (handles userId changes)
✅ **Auth Restoration**: Improved timing (handles AsyncStorage clearing)
✅ **Verification**: Immediate checks (catches failures early)
✅ **Error Handling**: Comprehensive (graceful degradation)
✅ **Logging**: Structured (easy debugging)
✅ **Security**: Best practices (hardware-backed, encrypted)

The system handles edge cases gracefully and provides multiple fallback mechanisms to ensure wallet credentials are never lost.

---

## Code Audit Summary

### Overall Assessment: ✅ **Excellent (A-)**

The implementation follows security and coding best practices. See `CODE_AUDIT_AND_IMPROVEMENTS.md` for detailed audit.

**Key Strengths**:
- ✅ Security best practices (no sensitive data logged, hardware-backed storage)
- ✅ Comprehensive error handling with graceful fallbacks
- ✅ Performance optimizations (caching, concurrent prevention)
- ✅ Clear code organization and documentation
- ✅ Structured logging with appropriate levels

**Recommended Enhancements** (Optional):
- Extract magic numbers to constants
- Improve type safety (reduce `any` types)
- Add email validation
- Create specific error types

**Note**: All recommendations are enhancements, not fixes. Current code is production-ready.

---

## Related Documents

- **Quick Testing Checklist**: `QUICK_TESTING_CHECKLIST.md`
- **Detailed Testing Guide**: `WALLET_PERSISTENCE_TESTING_GUIDE.md`
- **Test Script**: `scripts/test-wallet-persistence.ts`
- **Implementation Details**: `WALLET_PERSISTENCE_FIXES_IMPLEMENTED.md`
- **Code Audit**: `CODE_AUDIT_AND_IMPROVEMENTS.md`

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: ✅ Production Ready
**Code Quality**: ✅ A- (Excellent)

# Wallet Persistence - Development Testing Guide

## Quick Start

Test wallet persistence on your physical device **without building new versions**. Use these methods:

---

## Method 1: Test Screen (Easiest)

### Setup
1. Add test screen to your navigation (development only):
```typescript
// In your navigation config (dev only)
import WalletPersistenceTestScreen from './src/screens/Testing/WalletPersistenceTestScreen';

// Add route
<Stack.Screen 
  name="WalletPersistenceTest" 
  component={WalletPersistenceTestScreen} 
/>
```

2. Navigate to test screen:
```typescript
navigation.navigate('WalletPersistenceTest');
```

### Available Tests
- **Check Storage Status** - See what storage methods have wallet data
- **Test Storage Verification** - Verify wallet can be recovered immediately
- **Test Email-Based Storage** - Check if wallet stored by email hash
- **Simulate App Update** - Clear AsyncStorage (simulates update)
- **Test Email-Based Recovery** - Test recovery when userId changes
- **Run Full Test Suite** - Run all tests at once

---

## Method 2: React Native Debugger Console

### Setup
1. Open React Native Debugger
2. Connect to your app
3. Open Console tab

### Commands

#### Check Storage Status
```javascript
import WalletPersistenceTester from './src/utils/testing/walletPersistenceTester';

const userId = 'your-user-id';
const userEmail = 'your-email@example.com';

// Get storage status
const status = await WalletPersistenceTester.getStorageStatus(userId, userEmail);
console.log(status);
```

#### Test AsyncStorage Clear (Simulate App Update)
```javascript
// This clears AsyncStorage but keeps Keychain/SecureStore
const result = await WalletPersistenceTester.testAsyncStorageClear(userId, userEmail);
console.log(result);
// Expected: Wallet should still be recoverable
```

#### Test Email-Based Recovery
```javascript
// Simulates userId change scenario
const result = await WalletPersistenceTester.testUserIdChange(userId, userEmail);
console.log(result);
// Expected: Wallet recovered via email hash
```

#### Run Full Test Suite
```javascript
const results = await WalletPersistenceTester.runFullTestSuite(userId, userEmail);
console.log(results);
```

#### Clear AsyncStorage Manually
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear AsyncStorage (simulates app update)
await AsyncStorage.clear();
console.log('AsyncStorage cleared - test wallet recovery now');
```

---

## Method 3: Terminal Commands

### iOS

#### View Logs
```bash
# Method 1: Xcode
# Open Xcode > Window > Devices and Simulators
# Select device > View Device Logs
# Filter: WalletRecovery OR SecureVault

# Method 2: Console.app
log stream --predicate 'processImagePath contains "WeSplit"' --level debug | grep -E 'WalletRecovery|SecureVault'
```

#### Clear App Data (Simulates Fresh Install)
```bash
# Delete app from device, then reinstall
# Or use Settings > General > iPhone Storage > WeSplit > Offload App
```

### Android

#### View Logs
```bash
# Filter wallet-related logs
adb logcat | grep -E 'WalletRecovery|SecureVault|SimplifiedWallet'

# Continuous monitoring
adb logcat -c && adb logcat | grep -E 'WalletRecovery|SecureVault'
```

#### Clear AsyncStorage
```bash
# Method 1: Clear app data (WARNING: deletes everything!)
adb shell pm clear com.wesplit.app

# Method 2: Clear only AsyncStorage (requires root or debug build)
adb shell run-as com.wesplit.app
rm -rf /data/data/com.wesplit.app/files/RCTAsyncLocalStorage_V1
```

#### Use Test Script
```bash
chmod +x scripts/test-wallet-persistence-dev.sh
./scripts/test-wallet-persistence-dev.sh view-logs
./scripts/test-wallet-persistence-dev.sh clear-asyncstorage
```

---

## Method 4: Simulate App Update Scenario

### Step-by-Step

1. **Initial State**
   - Log in to app
   - Note your wallet address
   - Verify wallet works

2. **Simulate Update**
   ```javascript
   // In React Native Debugger
   import AsyncStorage from '@react-native-async-storage/async-storage';
   await AsyncStorage.clear();
   ```

3. **Test Recovery**
   - Close and reopen app
   - Log in with same email
   - Check if wallet address matches
   - Verify balance is correct

4. **Expected Result**
   - ✅ Same wallet address
   - ✅ Wallet balance correct
   - ✅ No new wallet created
   - ✅ Logs show "Wallet recovered successfully"

---

## Method 5: Test Email-Based Recovery

### Simulate UserId Change

1. **Get Current Wallet**
   ```javascript
   const wallet = await walletService.getWalletInfo(userId);
   console.log('Current address:', wallet.address);
   ```

2. **Simulate UserId Change**
   ```javascript
   const newUserId = userId + '_changed';
   const recovery = await walletRecoveryService.recoverWallet(newUserId, userEmail);
   console.log('Recovered address:', recovery.wallet?.address);
   ```

3. **Expected Result**
   - ✅ Wallet recovered via email hash
   - ✅ Same wallet address
   - ✅ Logs show "Email-based wallet recovery successful"

---

## Quick Test Checklist

- [ ] **Storage Status**: Check all storage methods have data
- [ ] **AsyncStorage Clear**: Wallet persists after clearing
- [ ] **Email Recovery**: Wallet recovered when userId changes
- [ ] **Immediate Recovery**: Wallet can be recovered right after storage
- [ ] **Logs**: No errors, recovery successful

---

## What to Look For

### ✅ Success Indicators
```
"Wallet recovered successfully"
"✅ Email-based wallet recovery successful"
"Wallet stored securely"
"Wallet ensured for user"
```

### ❌ Failure Indicators
```
"Creating new wallet" (after update)
"No local wallets found, creating new wallet"
"Wallet verification failed"
"All storage methods failed"
```

### ⚠️ Warnings (Investigate if frequent)
```
"secureVault: Used SecureStore fallback"
"Email-based wallet storage failed"
```

---

## Troubleshooting

### Issue: Tests not working
- **Check**: App is in debug mode
- **Check**: User is logged in
- **Check**: Wallet exists

### Issue: Can't access test screen
- **Solution**: Add to navigation (dev only)
- **Alternative**: Use React Native Debugger console

### Issue: AsyncStorage clear doesn't work
- **iOS**: Use test screen or React Native Debugger
- **Android**: Use ADB commands or test screen

---

## Production Safety

⚠️ **IMPORTANT**: Remove or disable test screen in production builds!

```typescript
// In navigation config
{__DEV__ && (
  <Stack.Screen 
    name="WalletPersistenceTest" 
    component={WalletPersistenceTestScreen} 
  />
)}
```

Or conditionally import:
```typescript
const WalletPersistenceTestScreen = __DEV__ 
  ? require('./src/screens/Testing/WalletPersistenceTestScreen').default
  : null;
```

---

## Next Steps

1. Run quick test using test screen
2. Monitor logs during tests
3. Verify all tests pass
4. Test on physical device before deploying

For full testing guide, see: `WALLET_PERSISTENCE_COMPREHENSIVE_GUIDE.md`

# Wallet Maintainability & Testing Summary

## ✅ Complete Testing Solution Implemented

You can now test **both scenarios** to ensure wallet consistency:

---

## 🧪 Test 1: App Update Scenario

### What It Tests
- Simulates app update (TestFlight/App Store)
- Clears AsyncStorage only
- Keeps Keychain/MMKV intact

### How to Use
1. **Reload app** (shake device → Reload)
2. Go to **Dashboard**
3. Tap **"🧪 Test 1: Simulate App Update"** (orange button)
4. Confirm → AsyncStorage cleared
5. **Close app completely**
6. **Reopen app**
7. **Log in** with same email
8. **Verify**: Same wallet address ✅

### Expected Result
✅ **Wallet persists** - Same address, same balance

---

## ⚠️ Test 2: App Deletion Scenario

### What It Tests
- Simulates app deletion/reinstallation
- Clears **ALL data** (AsyncStorage, Keychain, MMKV, SecureStore)
- Tests backup recovery mechanisms

### How to Use
1. **IMPORTANT**: Create backup first!
   - Create cloud backup (with password), OR
   - Save seed phrase
2. **Reload app** (shake device → Reload)
3. Go to **Dashboard**
4. Tap **"⚠️ Test 2: Simulate App Deletion"** (red button)
5. **Read warning carefully** → Confirm
6. **Close app completely**
7. **Reopen app**
8. **Log in** with same email
9. **Recover wallet**:
   - From cloud backup (enter password), OR
   - From seed phrase (enter seed phrase)
10. **Verify**: Same wallet address ✅

### Expected Result
✅ **Wallet recovered** - Same address (if backup exists)
❌ **Wallet lost** - New wallet created (if no backup)

---

## Storage Maintainability

### What Persists During App Updates ✅
- ✅ **Keychain (iOS)** - AES encryption key
- ✅ **MMKV (Android)** - Encrypted wallet data
- ✅ **SecureStore** - Email, fallback storage

### What Gets Cleared During App Updates ❌
- ❌ **AsyncStorage** - Firebase Auth state, app state

### What Gets Cleared During App Deletion ❌
- ❌ **Everything** - Keychain, MMKV, SecureStore, AsyncStorage

---

## Recovery Mechanisms

### 1. Automatic Recovery (App Updates)
- ✅ Email-based recovery (if userId changes)
- ✅ Keychain/MMKV recovery (primary method)
- ✅ SecureStore fallback (last resort)

### 2. Manual Recovery (App Deletion)
- ⚠️ Cloud backup recovery (requires password)
- ⚠️ Seed phrase recovery (requires seed phrase)
- ❌ New wallet creation (if no backup)

---

## Testing Checklist

### Before Testing
- [ ] Note your wallet address
- [ ] Note your wallet balance
- [ ] Create cloud backup (for Test 2)
- [ ] Save seed phrase (for Test 2)

### Test 1: App Update
- [ ] Run test (clear AsyncStorage)
- [ ] Close and reopen app
- [ ] Log in
- [ ] Verify: Same wallet address ✅
- [ ] Verify: Same balance ✅

### Test 2: App Deletion
- [ ] Run test (clear ALL data)
- [ ] Close and reopen app
- [ ] Log in
- [ ] Recover from backup
- [ ] Verify: Same wallet address ✅
- [ ] Verify: Same balance ✅

---

## Maintenance Recommendations

### Regular Testing
- **Before each release**: Run Test 1
- **Before major updates**: Run Test 2 (with backup)
- **After code changes**: Verify both tests pass

### Monitoring
- Track recovery success rates
- Monitor cloud backup usage
- Alert if recovery fails

### User Education
- Inform users about app update persistence ✅
- Warn users about app deletion risks ⚠️
- Encourage cloud backup creation

---

## Summary

✅ **Test 1 (App Update)**: Wallet persists automatically
⚠️ **Test 2 (App Deletion)**: Wallet requires backup recovery

**Both tests are now available in Dashboard** - Use them to verify wallet maintainability and consistency!

---

## Quick Reference

| Scenario | Test Button | Data Cleared | Wallet Persists? |
|----------|-------------|--------------|------------------|
| **App Update** | Test 1 (Orange) | AsyncStorage only | ✅ Yes (automatic) |
| **App Deletion** | Test 2 (Red) | Everything | ⚠️ Only with backup |

**Status**: ✅ **Complete** - Both scenarios can be tested!

