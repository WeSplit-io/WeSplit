# Test Scripts for Transaction Processing

This directory contains test scripts to verify transaction processing and fee collection functionality.

## Available Test Scripts

### 1. `test-fee-collection.js`
**Purpose:** Verifies fee collection setup and configuration

**What it tests:**
- Company wallet address accessibility
- Fee payer configuration (company wallet always pays SOL gas fees)
- Fee calculation structure for different transaction types
- Fee collection mechanism (separate USDC transfer instruction)
- Transaction structure requirements
- Simplified transaction signing logic

**Usage:**
```bash
# Test against production
npm run test:secrets

# Test against emulator
USE_EMULATOR=true EMULATOR_HOST=localhost EMULATOR_PORT=5001 node test-fee-collection.js
```

### 2. `test-transaction-processing.js`
**Purpose:** Comprehensive end-to-end test of transaction processing

**What it tests:**
- Transaction creation with fee collection
- Company wallet as fee payer
- User signature (partial signing)
- Firebase Functions signature addition
- Transaction structure verification
- Blockchain confirmation

**Usage:**
```bash
# Test against production
npm run test:transaction

# Test against emulator
USE_EMULATOR=true EMULATOR_HOST=localhost EMULATOR_PORT=5001 node test-transaction-processing.js

# Custom RPC URL
RPC_URL=https://api.devnet.solana.com npm run test:transaction
```

### 3. `test-getCompanyWalletAddress.js`
**Purpose:** Tests the `getCompanyWalletAddress` Firebase Function

**Usage:**
```bash
npm run test:company-wallet
```

### 4. `test-secrets.js`
**Purpose:** Tests Firebase Secrets configuration

**Usage:**
```bash
npm run test:secrets
```

## Fee Collection Verification

### Fee Collection Mechanism

Fees are collected through a **separate USDC transfer instruction** added to the transaction:

1. **Fee Calculation:**
   ```javascript
   const { fee: companyFee, recipientAmount } = FeeService.calculateCompanyFee(amount, transactionType);
   ```

2. **Fee Transfer Instruction:**
   ```javascript
   transaction.add(
     createTransferInstruction(
       fromTokenAccount,
       companyTokenAccount,  // Company wallet's USDC token account
       fromPublicKey,         // User is authority
       companyFeeAmountRaw,   // Fee amount in smallest units
       [],
       TOKEN_PROGRAM_ID
     )
   );
   ```

3. **Important Points:**
   - ✅ Recipient receives **full amount** (fee is additional, not deducted)
   - ✅ Company wallet receives fee as **separate transfer**
   - ✅ Company wallet pays **SOL gas fees** (fee payer)
   - ✅ Fee is calculated based on **transaction type**

### Transaction Types and Fees

| Transaction Type | Fee Percentage | Description |
|-----------------|----------------|-------------|
| `send` | 0.01% | 1:1 transfers |
| `split_payment` | 1.5% | Split funding |
| `withdraw` | 2.0% | External withdrawals |
| `settlement` | 0.0% | Split withdrawals (no fee) |
| `receive` | 0.0% | Receiving money (no fee) |

### Fee Payer Configuration

**Company wallet ALWAYS pays SOL gas fees:**
- Configured in `FeeService.getFeePayerPublicKey()`
- Fetched from Firebase Secrets
- Set as `feePayer` in transaction creation
- Validated in `addCompanySignature()` (simplified)

### Simplified Transaction Signing

The `addCompanySignature()` method has been simplified to only essential validations:

1. ✅ **Fee payer validation** - Company wallet must be fee payer
2. ✅ **Blockhash validation** - Transaction must have blockhash
3. ✅ **User signature validation** - User must sign before company signs
4. ✅ **Sign with company keypair**
5. ✅ **Return serialized transaction**

**Removed redundant validations:**
- ❌ Multiple company wallet index checks
- ❌ Signature array size validation (handled by VersionedTransaction)
- ❌ Already-signed transaction checks
- ❌ Post-signing validation (Solana will reject if invalid)
- ❌ Blockhash change verification (signing doesn't change blockhash)

## Running Tests

### Prerequisites

1. **Firebase Functions deployed:**
   ```bash
   firebase deploy --only functions:processUsdcTransfer,functions:getCompanyWalletAddress
   ```

2. **Firebase Secrets configured:**
   ```bash
   firebase functions:secrets:access COMPANY_WALLET_ADDRESS
   firebase functions:secrets:access COMPANY_WALLET_SECRET_KEY
   ```

3. **Environment variables (optional):**
   ```bash
   export FIREBASE_API_KEY="your-api-key"
   export USE_EMULATOR="true"  # For emulator testing
   export EMULATOR_HOST="localhost"
   export EMULATOR_PORT="5001"
   export RPC_URL="https://api.devnet.solana.com"
   ```

### Quick Test

```bash
# Test fee collection setup
npm run test:secrets

# Test full transaction processing (requires test keypairs with USDC)
npm run test:transaction
```

## Troubleshooting

### Function Not Found
```bash
firebase deploy --only functions:processUsdcTransfer
```

### Permission Denied
Check Firebase Functions IAM permissions in Firebase Console.

### Internal Error
Check Firebase Functions logs:
```bash
firebase functions:log --only processUsdcTransfer
```

### Company Wallet Not Configured
Verify secrets are set:
```bash
firebase functions:secrets:access COMPANY_WALLET_ADDRESS
firebase functions:secrets:access COMPANY_WALLET_SECRET_KEY
```

## Expected Results

### Fee Collection Test
```
✅ Company wallet address: YOUR_COMPANY_WALLET_ADDRESS
✅ Fee payer: Company wallet (always)
✅ Fee calculation: Centralized via FeeService
✅ Fee collection: Separate USDC transfer instruction
✅ Transaction structure: Validated and simplified
✅ Security: Essential validations maintained
```

### Transaction Processing Test
```
✅ Transaction created and signed by user
✅ Company wallet is fee payer
✅ User signature present
✅ Company signature added by Firebase Functions
✅ Transaction submitted successfully
✅ Transaction confirmed on blockchain
```

## Notes

- Tests use **devnet** by default (configurable via `RPC_URL`)
- Test keypairs are **generated** for each test run
- Real USDC balance is **not required** for structure tests
- For full end-to-end tests, use test accounts with USDC on devnet
