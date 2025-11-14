# Production Deployment Checklist

**Date:** 2025-01-14  
**Purpose:** Step-by-step checklist to ensure production uses mainnet and all systems are configured correctly

---

## ✅ Pre-Deployment Checklist

### 1. Environment Variables

- [ ] **Root `.env` file configured:**
  ```bash
  EXPO_PUBLIC_FORCE_MAINNET=true
  EXPO_PUBLIC_DEV_NETWORK=mainnet
  EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=<your_mainnet_wallet_address>
  ```

- [ ] **Firebase Secrets set for production:**
  ```bash
  firebase functions:secrets:set SOLANA_NETWORK
  # Enter: mainnet
  
  firebase functions:secrets:set COMPANY_WALLET_ADDRESS
  # Enter: <your_mainnet_wallet_address>
  
  firebase functions:secrets:set COMPANY_WALLET_SECRET_KEY
  # Enter: <your_base64_encoded_secret_key>
  ```

- [ ] **EAS Secrets set for production builds:**
  ```bash
  eas secret:create --scope project --name EXPO_PUBLIC_FORCE_MAINNET --value true
  eas secret:create --scope project --name EXPO_PUBLIC_DEV_NETWORK --value mainnet
  eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value <your_mainnet_wallet_address>
  ```

### 2. Network Configuration Verification

- [ ] **Run verification script:**
  ```bash
  ./scripts/verify-production-config.sh
  ```

- [ ] **Verify EAS build configuration:**
  - Check `eas.json` - production profile has `EXPO_PUBLIC_FORCE_MAINNET=true`
  - Check `eas.json` - production profile has `EXPO_PUBLIC_DEV_NETWORK=mainnet`

### 3. Fee Configuration

- [ ] **Verify fee percentages in production:**
  - Check `config/environment/env.production.example` or production `.env`
  - Ensure fee percentages match your business requirements
  - Default values:
    - Send: 3.0% (min: $0.001, max: $10.00)
    - Split Payment: 2.0% (min: $0.001, max: $5.00)
    - Settlement: 0.0% (no fee)
    - Withdraw: 4.0% (min: $0.50, max: $15.00)

### 4. Points Configuration

- [ ] **Verify points calculation:**
  - Check `src/services/rewards/seasonRewardsConfig.ts`
  - Current Season 4: 5% of transaction amount
  - Partnership users get enhanced rewards

### 5. Company Wallet

- [ ] **Verify company wallet has sufficient SOL:**
  - Minimum: 1.0 SOL (configurable via `EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE`)
  - Company wallet pays all SOL gas fees

---

## 🚀 Deployment Steps

### Step 1: Deploy Firebase Functions

```bash
cd services/firebase-functions
firebase deploy --only functions
```

**Verify:**
- Functions deployed successfully
- Check logs for network configuration:
  ```
  Final network selection: { network: 'mainnet', isMainnet: true }
  ```

### Step 2: Build Production App

```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

**Verify:**
- Build completes successfully
- Check build logs for environment variables

### Step 3: Test Production Build

1. **Install production build on test device**
2. **Check app logs for network:**
   ```
   Network configuration: { network: 'mainnet', ... }
   ```
3. **Test transaction:**
   - Send small amount ($1-5)
   - Verify transaction goes to mainnet
   - Verify fee is collected
   - Verify points are awarded

---

## ✅ Post-Deployment Verification

### 1. Network Verification

- [ ] **Check Firebase Functions logs:**
  ```bash
  firebase functions:log --only processUsdcTransfer
  ```
  - Look for: `network: 'mainnet'`
  - Look for: `rpcUrl: 'https://solana-mainnet...'`

- [ ] **Check app logs:**
  - Look for: `Network: mainnet`
  - Look for: `Using mainnet RPC`

### 2. Fee Collection Verification

- [ ] **Check company wallet balance:**
  - Use `getCompanyWalletBalance` Firebase Function
  - Verify fees are accumulating

- [ ] **Check transaction logs:**
  - Verify `companyFee` is calculated correctly
  - Verify fee transfer instruction is added

### 3. Points Verification

- [ ] **Check points awarded:**
  - Verify points match expected percentage
  - Example: $100 transaction → 5 points (5% for Season 4)

- [ ] **Check Firestore:**
  - Verify `users/{userId}.points` updated
  - Verify `points_transactions` collection has record

### 4. Transaction Consistency

- [ ] **Test all transaction types:**
  - Send (1:1 transfer)
  - Split payment
  - Settlement (should have 0% fee)
  - External transfer
  - Payment request

- [ ] **Verify all use same logic:**
  - All use `FeeService.calculateCompanyFee()`
  - All use `COMPANY_WALLET_CONFIG.address`
  - All go through Firebase Functions

---

## 🐛 Troubleshooting

### Issue: Production still using devnet

**Solution:**
1. Check Firebase Secrets: `firebase functions:secrets:access SOLANA_NETWORK`
2. Check EAS Secrets: `eas secret:list`
3. Verify `eas.json` production profile has correct env vars
4. Rebuild app: `eas build --profile production --clear-cache`

### Issue: Fees not being collected

**Solution:**
1. Check `COMPANY_WALLET_CONFIG.address` is set correctly
2. Check company wallet has USDC token account
3. Verify fee calculation: `FeeService.calculateCompanyFee(amount, transactionType)`
4. Check transaction logs for fee transfer instruction

### Issue: Points not being awarded

**Solution:**
1. Check transaction amount >= $1 (minimum for points)
2. Check season configuration in `seasonRewardsConfig.ts`
3. Verify `pointsService.awardTransactionPoints()` is called
4. Check Firestore for points transaction records

---

## 📊 Monitoring

### Daily Checks

1. **Company Wallet Balance:**
   - Check SOL balance (should be > 1.0 SOL)
   - Check USDC balance (fees should accumulate)

2. **Transaction Success Rate:**
   - Monitor Firebase Functions logs
   - Check for transaction failures

3. **Points Awarded:**
   - Verify points match expected percentages
   - Check for points calculation errors

### Weekly Checks

1. **Network Usage:**
   - Verify all transactions use mainnet
   - Check for any devnet transactions (should be 0)

2. **Fee Collection:**
   - Verify fees match expected percentages
   - Check for missing fee collections

3. **System Health:**
   - Check Firebase Functions performance
   - Check RPC endpoint health

---

**Last Updated:** 2025-01-14

