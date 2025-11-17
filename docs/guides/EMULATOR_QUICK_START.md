# Firebase Functions Emulator - Quick Start

## ✅ Emulator is Running!

The Firebase Functions emulator is now running in the background.

## Verify Connection

### 1. Check Emulator Status

The emulator should be running on:
- **URL**: `http://localhost:5001`
- **Status**: Check the terminal where you ran `npm run serve`

### 2. Check App Connection

Your Expo app should **automatically connect** to the emulator when:
- Running in development mode (`__DEV__ = true`)
- `EXPO_PUBLIC_USE_PROD_FUNCTIONS` is not set

Look for this log in your app:
```
🔧 Connected to Firebase Functions Emulator
```

### 3. Verify Network Configuration

The emulator will automatically use **devnet** because:
- `FUNCTIONS_EMULATOR=true` is set automatically
- The code detects this and defaults to devnet

Check emulator logs for:
```
Final network selection: { network: 'devnet', isMainnet: false }
networkSource: 'environment-based default (development=devnet)'
```

## Test a Transaction

1. **Start your Expo app** (if not already running):
   ```bash
   npm start
   # or
   expo start
   ```

2. **Try sending a transaction** in the app

3. **Check emulator logs** - You should see:
   - Transaction processing logs
   - Network: devnet
   - No network mismatch errors

## Troubleshooting

### Issue: App not connecting to emulator

**Check:**
- Is `EXPO_PUBLIC_USE_PROD_FUNCTIONS` set? If yes, unset it:
  ```bash
  unset EXPO_PUBLIC_USE_PROD_FUNCTIONS
  ```

- Is the app in dev mode? Check for `__DEV__ = true` in logs

### Issue: Still getting network mismatch

**Check emulator logs** for the network selection. It should show:
```
network: 'devnet'
isMainnet: false
```

If it shows mainnet, check your `.env` file in `services/firebase-functions/`:
```bash
SOLANA_NETWORK=devnet  # Should be set to devnet for local testing
```

### Issue: Emulator not starting

**Check:**
- Firebase CLI installed: `firebase --version`
- Port 5001 available: `lsof -i :5001`
- `.env` file exists in `services/firebase-functions/`

## Stop Emulator

To stop the emulator:
```bash
# Find the process
ps aux | grep firebase

# Kill it
kill <PID>
```

Or press `Ctrl+C` in the terminal where it's running.

## Summary

✅ **Emulator running** → Uses **devnet** automatically  
✅ **App connects** → Automatically in dev mode  
✅ **Transactions work** → No network mismatch  
✅ **Production safe** → Production functions still use mainnet

