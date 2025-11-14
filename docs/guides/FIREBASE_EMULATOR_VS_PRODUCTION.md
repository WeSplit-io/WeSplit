# Firebase Functions: Emulator vs Production Differences

**Date:** 2025-01-14  
**Purpose:** Document key behavioral differences between Firebase Functions emulator and production deployment

---

## Overview

The Firebase Functions emulator and production deployment have several important differences that can cause code to work in one environment but fail in the other. Understanding these differences is crucial for debugging and ensuring consistent behavior.

---

## 1. Environment Variables & Secrets

### Emulator
- ✅ **Loads from `.env` files** - Uses `dotenv` to load from root `.env` or `services/firebase-functions/.env`
- ✅ **Shell environment variables** - Can use `export` commands before starting
- ✅ **Manual secret loading** - Secrets must be explicitly loaded via `.env` file or shell exports
- ⚠️ **No automatic Firebase Secrets** - Must manually provide secrets via `.env` file

**How it works:**
```javascript
// services/firebase-functions/src/index.js
if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: rootEnvPath }); // Loads from .env file
}
```

### Production
- ✅ **Firebase Secrets automatically available** - Secrets are automatically injected as `process.env` variables
- ✅ **No `.env` file needed** - Secrets are managed via Firebase Secret Manager
- ✅ **Secrets are secure** - Stored encrypted in Firebase Secret Manager
- ⚠️ **Must set secrets via Firebase CLI** - `firebase functions:secrets:set SECRET_NAME`

**How it works:**
```javascript
// In production, Firebase automatically injects secrets as process.env variables
const companyWalletAddress = process.env.COMPANY_WALLET_ADDRESS; // From Firebase Secrets
```

**Key Difference:** Emulator requires manual secret loading, production automatically has secrets available.

---

## 2. Network Configuration

### Emulator
- ✅ **Uses `.env` file variables** - `EXPO_PUBLIC_FORCE_MAINNET`, `EXPO_PUBLIC_DEV_NETWORK`, etc.
- ✅ **Can override easily** - Just edit `.env` file and restart emulator
- ⚠️ **Must match frontend** - If frontend uses `EXPO_PUBLIC_DEV_NETWORK=mainnet`, emulator must have same value

**Example:**
```bash
# .env file
EXPO_PUBLIC_FORCE_MAINNET=true
EXPO_PUBLIC_DEV_NETWORK=mainnet
```

### Production
- ✅ **Uses Firebase Secrets or environment variables** - Can set via Firebase Secrets or build-time environment variables
- ⚠️ **Must be set before deployment** - Cannot change without redeploying
- ⚠️ **Must match frontend build** - EAS build sets these at build time

**Key Difference:** Emulator can change network config instantly, production requires redeployment.

---

## 3. Cold Start & Performance

### Emulator
- ✅ **Fast cold start** - Usually < 100ms (runs on your machine)
- ✅ **No cold start delays** - Functions start immediately
- ✅ **Consistent performance** - No network latency to Google Cloud
- ⚠️ **Limited by your machine** - Performance depends on your CPU/RAM

### Production
- ⚠️ **Slower cold start** - Can take 1-5 seconds (especially with secrets)
- ⚠️ **Cold start delays** - First invocation after inactivity is slower
- ⚠️ **Network latency** - Additional latency to Google Cloud infrastructure
- ✅ **Better after warm-up** - Subsequent invocations are fast

**Key Difference:** Production has cold start delays that can cause timeouts, emulator is always fast.

---

## 4. Error Handling & Logging

### Emulator
- ✅ **Detailed console logs** - See all `console.log()` output in real-time
- ✅ **Stack traces visible** - Full error stack traces in terminal
- ✅ **Immediate feedback** - See errors as they happen
- ✅ **Better debugging** - Can use `debugger` statements

