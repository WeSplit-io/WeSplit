# Local Firebase Functions Development Guide

This guide shows you how to test Firebase Functions locally without deploying each time.

## Quick Start

### 1. Start the Firebase Emulator

```bash
cd services/firebase-functions
npm run serve
```

Or from the project root:
```bash
firebase emulators:start --only functions
```

The emulator will start on `http://localhost:5001`

### 2. Configure Firebase Secrets for Emulator

The emulator needs access to your secrets. Create a `.env` file in `services/firebase-functions/`:

```bash
# .env file (DO NOT COMMIT THIS)
COMPANY_WALLET_ADDRESS=your_wallet_address
COMPANY_WALLET_SECRET_KEY=your_base64_encoded_secret_key
```

Then load them when starting the emulator:

```bash
# Option 1: Export before starting
export COMPANY_WALLET_ADDRESS="your_wallet_address"
export COMPANY_WALLET_SECRET_KEY="your_base64_encoded_secret_key"
npm run serve

# Option 2: Use a script (see below)
```

### 3. Connect Your Expo App to the Emulator

In your Expo app, you need to connect to the local emulator. Add this to your Firebase initialization:

**File: `src/config/firebase/firebase.ts`** (or wherever you initialize Firebase)

```typescript
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getApp } from 'firebase/app';

// After initializing Firebase app
const app = getApp();

// Connect to emulator in development
if (__DEV__) {
  const functions = getFunctions(app, 'us-central1');
  // Connect to local emulator (use your computer's IP for physical device)
  // For iOS Simulator/Android Emulator: use localhost
  // For physical device: use your computer's local IP (e.g., 192.168.1.100)
  connectFunctionsEmulator(functions, 'localhost', 5001);
  
  console.log('🔧 Connected to Firebase Functions Emulator');
}
```

**For Physical Devices:**
If testing on a physical device, replace `localhost` with your computer's local IP address:
```typescript
connectFunctionsEmulator(functions, '192.168.1.100', 5001); // Replace with your IP
```

### 4. Start Development

1. **Terminal 1**: Start Firebase Emulator
   ```bash
   cd services/firebase-functions
   npm run serve
   ```

2. **Terminal 2**: Start Expo app
   ```bash
   npm start
   # or
   expo start
   ```

3. Make changes to Firebase Functions in `services/firebase-functions/src/`
   - The emulator will **automatically reload** on file changes
   - No need to redeploy!

## Advanced Setup

### Loading Secrets Automatically

Create `services/firebase-functions/start-emulator.sh`:

```bash
#!/bin/bash

# Load secrets from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Start emulator
firebase emulators:start --only functions
```

Make it executable:
```bash
chmod +x start-emulator.sh
```

Then run:
```bash
./start-emulator.sh
```

### Using Firebase Emulator UI

The emulator UI is available at `http://localhost:4000` (if enabled in `firebase.json`)

You can:
- View function logs in real-time
- Test functions directly
- Monitor performance

### Environment Detection

Update your Firebase Functions initialization to detect emulator:

**File: `src/services/blockchain/transaction/transactionSigningService.ts`**

```typescript
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getApp } from 'firebase/app';

function getFirebaseFunctions() {
  const app = getApp();
  const functions = getFunctions(app, 'us-central1');
  
  // Connect to emulator in development
  if (__DEV__ && !process.env.EXPO_PUBLIC_USE_PROD_FUNCTIONS) {
    try {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('🔧 Using Firebase Functions Emulator');
    } catch (error) {
      // Already connected, ignore
    }
  }
  
  return functions;
}
```

### Testing on Physical Device

1. Find your computer's local IP:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. Update the connection in your app:
   ```typescript
   connectFunctionsEmulator(functions, '192.168.1.100', 5001); // Your IP
   ```

3. Make sure your device is on the same network

## Troubleshooting

### "Connection refused" error
- Make sure the emulator is running
- Check the port (should be 5001)
- For physical devices, use your computer's IP, not `localhost`

### "Function not found" error
- Make sure the function is exported in `services/firebase-functions/src/index.js`
- Check emulator logs for errors
- Restart the emulator

### Secrets not loading
- Make sure `.env` file exists in `services/firebase-functions/`
- Export environment variables before starting emulator
- Check emulator logs for secret errors

### Changes not reflecting
- The emulator should auto-reload on file changes
- If not, restart the emulator
- Clear Metro bundler cache: `npx expo start -c`

## Benefits

✅ **Instant feedback** - Changes reflect immediately  
✅ **No deployment time** - Test locally in seconds  
✅ **Cost savings** - No function invocations on production  
✅ **Better debugging** - See logs in real-time  
✅ **Safe testing** - No risk to production data  

## Production Deployment

When ready to deploy:

```bash
cd services/firebase-functions
npm run deploy
```

And make sure your app is **not** connected to the emulator in production builds.

