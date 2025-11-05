# 🔐 Seedphrase / Private Key Storage Security Audit

## Executive Summary

This audit examines the seedphrase and private key storage logic across the entire WeSplit application. The audit identified both secure practices and critical security vulnerabilities that require immediate attention.

**Audit Date:** ${new Date().toISOString().split('T')[0]}
**Status:** ⚠️ **CRITICAL ISSUES FOUND**

---

## 📊 Storage Architecture Overview

### Primary Storage Mechanisms

1. **`secureVault` (Primary - Recommended)**
   - Location: `src/services/security/secureVault.ts`
   - Encryption: AES-256-GCM
   - Storage: Keychain (iOS) + MMKV (encrypted)
   - Keys: `mnemonic_ct_${userId}`, `mnemonic_iv_${userId}`, `privateKey_ct_${userId}`, `privateKey_iv_${userId}`
   - Security Level: ✅ **HIGH** (Hardware-backed encryption)

2. **`SecureStore` (Fallback)**
   - Location: `expo-secure-store`
   - Encryption: Platform native keychain (iOS/Android)
   - Storage: Platform secure storage
   - Keys: Multiple legacy formats (see below)
   - Security Level: ⚠️ **MEDIUM** (Platform-dependent, plaintext storage)

3. **Legacy Storage Formats**
   - Multiple storage keys for backward compatibility
   - Stored in SecureStore without encryption layer
   - Security Level: ⚠️ **MEDIUM** (Relies on platform security only)

---

## 🚨 CRITICAL SECURITY ISSUES

### 1. **Degen Split Private Keys Stored in Firebase (CRITICAL)**

**Location:** `src/services/split/SplitWalletSecurity.ts:514-535`

**Issue:** Private keys for Degen Split wallets are stored in Firebase Firestore in plaintext.

```typescript
// CRITICAL SECURITY ISSUE
await setDoc(privateKeyDocRef, {
  splitWalletId,
  privateKey,  // ⚠️ PLAINTEXT IN CLOUD DATABASE
  participants: participants.map(p => ({ userId: p.userId, name: p.name })),
  createdAt: new Date().toISOString(),
  splitType: 'degen'
});
```

**Impact:**
- Private keys stored in cloud database (Firebase Firestore)
- Accessible to anyone with Firebase admin access
- Potential for data breach if Firebase is compromised
- Violates fundamental security principle: "Never store private keys in cloud"

**Recommendation:**
- **IMMEDIATE:** Remove Firebase storage of private keys
- Store Degen Split private keys locally on each participant's device
- Use secure key sharing mechanism (encrypted messages) if needed
- Implement proper key derivation for shared wallets

**Severity:** 🔴 **CRITICAL**

---

### 2. **SecureStore Fallback Stores Plaintext (HIGH)**

**Location:** `src/services/security/secureVault.ts:163-172`

**Issue:** When `secureVault` encryption fails, the system falls back to storing plaintext in SecureStore.

```typescript
// Fallback to SecureStore cleartext (existing behavior)
if (SecureStore?.setItemAsync) {
  const k = `${name}_${userId}`;
  await SecureStore.setItemAsync(k, value, {  // ⚠️ PLAINTEXT
    requireAuthentication: false,
    keychainService: 'WeSplitWalletData',
  });
  return true;
}
```

**Impact:**
- If encryption fails, private keys/seedphrases stored as plaintext
- No encryption layer protection
- Relies entirely on platform keychain security

**Recommendation:**
- Add encryption wrapper even for SecureStore fallback
- Implement retry logic for encryption failures
- Log security warnings when fallback is used
- Consider failing securely rather than falling back to plaintext

**Severity:** 🟠 **HIGH**

---

### 3. **Multiple Legacy Storage Formats (MEDIUM)**

**Location:** `src/services/blockchain/wallet/walletRecoveryService.ts:78-477`

**Issue:** The application maintains 8+ different storage formats for backward compatibility:

1. `wallet_${userId}` (new format)
2. `wallet_private_key` (legacy global)
3. `private_key_${userId}` (legacy user-specific)
4. `mnemonic_${userId}` (user-specific mnemonic)
5. `seed_phrase_${userId}` (legacy seed phrase)
6. `wallet_mnemonic` (global mnemonic)
7. `storedWallets` (AsyncStorage - legacy)
8. Additional legacy keys in recovery logic