**Example:**
```bash
# Emulator terminal shows:
> Error processing USDC transfer: {
>   error: 'Connection not initialized',
>   errorStack: 'Error: Connection not initialized\n    at ...',
>   totalTimeMs: 1234
> }
```

### Production
- ⚠️ **Logs in Firebase Console** - Must check Firebase Console for logs
- ⚠️ **Delayed log visibility** - Logs may take 10-30 seconds to appear
- ⚠️ **Generic errors** - Errors may be wrapped as "internal" without details
- ⚠️ **Limited debugging** - Cannot use `debugger` statements

**Example:**
```javascript
// Production may show generic error:
FirebaseError: internal
// Instead of the actual error message
```

**Key Difference:** Emulator shows detailed errors immediately, production logs are delayed and may be generic.

---

## 5. Timeouts & Resource Limits

### Emulator
- ✅ **No timeout limits** - Can run indefinitely (limited by your machine)
- ✅ **No memory limits** - Limited only by your machine's RAM
- ✅ **No invocation limits** - Can call functions unlimited times
- ⚠️ **May be slower** - Depends on your machine's performance

### Production
- ⚠️ **Timeout limits** - Default 60 seconds, can be configured up to 540 seconds
- ⚠️ **Memory limits** - Must specify memory (128MB, 256MB, 512MB, etc.)
- ⚠️ **Invocation limits** - Free tier has limits, paid tier has quotas
- ✅ **Better performance** - After warm-up, Google Cloud infrastructure is fast

**Key Difference:** Production has strict limits, emulator is more lenient.

---

## 6. Firestore & Database Access

### Emulator
- ⚠️ **Can connect to production Firestore** - By default, emulator connects to production Firestore
- ⚠️ **No Firestore emulator** - Unless you explicitly start Firestore emulator
- ⚠️ **Production data** - Changes affect production database (unless using Firestore emulator)
- ✅ **Fast database access** - Direct connection to Firebase

**Example:**
```bash
# Emulator connects to production Firestore by default
# To use Firestore emulator:
firebase emulators:start --only functions,firestore
```

### Production
- ✅ **Always uses production Firestore** - No choice, always production
- ✅ **Optimized connections** - Google Cloud optimizes database connections
- ⚠️ **Network latency** - Additional latency to database

**Key Difference:** Emulator can accidentally modify production data, production always uses production data.

---

## 7. Authentication & Security

### Emulator
- ⚠️ **Can skip authentication** - Emulator may not enforce authentication checks
- ⚠️ **No auth emulator** - Unless explicitly started
- ⚠️ **Less secure** - Easier to bypass security checks
- ✅ **Easier testing** - Can test without authentication

### Production
- ✅ **Strict authentication** - All authentication checks are enforced
- ✅ **Secure by default** - Cannot bypass security checks
- ⚠️ **Requires valid tokens** - Must have valid Firebase Auth tokens

**Key Difference:** Emulator may skip auth checks, production always enforces them.

---

## 8. Network & RPC Calls

### Emulator
- ✅ **Uses your network** - RPC calls go through your internet connection
- ✅ **Can use localhost** - Can connect to local services
- ⚠️ **Your network speed** - Limited by your internet connection
- ⚠️ **Firewall issues** - May be blocked by your firewall

### Production
- ✅ **Google Cloud network** - RPC calls go through Google Cloud's network
- ✅ **Better reliability** - Google Cloud has better network infrastructure
- ✅ **Faster RPC calls** - Optimized network paths
- ⚠️ **Cannot use localhost** - Cannot connect to local services

**Key Difference:** Emulator uses your network, production uses Google Cloud's optimized network.

---

## 9. Code Execution Context

### Emulator
- ✅ **Runs on your machine** - Uses your Node.js version
- ✅ **Can use local files** - Can access local file system
- ✅ **Can use local services** - Can connect to localhost services
- ⚠️ **Environment differences** - May differ from production environment

