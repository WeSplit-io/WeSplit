# 🔧 Production Keychain & MMKV Setup Guide

## Current Status

**Issue Found:** The native modules `react-native-keychain` and `react-native-mmkv` are **NOT installed** in your `package.json`.

**Current State:**
- ✅ Code is written to support Keychain/MMKV
- ❌ Packages are not installed
- ✅ Fallback to SecureStore works (current behavior)

**What This Means:**
- In **Expo Go**: Falls back to SecureStore (expected)
- In **Production builds**: Will also fall back to SecureStore (not optimal)
- **To use native Keychain/MMKV**: Need to install packages first

---

## 📦 Installation Required

### **Step 1: Install Native Modules**

```bash
# Install react-native-keychain for hardware-backed keychain
npm install react-native-keychain

# Install react-native-mmkv for fast encrypted storage
npm install react-native-mmkv
```

### **Step 2: Configure for Expo**

Since you're using Expo, you need to ensure these native modules are properly configured:

```bash
# Run prebuild to generate native code
npx expo prebuild --clean
```

### **Step 3: Rebuild Native Apps**

After installing native modules, you **must** rebuild your app:

```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android

# Or use EAS Build
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## ✅ Verification After Installation

### **How to Verify It's Working:**

1. **Check Logs:**
   - ❌ Should NOT see: `[WARN] secureVault: Keychain not available`
   - ❌ Should NOT see: `[WARN] secureVault: MMKV not available`
   - ✅ Should see: `[DEBUG] Found wallet in secure vault` (without warnings)

2. **Storage Behavior:**
   - **Primary Path:** Keychain + MMKV (encrypted)
   - **Fallback:** SecureStore (if Keychain/MMKV fails)
   - **Both work in production builds**

---

## 🏗️ How It Works in Production

### **Storage Hierarchy (After Installation):**

1. **Primary Path (Production):**
   ```typescript
   // secureVault.ts will use:
   const key = await getOrCreateAesKey(); // Keychain (hardware-backed)
   const kv = await getStorage(); // MMKV (fast encrypted storage)
   
   // Encrypt with AES-256-GCM
   kv.set(`${name}_ct_${userId}`, enc.ct); // Encrypted data
   kv.set(`${name}_iv_${userId}`, enc.iv); // IV
   ```

2. **Fallback Path (Always Available):**
   ```typescript
   // If Keychain/MMKV unavailable, falls back to:
   await SecureStore.setItemAsync(k, value, {
     keychainService: 'WeSplitWalletData',
   });
   ```

### **Security Benefits in Production:**

✅ **Hardware-Backed Encryption:**
- iOS: Uses Secure Enclave (if available)
- Android: Uses Hardware Security Module (HSM)
- Better security than software-only encryption

✅ **Performance:**
- MMKV is much faster than SecureStore
- Synchronous reads (no async overhead)
- Better for frequently accessed data

✅ **Reliability:**
- Keychain persists across app updates
- MMKV persists across app updates
- More reliable than SecureStore alone

---

## 📋 Implementation Checklist

### **Before Production:**

- [ ] Install `react-native-keychain`
- [ ] Install `react-native-mmkv`
- [ ] Run `npx expo prebuild --clean`
- [ ] Rebuild native apps (development build)
- [ ] Test Keychain/MMKV availability
- [ ] Verify no warnings in logs
- [ ] Test wallet persistence
- [ ] Test wallet recovery
- [ ] Build production app

### **Verification Steps:**

1. **Build Development Build:**
   ```bash
   eas build --platform ios --profile development
   ```

2. **Test in Development Build:**
   - Check logs for Keychain/MMKV warnings
   - Verify wallet storage works
   - Test wallet recovery

3. **Build Production:**
   ```bash
   eas build --platform all --profile production
   ```

---

## 🔍 Code Analysis

### **Current Code (Already Correct):**

```typescript
// secureVault.ts - Already supports both paths
async store(userId: string, name: 'mnemonic' | 'privateKey', value: string) {
  // Try Keychain + MMKV first
  const key = await getOrCreateAesKey(); // Keychain
  const kv = await getStorage(); // MMKV
  
  if (key && kv) {
    // Use hardware-backed encryption ✅
    const enc = await encryptAesGcm(key, value);
    kv.set(`${name}_ct_${userId}`, enc.ct);
    kv.set(`${name}_iv_${userId}`, enc.iv);
    return true;
  }
  
  // Fallback to SecureStore ✅
  await SecureStore.setItemAsync(k, value, {
    keychainService: 'WeSplitWalletData',
  });
}
```

**The code is already correct!** It just needs the packages installed.

---

## 🎯 Expected Behavior After Installation

### **Expo Go:**
- ❌ Keychain/MMKV not available (native modules)
- ✅ Falls back to SecureStore
- ✅ Works correctly (current behavior)

### **Development Build:**
- ✅ Keychain/MMKV available
- ✅ Uses hardware-backed encryption
- ✅ Better security and performance
- ✅ No warnings in logs

### **Production Build:**
- ✅ Keychain/MMKV available
- ✅ Uses hardware-backed encryption
- ✅ Best security and performance
- ✅ No warnings in logs

---

## 📝 Package.json Update

After installation, your `package.json` should include:

```json
{
  "dependencies": {
    "react-native-keychain": "^8.1.2",
    "react-native-mmkv": "^2.12.2",
    "expo-secure-store": "~15.0.7"
  }
}
```

---

## ⚠️ Important Notes

### **1. Native Modules Require Rebuild:**
- Installing native modules requires a **full rebuild**
- Cannot use Expo Go after installation
- Must use development build or production build

### **2. Expo Compatibility:**
- Both packages are compatible with Expo
- Need to run `expo prebuild` after installation
- Native code will be generated automatically

### **3. Migration:**
- Existing wallets in SecureStore will continue to work
- New wallets will use Keychain/MMKV
- Both storage methods can coexist
- Recovery service checks both locations

---

## 🚀 Quick Start

```bash
# 1. Install packages
npm install react-native-keychain react-native-mmkv

# 2. Prebuild native code
npx expo prebuild --clean

# 3. Build development build
eas build --platform ios --profile development

# 4. Test in development build
# Verify no warnings, wallet works

# 5. Build production
eas build --platform all --profile production
```

---

## ✅ Summary

**Current State:**
- ✅ Code supports Keychain/MMKV
- ❌ Packages not installed
- ✅ SecureStore fallback works

**After Installation:**
- ✅ Keychain/MMKV will be used in production
- ✅ Hardware-backed encryption enabled
- ✅ Better security and performance
- ✅ No warnings in logs

**Answer to Your Question:**
> "In production I may be able to use the native keychain and the native mmkv to store the data right?"

**YES, but you need to install the packages first!** Once installed and the app is rebuilt, the native Keychain and MMKV will be used automatically in production builds.

---

**Last Updated:** ${new Date().toISOString()}

