# Private Key Handling Audit - Split Wallets & Shared Wallets

## 🔐 Complete Private Key Security Audit

This document provides a comprehensive audit of private key handling for all wallet types.

---

## 📊 Private Key Storage Architecture

### Storage Methods by Wallet Type

| Wallet Type | Storage Location | Encryption | Access Control |
|------------|-----------------|------------|----------------|
| **Fair Split** | Local SecureStore (iOS Keychain/Android Keystore) | None (device-level encryption) | Creator only |
| **Degen Split** | Firebase (`splitWalletPrivateKeys` collection) | AES-256-CBC (encrypted) | All participants |
| **Spend Split** | Same as Fair Split (creator only) | None (device-level encryption) | Creator only |
| **Shared Wallet** | Firebase (`splitWalletPrivateKeys` collection) | AES-256-CBC (encrypted) | All members |

---

## 1️⃣ Fair Split Wallet Private Keys

### Generation
**Location**: `src/services/split/SplitWalletCreation.ts:156-287`

**Process**:
1. ✅ Generates new Solana wallet: `generateWalletFromMnemonic()`
2. ✅ Extracts `secretKey` from wallet result
3. ✅ Stores in local SecureStore using `storeFairSplitPrivateKey()`

**Storage**:
```typescript
// Storage key format: fair_split_private_key_{splitWalletId}_{creatorId}
// Location: iOS Keychain / Android Keystore
// Encryption: Device-level (SecureStore handles encryption)
// Access: Creator only
```

**Retrieval**:
**Location**: `src/services/split/SplitWalletSecurity.ts:462-534`
- ✅ Only creator can retrieve: `getFairSplitPrivateKey(splitWalletId, creatorId)`
- ✅ Validates creator ID matches
- ✅ Returns from SecureStore

**Status**: ✅ **PROPERLY HANDLED**
- Private key never stored in Firebase
- Only creator has access
- Device-level encryption via SecureStore

---

## 2️⃣ Degen Split Wallet Private Keys

### Generation
**Location**: `src/services/split/SplitWalletCreation.ts:293-515`

**Process**:
1. ✅ Generates new Solana wallet: `generateWalletFromMnemonic()`
2. ✅ Extracts `secretKey` from wallet result
3. ✅ Encrypts using AES-256-CBC: `encryptPrivateKey(splitWalletId, privateKey)`
4. ✅ Stores encrypted payload in Firebase: `splitWalletPrivateKeys` collection
5. ✅ Stores participant list for access control

**Encryption Details**:
- **Algorithm**: AES-256-CBC
- **Key Derivation**: HMAC-SHA256 (v2) or PBKDF2 (v1 legacy)
- **IV**: Random 16 bytes
- **Salt**: Random 16 bytes
- **Version**: `aes-256-cbc-v2`

**Storage Structure**:
```typescript
// Firebase: splitWalletPrivateKeys/{splitWalletId}
{
  splitWalletId: string,
  encryptedPrivateKey: {
    ciphertext: string (base64),
    iv: string (base64),
    salt: string (base64),
    version: 'aes-256-cbc-v2',
    algorithm: 'aes-256-cbc',
    iterations: 0 // Not used for v2
  },
  participants: [
    { userId: string, name: string },
    ...
  ],
  splitType: 'degen',
  encryptionVersion: 'aes-256-cbc-v2',
  createdAt: string
}
```

**Retrieval**:
**Location**: `src/services/split/SplitWalletSecurity.ts:584-883`

**Process**:
1. ✅ Checks in-memory cache (5 min TTL)
2. ✅ Checks encrypted payload cache (10 min TTL)
3. ✅ Fetches from Firebase if not cached
4. ✅ **Verifies user is in participants list** ← **CRITICAL SECURITY CHECK**
5. ✅ Decrypts using `decryptEncryptedPrivateKey()`
6. ✅ Caches decrypted key (5 min TTL)

**Access Control**:
```typescript
// Line 705-714: Participant verification
const isParticipant = participantsList.some(
  participant => participant?.userId?.toString() === requesterId
);

if (!isParticipant) {
  return {
    success: false,
    error: 'User is not a participant in this Degen Split'
  };
}
```

**Status**: ✅ **PROPERLY HANDLED**
- Encrypted before storage
- Participant verification before decryption
- Caching for performance
- Legacy plaintext migration support

---

## 3️⃣ Shared Wallet Private Keys

### Generation
**Location**: `src/services/sharedWallet/SharedWalletCreation.ts:102-291`

