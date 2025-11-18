# Fix Custom Token Permissions

## Issue
The `getCustomTokenForUser` function is failing with:
```
Permission 'iam.serviceAccounts.signBlob' denied on resource
```

## Solution

The Firebase Functions service account needs the "Service Account Token Creator" role to create custom tokens.

### Option 1: Grant Permission via Firebase Console (Recommended)

1. Go to [Google Cloud Console - IAM](https://console.cloud.google.com/iam-admin/iam?project=wesplit-35186)
2. Find the service account: `wesplit-35186@appspot.gserviceaccount.com`
3. Click the edit (pencil) icon
4. Click "ADD ANOTHER ROLE"
5. Select "Service Account Token Creator"
6. Click "SAVE"

### Option 2: Grant Permission via gcloud CLI

```bash
gcloud projects add-iam-policy-binding wesplit-35186 \
  --member="serviceAccount:wesplit-35186@appspot.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

### Option 3: Use a Different Service Account

If you have a custom service account with the right permissions, you can configure the function to use it:

```javascript
exports.getCustomTokenForUser = functions
  .runWith({
    serviceAccount: 'your-service-account@wesplit-35186.iam.gserviceaccount.com'
  })
  .https.onCall(async (data, context) => {
    // ... function code
  });
```

## Verify Fix

After granting permissions, test the function again. The error should be resolved.

