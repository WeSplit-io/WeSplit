# Deployment Checklist - Company Wallet Address Fix

## 🚨 CRITICAL: Before Production Build

### Step 1: Deploy Firebase Function
```bash
cd services/firebase-functions
firebase deploy --only functions:getCompanyWalletAddress
```

**Expected Output:**
```
✔  functions[getCompanyWalletAddress(us-central1)] Successful create operation.
```

### Step 2: Verify Function is Deployed
```bash
firebase functions:list | grep getCompanyWalletAddress
```

**Expected Output:**
```
getCompanyWalletAddress    https://us-central1-wesplit-35186.cloudfunctions.net/getCompanyWalletAddress
```

### Step 3: Test Function (Optional but Recommended)
```bash
# Use Firebase Console to test:
# https://console.firebase.google.com/project/wesplit-35186/functions
# Or use the test script:
cd services/firebase-functions
node test-deployed-functions.js
```

**Expected Response:**
```json
{
  "success": true,
  "address": "HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN"
}
```

### Step 4: Verify Firebase Secrets
```bash
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
```

**Expected Output:**
```
HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN
```

## ✅ Code Changes Summary

### Fixed Issues:
1. ✅ Enhanced error handling with detailed diagnostics
2. ✅ Production mode: NO env var fallback (will fail if Firebase unavailable)
3. ✅ Development mode: Allows env var fallback for testing
4. ✅ Address format validation (32-44 characters)
5. ✅ Better error messages with deployment instructions

### Files Modified:
- `src/services/blockchain/transaction/transactionSigningService.ts`
- `src/config/constants/feeConfig.ts`

## 🧪 Testing

### Test in Expo Go (Development):
1. Should see error: "Failed to get company wallet address from Firebase [FirebaseError: not-found]"
2. Should fallback to env var
3. Transaction should work ✅

### Test in Production Build:
1. **AFTER deploying function**: Should fetch from Firebase successfully
2. Transaction should work ✅
3. **BEFORE deploying function**: Will fail with clear error message

## 📋 Pre-Build Checklist

- [ ] Firebase function `getCompanyWalletAddress` is deployed
- [ ] Function is accessible (tested via Firebase Console)
- [ ] Firebase Secrets are set correctly:
  - [ ] `COMPANY_WALLET_ADDRESS` = `HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN`
  - [ ] `COMPANY_WALLET_SECRET_KEY` = (64-element JSON array)
- [ ] Code changes are committed
- [ ] Ready for production build

## 🚀 Production Build Command

```bash
eas build --platform ios --profile production
# or
eas build --platform android --profile production
```

## ⚠️ Important Notes

1. **The function MUST be deployed before production build**
2. **In production, there is NO fallback to env vars** - it will fail if Firebase is unavailable
3. **The address is cached after first fetch** - subsequent transactions won't call Firebase again
4. **Error messages now include deployment instructions** - easier to debug

## 🔍 Troubleshooting

### Error: "not-found"
- **Cause**: Function not deployed
- **Fix**: Run `firebase deploy --only functions:getCompanyWalletAddress`

### Error: "Company wallet address not configured in Firebase Secrets"
- **Cause**: Secret not set
- **Fix**: Run `echo 'HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS`

### Error: "Invalid address format"
- **Cause**: Secret contains invalid data
- **Fix**: Verify secret value is correct address

