# Firebase Functions Signature Access Issues - Diagnostic Guide

**Date:** 2025-01-16  
**Issue:** Problems accessing signature for certain wallets in Firebase Functions

---

## Common Issues and Solutions

### Issue 1: Company Wallet Secret Key Not Accessible

**Symptoms:**
- Error: "Company keypair not initialized"
- Error: "Company wallet secret key (COMPANY_WALLET_SECRET_KEY) is missing or invalid"
- Transaction fails with initialization errors

**Diagnosis:**
```bash
# Check if secrets are set
cd services/firebase-functions
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
firebase functions:secrets:access COMPANY_WALLET_SECRET_KEY
```

**Solution:**
```bash
# Set company wallet address
echo "YOUR_WALLET_ADDRESS" | firebase functions:secrets:set COMPANY_WALLET_ADDRESS

# Set company wallet secret key (as JSON array)
echo "[1,2,3,...64 numbers]" | firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY

# Or set from file
firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY < secret_key.json
```

**Verify:**
```bash
# Check function configuration
firebase functions:config:get

# Check recent logs for initialization
firebase functions:log | grep -i "initialize\|keypair\|wallet"
```

---

### Issue 2: Transaction Fee Payer Mismatch

**Symptoms:**
- Error: "Transaction fee payer is not company wallet"
- Error: "Company wallet is not in required signers list"
- Transaction fails during signing

**Root Cause:**
- Transaction was created with wrong fee payer
- For shared wallet/split wallet withdrawals, fee payer should be the wallet itself (not company)
- These transactions should NOT go through Firebase Functions

**Diagnosis:**
Check transaction structure in logs:
```bash
firebase functions:log | grep -A 20 "Validating transaction structure"
```

**Solution:**
1. **For regular transactions (send_1to1, split contributions):**
   - Ensure `FeeService.getFeePayerPublicKey()` is used
   - Company wallet must be fee payer

2. **For shared wallet withdrawals:**
   - These should be signed locally (not through Firebase Functions)
   - Fee payer is the shared wallet itself
   - Already handled correctly in `ConsolidatedTransactionService.handleSharedWalletWithdrawal`

3. **For split wallet withdrawals:**
   - These should be signed locally (not through Firebase Functions)
   - Fee payer is the split wallet itself
   - Already handled correctly in `ConsolidatedTransactionService.handleFairSplitWithdrawal`

---

### Issue 3: Company Keypair Initialization Failure

**Symptoms:**
- Error: "Failed to initialize transaction signing service"
- Error: "Company wallet public key mismatch"
- Error: "Invalid secret key format"

**Diagnosis:**
Check initialization logs:
```bash
firebase functions:log | grep -A 30 "TransactionSigningService.initialize"
```

**Common Causes:**
1. **Secret key format incorrect:**
   - Must be JSON array: `[1,2,3,...64]`
   - Or base64-encoded JSON array
   - Or base64-encoded Uint8Array

2. **Secret key length incorrect:**
   - Must be exactly 64 numbers
   - Check: `secretKeyArray.length === 64`

3. **Public key mismatch:**
   - Derived public key doesn't match COMPANY_WALLET_ADDRESS
   - Check if secret key matches the address

**Solution:**
```bash
# Verify secret key format
# Should be: [number, number, ... 64 numbers total]

# Re-set secret key if needed
firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY

# Verify address matches
firebase functions:secrets:set COMPANY_WALLET_ADDRESS
```

---

### Issue 4: Transaction Structure Issues

**Symptoms:**
- Error: "Company wallet is not in required signers list"
- Error: "Cannot sign with non signer key"
- Transaction fails during signing

**Root Cause:**
- Transaction was compiled incorrectly
- Company wallet not set as fee payer
- Company wallet not in required signers

**Diagnosis:**
Check transaction structure:
```bash
firebase functions:log | grep -A 15 "Validating transaction structure"
```

Look for:
- `feePayerMatchesCompany: true/false`
- `companyWalletInRequiredSigners: true/false`
- `requiredSignerAccounts: [...]`

**Solution:**
1. Ensure `FeeService.getFeePayerPublicKey()` is called
2. Set transaction fee payer: `transaction.feePayer = feePayerPublicKey`
3. Verify company wallet is first in staticAccountKeys

---

## Debugging Commands

### Check Recent Errors
```bash
cd services/firebase-functions
firebase functions:log | grep -i "error\|failed\|❌" | tail -50
```

### Check Initialization
```bash
firebase functions:log | grep -A 20 "TransactionSigningService.initialize"
```

### Check Transaction Signing
```bash
firebase functions:log | grep -A 20 "addCompanySignature\|Validating transaction structure"
```

### Check Fee Payer Validation
```bash
firebase functions:log | grep -A 10 "fee payer\|feePayer\|company wallet"
```

### Check Specific Function Calls
```bash
firebase functions:log | grep -A 30 "processUsdcTransfer FUNCTION CALLED"
```

---

## Verification Checklist

- [ ] Company wallet address is set in Firebase Secrets
- [ ] Company wallet secret key is set in Firebase Secrets
- [ ] Secret key format is correct (JSON array of 64 numbers)
- [ ] Public key derived from secret key matches address
- [ ] Function is deployed with secrets bound
- [ ] Transaction fee payer is company wallet (for Firebase Functions transactions)
- [ ] Company wallet is in required signers list
- [ ] Transaction structure is valid

---

## Code Fixes Applied

1. ✅ **Improved error messages** - More descriptive errors for fee payer mismatches
2. ✅ **Better validation** - Checks fee payer before attempting to sign
3. ✅ **HashDoc fix** - Fixed timeout handling in duplicate check
4. ✅ **Verification timeout fix** - Increased timeouts for mainnet RPC indexing

---

## Next Steps

1. **Deploy updated functions:**
   ```bash
   cd services/firebase-functions
   firebase deploy --only functions:processUsdcTransfer
   ```

2. **Monitor logs:**
   ```bash
   firebase functions:log --only processUsdcTransfer
   ```

3. **Test transaction:**
   - Try a transaction that was failing
   - Check logs for specific error messages
   - Verify fee payer is company wallet

4. **If issue persists:**
   - Share specific error message from logs
   - Check which transaction type is failing
   - Verify Firebase Secrets are correctly set
