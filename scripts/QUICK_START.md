# 🚀 Quick Start Guide - Split Wallet Cleanup

This guide will help you quickly set up and run the split wallet cleanup scripts to remove empty wallets from your database.

## ⚡ 5-Minute Setup

### 1. Configure Environment Variables

Create or update your `.env` file in the project root:

```bash
# Firebase Configuration
FIREBASE_API_KEY=your-actual-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=your-app-id

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
USDC_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### 2. Test Your Setup

```bash
# Test that everything is configured correctly
node scripts/test-cleanup-setup.js
```

You should see:
```
✅ Firebase: Connected
✅ Solana: Connected
✅ Setup is ready for cleanup operations
```

### 3. Run Dry Run (Safe)

```bash
# See what would be deleted without actually deleting anything
./scripts/cleanup-empty-wallets.sh
```

This will show you:
- How many split wallets exist
- How many are empty
- What would be deleted

### 4. Execute Cleanup (If Needed)

```bash
# Actually delete the empty wallets (requires confirmation)
./scripts/cleanup-empty-wallets.sh --execute
```

## 🎯 Common Use Cases

### Clean Up Old Empty Wallets
```bash
# Delete wallets older than 30 days
./scripts/cleanup-empty-wallets.sh --execute --min-age=30
```

### Process Large Datasets
```bash
# Use larger batch size for better performance
./scripts/cleanup-empty-wallets.sh --execute --batch-size=100
```

### Get Detailed Output
```bash
# See detailed information about each operation
./scripts/cleanup-empty-wallets.sh --execute --verbose
```

### Verify On-Chain Balances Only
```bash
# Verify balances without deleting anything
./scripts/cleanup-empty-wallets.sh --verify --verbose

# Verify a specific wallet address
./scripts/cleanup-empty-wallets.sh --verify --wallet=8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD
```

### Burn Empty Wallets and Recover Rent
```bash
# Dry run with wallet burning (see what would be burned)
./scripts/cleanup-empty-wallets.sh --burn-wallets --dry-run --verbose

# Actually burn wallets and recover rent to company wallet
./scripts/cleanup-empty-wallets.sh --burn-wallets --execute --verbose

# Burn with custom minimum rent recovery threshold
./scripts/cleanup-empty-wallets.sh --burn-wallets --execute --min-rent-recovery=0.002
```

## 🛡️ Safety Features

- **Dry Run by Default**: Scripts run in safe mode unless you specify `--execute`
- **Confirmation Required**: You'll be asked to confirm before deleting data
- **Age Filter**: Only deletes wallets older than 7 days (configurable)
- **Balance Check**: Only deletes wallets with less than 0.001 USDC
- **Comprehensive Logging**: See exactly what's happening

## 📊 What Gets Cleaned Up

The scripts will remove:
- ✅ Empty split wallets (from `splitWallets` collection)
- ✅ Associated split data (from `splits` collection)
- ✅ Private key data (from `splitWalletPrivateKeys` collection)
- ✅ Bill data (from `bills` collection, if exists)

## 🚨 Important Notes

1. **Always run dry-run first** to see what would be deleted
2. **Make sure you have backups** before running on production
3. **Test on development environment** first
4. **The scripts are safe by default** - they won't delete anything unless you explicitly tell them to

## 🆘 Need Help?

If you encounter issues:

1. **Check your environment variables** are set correctly
2. **Run the test script** to verify setup: `node scripts/test-cleanup-setup.js`
3. **Start with dry-run** to see what would happen
4. **Check the full README** for detailed troubleshooting

## 📈 Expected Results

After running the cleanup, you should see output like:

```
📊 Cleanup Statistics:
============================================================
Total split wallets audited: 150
Eligible wallets (age filter): 45
Empty split wallets found: 12
Split wallets deleted: 12
Associated splits deleted: 8
Private keys deleted: 12
Bills deleted: 5
Errors encountered: 0
Warnings: 0

✅ Cleanup process completed!
```

This means you successfully cleaned up 12 empty split wallets and their associated data!
