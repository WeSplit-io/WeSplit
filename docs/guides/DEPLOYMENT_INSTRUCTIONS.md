# Firebase Functions Deployment Instructions

## Blockhash Expiration Fix Deployment

The blockhash expiration fix has been implemented and needs to be deployed to Firebase Functions.

### Changes Made

1. **Firebase Functions** (`services/firebase-functions/src/transactionSigningService.js`)
   - Added blockhash validation in `addCompanySignature()` BEFORE signing
   - Added blockhash validation in `processUsdcTransfer()` BEFORE signing
   - Rejects transactions with blockhashes within 20 slots of expiration

2. **Client-Side Services** (All transaction services)
   - Added blockhash timestamp tracking
   - Added blockhash age check (45 seconds) before Firebase call
   - Automatic rebuild with fresh blockhash if too old
   - Applied to:
     - `sendExternal.ts` ✅
     - `sendInternal.ts` ✅
     - `TransactionProcessor.ts` ✅

### Deployment Steps

1. **Deploy Firebase Functions**:
   ```bash
   cd services/firebase-functions
   firebase deploy --only functions
   ```

2. **If prompted about missing functions**:
   - The deployment may ask about functions that don't exist locally
   - These are likely old functions that can be safely deleted
   - Answer `y` to proceed with deletion, or `N` to skip

3. **Verify Deployment**:
   - Check Firebase Console → Functions
   - Verify all functions are deployed successfully
   - Test a transaction to ensure blockhash validation works

### What the Fix Does

1. **Client-Side**:
   - Tracks when blockhash is obtained
   - Before sending to Firebase, checks if blockhash is >45 seconds old
   - If too old, automatically rebuilds transaction with fresh blockhash
   - Prevents sending expired blockhashes to Firebase

2. **Server-Side (Firebase Functions)**:
   - Validates blockhash age BEFORE signing (saves time)
   - Rejects transactions within 20 slots of expiration
   - Provides clear error messages for expired blockhashes

### Testing

After deployment, test:
1. Normal transaction flow (should work as before)
2. Slow network simulation (should auto-rebuild if needed)
3. Expired blockhash handling (should be rejected gracefully)

### Rollback

If issues occur, you can rollback by:
```bash
firebase functions:log
# Find the previous deployment version
firebase functions:rollback
```

