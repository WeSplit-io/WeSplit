# 🔐 Vault Access & Face ID Authentication Audit

## Executive Summary

This audit identifies all vault access points and Face ID/biometric authentication calls across the WeSplit application. The goal is to centralize authentication to a single Face ID check before dashboard display.

**Audit Date:** ${new Date().toISOString().split('T')[0]}
**Status:** ⚠️ **MULTIPLE AUTHENTICATION POINTS FOUND**

---

## 📊 Vault Access Architecture

### Primary Vault Service: `secureVault`

**Location:** `src/services/security/secureVault.ts`

**Methods:**
- `secureVault.store(userId, name, value)` - Stores mnemonic/privateKey
- `secureVault.get(userId, name)` - Retrieves mnemonic/privateKey
- `secureVault.clear(userId, name)` - Clears stored credentials

**Current Authentication:**
- ❌ **NO Face ID authentication** - All calls use `requireAuthentication: false`
- Uses Keychain with `BIOMETRY_ANY_OR_DEVICE_PASSCODE` for AES key storage
- But actual vault access (get/store) does NOT require biometric authentication

---

## 🔍 Vault Access Points

### 1. **Dashboard Screen** (`src/screens/Dashboard/DashboardScreen.tsx`)

**Access Pattern:**
- Uses `useWalletState` hook (line 45)
- Hook calls `walletService.ensureUserWallet()` (via `useWalletState.ts:54`)
- `ensureUserWallet()` → `walletRecoveryService.recoverWallet()` → `secureVault.get()`

**Frequency:** Every time dashboard is displayed/focused

**Current Auth:** ❌ None

---

### 2. **Wallet Management Screen** (`src/screens/WalletManagement/WalletManagementScreen.tsx`)

**Access Pattern:**
- Line 106: `ensureAppWallet(currentUser.id.toString())` on mount
- Line 112: `getAppWalletBalance(currentUser.id.toString())`
- Line 342: `ensureAppWallet()` on refresh
- Line 348: `getAppWalletBalance()` on refresh

**Frequency:** On mount + on manual refresh

**Current Auth:** ❌ None

**Vault Access Chain:**
```
ensureAppWallet() 
  → walletService.ensureUserWallet() 
    → walletRecoveryService.recoverWallet() 
      → secureVault.get(userId, 'mnemonic')
      → secureVault.get(userId, 'privateKey')
```

---

### 3. **Seed Phrase View Screen** (`src/screens/WalletManagement/SeedPhraseViewScreen.tsx`)

**Access Pattern:**
- Line 60: `walletExportService.exportWallet(currentUser.id.toString())` on mount
- Line 153: `walletExportService.exportWallet()` when exporting private key

**Frequency:** On mount + when user taps "Export Private Key"

**Current Auth:** ❌ None

**Vault Access Chain:**
```
walletExportService.exportWallet()
  → walletRecoveryService.recoverWallet()
    → secureVault.get(userId, 'mnemonic')
  → walletRecoveryService.getStoredMnemonic()
    → secureVault.get(userId, 'mnemonic')
```

---

### 4. **Split Creation (Fair Split)** (`src/screens/FairSplit/FairSplitScreen.tsx`)

**Access Pattern:**
- Line 1159: `SplitWalletService.createSplitWallet()` when creating split
- Line 2557: `walletService.ensureUserWallet()` for user wallet

**Frequency:** When user creates a new split

**Current Auth:** ❌ None

**Vault Access Chain:**
```
SplitWalletService.createSplitWallet()
  → SplitWalletSecurity.storeFairSplitPrivateKey()
    → SecureStore.setItemAsync() [requireAuthentication: false]
```

---

### 5. **Split Wallet Security** (`src/services/split/SplitWalletSecurity.ts`)

**Access Pattern:**
- Line 36: `SecureStore.setItemAsync()` - Store Fair split private key
- Line 81: `SecureStore.setItemAsync()` - Store Degen split private key
- Line 157: `SecureStore.getItemAsync()` - Get Fair split private key
- Line 188: `SecureStore.getItemAsync()` - Get Degen split private key
- Line 230: `SecureStore.getItemAsync()` - Get split private key (fallback)
- Line 400: `SecureStore.getItemAsync()` - Get split private key (alternative)

