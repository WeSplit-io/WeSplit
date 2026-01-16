# Phantom Auth Verification Checklist

This document helps verify that Phantom authentication is properly enabled in the app.

## ✅ Configuration Checklist

### 1. Provider Setup
- [x] **PhantomSDKProvider is imported** in `App.tsx` (line 7)
- [x] **PhantomSDKProvider wraps the app** in `App.tsx` (line 104)
- [x] Provider is placed correctly in the component tree (before AppProvider)

### 2. Feature Flag Logic
The Phantom auth button visibility depends on:
1. `isPhantomConfigured()` - checks if required config is present
2. `PHANTOM_CONFIG.features.socialLogin` - checks if social login is enabled

**Code Path:**
- `src/config/features.ts` → `getEnvironmentFeatures()` → `PHANTOM_SOCIAL_LOGIN`
- `src/screens/AuthMethods/AuthMethodsScreen.tsx` → `isPhantomSocialLoginEnabled()`

### 3. Required Environment Variables

For **Development** (automatically enabled):
- No env vars needed - Phantom is enabled by default in dev mode

For **Production** (must be set):
```bash
# Required for Phantom SDK to work
EXPO_PUBLIC_PHANTOM_APP_ID=your-app-id-from-phantom-portal
EXPO_PUBLIC_PHANTOM_APP_ORIGIN=https://wesplit.io
EXPO_PUBLIC_PHANTOM_REDIRECT_URI=wesplit://phantom-callback

# Required to show the auth button
EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true
```

### 4. Configuration Flow

```
App.tsx
  └─ PhantomSDKProvider (validates basic config)
      └─ AppProvider
          └─ AuthMethodsScreen
              └─ isPhantomSocialLoginEnabled() check
                  ├─ isPhantomConfigured() ✅
                  └─ PHANTOM_CONFIG.features.socialLogin ✅
                      └─ Shows PhantomAuthButton
```

## 🔍 Debugging Steps

### Step 1: Check if Provider is Rendering
Add this to `App.tsx` temporarily:
```typescript
<PhantomSDKProvider theme="dark" skipPortalCheck={__DEV__}>
  {console.log('🔍 PhantomSDKProvider rendered')}
  <AppProvider>
```

### Step 2: Check Feature Flags
Enable debug logging by setting:
```bash
EXPO_PUBLIC_DEBUG_FEATURES=true
```

This will log:
- Phantom configuration status
- Feature flag values
- Button visibility checks

### Step 3: Verify Environment Variables
Run the verification script:
```bash
node verify-phantom-config.js
```

### Step 4: Check Console Logs
Look for these logs in development:
- `🔍 Phantom Feature Flags Debug:` - Shows feature flag status
- `🔍 Phantom Auth Button Visibility:` - Shows button visibility check
- `🚀 Rendering PhantomProvider with config:` - Shows provider initialization

## 🐛 Common Issues

### Issue 1: Button Not Showing in Production
**Cause:** `EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN` is not set to `'true'`

**Fix:** Set the environment variable:
```bash
EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true
```

### Issue 2: Provider Not Initializing
**Cause:** Missing required config (appId, appOrigin, or redirectUri)

**Fix:** Ensure all three are set:
```bash
EXPO_PUBLIC_PHANTOM_APP_ID=your-app-id-from-phantom-portal
EXPO_PUBLIC_PHANTOM_APP_ORIGIN=https://wesplit.io
EXPO_PUBLIC_PHANTOM_REDIRECT_URI=wesplit://phantom-callback
```

### Issue 3: "Check Team Status" Error
**Cause:** Phantom app is set to "Private" in Phantom Portal

**Fix:** 
1. Visit https://phantom.app/developers
2. Find your app with your App ID from Phantom Portal
3. Contact Phantom support to make it public

## ✅ Verification Test

To verify Phantom auth is working:

1. **In Development:**
   - Button should appear automatically
   - No env vars needed

2. **In Production:**
   - Set `EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true`
   - Set all required config vars
   - Button should appear

3. **Test the Flow:**
   - Tap "Continue with Phantom" button
   - Should open Phantom authentication modal
   - Should allow Google/Apple sign-in
   - Should complete authentication

## 📝 Current Status

Based on code review:

✅ **Provider Setup:** Correctly configured in App.tsx
✅ **Feature Flags:** Logic is correct
✅ **Configuration:** Uses `getEnvVar()` to read from Expo config
✅ **Debug Logging:** Added for troubleshooting

⚠️ **Production Requirement:** Must set `EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true` in production builds

## 🚀 Next Steps

1. **Verify in Development:**
   - Run the app in dev mode
   - Check if Phantom button appears
   - Check console logs for debug info

2. **Verify in Production:**
   - Set all required env vars in EAS build
   - Build production app
   - Verify button appears
   - Test authentication flow

3. **Monitor Logs:**
   - Enable `EXPO_PUBLIC_DEBUG_FEATURES=true` temporarily
   - Check logs for any configuration issues
   - Verify all checks pass
