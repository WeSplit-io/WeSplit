# Fix: getCompanyWalletAddress Function Permissions

## Problem

After deploying the `getCompanyWalletAddress` function, you're getting errors:
- "No permissions" or "Permission denied"
- "Function not deployed" (even though it is deployed)

## Root Cause

Firebase callable functions require IAM permissions to allow unauthenticated access. The function is deployed but not accessible because it needs public access permissions.

## Solution: Set Permissions via Firebase Console

### Step 1: Open Firebase Console

1. Go to [Firebase Console - Functions](https://console.firebase.google.com/project/wesplit-35186/functions)
2. Find the `getCompanyWalletAddress` function
3. Click on it to open details

### Step 2: Set Public Access

1. Click on the **"Permissions"** tab (or look for IAM settings)
2. Click **"Add Principal"** or **"Add Member"**
3. In the "New principals" field, enter: `allUsers`
4. Select role: **"Cloud Functions Invoker"** (or `roles/cloudfunctions.invoker`)
5. Click **"Save"** or **"Add"**

### Step 3: Verify

The function should now be accessible without authentication.

## Alternative: Use Firebase CLI (if you have gcloud installed)

If you have Google Cloud SDK installed:

```bash
cd services/firebase-functions

gcloud functions add-iam-policy-binding getCompanyWalletAddress \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --gen2
```

## Why This is Safe

The company wallet **address** is public information (like a bank account number). It's safe to allow unauthenticated access because:
- ✅ It's just the public address (not the private key)
- ✅ Anyone can see it on the blockchain
- ✅ No sensitive operations are performed

## Verification

### Test the Function

After setting permissions, test via Firebase Console:
1. Go to Functions → `getCompanyWalletAddress`
2. Click "Test" tab
3. Enter: `{}`
4. Click "Test function"
5. Should return: `{ "success": true, "address": "HfokbWfQ..." }`

### Test in Your App

After setting permissions, your app should be able to call the function without errors.

## Troubleshooting

### Still Getting "Permission Denied"

1. **Wait a few minutes** - IAM changes can take 1-2 minutes to propagate
2. **Check function name** - Make sure it's exactly `getCompanyWalletAddress` (case-sensitive)
3. **Check region** - Make sure it's `us-central1`
4. **Try redeploying** - Sometimes redeploy helps:
   ```bash
   cd services/firebase-functions
   firebase deploy --only functions:getCompanyWalletAddress
   ```

### Function Not Found Error

1. **Verify deployment**:
   ```bash
   firebase functions:list | grep getCompanyWalletAddress
   ```
2. **Check function URL** - Should be:
   ```
   https://us-central1-wesplit-35186.cloudfunctions.net/getCompanyWalletAddress
   ```

### Still Having Issues?

1. Check Firebase Console logs for the function
2. Verify the function is active (not paused)
3. Check that Firebase Secrets are set correctly:
   ```bash
   firebase functions:secrets:access COMPANY_WALLET_ADDRESS
   ```

## Quick Checklist

- [ ] Function is deployed (`firebase functions:list` shows it)
- [ ] Permissions set to allow `allUsers` with `Cloud Functions Invoker` role
- [ ] Waited 1-2 minutes for permissions to propagate
- [ ] Tested function in Firebase Console
- [ ] App can now call the function

## Next Steps

After fixing permissions:
1. Test the function in Firebase Console
2. Test in your app (production build)
3. Verify transactions work correctly

The function should now work! 🎉