### Production
- ✅ **Runs on Google Cloud** - Uses Google Cloud's Node.js runtime
- ⚠️ **Read-only file system** - Cannot write to file system (except `/tmp`)
- ⚠️ **No localhost** - Cannot connect to localhost services
- ✅ **Consistent environment** - Same environment for all invocations

**Key Difference:** Emulator runs on your machine, production runs on Google Cloud with restrictions.

---

## 10. Common Issues & Solutions

### Issue 1: "internal" Error in Production
**Cause:** Generic error wrapping in production hides actual error  
**Symptoms:**
- Works in emulator but fails in production
- Error message is just "internal" with no details
- Transaction fails with generic FirebaseError

**Root Causes:**
1. **Secrets not loaded** - Firebase Secrets not set in production
2. **Initialization failures** - Service initialization fails silently
3. **Network configuration mismatch** - Wrong RPC endpoint
4. **Timeout during initialization** - Cold start takes too long
5. **Error handling issues** - Errors are caught but not properly logged

**Solution:**
1. ✅ **Enhanced error logging** (already implemented) - Check Firebase Console logs for detailed errors
2. ✅ **Verify Firebase Secrets** - Ensure `COMPANY_WALLET_ADDRESS` and `COMPANY_WALLET_SECRET_KEY` are set
3. ✅ **Check initialization logs** - Look for "Failed to initialize transaction signing service" in logs
4. ✅ **Verify network configuration** - Ensure production has correct network environment variables
5. ✅ **Check timeout settings** - Ensure timeout is sufficient (currently 30 seconds)

**Debugging Steps:**
```bash
# 1. Check if secrets are set
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
firebase functions:secrets:access COMPANY_WALLET_SECRET_KEY

# 2. Check Firebase Console logs
# Go to Firebase Console > Functions > Logs
# Look for detailed error messages with stack traces

# 3. Check initialization logs
# Look for "Transaction signing service initialized successfully" or errors
```

### Issue 2: Secrets Not Found
**Emulator:** 
- Check `.env` file exists and has correct values
- Verify secrets are loaded: `echo $COMPANY_WALLET_ADDRESS`
- Check emulator startup logs for "✅ COMPANY_WALLET_ADDRESS loaded"

**Production:** 
- Verify secrets are set: `firebase functions:secrets:access SECRET_NAME`
- Check Firebase Console > Functions > Configuration for bound secrets
- Ensure secrets are bound in `functions.runWith({ secrets: [...] })`

**Key Difference:** Emulator loads from `.env`, production loads from Firebase Secret Manager

### Issue 3: Network Configuration Mismatch
**Emulator:** 
- Check `.env` file has `EXPO_PUBLIC_DEV_NETWORK=mainnet` or `EXPO_PUBLIC_FORCE_MAINNET=true`
- Verify network is logged: Look for "🌐 Network: mainnet" in emulator startup logs
- Check `transactionSigningService.js` logs for "Final network selection"

**Production:** 
- Verify Firebase Secrets or build-time environment variables match
- Check Firebase Console logs for "Final network selection: { network: 'mainnet' }"
- Ensure EAS build has correct environment variables in `eas.json`

**Key Difference:** Emulator uses `.env` file, production uses Firebase Secrets or build-time env vars

### Issue 4: Timeout Errors
**Emulator:** 
- Usually not an issue (no timeout limits)
- Can run indefinitely
- Limited only by your machine's resources

**Production:** 
- Default timeout is 60 seconds
- Current setting: `timeoutSeconds: 30` (may be too short for cold starts)
- Increase timeout: `functions.runWith({ timeoutSeconds: 60 })`
- Consider: Cold start + initialization can take 2-5 seconds

**Key Difference:** Emulator has no timeouts, production has strict timeout limits

### Issue 5: Cold Start Delays
**Emulator:** No cold starts  
**Production:** First invocation after inactivity is slower - consider keeping functions warm