**Impact:**
- Increased attack surface
- Complexity in security auditing
- Potential for data inconsistency
- Legacy formats may have weaker security

**Recommendation:**
- Consolidate to single storage format (`secureVault`)
- Migrate all legacy data to new format
- Remove legacy storage after migration
- Implement storage format versioning

**Severity:** 🟡 **MEDIUM**

---

### 4. **Console Logging of Sensitive Metadata (LOW)**

**Location:** `src/screens/WalletManagement/SeedPhraseViewScreen.tsx:80-87`

**Issue:** Console logs that could expose sensitive information (though only metadata).

```typescript
console.log('🔐 SeedPhraseView: Seed phrase retrieved successfully', { wordCount: seedPhraseWords.length });
```

**Impact:**
- Low risk (only logs metadata, not actual keys)
- Could leak information about wallet state
- Production logs could be monitored

**Recommendation:**
- Remove console.log statements in production
- Use structured logging with log levels
- Ensure sensitive data never logged

**Severity:** 🟢 **LOW**

---

## ✅ Secure Practices Identified

### 1. **Primary Encryption Implementation**
- ✅ AES-256-GCM encryption in `secureVault`
- ✅ Hardware-backed key storage (Keychain)
- ✅ Proper IV generation for encryption
- ✅ Secure key derivation from Keychain

### 2. **Storage Locations**
- ✅ User wallet keys stored locally only
- ✅ Fair Split wallet keys stored locally only
- ✅ No user private keys in Firebase database
- ✅ Migration service removes private keys from database

### 3. **Access Control**
- ✅ Fair Split private keys: Creator-only access
- ✅ User wallet keys: User-specific storage
- ✅ Proper validation of wallet addresses

### 4. **Error Handling**
- ✅ Proper error handling in storage operations
- ✅ Logging without exposing sensitive data
- ✅ Fallback mechanisms for recovery

---

## 📋 Storage Key Inventory

### User Wallet Storage Keys

| Storage Key | Format | Location | Encryption | Status |
|------------|--------|----------|------------|--------|
| `mnemonic_ct_${userId}` | secureVault | MMKV | AES-256-GCM | ✅ Primary |
| `mnemonic_iv_${userId}` | secureVault | MMKV | AES-256-GCM | ✅ Primary |
| `privateKey_ct_${userId}` | secureVault | MMKV | AES-256-GCM | ✅ Primary |
| `privateKey_iv_${userId}` | secureVault | MMKV | AES-256-GCM | ✅ Primary |
| `mnemonic_${userId}` | SecureStore | Keychain | Platform | ⚠️ Fallback |
| `wallet_${userId}` | SecureStore | Keychain | Platform | ⚠️ Legacy |
| `wallet_private_key` | SecureStore | Keychain | Platform | ⚠️ Legacy |
| `private_key_${userId}` | SecureStore | Keychain | Platform | ⚠️ Legacy |
| `seed_phrase_${userId}` | SecureStore | Keychain | Platform | ⚠️ Legacy |
| `wallet_mnemonic` | SecureStore | Keychain | Platform | ⚠️ Legacy |
| `storedWallets` | AsyncStorage | Device | None | 🔴 Legacy |

### Split Wallet Storage Keys

| Storage Key | Format | Location | Encryption | Status |
|------------|--------|----------|------------|--------|
| `split_wallet_private_key_${splitWalletId}_${creatorId}` | SecureStore | Keychain | Platform | ⚠️ Local |
| `fair_split_private_key_${splitWalletId}_${creatorId}` | SecureStore | Keychain | Platform | ⚠️ Local |
| `splitWalletPrivateKeys/${splitWalletId}` | Firebase | Firestore | None | 🔴 **CRITICAL** |

---

## 🔍 Detailed Code Analysis

### secureVault Implementation

**File:** `src/services/security/secureVault.ts`

**Strengths:**
- Uses AES-256-GCM (authenticated encryption)
- Hardware-backed key storage (Keychain)
- Proper IV generation (12 bytes for GCM)
- Secure random number generation

**Weaknesses:**
- Fallback to plaintext SecureStore
- No key rotation mechanism
- No encryption failure alerting

