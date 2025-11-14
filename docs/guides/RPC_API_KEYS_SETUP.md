# RPC API Keys Setup Guide

**Date:** 2025-01-14  
**Purpose:** Guide for setting up and securing RPC API keys for Firebase Functions

---

## Overview

Firebase Functions now use secure Firebase Secrets for RPC API keys instead of environment variables. This ensures:
- ✅ **Security**: API keys are encrypted and stored securely
- ✅ **Access Control**: Only Firebase Functions can access the secrets
- ✅ **No Client Exposure**: API keys never exposed to client-side code

---

## Required Secrets

The following RPC API keys are configured as Firebase Secrets:

1. **ALCHEMY_API_KEY** - Alchemy RPC provider (highest priority)
2. **GETBLOCK_API_KEY** - GetBlock RPC provider
3. **HELIUS_API_KEY** - Helius RPC provider
4. **USE_PAID_RPC** - Enable/disable paid RPC providers (set to "true" to enable)

---

## Setup Instructions

### 1. Extract API Keys from .env

Your API keys are stored in the root `.env` file. Extract them:

```bash
# Alchemy API Key (from EXPO_PUBLIC_ALCHEMY_API_KEY)
# Format: https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_KEY="YOUR_ALCHEMY_KEY"

# GetBlock API Key (from EXPO_PUBLIC_GETBLOCK_API_KEY)
# Format: https://go.getblock.io/YOUR_KEY
GETBLOCK_KEY="YOUR_GETBLOCK_KEY"

# Helius API Key (from EXPO_PUBLIC_HELIUS_API_KEY)
HELIUS_KEY="YOUR_HELIUS_KEY"
```

### 2. Set Firebase Secrets

```bash
cd services/firebase-functions

# Set Alchemy API Key
echo "YOUR_ALCHEMY_KEY" | firebase functions:secrets:set ALCHEMY_API_KEY

# Set GetBlock API Key
echo "YOUR_GETBLOCK_KEY" | firebase functions:secrets:set GETBLOCK_API_KEY

# Set Helius API Key
echo "YOUR_HELIUS_KEY" | firebase functions:secrets:set HELIUS_API_KEY

# Enable paid RPC providers
echo "true" | firebase functions:secrets:set USE_PAID_RPC
```

### 3. Deploy Functions

After setting secrets, deploy the function:

```bash
firebase deploy --only functions:processUsdcTransfer
```

Firebase will automatically grant the function access to the secrets.

---

## How It Works

### RPC Provider Priority

When `USE_PAID_RPC=true`, the function uses RPC providers in this order:

1. **Alchemy** (if `ALCHEMY_API_KEY` is set)
2. **GetBlock** (if `GETBLOCK_API_KEY` is set)
3. **QuickNode** (if `QUICKNODE_ENDPOINT` is set)
4. **Chainstack** (if `CHAINSTACK_ENDPOINT` is set)
5. **Helius** (if `HELIUS_API_KEY` is set)
6. **Free Fallback**: Ankr RPC
7. **Free Fallback**: Official Solana RPC

### Security

- ✅ **Firebase Secrets**: API keys are stored encrypted in Firebase Secret Manager
- ✅ **No Client Exposure**: `EXPO_PUBLIC_*` variables are NOT used in Firebase Functions
- ✅ **Access Control**: Only the Firebase Function service account can access secrets
- ✅ **Automatic Injection**: Secrets are automatically available as `process.env` variables

### Code Implementation

The function uses secrets like this:

```javascript
// SECURITY: Only use Firebase Secrets - not EXPO_PUBLIC_ variables
const alchemyApiKey = extractApiKey(process.env.ALCHEMY_API_KEY, 'solana-mainnet.g.alchemy.com/v2');
const getBlockApiKey = extractGetBlockKey(process.env.GETBLOCK_API_KEY);
const heliusApiKey = extractApiKey(process.env.HELIUS_API_KEY, 'mainnet.helius-rpc.com');
```

---

## Verify Secrets

Check if secrets are set:

```bash
cd services/firebase-functions

# Check Alchemy
firebase functions:secrets:access ALCHEMY_API_KEY

# Check GetBlock
firebase functions:secrets:access GETBLOCK_API_KEY

# Check Helius
firebase functions:secrets:access HELIUS_API_KEY

# Check USE_PAID_RPC
firebase functions:secrets:access USE_PAID_RPC
```

---

## Troubleshooting

### "API key is not allowed to access blockchain" Error

This means the API key doesn't have permission. Solutions:

1. **Use Free Endpoints**: Set `USE_PAID_RPC=false` or don't set it
2. **Verify API Key**: Check the API key is valid and has blockchain access
3. **Check Provider**: Some providers require specific permissions

### Function Not Using Paid RPC

1. **Check USE_PAID_RPC**: Must be set to `"true"` (string)
2. **Check Secrets**: Verify all API keys are set
3. **Check Logs**: Look for "RPC endpoint selection" in Firebase Console logs

### Secrets Not Available

1. **Deploy Function**: Secrets must be declared in `functions.runWith({ secrets: [...] })`
2. **Grant Access**: Firebase automatically grants access during deployment
3. **Check Secret Names**: Must match exactly (case-sensitive)

---

## Disable Paid RPC (Use Free Endpoints)

To use free endpoints only:

```bash
cd services/firebase-functions
echo "false" | firebase functions:secrets:set USE_PAID_RPC
firebase deploy --only functions:processUsdcTransfer
```

Or simply don't set `USE_PAID_RPC` (defaults to free endpoints).

---

## Update API Keys

To update an API key:

```bash
cd services/firebase-functions
echo "NEW_API_KEY" | firebase functions:secrets:set ALCHEMY_API_KEY
firebase deploy --only functions:processUsdcTransfer
```

---

## Best Practices

1. ✅ **Never commit API keys** to version control
2. ✅ **Use Firebase Secrets** for all sensitive data
3. ✅ **Rotate keys regularly** for security
4. ✅ **Monitor usage** in Firebase Console
5. ✅ **Use free endpoints** for development/testing
6. ✅ **Use paid endpoints** for production (better performance)

---

**Last Updated:** 2025-01-14