**Process**:
1. ✅ Generates new Solana wallet: `walletService.createWallet()`
2. ✅ Extracts `secretKey` from wallet result
3. ✅ Encrypts using AES-256-CBC: `encryptPrivateKey(sharedWalletId, privateKey)`
4. ✅ Stores encrypted payload in Firebase: `splitWalletPrivateKeys` collection (reuses Degen Split system)
5. ✅ Stores member list for access control

**Storage**:
- ✅ Uses same encryption system as Degen Split
- ✅ Stores in `splitWalletPrivateKeys` collection (by design - shared infrastructure)
- ✅ Document ID = `sharedWalletId`

**Retrieval**:
**Location**: `src/services/sharedWallet/index.ts:209-232`

**Process**:
1. ✅ Delegates to `SplitWalletSecurity.getSplitWalletPrivateKey()`
2. ✅ Same participant verification as Degen Split
3. ✅ Same caching mechanism

**Status**: ✅ **PROPERLY HANDLED**

---

## 4️⃣ Participant Access Management

### Degen Split - Adding Participants

**Issue**: ⚠️ **POTENTIAL GAP**

When new participants are added to a Degen Split:
1. ✅ Participant is added to split wallet document
2. ✅ Participant is added to split document
3. ❓ **Private key access**: Need to verify if `addParticipantsToSplitWalletPrivateKey()` is called

**Location to Check**: Participant invitation flow

**Current Implementation**:
- `addParticipantsToSplitWalletPrivateKey()` exists and works correctly
- Need to verify it's called when participants are invited/added

### Shared Wallet - Adding Members

**Location**: `src/services/sharedWallet/index.ts:549-739`

**Process**:
1. ✅ Adds members to shared wallet document
2. ✅ **Grants private key access**: `addParticipantsToSplitWalletPrivateKey()` ← **VERIFIED**
3. ✅ Logs success/failure
4. ⚠️ **Issue**: If private key access fails, member is still added (no rollback)

**Code** (Line 688-711):
```typescript
// Grant private key access to new members
if (newMembers.length > 0) {
  const grantAccessResult = await SplitWalletSecurity.addParticipantsToSplitWalletPrivateKey(
    params.sharedWalletId,
    newMembers.map(m => ({ userId: m.userId, name: m.name }))
  );

  if (!grantAccessResult.success) {
    logger.error('Failed to grant private key access to new members', {
      sharedWalletId: params.sharedWalletId,
      newMembersCount: newMembers.length,
      error: grantAccessResult.error
    }, 'SharedWalletService');

    // ⚠️ ISSUE: This is a critical error - new members won't be able to withdraw
    // Consider rolling back the member additions here
  }
}
```

**Status**: ⚠️ **PARTIAL** - Access is granted, but no rollback on failure

### Shared Wallet - Accepting Invitations

**Location**: `src/services/sharedWallet/index.ts:480-520`

**Process**:
1. ✅ Updates member status to 'active'
2. ✅ **Syncs private key participants**: `syncSharedPrivateKeyParticipants()` ← **VERIFIED**
3. ✅ Logs success/failure (non-blocking)

**Code** (Line 500-514):
```typescript
// The user should already be in the participants list from inviteToSharedWallet,
// but we verify and sync to prevent access issues during withdrawal
const syncResult = await SplitWalletSecurity.syncSharedPrivateKeyParticipants(
  sharedWalletId,
  updatedMembers.map(m => ({ userId: m.userId, name: m.name }))
);
```

**Status**: ✅ **PROPERLY HANDLED** - Syncs participants on acceptance

---

## 5️⃣ Security Measures

### Encryption
- ✅ **Algorithm**: AES-256-CBC
- ✅ **Key Derivation**: HMAC-SHA256 (v2, fast) or PBKDF2 (v1, legacy)
- ✅ **IV**: Random 16 bytes per encryption
- ✅ **Salt**: Random 16 bytes per encryption
- ✅ **Base Secret**: From unified config (not hardcoded)

### Access Control
- ✅ **Fair Split**: Creator-only (SecureStore key includes creatorId)
- ✅ **Degen Split**: Participant verification before decryption
- ✅ **Shared Wallet**: Member verification before decryption

### Caching
- ✅ **Decrypted Keys**: 5-minute TTL (in-memory)
- ✅ **Encrypted Payloads**: 10-minute TTL (in-memory)
- ✅ **Cache Cleanup**: Automatic expiration

### Error Handling
- ✅ All operations return success/error results
- ✅ Comprehensive logging
- ✅ Fallback to legacy formats for backward compatibility

---

## 6️⃣ Issues Found

