# Cleanup: Remove Old Company Wallet Address

## Overview

This guide helps you find and remove the old company wallet address (`5DUShi8F8uncFtffTg64ki5TZEoNopXjRKyzZiz8u87T`) from all locations.

**New Company Wallet Address:** `HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN`

## Quick Check Results

Based on the automated check:

✅ **Firebase Secrets:** Already has new address (`HfokbWfQ...`)  
✅ **Local .env files:** Already have new address or placeholder  
✅ **Code:** No hardcoded old address found  
⚠️ **EAS Secrets:** Need to check manually (see below)

## Places to Check and Clean

### 1. ✅ Firebase Secrets (Backend) - VERIFIED

**Current value:**
```bash
cd services/firebase-functions
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
```

**Status:** ✅ Already set to new address (`HfokbWfQ...`)

**If you need to update it:**
```bash
echo 'HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS
```

### 2. ⚠️ EAS Secrets (Client Builds) - CHECK MANUALLY

**List all EAS secrets:**
```bash
eas secret:list
```

**Check if old address exists:**
```bash
eas secret:get --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS
```

**If it shows the old address (`5DUShi...`), update it:**
```bash
# Update to new address
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value "HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN" --force
```

**Or delete it entirely (recommended):**
```bash
# Since we now fetch from Firebase, EAS secret is optional
eas secret:delete --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS
```

**Note:** Since we're now fetching from Firebase, you can actually **remove** this EAS secret entirely if you want (it's only used as a fallback in development).

### 3. ✅ Local Environment Files - VERIFIED

**Checked files:**
- ✅ `.env` - Has new address
- ✅ `services/firebase-functions/.env` - Has placeholder
- ✅ `services/backend/.env` - Has new address

**If you find old address in any .env file:**
```bash
# Search for old address
grep -r "5DUShi" .env* 2>/dev/null

# Update to new address
# Edit the file and replace with: HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN
```

### 4. ✅ Code References - VERIFIED

**Status:** ✅ No hardcoded old address found in code

**Files checked:**
- `src/config/constants/feeConfig.ts` - Uses Firebase fetch ✅
- `src/services/blockchain/transaction/*` - Uses async `getAddress()` ✅
- `app.config.js` - Only references env var ✅

### 5. ⚠️ App Cache / Local Storage

**If you have old builds installed:**
- The app caches the address after first fetch
- Old builds might have cached the old address

**Solution:**
- Clear app data/cache
- Or reinstall the app
- New builds will fetch from Firebase

### 6. ✅ Documentation Files

**Status:** ✅ No old address found (only in this cleanup guide)

## Cleanup Checklist

### Firebase Secrets
- [x] Check `COMPANY_WALLET_ADDRESS` in Firebase Secrets ✅ Already correct
- [x] Verify: `firebase functions:secrets:access COMPANY_WALLET_ADDRESS` ✅

### EAS Secrets
- [ ] List all EAS secrets: `eas secret:list`
- [ ] Check `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS`: `eas secret:get --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS`
- [ ] Update or delete if it shows old address
- [ ] **Recommended:** Delete entirely (since we fetch from Firebase now)

### Local Environment Files
- [x] Check `.env` files ✅ Already correct
- [x] Check `services/firebase-functions/.env` ✅ Has placeholder
- [x] Check `services/backend/.env` ✅ Already correct

### Code References
- [x] Search for hardcoded old address ✅ None found
- [x] Verify no hardcoded addresses ✅

### App Cache
- [ ] Clear app data/cache on test devices
- [ ] Reinstall app if needed

### Documentation
- [x] Search docs for old address ✅ None found

## Quick Cleanup Commands

### Check EAS Secrets (if eas CLI available)
```bash
# List all secrets
eas secret:list

# Check specific secret
eas secret:get --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS

# Update if needed
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value "HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN" --force

# Or delete (recommended since we use Firebase now)
eas secret:delete --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS
```

### Verify Firebase Secret
```bash
cd services/firebase-functions
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
# Should show: HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN
```

### Search for Old Address
```bash
# Search all files
grep -r "5DUShi" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null

# Search .env files only
grep -r "5DUShi" .env* 2>/dev/null
```

## Summary

**Current Status:**
- ✅ Firebase Secrets: Already has new address
- ✅ Local .env files: Already have new address
- ✅ Code: No hardcoded addresses
- ⚠️ EAS Secrets: **Need to check manually** (see commands above)

**Action Items:**
1. ✅ Firebase Secret - Already correct
2. ⚠️ **Check EAS Secret** - Run `eas secret:get --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS`
3. ✅ Local .env files - Already correct
4. ✅ Code - Already correct
5. ⚠️ Clear app cache on test devices if needed

## Next Steps

1. **Check EAS Secrets:**
   ```bash
   eas secret:get --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS
   ```
   - If it shows old address → Update or delete it
   - If it shows new address → You're good!
   - If not found → You're good! (we use Firebase now)

2. **Clear App Cache:**
   - Uninstall and reinstall app on test devices
   - Or clear app data/cache

3. **Verify Everything Works:**
   - Test a transaction
   - Check logs - should show new address
   - Verify fee payer is new address

## Important Notes

1. **EAS Secret is Optional Now:**
   - Since we fetch from Firebase, the EAS secret is only used as a fallback in development
   - You can safely delete it if you want
   - Production builds will fetch from Firebase

2. **No Hardcoded Addresses:**
   - Code should never have hardcoded addresses
   - All addresses come from Firebase or env vars

3. **Old Address is Safe to Remove:**
   - The old address (`5DUShi...`) is no longer used
   - Safe to remove from all locations
   - Only the new address (`HfokbWfQ...`) is needed
