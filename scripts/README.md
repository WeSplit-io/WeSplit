# Split Wallet Cleanup Scripts

This directory contains scripts to audit and clean up empty split wallets from your database. These scripts help you identify and remove split wallets that have zero balance along with their associated data.

## 🚨 Important Safety Notes

- **Always run in dry-run mode first** to see what would be deleted
- **Make sure you have proper backups** before running cleanup scripts
- **Test on a development environment** before running on production
- **The scripts will ask for confirmation** before deleting data (unless using `--confirm`)

## 📁 Files Overview

### Core Scripts
- `cleanup-empty-split-wallets.js` - Basic cleanup script
- `cleanup-empty-split-wallets-advanced.js` - Advanced cleanup with batch processing and more features
- `cleanup-empty-wallets.sh` - Shell script runner for easy execution

### Configuration
- `cleanup-config.js` - Configuration template
- `README.md` - This documentation

## 🚀 Quick Start

### 1. Prerequisites

Make sure you have:
- Node.js installed
- Firebase credentials configured (via environment variables or .env file)
- Solana RPC access
- Required npm packages installed (`npm install`)

### 2. Environment Setup

Create a `.env` file in the project root with your credentials:

```bash
# Firebase Configuration
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=your-app-id

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
USDC_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### 3. Run Cleanup (Recommended)

Use the shell script for the easiest experience:

```bash
# Dry run (safe - shows what would be deleted)
./scripts/cleanup-empty-wallets.sh

# Dry run with verbose output
./scripts/cleanup-empty-wallets.sh --verbose

# Actually delete data (requires confirmation)
./scripts/cleanup-empty-wallets.sh --execute

# Delete wallets older than 30 days
./scripts/cleanup-empty-wallets.sh --execute --min-age=30
```

## 📋 Detailed Usage

### Shell Script Options

```bash
./scripts/cleanup-empty-wallets.sh [OPTIONS]

Options:
  --dry-run              Run in dry-run mode (default)
  --execute              Actually delete data (requires confirmation)
  --batch-size=N         Number of wallets to process in each batch (default: 50)
  --min-age=N            Only delete wallets older than N days (default: 7)
  --verbose              Show detailed output
  --simple               Use simple cleanup script instead of advanced
  --help, -h             Show help message
```

### Direct Node.js Usage

#### Basic Script
```bash
# Dry run
node scripts/cleanup-empty-split-wallets.js --dry-run

# Actually delete (with confirmation)
node scripts/cleanup-empty-split-wallets.js --confirm
```

#### Advanced Script
```bash
# Dry run with custom settings
node scripts/cleanup-empty-split-wallets-advanced.js --dry-run --batch-size=100 --min-age=30

# Execute with verbose output
node scripts/cleanup-empty-split-wallets-advanced.js --execute --verbose --confirm
```

## 🔧 Configuration Options

### Balance Threshold
Wallets with less than 0.001 USDC are considered empty (configurable in the scripts).

### Age Filter
Only wallets older than 7 days are considered for deletion (configurable via `--min-age`).

### Batch Size
Process wallets in batches of 50 by default (configurable via `--batch-size`).

## 📊 What Gets Deleted

The cleanup scripts will remove:

1. **Split Wallet Documents** - From `splitWallets` collection
2. **Associated Split Data** - From `splits` collection (matched by `billId`)
3. **Private Key Data** - From `splitWalletPrivateKeys` collection
4. **Bill Data** - From `bills` collection (if exists)

## 📈 Output and Reporting

The scripts provide detailed reporting including:

- Total split wallets audited
- Number of empty wallets found
- Number of documents deleted
- Any errors encountered
- Processing statistics

### Example Output
```
🔍 Starting Advanced Split Wallet Cleanup Audit...

📅 Minimum age filter: 7 days (before 2024-01-01T00:00:00.000Z)
📦 Batch size: 50
🧪 DRY RUN MODE - No data will be deleted

📊 Fetching all split wallets...
Found 150 split wallets

⏰ Filtering by age...
45 wallets are older than 7 days

💰 Checking wallet balances...
Found 12 empty split wallets

📋 Empty Split Wallets Details:
================================================================================
1. Split Wallet ID: degen_split_wallet_1234567890_abc123
   Address: 8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD
   Balance: 0 USDC
   Status: completed
   Created: 2023-12-15T10:30:00.000Z
   Participants: 2
   Bill ID: bill_1234567890_xyz789
   Creator: CSidsEhjn6QgtUcskHo8FxfRxFL2

📊 Cleanup Statistics:
============================================================
Total split wallets audited: 150
Eligible wallets (age filter): 45
Empty split wallets found: 12
Split wallets deleted: 0 (dry run)
Associated splits deleted: 0 (dry run)
Private keys deleted: 0 (dry run)
Bills deleted: 0 (dry run)
Errors encountered: 0
Warnings: 0

✅ Cleanup process completed!
```

## 🛠️ Troubleshooting

### Common Issues

1. **Firebase Authentication Error**
   - Check your Firebase credentials in the .env file
   - Ensure your Firebase project has the correct permissions

2. **Solana RPC Connection Error**
   - Verify your Solana RPC URL is correct
   - Check if you're hitting rate limits (try reducing batch size)

3. **Permission Denied**
   - Make sure the shell script is executable: `chmod +x scripts/cleanup-empty-wallets.sh`
   - Check file permissions

4. **Node Modules Not Found**
   - Run `npm install` in the project root
   - Ensure you're running the script from the correct directory

### Performance Tips

- Use smaller batch sizes if you're hitting RPC rate limits
- Run during off-peak hours for better RPC performance
- Use the advanced script for better performance with large datasets

## 🔒 Security Considerations

- Never commit your `.env` file to version control
- Use environment variables for production deployments
- Consider using Firebase service accounts for production
- Monitor the cleanup process and verify results

## 📝 Logging

The scripts provide comprehensive logging:
- Info messages for normal operations
- Warnings for non-critical issues
- Errors for failures that need attention
- Statistics for cleanup results

## 🤝 Contributing

If you need to modify these scripts:
1. Test thoroughly in a development environment
2. Update this documentation
3. Consider backward compatibility
4. Add appropriate error handling

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the error messages in the output
3. Verify your configuration
4. Test with a small dataset first
