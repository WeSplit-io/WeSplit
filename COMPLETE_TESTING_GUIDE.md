# Complete Wallet Persistence Testing Guide

## Overview

This guide covers testing wallet persistence in **both scenarios**:
1. **App Update** (AsyncStorage cleared, Keychain/MMKV persists)
2. **App Deletion** (ALL data cleared, requires backup recovery)

---

## Test Scenarios

### ✅ Test 1: App Update Scenario

**What it simulates**: User updates app via TestFlight/App Store

**What gets cleared**:
- ✅ AsyncStorage (Firebase Auth state, Zustand store)

**What persists**:
- ✅ Keychain (iOS) - AES key
- ✅ MMKV (Android) - Encrypted wallet data
- ✅ SecureStore - Email, fallback storage

**Expected Result**: Wallet persists ✅

**How to Test**:
1. Tap "Test 1: Simulate App Update" button in Dashboard
2. Close app completely
3. Reopen app
4. Log in with same email
5. Verify: Same wallet address ✅

---

### ⚠️ Test 2: App Deletion Scenario

**What it simulates**: User deletes app and reinstalls

**What gets cleared**:
- ❌ AsyncStorage (all data)
- ❌ Keychain (iOS) - AES key
- ❌ MMKV (Android) - Encrypted wallet data
- ❌ SecureStore - Email, fallback storage

**Expected Result**: Wallet is LOST ❌ (requires backup)

**Recovery Options**:
1. **Cloud Backup** (if available) - Requires password
2. **Seed Phrase** (if saved) - Manual restore
3. **New Wallet** (if no backup) - Creates new address

**How to Test**:
1. **IMPORTANT**: Ensure you have a backup first!
   - Create cloud backup (with password), OR
   - Save seed phrase
2. Tap "Test 2: Simulate App Deletion" button in Dashboard
3. Close app completely
4. Reopen app
5. Log in with same email
6. Try to recover wallet:
   - From cloud backup (enter password)
   - From seed phrase (enter seed phrase)
7. Verify: Same wallet address ✅ (if backup exists)

---

## Testing Both Scenarios

### Quick Test Flow

```
1. Note your wallet address
   ↓
2. Run Test 1 (App Update)
   ↓
3. Verify wallet persists ✅
   ↓
4. Create cloud backup (optional but recommended)
   ↓
5. Run Test 2 (App Deletion)
   ↓
6. Verify wallet recovery works ✅
```

---

## Test Buttons in Dashboard

### Button 1: "Test 1: Simulate App Update"
- **Color**: Orange (#FF9500)
- **Action**: Clears AsyncStorage only
- **Risk**: Low - Wallet persists
- **Use Case**: Test app update scenario

### Button 2: "Test 2: Simulate App Deletion"
- **Color**: Red (#FF3B30)
- **Action**: Clears ALL data (AsyncStorage, Keychain, MMKV, SecureStore)
- **Risk**: ⚠️ **HIGH** - Wallet will be lost without backup
- **Use Case**: Test app deletion scenario
- **Warning**: Only use if you have a backup!

---

## Recovery Methods

### Method 1: Cloud Backup Recovery

**Prerequisites**:
- Cloud backup must exist
- User must know backup password

**Steps**:
1. After Test 2 (app deletion), log in
2. App detects wallet is missing
3. Prompts for cloud backup recovery
4. User enters backup password
5. Wallet restored from Firebase

**Test**:
```typescript
// In test screen or console
const { walletCloudBackupService } = await import('./src/services/security/walletCloudBackupService');
const result = await walletCloudBackupService.restoreFromBackup(userId, backupPassword);
```

---

### Method 2: Seed Phrase Recovery

**Prerequisites**:
- User must have saved seed phrase
- Seed phrase must be correct

**Steps**:
1. After Test 2 (app deletion), log in
2. App detects wallet is missing
3. User navigates to "Restore Wallet"
4. User enters seed phrase
5. Wallet restored from seed phrase

**Test**:
```typescript
// In test screen or console
const { walletRecoveryService } = await import('./src/services/blockchain/wallet/walletRecoveryService');
const result = await walletRecoveryService.restoreWalletFromSeedPhrase(userId, seedPhrase, expectedAddress);
```

---

## Verification Checklist

### After Test 1 (App Update)
- [ ] AsyncStorage cleared
- [ ] Keychain/MMKV intact
- [ ] Wallet address matches ✅
- [ ] Wallet balance correct ✅
- [ ] No errors in logs ✅

### After Test 2 (App Deletion)
- [ ] All data cleared
- [ ] Wallet not recoverable from device
- [ ] Cloud backup recovery works (if backup exists) ✅
- [ ] Seed phrase recovery works (if seed phrase saved) ✅
- [ ] Wallet address matches after recovery ✅

---

## Expected Logs

### Test 1 Success:
```
"Wallet recovered successfully"
"✅ Email-based wallet recovery successful" (if userId changed)
"Wallet ensured for user"
```

### Test 2 Success:
```
"All data cleared successfully"
"Recovering wallet from cloud backup"
"✅ Wallet restored from backup"
```

### Test 2 Failure (No Backup):
```
"No backup found for this user"
"Wallet credentials were never saved to this device"
"Creating new wallet"
```

---

## Maintenance & Consistency

### Regular Testing
- **Before each release**: Run Test 1 (app update)
- **Before major updates**: Run Test 2 (app deletion) with backup
- **After code changes**: Verify both tests still pass

### Monitoring
- Track recovery success rates
- Monitor cloud backup usage
- Alert if recovery fails frequently

---

## Troubleshooting

### Issue: Test 1 fails (wallet lost after update)
- **Check**: Keychain/MMKV permissions
- **Check**: Storage implementation
- **Check**: Logs for errors

### Issue: Test 2 fails (cannot recover from backup)
- **Check**: Cloud backup exists
- **Check**: Backup password is correct
- **Check**: Firebase connection

### Issue: Wallet address different after recovery
- **Check**: Backup contains correct wallet
- **Check**: Seed phrase is correct
- **Check**: Recovery method used

---

## Summary

✅ **Test 1 (App Update)**: Wallet persists automatically
⚠️ **Test 2 (App Deletion)**: Wallet requires backup recovery

**Both tests are now available in Dashboard** - Use them to verify wallet persistence in all scenarios!

