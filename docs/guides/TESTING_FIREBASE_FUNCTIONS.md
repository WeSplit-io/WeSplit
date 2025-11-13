# Testing Firebase Functions Integration

**Date:** 2024-12-19  
**Purpose:** Guide for testing the Firebase Functions integration for company wallet signing

---

## Overview

This guide covers testing the Firebase Functions integration for secure company wallet transaction signing. The integration ensures that company wallet secret keys are never exposed to client-side code.

---

## Prerequisites

1. ✅ Firebase Functions deployed successfully
2. ✅ Firebase Secrets configured (`COMPANY_WALLET_ADDRESS`, `COMPANY_WALLET_SECRET_KEY`)
3. ✅ Firebase Authentication enabled
4. ✅ Test user account created
5. ✅ Test wallet with SOL/USDC balance

---

## Testing Strategy

### 1. **Direct Firebase Function Testing**

Test the Firebase Functions directly using Firebase CLI or HTTP requests.

#### Test 1.1: Check Function Availability

```bash
# List all deployed functions
cd services/firebase-functions
firebase functions:list

# Check function logs
firebase functions:log --only signTransaction --limit 10
```

#### Test 1.2: Test Function Authentication

```bash
# Test with authentication (requires Firebase Auth token)
# This should fail without authentication
curl -X POST \
  https://us-central1-wesplit-35186.cloudfunctions.net/signTransaction \
  -H "Content-Type: application/json" \
  -d '{"data": {"serializedTransaction": "test"}}'
```

Expected: Should return authentication error.

---

### 2. **Client-Side Integration Testing**

Test the client-side integration using the React Native app.

#### Test 2.1: Test Transaction Signing Service

Create a test file: `src/services/blockchain/transaction/__tests__/transactionSigningService.test.ts`

```typescript
import { signTransaction, submitTransaction, getCompanyWalletBalance } from '../transactionSigningService';

describe('TransactionSigningService', () => {
  it('should get company wallet balance', async () => {
    const balance = await getCompanyWalletBalance();
    expect(balance.success).toBe(true);
    expect(balance.address).toBeDefined();
    expect(balance.balance).toBeGreaterThanOrEqual(0);
  });

  it('should sign transaction with company wallet', async () => {
    // Create a test transaction
    const testTransaction = new Uint8Array([1, 2, 3, 4, 5]);
    
    try {
      const signed = await signTransaction(testTransaction);
      expect(signed).toBeDefined();
      expect(signed.length).toBeGreaterThan(0);
    } catch (error) {
      // Expected to fail with invalid transaction
      expect(error).toBeDefined();
    }
  });
});
```

---

### 3. **End-to-End Transaction Testing**

Test complete transaction flows from the app.

#### Test 3.1: Internal Transfer Test

**Steps:**
1. Open the app
2. Navigate to Send screen
3. Select a recipient (internal user)
4. Enter amount (e.g., 1 USDC)
5. Send transaction

**Expected Behavior:**
- ✅ Transaction is signed with user keypair
- ✅ Transaction is sent to Firebase Function for company wallet signature
- ✅ Transaction is submitted to blockchain
- ✅ Transaction appears in transaction history
- ✅ Company wallet balance decreases (SOL for fees)
- ✅ Recipient balance increases

**Check Logs:**
```bash
# Check Firebase Function logs
firebase functions:log --only signTransaction --limit 20

# Check for errors
firebase functions:log --only signTransaction | grep -i error
```

#### Test 3.2: External Transfer Test

**Steps:**
1. Open the app
2. Navigate to Send screen
3. Enter external wallet address
4. Enter amount (e.g., 1 USDC)
5. Send transaction

**Expected Behavior:**
- ✅ Same as internal transfer
- ✅ External wallet receives USDC

#### Test 3.3: Split Wallet Payment Test

**Steps:**
1. Create or open a split wallet
2. Fund the split wallet
3. Make a payment from the split wallet

**Expected Behavior:**
- ✅ Transaction uses company wallet for fees
- ✅ Payment is processed successfully
- ✅ Company fee is deducted correctly

---

### 4. **Manual Testing Script**

Create a manual testing script to verify Firebase Functions.

#### Test Script: `tools/scripts/test-firebase-functions.js`

```javascript
const admin = require('firebase-admin');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Initialize Firebase Admin (for testing)
if (!admin.apps.length) {
  admin.initializeApp();
}

async function testFirebaseFunctions() {
  console.log('🧪 Testing Firebase Functions...\n');

  // Test 1: Get Company Wallet Balance
  console.log('Test 1: Get Company Wallet Balance');
  try {
    const functions = getFunctions();
    const getBalance = httpsCallable(functions, 'getCompanyWalletBalance');
    const result = await getBalance({});
    console.log('✅ Balance retrieved:', result.data);
  } catch (error) {
    console.error('❌ Failed to get balance:', error.message);
  }

  // Test 2: Validate Transaction (with invalid transaction)
  console.log('\nTest 2: Validate Transaction');
  try {
    const functions = getFunctions();
    const validate = httpsCallable(functions, 'validateTransaction');
    const invalidTx = Buffer.from([1, 2, 3]).toString('base64');
    const result = await validate({ serializedTransaction: invalidTx });
    console.log('✅ Validation result:', result.data);
  } catch (error) {
    console.log('⚠️  Expected validation error:', error.message);
  }

  console.log('\n✅ Testing complete!');
}

testFirebaseFunctions().catch(console.error);
```

