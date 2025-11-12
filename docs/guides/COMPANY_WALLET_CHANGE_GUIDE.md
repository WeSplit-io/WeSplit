# Company Wallet Change Guide

**Date:** 2024-12-19  
**Purpose:** Step-by-step guide for securely changing the company wallet address and private key  
**Security Level:** 🔒 **CRITICAL - Handle with Extreme Care**

**New Company Wallet Address:** `YOUR_COMPANY_WALLET_ADDRESS_HERE`

---

## ⚠️ Important Security Warnings

1. **Never commit secret keys to version control**
2. **Never store secret keys in client-side code**
3. **Always use secure environment variable storage**
4. **Verify wallet address matches public key before use**
5. **Test on devnet before mainnet deployment**

---

## Prerequisites

Before changing the company wallet, ensure you have:

- ✅ Access to backend environment variables
- ✅ Access to client-side environment variables (for address only)
- ✅ A secure method to generate/store the new wallet
- ✅ Ability to fund the new wallet with SOL and USDC
- ✅ Backup of current wallet (if needed)

---

## Step 1: Export Private Key from Solflare Wallet

**Your New Wallet Address:** `YOUR_COMPANY_WALLET_ADDRESS_HERE`

### Export Private Key from Solflare:

1. **Open Solflare Wallet:**
   - Open the Solflare extension or mobile app
   - Log in to your wallet

2. **Access Wallet Settings:**
   - Click on the wallet menu (three dots or settings icon)
   - Select "Export Private Key" or "Show Private Key"

3. **Export Private Key:**
   - Enter your password/PIN to confirm
   - Copy the private key (it will be in base58 format)
   - **⚠️ Keep this secure - never share it!**

4. **Verify Address:**
   - Confirm the address matches: `YOUR_COMPANY_WALLET_ADDRESS_HERE`

### Convert Private Key to Required Format:

Solflare exports private keys in base58 format, but the backend needs a JSON array format. Use the conversion script:

```bash
# Install required package
npm install bs58

# Convert your Solflare private key
node tools/scripts/convert-solflare-key.js <YOUR_SOLFLARE_PRIVATE_KEY>
```

This will output:
- Your wallet address (should match: `YOUR_COMPANY_WALLET_ADDRESS_HERE`)
- The secret key in JSON array format for the backend
- Environment variables you need to set

---

## Step 1 (Old): Generate New Wallet (If Needed) - SKIP THIS IF YOU ALREADY HAVE A WALLET

### Option A: Generate Using Solana CLI (Recommended)

```bash
# Install Solana CLI if not already installed
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate new keypair
solana-keygen new --outfile ~/company-wallet-keypair.json

# Get the public key (address)
solana-keygen pubkey ~/company-wallet-keypair.json

# Get the secret key in JSON array format (for backend)
cat ~/company-wallet-keypair.json
```

**Output Example:**
```json
[123,45,67,89,...]  // This is the secret key array
```

**Address Example:**
```
7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

### Option B: Generate Using Node.js Script

Create a temporary script `generate-wallet.js`:

```javascript
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

// Generate new keypair
const keypair = Keypair.generate();

// Get address (public key)
const address = keypair.publicKey.toBase58();

// Get secret key as JSON array
const secretKey = Array.from(keypair.secretKey);

// Output results
console.log('Address:', address);
console.log('Secret Key (JSON):', JSON.stringify(secretKey));

// Save to file (SECURE LOCATION - NOT IN REPO)
const output = {
  address: address,
  secretKey: secretKey
};

fs.writeFileSync(
  './company-wallet-secure.json',
  JSON.stringify(output, null, 2)
);

