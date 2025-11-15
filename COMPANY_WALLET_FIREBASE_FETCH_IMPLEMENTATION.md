# Company Wallet Address - Firebase Secrets Implementation

## Overview
The company wallet address is now fetched from Firebase Secrets instead of being stored in EAS secrets. This ensures:
- ✅ Single source of truth (Firebase Secrets)
- ✅ No need to update EAS secrets when address changes
- ✅ Better security (address managed in one place)
- ✅ Automatic synchronization between client and backend

## Implementation

### 1. Firebase Function: `getCompanyWalletAddress`
**Location:** `services/firebase-functions/src/transactionFunctions.js`

Returns the company wallet address from Firebase Secrets:
```javascript
exports.getCompanyWalletAddress = functions.runWith({
  secrets: ['COMPANY_WALLET_ADDRESS']
}).https.onCall(async (data, context) => {
  const companyWalletAddress = process.env.COMPANY_WALLET_ADDRESS?.trim();
  return { success: true, address: companyWalletAddress };
});
```

### 2. Client-Side Service
**Location:** `src/services/blockchain/transaction/transactionSigningService.ts`

- `getCompanyWalletAddress()` - Fetches and caches the address from Firebase
- Caching prevents repeated Firebase calls
- Falls back to environment variable if Firebase fetch fails

### 3. Updated Configuration
**Location:** `src/config/constants/feeConfig.ts`

- `COMPANY_WALLET_CONFIG.getAddress()` - Async method to get address from Firebase
- `COMPANY_WALLET_CONFIG.address` - Getter with fallback to env var (for backward compatibility)
- `FeeService.getFeePayerPublicKey()` - Now async, fetches from Firebase

### 4. Updated Transaction Services
All transaction services now use the async method:
- ✅ `sendInternal.ts` - Internal transfers
- ✅ `sendExternal.ts` - External transfers  
- ✅ `TransactionProcessor.ts` - General transaction processing
- ✅ `solanaAppKitService.ts` - Wallet service
- ✅ `SplitWalletPayments.ts` - Split wallet transactions

## How It Works

1. **First Call**: Client calls `getCompanyWalletAddress()` which fetches from Firebase
2. **Caching**: Address is cached in memory to avoid repeated calls
3. **Transaction Building**: All transaction services use `await COMPANY_WALLET_CONFIG.getAddress()`
4. **Fallback**: If Firebase fetch fails, falls back to `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS` env var

## Benefits

1. **Single Source of Truth**: Address stored only in Firebase Secrets
2. **No EAS Secret Needed**: Removed dependency on EAS secrets for company wallet address
3. **Automatic Sync**: Client always gets the latest address from Firebase
4. **Backward Compatible**: Falls back to env var if Firebase unavailable

## Deployment Steps

1. ✅ **Firebase Function Created**: `getCompanyWalletAddress`
2. ✅ **Client Service Updated**: Fetches from Firebase with caching
3. ✅ **All Transaction Services Updated**: Use async `getAddress()` method
4. ⏳ **Deploy Firebase Functions**: `firebase deploy --only functions:getCompanyWalletAddress`
5. ⏳ **Test**: Verify address is fetched correctly

## Testing

After deployment, test that:
1. Address is fetched from Firebase on first transaction
2. Address is cached for subsequent transactions
3. Transactions use the correct company wallet address
4. No errors about missing address

## Notes

- The address is cached per app session
- If the address changes in Firebase, restart the app to get the new address
- For production, ensure Firebase Secrets have the correct address: `HfokbWfQPH6CpWwoKjENFnhbcYfU5cr7gPB7GsHkxHpN`

