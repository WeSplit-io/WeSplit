# Badge Image Access Troubleshooting

## Issue
Bronze and Silver badge images are getting "unauthorized" errors while Gold and Emerald work correctly.

## Root Cause
The storage rules are deployed correctly (since Gold/Emerald work), but Bronze and Silver files likely have:
1. File-level permissions that override the rules
2. Missing files
3. Different metadata/permissions set during upload

## Solution Steps

### 1. Deploy Storage Rules (if not already done)
```bash
firebase deploy --only storage
```

Or manually in Firebase Console:
- Go to Firebase Console → Storage → Rules
- Copy the rules from `config/deployment/storage.rules`
- Click "Publish"

### 2. Check File Permissions in Firebase Console

1. **Open Firebase Console**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `wesplit-35186`

2. **Navigate to Storage**
   - Click "Storage" in the left sidebar
   - Navigate to the `badges/` folder

3. **Check Each File**
   - Click on `split-bronze.png`
   - Check the "File info" tab
   - Look for any custom permissions or metadata
   - Repeat for `split-silver.png`

4. **Fix File Permissions (if needed)**
   - If files have custom permissions, you may need to:
     - Re-upload the files
     - Or use Firebase CLI to update permissions:
     ```bash
     # This requires Firebase Admin SDK or manual update in console
     ```

### 3. Verify Files Exist

Check that these files exist in Firebase Storage:
- ✅ `badges/split-bronze.png`
- ✅ `badges/split-silver.png`
- ✅ `badges/split-gold.png` (working)
- ✅ `badges/split-emerald.png` (working)

### 4. Re-upload Files (if needed)

If files are missing or have wrong permissions:

1. **Delete the problematic files** (if they exist with wrong permissions)
2. **Re-upload them** to `badges/` folder
3. **Ensure they're uploaded with default permissions** (not custom)

### 5. Test After Fix

After fixing, the logs should show:
```
[DEBUG] [BadgeService] Successfully converted gs:// URL
```

Instead of:
```
[WARN] [BadgeService] Unauthorized access to badge image
```

## Quick Fix: Re-upload Bronze and Silver

The fastest solution is to re-upload the bronze and silver badge images:

1. Go to Firebase Console → Storage → badges/
2. Delete `split-bronze.png` and `split-silver.png` (if they exist)
3. Upload them again with the same names
4. Verify they appear in the list
5. Test the app again

## Why Gold and Emerald Work

Gold and Emerald work because they were likely:
- Uploaded after the storage rules were deployed
- Uploaded with correct default permissions
- Or have matching file-level permissions

Bronze and Silver were probably:
- Uploaded before rules were deployed
- Uploaded with different/custom permissions
- Or have file-level permissions that restrict access

