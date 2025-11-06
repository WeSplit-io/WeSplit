# 🔐 Biometric Authentication Fallback Documentation

## Overview

The WeSplit app supports users with and without biometric authentication (Face ID/Touch ID). The implementation automatically falls back to device passcode when biometrics aren't available.

---

## 🔄 How It Works

### Keychain Access Control

The app uses `BIOMETRY_ANY_OR_DEVICE_PASSCODE` access control, which means:

1. **If biometrics are available and enabled:**
   - User sees Face ID/Touch ID prompt
   - Authentication succeeds → AES key cached → App works normally

2. **If biometrics are NOT available (not set up, disabled, or device doesn't support):**
   - Keychain automatically falls back to device passcode
   - User sees device passcode prompt
   - Authentication succeeds → AES key cached → App works normally

3. **If user cancels authentication:**
   - Keychain access fails
   - App falls back to SecureStore (no authentication required)
   - App still works, but with less secure storage

---

## 📱 User Experience

### Scenario 1: User with Face ID/Touch ID
```
1. User opens Dashboard
2. Face ID/Touch ID prompt appears
3. User authenticates with biometrics
4. AES key cached → Dashboard renders
5. All subsequent vault accesses use cached key (no prompts)
```

### Scenario 2: User without Biometrics (but has device passcode)
```
1. User opens Dashboard
2. Device passcode prompt appears (automatic fallback)
3. User enters device passcode
4. AES key cached → Dashboard renders
5. All subsequent vault accesses use cached key (no prompts)
```

### Scenario 3: User cancels authentication
```
1. User opens Dashboard
2. Face ID/passcode prompt appears
3. User cancels authentication
4. Keychain access fails
5. App falls back to SecureStore (no authentication)
6. Dashboard renders (with less secure storage)
7. App still works, but vault data stored in SecureStore instead of encrypted MMKV
```

---

## 🔒 Security Levels

### Level 1: Keychain + MMKV (Most Secure) ✅
- **Requires:** Biometrics OR device passcode
- **Storage:** AES-encrypted in MMKV
- **Access:** Keychain-protected AES key
- **Fallback:** If Keychain fails → Level 2

### Level 2: SecureStore (Less Secure) ⚠️
- **Requires:** No authentication (platform security only)
- **Storage:** Cleartext in SecureStore
- **Access:** Direct SecureStore access
- **Fallback:** If SecureStore fails → App error

---

## 🛠️ Implementation Details

### Keychain Configuration

```typescript
accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE
```

**What this means:**
- `BIOMETRY_ANY` - Try Face ID or Touch ID if available
- `OR_DEVICE_PASSCODE` - Fall back to device passcode if biometrics aren't available
- This ensures the app works for ALL users, regardless of biometric setup

### Fallback Chain

```
1. Try Keychain with biometrics
   ↓ (if biometrics not available)
2. Try Keychain with device passcode
   ↓ (if user cancels or Keychain fails)
3. Fall back to SecureStore (no authentication)
   ↓ (if SecureStore fails)
4. App error (should not happen)
```

---

## ✅ Compatibility

### ✅ Supported Devices
- **iOS:** All devices (with or without Face ID/Touch ID)
- **Android:** All devices (with or without fingerprint/face unlock)
- **Expo Go:** Uses SecureStore fallback (no Keychain)

### ✅ User Scenarios
- ✅ User with Face ID/Touch ID enabled
- ✅ User with biometrics disabled but device passcode enabled
- ✅ User without biometrics but with device passcode
- ✅ User who cancels authentication (falls back to SecureStore)
- ✅ Device without biometric hardware (uses passcode)

---

## 🚨 Edge Cases

### Case 1: User Denies Biometric Permission
- **Result:** Falls back to device passcode
- **App Status:** ✅ Still works

### Case 2: User Cancels Passcode Prompt
- **Result:** Keychain access fails → Falls back to SecureStore
- **App Status:** ✅ Still works (less secure)

### Case 3: Device Has No Passcode
- **Result:** Keychain access fails → Falls back to SecureStore
- **App Status:** ✅ Still works (less secure)
- **Note:** Modern iOS/Android devices require passcode, so this is rare

### Case 4: Expo Go (Development)
- **Result:** Keychain not available → Uses SecureStore
- **App Status:** ✅ Still works
- **Note:** This is expected behavior in Expo Go

---

## 📊 Security Comparison

| Storage Method | Authentication | Encryption | Security Level |
|---------------|----------------|------------|----------------|
| Keychain + MMKV | Biometrics/Passcode | AES-256-GCM | ✅ High |
| SecureStore | None (platform only) | Platform native | ⚠️ Medium |

---

## 🔍 Code Flow

### Authentication Flow
```
secureVault.preAuthenticate()
  → getOrCreateAesKey()
    → Keychain.getGenericPassword()
      → [If biometrics available] Face ID/Touch ID prompt
      → [If biometrics NOT available] Device passcode prompt
      → [If user cancels] Keychain fails → SecureStore fallback
```

### Vault Access Flow
```
secureVault.get()
  → getOrCreateAesKey()
    → [Check cache] If cached → Use cached key ✅
    → [If not cached] Keychain access → Biometrics/Passcode prompt
    → [If Keychain fails] SecureStore fallback ✅
```

---

## ✅ Testing Checklist

- [x] User with Face ID can use app
- [x] User with Touch ID can use app
- [x] User without biometrics (passcode only) can use app
- [x] User who cancels authentication can still use app
- [x] Expo Go users can use app (SecureStore fallback)
- [x] All vault access points work with fallback

---

## 📝 Notes

1. **Device Passcode is Always Required:**
   - Modern iOS/Android devices require a passcode
   - If user has no passcode, they can't use the app securely
   - In this case, SecureStore fallback provides basic security

2. **Expo Go Compatibility:**
   - Keychain is not available in Expo Go
   - App automatically uses SecureStore fallback
   - This is expected and acceptable for development

3. **Security Trade-offs:**
   - Keychain + MMKV: Most secure, requires authentication
   - SecureStore: Less secure, no authentication required
   - App prioritizes functionality over perfect security in fallback cases

---

## 🎯 Conclusion

**Yes, users without biometrics can still use the app!**

The app automatically falls back to device passcode when biometrics aren't available, ensuring all users can access their wallet securely. If even passcode authentication fails, the app falls back to SecureStore, which still provides basic security through platform-native storage.

**Status:** ✅ **FULLY COMPATIBLE WITH ALL USERS**

