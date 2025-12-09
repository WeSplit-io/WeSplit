# Firebase Functions Diagnosis Report

**Date:** 2025-12-09  
**Function:** `processUsdcTransfer`  
**Status:** ⚠️ **INVESTIGATING**

## Issue Summary

The `processUsdcTransfer` Firebase Function is returning "internal" errors from both:
- Firebase Functions Emulator (when running)
- Production Firebase Functions

The error message is generic: `FirebaseError: internal`

## Verification Completed ✅

### 1. Function Deployment Status
- ✅ Function is deployed and exists in Firebase
- ✅ Function is listed in `firebase functions:list`
- ✅ Function has correct configuration:
  - Runtime: `nodejs20`
  - Memory: `512MB`
  - Timeout: `60s`
  - Type: `callable`
  - Secrets configured: `COMPANY_WALLET_ADDRESS`, `COMPANY_WALLET_SECRET_KEY`, `ALCHEMY_API_KEY`, `GETBLOCK_API_KEY`, `HELIUS_API_KEY`, `USE_PAID_RPC`

### 2. Code Structure
- ✅ No syntax errors in `transactionFunctions.js`
- ✅ No syntax errors in `transactionSigningService.js`
- ✅ Function is properly exported in `index.js`
- ✅ Service is properly initialized and exported
- ✅ Error handling is comprehensive

### 3. Function Structure
- ✅ Function wrapper is correct: `functions.runWith({ secrets: [...] }).https.onCall(...)`
- ✅ Top-level try-catch is in place
- ✅ Error logging is comprehensive
- ✅ Function entry logging is present

## Current Behavior

### From Client Logs:
```
LOG  [INFO] [TransactionSigningService] 🔧 Connected to Firebase Functions Emulator
LOG  [WARN] [TransactionSigningService] ⚠️ Emulator call failed, attempting fallback to production Functions
LOG  [INFO] [TransactionSigningService] 🔄 Retrying with production Functions
LOG  [ERROR] [TransactionSigningService] ❌ Production Functions call also failed
Error: Firebase Function error (functions/internal): internal
```

### Expected Behavior:
- Function should log: `🔵 processUsdcTransfer FUNCTION CALLED`
- Function should log: `📥 processUsdcTransfer: Received data`
- Function should process the transaction

### Actual Behavior:
- No execution logs are appearing in Firebase logs
- Both emulator and production return "internal" error
- Function appears to be failing before first log statement

## Possible Causes

### 1. Function Not Being Called
- **Symptom:** No logs at all
- **Likelihood:** Low (client is making the call)
- **Check:** Verify function URL/endpoint is correct

### 2. Module Loading Error
- **Symptom:** Function fails during require/import
- **Likelihood:** Medium
- **Check:** Verify all dependencies are available

### 3. Initialization Error
- **Symptom:** Function fails during `transactionSigningService.ensureInitialized()`
- **Likelihood:** High
- **Possible causes:**
  - Missing Firebase Secrets
  - Invalid secret format
  - RPC connection failure
  - Keypair creation failure

### 4. Function Wrapper Error
- **Symptom:** Error in function wrapper itself
- **Likelihood:** Low
- **Check:** Verify function wrapper syntax

## Next Steps to Diagnose

### 1. Check Firebase Console Logs
1. Go to Firebase Console: https://console.firebase.google.com/project/wesplit-35186/functions/logs
2. Filter by function: `processUsdcTransfer`
3. Look for:
   - `🔵 processUsdcTransfer FUNCTION CALLED`
   - `❌ processUsdcTransfer: ERROR CAUGHT`
   - Any initialization errors
   - Stack traces

### 2. Test Function Directly
```bash
# Test with Firebase CLI
firebase functions:shell
# Then call:
processUsdcTransfer({ serializedTransaction: "test" })
```

### 3. Check Firebase Secrets
```bash
# Verify secrets are set
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
firebase functions:secrets:access COMPANY_WALLET_SECRET_KEY
```

### 4. Check Emulator Logs
If using emulator:
```bash
# Start emulator with verbose logging
firebase emulators:start --only functions --debug
```

### 5. Add More Defensive Logging
- Add logging before service initialization
- Add logging in service initialization
- Add logging for each step of the process

## Code Changes Made

### 1. Enhanced Error Logging
- Added comprehensive error details in catch block
- Added initialization error detection
- Added secret error detection
- Extended error stack trace to 2000 characters

### 2. Emulator Fallback
- Added automatic fallback to production when emulator fails
- Creates fresh Firebase app instance for production
- Improved error detection for connection vs function errors

### 3. Function Entry Logging
- Added check for `transactionSigningService` availability
- Enhanced logging with service availability check

## Recommendations

1. **Check Firebase Console Logs** - Most important step to see actual error
2. **Verify Secrets** - Ensure all required secrets are set and accessible
3. **Test Function Directly** - Use Firebase CLI to test function directly
4. **Check Network** - Verify RPC endpoints are accessible from Firebase Functions
5. **Review Initialization** - Check if `transactionSigningService.initialize()` is failing

## Function Configuration

```javascript
exports.processUsdcTransfer = functions.runWith({
  secrets: [
    'COMPANY_WALLET_ADDRESS', 
    'COMPANY_WALLET_SECRET_KEY',
    'ALCHEMY_API_KEY',
    'GETBLOCK_API_KEY',
    'HELIUS_API_KEY',
    'USE_PAID_RPC'
  ],
  timeoutSeconds: 60,
  memory: '512MB'
}).https.onCall(async (data, context) => {
  // Function implementation
});
```

## Error Handling

The function has comprehensive error handling:
- Top-level try-catch
- Detailed error logging
- Proper HttpsError throwing
- Error details preservation

## Conclusion

The function is properly structured and deployed. The "internal" error suggests a runtime issue, likely during:
1. Service initialization
2. Secret access
3. RPC connection
4. Keypair creation

**Next Action:** Check Firebase Console logs for detailed error messages and stack traces.
