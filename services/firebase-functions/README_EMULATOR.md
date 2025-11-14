# 🔥 Firebase Functions Local Development

**Stop redeploying! Test locally with instant feedback.**

## TL;DR - Quick Start

```bash
# Terminal 1: Start emulator
cd services/firebase-functions
npm run dev

# Terminal 2: Start Expo
npm start

# Make changes to src/*.js → Auto-reloads! ✨
```

## Setup (One-Time Only)

### 1. Create `.env` file

```bash
cd services/firebase-functions
cp .env.example .env
# Edit .env and add your secrets
```

Required secrets:
- `COMPANY_WALLET_ADDRESS` - Your Solana wallet address
- `COMPANY_WALLET_SECRET_KEY` - Base64 encoded secret key

### 2. Your app is already configured!

Your Expo app automatically connects to the emulator in development mode. No code changes needed! 🎉

## Daily Workflow

### Start Development

**Terminal 1:**
```bash
cd services/firebase-functions
npm run dev
# or
npm run emulator
# or
./start-emulator.sh
```

**Terminal 2:**
```bash
npm start
# or
expo start
```

### Make Changes

1. Edit any file in `services/firebase-functions/src/`
2. **Save the file**
3. **Emulator auto-reloads** (watch the terminal)
4. **Test immediately** in your Expo app
5. **No deployment needed!** 🚀

## How It Works

1. **Emulator runs locally** on `http://localhost:5001`
2. **Your Expo app detects** `__DEV__` mode
3. **Automatically connects** to emulator (see `src/services/blockchain/transaction/transactionSigningService.ts`)
4. **All function calls** go to local emulator
5. **Changes auto-reload** - no restart needed!

## For Physical Devices

If testing on a **real phone** (not simulator):

1. Find your computer's IP:
   ```bash
   # macOS
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Set environment variable:
   ```bash
   export EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST=192.168.1.100  # Your IP
   npm start
   ```

## Verify It's Working

✅ **Check emulator terminal** - Should see function calls  
✅ **Check app logs** - Look for: `🔧 Connected to Firebase Functions Emulator`  
✅ **Test a transaction** - Should hit local emulator  

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" | Make sure emulator is running (`npm run dev`) |
| "Function not found" | Restart emulator after adding new functions |
| "Secrets not found" | Check `.env` file exists and has correct values |
| Changes not reflecting | Emulator auto-reloads - check logs for errors |

## Force Production (if needed)

To test against production functions:
```bash
export EXPO_PUBLIC_USE_PROD_FUNCTIONS=true
npm start
```

## Benefits

- ⚡ **Instant feedback** - Changes reflect immediately
- 💰 **No costs** - No production function invocations
- 🐛 **Better debugging** - See logs in real-time
- 🔒 **Safe testing** - No risk to production
- ⏱️ **Save time** - No 2-3 minute deployments!

## Production Deployment

When ready to deploy:
```bash
cd services/firebase-functions
npm run deploy
```

---

**See `QUICK_START_EMULATOR.md` for detailed setup instructions.**

