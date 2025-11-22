# Local Testing with Firebase Functions Emulator

**Date:** 2025-01-XX  
**Purpose:** Complete guide for using Firebase Functions Emulator for local development and testing

## Problem

Your client app is on **devnet**, but production Firebase Functions are on **mainnet**. This causes network mismatches and transaction failures.

## Solution: Use Firebase Functions Emulator

The emulator automatically uses **devnet**, while production functions use **mainnet**. This keeps them isolated.

## Quick Start

### 1. Start the Emulator

**Terminal 1:**
```bash
cd services/firebase-functions
npm run serve
# or
npm run dev
```

The emulator will start on `http://localhost:5001`

### 2. Your App Auto-Connects

Your Expo app **automatically connects** to the emulator when:
- Running in development mode (`__DEV__ = true`)
- `EXPO_PUBLIC_USE_PROD_FUNCTIONS` is not set to `true`

No code changes needed! ✅

### 3. Verify Connection

Look for this log in your app:
```
🔧 Connected to Firebase Functions Emulator
```

## How It Works

### Automatic Environment Detection

**Client App:**
- Detects `__DEV__` mode
- Automatically connects to `localhost:5001` (emulator)
- Uses devnet network

**Firebase Functions Emulator:**
- Detects `FUNCTIONS_EMULATOR=true`
- Automatically uses devnet network
- Reads from `.env` file for secrets

**Production Functions:**
- Detects production environment
- Automatically uses mainnet network
- Reads from Firebase Secrets

### Network Isolation

✅ **Production Functions** → **mainnet** (for production users)  
✅ **Local Emulator** → **devnet** (for your testing)  
✅ **No interference** between them

## Setup

### 1. Create `.env` file (if not exists)

```bash
cd services/firebase-functions
cp .env.example .env  # if you have an example file
```

Add to `.env`:
```bash
# Network (emulator will use devnet automatically)
SOLANA_NETWORK=devnet

# Company wallet (use devnet wallet for testing)
COMPANY_WALLET_ADDRESS=your_devnet_wallet_address
COMPANY_WALLET_SECRET_KEY=your_devnet_secret_key_base64
```

### 2. Start Emulator

```bash
cd services/firebase-functions
npm run serve
```

### 3. Start Your App

```bash
npm start
# or
expo start
```

## Verify It's Working

### Check Emulator Logs

In the emulator terminal, you should see:
```
Final network selection: { network: 'devnet', isMainnet: false }
networkSource: 'environment-based default (development=devnet)'
```

### Check App Logs

In your app logs, you should see:
```
🔧 Connected to Firebase Functions Emulator
🌐 Using development Firebase Functions (emulator)
```

### Test a Transaction

Try sending a transaction. It should:
- ✅ Hit the local emulator (not production)
- ✅ Use devnet network
- ✅ Work correctly (no network mismatch errors)

## Troubleshooting

### Issue: App still connecting to production

**Solution:** Check that `EXPO_PUBLIC_USE_PROD_FUNCTIONS` is not set:
```bash
# Remove this from your .env or unset it
unset EXPO_PUBLIC_USE_PROD_FUNCTIONS
```

### Issue: Emulator not starting

**Solution:** Make sure you have Firebase CLI installed:
```bash
npm install -g firebase-tools
firebase login
```

### Issue: Network mismatch errors

**Solution:** Make sure:
1. Emulator is running (`npm run serve`)
2. App is in dev mode (`__DEV__ = true`)
3. `.env` file has `SOLANA_NETWORK=devnet` (optional, emulator defaults to devnet)

## Implementation Verification

### ✅ Environment Variable Reading
**Fixed:** Now uses `getEnvVar('EXPO_PUBLIC_USE_PROD_FUNCTIONS')` which:
- Checks `process.env` first
- Falls back to `Constants.expoConfig.extra`
- Falls back to `Constants.manifest.extra`
- Works correctly in Expo Go and standalone builds

### ✅ Boolean Check
**Fixed:** Explicitly checks for `=== 'true'` or `=== '1'`:
```typescript
const useProdFunctionsEnv = getEnvVar('EXPO_PUBLIC_USE_PROD_FUNCTIONS');
const useProdFunctions = useProdFunctionsEnv === 'true' || useProdFunctionsEnv === '1';
```

### ✅ Singleton Pattern
**Fixed:** Implemented singleton pattern to ensure:
- `connectFunctionsEmulator` is called only once
- Connection happens BEFORE any `httpsCallable` calls
- Functions instance is cached for reuse

### Implementation Flow
```
1. App starts
2. Transaction is triggered
3. getProcessUsdcTransferFunction() is called
4. getFirebaseFunctions() is called (first time)
   ├─ Checks if already initialized → returns cached instance
   ├─ Gets Firebase app
   ├─ Gets Functions instance
   ├─ Checks __DEV__ and useProdFunctions
   ├─ Calls connectFunctionsEmulator() if needed
   └─ Caches instance
5. httpsCallable() is called with connected Functions instance
6. Function call goes to emulator (if connected) or production
```

## Summary

🎯 **For Local Testing:**
- Start emulator: `cd services/firebase-functions && npm run serve`
- App auto-connects to emulator
- Emulator uses devnet automatically
- Transactions work correctly

🎯 **For Production:**
- Production functions use mainnet automatically
- Production users unaffected
- No configuration needed

✅ **Result:** You can test devnet locally while production users continue using mainnet!

### Consolidated Documentation

The following files have been consolidated into this guide:
- `EMULATOR_QUICK_START.md` - Quick start guide (now included above)
- `EMULATOR_CONNECTION_VERIFICATION.md` - Implementation verification details (now included above)

