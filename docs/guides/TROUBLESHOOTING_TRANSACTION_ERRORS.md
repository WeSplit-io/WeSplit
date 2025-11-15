# Troubleshooting: Production Transaction Errors

## Common Errors and Solutions

### Error 1: "Failed to get company wallet address from Firebase [FirebaseError: not-found]"

**Symptoms:**
- App logs show "not-found" error
- Transaction fails in production build
- Works in Expo Go (falls back to env var)

**Cause:** Function not deployed or not accessible

**Solution:**
1. Verify function is deployed:
   ```bash
   firebase functions:list | grep getCompanyWalletAddress
   ```

2. If not deployed:
   ```bash
   cd services/firebase-functions
   firebase deploy --only functions:getCompanyWalletAddress
   ```

3. Wait 2-3 minutes after deployment

---

### Error 2: "Permission denied" or "permission-denied"

**Symptoms:**
- App logs show "permission denied" error
- Function exists but can't be called
- Works in Firebase Console but not from app

**Cause:** IAM permissions not set for unauthenticated access

**Solution:**
1. Go to [Firebase Console - Functions](https://console.firebase.google.com/project/wesplit-35186/functions)
2. Click on `getCompanyWalletAddress`
3. Click **"Permissions"** tab
4. Click **"Add Principal"**
5. Enter: `allUsers`
6. Select role: **"Cloud Functions Invoker"**
7. Click **"Save"**
8. Wait 1-2 minutes for propagation

---

### Error 3: "unauthenticated"

**Symptoms:**
- App logs show "unauthenticated" error
- Function requires authentication

**Cause:** Function permissions don't allow unauthenticated access

**Solution:** Same as Error 2 - set permissions to allow `allUsers`

---

### Error 4: "Company wallet address not configured in Firebase Secrets"

**Symptoms:**
- Function is called but returns error
- Error mentions Firebase Secrets

**Cause:** `COMPANY_WALLET_ADDRESS` secret not set in Firebase

**Solution:**
```bash
cd services/firebase-functions
echo 'HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS
```

Then redeploy:
```bash
firebase deploy --only functions:getCompanyWalletAddress
```

---

### Error 5: "Invalid response from getCompanyWalletAddress function"

**Symptoms:**
- Function is called but response format is wrong
- Missing `success` or `address` fields

**Cause:** Function returned unexpected format

**Solution:**
1. Check function logs:
   ```bash
   firebase functions:log --only getCompanyWalletAddress --limit 10
   ```

2. Test function directly in Firebase Console

3. Verify function code is correct (should return `{ success: true, address: "..." }`)

---

## Step-by-Step Verification

### Step 1: Verify Function is Deployed
```bash
firebase functions:list | grep getCompanyWalletAddress
```
**Expected:** Should show the function

### Step 2: Verify Permissions
1. Firebase Console → Functions → `getCompanyWalletAddress`
2. Permissions tab
3. Should see `allUsers` with `Cloud Functions Invoker`

### Step 3: Test Function
1. Firebase Console → Functions → `getCompanyWalletAddress`
2. Test tab → Enter `{}` → Test
3. Should return: `{ "success": true, "address": "HfokbWfQ..." }`

### Step 4: Test in App
1. Open production build
2. Send a test transaction
3. Check logs - should see successful fetch

## Quick Fix Commands

### Fix Permissions (if gcloud installed)
```bash
gcloud functions add-iam-policy-binding getCompanyWalletAddress \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --gen2
```

### Redeploy Function
```bash
cd services/firebase-functions
firebase deploy --only functions:getCompanyWalletAddress
```

### Check Function Logs
```bash
firebase functions:log --only getCompanyWalletAddress --limit 20
```

## Still Having Issues?

1. **Check function logs** for detailed error messages
2. **Test in Firebase Console** to isolate if it's a permissions issue
3. **Verify Firebase Secrets** are set correctly
4. **Wait 2-3 minutes** after any changes (propagation time)
5. **Clear app cache** and try again

## Success Indicators

✅ Function deployed and visible in `firebase functions:list`  
✅ Permissions set (allUsers with Cloud Functions Invoker)  
✅ Function test in Firebase Console returns correct address  
✅ App logs show successful fetch (no errors)  
✅ Transactions complete successfully  

