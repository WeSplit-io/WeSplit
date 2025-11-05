# 🔄 Wallet Persistence Across App Updates & Reinstalls

## Executive Summary

**Current Status:** ⚠️ **PARTIALLY WORKING** - Wallets persist across app updates but may NOT persist across app reinstalls.

**Key Findings:**
- ✅ **App Updates**: Wallets should persist (uses Keychain/SecureStore)
- ⚠️ **App Reinstalls**: Automatic recovery exists but relies on platform keychain persistence (not guaranteed)
- ✅ **Manual Recovery**: Users can restore from seed phrase (functionality exists)
- ❌ **Cloud Backup**: No encrypted cloud backup of wallet data

---

## 📊 Current Persistence Mechanisms

### 1. **Storage Technologies Used**

#### Primary Storage: `secureVault`
- **Location:** `src/services/security/secureVault.ts`
- **Storage:** 
  - Keychain (iOS/Android) - for encryption key
  - MMKV - for encrypted wallet data
- **Persistence:**
  - ✅ **Keychain**: Persists across app updates (iOS/Android)
  - ⚠️ **Keychain**: May persist across reinstalls if iCloud Keychain enabled (iOS only)
  - ❌ **MMKV**: Does NOT persist on reinstall (app-specific storage)

#### Fallback Storage: `SecureStore`
- **Location:** `expo-secure-store`
- **Storage:** Platform native keychain
- **Persistence:**
  - ✅ **App Updates**: Persists
  - ⚠️ **App Reinstalls**: May persist on iOS with iCloud Keychain, NOT guaranteed on Android

---

## 🔍 App Update Scenario

### ✅ **WILL PERSIST** (Expected Behavior)

**What Happens:**
1. Wallet data stored in Keychain/SecureStore
2. App updates do NOT clear Keychain data
3. Wallet remains accessible after update

**Code Evidence:**
```typescript
// secureVault.ts - Uses Keychain for encryption key
const key = await getOrCreateAesKey();
// Keychain persists across app updates

// MMKV storage (encrypted data)
kv.set(`${name}_ct_${userId}`, enc.ct);
// MMKV persists across app updates
```

**Status:** ✅ **WORKING** - No changes needed

---

## 🔍 App Reinstall Scenario

### ⚠️ **MAY NOT PERSIST** (Platform Dependent)

**What Happens:**

#### iOS (with iCloud Keychain enabled):
1. ✅ Keychain data may persist if iCloud Keychain is enabled
2. ✅ Wallet can be automatically recovered
3. ⚠️ If iCloud Keychain is disabled, data is lost

#### iOS (without iCloud Keychain):
1. ❌ Keychain data is cleared on uninstall
2. ❌ Wallet data is lost
3. ✅ User can restore from seed phrase

#### Android:
1. ❌ Keychain data is typically cleared on uninstall
2. ❌ Wallet data is lost
3. ✅ User can restore from seed phrase

**Current Recovery Flow:**
```typescript
// AuthService.ts - Attempts automatic recovery
if (consistentUser.wallet_address) {
  // User exists in database but no wallet on device (app reinstalled)
  const walletResult = await walletService.recoverWalletFromAddress(
    consistentUser.id, 
    consistentUser.wallet_address
  );
  // ⚠️ This will likely FAIL if keychain data is cleared
}
```

**Status:** ⚠️ **PARTIALLY WORKING** - Depends on platform keychain persistence

---

## 🛠️ Current Recovery Mechanisms

### 1. **Automatic Recovery on Login**

**Location:** `src/services/auth/AuthService.ts:539-555`

**How It Works:**
1. User logs in after reinstall
2. App checks if wallet exists on device
3. If not found, tries to recover from database wallet address
4. Recovery searches local storage (which may be empty after reinstall)

**Limitations:**
- ❌ Relies on local storage existing (which is cleared on reinstall)
- ❌ Only works if platform keychain persisted
- ✅ Falls back to manual seed phrase restore

```typescript
// Current automatic recovery
const walletResult = await walletService.recoverWalletFromAddress(
  userId, 
  expectedAddress
);
// ⚠️ Will fail if no local storage exists
```

### 2. **Manual Seed Phrase Restore**

**Location:** `src/services/blockchain/wallet/walletRecoveryService.ts:1440-1522`