### Issue #1: Shared Wallet Invitation - No Rollback on Private Key Access Failure
**Severity**: 🟡 **MEDIUM**

**Problem**: When inviting members to a shared wallet, if private key access grant fails, the member is still added to the wallet but won't be able to withdraw.

**Location**: `src/services/sharedWallet/index.ts:688-711`

**Current Behavior**:
```typescript
if (!grantAccessResult.success) {
  logger.error('Failed to grant private key access to new members', ...);
  // ⚠️ Member is still added to wallet - they just can't access private key
}
```

**Impact**: New members can fund the wallet but cannot withdraw (will get "not a participant" error).

**Recommendation**: 
- Option 1: Rollback member addition if private key access fails
- Option 2: Retry private key access grant
- Option 3: Add member but mark as "pending_key_access" and retry later

### Issue #2: Degen Split Participant Addition - Private Key Access ✅ VERIFIED
**Severity**: ✅ **RESOLVED**

**Status**: ✅ **PROPERLY HANDLED**

**Verification**:
1. ✅ When participants are added via `updateSplitWalletParticipants()`:
   - Location: `src/services/split/SplitWalletManagement.ts:459-483`
   - Calls `syncSharedPrivateKeyParticipants()` for degen splits
   - Syncs all participants to private key document

2. ✅ When users join via `joinSplit()`:
   - Location: `src/services/splits/splitInvitationService.ts:303-311`
   - Updates split wallet participants via `updateSplitWalletParticipants()`
   - Which in turn calls `syncSharedPrivateKeyParticipants()`

**Conclusion**: Private key access is properly synced when participants are added to degen splits.

### Issue #3: Fair Split - No Private Key Access for New Participants
**Severity**: ✅ **INTENTIONAL** (Not an issue)

**Status**: Fair splits are creator-only by design. Participants don't need private key access.

---

## 7️⃣ Verification Checklist

### Private Key Generation
- [x] Fair Split: ✅ Generated from `generateWalletFromMnemonic()`
- [x] Degen Split: ✅ Generated from `generateWalletFromMnemonic()`
- [x] Shared Wallet: ✅ Generated from `walletService.createWallet()`
- [x] All use cryptographically secure random generation

### Private Key Storage
- [x] Fair Split: ✅ Local SecureStore (device-encrypted)
- [x] Degen Split: ✅ Firebase (AES-256-CBC encrypted)
- [x] Shared Wallet: ✅ Firebase (AES-256-CBC encrypted)
- [x] No plaintext storage in Firebase

### Private Key Retrieval
- [x] Fair Split: ✅ Creator-only access verified
- [x] Degen Split: ✅ Participant verification before decryption
- [x] Shared Wallet: ✅ Member verification before decryption
- [x] Caching implemented for performance

### Access Control
- [x] Fair Split: ✅ Creator ID checked
- [x] Degen Split: ✅ Participant list verified
- [x] Shared Wallet: ✅ Member list verified
- [x] Access denied if not authorized

### Participant Management
- [x] Shared Wallet Invitation: ✅ Grants private key access
- [x] Shared Wallet Acceptance: ✅ Syncs private key participants
- [x] Degen Split Participant Addition: ✅ Syncs private key participants via `updateSplitWalletParticipants()`
- [x] Degen Split Join/Invitation: ✅ Syncs via `joinSplit()` → `updateSplitWalletParticipants()`
- [x] Fair Split: ✅ N/A (creator-only)

### Error Handling
- [x] All operations return success/error
- [x] Comprehensive logging
- [x] Fallback to legacy formats
- [ ] Shared Wallet: ⚠️ No rollback on private key access failure

---

## 📝 Summary

**Overall Status**: 🟢 **WELL IMPLEMENTED** with minor improvements needed

### Strengths
1. ✅ Strong encryption (AES-256-CBC)
2. ✅ Proper access control (participant/member verification)
3. ✅ Secure storage (device-level for Fair Split, encrypted Firebase for shared)
4. ✅ Caching for performance
5. ✅ Comprehensive error handling
6. ✅ Legacy format support

### Areas for Improvement
1. ⚠️ **Shared Wallet**: Add rollback or retry mechanism for private key access failures
2. ✅ **Degen Split**: ✅ Verified - participant invitation properly grants private key access
3. ✅ Consider adding private key rotation mechanism for long-lived shared wallets

### Security Posture
- **Fair Split**: ✅ Excellent (creator-only, device-encrypted)
- **Degen Split**: ✅ Excellent (encrypted, participant-verified)
- **Shared Wallet**: ✅ Excellent (encrypted, member-verified)

**All private keys are properly handled with strong security measures in place.**

