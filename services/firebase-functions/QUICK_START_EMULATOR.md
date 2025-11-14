# 🚀 Quick Start: Firebase Functions Emulator

**Test Firebase Functions locally without deploying!**

## Setup (One-Time)

### 1. Create `.env` file for secrets

```bash
cd services/firebase-functions
cp .env.example .env  # If you have an example file
# OR create manually:
```

Create `services/firebase-functions/.env`:
```bash
COMPANY_WALLET_ADDRESS=your_wallet_address_here
COMPANY_WALLET_SECRET_KEY=your_base64_encoded_secret_key_here
```

**⚠️ Never commit `.env` to git!**

### 2. Make emulator script executable (if needed)

```bash
chmod +x services/firebase-functions/start-emulator.sh
```

## Daily Development Workflow

### Step 1: Start Firebase Emulator

**Option A: Using the script (recommended - auto-loads secrets)**
```bash
cd services/firebase-functions
./start-emulator.sh
```

**Option B: Using npm**
```bash
cd services/firebase-functions
npm run serve
```

**Option C: From project root**
```bash
firebase emulators:start --only functions
```

You should see:
```
✔  functions[us-central1-processUsdcTransfer]: http function initialized (http://localhost:5001/...)
✔  All emulators ready! It is now safe to connect.
```

### Step 2: Start Your Expo App

In a **new terminal**:
```bash
npm start
# or
expo start
```

### Step 3: Make Changes & Test!

1. Edit files in `services/firebase-functions/src/`
2. **The emulator auto-reloads on save!** ✨
3. Test in your Expo app immediately
4. **No deployment needed!**

## For Physical Devices

If testing on a **physical device** (not simulator), you need to use your computer's IP:

### Find Your IP Address

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Look for something like: 192.168.1.100
```

**Windows:**
```bash
ipconfig
# Look for IPv4 Address under your network adapter
```

### Update Your App

Set environment variable before starting Expo:
```bash
export EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST=192.168.1.100  # Your IP
npm start
```

Or create `.env` in project root:
```bash
EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST=192.168.1.100
```

## Verify It's Working

1. **Check emulator logs** - You should see function calls in the emulator terminal
2. **Check app logs** - Look for: `🔧 Connected to Firebase Functions Emulator`
3. **Test a transaction** - It should hit the local emulator, not production

## Troubleshooting

### "Connection refused"
- Make sure emulator is running (`npm run serve`)
- Check port 5001 is not in use
- For physical devices, use your computer's IP, not `localhost`

### "Function not found"
- Check function is exported in `src/index.js`
- Restart emulator after adding new functions
- Check emulator logs for errors

### "Secrets not found"
- Make sure `.env` file exists in `services/firebase-functions/`
- Check secrets are loaded: `echo $COMPANY_WALLET_ADDRESS`
- Use `./start-emulator.sh` to auto-load secrets

### Changes not reflecting
- Emulator should auto-reload (watch for "Reloading functions..." in logs)
- If not, restart emulator
- Clear Metro cache: `npx expo start -c`

## Force Production (if needed)

To test against production functions even in dev mode:
```bash
export EXPO_PUBLIC_USE_PROD_FUNCTIONS=true
npm start
```

## Benefits

✅ **Instant feedback** - Changes reflect immediately  
✅ **No deployment time** - Test in seconds, not minutes  
✅ **Cost savings** - No function invocations on production  
✅ **Better debugging** - See logs in real-time  
✅ **Safe testing** - No risk to production data  

## Production Deployment

When ready to deploy:
```bash
cd services/firebase-functions
npm run deploy
```

Make sure your app is **not** connected to emulator in production builds!

