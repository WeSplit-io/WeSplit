# Firebase Functions Network Configuration

## ✅ Safe Configuration (Production & Development)

The Firebase Functions now **automatically detect** the environment and use the correct network:

- **Production Functions**: Default to **mainnet** (safe for production users)
- **Local Emulator**: Default to **devnet** (safe for development/testing)

## How It Works

### Automatic Environment Detection

Firebase Functions checks:
1. `FUNCTIONS_EMULATOR` environment variable (set when running emulator)
2. `NODE_ENV` environment variable
3. `GCLOUD_PROJECT` project name

**Result:**
- If running in **production** → Uses **mainnet** by default
- If running in **emulator/local** → Uses **devnet** by default

### Explicit Override (Optional)

You can still explicitly set the network via environment variable:

```bash
# For production (explicit, recommended)
firebase functions:secrets:set SOLANA_NETWORK
# Enter: mainnet

# For local emulator (in .env file)
SOLANA_NETWORK=devnet
```

## Setup Instructions

### For Production (Mainnet)

**Option 1: Automatic (Recommended)**
- Do nothing! Production functions automatically use mainnet
- The code detects production environment and defaults to mainnet

**Option 2: Explicit (Extra Safety)**
```bash
firebase functions:secrets:set SOLANA_NETWORK
# Enter: mainnet
```

### For Local Development (Devnet)

**Option 1: Automatic (Recommended)**
- Do nothing! Emulator automatically uses devnet
- The code detects emulator environment and defaults to devnet

**Option 2: Explicit (via .env file)**
Create `services/firebase-functions/.env`:
```bash
SOLANA_NETWORK=devnet
COMPANY_WALLET_ADDRESS=your_devnet_wallet
COMPANY_WALLET_SECRET_KEY=your_devnet_secret_key
```

## Safety Features

### Production Safety Check

The code includes a **safety check** that prevents devnet in production:

```javascript
// If production environment but network is devnet (and not explicitly set)
// → Automatically switches to mainnet
if (isProduction && actualNetwork === 'devnet' && !process.env.SOLANA_NETWORK) {
  console.error('⚠️  WARNING: Production environment detected but network is devnet!');
  actualNetwork = 'mainnet';
}
```

This ensures:
- ✅ Production users **always** use mainnet
- ✅ Development/testing **always** uses devnet
- ✅ No accidental network mismatches

## Verification

### Check Production Functions

```bash
firebase functions:log --limit 50
```

Look for:
```
Final network selection: { network: 'mainnet', isMainnet: true }
networkSource: 'environment-based default (production=mainnet)'
```

### Check Local Emulator

When running emulator, check logs for:
```
Final network selection: { network: 'devnet', isMainnet: false }
networkSource: 'environment-based default (development=devnet)'
```

## Environment Variable Priority

Firebase Functions checks in this order:

1. **`SOLANA_NETWORK`** (explicit override - highest priority)
2. **`NETWORK`** (legacy)
3. **`EXPO_PUBLIC_NETWORK`** (matches client)
4. **`FORCE_MAINNET`** (legacy)
5. **`EXPO_PUBLIC_DEV_NETWORK`** (legacy)
6. **`DEV_NETWORK`** (legacy)
7. **Environment-based default**:
   - Production → `mainnet`
   - Emulator/Development → `devnet`

## Current Status

✅ **Production Functions**: Will use **mainnet** (safe for production users)  
✅ **Local Emulator**: Will use **devnet** (safe for your testing)  
✅ **No interference**: Production and development are isolated

## Troubleshooting

### Issue: Production functions using devnet

**Solution:** Check if `SOLANA_NETWORK=devnet` is set in Firebase Secrets. If so, remove it or set to `mainnet`:
```bash
firebase functions:secrets:set SOLANA_NETWORK
# Enter: mainnet
firebase deploy --only functions
```

### Issue: Emulator using mainnet

**Solution:** Check your `.env` file. It should have:
```bash
SOLANA_NETWORK=devnet
```

Or remove `SOLANA_NETWORK` from `.env` to use automatic detection.

## Summary

🎯 **You can safely test devnet locally** while production users continue using mainnet.

The system automatically:
- ✅ Uses **mainnet** in production (safe for users)
- ✅ Uses **devnet** in emulator (safe for testing)
- ✅ Prevents accidental devnet in production
- ✅ Allows explicit override if needed
