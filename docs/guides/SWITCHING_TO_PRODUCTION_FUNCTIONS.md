# Switching to Production Firebase Functions

**Date:** 2025-01-14  
**Purpose:** Guide to switch from emulator to production Firebase Functions

---

## Quick Setup

### 1. Set Environment Variable

Add to your root `.env` file:
```bash
EXPO_PUBLIC_USE_PROD_FUNCTIONS=true
```

This tells the app to use production functions even in development mode.

### 2. Verify Functions are Deployed

```bash
cd services/firebase-functions
firebase functions:list
```

You should see `processUsdcTransfer` in the list.

### 3. Verify Secrets are Set

```bash
cd services/firebase-functions
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
firebase functions:secrets:access COMPANY_WALLET_SECRET_KEY
```

Both should return values (not errors).

### 4. Restart Your App

After setting `EXPO_PUBLIC_USE_PROD_FUNCTIONS=true`, restart your Expo app:
```bash
npm start
# or
expo start --clear
```

---

## How It Works

The app checks `EXPO_PUBLIC_USE_PROD_FUNCTIONS` environment variable:

- **If `true` or set**: Uses production Firebase Functions
- **If `false` or not set**: Uses emulator (if `__DEV__` is true)

**Code location:** `src/services/blockchain/transaction/transactionSigningService.ts`

```typescript
if (__DEV__ && !process.env.EXPO_PUBLIC_USE_PROD_FUNCTIONS) {
  // Connect to emulator
  connectFunctionsEmulator(functions, emulatorHost, emulatorPort);
} else {
  // Use production functions
}
```

---

## Verify It's Working

### Check App Logs

When you make a transaction, you should see:
```
LOG [INFO] 🌐 Using production Firebase Functions
```

**NOT:**
```
LOG [INFO] 🔧 Connected to Firebase Functions Emulator
```

### Check Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `wesplit-35186`
3. Go to **Functions** > **Logs**
4. Make a transaction
5. You should see logs appear in the console (may take 10-30 seconds)

---

## Deploy Functions (if needed)

If functions aren't deployed yet:

```bash
cd services/firebase-functions
firebase deploy --only functions:processUsdcTransfer
```

Or deploy all functions:
```bash
firebase deploy --only functions
```

---

## Set Secrets (if needed)

If secrets aren't set in production:

```bash
cd services/firebase-functions

# Set company wallet address
echo 'YOUR_WALLET_ADDRESS' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS

# Set company wallet secret key (JSON array format)
echo '[65,160,52,...]' | firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY
```

---

## Switch Back to Emulator

To use the emulator again:

1. Remove or set to `false` in `.env`:
   ```bash
   EXPO_PUBLIC_USE_PROD_FUNCTIONS=false
   # or remove the line entirely
   ```

2. Start the emulator:
   ```bash
   cd services/firebase-functions
   npm run dev
   ```

3. Restart your app

---

## Troubleshooting

### Still Connecting to Emulator

- **Check `.env` file**: Make sure `EXPO_PUBLIC_USE_PROD_FUNCTIONS=true` is set
- **Restart app**: Clear cache: `expo start --clear`
- **Check logs**: Look for `🌐 Using production Firebase Functions` in app logs

### "Function not found" Error

- **Deploy functions**: `firebase deploy --only functions`
- **Check function name**: Should be `processUsdcTransfer` (case-sensitive)

### "internal" Error

- **Check Firebase Console logs**: Go to Functions > Logs
- **Verify secrets are set**: `firebase functions:secrets:access COMPANY_WALLET_ADDRESS`
- **Check function is deployed**: `firebase functions:list`

### No Logs in Firebase Console

- **Wait 10-30 seconds**: Logs can be delayed
- **Check correct project**: Make sure you're looking at `wesplit-35186`
- **Check function was called**: Look for function invocation in logs

---

**Last Updated:** 2025-01-14

