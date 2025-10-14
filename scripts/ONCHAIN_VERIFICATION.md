# 🔍 On-Chain Balance Verification

This document explains the enhanced on-chain balance verification features that ensure split wallets truly have zero USDC before cleanup.

## 🎯 Why On-Chain Verification Matters

The cleanup scripts now perform **comprehensive on-chain verification** to ensure that:

1. **Wallets truly have zero USDC** - Not just empty database records
2. **Token accounts exist or don't exist** - Proper account state verification
3. **Multiple verification methods** - Cross-checking with different approaches
4. **SOL balance tracking** - Monitor gas fees and account rent
5. **Cross-RPC verification** - Verify against multiple Solana RPC endpoints

## 🔧 Enhanced Verification Methods

### Method 1: Token Account Existence Check
```javascript
const accountExists = await connection.getAccountInfo(tokenAccount);
```
- Verifies if the USDC token account actually exists on-chain
- If account doesn't exist, balance is definitely 0

### Method 2: Standard Balance Check
```javascript
const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
```
- Uses Solana's standard token balance API
- Returns balance in human-readable format (USDC with 6 decimals)

### Method 3: SPL Token Account Check
```javascript
const tokenAccountInfo = await getAccount(connection, tokenAccount);
```
- Uses SPL Token library for direct account access
- Provides raw account data and amount

### Method 4: SOL Balance Check
```javascript
const solBalance = await connection.getBalance(publicKey);
```
- Checks SOL balance for gas fees and rent exemption
- Helps identify if wallet is completely abandoned

### Method 5: Cross-RPC Verification (Optional)
- Verifies balances against multiple RPC endpoints
- Detects inconsistencies between different data sources
- Ensures data integrity

## 📊 Enhanced Output Format

The verification now provides detailed information:

```
🔍 Wallet: 8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD
   Token Account: 6n4pUq4fQza6ScoXeazR2Fa1oq58LfQXuMRQGuMf7eTz
   Account Exists: Yes
   Is Empty: Yes
   USDC Balances:
     getTokenAccountBalance (primary): 0 USDC
     getAccount (primary): 0 USDC
   SOL Balances:
     getBalance (primary): 0.000890 SOL
   Cross Verification Consistent: Yes
```

## 🚀 Usage Examples

### Basic Verification
```bash
# Verify all split wallets
./scripts/cleanup-empty-wallets.sh --verify

# Verify with detailed output
./scripts/cleanup-empty-wallets.sh --verify --verbose
```

### Specific Wallet Verification
```bash
# Verify a specific wallet address
./scripts/cleanup-empty-wallets.sh --verify --wallet=8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD
```

### Cross-RPC Verification
```bash
# Use multiple RPC endpoints for verification
node scripts/verify-onchain-balances.js --cross-verify --verbose
```

### Batch Processing
```bash
# Process wallets in smaller batches for better performance
./scripts/cleanup-empty-wallets.sh --verify --batch-size=10
```

## 🛡️ Safety Features

### Multiple Verification Layers
1. **Account Existence** - Ensures token account state is verified
2. **Balance Verification** - Multiple methods to check USDC balance
3. **Error Handling** - Graceful handling of non-existent accounts
4. **Cross-Validation** - Optional verification against multiple RPCs

### Comprehensive Error Handling
- Handles non-existent token accounts gracefully
- Provides detailed error messages for debugging
- Continues processing even if individual wallets fail

### Performance Optimization
- Batch processing to avoid RPC rate limits
- Configurable batch sizes
- Delays between batches to be respectful to RPC providers

## 📈 Verification Statistics

The enhanced verification provides comprehensive statistics:

```
📊 Verification Statistics:
==================================================
Total wallets verified: 150
Verified empty wallets: 12
Verified non-empty wallets: 138
Verification errors: 0
Cross verification mismatches: 0

✅ Verification completed!

💡 Found 12 wallets with zero USDC balance that can be safely cleaned up.
```

## 🔍 What Gets Verified

### For Each Wallet:
- ✅ **Token Account Existence** - Does the USDC token account exist?
- ✅ **USDC Balance** - How much USDC is in the account?
- ✅ **SOL Balance** - How much SOL is in the account?
- ✅ **Account State** - Is the account properly initialized?
- ✅ **Cross-RPC Consistency** - Do different RPCs report the same data?

### Verification Results:
- **Empty Wallets** - Wallets with < 0.001 USDC (safe to delete)
- **Non-Empty Wallets** - Wallets with USDC (keep in database)
- **Error Cases** - Wallets that couldn't be verified (investigate manually)

## 🚨 Important Notes

### Balance Threshold
- Wallets with less than **0.001 USDC** are considered empty
- This accounts for potential rounding errors and dust amounts
- Configurable in the script constants

### Token Account States
- **Account Exists + Zero Balance** = Safe to delete
- **Account Doesn't Exist** = Safe to delete (never had USDC)
- **Account Exists + Non-Zero Balance** = Keep in database

### SOL Balance Consideration
- SOL balance is checked but doesn't affect deletion decision
- SOL is needed for transaction fees, not for USDC storage
- Wallets with zero SOL can still be deleted if they have zero USDC

## 🔧 Configuration Options

### Environment Variables
```bash
# Solana RPC Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
USDC_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Firebase Configuration (for database access)
FIREBASE_API_KEY=your-api-key
FIREBASE_PROJECT_ID=your-project-id
# ... other Firebase config
```

### Script Options
- `--batch-size=N` - Number of wallets to process in each batch
- `--verbose` - Show detailed output for each wallet
- `--cross-verify` - Use multiple RPC endpoints
- `--wallet-address=ADDRESS` - Verify specific wallet only

## 🎯 Best Practices

### Before Cleanup
1. **Always run verification first** - `./scripts/cleanup-empty-wallets.sh --verify`
2. **Review the results** - Check which wallets are truly empty
3. **Run dry-run cleanup** - `./scripts/cleanup-empty-wallets.sh --dry-run`
4. **Execute cleanup** - `./scripts/cleanup-empty-wallets.sh --execute`

### For Large Datasets
1. **Use smaller batch sizes** - `--batch-size=10` for better performance
2. **Enable verbose mode** - `--verbose` to see detailed progress
3. **Use cross-verification** - `--cross-verify` for critical operations

### For Production
1. **Test on development first** - Always verify in a safe environment
2. **Monitor RPC usage** - Be respectful of rate limits
3. **Keep backups** - Ensure you have database backups before cleanup

## 🆘 Troubleshooting

### Common Issues

1. **RPC Rate Limiting**
   - Reduce batch size: `--batch-size=5`
   - Use different RPC endpoint
   - Add delays between requests

2. **Token Account Not Found**
   - This is normal for wallets that never received USDC
   - The script handles this gracefully

3. **Cross-Verification Mismatches**
   - Different RPCs may have slight delays in data consistency
   - Usually resolves within a few minutes
   - Consider using a single reliable RPC for critical operations

### Error Messages
- **"could not find account"** - Token account doesn't exist (normal)
- **"Invalid account owner"** - Account exists but not owned by expected program
- **"Account does not exist"** - Account was never created

## 📞 Support

If you encounter issues with on-chain verification:

1. **Check your RPC endpoint** - Ensure it's working and accessible
2. **Verify your environment variables** - Make sure all config is correct
3. **Test with a single wallet** - Use `--wallet=ADDRESS` to isolate issues
4. **Check the logs** - Use `--verbose` to see detailed error information

The enhanced verification ensures that only truly empty wallets are considered for cleanup, providing maximum safety and confidence in the cleanup process.
