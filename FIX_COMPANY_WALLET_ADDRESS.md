# Fix: Update Company Wallet Address in Production

## Problem
The production app is using the old company wallet address (`5DUShi8F8uncFtffTg64ki5TZEoNopXjRKyzZiz8u87T`) instead of the new one (`HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN`).

## Root Cause
- ✅ Firebase Functions have the correct address in secrets
- ✅ Local `.env` file has the correct address
- ❌ EAS production secret has the old address

## Solution

### Step 1: Update EAS Secret for Production

Run this command from the project root:

```bash
# Navigate to project root
cd /Users/charlesvincent/Desktop/GitHub/WeSplit

# Update the EAS secret (new command format)
eas env:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value "HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN" --force

# Or if that doesn't work, try:
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value "HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN" --force
```

### Step 2: Verify the Secret is Updated

```bash
# Check current value
eas secret:get --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS

# Or list all secrets
eas env:list --scope project
```

### Step 3: Rebuild Production App

After updating the secret, you need to rebuild the production app:

```bash
# Build new production version
eas build --platform android --profile production
# or
eas build --platform ios --profile production
```

### Step 4: Verify the Fix

1. **Check the app config** - The new build should have the correct address
2. **Test a transaction** - Send a small USDC transfer
3. **Check logs** - Verify the fee payer is the new address:
   ```bash
   firebase functions:log --only processUsdcTransfer | grep "feePayer"
   ```

## Verification

The internal transfer logic is already correct:
- ✅ Uses `FeeService.getFeePayerPublicKey()` which reads from `COMPANY_WALLET_CONFIG.address`
- ✅ Sets `transaction.feePayer = feePayerPublicKey` (company wallet)
- ✅ Company wallet collects fees via `COMPANY_WALLET_CONFIG.address`

The only issue is the EAS secret needs to be updated.

## Current Status

- ✅ **Firebase Functions**: Correct address (`HfokbWfQ...`)
- ✅ **Local `.env`**: Correct address (`HfokbWfQ...`)
- ✅ **Code Logic**: Correct (uses company wallet as fee payer)
- ❌ **EAS Production Secret**: Old address (`5DUShi...`) - **NEEDS UPDATE**

## After Updating

Once you update the EAS secret and rebuild:
1. The app will use the new company wallet address
2. Transactions will have the correct fee payer
3. Company wallet will collect fees correctly
4. Firebase Functions will be able to sign transactions