### Issue 6: Firestore Connection
**Emulator:** May connect to production Firestore (check emulator logs)  
**Production:** Always uses production Firestore

---

## 11. Best Practices

### For Development (Emulator)
1. ✅ **Use `.env` file** - Centralize all environment variables
2. ✅ **Test with production-like data** - Use production Firestore for realistic testing
3. ✅ **Monitor logs** - Watch emulator terminal for errors
4. ✅ **Test timeout scenarios** - Add delays to simulate production cold starts

### For Production
1. ✅ **Set Firebase Secrets** - Use `firebase functions:secrets:set`
2. ✅ **Test before deploying** - Always test in emulator first
3. ✅ **Monitor Firebase Console** - Check logs for errors
4. ✅ **Set appropriate timeouts** - Configure timeout based on function needs
5. ✅ **Use structured logging** - Log detailed error information (already implemented)

---

## 12. Debugging Checklist

When code works in emulator but fails in production:

- [ ] **Check Firebase Secrets** - Are secrets set in Firebase Secret Manager?
- [ ] **Check network configuration** - Do environment variables match between emulator and production?
- [ ] **Check Firebase Console logs** - Look for detailed error messages
- [ ] **Check timeout settings** - Is function timing out in production?
- [ ] **Check cold start** - Is first invocation slower than expected?
- [ ] **Check error handling** - Are errors being properly logged?
- [ ] **Check Firestore access** - Are database operations working correctly?
- [ ] **Check authentication** - Are auth tokens valid in production?

---

## 13. Quick Reference

| Feature | Emulator | Production |
|---------|----------|------------|
| **Secrets** | `.env` file | Firebase Secrets |
| **Cold Start** | < 100ms | 1-5 seconds |
| **Timeouts** | None | 60s default (configurable) |
| **Logs** | Terminal (immediate) | Firebase Console (delayed) |
| **Firestore** | Production (default) | Production (always) |
| **Network** | Your connection | Google Cloud |
| **Error Details** | Full stack traces | May be generic |
| **Debugging** | Easy (debugger works) | Harder (logs only) |
| **Initialization** | Fast (< 100ms) | Slower (200-500ms on cold start) |
| **Error Messages** | Detailed | May be wrapped as "internal" |

## 14. Specific to Your Codebase

### Transaction Signing Service

**Emulator:**
- Initialization: < 100ms (no cold start)
- Secrets: Loaded from `.env` file
- Network: Determined from `.env` variables
- Errors: Full stack traces in terminal

**Production:**
- Initialization: 200-500ms on cold start (can cause blockhash expiration)
- Secrets: Loaded from Firebase Secrets (automatic)
- Network: Determined from Firebase Secrets or build-time env vars
- Errors: May be wrapped as "internal" - check Firebase Console logs

### Common Production Issues

1. **"internal" Error**
   - **Check:** Firebase Console logs for detailed error
   - **Look for:** "Failed to initialize transaction signing service"
   - **Verify:** Secrets are set: `firebase functions:secrets:access COMPANY_WALLET_ADDRESS`

2. **Network Mismatch**
   - **Check:** Firebase Console logs for "Final network selection"
   - **Verify:** Production has `EXPO_PUBLIC_DEV_NETWORK=mainnet` or `EXPO_PUBLIC_FORCE_MAINNET=true`
   - **Solution:** Set as Firebase Secret or in EAS build environment

3. **Initialization Timeout**
   - **Check:** Firebase Console logs for "Service initialization took longer than expected"
   - **Solution:** Increase timeout or optimize initialization
   - **Current:** `timeoutSeconds: 30` (may need to increase to 60)

4. **Blockhash Expiration**
   - **Emulator:** Less likely (faster initialization)
   - **Production:** More likely (slower cold start + initialization)
   - **Solution:** Already optimized - client sends fresh blockhash, backend processes quickly

---

**Last Updated:** 2025-01-14

