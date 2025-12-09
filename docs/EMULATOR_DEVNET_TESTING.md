# Emulator Devnet Testing Guide

## ✅ Setup Verification

### 1. Start Firebase Functions Emulator
```bash
cd services/firebase-functions
npm run serve
```

**Expected Output:**
```
✔  functions[processUsdcTransfer(us-central1)]: http function initialized (http://127.0.0.1:5001/your-project/us-central1/processUsdcTransfer).
```

### 2. Verify Emulator is Running
- Check emulator UI: http://localhost:4000
- Verify `processUsdcTransfer` function is listed
- Check logs show emulator connection

### 3. Client Configuration
Ensure your app is configured to use the emulator:
- `EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST=localhost` (or your emulator host)
- `EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT=5001` (or your emulator port)
- `EXPO_PUBLIC_NETWORK=devnet` (for devnet testing)

## ✅ What's Unified (Same Logic)

### Verification Logic
- ✅ Same parameters: 6 attempts, 1s delay, 2.5s timeout
- ✅ Same strict behavior: Fails if transaction not found
- ✅ Same timeout handling: Checks for signature in error

### Transaction Flow
- ✅ Same transaction creation
- ✅ Same signature flow
- ✅ Same blockhash handling
- ✅ Same retry logic

## ⚠️ What to Watch For

### 1. Network Detection
- Emulator should detect `devnet` from environment
- Check logs for: `"network": "devnet"`
- If you see `"network": "mainnet"` in emulator, check environment variables

### 2. RPC Endpoints
- Devnet uses different RPC endpoints than mainnet
- Verify RPC URLs in logs show devnet endpoints
- Example: `https://api.devnet.solana.com`

### 3. Company Wallet
- Ensure company wallet is funded on devnet
- Check SOL balance for fee payments
- Verify USDC token account exists

## 🧪 Testing Checklist

- [ ] Emulator starts successfully
- [ ] Client connects to emulator (check logs)
- [ ] Transaction submits successfully
- [ ] Verification completes within ~7-8 seconds
- [ ] Loading state shows immediately
- [ ] Success screen appears after verification
- [ ] No duplicate transactions
- [ ] Error handling works correctly

## 📊 Expected Behavior

### Loading State
- Should start **immediately** when user taps "Send"
- Should show "Processing..." on button
- Should disable button during processing

### Transaction Flow
1. User taps "Send" → Loading starts immediately
2. Validation (if needed) → Should be fast (< 100ms)
3. Transaction creation → ~1-2 seconds
4. Firebase Function call → ~2-5 seconds
5. Verification → ~7-8 seconds
6. Success screen → Immediately after verification

### Total Time
- **Devnet**: ~10-15 seconds total
- **Mainnet**: ~15-25 seconds total (due to network congestion)

## 🚨 Common Issues

### Issue: Loading doesn't start immediately
**Fix**: Check that `setIsProcessing(true)` is called before any async operations

### Issue: Emulator not connecting
**Fix**: 
- Verify emulator is running
- Check `EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST` and `EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT`
- Check network connectivity

### Issue: Network mismatch
**Fix**: 
- Verify `EXPO_PUBLIC_NETWORK=devnet` is set
- Check emulator logs for network detection
- Ensure production functions aren't being called

### Issue: Slow verification
**Fix**: 
- Check RPC endpoint response times
- Verify network connectivity
- Check for rate limiting (shouldn't happen on devnet)
