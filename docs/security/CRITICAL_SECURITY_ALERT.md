# 🚨 CRITICAL SECURITY ALERT

## Exposed Secrets in EAS Environment Variables

**Date:** Immediate Action Required  
**Severity:** CRITICAL

## ⚠️ Exposed Secrets

The following **CRITICAL** secrets are stored in EAS environment variables with `EXPO_PUBLIC_*` prefix, which means they are **compiled into your app bundle** and **visible to anyone** who inspects your app:

### 1. 🔴 CRITICAL: Company Wallet Private Key
```
EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY=[70,157,193,63,...]
```
**Risk:** This is a **PRIVATE KEY** that can be used to control your company wallet and steal funds.

**Action Required:**
1. **IMMEDIATELY** generate a new company wallet
2. Transfer any funds from the old wallet
3. Update `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS` with the new address
4. Store the new secret key in Firebase Functions secrets (NOT EAS)

### 2. 🔴 CRITICAL: Google OAuth Client Secret
```
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=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
```
**Risk:** Anyone can use this to impersonate your app in OAuth flows.

**Action Required:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Regenerate the OAuth client secret
4. Store new secret in Firebase Functions secrets (NOT EAS)

### 3. 🔴 CRITICAL: Twitter OAuth Client Secret
```
EXPO_PUBLIC_TWITTER_CLIENT_SECRET=jIBIQfwtExp-Ap4x4WKkleqG1SfWKLXdsNscHIS0uZZmQugJSU
```
**Risk:** Anyone can use this to impersonate your app in OAuth flows.

**Action Required:**
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Regenerate the OAuth client secret
3. Store new secret in Firebase Functions secrets (NOT EAS)

### 4. 🔴 CRITICAL: MoonPay Secret Key
```
MOONPAY_SECRET_KEY=sk_live_xANcsPYYjcmU7EGIhZ9go0MKKbBoXH
```
**Risk:** Anyone can use this to make API calls to MoonPay on your behalf.

**Action Required:**
1. Go to [MoonPay Dashboard](https://dashboard.moonpay.com/)
2. Regenerate the secret key
3. Store new secret in Firebase Functions secrets (NOT EAS)

### 5. 🔴 CRITICAL: MoonPay Webhook Secret
```
MOONPAY_WEBHOOK_SECRET=wk_live_BIrcukm9OxPbAzDi6i4KcoewxAag0HBL
```
**Risk:** Anyone can forge webhook requests from MoonPay.

**Action Required:**
1. Go to [MoonPay Dashboard](https://dashboard.moonpay.com/)
2. Regenerate the webhook secret
3. Store new secret in Firebase Functions secrets (NOT EAS)

## ✅ Safe Values (Can Stay)

These are safe to keep in EAS:
- `EXPO_PUBLIC_PHANTOM_APP_ID` ✅
- `EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN` ✅
- `EXPO_PUBLIC_FIREBASE_*` ✅ (public Firebase config)
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` ✅ (public OAuth client ID)
- `EXPO_PUBLIC_TWITTER_CLIENT_ID` ✅ (public OAuth client ID)
- `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS` ✅ (public address is OK)
- `EXPO_PUBLIC_HELIUS_API_KEY` ✅ (RPC API key - public is OK)
- `MOONPAY_API_KEY` ⚠️ (public key, but consider moving to Firebase Functions)

## 🗑️ Immediate Actions

### Step 1: Remove from EAS

Run the removal script:
```bash
./REMOVE_CRITICAL_RISKS.sh
```

Or remove manually (select "production" when prompted):
```bash
eas env:delete production --variable-name EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY --scope project
eas env:delete production --variable-name EXPO_PUBLIC_GOOGLE_CLIENT_SECRET --scope project
eas env:delete production --variable-name EXPO_PUBLIC_TWITTER_CLIENT_SECRET --scope project
eas env:delete production --variable-name MOONPAY_SECRET_KEY --scope project
eas env:delete production --variable-name MOONPAY_WEBHOOK_SECRET --scope project
```

### Step 2: Rotate All Secrets

**Company Wallet:**
1. Generate new Solana wallet
2. Transfer funds from old wallet: `5DUShi8F8unoFtffTg64ki5TZEoNopXjRKyzZiz8u87T`
3. Update `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS` in EAS

**Google OAuth:**
1. Regenerate client secret in Google Cloud Console
2. Store in Firebase Functions secrets

**Twitter OAuth:**
1. Regenerate client secret in Twitter Developer Portal
2. Store in Firebase Functions secrets

**MoonPay:**
1. Regenerate secret key and webhook secret in MoonPay Dashboard
2. Store in Firebase Functions secrets

### Step 3: Move to Firebase Functions Secrets

```bash
cd services/firebase-functions

# Company Wallet Secret Key (NEW - after rotation)
echo '[NEW_SECRET_KEY_ARRAY]' | firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY

# Google Client Secret (NEW - after rotation)
echo 'NEW_GOOGLE_CLIENT_SECRET' | firebase functions:secrets:set GOOGLE_CLIENT_SECRET

# Twitter Client Secret (NEW - after rotation)
echo 'NEW_TWITTER_CLIENT_SECRET' | firebase functions:secrets:set TWITTER_CLIENT_SECRET

# MoonPay Secrets (NEW - after rotation)
echo 'NEW_MOONPAY_SECRET_KEY' | firebase functions:secrets:set MOONPAY_SECRET_KEY
echo 'NEW_MOONPAY_WEBHOOK_SECRET' | firebase functions:secrets:set MOONPAY_WEBHOOK_SECRET
```

### Step 4: Update Code

Ensure your code reads secrets from Firebase Functions (server-side) and NOT from `EXPO_PUBLIC_*` variables.

## ⚠️ Important Notes

1. **Your app bundle may have already exposed these values** - anyone who has downloaded your app can extract them
2. **This is a security incident** - treat it as such
3. **Rotate all secrets immediately** - don't wait
4. **Never use EXPO_PUBLIC_* for secrets** - only for public configuration values
5. **Monitor for suspicious activity** on all affected services

## 📋 Checklist

- [ ] Remove `EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY` from EAS
- [ ] Remove `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` from EAS
- [ ] Remove `EXPO_PUBLIC_TWITTER_CLIENT_SECRET` from EAS
- [ ] Remove `MOONPAY_SECRET_KEY` from EAS
- [ ] Remove `MOONPAY_WEBHOOK_SECRET` from EAS
- [ ] Generate new company wallet
- [ ] Transfer funds from old wallet
- [ ] Update company wallet address in EAS
- [ ] Regenerate Google OAuth client secret
- [ ] Regenerate Twitter OAuth client secret
- [ ] Regenerate MoonPay secret key
- [ ] Regenerate MoonPay webhook secret
- [ ] Store all new secrets in Firebase Functions
- [ ] Update code to read from Firebase Functions
- [ ] Deploy updated code
- [ ] Monitor for suspicious activity
