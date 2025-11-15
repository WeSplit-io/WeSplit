# Company Wallet - Complete Guide

## Overview

This guide covers everything about the company wallet implementation, including:
- Firebase Secrets integration
- Production deployment
- Security considerations
- Troubleshooting

## Table of Contents

1. [Implementation](#implementation)
2. [Deployment](#deployment)
3. [Production Verification](#production-verification)
4. [Security](#security)
5. [Troubleshooting](#troubleshooting)

---

## Implementation

### Architecture

The company wallet address is fetched from Firebase Secrets instead of being stored in EAS secrets. This ensures:
- ✅ Single source of truth (Firebase Secrets)
- ✅ No need to update EAS secrets when address changes
- ✅ Better security (address managed in one place)
- ✅ Automatic synchronization between client and backend

### Firebase Function: `getCompanyWalletAddress`

**Location:** `services/firebase-functions/src/transactionFunctions.js`

Returns the company wallet address from Firebase Secrets:

```javascript
exports.getCompanyWalletAddress = functions.runWith({
  secrets: ['COMPANY_WALLET_ADDRESS']
}).https.onCall(async (data, context) => {
  const companyWalletAddress = process.env.COMPANY_WALLET_ADDRESS?.trim();
  if (!companyWalletAddress) {
    throw new functions.https.HttpsError(
      'internal',
      'Company wallet address is not configured in Firebase Secrets'
    );
  }
  return { success: true, address: companyWalletAddress };
});
```

### Client-Side Service

**Location:** `src/services/blockchain/transaction/transactionSigningService.ts`

- `getCompanyWalletAddress()` - Fetches and caches the address from Firebase
- Caching prevents repeated Firebase calls
- Falls back to environment variable in development only

### Updated Configuration

**Location:** `src/config/constants/feeConfig.ts`

- `COMPANY_WALLET_CONFIG.getAddress()` - Async method to get address from Firebase
- `COMPANY_WALLET_CONFIG.address` - Getter with fallback to env var (for backward compatibility)
- `FeeService.getFeePayerPublicKey()` - Now async, fetches from Firebase

### Updated Transaction Services

All transaction services now use the async method:
- ✅ `sendInternal.ts` - Internal transfers
- ✅ `sendExternal.ts` - External transfers  
- ✅ `TransactionProcessor.ts` - General transaction processing
- ✅ `solanaAppKitService.ts` - Wallet service
- ✅ `SplitWalletPayments.ts` - Split wallet transactions

### How It Works

1. **First Call**: Client calls `getCompanyWalletAddress()` which fetches from Firebase
2. **Caching**: Address is cached in memory to avoid repeated calls
3. **Transaction Building**: All transaction services use `await COMPANY_WALLET_CONFIG.getAddress()`
4. **Fallback**: In development, falls back to `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS` env var if Firebase unavailable

---

## Deployment

### 🚨 CRITICAL: Before Production Build

**You MUST deploy the Firebase function first:**

```bash
cd services/firebase-functions
firebase deploy --only functions:getCompanyWalletAddress
```

### Step-by-Step Deployment

#### Step 1: Deploy Firebase Function
```bash
cd services/firebase-functions
firebase deploy --only functions:getCompanyWalletAddress
```

**Expected Output:**
```
✔  functions[getCompanyWalletAddress(us-central1)] Successful create operation.
```

#### Step 2: Verify Function is Deployed
```bash
firebase functions:list | grep getCompanyWalletAddress
```

**Expected Output:**
```
getCompanyWalletAddress    https://us-central1-wesplit-35186.cloudfunctions.net/getCompanyWalletAddress
```

#### Step 3: Test Function (Optional but Recommended)
```bash
# Use Firebase Console to test:
# https://console.firebase.google.com/project/wesplit-35186/functions
# Or use the test script:
cd services/firebase-functions
node test-deployed-functions.js
```

**Expected Response:**
```json
{
  "success": true,
  "address": "HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN"
}
```

#### Step 4: Verify Firebase Secrets
```bash
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
```

**Expected Output:**
```
HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN
```

### Pre-Build Checklist

- [ ] Firebase function `getCompanyWalletAddress` is deployed
- [ ] Function is accessible (tested via Firebase Console)
- [ ] Firebase Secrets are set correctly:
  - [ ] `COMPANY_WALLET_ADDRESS` = `HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN`
  - [ ] `COMPANY_WALLET_SECRET_KEY` = (64-element JSON array)
- [ ] Code changes are committed
- [ ] Ready for production build

### Production Build Command

```bash
eas build --platform ios --profile production
# or
eas build --platform android --profile production
```

---

## Production Verification

### Backend Access - ALREADY WORKING ✅

The backend **already has full access** to the company wallet from Firebase Secrets:

```javascript
// services/firebase-functions/src/transactionSigningService.js
const rawAddress = process.env.COMPANY_WALLET_ADDRESS;      // ✅ From Firebase Secrets
const rawSecretKey = process.env.COMPANY_WALLET_SECRET_KEY; // ✅ From Firebase Secrets
```

**All transaction signing functions use Firebase Secrets:**
- ✅ `signTransaction` - Uses `COMPANY_WALLET_ADDRESS` + `COMPANY_WALLET_SECRET_KEY`
- ✅ `processUsdcTransfer` - Uses `COMPANY_WALLET_ADDRESS` + `COMPANY_WALLET_SECRET_KEY`
- ✅ `submitTransaction` - Uses `COMPANY_WALLET_ADDRESS` + `COMPANY_WALLET_SECRET_KEY`
- ✅ `getCompanyWalletBalance` - Uses `COMPANY_WALLET_ADDRESS` + `COMPANY_WALLET_SECRET_KEY`
- ✅ `getCompanyWalletAddress` - Uses `COMPANY_WALLET_ADDRESS` only

**This means:**
- ✅ Backend can sign transactions (has secret key)
- ✅ Backend can pay fees (has secret key)
- ✅ Works on ALL devices (backend is server-side)
- ✅ No dependency on client environment variables

### Client Access - WILL WORK AFTER DEPLOYMENT ✅

The client fetches the **public address only** from Firebase:

```typescript
// Client calls Firebase Function
const address = await getCompanyWalletAddress(); // ✅ Fetches from Firebase

// Uses address to build transactions
transaction.feePayer = new PublicKey(address);
```

**After deploying `getCompanyWalletAddress` function:**
- ✅ Client gets address from Firebase (works on all devices)
- ✅ No dependency on EAS secrets or env vars
- ✅ Works in production builds (iOS, Android)
- ✅ Works on physical devices
- ✅ Address is cached after first fetch

### Complete Transaction Flow

```
1. User initiates transaction (any device)
   ↓
2. Client: getCompanyWalletAddress() → Firebase Function → Returns address
   ↓
3. Client: Builds transaction with company wallet as fee payer
   ↓
4. Client: Sends to processUsdcTransfer() → Firebase Function
   ↓
5. Backend: Accesses COMPANY_WALLET_SECRET_KEY from Firebase Secrets
   ↓
6. Backend: Signs transaction with company wallet
   ↓
7. Backend: Submits to blockchain
   ↓
8. Transaction confirmed ✅
```

### Device Compatibility Matrix

| Device Type | Backend Access | Client Access | Status |
|------------|----------------|---------------|--------|
| **iOS Production Build** | ✅ Works | ✅ After deployment | Ready |
| **Android Production Build** | ✅ Works | ✅ After deployment | Ready |
| **Physical iPhone** | ✅ Works | ✅ After deployment | Ready |
| **Physical Android** | ✅ Works | ✅ After deployment | Ready |
| **iOS Simulator** | ✅ Works | ✅ After deployment | Ready |
| **Android Emulator** | ✅ Works | ✅ After deployment | Ready |
| **Expo Go (Dev)** | ✅ Works | ⚠️ Falls back to env var | Works now, better after deployment |

---

## Security

### Security Architecture

```
                    ┌─────────────────────────────┐
                    │    Firebase Secrets          │
                    │  (Single Source of Truth)     │
                    └─────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
        ┌───────────▼──────────┐  ┌───▼──────────────────┐
        │  COMPANY_WALLET_      │  │ COMPANY_WALLET_      │
        │  ADDRESS (Public)     │  │ SECRET_KEY (Private) │
        └───────────┬──────────┘  └───┬──────────────────┘
                    │                   │
        ┌───────────▼──────────┐  ┌───▼──────────────────┐
        │  Client App            │  │ Firebase Functions    │
        │  (React Native)        │  │ (Backend)             │
        │                       │  │                       │
        │  ✅ Gets address      │  │  ✅ Has address        │
        │  ✅ Builds tx         │  │  ✅ Has secret key     │
        │  ❌ No secret key     │  │  ✅ Signs tx           │
        └───────────────────────┘  └───────────────────────┘
```

### Security Guarantees

- ✅ Company wallet address is public (safe to expose via Firebase Function)
- ✅ Secret key remains in Firebase Secrets only (never in client)
- ✅ All secret key operations happen on backend
- ✅ No private keys in client code or EAS secrets
- ✅ Secret key not accessible to users
- ✅ Secret key not in logs (only metadata)
- ✅ Secret key not in build artifacts

For detailed security audit, see: [Security Audit: Company Wallet](../audits/SECURITY_AUDIT_COMPANY_WALLET.md)

---

## Troubleshooting

### Error: "not-found"
- **Cause**: Function not deployed
- **Fix**: Run `firebase deploy --only functions:getCompanyWalletAddress`

### Error: "Company wallet address not configured in Firebase Secrets"
- **Cause**: Secret not set
- **Fix**: Run `echo 'HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN' | firebase functions:secrets:set COMPANY_WALLET_ADDRESS`

### Error: "Invalid address format"
- **Cause**: Secret contains invalid data
- **Fix**: Verify secret value is correct address (32-44 characters)

### Error: "Failed to get company wallet address from Firebase [FirebaseError: not-found]"
- **Cause**: Function not deployed or not accessible
- **Impact**: 
  - ✅ In Expo Go (development): Falls back to env var, transaction works
  - ❌ In Production Build: Will fail because env vars are not available
- **Fix**: Deploy the function (see Deployment section)

### Testing

#### Test in Expo Go (Development):
1. Should see error: "Failed to get company wallet address from Firebase [FirebaseError: not-found]"
2. Should fallback to env var
3. Transaction should work ✅

#### Test in Production Build:
1. **AFTER deploying function**: Should fetch from Firebase successfully
2. Transaction should work ✅
3. **BEFORE deploying function**: Will fail with clear error message

---

## Code Changes Summary

### Files Modified:

1. `src/services/blockchain/transaction/transactionSigningService.ts`
   - Enhanced `getCompanyWalletAddress()` with better error handling
   - Production mode: No env var fallback
   - Development mode: Allows env var fallback
   - Address format validation

2. `src/config/constants/feeConfig.ts`
   - Updated `getCompanyWalletAddress()` to match behavior
   - Production mode: No env var fallback
   - Development mode: Allows env var fallback

3. All transaction services:
   - `sendInternal.ts`
   - `sendExternal.ts`
   - `TransactionProcessor.ts`
   - `solanaAppKitService.ts`
   - `SplitWalletPayments.ts`

### Enhanced Features:

1. **Error Handling**
   - Detects "not-found" errors specifically
   - Provides actionable error messages with deployment instructions
   - Validates address format (32-44 characters)
   - Enhanced logging for debugging

2. **Production vs Development Behavior**
   - **Production (`!__DEV__`)**: NO fallback - MUST fetch from Firebase
   - **Development (`__DEV__`)**: Allows fallback to env vars for testing
   - Clear error messages indicating what's required

3. **Caching Strategy**
   - Address is cached after first successful fetch
   - Prevents duplicate Firebase calls
   - Promise-based to handle concurrent requests

---

## Important Notes

1. **The function MUST be deployed before production build**
2. **In production, there is NO fallback to env vars** - it will fail if Firebase is unavailable
3. **The address is cached after first fetch** - subsequent transactions won't call Firebase again
4. **Error messages now include deployment instructions** - easier to debug
5. **The address is cached per app session** - restart app to get new address if changed in Firebase

---

## Related Documentation

- [Security Audit: Company Wallet](../audits/SECURITY_AUDIT_COMPANY_WALLET.md)
- [Firebase Secrets Setup Guide](./FIREBASE_SECRETS_SETUP_GUIDE.md)
- [Company Wallet Change Guide](./COMPANY_WALLET_CHANGE_GUIDE.md)

