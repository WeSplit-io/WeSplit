# Network Configuration Quick Reference

## Quick Start

### Local Development (Devnet)
```bash
# Default - uses devnet automatically
npm start

# Or explicitly
EXPO_PUBLIC_NETWORK=devnet npm start
```

### Production Build (Mainnet)
```bash
# Production builds default to mainnet
eas build --profile production

# Or explicitly
EXPO_PUBLIC_NETWORK=mainnet eas build --profile production
```

## Environment Variables

### Client App (Expo)

**Required:**
- `EXPO_PUBLIC_NETWORK` - Set to `devnet` or `mainnet` (defaults: devnet in dev, mainnet in production)

**Optional (for better RPC performance):**
- `EXPO_PUBLIC_HELIUS_API_KEY` - Helius RPC API key
- `EXPO_PUBLIC_ALCHEMY_API_KEY` - Alchemy RPC API key  
- `EXPO_PUBLIC_GETBLOCK_API_KEY` - GetBlock RPC API key

### Backend (Firebase Functions)

**Required:**
- `SOLANA_NETWORK` - Must match client network (`devnet` or `mainnet`)

**Optional:**
- `HELIUS_API_KEY` - Helius RPC API key
- `ALCHEMY_API_KEY` - Alchemy RPC API key

## Example .env Files

### `.env.development`
```bash
# Network
EXPO_PUBLIC_NETWORK=devnet

# Optional RPC keys (for better performance)
# EXPO_PUBLIC_HELIUS_API_KEY=your_key_here

# Firebase
EXPO_PUBLIC_USE_PROD_FUNCTIONS=false
```

### `.env.production`
```bash
# Network (REQUIRED)
EXPO_PUBLIC_NETWORK=mainnet

# RPC keys (RECOMMENDED for production)
EXPO_PUBLIC_HELIUS_API_KEY=your_helius_key_here
# OR
EXPO_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key_here

# Firebase
EXPO_PUBLIC_USE_PROD_FUNCTIONS=true
```

## Network Selection Logic

1. **Environment Variable** - `EXPO_PUBLIC_NETWORK` takes highest priority
2. **Build Profile** - Production builds default to mainnet
3. **Development Default** - Dev builds default to devnet
4. **Runtime Override** - Dev-only override via AsyncStorage (requires restart)

## Important Notes

⚠️ **Production Safety:**
- Production builds **always** default to mainnet
- Devnet override is **disabled** in production builds
- Network validation prevents mismatches

🔒 **Security:**
- Never store seed phrases or private keys in client
- RPC API keys are safe to expose (client-side)
- Backend secrets stay on server only

## Troubleshooting

**Wrong network?**
1. Check `EXPO_PUBLIC_NETWORK` env var
2. Clear cache: `expo start --clear`
3. Restart Metro bundler

**RPC errors?**
1. Check internet connection
2. Verify API keys (for mainnet)
3. Check network logs

**Transaction fails?**
1. Verify network matches (devnet vs mainnet)
2. Check backend network config matches client
3. Review transaction logs

## Code Usage

```typescript
// Get network config
import { getNetworkConfig, isMainnet, isDevnet } from '@/config/network';

const config = await getNetworkConfig();
console.log(config.network); // 'devnet' or 'mainnet'
console.log(config.usdcMintAddress); // Network-specific USDC address

// Check network
if (isMainnet()) {
  // Mainnet-specific logic
}

// Create Solana connection
import { getSolanaConnection } from '@/services/blockchain/connection';

const connection = await getSolanaConnection();
```

## Full Documentation

See [docs/guides/DEVNET_MAINNET_SWITCHING_IMPLEMENTATION.md](./docs/guides/DEVNET_MAINNET_SWITCHING_IMPLEMENTATION.md) for complete implementation details.

