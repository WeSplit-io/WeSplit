# RPC Environment Variables Guide

**Date:** 2025-01-16  
**Purpose:** Clarify which RPC environment variables are actually used by the codebase

---

## Primary RPC Configuration (Used in Production)

The codebase uses a **primary configuration system** that automatically constructs RPC URLs from API keys. These are the variables you should set:

### ✅ Recommended Variables (Set These)

```bash
# Alchemy API Key (RECOMMENDED - Best free tier)
EXPO_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here

# GetBlock API Key (RECOMMENDED - Fastest)
EXPO_PUBLIC_GETBLOCK_API_KEY=your_getblock_api_key_here

# Helius API Key (Optional)
EXPO_PUBLIC_HELIUS_API_KEY=your_helius_api_key_here

# QuickNode Endpoint (Optional - full URL)
EXPO_PUBLIC_QUICKNODE_ENDPOINT=https://your-endpoint.solana-mainnet.quiknode.pro/your-api-key/

# Chainstack Endpoint (Optional - full URL)
EXPO_PUBLIC_CHAINSTACK_ENDPOINT=https://your-endpoint.solana-mainnet.chainstack.com/your-api-key
```

**How it works:**
- The codebase reads these API keys
- Automatically constructs RPC URLs (e.g., `https://solana-mainnet.g.alchemy.com/v2/${key}`)
- Adds them to the RPC endpoint list in priority order
- Uses them for all Solana network calls

**Location in code:** `src/config/network/solanaNetworkConfig.ts` → `enhanceRpcEndpoints()`

---

## Legacy RPC Configuration (Fallback Only)

These variables exist for backward compatibility but are **only used as fallbacks** if the primary system fails:

```bash
# Legacy variables (fallback only - not actively used)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_DEVNET_RPC_URL=https://api.devnet.solana.com
SOLANA_TESTNET_RPC_URL=https://api.testnet.solana.com
SOLANA_COMMITMENT=confirmed
SOLANA_RPC_API_KEY=your_rpc_api_key_here
```

**When are they used?**
- Only if the primary unified config system fails to load
- As fallback values in legacy configuration files
- **Not used** by the main network configuration system

**Location in code:** 
- `src/config/network/chain.ts` (fallback only)
- `src/config/env.ts` (fallback only)

---

## Which Variables Should You Set?

### ✅ **Set These (Primary System)**

For production builds, set at least one of these:

1. **`EXPO_PUBLIC_ALCHEMY_API_KEY`** - Recommended (best free tier)
2. **`EXPO_PUBLIC_GETBLOCK_API_KEY`** - Recommended (fastest)
3. `EXPO_PUBLIC_HELIUS_API_KEY` - Optional
4. `EXPO_PUBLIC_QUICKNODE_ENDPOINT` - Optional (full URL)
5. `EXPO_PUBLIC_CHAINSTACK_ENDPOINT` - Optional (full URL)

### ⚠️ **Optional (Legacy Fallback)**

You can set these for backward compatibility, but they're not required:

- `SOLANA_RPC_URL` - Only used if primary system fails
- `SOLANA_DEVNET_RPC_URL` - Only used if primary system fails
- `SOLANA_TESTNET_RPC_URL` - Only used if primary system fails
- `SOLANA_COMMITMENT` - Only used if primary system fails
- `SOLANA_RPC_API_KEY` - Defined but not actively used

---

## Example `.env.production` Configuration

```bash
# Network Configuration
EXPO_PUBLIC_NETWORK=mainnet
EXPO_PUBLIC_USE_PROD_FUNCTIONS=true

# Primary RPC Configuration (Set at least one)
EXPO_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key_here
EXPO_PUBLIC_GETBLOCK_API_KEY=your_getblock_key_here

# Legacy RPC Configuration (Optional - fallback only)
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# SOLANA_COMMITMENT=confirmed
```

---

## How to Verify Which System is Being Used

Check the app logs after startup. You should see:

```
[INFO] Network configuration loaded
  network: 'mainnet'
  rpcUrl: 'https://solana-mainnet.g.alchemy.com/v2/***'
  endpointCount: 3
```

If you see RPC URLs with API keys embedded (like `alchemy.com/v2/` or `getblock.io/`), the **primary system** is working.

If you see plain URLs (like `api.mainnet-beta.solana.com`), the **legacy fallback** is being used.

---

## Troubleshooting

### Issue: RPC calls are slow or rate-limited

**Solution:** Set at least one `EXPO_PUBLIC_*` API key variable. The primary system will use it automatically.

### Issue: Using legacy variables but they're not being used

**Solution:** The primary system takes precedence. Set `EXPO_PUBLIC_ALCHEMY_API_KEY` or `EXPO_PUBLIC_GETBLOCK_API_KEY` instead.

### Issue: Want to use a custom RPC endpoint

**Solution:** Use `EXPO_PUBLIC_QUICKNODE_ENDPOINT` or `EXPO_PUBLIC_CHAINSTACK_ENDPOINT` with the full URL.

---

## Summary

- ✅ **Use:** `EXPO_PUBLIC_ALCHEMY_API_KEY`, `EXPO_PUBLIC_GETBLOCK_API_KEY`, etc.
- ⚠️ **Optional:** `SOLANA_RPC_URL`, `SOLANA_DEVNET_RPC_URL`, etc. (fallback only)
- 🎯 **Priority:** Primary system (`EXPO_PUBLIC_*`) > Legacy system (`SOLANA_*`)

