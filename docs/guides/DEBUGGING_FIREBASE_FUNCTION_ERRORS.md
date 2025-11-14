# Debugging Firebase Function "internal" Errors

**Date:** 2025-01-14  
**Issue:** Getting "internal" errors with no logs from Firebase Functions

---

## Problem

When calling `processUsdcTransfer`, you're getting:
- `FirebaseError: internal` on the client
- **No logs** appearing in Firebase Functions (emulator or production)

This suggests the function is either:
1. Not being called at all
2. Failing before any logs are written
3. Not deployed/exported correctly

---

## Step-by-Step Debugging

### 1. Verify Emulator is Running

**Check if emulator is actually running:**
```bash
cd services/firebase-functions
npm run dev
# or
./start-emulator.sh
```

**Look for:**
- `✔  functions: Loaded functions definitions from source: ... processUsdcTransfer`
- `✔  functions[us-central1-processUsdcTransfer]: http function initialized`

**If you don't see `processUsdcTransfer` in the list, the function isn't exported correctly.**

### 2. Check Client-Side Logs

With the enhanced logging, you should now see:

**When function is created:**
```
LOG [INFO] 🔵 Creating processUsdcTransfer callable function
LOG [INFO] ✅ processUsdcTransfer callable function created
```

**When function is called:**
```
LOG [INFO] 🔵 Calling Firebase Function processUsdcTransfer
```

**If function fails:**
```
LOG [ERROR] ❌ Firebase Function processUsdcTransfer FAILED
```

**Check your app logs for these messages** - they will tell you:
- If the function is being created
- If the function is being called
- What error code/message Firebase is returning

### 3. Check Emulator Terminal

**When you make a transaction, watch the emulator terminal for:**
```
🔵 processUsdcTransfer FUNCTION CALLED
```

**If you DON'T see this log:**
- The function isn't being invoked
- Check client-side logs for connection errors
- Verify emulator is running on port 5001
- Check if `EXPO_PUBLIC_USE_PROD_FUNCTIONS` is set (it should be false/undefined)

**If you DO see this log but it stops:**
- The last log before it stops shows where it's failing
- Check for errors in that section

### 4. Verify Function Export

**Check `services/firebase-functions/src/index.js`:**
```javascript
exports.processUsdcTransfer = transactionFunctions.processUsdcTransfer;
```

**Check `services/firebase-functions/src/transactionFunctions.js`:**
```javascript
exports.processUsdcTransfer = functions.runWith({
  secrets: ['COMPANY_WALLET_ADDRESS', 'COMPANY_WALLET_SECRET_KEY'],
  timeoutSeconds: 30,
  memory: '512MB'
}).https.onCall(async (data, context) => {
  // Function code...
});
```

**Both must exist and be correct.**

### 5. Check Secrets in Emulator

**The emulator needs secrets from `.env` file:**

```bash
# Check if secrets are loaded
cd services/firebase-functions
cat .env | grep COMPANY_WALLET
# or check root .env
cd ../..
cat .env | grep COMPANY_WALLET
```

**If secrets are missing, the function will fail during initialization.**

### 6. Test Function Directly

**You can test the function directly using curl:**

```bash
# Get your auth token (if needed)
# Then call the function:
curl -X POST http://localhost:5001/wesplit-35186/us-central1/processUsdcTransfer \
  -H "Content-Type: application/json" \
  -d '{"data":{"serializedTransaction":"test"}}'
```

**This will show you the raw error from the function.**

---

## Common Issues & Solutions

### Issue 1: Function Not Found

**Symptoms:**
- Client logs show: `FirebaseError: function not found`
- Emulator doesn't list `processUsdcTransfer`

**Solution:**
1. Check function export in `index.js`
2. Restart emulator: `npm run dev`
3. Verify function name matches exactly: `processUsdcTransfer`

### Issue 2: Secrets Not Loaded

**Symptoms:**
- Function logs show: `Company wallet configuration missing`
- Emulator shows: `⚠️  COMPANY_WALLET_ADDRESS not found in .env`

**Solution:**
1. Check `.env` file exists in root or `services/firebase-functions/`
2. Verify secrets are set: `COMPANY_WALLET_ADDRESS` and `COMPANY_WALLET_SECRET_KEY`
3. Restart emulator after adding secrets

### Issue 3: Emulator Not Connected

**Symptoms:**
- Client logs show: `Using production Firebase Functions`
- No emulator logs appear

**Solution:**
1. Check `__DEV__` is true
2. Check `EXPO_PUBLIC_USE_PROD_FUNCTIONS` is not set to `true`
3. Verify emulator is running on port 5001
4. Check client logs for: `🔧 Connected to Firebase Functions Emulator`

### Issue 4: Function Fails Before Logging

**Symptoms:**
- No logs at all (not even `🔵 processUsdcTransfer FUNCTION CALLED`)
- Client gets "internal" error

**Solution:**
1. Check function syntax/export is correct
2. Check for runtime errors in `index.js` or `transactionFunctions.js`
3. Look for import errors or missing dependencies
4. Check emulator terminal for startup errors

### Issue 5: Network/Connection Issues

**Symptoms:**
- Client logs show connection errors
- Emulator shows no incoming requests

**Solution:**
1. For physical device: Use computer's IP instead of `localhost`
2. Check firewall isn't blocking port 5001
3. Verify device and computer are on same network
4. Try: `EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST=192.168.1.100` (your IP)

---

## Enhanced Logging Added

### Client-Side Logs

**Function Creation:**
- `🔵 Creating processUsdcTransfer callable function`
- `✅ processUsdcTransfer callable function created`

**Function Call:**
- `🔵 Calling Firebase Function processUsdcTransfer`
- `✅ Firebase Function processUsdcTransfer returned`
- `❌ Firebase Function processUsdcTransfer FAILED` (with full error details)

**Emulator Connection:**
- `🔧 Connected to Firebase Functions Emulator`
- `🌐 Using production Firebase Functions`

### Server-Side Logs (Emulator/Production)

**Function Entry:**
- `🔵 processUsdcTransfer FUNCTION CALLED`

**Initialization:**
- `🔵 TransactionSigningService.initialize: STARTING`
- `🔄 TransactionSigningService.initialize: Checking secrets`
- `✅ TransactionSigningService.initialize: Secrets found`

**Processing:**
- `🔵 TransactionSigningService.processUsdcTransfer CALLED`
- `🔄 TransactionSigningService: Starting initialization check`
- `✅ TransactionSigningService: Initialization complete`

**Errors:**
- `❌ processUsdcTransfer: ERROR CAUGHT` (with full details)
- `❌ TransactionSigningService.initialize: Secrets missing`

---

## Next Steps

1. **Run the app and make a transaction**
2. **Check client-side logs** for the new detailed error messages
3. **Check emulator terminal** for function entry logs
4. **Share the logs** - the enhanced logging will show exactly where it's failing

The logs will now show:
- ✅ If function is being created
- ✅ If function is being called
- ✅ If emulator is connected
- ✅ Where initialization fails (if it does)
- ✅ Full error details (code, message, stack trace)

---

**Last Updated:** 2025-01-14