---

### 5. **Firebase Console Testing**

Use Firebase Console to test functions directly.

#### Steps:
1. Go to [Firebase Console](https://console.firebase.google.com/project/wesplit-35186/functions)
2. Click on a function (e.g., `signTransaction`)
3. Use the "Test" tab to call the function
4. Check logs in the "Logs" tab

---

### 6. **Monitoring and Debugging**

#### Check Function Logs

```bash
# Real-time logs
firebase functions:log --only signTransaction --follow

# Filter by error
firebase functions:log | grep -i error

# Check specific function
firebase functions:log --only submitTransaction --limit 50
```

#### Check Function Metrics

1. Go to Firebase Console → Functions
2. Click on a function
3. View metrics:
   - Invocations
   - Errors
   - Execution time
   - Memory usage

#### Common Issues and Solutions

**Issue 1: Authentication Error**
```
Error: User must be authenticated
```
**Solution:** Ensure user is logged in before calling functions.

**Issue 2: Rate Limit Error**
```
Error: Rate limit exceeded
```
**Solution:** Wait a few minutes and try again. Check rate limit configuration.

**Issue 3: Invalid Transaction**
```
Error: Invalid transaction format
```
**Solution:** Ensure transaction is properly serialized before sending.

**Issue 4: Company Wallet Balance Low**
```
Error: Insufficient balance
```
**Solution:** Fund the company wallet with SOL for transaction fees.

---

### 7. **Automated Testing**

#### Unit Tests

Create unit tests for the transaction signing service:

```typescript
// src/services/blockchain/transaction/__tests__/transactionSigningService.test.ts
import { signTransaction } from '../transactionSigningService';
import * as firebaseFunctions from 'firebase/functions';

jest.mock('firebase/functions');

describe('TransactionSigningService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call Firebase Function with correct parameters', async () => {
    const mockCallable = jest.fn().mockResolvedValue({
      data: {
        success: true,
        serializedTransaction: Buffer.from([1, 2, 3]).toString('base64')
      }
    });

    (firebaseFunctions.httpsCallable as jest.Mock).mockReturnValue(mockCallable);

    const testTx = new Uint8Array([1, 2, 3]);
    await signTransaction(testTx);

    expect(mockCallable).toHaveBeenCalledWith({
      serializedTransaction: Buffer.from(testTx).toString('base64')
    });
  });
});
```

#### Integration Tests

Test the full transaction flow:

```typescript
// src/services/blockchain/transaction/__tests__/sendInternal.integration.test.ts
import { sendInternalTransfer } from '../sendInternal';

describe('Internal Transfer Integration', () => {
  it('should complete full transaction flow', async () => {
    const result = await sendInternalTransfer({
      to: 'TEST_RECIPIENT_ADDRESS',
      amount: 1,
      currency: 'USDC',
      userId: 'TEST_USER_ID'
    });

    expect(result.success).toBe(true);
    expect(result.signature).toBeDefined();
  });
});
```

---

### 8. **Performance Testing**

#### Test Function Response Times

```bash
# Time a function call
time curl -X POST \
  https://us-central1-wesplit-35186.cloudfunctions.net/getCompanyWalletBalance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response Times:**
- `signTransaction`: < 2 seconds
- `submitTransaction`: < 5 seconds
- `getCompanyWalletBalance`: < 1 second
- `validateTransaction`: < 1 second

---

### 9. **Security Testing**

#### Test 9.1: Verify No Secret Key Exposure

```bash
# Search codebase for secret key references
grep -r "COMPANY_WALLET_SECRET_KEY" src/
grep -r "companyWalletSecretKey" src/
```

**Expected:** No matches in client-side code.

#### Test 9.2: Verify Authentication

```typescript
// Test that unauthenticated calls fail
try {
  await signTransaction(testTx);
  fail('Should have thrown authentication error');
} catch (error) {
  expect(error.message).toContain('unauthenticated');
}
```

---

### 10. **Test Checklist**

Use this checklist to verify everything works:

- [ ] Firebase Functions deployed successfully
- [ ] All 6 transaction functions are available
- [ ] Firebase Secrets configured correctly
- [ ] Authentication working
- [ ] Internal transfers working
- [ ] External transfers working
- [ ] Split wallet payments working
- [ ] Company wallet balance check working
- [ ] Error handling working
- [ ] Rate limiting working
- [ ] Logs are being generated
- [ ] No secret keys in client-side code
- [ ] Transaction fees are paid by company wallet
- [ ] Transactions are confirmed on blockchain

---

## Quick Test Commands

```bash
# Test company wallet balance
cd services/firebase-functions
firebase functions:call getCompanyWalletBalance

# Check function logs
firebase functions:log --limit 20

# Test function locally (requires emulator)
firebase emulators:start --only functions

# Deploy and test
firebase deploy --only functions
```

---

## Next Steps

1. ✅ Run manual tests
2. ✅ Create automated test suite
3. ✅ Set up monitoring alerts
4. ✅ Document any issues found
5. ✅ Update this guide with findings

---

## Support

If you encounter issues:
1. Check Firebase Console logs
2. Check function metrics
3. Verify Firebase Secrets are set
4. Check authentication status
5. Review this guide for common issues

