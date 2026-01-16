# Remove Risky EAS Secrets Guide

## ⚠️ Risky Values to Remove

The following types of values should **NOT** be stored in EAS environment variables (especially with `EXPO_PUBLIC_*` prefix):

### 1. Secret Keys (Should NEVER be EXPO_PUBLIC_*)
- `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` ❌ (should be backend-only)
- `EXPO_PUBLIC_TWITTER_CLIENT_SECRET` ❌ (should be backend-only)
- `EXPO_PUBLIC_APPLE_KEY_SECRET` ❌ (if exists, should be backend-only)
- Any `*_SECRET_KEY` with `EXPO_PUBLIC_*` prefix ❌

### 2. Private Keys
- Any private keys (should be in Firebase Functions secrets, not EAS)

### 3. Passwords
- Email passwords
- API passwords
- Any authentication passwords

### 4. JWT Secrets
- `JWT_SECRET` (should be backend-only, not in EAS)

### 5. MoonPay Secrets (if accidentally added)
- `MOONPAY_SECRET_KEY` (should be in Firebase Functions secrets)
- `MOONPAY_WEBHOOK_SECRET` (should be in Firebase Functions secrets)

## ✅ Safe Values (Can Stay in EAS)

These are **safe** to keep in EAS because they're meant to be public:

- `EXPO_PUBLIC_PHANTOM_APP_ID` ✅ (public App ID)
- `EXPO_PUBLIC_PHANTOM_APP_ORIGIN` ✅ (public domain)
- `EXPO_PUBLIC_PHANTOM_REDIRECT_URI` ✅ (public deep link)
- `EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN` ✅ (feature flag)
- `EXPO_PUBLIC_FIREBASE_*` ✅ (Firebase public config)
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` ✅ (public OAuth client ID)
- `EXPO_PUBLIC_APPLE_CLIENT_ID` ✅ (public OAuth client ID)
- `EXPO_PUBLIC_TWITTER_CLIENT_ID` ✅ (public OAuth client ID)
- `EXPO_PUBLIC_HELIUS_API_KEY` ✅ (RPC API key - public is OK)
- `EXPO_PUBLIC_ALCHEMY_API_KEY` ✅ (RPC API key - public is OK)

## 🗑️ Commands to Remove Risky Values

### Step 1: List All Environment Variables

```bash
eas env:list
# Select "production" when prompted
```

### Step 2: Remove Risky Values

**Remove Google Client Secret (if exists):**
```bash
eas env:delete --name EXPO_PUBLIC_GOOGLE_CLIENT_SECRET
# Select "production" when prompted
# Confirm deletion
```

**Remove Twitter Client Secret (if exists):**
```bash
eas env:delete --name EXPO_PUBLIC_TWITTER_CLIENT_SECRET
# Select "production" when prompted
# Confirm deletion
```

**Remove any other secret keys:**
```bash
# Replace VARIABLE_NAME with the actual variable name
eas env:delete --name VARIABLE_NAME
# Select "production" when prompted
# Confirm deletion
```

## 📋 Checklist

Before removing, verify:

- [ ] Variable is actually risky (contains secret/private key)
- [ ] Variable is not needed for the app to function
- [ ] Variable should be moved to Firebase Functions secrets (if needed server-side)
- [ ] You have a backup of the value (if you might need it later)

## 🔄 If You Need These Values Server-Side

If you removed values that are needed for backend operations, move them to Firebase Functions secrets:

```bash
# Example: Move Google Client Secret to Firebase Functions
cd services/firebase-functions
echo 'your-secret-value' | firebase functions:secrets:set GOOGLE_CLIENT_SECRET
```

## ⚠️ Important Notes

1. **EXPO_PUBLIC_* variables are compiled into the app** - they're visible to anyone who inspects the app bundle
2. **Never use EXPO_PUBLIC_* for secrets** - use Firebase Functions secrets or backend environment variables instead
3. **Client IDs are safe** - OAuth client IDs are meant to be public
4. **API keys for public services are usually safe** - RPC provider API keys are typically OK to be public (they have rate limits)

## 🛡️ Best Practices

- ✅ Use `EXPO_PUBLIC_*` only for public configuration values
- ✅ Store secrets in Firebase Functions secrets (server-side)
- ✅ Never commit secrets to version control
- ✅ Rotate secrets if they've been exposed
