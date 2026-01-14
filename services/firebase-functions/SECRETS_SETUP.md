# Firebase Secrets Setup Guide

**Date:** 2024-12-19  
**Purpose:** Guide for setting up Firebase Secrets for WeSplit Functions

---

## Required Secrets

### 1. Company Wallet (REQUIRED for transaction signing)

```bash
# Company Wallet Address
echo 'YOUR_COMPANY_WALLET_ADDRESS' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS

# Company Wallet Secret Key (JSON array format - 64 numbers)
echo '[YOUR_SECRET_KEY_ARRAY]' | firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY
# Example format: [65,160,52,47,...,247,67] (64 numbers total)
```

### 2. Email Configuration (REQUIRED for email verification)

```bash
# Email User (Gmail address)
echo 'wesplit.io@gmail.com' | firebase functions:secrets:set EMAIL_USER

# Email Password (Gmail app password)
echo 'qzfp qmlm ztdu zlal' | firebase functions:secrets:set EMAIL_PASSWORD
```

### 3. MoonPay Configuration (REQUIRED for fiat onramps)

```bash
# MoonPay API Key
echo 'pk_live_37P9eF61y7Q7PZZp95q2kozulpBHYv7P' | firebase functions:secrets:set MOONPAY_API_KEY

# MoonPay Secret Key
echo 'sk_live_xANcsPYYjcmU7EGIhZ9go0MKKbBoXH' | firebase functions:secrets:set MOONPAY_SECRET_KEY

# MoonPay Webhook Secret
echo 'wk_live_BIrcukm9OxPbAzDi6i4KcoewxAag0HBL' | firebase functions:secrets:set MOONPAY_WEBHOOK_SECRET
```

### 4. OpenRouter API Key (REQUIRED for AI service)

```bash
# OpenRouter API Key
echo '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' | firebase functions:secrets:set OPENROUTER_API_KEY
```

### 5. Solana Network Configuration (OPTIONAL)

```bash
# Network (mainnet/devnet/testnet)
echo 'mainnet' | firebase functions:secrets:set DEV_NETWORK

# Helius API Key (optional, for better RPC performance)
echo 'YOUR_HELIUS_API_KEY' | firebase functions:secrets:set HELIUS_API_KEY
```

---

## Quick Setup Script

Run the interactive setup script:

```bash
cd services/firebase-functions
./setup-secrets.sh
```

---

## Manual Setup

### Step 1: Set Company Wallet Secrets

```bash
# Set company wallet address
echo 'YOUR_COMPANY_WALLET_ADDRESS' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS

# Set company wallet secret key (JSON array format - 64 numbers)
echo '[YOUR_SECRET_KEY_ARRAY]' | firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY
# Example format: [65,160,52,47,...,247,67] (64 numbers total)
```

### Step 2: Set Email Secrets

```bash
echo 'wesplit.io@gmail.com' | firebase functions:secrets:set EMAIL_USER
echo 'qzfp qmlm ztdu zlal' | firebase functions:secrets:set EMAIL_PASSWORD
```

### Step 3: Set MoonPay Secrets

```bash
echo 'pk_live_37P9eF61y7Q7PZZp95q2kozulpBHYv7P' | firebase functions:secrets:set MOONPAY_API_KEY
echo 'sk_live_xANcsPYYjcmU7EGIhZ9go0MKKbBoXH' | firebase functions:secrets:set MOONPAY_SECRET_KEY
echo 'wk_live_BIrcukm9OxPbAzDi6i4KcoewxAag0HBL' | firebase functions:secrets:set MOONPAY_WEBHOOK_SECRET
```

### Step 4: Set OpenRouter Secret

```bash
echo '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' | firebase functions:secrets:set OPENROUTER_API_KEY
```

### Step 5: Set Optional Solana Configuration

```bash
echo 'mainnet' | firebase functions:secrets:set DEV_NETWORK
# echo 'YOUR_HELIUS_API_KEY' | firebase functions:secrets:set HELIUS_API_KEY
```

---

## Verify Secrets

### Check if a secret is set:

```bash
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
```

### List all secrets (via Firebase Console):

1. Go to Firebase Console
2. Navigate to Functions → Secrets
3. View all configured secrets

---

## Deploy Functions

After setting all secrets, deploy the functions:

```bash
firebase deploy --only functions
```

---

## Update Functions to Use Secrets

When deploying, Firebase automatically makes secrets available as environment variables:

- `COMPANY_WALLET_ADDRESS` → `process.env.COMPANY_WALLET_ADDRESS`
- `COMPANY_WALLET_SECRET_KEY` → `process.env.COMPANY_WALLET_SECRET_KEY`
- `EMAIL_USER` → `process.env.EMAIL_USER`
- `EMAIL_PASSWORD` → `process.env.EMAIL_PASSWORD`
- etc.

---

## Security Notes

1. **Never commit secrets to version control**
   - Secrets are stored in Firebase Secret Manager
   - Not accessible in client-side code
   - Only available in Firebase Functions runtime

2. **Rotate secrets regularly**
   - Update secrets if compromised
   - Use `firebase functions:secrets:set` to update

3. **Access control**
   - Only authorized users can access secrets
   - Secrets are encrypted at rest
   - Secrets are only decrypted in function runtime

---

## Troubleshooting

### Secret not found error:

```bash
# Make sure secret is set
firebase functions:secrets:access SECRET_NAME

# If not set, set it:
echo 'value' | firebase functions:secrets:set SECRET_NAME
```

### Function deployment fails:

1. Check all required secrets are set
2. Verify secret values are correct
3. Check Firebase Functions logs: `firebase functions:log`

---

**Last Updated:** 2024-12-19