**How It Works:**
1. User enters their 12-word seed phrase
2. App validates seed phrase
3. Derives wallet from seed phrase
4. Stores wallet locally

**Status:** ✅ **WORKING** - Users can always restore if they have seed phrase

```typescript
// Manual restore from seed phrase
static async restoreWalletFromSeedPhrase(
  userId: string, 
  seedPhrase: string, 
  expectedAddress?: string
): Promise<WalletRecoveryResult> {
  // Validates and restores wallet
}
```

### 3. **Wallet Export Functionality**

**Location:** `src/services/blockchain/wallet/walletExportService.ts`

**How It Works:**
1. Users can view their seed phrase in settings
2. Users can copy their private key
3. Users can export wallet credentials

**Status:** ✅ **WORKING** - Users can export before reinstall

---

## 🚨 Critical Issues

### 1. **No Guaranteed Persistence on Reinstall**

**Problem:**
- Wallet data may be lost on app reinstall
- Recovery relies on platform keychain (not guaranteed)
- Users must manually restore from seed phrase

**Impact:**
- Users may lose access to wallet if they don't have seed phrase saved
- Poor user experience (requires manual restore)
- Potential for data loss

### 2. **No Cloud Backup of Wallet Data**

**Problem:**
- No encrypted cloud backup of wallet credentials
- Users must manually save seed phrase
- No automatic recovery option

**Impact:**
- Users lose wallet if device is lost/stolen and they don't have seed phrase
- No disaster recovery mechanism
- Higher risk of permanent wallet loss

### 3. **Recovery Attempts May Fail Silently**

**Problem:**
- Automatic recovery tries to find wallet in local storage
- If storage is cleared, recovery fails
- User may not be notified clearly

**Impact:**
- Confusing user experience
- Users may not know they need to restore manually

---

## ✅ What Works Well

### 1. **App Updates**
- ✅ Wallet persists across updates
- ✅ No user action required
- ✅ Seamless experience

### 2. **Manual Recovery**
- ✅ Users can restore from seed phrase
- ✅ Multiple derivation paths supported
- ✅ Validation ensures correct wallet

### 3. **Export Functionality**
- ✅ Users can view/copy seed phrase
- ✅ Users can export private key
- ✅ Clear instructions provided

---

## 🔧 Recommended Solutions

### 1. **Improve Recovery Flow (Short-term)**

**Add Clear User Messaging:**
```typescript
// When automatic recovery fails, show clear message
if (!walletResult.success) {
  // Show modal: "Wallet not found. Please restore from seed phrase."
  showWalletRestoreModal(userId, expectedAddress);
}
```

**Benefits:**
- Users know they need to restore
- Clear next steps
- Better user experience

### 2. **Add Encrypted Cloud Backup (Medium-term)**

**Implementation:**
```typescript
// Encrypt wallet data with user's password
const encryptedWallet = await encryptWithUserPassword(
  walletData, 
  userPassword
);

// Store encrypted backup in Firebase
await firebaseDataService.storeEncryptedBackup(
  userId,
  encryptedWallet
);
```

**Benefits:**
- Automatic recovery option
- Disaster recovery
- Better user experience

**Security Considerations:**
- ✅ Encrypt with user's password (not stored)
- ✅ Use strong encryption (AES-256)
- ✅ Never store unencrypted data
- ✅ Require password for restore

### 3. **Improve Keychain Persistence (Platform-specific)**

**iOS:**
- ✅ Enable iCloud Keychain sync
- ✅ Use Keychain accessibility: `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`
- ✅ Ensure Keychain sharing is configured

**Android:**
- ⚠️ Android KeyStore is device-specific
- ⚠️ Consider using Android Backup Service
- ⚠️ Or rely on cloud backup solution

### 4. **Add Backup/Restore UI Flow**

**Implementation:**
```typescript
// Backup flow
async function backupWallet(userId: string, password: string) {
  const walletData = await exportWallet(userId);
  const encrypted = await encryptWithPassword(walletData, password);
  await storeBackup(userId, encrypted);
}

// Restore flow
async function restoreWallet(userId: string, password: string) {
  const encrypted = await getBackup(userId);
  const walletData = await decryptWithPassword(encrypted, password);
  await restoreWalletFromData(userId, walletData);
}
```

