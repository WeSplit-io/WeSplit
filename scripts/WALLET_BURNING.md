# 🔥 Wallet Burning and Rent Recovery

This document explains the wallet burning functionality that allows you to properly close empty split wallet token accounts and recover the rent exemption SOL back to the company wallet.

## 🎯 What is Wallet Burning?

Wallet burning is the process of **closing empty token accounts** on the Solana blockchain and **recovering the rent exemption SOL** back to the company wallet. This is important because:

1. **Rent Recovery**: Token accounts require ~0.00203928 SOL for rent exemption
2. **On-Chain Cleanup**: Properly removes unused accounts from the blockchain
3. **Cost Optimization**: Recovers SOL that would otherwise be locked in empty accounts
4. **Blockchain Efficiency**: Reduces blockchain bloat by removing unnecessary accounts

## 🔧 How It Works

### 1. **Account Verification**
- Checks if the token account exists on-chain
- Verifies the account has zero USDC balance
- Calculates the rent exemption amount

### 2. **Close Account Transaction**
- Creates a `createCloseAccountInstruction` transaction
- Sends the rent exemption SOL to the company wallet
- Signs the transaction with the company wallet keypair

### 3. **Rent Recovery**
- Recovers approximately **0.00203928 SOL** per empty token account
- All recovered SOL goes to the company wallet
- Transaction fees are covered by the company wallet

## 🚀 Usage Examples

### Basic Wallet Burning
```bash
# Dry run to see what would be burned
./scripts/cleanup-empty-wallets.sh --burn-wallets --dry-run --verbose

# Actually burn wallets and recover rent
./scripts/cleanup-empty-wallets.sh --burn-wallets --execute --verbose
```

### Advanced Options
```bash
# Burn with custom minimum rent recovery threshold
./scripts/cleanup-empty-wallets.sh --burn-wallets --execute --min-rent-recovery=0.002

# Burn specific wallets older than 30 days
./scripts/cleanup-empty-wallets.sh --burn-wallets --execute --min-age=30 --verbose

# Use dedicated wallet burner script
node scripts/wallet-burner.js --execute --verbose
```

### Standalone Wallet Burner
```bash
# Burn all empty split wallets
node scripts/wallet-burner.js --execute --verbose

# Burn specific wallet
node scripts/wallet-burner.js --wallet-address=8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD --execute

# Dry run with custom batch size
node scripts/wallet-burner.js --dry-run --batch-size=10 --verbose
```

## 🛡️ Safety Features

### 1. **Multiple Verification Layers**
- **On-chain balance check**: Verifies zero USDC balance
- **Account existence check**: Ensures token account exists
- **Rent threshold check**: Only burns accounts with sufficient rent
- **Dry-run mode**: Shows what would be burned without executing

### 2. **Company Wallet Security**
- Uses company wallet keypair for signing transactions
- Verifies keypair matches expected address
- Checks company wallet SOL balance before burning

### 3. **Error Handling**
- Graceful handling of non-existent accounts
- Detailed error messages for debugging
- Continues processing even if individual wallets fail

## 📊 Expected Results

### Rent Recovery Amounts
- **Per empty token account**: ~0.00203928 SOL
- **Typical recovery**: 0.001-0.003 SOL per wallet
- **Minimum threshold**: Configurable (default: 0.001 SOL)

### Example Output
```
🔥 Burning 5 empty wallets...
Burning wallet 1/5: 8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD
✅ Burned wallet 8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD: 0.002039 SOL recovered
   Transaction: 5K7x8vN2mP9qR3sT1uW4yZ6aB8cD0eF2gH4iJ6kL8mN0oP2qR4sT6uW8yZ

📊 Wallet Burning Statistics:
==================================================
Total wallets processed: 5
Wallets burned: 5
Total rent recovered: 0.010195 SOL
Burn errors: 0
```

## ⚙️ Configuration

