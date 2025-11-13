# Firebase Secrets Setup Guide - Quick Fix

## Issue
The error you're seeing:
```
Failed to sign transaction: Company wallet configuration missing. 
Set COMPANY_WALLET_ADDRESS and COMPANY_WALLET_SECRET_KEY as Firebase Secrets.
```

This means the Firebase Functions don't have access to the company wallet configuration.

## Solution: Set Firebase Secrets

You need to set the company wallet address and secret key as Firebase Secrets. Here's how:

### Step 1: Navigate to Firebase Functions Directory

```bash
cd services/firebase-functions
```

### Step 2: Set Company Wallet Address

```bash
# Replace with your actual company wallet address
echo 'HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS
```

### Step 3: Set Company Wallet Secret Key

The secret key must be in JSON array format. Get your company wallet secret key and convert it to JSON array format.

```bash
# Replace with your actual company wallet secret key in JSON array format
# Example: [65,160,52,47,45,137,3,148,31,68,218,138,28,87,159,106,25,146,144,26,62,115,163,200,181,218,153,110,238,93,175,196,247,171,236,126,249,226,121,47,95,94,152,248,83,3,53,129,63,165,55,207,255,128,61,237,73,223,151,87,161,99,247,67]
echo '[65,160,52,47,45,137,3,148,31,68,218,138,28,87,159,106,25,146,144,26,62,115,163,200,181,218,153,110,238,93,175,196,247,171,236,126,249,226,121,47,95,94,152,248,83,3,53,129,63,165,55,207,255,128,61,237,73,223,151,87,161,99,247,67]' | firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY
```

### Step 4: Verify Secrets Are Set

```bash
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
firebase functions:secrets:access COMPANY_WALLET_SECRET_KEY
```

### Step 5: Redeploy Firebase Functions

After setting the secrets, you need to redeploy the functions:

```bash
firebase deploy --only functions
```

## Getting Your Company Wallet Secret Key

If you need to get your company wallet secret key:

### Option 1: From Your Config File

Check your `src/config/constants/feeConfig.ts` or environment files for the company wallet address. The secret key should be stored securely (not in client-side code).

### Option 2: Generate New Company Wallet

If you don't have a company wallet yet, you can generate one:

```bash
# Navigate to tools/scripts
cd tools/scripts

# Run the company wallet generator
node generate-company-wallet.js
```

This will output:
- Company wallet address
- Company wallet secret key (in JSON array format)

**IMPORTANT**: Save the secret key securely - you'll need it to set the Firebase Secret.

## Quick Setup Script

If you have the setup script available:

```bash
cd services/firebase-functions
chmod +x setup-secrets.sh
./setup-secrets.sh
```

This interactive script will guide you through setting all required secrets.

## Alternative: Using Firebase Console

You can also set secrets via the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Functions** → **Secrets**
4. Click **Add Secret**
5. Add `COMPANY_WALLET_ADDRESS` with your wallet address
6. Add `COMPANY_WALLET_SECRET_KEY` with your secret key (JSON array format)

## Important Notes

1. **Secret Key Format**: The secret key MUST be in JSON array format: `[65,160,52,47,...]`
   - NOT base64: `YWRkcmVzcw==`
   - NOT hex: `0x414243...`
   - NOT string: `"address"`

2. **Security**: Never commit secrets to version control. They should only be set as Firebase Secrets.

3. **Network**: Make sure the company wallet has sufficient SOL for paying transaction fees.

4. **Verification**: After setting secrets, verify they're accessible:
   ```bash
   firebase functions:secrets:access COMPANY_WALLET_ADDRESS
   ```

## Troubleshooting

### Secret Not Found After Deployment

If you set the secret but it's still not found:

1. **Check Secret Name**: Make sure the secret name is exactly `COMPANY_WALLET_ADDRESS` and `COMPANY_WALLET_SECRET_KEY` (case-sensitive).

2. **Redeploy Functions**: Secrets are only available after redeploying:
   ```bash
   firebase deploy --only functions
   ```

3. **Check Project**: Make sure you're in the correct Firebase project:
   ```bash
   firebase use
   ```

4. **Check Secret Format**: The secret key must be a valid JSON array. Test it:
   ```bash
   node -e "console.log(JSON.parse('[65,160,52,47]'))"
   ```

### Secret Key Format Error

If you get an error about secret key format:

1. Make sure it's a JSON array: `[65,160,52,47,...]`
2. Make sure it has exactly 64 numbers (32 bytes × 2)
3. Make sure all numbers are between 0-255

### Public Key Mismatch

If you get "Company wallet public key mismatch":

1. Verify the address matches the secret key
2. Regenerate the keypair if needed
3. Make sure you're using the correct secret key for the address

## After Setup

Once secrets are set and functions are redeployed:

1. Test the transaction again
2. Check Firebase Function logs for any errors
3. Verify the company wallet has sufficient SOL balance

---

**Status**: ⚠️ Action Required - Set Firebase Secrets
**Next Step**: Run the commands above to set the secrets

