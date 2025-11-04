# Devnet Setup and Funding Guide

## 🚀 Quick Start: Switch to Devnet

### Step 1: Set Environment Variable

**Option A: Create/Update `.env` file** (Recommended)
```bash
# In your project root, create or update .env file
EXPO_PUBLIC_DEV_NETWORK=devnet
EXPO_PUBLIC_FORCE_MAINNET=false
```

**Option B: Export in terminal** (Temporary - only for current session)
```bash
export EXPO_PUBLIC_DEV_NETWORK=devnet
export EXPO_PUBLIC_FORCE_MAINNET=false
```

### Step 2: Restart Your Development Server

After setting the environment variable, you need to restart:
```bash
# Stop your current dev server (Ctrl+C)
# Then restart
npm start
# or
expo start
```

### Step 3: Verify Network Configuration

Check that the app is using devnet:
- Open your app and check the wallet connection
- The RPC URL should be `https://api.devnet.solana.com`
- The USDC mint address should be `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (devnet USDC)

## 💰 Funding Wallets on Devnet

### Method 1: Solana CLI (Recommended for Development)

**1. Install Solana CLI** (if not already installed):
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

**2. Set CLI to devnet**:
```bash
solana config set --url https://api.devnet.solana.com
```

**3. Get your wallet address** from the app:
- Open WeSplit app
- Go to Wallet screen
- Copy your wallet address

**4. Airdrop SOL to your wallet**:
```bash
# Request SOL airdrop (you can request up to 2 SOL per request)
solana airdrop 2 <YOUR_WALLET_ADDRESS>

# Example:
solana airdrop 2 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```

**5. Get devnet USDC** (if needed):
```bash
# Use the Solana CLI to mint devnet USDC
# First, get your wallet's token account
spl-token accounts

# Then mint USDC (devnet USDC mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU)
spl-token mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 1000
```

### Method 2: Solana Faucet Website

**1. Get SOL from faucet**:
- Visit: https://faucet.solana.com/
- Enter your wallet address
- Select "devnet" network
- Click "Airdrop 2 SOL"
- Wait a few seconds for confirmation

**2. Get USDC from faucet** (if available):
- Some devnet faucets provide USDC tokens
- Check: https://spl-token-faucet.com/ (if available for devnet)

### Method 3: Programmatic Funding (For Testing)

You can also create a script to fund wallets programmatically:

```typescript
// scripts/fund-devnet-wallet.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createMint, mintTo } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function fundWallet(walletAddress: string, solAmount: number = 2) {
  try {
    const publicKey = new PublicKey(walletAddress);
    
    // Request SOL airdrop
    const signature = await connection.requestAirdrop(
      publicKey,
      solAmount * LAMPORTS_PER_SOL
    );
    
    console.log(`Airdrop signature: ${signature}`);
    await connection.confirmTransaction(signature);
    console.log(`✅ ${solAmount} SOL airdropped to ${walletAddress}`);
    
    // You can also mint USDC here if needed
    // const usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
    // ... mint USDC logic
    
  } catch (error) {
    console.error('Failed to fund wallet:', error);
  }
}

// Usage
fundWallet('YOUR_WALLET_ADDRESS_HERE', 2);
```

### Method 4: Use Company Wallet (For Testing)

If you have a company wallet configured, you can fund it on devnet:

```bash
# Fund company wallet
solana airdrop 10 <COMPANY_WALLET_ADDRESS>

# Then the app can use company wallet for fee payments
```

## 🔍 Verify Devnet Configuration

### Check Network in App

1. **Check RPC URL**:
   - The app should connect to `https://api.devnet.solana.com`
   - You can verify this in the logs or debug screen

2. **Check USDC Mint Address**:
   - Devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
   - Mainnet USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

3. **Check Wallet Balance**:
   - SOL balance should be visible (funded via airdrop)
   - USDC balance should use devnet USDC mint

### Debug Commands

```bash
# Check current network configuration
echo $EXPO_PUBLIC_DEV_NETWORK

# Check Solana CLI network
solana config get

# Check wallet balance
solana balance <YOUR_WALLET_ADDRESS>

# Check token accounts
spl-token accounts
```

## 📝 Environment Variables Summary

For **devnet development**, set these in your `.env` file:

```bash
# Network Configuration
EXPO_PUBLIC_DEV_NETWORK=devnet
EXPO_PUBLIC_FORCE_MAINNET=false

# Optional: Helius API Key (not required for devnet)
# EXPO_PUBLIC_HELIUS_API_KEY=your_key_here

# Company Wallet (optional for devnet testing)
# EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=your_devnet_company_wallet
# EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY=your_devnet_company_secret_key
```

For **mainnet production**, set:

```bash
EXPO_PUBLIC_DEV_NETWORK=mainnet
EXPO_PUBLIC_FORCE_MAINNET=true
EXPO_PUBLIC_HELIUS_API_KEY=your_helius_api_key
```

## ⚠️ Important Notes

1. **Devnet tokens have no real value** - They're for testing only
2. **Devnet resets periodically** - Don't rely on devnet data persisting
3. **Rate limits** - Devnet airdrops are rate-limited (usually 2 SOL per request)
4. **Company wallet** - Make sure to fund your company wallet on devnet if you're testing fee payments
5. **USDC on devnet** - The devnet USDC mint is different from mainnet, so make sure you're using the correct one

## 🧪 Testing Checklist

- [ ] Set `EXPO_PUBLIC_DEV_NETWORK=devnet` in `.env`
- [ ] Restart development server
- [ ] Verify RPC URL is `https://api.devnet.solana.com`
- [ ] Verify USDC mint is devnet address
- [ ] Fund wallet with SOL using airdrop
- [ ] Test wallet creation
- [ ] Test USDC transfers (if needed, mint devnet USDC)
- [ ] Test transaction signing
- [ ] Verify company wallet is funded (if testing fee payments)

## 🐛 Troubleshooting

**Problem**: App still connects to mainnet
- **Solution**: Make sure you restarted the dev server after setting environment variables
- **Check**: Verify `.env` file is in project root and loaded correctly

**Problem**: Can't fund wallet
- **Solution**: Check you're using devnet faucet, not mainnet
- **Check**: Verify wallet address is correct

**Problem**: USDC transfers failing
- **Solution**: Make sure you're using devnet USDC mint address
- **Check**: Verify wallet has SOL for transaction fees

**Problem**: Transactions failing
- **Solution**: Check you have enough SOL for gas fees
- **Check**: Verify network is set to devnet in all config files

## 📚 Additional Resources

- Solana Devnet Faucet: https://faucet.solana.com/
- Solana CLI Docs: https://docs.solana.com/cli
- Devnet Explorer: https://explorer.solana.com/?cluster=devnet