**Benefits:**
- Users can backup before reinstall
- Automatic restore option
- Better disaster recovery

---

## 📋 Testing Checklist

### App Update Testing
- [ ] Update app with wallet data
- [ ] Verify wallet persists after update
- [ ] Verify wallet address matches
- [ ] Verify transactions are accessible
- [ ] Test on iOS and Android

### App Reinstall Testing
- [ ] Uninstall and reinstall app
- [ ] Test automatic recovery (if keychain persists)
- [ ] Test manual seed phrase restore
- [ ] Verify wallet address matches
- [ ] Test on iOS with iCloud Keychain enabled
- [ ] Test on iOS with iCloud Keychain disabled
- [ ] Test on Android

### Recovery Testing
- [ ] Test automatic recovery on login
- [ ] Test manual seed phrase restore
- [ ] Test with different derivation paths
- [ ] Test error handling
- [ ] Test user messaging

---

## 🎯 Immediate Actions

### High Priority
1. **Add Clear Recovery Messaging**
   - When automatic recovery fails, show clear instructions
   - Guide users to seed phrase restore
   - Provide helpful error messages

2. **Test Keychain Persistence**
   - Test on iOS with/without iCloud Keychain
   - Test on Android
   - Document expected behavior

3. **Improve User Education**
   - Prompt users to save seed phrase
   - Show backup instructions
   - Warn about reinstall risks

### Medium Priority
4. **Add Encrypted Cloud Backup**
   - Implement password-encrypted backup
   - Store in Firebase (encrypted)
   - Add restore UI flow

5. **Add Backup/Restore UI**
   - Create backup screen
   - Create restore screen
   - Add to settings menu

### Low Priority
6. **Optimize Keychain Usage**
   - Ensure proper Keychain configuration
   - Test across iOS versions
   - Document platform differences

---

## 📝 Code Examples

### Current Automatic Recovery
```typescript
// AuthService.ts - Current implementation
if (consistentUser.wallet_address) {
  const walletResult = await walletService.recoverWalletFromAddress(
    consistentUser.id, 
    consistentUser.wallet_address
  );
  // ⚠️ May fail if keychain data is cleared
}
```

### Improved Recovery with User Messaging
```typescript
// Improved implementation
if (consistentUser.wallet_address) {
  const walletResult = await walletService.recoverWalletFromAddress(
    consistentUser.id, 
    consistentUser.wallet_address
  );
  
  if (!walletResult.success) {
    // Show clear recovery instructions
    showRecoveryInstructions({
      message: "Wallet not found on device. Please restore from seed phrase.",
      expectedAddress: consistentUser.wallet_address,
      onRestore: () => navigateToSeedPhraseRestore()
    });
  }
}
```

### Encrypted Cloud Backup
```typescript
// Backup implementation
async function backupWalletToCloud(
  userId: string, 
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Export wallet data
    const walletData = await walletExportService.exportWallet(userId);
    
    // Encrypt with user password
    const encrypted = await encryptWithPassword(
      JSON.stringify(walletData),
      password
    );
    
    // Store encrypted backup
    await firebaseDataService.user.updateUser(userId, {
      wallet_backup_encrypted: encrypted,
      wallet_backup_created_at: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
```

---

## 📚 References

- **secureVault:** `src/services/security/secureVault.ts`
- **Wallet Recovery:** `src/services/blockchain/wallet/walletRecoveryService.ts`
- **Auth Service:** `src/services/auth/AuthService.ts`
- **Wallet Export:** `src/services/blockchain/wallet/walletExportService.ts`

---

## 🎯 Summary

**Current State:**
- ✅ Wallets persist across app updates
- ⚠️ Wallets may NOT persist across app reinstalls
- ✅ Users can manually restore from seed phrase
- ❌ No encrypted cloud backup

**Recommendations:**
1. Add clear recovery messaging when automatic recovery fails
2. Implement encrypted cloud backup option
3. Improve user education about seed phrase backup
4. Test and document platform-specific behavior

**User Action Required:**
- Users MUST save their seed phrase separately
- Users should test restore functionality
- Users should backup before reinstalling

---

**Last Updated:** ${new Date().toISOString()}