**Frequency:** When creating/accessing split wallets

**Current Auth:** ❌ All use `requireAuthentication: false`

---

### 6. **Wallet Recovery Service** (`src/services/blockchain/wallet/walletRecoveryService.ts`)

**Access Pattern:**
- Line 55: `secureVault.store(userId, 'privateKey', ...)` - Store private key
- Line 91: `secureVault.get(userId, 'privateKey')` - Get private key
- Line 2292: `secureVault.store(userId, 'mnemonic', ...)` - Store mnemonic
- Line 2335: `secureVault.get(userId, 'mnemonic')` - Get mnemonic (via `getStoredMnemonic()`)
- Multiple `SecureStore.getItemAsync()` calls with `requireAuthentication: false`

**Frequency:** Called by all wallet operations

**Current Auth:** ❌ None

---

### 7. **Wallet Export Service** (`src/services/blockchain/wallet/walletExportService.ts`)

**Access Pattern:**
- Line 40: `walletRecoveryService.recoverWallet()` - Gets wallet from vault
- Line 131: `walletRecoveryService.getStoredMnemonic()` - Gets mnemonic from vault

**Frequency:** When exporting wallet credentials

**Current Auth:** ❌ None

---

### 8. **Wallet Context** (`src/context/WalletContext.tsx`)

**Access Pattern:**
- Line 264: `walletService.getSeedPhrase(userId)` - Hydrates app wallet secrets
- Line 566: `walletService.ensureUserWallet(userId)` - Ensures wallet exists
- Line 624: `walletExportService.exportWallet(userId)` - Exports wallet

**Frequency:** On wallet operations

**Current Auth:** ❌ None

---

## 🚨 Problem Analysis

### Issue 1: Face ID Triggered on Every Vault Access

**Current State:**
- ✅ Face ID IS being triggered (via Keychain `accessControl: BIOMETRY_ANY_OR_DEVICE_PASSCODE`)
- ❌ Face ID is triggered on EVERY vault access (no caching)
- ❌ `getOrCreateAesKey()` is called on every `secureVault.get()` call
- ❌ Each Keychain access triggers a new Face ID prompt
- ❌ No session-based authentication state
- ❌ AES key is not cached in memory after first authentication

**Why Face ID is Triggered:**
```
secureVault.get() 
  → getOrCreateAesKey() [Line 228]
    → Keychain.getGenericPassword() [Line 127]
      → 🔐 FACE ID PROMPT (Keychain accessControl: BIOMETRY_ANY_OR_DEVICE_PASSCODE)
```

**Impact:**
- User sees Face ID prompt 5+ times for a single session
- Each vault access (get/store) triggers a new Face ID prompt
- No persistent authentication state
- Poor user experience

---

### Issue 2: Multiple Entry Points

**Vault Access Entry Points:**
1. Dashboard → `useWalletState` → `ensureUserWallet()` → vault
2. Wallet Management → `ensureAppWallet()` → vault
3. Seed Phrase View → `walletExportService.exportWallet()` → vault
4. Split Creation → `SplitWalletSecurity` → SecureStore
5. Transaction Sending → `ensureUserWallet()` → vault
6. Balance Checks → `ensureUserWallet()` → vault

**Total Entry Points:** 6+ different code paths

---

### Issue 3: Inconsistent Storage Access

**Storage Mechanisms:**
1. `secureVault` (Keychain + MMKV) - Primary for mnemonic/privateKey
2. `SecureStore` (expo-secure-store) - Fallback + split wallets
3. Multiple legacy storage keys

**All use `requireAuthentication: false`**

---

## ✅ Solution Requirements

### 1. **Cache AES Key After First Authentication**

**Primary Fix:** Modify `secureVault.ts` to cache the AES key in memory after first Face ID authentication.

**Implementation:**
- Cache AES key in memory after first `getOrCreateAesKey()` call
- Only re-authenticate if key is not cached or after expiration
- Clear cache on app background/foreground or after timeout

**Benefits:**
- Single Face ID prompt per session
- Subsequent vault accesses use cached key
- No changes needed to Keychain configuration
- Minimal code changes

### 2. **Centralized Authentication Service (Optional Enhancement)**

