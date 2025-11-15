# Test: getCompanyWalletAddress Function

## Quick Test Steps

### 1. Test via Firebase Console (Easiest)

1. Go to [Firebase Console - Functions](https://console.firebase.google.com/project/wesplit-35186/functions)
2. Click on `getCompanyWalletAddress` function
3. Click the **"Test"** tab
4. Enter test data: `{}`
5. Click **"Test function"**
6. **Expected result:**
   ```json
   {
     "success": true,
     "address": "HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN"
   }
   ```

### 2. Test in Your App (Production Build)

1. **Open your production build** (not Expo Go)
2. **Initiate a transaction** (send USDC to someone)
3. **Check the logs** - You should see:
   ```
   LOG  [INFO] [TransactionSigningService] Fetching company wallet address from Firebase
   LOG  [INFO] [TransactionSigningService] Company wallet address retrieved from Firebase
   ```
4. **No errors** about "not-found" or "permission denied"

### 3. Test via cURL (Command Line)

```bash
curl -X POST \
  https://us-central1-wesplit-35186.cloudfunctions.net/getCompanyWalletAddress \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response:**
```json
{
  "result": {
    "success": true,
    "address": "HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN"
  }
}
```

## What to Look For

### ✅ Success Indicators

1. **Function returns address:**
   - `success: true`
   - `address: "HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN"`

2. **No errors in logs:**
   - No "not-found" errors
   - No "permission denied" errors
   - No "unauthenticated" errors

3. **Transaction works:**
   - Transaction completes successfully
   - Fee payer is correct address
   - No errors during transaction

### ❌ Error Indicators

#### Error: "Permission denied" or "permission-denied"
**Cause:** IAM permissions not set correctly

**Fix:**
1. Go to Firebase Console → Functions → `getCompanyWalletAddress`
2. Click "Permissions" tab
3. Add `allUsers` with role `Cloud Functions Invoker`
4. Wait 1-2 minutes for propagation

#### Error: "not-found" or "functions/not-found"
**Cause:** Function not deployed or wrong name

**Fix:**
```bash
cd services/firebase-functions
firebase deploy --only functions:getCompanyWalletAddress
```

#### Error: "unauthenticated"
**Cause:** Function requires authentication but user not logged in

**Fix:** Make sure permissions allow unauthenticated access (see above)

## Testing Checklist

- [ ] Function is deployed (`firebase functions:list` shows it)
- [ ] Permissions set (allUsers with Cloud Functions Invoker role)
- [ ] Waited 1-2 minutes after setting permissions
- [ ] Tested in Firebase Console (returns correct address)
- [ ] Tested in production build (no errors)
- [ ] Transaction works (sends successfully)

## Debugging

### Check Function Logs

```bash
# View recent function logs
firebase functions:log --only getCompanyWalletAddress --limit 20
```

### Check Permissions

1. Go to Firebase Console
2. Functions → `getCompanyWalletAddress`
3. Permissions tab
4. Should see `allUsers` with `Cloud Functions Invoker` role

### Verify Function URL

The function URL should be:
```
https://us-central1-wesplit-35186.cloudfunctions.net/getCompanyWalletAddress
```

## Next Steps After Successful Test

1. ✅ Function is working
2. ✅ Permissions are correct
3. ✅ Transactions should work
4. ✅ Production build should work

If you still see errors, check the error message and refer to the troubleshooting section above.

