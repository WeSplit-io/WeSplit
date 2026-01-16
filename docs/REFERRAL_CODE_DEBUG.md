# Referral Code Permission Issues - Debug Guide

> **Note**: This is a historical debug document. For complete referral system documentation, see [REFERRAL_SYSTEM_COMPLETE.md](./REFERRAL_SYSTEM_COMPLETE.md)

## Problem
Users cannot validate referral codes due to "Missing or insufficient permissions" errors when querying Firestore.

## Root Cause Analysis

### Current Status
1. ✅ User is authenticated (`auth.currentUser` exists)
2. ✅ Auth token is obtained and refreshed before querying
3. ✅ Firestore rules allow `allow read: if request.auth != null;`
4. ✅ Rules are deployed to Firebase
5. ❌ Firestore queries still fail with permission errors

### Possible Causes

#### 1. Firestore SDK Not Using Auth Token
- In Firebase v9, `getFirestore(app)` should automatically use auth from the same app
- But there might be a timing issue where auth state hasn't propagated
- **Solution**: Added test query to verify permissions before referral query

#### 2. Auth Token Not Attached to Requests
- Even though we get the token, Firestore SDK might not be using it
- **Solution**: Added explicit token refresh and verification before querying

#### 3. Firestore Rules Not Evaluating Correctly
- Rules might not be evaluating `request.auth != null` correctly
- **Solution**: Rules are deployed and should be active

#### 4. App Instance Mismatch
- Auth and Firestore might be from different app instances
- **Solution**: Added verification that both use the same app instance

## Diagnostic Steps Added

1. **Test Query**: Before querying referral codes, we now test reading the current user's document
   - If this fails, permissions are broken for all queries
   - If this succeeds, the issue is specific to the referral code query

2. **Token Verification**: Explicitly get and verify auth token before any Firestore operations
   - Forces token refresh to ensure it's valid
   - Logs token details for debugging

3. **App Instance Check**: Verifies Auth and Firestore are from the same Firebase app
   - Logs app names for debugging
   - Returns error if mismatch detected

## Next Steps

1. **Check Logs**: When user tries to validate referral code, check for:
   - "Test query successful" - permissions work
   - "Test query failed" - permissions broken
   - App instance verification logs

2. **If Test Query Fails**:
   - Auth token might not be properly attached to Firestore requests
   - May need to explicitly configure Firestore to use auth instance
   - Check if there's a React Native-specific issue

3. **If Test Query Succeeds but Referral Query Fails**:
   - Issue is specific to the collection query
   - May need to check if rules allow queries (not just document reads)
   - Verify the query structure is correct

## Files Modified

- `src/services/rewards/referralService.ts`: Added test query and enhanced diagnostics
- `config/deployment/firestore.rules`: Rules already allow authenticated reads
- `src/config/firebase/firebase.ts`: Firestore initialized from same app as Auth

## Testing

To test:
1. Create a new account
2. Navigate to CreateProfile screen
3. Enter a referral code
4. Check logs for:
   - Test query result
   - Token verification
   - App instance check
   - Actual query result

