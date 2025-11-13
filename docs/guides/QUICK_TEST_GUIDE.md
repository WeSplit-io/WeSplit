# Quick Test Guide - Firebase Functions Integration

**Quick reference for testing the Firebase Functions integration**

---

## 🚀 Quick Start

### 1. Run Automated Test Script

```bash
node tools/scripts/test-firebase-functions.js
```

This will check:
- ✅ Function availability
- ✅ Function logs
- ✅ Firebase Secrets configuration
- ✅ Client-side integration
- ✅ Security (no secret keys in client code)

---

### 2. Test in App (Manual)

#### Test Internal Transfer

1. **Open the app**
2. **Navigate to Send screen**
3. **Select recipient** (internal user)
4. **Enter amount**: 1 USDC
5. **Send transaction**

**What to check:**
- ✅ Transaction completes successfully
- ✅ No errors in console
- ✅ Transaction appears in history
- ✅ Company wallet balance decreases (for fees)

#### Test Company Wallet Balance

```typescript
// In your app code or React Native debugger
import { getCompanyWalletBalance } from './services/blockchain/transaction/transactionSigningService';

const balance = await getCompanyWalletBalance();
console.log('Company wallet balance:', balance);
```

---

### 3. Check Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/project/wesplit-35186/functions)
2. Click on `getCompanyWalletBalance`
3. Use "Test" tab to call the function
4. Check "Logs" tab for any errors

---

### 4. Check Function Logs

```bash
cd services/firebase-functions

# Check recent logs
firebase functions:log --limit 20

# Check specific function
firebase functions:log --only signTransaction --limit 10

# Follow logs in real-time
firebase functions:log --follow
```

---

### 5. Common Issues

#### ❌ Authentication Error
```
Error: User must be authenticated
```
**Fix:** Ensure user is logged in before calling functions.

#### ❌ Rate Limit Error
```
Error: Rate limit exceeded
```
**Fix:** Wait a few minutes and try again.

#### ❌ Invalid Transaction
```
Error: Invalid transaction format
```
**Fix:** Check transaction serialization before sending.

#### ❌ Company Wallet Balance Low
```
Error: Insufficient balance
```
**Fix:** Fund company wallet with SOL for fees.

---

## 📋 Test Checklist

- [ ] Run automated test script
- [ ] Test internal transfer in app
- [ ] Test external transfer in app
- [ ] Test split wallet payment
- [ ] Check Firebase Console logs
- [ ] Verify company wallet balance
- [ ] Check for errors in console
- [ ] Verify transactions on blockchain

---

## 🔍 Debugging

### Check Function Status

```bash
firebase functions:list
```

### Check Function Metrics

1. Firebase Console → Functions
2. Click on a function
3. View metrics (invocations, errors, execution time)

### Check Client-Side Logs

```typescript
// Enable detailed logging
import { logger } from './services/analytics/loggingService';

logger.info('Testing transaction', { /* data */ }, 'TestService');
```

---

## 📚 Full Documentation

For detailed testing instructions, see:
- [Testing Firebase Functions Guide](./TESTING_FIREBASE_FUNCTIONS.md)

---

## 🆘 Need Help?

1. Check Firebase Console logs
2. Review function metrics
3. Check this guide for common issues
4. Review full testing guide

