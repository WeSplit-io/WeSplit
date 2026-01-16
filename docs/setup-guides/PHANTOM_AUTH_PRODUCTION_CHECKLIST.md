# Phantom Auth Production Checklist

## ✅ End-to-End Verification

### 1. Provider Setup
**Location:** `App.tsx` line 104
- ✅ `PhantomSDKProvider` wraps the entire app
- ✅ Provider is always rendered (not conditionally removed in production)

### 2. Configuration Reading
**Location:** `src/config/env.ts` lines 265-280
- ✅ Uses `getEnvVar()` helper to read from Expo config
- ✅ Falls back to `process.env` if not in Expo config
- ✅ Production detection: `isDevelopment ? true : (getEnvVar(...) === 'true')`

### 3. Feature Flag Logic
**Location:** `src/config/features.ts` lines 58-60
- ✅ `PHANTOM_SDK_ENABLED: isPhantomConfigValid` (checks appId, appOrigin, redirectUri)
- ✅ `PHANTOM_SOCIAL_LOGIN: isPhantomConfigValid && PHANTOM_CONFIG.features.socialLogin`
- ✅ Both conditions must be true for button to show

### 4. Button Visibility
**Location:** `src/screens/AuthMethods/AuthMethodsScreen.tsx` lines 768-785
- ✅ Checks `isPhantomSocialLoginEnabled()` which requires:
  1. `isPhantomConfigValid` (basic config present)
  2. `PHANTOM_CONFIG.features.socialLogin === true` (feature flag enabled)

### 5. Provider Rendering
**Location:** `src/providers/PhantomSDKProvider.tsx` lines 81-95
- ✅ Renders if `hasBasicConfig` (appId, appOrigin, redirectUri all present)
- ✅ Works in both dev and production
- ✅ Debug logging available when `EXPO_PUBLIC_DEBUG_FEATURES=true`

## 🔧 Required Environment Variables for Production

### Critical Variables (MUST be set)

#### 1. Basic Phantom Configuration
```bash
# Get from https://portal.phantom.app after registering your app
EXPO_PUBLIC_PHANTOM_APP_ID=your-app-id-from-phantom-portal
EXPO_PUBLIC_PHANTOM_APP_ORIGIN=https://wesplit.io
EXPO_PUBLIC_PHANTOM_REDIRECT_URI=wesplit://phantom-callback
```

#### 2. Enable Social Login Feature
```bash
# Set to 'true' to enable Phantom social login button in production
EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true
```

### Optional Feature Flags
```bash
# Enable split wallets feature (optional)
EXPO_PUBLIC_PHANTOM_SPLIT_WALLETS=false

# Enable auto-confirm transactions (optional)
EXPO_PUBLIC_PHANTOM_AUTO_CONFIRM=false

# Enable multi-chain support (optional)
EXPO_PUBLIC_PHANTOM_MULTI_CHAIN=false
```

### Debug Mode (for troubleshooting)
```bash
# Enable debug logging to see Phantom config status
EXPO_PUBLIC_DEBUG_FEATURES=true
```

## 📝 How to Set Environment Variables for Production Build

### Option 1: EAS Secrets (Recommended for Production)

```bash
# Set basic Phantom configuration
# NOTE: Use --visibility plaintext for EXPO_PUBLIC_* variables (they're compiled into the app)
eas env:create --name EXPO_PUBLIC_PHANTOM_APP_ID --value "your-app-id" --scope project --visibility plaintext
eas env:create --name EXPO_PUBLIC_PHANTOM_APP_ORIGIN --value "https://wesplit.io" --scope project --visibility plaintext
eas env:create --name EXPO_PUBLIC_PHANTOM_REDIRECT_URI --value "wesplit://phantom-callback" --scope project --visibility plaintext

# Enable social login feature
eas env:create --name EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN --value "true" --scope project --visibility plaintext

# Optional: Enable debug mode for troubleshooting
eas env:create --name EXPO_PUBLIC_DEBUG_FEATURES --value "true" --scope project --visibility plaintext
```

### Option 2: Environment File (for local builds)

Create or update `.env` file in project root:

```bash
# Phantom Configuration
EXPO_PUBLIC_PHANTOM_APP_ID=your-app-id-from-phantom-portal
EXPO_PUBLIC_PHANTOM_APP_ORIGIN=https://wesplit.io
EXPO_PUBLIC_PHANTOM_REDIRECT_URI=wesplit://phantom-callback

# Feature Flags
EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true
EXPO_PUBLIC_PHANTOM_SPLIT_WALLETS=false
EXPO_PUBLIC_PHANTOM_AUTO_CONFIRM=false
EXPO_PUBLIC_PHANTOM_MULTI_CHAIN=false

# Debug (optional)
EXPO_PUBLIC_DEBUG_FEATURES=false
```

**Note:** `.env` files are NOT used in EAS builds. Use EAS secrets instead.

### Option 3: app.config.js (Not Recommended)