console.log('\n✅ Wallet generated and saved to company-wallet-secure.json');
console.log('⚠️  DELETE THIS FILE AFTER SECURING THE CREDENTIALS!');
```

Run the script:
```bash
node generate-wallet.js
```

**⚠️ CRITICAL:** Delete the script and output file after securing credentials!

---

## Step 2: Fund the New Wallet

Before switching to the new wallet, ensure it has sufficient funds:

### On Devnet (for testing):
```bash
# Request airdrop on devnet
solana airdrop 2 <NEW_WALLET_ADDRESS> --url devnet
```

### On Mainnet (for production):
1. **Transfer SOL** from old wallet to new wallet:
   - Minimum: `EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE` (default: 1.0 SOL)
   - Recommended: 2-5 SOL for gas fees

2. **Transfer USDC** if needed for fee collection:
   - Amount depends on expected fee volume

3. **Verify balances:**
   ```bash
   # Check SOL balance
   solana balance <NEW_WALLET_ADDRESS> --url mainnet-beta
   
   # Check USDC balance (use Solana Explorer or RPC)
   ```

---

## Step 3: Update Environment Variables

### 3.1 Update Client-Side Environment Variables

**File:** `.env` (or your environment configuration)

```bash
# Company Wallet Configuration
# SECURITY: Only address is stored here - secret key is on backend
EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=YOUR_COMPANY_WALLET_ADDRESS_HERE
EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE=1.0
EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE=0.001
```

**Files to update:**
- `.env` (local development)
- `.env.production` (production)
- EAS environment variables (for Expo builds)

### 3.2 Update Backend Environment Variables

**File:** Backend `.env` (server-side only)

```bash
# Company Wallet Configuration
# SECURITY: This is server-side only - NEVER use EXPO_PUBLIC_ prefix
COMPANY_WALLET_ADDRESS=YOUR_COMPANY_WALLET_ADDRESS_HERE
COMPANY_WALLET_SECRET_KEY=[123,45,67,89,...]  # JSON array format from conversion script
```

**⚠️ IMPORTANT:** Replace `[123,45,67,89,...]` with the actual JSON array output from the conversion script!

**⚠️ CRITICAL:** 
- Use `COMPANY_WALLET_SECRET_KEY` (NOT `EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY`)
- Store as JSON array: `[123,45,67,89,...]`
- Never commit to version control
- Use secure secret management (AWS Secrets Manager, HashiCorp Vault, etc.)

### 3.3 Update EAS Environment Variables (for Expo)

```bash
# Set client-side variables
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value YOUR_COMPANY_WALLET_ADDRESS_HERE
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE --value 1.0
eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE --value 0.001

# Backend variables should be set on your server, not in EAS
```

---

## Step 4: Verify Configuration

### 4.1 Verify Address Matches Secret Key

Create a verification script `verify-wallet.js`:

```javascript
const { Keypair } = require('@solana/web3.js');

// Get from environment variables
const address = process.env.COMPANY_WALLET_ADDRESS;
const secretKeyArray = JSON.parse(process.env.COMPANY_WALLET_SECRET_KEY);

// Create keypair from secret key
const keypair = Keypair.fromSecretKey(Buffer.from(secretKeyArray));

// Verify address matches
const derivedAddress = keypair.publicKey.toBase58();

if (address === derivedAddress) {
  console.log('✅ Wallet verification successful!');
  console.log('Address:', address);
} else {
  console.error('❌ Wallet verification failed!');
  console.error('Expected:', address);
  console.error('Got:', derivedAddress);
  process.exit(1);
}
```

Run verification:
```bash
COMPANY_WALLET_ADDRESS=<NEW_ADDRESS> \
COMPANY_WALLET_SECRET_KEY='[123,45,67,...]' \
node verify-wallet.js
```

### 4.2 Verify Backend Service

Check that the backend transaction signing service can initialize:

```javascript
// services/backend/services/transactionSigningService.js
// Should initialize without errors
const service = new TransactionSigningService();
```

Expected output:
```
✅ Transaction signing service initialized
Company Address: <NEW_WALLET_ADDRESS>
```

### 4.3 Verify Client-Side Configuration

Check that the client can read the address:

```typescript
// In your app
import { COMPANY_WALLET_CONFIG } from './config/constants/feeConfig';

console.log('Company Wallet Address:', COMPANY_WALLET_CONFIG.address);
// Should output: <NEW_WALLET_ADDRESS>
```

---

## Step 5: Test the New Wallet

### 5.1 Test on Devnet First

1. **Update devnet environment variables**
2. **Deploy to devnet**
3. **Test transaction flow:**
   - Send a test transaction
   - Verify fee collection works
   - Verify gas fee payment works
   - Check wallet balances

### 5.2 Test Transaction Signing

Create a test script `test-transaction-signing.js`:

```javascript
const { Connection, Transaction, SystemProgram, PublicKey } = require('@solana/web3.js');
const { TransactionSigningService } = require('./services/backend/services/transactionSigningService');

async function testTransactionSigning() {
  try {
    const service = new TransactionSigningService();
    
    // Create a test transaction
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: service.companyKeypair.publicKey,
        toPubkey: new PublicKey('11111111111111111111111111111111'),
        lamports: 1000,
      })
    );
    
    // Sign transaction
    const signedTransaction = await service.signTransaction(transaction);
    
    console.log('✅ Transaction signing test successful!');
    console.log('Transaction signature:', signedTransaction.signature);
    
  } catch (error) {
    console.error('❌ Transaction signing test failed:', error);
    process.exit(1);
  }
}

