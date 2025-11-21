# Environment Setup Guide

**Date:** 2025-01-14  
**Purpose:** Complete guide for environment variable setup and network configuration

---

## Overview

The codebase supports separate environment files for development (devnet) and production (mainnet) configurations.

**Recommended:** Use `EXPO_PUBLIC_NETWORK` for network selection (new approach).

**Legacy:** `EXPO_PUBLIC_DEV_NETWORK` and `EXPO_PUBLIC_FORCE_MAINNET` are still supported for backward compatibility.

---

## 📁 Environment Files Setup

### **Root `.env` File (Centralized)**
**Location:** `.env` (project root)

**Purpose:** Single source of truth for all environment variables

**Used by:**
- ✅ Expo/React Native app (via `app.config.js`)
- ✅ Firebase Functions emulator (via `dotenv` in `src/index.js`)
- ✅ Backend service (can be configured to read from root)

### `.env.development` (for local development)
```bash
# Network Configuration
EXPO_PUBLIC_NETWORK=devnet
EXPO_PUBLIC_USE_PROD_FUNCTIONS=false
EXPO_PUBLIC_DEV_NETWORK=devnet  # Legacy
EXPO_PUBLIC_FORCE_MAINNET=false  # Legacy
ALLOW_CLIENT_NETWORK_OVERRIDE=true

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=wesplit-35186.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=wesplit-35186
# ... other Firebase variables
```

### `.env.production` (for production builds)
```bash
# Network Configuration (REQUIRED)
EXPO_PUBLIC_NETWORK=mainnet
EXPO_PUBLIC_USE_PROD_FUNCTIONS=true
EXPO_PUBLIC_DEV_NETWORK=mainnet  # Legacy
EXPO_PUBLIC_FORCE_MAINNET=true  # Legacy
ALLOW_CLIENT_NETWORK_OVERRIDE=false

# Firebase Configuration (REQUIRED)
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=wesplit-35186.firebaseapp.com
# ... other Firebase variables

# RPC Configuration (RECOMMENDED for better performance)
EXPO_PUBLIC_HELIUS_API_KEY=your-helius-api-key
# OR
EXPO_PUBLIC_ALCHEMY_API_KEY=your-alchemy-api-key
```

---

## 🔐 Firebase Secrets (Production)

**For Production Deployments:**
- Firebase Functions automatically use **Firebase Secrets** in production
- No `.env` file needed in production
- Secrets are set via: `firebase functions:secrets:set SECRET_NAME`

**Required Secrets for Production:**
```bash
# Set these in Firebase Secrets (not in .env)
firebase functions:secrets:set COMPANY_WALLET_ADDRESS
firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY
```

**How it works:**
- **Local Development (Emulator):** Uses `.env` file from root
- **Production:** Uses Firebase Secrets automatically
- No code changes needed - Firebase handles this automatically

---

## 📋 Environment Variable Priority

### For Firebase Functions:

1. **Production:** Firebase Secrets (automatic)
2. **Local Emulator:** 
   - Root `.env` (via `dotenv` in `src/index.js`)
   - Shell environment variables (from `start-emulator.sh`)
   - Local `services/firebase-functions/.env` (fallback, deprecated)

### For Expo App:

1. Root `.env` (via `app.config.js`)
2. EAS Secrets (for production builds)

---

## 🚀 Setup Instructions

### Step 1: Create Root `.env` File

```bash
# From project root
cp config/environment/env.example .env
```

### Step 2: Add All Required Variables

Edit `.env` and add:

```bash
# Network Configuration (for both frontend and backend)
EXPO_PUBLIC_FORCE_MAINNET=true
EXPO_PUBLIC_DEV_NETWORK=mainnet

# Company Wallet (for Firebase Functions emulator)
COMPANY_WALLET_ADDRESS=your_wallet_address
COMPANY_WALLET_SECRET_KEY=your_base64_secret_key

# Other backend secrets
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Step 3: Remove Local `.env` Files (Optional)

You can now remove:
- `services/firebase-functions/.env` (if it exists)
- `services/backend/.env` (if you configure backend to read from root)

**Note:** Keep them if you prefer separate files, but root `.env` is now the primary source.

---

## 🔧 How It Works

### Firebase Functions Emulator

1. **`start-emulator.sh`** exports variables from root `.env` to shell
2. **`src/index.js`** loads root `.env` using `dotenv` (fallback to local `.env`)
3. Variables are available as `process.env.*` in functions

### Production Deployment

1. Set secrets in Firebase: `firebase functions:secrets:set SECRET_NAME`
2. Firebase automatically injects them as `process.env.*`
3. No `.env` file needed in production

---

## ✅ Benefits of Centralization

1. **Single Source of Truth:** One file to manage
2. **Easier Updates:** Change network config in one place
3. **Less Confusion:** No duplicate variables
4. **Better Security:** Clear separation of client vs server variables

---

## ⚠️ Security Notes

1. **Never commit `.env` to git** (already in `.gitignore`)
2. **Client-side variables** use `EXPO_PUBLIC_` prefix (bundled into app)
3. **Server-side secrets** (no prefix) stay on server only
4. **Production secrets** stored in Firebase Secrets (not in `.env`)

---

## 🧪 Testing

### Test Root `.env` Loading

```bash
# Start emulator
cd services/firebase-functions
npm run dev

# Check logs - should see:
# ✅ Loaded environment variables from root .env file
```

### Verify Network Configuration

In emulator logs, you should see:
```
🌐 Network: mainnet (from EXPO_PUBLIC_FORCE_MAINNET=true)
✅ EXPO_PUBLIC_FORCE_MAINNET=true
✅ EXPO_PUBLIC_DEV_NETWORK=mainnet
```

---

## 📝 Migration from Multiple .env Files

If you have existing `.env` files:

1. **Merge variables** from `services/firebase-functions/.env` into root `.env`
2. **Keep root `.env`** as primary
3. **Delete local `.env` files** (optional - they'll be used as fallback)
4. **Test emulator** to ensure everything works

---

**Last Updated:** 2025-01-14