You can hardcode values in `app.config.js`, but this is NOT recommended for production as it exposes values in version control.

## ✅ Verification Steps

### Before Building

1. **Check Phantom Portal Registration**
   - Visit https://portal.phantom.app
   - Verify your app is registered
   - Copy your App ID
   - Verify redirect URI matches: `wesplit://phantom-callback`

2. **Set EAS Environment Variables**
   ```bash
   # Verify environment variables are set
   eas env:list
   # Select "production" when prompted
   ```

3. **Test Configuration (Development)**
   ```bash
   # Set in .env for local testing
   EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true
   EXPO_PUBLIC_DEBUG_FEATURES=true
   
   # Run app and check console logs
   # Look for: "🔍 Phantom Feature Flags Debug"
   # Look for: "🔍 Phantom Auth Button Visibility"
   ```

### After Building

1. **Check Debug Logs** (if `EXPO_PUBLIC_DEBUG_FEATURES=true`)
   - Look for "🔍 Phantom Feature Flags Debug" in console
   - Verify `phantomAppId: ✅ Set`
   - Verify `socialLogin: true`

2. **Verify Button Visibility**
   - Navigate to Auth Methods screen
   - Check console for "🔍 Phantom Auth Button Visibility"
   - Verify `isEnabled: true`
   - Button should be visible

3. **Test Authentication Flow**
   - Click Phantom auth button
   - Should open Phantom wallet
   - Should redirect back to app after authentication

## 🐛 Troubleshooting

### Button Not Showing

1. **Check if basic config is present:**
   - `EXPO_PUBLIC_PHANTOM_APP_ID` must be set
   - `EXPO_PUBLIC_PHANTOM_APP_ORIGIN` must be set
   - `EXPO_PUBLIC_PHANTOM_REDIRECT_URI` must be set

2. **Check if feature flag is enabled:**
   - `EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN` must be `'true'` (string, not boolean)

3. **Enable debug mode:**
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_DEBUG_FEATURES --value "true"
   ```
   Then rebuild and check console logs

### Provider Not Rendering

1. **Check console for warnings:**
   - Look for "Phantom SDK missing basic configuration"
   - Verify all three config values are present

2. **Verify EAS environment variables:**
   ```bash
   eas env:list
   # Select "production" when prompted
   ```

### Authentication Fails

1. **Check redirect URI:**
   - Must match exactly: `wesplit://phantom-callback`
   - Must be registered in Phantom Portal

2. **Check app origin:**
   - Must match your domain: `https://wesplit.io`
   - Must be registered in Phantom Portal

## 📋 Complete Environment Variables List

### Required for Phantom Auth
- `EXPO_PUBLIC_PHANTOM_APP_ID` - **REQUIRED**
- `EXPO_PUBLIC_PHANTOM_APP_ORIGIN` - **REQUIRED** (defaults to `https://wesplit.io`)
- `EXPO_PUBLIC_PHANTOM_REDIRECT_URI` - **REQUIRED** (defaults to `wesplit://phantom-callback`)
- `EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN` - **REQUIRED** (set to `'true'` to enable)

### Optional Phantom Features
- `EXPO_PUBLIC_PHANTOM_SPLIT_WALLETS` - Enable split wallets (default: `false`)
- `EXPO_PUBLIC_PHANTOM_AUTO_CONFIRM` - Auto-confirm transactions (default: `false`)
- `EXPO_PUBLIC_PHANTOM_MULTI_CHAIN` - Multi-chain support (default: `false`)

### Debug & Troubleshooting
- `EXPO_PUBLIC_DEBUG_FEATURES` - Enable debug logging (default: `false`)

## 🎯 Quick Start for Production

```bash
# 1. Get App ID from Phantom Portal
# Visit: https://portal.phantom.app

# 2. Set required EAS environment variables (use plaintext for EXPO_PUBLIC_* vars)
eas env:create --name EXPO_PUBLIC_PHANTOM_APP_ID --value "your-app-id" --scope project --visibility plaintext
# Select "production" when prompted

eas env:create --name EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN --value "true" --scope project --visibility plaintext
# Select "production" when prompted

# 3. Verify environment variables
eas env:list
# Select "production" when prompted

# 4. Build for production
eas build --platform ios --profile production
eas build --platform android --profile production
```

## ✅ Verification Checklist

- [ ] App registered in Phantom Portal
- [ ] `EXPO_PUBLIC_PHANTOM_APP_ID` set in EAS secrets
- [ ] `EXPO_PUBLIC_PHANTOM_APP_ORIGIN` set (or using default)
- [ ] `EXPO_PUBLIC_PHANTOM_REDIRECT_URI` set (or using default)
- [ ] `EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN` set to `'true'` in EAS secrets
- [ ] Redirect URI matches Phantom Portal configuration
- [ ] App origin matches Phantom Portal configuration
- [ ] Built production app with secrets
- [ ] Verified button appears in Auth Methods screen
- [ ] Tested authentication flow end-to-end