testTransactionSigning();
```

---

## Step 6: Deploy to Production

### 6.1 Pre-Deployment Checklist

- [ ] New wallet is funded with sufficient SOL
- [ ] New wallet is funded with USDC (if needed)
- [ ] Address matches secret key (verified)
- [ ] Backend environment variables updated
- [ ] Client-side environment variables updated
- [ ] EAS environment variables updated (if using Expo)
- [ ] Tested on devnet successfully
- [ ] Backup of old wallet credentials (if needed)

### 6.2 Deployment Steps

1. **Update Production Environment Variables:**
   ```bash
   # Backend (server-side)
   export COMPANY_WALLET_ADDRESS=<NEW_ADDRESS>
   export COMPANY_WALLET_SECRET_KEY='[123,45,67,...]'
   
   # Client-side (for builds)
   export EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=<NEW_ADDRESS>
   ```

2. **Restart Backend Services:**
   ```bash
   # Restart to load new environment variables
   pm2 restart all
   # or
   systemctl restart your-backend-service
   ```

3. **Rebuild Client Application:**
   ```bash
   # For Expo
   eas build --platform all --profile production
   
   # Or for local builds
   npm run build
   ```

4. **Verify Deployment:**
   - Check backend logs for successful initialization
   - Test a small transaction
   - Monitor wallet balances
   - Check for any errors

---

## Step 7: Monitor and Validate

### 7.1 Monitor Wallet Activity

- Monitor SOL balance (should not drop below minimum reserve)
- Monitor USDC balance (fee collection)
- Check transaction logs for errors
- Monitor backend service health

### 7.2 Validate Operations

- ✅ Fee collection working correctly
- ✅ Gas fee payment working correctly
- ✅ Premium payments working correctly
- ✅ No transaction failures
- ✅ No authentication errors

---

## Step 8: Cleanup (Optional)

### 8.1 Old Wallet (If Retiring)

If you're retiring the old wallet:

1. **Transfer remaining funds** to new wallet
2. **Verify all transactions completed**
3. **Archive old wallet credentials** (secure storage)
4. **Remove old wallet from monitoring**

### 8.2 Temporary Files

Delete any temporary files created during the process:

```bash
# Remove temporary wallet generation files
rm -f generate-wallet.js
rm -f verify-wallet.js
rm -f test-transaction-signing.js
rm -f company-wallet-secure.json
rm -f company-wallet-keypair.json
```

---

## Security Best Practices

### ✅ DO:

1. **Use secure secret management:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Environment variables (server-side only)

2. **Verify address matches secret key** before deployment

3. **Test on devnet** before mainnet

4. **Monitor wallet balances** regularly

5. **Use multi-signature wallets** for high-value operations

6. **Rotate wallets periodically** for security

7. **Backup wallet credentials** securely (encrypted)

### ❌ DON'T:

1. **Never commit secret keys** to version control

2. **Never use `EXPO_PUBLIC_` prefix** for secret keys

3. **Never store secret keys** in client-side code

4. **Never share secret keys** via insecure channels

5. **Never use the same wallet** for devnet and mainnet

6. **Never skip verification** steps

7. **Never deploy without testing** on devnet first

---

## Troubleshooting

### Issue: Backend Service Fails to Initialize

**Error:** `Company wallet configuration missing`

**Solution:**
- Verify `COMPANY_WALLET_ADDRESS` is set
- Verify `COMPANY_WALLET_SECRET_KEY` is set
- Check environment variable format (JSON array)
- Restart backend service

### Issue: Address Mismatch

**Error:** `Company wallet public key mismatch`

**Solution:**
- Verify secret key matches address
- Check JSON array format
- Re-run verification script

### Issue: Insufficient Funds

**Error:** `Company wallet has insufficient SOL`

**Solution:**
- Transfer SOL to new wallet
- Check minimum reserve requirement
- Monitor balance regularly

### Issue: Transaction Signing Fails

**Error:** `Failed to sign transaction`

**Solution:**
- Verify backend service initialized
- Check secret key format
- Verify network configuration
- Check transaction structure

---

## Quick Reference

### Environment Variables

**Client-Side (Public):**
```bash
EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=YOUR_COMPANY_WALLET_ADDRESS_HERE
EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE=1.0
EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE=0.001
```

**Backend (Private):**
```bash
COMPANY_WALLET_ADDRESS=YOUR_COMPANY_WALLET_ADDRESS_HERE
COMPANY_WALLET_SECRET_KEY=[123,45,67,...]  # JSON array from conversion script
```

### File Locations

- **Client Config:** `src/config/constants/feeConfig.ts`
- **Backend Service:** `services/backend/services/transactionSigningService.js`
- **Environment Files:** `.env`, `.env.production`

---

## Support

If you encounter issues:

1. Check the troubleshooting section
2. Review backend logs
3. Verify environment variables
4. Test on devnet first
5. Contact security team if needed

---

**Last Updated:** 2024-12-19  
**Security Review:** ✅ Approved  
**Status:** Production Ready

