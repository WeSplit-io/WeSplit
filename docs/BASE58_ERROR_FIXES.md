# Base58 Error Fixes - Private Key & Address Handling

## 🔧 Issues Fixed

### Problem
Base58 errors occurring when:
1. Using private keys for withdrawals from shared/split wallets
2. Using public addresses to send funds to splits

### Root Causes Identified

1. **Private Key Decryption Format Mismatch**
   - Private keys stored as base64 were being decrypted as UTF8
   - UTF8 decoding of binary data corrupted the key format
   - Result: Invalid key format causing base58 decode errors

2. **Address Validation Missing**
   - Addresses were validated only by creating PublicKey (throws opaque errors)
   - No format validation before attempting base58 decode
   - Database IDs could be mistaken for addresses

3. **Key Cleaning Too Aggressive**
   - Control character removal was too aggressive
   - Could remove valid characters from base64/base58 keys

---

## ✅ Fixes Applied

### 1. Improved Private Key Decryption
**File**: `src/services/split/SplitWalletSecurity.ts`

**Changes**:
- Try UTF8 first (for legacy keys)
- Fall back to Base64 if UTF8 produces invalid characters
- Better error handling and logging

```typescript
// CRITICAL: Try to get the original format - private keys are typically base64 strings
// First try UTF8 (for text-based keys), then Base64 (for binary keys stored as base64)
let privateKey: string;
try {
  // Try UTF8 first (for legacy keys that were stored as text)
  privateKey = CryptoJS.enc.Utf8.stringify(decrypted);
  // If UTF8 produces invalid characters or empty result, try Base64
  if (!privateKey || privateKey.trim().length === 0 || /[\x00-\x08\x0B-\x0C\x0E-\x1F]/.test(privateKey)) {
    // Try Base64 encoding instead (private keys are often stored as base64)
    const base64Key = CryptoJS.enc.Base64.stringify(decrypted);
    if (base64Key && base64Key.length > 0) {
      privateKey = base64Key;
    }
  }
} catch (utf8Error) {
  // If UTF8 fails, try Base64
  privateKey = CryptoJS.enc.Base64.stringify(decrypted);
}
```

### 2. Improved Private Key Encryption
**File**: `src/services/split/SplitWalletSecurity.ts`

**Changes**:
- Detect if key is already base64-encoded
- Parse as base64 if valid, otherwise use UTF8
- Preserves original format during encryption

```typescript
// CRITICAL: Detect if the key is already base64-encoded
// If it's a valid base64 string, parse it as base64, otherwise treat as UTF8
let keyWordArray: CryptoJS.lib.WordArray;
try {
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(privateKey.trim()) && privateKey.trim().length % 4 === 0;
  if (isBase64) {
    try {
      keyWordArray = CryptoJS.enc.Base64.parse(privateKey.trim());
    } catch {
      keyWordArray = CryptoJS.enc.Utf8.parse(privateKey.trim());
    }
  } else {
    keyWordArray = CryptoJS.enc.Utf8.parse(privateKey.trim());
  }
} catch (parseError) {
  keyWordArray = CryptoJS.enc.Utf8.parse(privateKey.trim());
}
```

### 3. Enhanced Address Validation
**File**: `src/services/blockchain/transaction/ConsolidatedTransactionService.ts`

**Changes**:
- Validate base58 format BEFORE creating PublicKey
- Better error messages with address length
- Prevents opaque base58 errors

```typescript
// CRITICAL: Validate address format before attempting to create PublicKey
// This prevents opaque base58 errors
const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
if (!base58Pattern.test(splitWalletAddress)) {
  logger.error('Invalid split wallet address format (not base58)', {
    splitWalletId,
    address: splitWalletAddress,
    addressLength: splitWalletAddress.length,
    note: 'Address must be a valid base58-encoded Solana public key (32-44 characters)'
  }, 'ConsolidatedTransactionService');
  return {
    success: false,
    error: `Invalid split wallet address format: expected base58-encoded Solana address (32-44 characters), got ${splitWalletAddress.length} characters`
  };
}

// Then validate with PublicKey
try {
  const { PublicKey } = await import('@solana/web3.js');
  new PublicKey(splitWalletAddress);
} catch (addressError) {
  // Better error message
}
```

### 4. Improved Key Cleaning
**File**: `src/services/shared/keypairUtils.ts`

**Changes**:
- Preserve base64 padding (=) and base58 characters
- Only remove truly invalid control characters
- Better trimming logic

```typescript
// Trim and clean the key - remove any whitespace, newlines, or control characters
let trimmedKey = secretKey.trim();
// Remove any null bytes and other control characters that might corrupt the key
// BUT preserve base64 padding characters (=) and base58 characters
trimmedKey = trimmedKey.replace(/\0/g, ''); // Remove null bytes
// Only remove control characters that aren't part of valid key formats
trimmedKey = trimmedKey.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');
trimmedKey = trimmedKey.trim();
```

---

## 🧪 Testing Recommendations

1. **Test Private Key Retrieval**:
   - Fair Split: Creator should be able to retrieve private key
   - Degen Split: All participants should be able to retrieve private key
   - Shared Wallet: All members should be able to retrieve private key

2. **Test Withdrawals**:
   - Fair Split withdrawal (creator only)
   - Shared Wallet withdrawal (any member)
   - Verify private key is correctly formatted

3. **Test Address Validation**:
   - Send funds to split wallet (should validate address format)
   - Verify error messages are clear if address is invalid

4. **Test Edge Cases**:
   - Legacy keys (UTF8 format)
   - Base64 keys
   - Base58 keys
   - Invalid addresses (database IDs, empty strings, etc.)

---

## 📝 Summary

**Status**: ✅ **FIXES APPLIED**

All fixes have been implemented to:
1. ✅ Properly decrypt private keys in their original format (base64/UTF8)
2. ✅ Properly encrypt private keys preserving their format
3. ✅ Validate addresses before attempting base58 decode
4. ✅ Clean keys without removing valid characters

**Expected Results**:
- No more base58 errors when retrieving private keys
- No more base58 errors when validating addresses
- Clear error messages if addresses are invalid
- Private keys work correctly for withdrawals