### Environment Variables Required
```bash
# Company wallet configuration (REQUIRED for burning)
EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=your-company-wallet-address
EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY=your-company-wallet-secret-key

# Solana RPC configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
USDC_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### Script Options
- `--burn-wallets`: Enable wallet burning functionality
- `--min-rent-recovery=N`: Minimum SOL amount to recover per wallet (default: 0.001)
- `--dry-run`: Show what would be burned without executing
- `--execute`: Actually burn wallets and recover rent
- `--verbose`: Show detailed output for each operation

## 🔍 Verification Process

### Before Burning
1. **Check token account exists** on-chain
2. **Verify zero USDC balance** in the account
3. **Calculate rent exemption** amount
4. **Check minimum threshold** for rent recovery

### After Burning
1. **Verify transaction success** on blockchain
2. **Confirm account closure** (account no longer exists)
3. **Check rent recovery** to company wallet
4. **Update statistics** and logging

## 🚨 Important Considerations

### 1. **Company Wallet Requirements**
- Company wallet must have sufficient SOL for transaction fees
- Secret key must be properly configured in environment variables
- Wallet address must match the configured address

### 2. **Network Considerations**
- Use mainnet RPC for production operations
- Consider RPC rate limits for large batches
- Monitor transaction confirmation times

### 3. **Cost Analysis**
- **Transaction fee**: ~0.000005 SOL per burn operation
- **Rent recovery**: ~0.002039 SOL per empty account
- **Net benefit**: ~0.002034 SOL per burned wallet

### 4. **Timing Considerations**
- Burn wallets after confirming they're truly empty
- Consider age filters to avoid burning recently created wallets
- Monitor for any pending transactions before burning

## 🛠️ Troubleshooting

### Common Issues

1. **"Company wallet configuration missing"**
   - Ensure `EXPO_PUBLIC_COMPANY_WALLET_ADDRESS` and `EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY` are set
   - Verify the secret key format (base64 or JSON array)

2. **"Company wallet address mismatch"**
   - Check that the secret key corresponds to the configured address
   - Verify the secret key format is correct

3. **"Insufficient SOL for transaction fees"**
   - Fund the company wallet with SOL for transaction fees
   - Check company wallet balance before burning

4. **"Token account has non-zero balance"**
   - This is normal - only empty accounts should be burned
   - Verify the account is truly empty before burning

### Error Messages
- **"Token account does not exist"** - Account was never created (normal)
- **"Rent exemption too small"** - Account has insufficient rent (below threshold)
- **"Transaction failed"** - Network or RPC issue (retry)

## 📈 Performance Optimization

### Batch Processing
- Process wallets in small batches (default: 5-10)
- Add delays between batches to respect RPC limits
- Use parallel processing for better performance

### RPC Optimization
- Use reliable RPC endpoints
- Monitor RPC response times
- Consider using multiple RPC endpoints for redundancy

### Memory Management
- Process wallets sequentially to avoid memory issues
- Clear processed data from memory
- Monitor memory usage during large operations

## 🎯 Best Practices

### 1. **Always Dry Run First**
```bash
# Always start with dry run
./scripts/cleanup-empty-wallets.sh --burn-wallets --dry-run --verbose
```

### 2. **Verify Empty Wallets**
```bash
# Verify balances before burning
./scripts/cleanup-empty-wallets.sh --verify --verbose
```

### 3. **Monitor Company Wallet**
- Keep company wallet funded with SOL
- Monitor SOL balance regularly
- Set up alerts for low balance

### 4. **Use Age Filters**
```bash
# Only burn wallets older than 7 days
./scripts/cleanup-empty-wallets.sh --burn-wallets --execute --min-age=7
```

### 5. **Keep Logs**
- Use `--verbose` for detailed logging
- Save transaction signatures for audit trails
- Monitor burn statistics regularly

## 🔄 Integration with Cleanup Process

The wallet burning functionality is integrated into the cleanup process:

1. **Identify empty wallets** (zero USDC balance)
2. **Burn empty wallets** (recover rent to company wallet)
3. **Delete database records** (remove from Firebase)
4. **Clean up associated data** (splits, private keys, bills)

This ensures complete cleanup both on-chain and in the database.

## 📞 Support

If you encounter issues with wallet burning:

1. **Check company wallet configuration** - Ensure all environment variables are set
2. **Verify RPC connectivity** - Test with a simple balance check
3. **Review error logs** - Use `--verbose` for detailed error information
4. **Test with single wallet** - Use `--wallet-address` to isolate issues

The wallet burning functionality provides a safe and efficient way to recover rent from empty split wallets while properly cleaning up on-chain state.