Create a new service: `src/services/security/biometricAuthService.ts`

**Features:**
- Single Face ID check before dashboard
- Session-based authentication state
- Persistent authentication token (with expiration)
- Global authentication context

**API:**
```typescript
interface BiometricAuthService {
  // Check if user is authenticated in current session
  isAuthenticated(): boolean;
  
  // Authenticate user with Face ID (single call)
  authenticate(): Promise<boolean>;
  
  // Clear authentication state
  clearAuthentication(): void;
  
  // Check if authentication is required
  requiresAuthentication(): boolean;
}
```

**Note:** This is optional if we implement AES key caching properly.

---

### 2. **Authentication Context**

Create: `src/context/BiometricAuthContext.tsx`

**Features:**
- Global authentication state
- Provides `isAuthenticated` to all components
- Handles authentication expiration
- Integrates with app navigation

---

### 3. **Vault Access Wrapper**

Modify: `src/services/security/secureVault.ts`

**Changes:**
- Add authentication check before all `get()` operations
- Require authentication for sensitive operations
- Cache authentication state

---

### 4. **Dashboard Authentication Gate**

Modify: `src/screens/Dashboard/DashboardScreen.tsx`

**Changes:**
- Check authentication before rendering
- Show Face ID prompt once before dashboard
- Store authentication state in context

---

### 5. **Update All Vault Access Points**

**Files to Update:**
1. `src/services/security/secureVault.ts` - Add auth check
2. `src/services/blockchain/wallet/walletRecoveryService.ts` - Use auth wrapper
3. `src/services/blockchain/wallet/walletExportService.ts` - Use auth wrapper
4. `src/services/split/SplitWalletSecurity.ts` - Use auth wrapper
5. `src/screens/Dashboard/DashboardScreen.tsx` - Add auth gate
6. `src/screens/WalletManagement/WalletManagementScreen.tsx` - Use auth context
7. `src/screens/WalletManagement/SeedPhraseViewScreen.tsx` - Use auth context

---

## 📋 Implementation Plan

### Phase 1: Cache AES Key (PRIMARY FIX) ⭐
1. Modify `secureVault.ts` to cache AES key in memory
2. Add session-based key caching
3. Add key expiration (e.g., 30 minutes of inactivity)
4. Clear cache on app background/foreground
5. **Result:** Single Face ID prompt per session

### Phase 2: Optional - Centralized Authentication Service
1. Create `biometricAuthService.ts` (if needed)
2. Implement Face ID authentication wrapper
3. Add session management
4. Add authentication expiration

### Phase 3: Optional - Create Authentication Context
1. Create `BiometricAuthContext.tsx` (if needed)
2. Integrate with app navigation
3. Add authentication state management

### Phase 4: Testing
1. Test single Face ID prompt on dashboard
2. Test subsequent vault accesses don't trigger Face ID
3. Test key expiration after inactivity
4. Test cache clearing on app background
5. Test all vault access points

---

## 🔒 Security Considerations

### Current Security Issues:
- ❌ No authentication required for vault access
- ❌ Multiple unauthenticated access points
- ❌ No session management

### Proposed Security Improvements:
- ✅ Single Face ID authentication per session
- ✅ Session-based authentication state
- ✅ Authentication expiration
- ✅ Centralized authentication checks

---

## 📝 Notes

### Keychain Configuration
- Current: `BIOMETRY_ANY_OR_DEVICE_PASSCODE` for AES key
- Issue: AES key access requires biometric, but vault data access doesn't
- Solution: Add authentication check before vault data access

### Expo Go Compatibility
- Current: `isExpoGo()` check skips Keychain/MMKV
- Solution: Authentication service should handle Expo Go gracefully

### Backward Compatibility
- Need to maintain existing vault access patterns
- Add authentication as a wrapper layer
- Don't break existing functionality

---

## 🎯 Success Criteria

1. ✅ Single Face ID prompt before dashboard
2. ✅ No repeated Face ID prompts during session
3. ✅ Authentication state persists across app navigation
4. ✅ All vault access points respect authentication
5. ✅ Authentication expires after inactivity
6. ✅ Works in both Expo Go and production builds

---

**Next Steps:** Implement centralized authentication service and update all vault access points.

