# Environment Setup Guide

## Overview
The codebase now supports separate environment files for development (devnet) and production (mainnet) configurations.

## Network Configuration

**Recommended:** Use `EXPO_PUBLIC_NETWORK` for network selection (new approach).

**Legacy:** `EXPO_PUBLIC_DEV_NETWORK` and `EXPO_PUBLIC_FORCE_MAINNET` are still supported for backward compatibility.

See [NETWORK_CONFIGURATION.md](./NETWORK_CONFIGURATION.md) for complete network configuration guide.

## Environment Files

### `.env.development` (for local development)
- `EXPO_PUBLIC_NETWORK=devnet` - Uses Solana devnet (recommended)
- `EXPO_PUBLIC_USE_PROD_FUNCTIONS=false` - Uses Firebase Functions emulator
- `EXPO_PUBLIC_DEV_NETWORK=devnet` - Legacy: Uses Solana devnet
- `EXPO_PUBLIC_FORCE_MAINNET=false` - Legacy: Allows devnet
- `ALLOW_CLIENT_NETWORK_OVERRIDE=true` - Allows client to override network (dev only)

### `.env.production` (for production builds)
- `EXPO_PUBLIC_NETWORK=mainnet` - Uses Solana mainnet (recommended, required)
- `EXPO_PUBLIC_USE_PROD_FUNCTIONS=true` - Uses production Firebase Functions
- `EXPO_PUBLIC_DEV_NETWORK=mainnet` - Legacy: Uses Solana mainnet
- `EXPO_PUBLIC_FORCE_MAINNET=true` - Legacy: Forces mainnet
- `ALLOW_CLIENT_NETWORK_OVERRIDE=false` - Prevents client override
- `EXPO_PUBLIC_HELIUS_API_KEY=...` - Recommended: RPC API key for better performance

## How It Works

1. **app.config.js** automatically loads the correct env file based on:
   - `APP_ENV` environment variable, or
   - `EAS_BUILD_PROFILE` (production profile = production env)

2. **Environment variables** are exposed via `Constants.expoConfig.extra` in the app

3. **All services** use `getEnvVar()` helper to read from `Constants.expoConfig.extra` first, then fall back to `process.env`

## Usage

### For Local Development (Devnet)
1. Ensure `.env.development` exists with devnet settings
2. Start Firebase Functions emulator: `cd services/firebase-functions && npm run emulator`
3. Start Expo: `npm start` or `expo start`
4. The app will automatically:
   - Load `.env.development`
   - Connect to Functions emulator at `localhost:5001`
   - Use Solana devnet

### For Production Builds
1. Ensure `.env.production` exists with mainnet settings
2. Build with EAS: `eas build --profile production`
3. The app will automatically:
   - Load `.env.production`
   - Use production Firebase Functions
   - Use Solana mainnet

## Troubleshooting

### App still using production Functions?
- **Restart Metro bundler**: Stop and restart `expo start`
- **Clear cache**: `expo start -c` or `npm start -- --clear`
- **Check logs**: Look for `🔧 Connected to Firebase Functions Emulator` in logs

### Emulator not connecting?
- **Verify emulator is running**: Check `http://localhost:5001`
- **Check env file**: Ensure `.env.development` has `EXPO_PUBLIC_USE_PROD_FUNCTIONS=false`
- **Check app.config.js**: Verify `EXPO_PUBLIC_USE_PROD_FUNCTIONS` is in `extra` object

### Network not switching to devnet?
- **Check env file**: Ensure `.env.development` has `EXPO_PUBLIC_DEV_NETWORK=devnet`
- **Check logs**: Look for network selection logs in Firebase Functions emulator
- **Verify backend**: Ensure `services/firebase-functions/.env` has devnet settings