**Recommendation:**
```typescript
// Add encryption wrapper for fallback
if (SecureStore?.setItemAsync) {
  // Encrypt before storing even in fallback
  const encrypted = await encryptWithPlatformKey(value);
  await SecureStore.setItemAsync(k, encrypted, {
    requireAuthentication: false,
    keychainService: 'WeSplitWalletData',
  });
}
```

### Wallet Recovery Service

**File:** `src/services/blockchain/wallet/walletRecoveryService.ts`

**Strengths:**
- Comprehensive recovery logic
- Multiple format support for migration
- Proper validation of recovered wallets

**Weaknesses:**
- Too many legacy formats supported
- Complex recovery logic increases attack surface
- No cleanup of legacy storage after migration

### Split Wallet Security

**File:** `src/services/split/SplitWalletSecurity.ts`

**Critical Issue:** Degen Split private keys stored in Firebase

**Current Flow:**
1. Degen Split created
2. Private key stored in Firebase Firestore
3. All participants can access from Firebase

**Recommended Flow:**
1. Degen Split created
2. Private key stored locally on each participant's device
3. Use encrypted messaging for key sharing if needed
4. Implement proper key derivation for shared access

---

## 🛠️ Recommended Actions

### Immediate (Critical)

1. **Remove Firebase Storage of Private Keys**
   - Remove `storeSplitWalletPrivateKeyForAllParticipants` Firebase storage
   - Migrate existing Degen Split keys to local storage
   - Update all references to use local storage only

2. **Add Encryption to SecureStore Fallback**
   - Wrap SecureStore fallback with encryption
   - Ensure no plaintext storage occurs

### Short-term (High Priority)

3. **Consolidate Storage Formats**
   - Migrate all legacy formats to `secureVault`
   - Remove legacy storage keys after migration
   - Implement storage versioning

4. **Remove Console Logging**
   - Replace console.log with structured logging
   - Ensure no sensitive data in logs

### Long-term (Medium Priority)

5. **Implement Key Rotation**
   - Add mechanism for rotating encryption keys
   - Support key versioning

6. **Add Security Monitoring**
   - Monitor for encryption failures
   - Alert on fallback usage
   - Track security events

7. **Security Testing**
   - Add tests for encryption/decryption
   - Test fallback scenarios
   - Verify no plaintext storage

---

## 📝 Code Examples

### Current (Insecure) - Degen Split Storage

```typescript
// ❌ DON'T DO THIS
await setDoc(privateKeyDocRef, {
  splitWalletId,
  privateKey,  // Plaintext in cloud!
  participants: [...],
  splitType: 'degen'
});
```

### Recommended - Local Storage Only

```typescript
// ✅ DO THIS INSTEAD
// Store locally on each participant's device
for (const participant of participants) {
  await secureVault.store(
    participant.userId,
    'privateKey',
    privateKey
  );
}
```

### Current (Insecure) - SecureStore Fallback

```typescript
// ⚠️ FALLBACK TO PLAINTEXT
await SecureStore.setItemAsync(k, value, {  // Plaintext!
  requireAuthentication: false,
  keychainService: 'WeSplitWalletData',
});
```

### Recommended - Encrypted Fallback

```typescript
// ✅ ENCRYPTED FALLBACK
const encrypted = await encryptWithPlatformKey(value);
await SecureStore.setItemAsync(k, encrypted, {
  requireAuthentication: false,
  keychainService: 'WeSplitWalletData',
});
```

---

## 🔒 Security Checklist

- [ ] Remove Firebase storage of private keys
- [ ] Add encryption to SecureStore fallback
- [ ] Migrate all legacy storage formats
- [ ] Remove console.log statements
- [ ] Implement key rotation mechanism
- [ ] Add security monitoring
- [ ] Add security tests
- [ ] Update documentation
- [ ] Security review of all changes
- [ ] Audit Firebase Security Rules

---

## 📚 References

- **secureVault:** `src/services/security/secureVault.ts`
- **Wallet Recovery:** `src/services/blockchain/wallet/walletRecoveryService.ts`
- **Split Wallet Security:** `src/services/split/SplitWalletSecurity.ts`
- **Wallet Export:** `src/services/blockchain/wallet/walletExportService.ts`
- **Migration Service:** `src/services/core/UserMigrationService.ts`

---

## 📞 Contact

For questions about this audit or security concerns, please contact the security team.

**Last Updated:** ${new Date().toISOString()}

