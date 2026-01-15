# Phantom Auth Production Setup

## Changes Made

All `__DEV__` flags blocking Phantom authentication in production have been removed. Phantom auth is now enabled for production when properly configured via environment variables.

### Files Modified

1. **src/services/auth/PhantomAuthService.ts**
   - ✅ Removed `__DEV__` check blocking `initialize()` method
   - ✅ Removed `__DEV__` check blocking `processAuthenticatedUser()` method
   - Phantom auth now works in production when configured

2. **src/config/features.ts**
   - ✅ Updated to enable Phantom features in production based on environment variables
   - Removed hardcoded `false` values for production
   - Features now enabled when Phantom is properly configured

3. **src/config/env.ts**
   - ✅ Updated feature flags to work in production
   - `autoConfirm` and `multiChain` now respect env vars in all environments
   - `socialLogin` and `splitWallets` enabled via env vars in production

4. **src/services/blockchain/wallet/phantomConnectService.ts**
   - ✅ Removed `__DEV__` check blocking `connect()` method
   - Connection now works in production when configured

5. **src/hooks/usePhantomWallet.ts**
   - ✅ Replaced `__DEV__` check with feature flag check
   - Now uses `isPhantomEnabled()` from feature flags
   - Returns proper error message when not configured

6. **src/screens/AuthMethods/AuthMethodsScreen.tsx**
   - ✅ Removed dev-only UI warning about "App is Private"
   - Cleaner production UI

7. **src/providers/PhantomSDKProvider.tsx**
   - ✅ Updated comments to clarify production support
   - Provider works in production when config is valid

---

## Production Configuration Required

To enable Phantom authentication in production, set the following environment variables:

### Required Environment Variables

```bash
# Phantom App Configuration (Required)
EXPO_PUBLIC_PHANTOM_APP_ID=your-app-id-from-phantom-portal
EXPO_PUBLIC_PHANTOM_APP_ORIGIN=https://wesplit.io
EXPO_PUBLIC_PHANTOM_REDIRECT_URI=wesplit://phantom-callback
```

### Optional Feature Flags (Enable as needed)

```bash
# Enable Phantom Social Login (Google/Apple) in production
EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true

# Enable Phantom Split Wallets in production
EXPO_PUBLIC_PHANTOM_SPLIT_WALLETS=true

# Enable Auto-Confirm transactions (optional)
EXPO_PUBLIC_PHANTOM_AUTO_CONFIRM=false

# Enable Multi-Chain support (optional)
EXPO_PUBLIC_PHANTOM_MULTI_CHAIN=false
```

---

## Setting Environment Variables for EAS Build

### Option 1: EAS Secrets (Recommended)

```bash
# Set required Phantom configuration
eas env:create --name EXPO_PUBLIC_PHANTOM_APP_ID --value "your-app-id-from-phantom-portal" --scope project --visibility plaintext
eas secret:create --scope project --name EXPO_PUBLIC_PHANTOM_APP_ORIGIN --value "https://wesplit.io"
eas secret:create --scope project --name EXPO_PUBLIC_PHANTOM_REDIRECT_URI --value "wesplit://phantom-callback"

# Set feature flags
eas secret:create --scope project --name EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN --value "true"
eas secret:create --scope project --name EXPO_PUBLIC_PHANTOM_SPLIT_WALLETS --value "true"
```

### Option 2: Environment File

Add to your production environment file (e.g., `.env.production`):

```bash
EXPO_PUBLIC_PHANTOM_APP_ID=your-app-id-from-phantom-portal
EXPO_PUBLIC_PHANTOM_APP_ORIGIN=https://wesplit.io
EXPO_PUBLIC_PHANTOM_REDIRECT_URI=wesplit://phantom-callback
EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true
EXPO_PUBLIC_PHANTOM_SPLIT_WALLETS=true
```

---

## Phantom Portal Configuration

### Important: App Status

Your Phantom app ID: `[Your App ID from Phantom Portal]`

**Before production launch, ensure:**

1. ✅ **App is Public** (not "Private")
   - Visit: https://phantom.app/developers
   - Find your app with your App ID
   - If it shows "Private", contact Phantom support to make it public
   - Private apps only work for team members

2. ✅ **Redirect URI is configured**
   - Should match: `wesplit://phantom-callback`
   - Configured in Phantom Portal

3. ✅ **App Origin is correct**
   - Should be: `https://wesplit.io`
   - Configured in Phantom Portal

---

## Verification Checklist

Before deploying to production:

- [ ] Phantom App ID is set in environment variables
- [ ] Phantom App Origin is set to `https://wesplit.io`
- [ ] Phantom Redirect URI is set to `wesplit://phantom-callback`
- [ ] Phantom app is **Public** (not Private) in Phantom Portal
- [ ] `EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true` if you want social login enabled
- [ ] `EXPO_PUBLIC_PHANTOM_SPLIT_WALLETS=true` if you want split wallets enabled
- [ ] Test authentication flow in production build
- [ ] Verify deep link `wesplit://phantom-callback` works correctly

---

## How It Works Now

### Development Mode
- Phantom features enabled by default (if configured)
- Can test with unapproved app IDs (via `skipPortalCheck`)
- Dev-only warnings removed from UI

### Production Mode
- Phantom features enabled **only** when:
  1. Environment variables are set
  2. Phantom app is properly configured
  3. Feature flags are enabled via env vars
- No hardcoded blocks - fully controlled by configuration
- Clean production UI without dev warnings

---

## Testing

### Local Testing (Development)
```bash
# Set env vars in .env file
EXPO_PUBLIC_PHANTOM_APP_ID=your-app-id-from-phantom-portal
EXPO_PUBLIC_PHANTOM_APP_ORIGIN=https://wesplit.io
EXPO_PUBLIC_PHANTOM_REDIRECT_URI=wesplit://phantom-callback
EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true

# Run app
npm start
```

### Production Build Testing
```bash
# Build with production profile
eas build --platform ios --profile production
eas build --platform android --profile production

# Or test locally with production env
EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true npm start
```

---

## Troubleshooting

### "Phantom authentication is disabled"
- Check that `EXPO_PUBLIC_PHANTOM_APP_ID` is set
- Check that `EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true` (if using social login)
- Verify environment variables are loaded in production build

### "App is Private" error
- Visit https://phantom.app/developers
- Check app status - must be "Public" for production
- Contact Phantom support if needed

### "Phantom integration not configured"
- Verify all required environment variables are set
- Check that `isPhantomConfigured()` returns true
- Review Phantom Portal configuration

---

## Next Steps

1. **Set environment variables** in EAS secrets or production env file
2. **Verify Phantom Portal** - ensure app is Public
3. **Test in production build** before full release
4. **Monitor authentication flow** after deployment

---

**Status:** ✅ Phantom Auth is now production-ready and enabled when properly configured!
