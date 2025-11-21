# Production Build Quick Start

**For Local Production Builds (without EAS Build)**

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

If any secrets are missing, set them:

```bash
cd services/firebase-functions

# Company Wallet (REQUIRED for transactions)
echo 'HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS
echo '[65,160,52,47,45,137,3,148,31,68,218,138,28,87,159,106,25,146,144,26,62,115,163,200,181,218,153,110,238,93,175,196,247,171,236,126,249,226,121,47,95,94,152,248,83,3,53,129,63,165,55,207,255,128,61,237,73,223,151,87,161,99,247,67]' | firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY

# Email (REQUIRED for email verification)
echo 'wesplit.io@gmail.com' | firebase functions:secrets:set EMAIL_USER
echo 'qzfp qmlm ztdu zlal' | firebase functions:secrets:set EMAIL_PASSWORD

# MoonPay (REQUIRED for fiat onramps)
echo 'pk_live_37P9eF61y7Q7PZZp95q2kozulpBHYv7P' | firebase functions:secrets:set MOONPAY_API_KEY
echo 'sk_live_xANcsPYYjcmU7EGIhZ9go0MKKbBoXH' | firebase functions:secrets:set MOONPAY_SECRET_KEY
echo 'wk_live_BIrcukm9OxPbAzDi6i4KcoewxAag0HBL' | firebase functions:secrets:set MOONPAY_WEBHOOK_SECRET

# OpenRouter (REQUIRED for AI service)
echo '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' | firebase functions:secrets:set OPENROUTER_API_KEY
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

This will verify:
- ✅ `.env.production` file exists and has all required variables
- ✅ Firebase Functions secrets are set
- ✅ Firebase Functions are deployed

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

## ✅ Verification Checklist

Before building, make sure:

- [ ] `.env.production` file exists with all required variables
- [ ] `EXPO_PUBLIC_NETWORK=mainnet` in `.env.production`
- [ ] `EXPO_PUBLIC_USE_PROD_FUNCTIONS=true` in `.env.production`
- [ ] All Firebase environment variables are set (not empty)
- [ ] Firebase Functions secrets are set (verified with script)
- [ ] Firebase Functions are deployed

---

## 🔍 Troubleshooting

### Check Everything at Once

```bash
./scripts/check-production-setup.sh
```

### Check Firebase Secrets Only

```bash
./scripts/verify-firebase-secrets.sh
```

### Common Issues

**Issue:** Environment variables show as `${VAR_NAME}` in logs
- **Fix:** Make sure `.env.production` exists and has all values filled in

**Issue:** Transactions fail with "internal" error
- **Fix:** 
  1. Verify Firebase Functions are deployed: `firebase functions:list`
  2. Verify secrets are set: `./scripts/verify-firebase-secrets.sh`
  3. Check Firebase Functions logs: `firebase functions:log`

**Issue:** Firebase initialization fails
- **Fix:** Verify all `EXPO_PUBLIC_FIREBASE_*` variables in `.env.production` are correct

---

## 📚 Detailed Documentation

- [Local Production Build Setup Guide](docs/guides/LOCAL_PRODUCTION_BUILD_SETUP.md)
- [Firebase Secrets Setup](services/firebase-functions/SECRETS_SETUP.md)
- [Network Configuration](NETWORK_CONFIGURATION.md)

---

## 🆘 Need Help?

1. Run `./scripts/check-production-setup.sh` to see what's missing
2. Check the detailed guides in `docs/guides/`
3. Verify Firebase Functions logs: `firebase functions:log`

