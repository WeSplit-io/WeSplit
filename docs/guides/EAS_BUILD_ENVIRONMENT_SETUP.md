# EAS Build Environment Variables Setup Guide

**Date:** 2025-01-16  
**Purpose:** Guide to configure environment variables for production EAS builds

---

## Problem

When building production AAB files with EAS Build, environment variables are not being substituted and appear as literal strings like `${EXPO_PUBLIC_FIREBASE_API_KEY}`. This causes:

- Firebase initialization failures
- Transaction processing errors
- Network configuration issues
- App crashes on startup

---

## Solution

EAS Build requires environment variables to be set in one of two ways:

1. **EAS Secrets** (for sensitive values) - Recommended for production
2. **eas.json env section** (for non-sensitive values)

---

## Step 1: Set EAS Secrets

For sensitive values like Firebase API keys, set them as EAS secrets:

```bash
# Firebase Configuration
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-firebase-api-key"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "wesplit-35186.firebaseapp.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "wesplit-35186"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "wesplit-35186.appspot.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "your-sender-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "your-app-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID --value "your-measurement-id"

# Optional: RPC API Keys (recommended for better performance)
eas secret:create --scope project --name EXPO_PUBLIC_HELIUS_API_KEY --value "your-helius-key"
# OR
eas secret:create --scope project --name EXPO_PUBLIC_ALCHEMY_API_KEY --value "your-alchemy-key"
# OR
eas secret:create --scope project --name EXPO_PUBLIC_GETBLOCK_API_KEY --value "your-getblock-key"

# Optional: Company Wallet (if needed)
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value "your-company-wallet-address"
```

### Verify Secrets Are Set

```bash
eas secret:list
```

You should see all the secrets you just created.

---

## Step 2: Verify eas.json Configuration

The `eas.json` file already includes non-sensitive environment variables in the `env` section for production builds:

```json
{
  "build": {
    "production": {
      "env": {
        "NODE_ENV": "production",
        "APP_ENV": "production",
        "EXPO_PUBLIC_NETWORK": "mainnet",
        "EXPO_PUBLIC_FORCE_MAINNET": "true",
        "EXPO_PUBLIC_DEV_NETWORK": "mainnet",
        "EXPO_PUBLIC_USE_PROD_FUNCTIONS": "true"
      }
    }
  }
}
```

**Important:** `EXPO_PUBLIC_USE_PROD_FUNCTIONS=true` is now set in production builds to ensure the app uses production Firebase Functions instead of trying to connect to an emulator.

---

## Step 3: Build and Test

After setting secrets, build your production AAB:

```bash
eas build --platform android --profile production
```

The build will automatically:
1. Validate network configuration
2. Validate environment variables are set
3. Fail early if required variables are missing

---

## Step 4: Verify in App Logs

After installing the production build, check the app logs to verify environment variables are properly substituted:

**Good (variables are substituted):**
```
EXPO_PUBLIC_FIREBASE_API_KEY: 'AIzaSyC...'
EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'wesplit-35186'
```

**Bad (variables are not substituted):**
```
EXPO_PUBLIC_FIREBASE_API_KEY: '${EXPO_PUBLIC_FIREBASE_API_KEY}'
EXPO_PUBLIC_FIREBASE_PROJECT_ID: '${EXPO_PUBLIC_FIREBASE_PROJECT_ID}'
```

---

## Troubleshooting

### Issue: Environment variables still showing as `${VAR_NAME}`

**Cause:** Secrets not set or build cache issue

**Solution:**
1. Verify secrets are set: `eas secret:list`
2. Clear build cache: `eas build --platform android --profile production --clear-cache`
3. Rebuild

### Issue: "Missing required environment variables" error during build

**Cause:** Required secrets not set

**Solution:**
1. Check which variables are missing from the error message
2. Set them as EAS secrets (see Step 1)
3. Rebuild

### Issue: Transactions work in emulator but fail in production

**Possible Causes:**
1. `EXPO_PUBLIC_USE_PROD_FUNCTIONS` not set to `true` in production
2. Firebase Functions not deployed
3. Firebase Functions secrets not set

**Solution:**
1. Verify `EXPO_PUBLIC_USE_PROD_FUNCTIONS=true` in `eas.json` production profile
2. Deploy Firebase Functions: `cd services/firebase-functions && firebase deploy --only functions`
3. Verify Firebase Functions secrets are set:
   ```bash
   cd services/firebase-functions
   firebase functions:secrets:access COMPANY_WALLET_ADDRESS
   firebase functions:secrets:access COMPANY_WALLET_SECRET_KEY
   ```

### Issue: Firebase initialization fails

**Cause:** Firebase environment variables not set or incorrect

**Solution:**
1. Verify all Firebase secrets are set: `eas secret:list | grep FIREBASE`
2. Check Firebase Console for correct values
3. Rebuild with cleared cache

---

## Required vs Optional Environment Variables

### Required (Must be set as EAS secrets)
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

### Optional but Recommended
- `EXPO_PUBLIC_HELIUS_API_KEY` - Better RPC performance
- `EXPO_PUBLIC_ALCHEMY_API_KEY` - Alternative RPC provider
- `EXPO_PUBLIC_GETBLOCK_API_KEY` - Alternative RPC provider
- `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS` - If using company wallet features

### Set in eas.json (Non-sensitive)
- `EXPO_PUBLIC_NETWORK` - Always `mainnet` for production
- `EXPO_PUBLIC_USE_PROD_FUNCTIONS` - Always `true` for production
- `NODE_ENV` - Always `production` for production builds

---

## Quick Reference

```bash
# List all secrets
eas secret:list

# Create a secret
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-value"

# Delete a secret
eas secret:delete --name EXPO_PUBLIC_FIREBASE_API_KEY

# Build with validation
eas build --platform android --profile production
```

---

## Additional Resources

- [EAS Secrets Documentation](https://docs.expo.dev/build-reference/variables/)
- [Firebase Functions Setup](./FIREBASE_FUNCTIONS_NETWORK_SETUP.md)
- [Network Configuration](./NETWORK_CONFIGURATION.md)

