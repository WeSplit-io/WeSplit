# Production Build Quick Start Guide

**Date:** 2025-01-16  
**Purpose:** Complete guide for building production AAB files locally (without EAS Build)

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Create `.env.production` file

```bash
# Copy the template
cp config/environment/env.production.template .env.production

# Edit and fill in the values
nano .env.production  # or use your favorite editor
```

**Required values to fill:**
- All `EXPO_PUBLIC_FIREBASE_*` variables (get from [Firebase Console](https://console.firebase.google.com/project/wesplit-35186/settings/general))
- At least one RPC API key (recommended for better performance)

### Step 2: Verify Firebase Secrets

```bash
# Run the verification script
./scripts/verify-firebase-secrets.sh
```

### Step 3: Deploy Firebase Functions

```bash
cd services/firebase-functions
firebase deploy --only functions
```

### Step 4: Run Complete Check

```bash
# Comprehensive check of everything
./scripts/check-production-setup.sh
```

### Step 5: Build AAB

```bash
# Option 1: Using EAS (local build)
export APP_ENV=production
export NODE_ENV=production
eas build --platform android --profile production --local

# Option 2: Using Gradle directly
cd android
export APP_ENV=production
export NODE_ENV=production
./gradlew bundleRelease
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Overview

When building locally (not using EAS Build), you need to:

1. ✅ Set up `.env.production` file with all required environment variables
2. ✅ Verify Firebase Functions secrets are set in Firebase
3. ✅ Ensure Firebase Functions are deployed to production
4. ✅ Build the AAB with production environment variables

---

## Step 1: Create `.env.production` File

Create a `.env.production` file in the project root with all required environment variables:

```bash
# Network Configuration (REQUIRED)
EXPO_PUBLIC_NETWORK=mainnet
EXPO_PUBLIC_FORCE_MAINNET=true
EXPO_PUBLIC_DEV_NETWORK=mainnet
EXPO_PUBLIC_USE_PROD_FUNCTIONS=true

# Firebase Configuration (REQUIRED)
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=wesplit-35186.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=wesplit-35186
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=wesplit-35186.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# RPC Configuration (OPTIONAL but RECOMMENDED for better performance)
EXPO_PUBLIC_HELIUS_API_KEY=your-helius-api-key
# OR
EXPO_PUBLIC_ALCHEMY_API_KEY=your-alchemy-api-key
# OR
EXPO_PUBLIC_GETBLOCK_API_KEY=your-getblock-api-key

# Company Wallet (OPTIONAL - if using company wallet features)
EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=your-company-wallet-address

# Social Authentication (OPTIONAL - if using social auth)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
ANDROID_GOOGLE_CLIENT_ID=your-android-google-client-id
IOS_GOOGLE_CLIENT_ID=your-ios-google-client-id
EXPO_PUBLIC_APPLE_CLIENT_ID=your-apple-client-id
EXPO_PUBLIC_TWITTER_CLIENT_ID=your-twitter-client-id
```

**Important:** 
- Replace all placeholder values with actual values
- Never commit `.env.production` to version control (it should be in `.gitignore`)
- Get Firebase config values from [Firebase Console](https://console.firebase.google.com/project/wesplit-35186/settings/general)

---

## Step 2: Verify Firebase Functions Secrets

Firebase Functions use **Firebase Secrets** (different from EAS secrets). These are automatically available to deployed functions.

### Quick Verification

Run the verification script:

```bash
chmod +x scripts/verify-firebase-secrets.sh
./scripts/verify-firebase-secrets.sh
```

### Manual Verification

Check each required secret:

```bash
cd services/firebase-functions

# Check company wallet (REQUIRED for transactions)
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
firebase functions:secrets:access COMPANY_WALLET_SECRET_KEY

# Check email (REQUIRED for email verification)
firebase functions:secrets:access EMAIL_USER
firebase functions:secrets:access EMAIL_PASSWORD

# Check MoonPay (REQUIRED for fiat onramps)
firebase functions:secrets:access MOONPAY_API_KEY
firebase functions:secrets:access MOONPAY_SECRET_KEY
firebase functions:secrets:access MOONPAY_WEBHOOK_SECRET

# Check OpenRouter (REQUIRED for AI service)
firebase functions:secrets:access OPENROUTER_API_KEY
```

### Set Missing Secrets

If any secrets are missing, set them:

```bash
cd services/firebase-functions

# Company Wallet
echo 'HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS
echo '[65,160,52,47,45,137,3,148,31,68,218,138,28,87,159,106,25,146,144,26,62,115,163,200,181,218,153,110,238,93,175,196,247,171,236,126,249,226,121,47,95,94,152,248,83,3,53,129,63,165,55,207,255,128,61,237,73,223,151,87,161,99,247,67]' | firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY

# Email
echo 'wesplit.io@gmail.com' | firebase functions:secrets:set EMAIL_USER
echo 'qzfp qmlm ztdu zlal' | firebase functions:secrets:set EMAIL_PASSWORD

# MoonPay
echo 'pk_live_37P9eF61y7Q7PZZp95q2kozulpBHYv7P' | firebase functions:secrets:set MOONPAY_API_KEY
echo 'sk_live_xANcsPYYjcmU7EGIhZ9go0MKKbBoXH' | firebase functions:secrets:set MOONPAY_SECRET_KEY
echo 'wk_live_BIrcukm9OxPbAzDi6i4KcoewxAag0HBL' | firebase functions:secrets:set MOONPAY_WEBHOOK_SECRET

# OpenRouter
echo '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' | firebase functions:secrets:set OPENROUTER_API_KEY

# Optional: Network configuration
echo 'mainnet' | firebase functions:secrets:set SOLANA_NETWORK
```

See `services/firebase-functions/SECRETS_SETUP.md` for complete list.

---

## Step 3: Deploy Firebase Functions

Ensure Firebase Functions are deployed to production:

```bash
cd services/firebase-functions
firebase deploy --only functions
```

Verify functions are deployed:

```bash
firebase functions:list
```

You should see:
- `processUsdcTransfer`
- `getCompanyWalletAddress`
- `sendVerificationCode`
- `verifyCode`
- And other functions

---

## Step 4: Build Production AAB

### Option 1: Using Expo (Recommended)

```bash
# Set production environment
export APP_ENV=production
export NODE_ENV=production

# Build AAB
eas build --platform android --profile production --local
```

### Option 2: Using Gradle Directly

```bash
cd android

# Set production environment variables
export APP_ENV=production
export NODE_ENV=production

# Build AAB
./gradlew bundleRelease
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Step 5: Verify Build

After building, verify the AAB includes production configuration:

1. **Install the AAB** on a test device
2. **Check app logs** for environment variables:
   ```bash
   adb logcat | grep -i "Configuration Debug"
   ```
   
   You should see actual values (not `${VAR_NAME}`):
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY: 'AIzaSyC...'
   EXPO_PUBLIC_NETWORK: 'mainnet'
   EXPO_PUBLIC_USE_PROD_FUNCTIONS: 'true'
   ```

3. **Test a transaction** to ensure Firebase Functions are accessible

---

## Troubleshooting

### Issue: Environment variables show as `${VAR_NAME}` in logs

**Cause:** `.env.production` not loaded or variables not set

**Solution:**
1. Verify `.env.production` exists in project root
2. Check variables are set (no empty values)
3. Rebuild with `--clear-cache` flag
4. Verify `app.config.js` is reading from `.env.production`

### Issue: Transactions fail with "internal" error

**Possible Causes:**
1. Firebase Functions not deployed
2. Firebase Secrets not set
3. `EXPO_PUBLIC_USE_PROD_FUNCTIONS` not set to `true`

**Solution:**
1. Verify functions are deployed: `firebase functions:list`
2. Verify secrets are set: `./scripts/verify-firebase-secrets.sh`
3. Check `.env.production` has `EXPO_PUBLIC_USE_PROD_FUNCTIONS=true`
4. Check Firebase Functions logs: `firebase functions:log`

### Issue: Firebase initialization fails

**Cause:** Firebase environment variables missing or incorrect

**Solution:**
1. Verify all Firebase variables in `.env.production`
2. Get correct values from [Firebase Console](https://console.firebase.google.com/project/wesplit-35186/settings/general)
3. Rebuild after updating `.env.production`

### Issue: "Secret not found" errors in Firebase Functions

**Cause:** Firebase Secrets not set in Firebase Secret Manager

**Solution:**
1. Run `./scripts/verify-firebase-secrets.sh` to check which secrets are missing
2. Set missing secrets (see Step 2)
3. Redeploy functions: `cd services/firebase-functions && firebase deploy --only functions`

---

## Quick Checklist

Before building production AAB:

- [ ] `.env.production` file exists with all required variables
- [ ] All Firebase environment variables are set correctly
- [ ] `EXPO_PUBLIC_USE_PROD_FUNCTIONS=true` in `.env.production`
- [ ] `EXPO_PUBLIC_NETWORK=mainnet` in `.env.production`
- [ ] Firebase Functions secrets are set (verified with script)
- [ ] Firebase Functions are deployed to production
- [ ] Test transaction works in production build

---

## Key Differences: Local Build vs EAS Build

| Aspect | Local Build | EAS Build |
|--------|-------------|-----------|
| Environment Variables | `.env.production` file | EAS Secrets |
| Firebase Secrets | Firebase Secret Manager | Firebase Secret Manager (same) |
| Build Process | Local machine | EAS servers |
| Validation | Manual verification | Automatic validation scripts |

**Note:** Firebase Functions secrets are the same regardless of build method - they're always managed via Firebase Secret Manager.

---

## Additional Resources

- [Firebase Secrets Setup](./FIREBASE_SECRETS_SETUP_GUIDE.md)
- [Firebase Functions Network Setup](./FIREBASE_FUNCTIONS_NETWORK_SETUP.md)
- [Troubleshooting Transaction Errors](./TROUBLESHOOTING_TRANSACTION_ERRORS.md)
- [Network Configuration](../NETWORK_CONFIGURATION.md)

