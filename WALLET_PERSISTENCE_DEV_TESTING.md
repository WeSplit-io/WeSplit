# Wallet Persistence - Development Testing Guide

## Quick Start

Test wallet persistence on your physical device **without building new versions**. Use these methods:

---

## Method 1: Test Screen (Easiest)

### Setup
1. Add test screen to your navigation (development only):
```typescript
// In your navigation config (dev only)
import WalletPersistenceTestScreen from './src/screens/Testing/WalletPersistenceTestScreen';

// Add route
<Stack.Screen 
  name="WalletPersistenceTest" 
  component={WalletPersistenceTestScreen} 
/>
```

2. Navigate to test screen:
```typescript
navigation.navigate('WalletPersistenceTest');
```

### Available Tests
- **Check Storage Status** - See what storage methods have wallet data
- **Test Storage Verification** - Verify wallet can be recovered immediately
- **Test Email-Based Storage** - Check if wallet stored by email hash
- **Simulate App Update** - Clear AsyncStorage (simulates update)
- **Test Email-Based Recovery** - Test recovery when userId changes
- **Run Full Test Suite** - Run all tests at once

---

## Method 2: React Native Debugger Console

### Setup
1. Open React Native Debugger
2. Connect to your app
3. Open Console tab

### Commands

#### Check Storage Status
```javascript
import WalletPersistenceTester from './src/utils/testing/walletPersistenceTester';

const userId = 'your-user-id';
const userEmail = 'your-email@example.com';

// Get storage status
const status = await WalletPersistenceTester.getStorageStatus(userId, userEmail);
console.log(status);
```

#### Test AsyncStorage Clear (Simulate App Update)
```javascript
// This clears AsyncStorage but keeps Keychain/SecureStore
const result = await WalletPersistenceTester.testAsyncStorageClear(userId, userEmail);
console.log(result);
// Expected: Wallet should still be recoverable
```

#### Test Email-Based Recovery
```javascript
// Simulates userId change scenario
const result = await WalletPersistenceTester.testUserIdChange(userId, userEmail);
console.log(result);
// Expected: Wallet recovered via email hash
```

#### Run Full Test Suite
```javascript
const results = await WalletPersistenceTester.runFullTestSuite(userId, userEmail);
console.log(results);
```

#### Clear AsyncStorage Manually
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear AsyncStorage (simulates app update)
await AsyncStorage.clear();
console.log('AsyncStorage cleared - test wallet recovery now');
```

---

## Method 3: Terminal Commands

### iOS

#### View Logs
```bash
# Method 1: Xcode
# Open Xcode > Window > Devices and Simulators
# Select device > View Device Logs
# Filter: WalletRecovery OR SecureVault

# Method 2: Console.app
log stream --predicate 'processImagePath contains "WeSplit"' --level debug | grep -E 'WalletRecovery|SecureVault'
```

#### Clear App Data (Simulates Fresh Install)
```bash
# Delete app from device, then reinstall
# Or use Settings > General > iPhone Storage > WeSplit > Offload App
```

### Android

#### View Logs
```bash
# Filter wallet-related logs
adb logcat | grep -E 'WalletRecovery|SecureVault|SimplifiedWallet'

# Continuous monitoring
adb logcat -c && adb logcat | grep -E 'WalletRecovery|SecureVault'
```

#### Clear AsyncStorage
```bash
# Method 1: Clear app data (WARNING: deletes everything!)
adb shell pm clear com.wesplit.app

# Method 2: Clear only AsyncStorage (requires root or debug build)
adb shell run-as com.wesplit.app
rm -rf /data/data/com.wesplit.app/files/RCTAsyncLocalStorage_V1
```

#### Use Test Script
```bash
chmod +x scripts/test-wallet-persistence-dev.sh
./scripts/test-wallet-persistence-dev.sh view-logs
./scripts/test-wallet-persistence-dev.sh clear-asyncstorage
```

---

## Method 4: Simulate App Update Scenario

### Step-by-Step

1. **Initial State**
   - Log in to app
   - Note your wallet address
   - Verify wallet works

2. **Simulate Update**
   ```javascript
   // In React Native Debugger
   import AsyncStorage from '@react-native-async-storage/async-storage';
   await AsyncStorage.clear();
   ```

3. **Test Recovery**
   - Close and reopen app
   - Log in with same email
   - Check if wallet address matches
   - Verify balance is correct

4. **Expected Result**
   - ✅ Same wallet address
   - ✅ Wallet balance correct
   - ✅ No new wallet created
   - ✅ Logs show "Wallet recovered successfully"

---

## Method 5: Test Email-Based Recovery

### Simulate UserId Change

1. **Get Current Wallet**
   ```javascript
   const wallet = await walletService.getWalletInfo(userId);
   console.log('Current address:', wallet.address);
   ```

2. **Simulate UserId Change**
   ```javascript
   const newUserId = userId + '_changed';
   const recovery = await walletRecoveryService.recoverWallet(newUserId, userEmail);
   console.log('Recovered address:', recovery.wallet?.address);
   ```

3. **Expected Result**
   - ✅ Wallet recovered via email hash
   - ✅ Same wallet address
   - ✅ Logs show "Email-based wallet recovery successful"

---

## Quick Test Checklist

- [ ] **Storage Status**: Check all storage methods have data
- [ ] **AsyncStorage Clear**: Wallet persists after clearing
- [ ] **Email Recovery**: Wallet recovered when userId changes
- [ ] **Immediate Recovery**: Wallet can be recovered right after storage
- [ ] **Logs**: No errors, recovery successful

---

## What to Look For

### ✅ Success Indicators
```
"Wallet recovered successfully"
"✅ Email-based wallet recovery successful"
"Wallet stored securely"
"Wallet ensured for user"
```

### ❌ Failure Indicators
```
"Creating new wallet" (after update)
"No local wallets found, creating new wallet"
"Wallet verification failed"
"All storage methods failed"
```

### ⚠️ Warnings (Investigate if frequent)
```
"secureVault: Used SecureStore fallback"
"Email-based wallet storage failed"
```

---

## Troubleshooting

### Issue: Tests not working
- **Check**: App is in debug mode
- **Check**: User is logged in
- **Check**: Wallet exists

### Issue: Can't access test screen
- **Solution**: Add to navigation (dev only)
- **Alternative**: Use React Native Debugger console

### Issue: AsyncStorage clear doesn't work
- **iOS**: Use test screen or React Native Debugger
- **Android**: Use ADB commands or test screen

---

## Production Safety

⚠️ **IMPORTANT**: Remove or disable test screen in production builds!

```typescript
// In navigation config
{__DEV__ && (
  <Stack.Screen 
    name="WalletPersistenceTest" 
    component={WalletPersistenceTestScreen} 
  />
)}
```

Or conditionally import:
```typescript
const WalletPersistenceTestScreen = __DEV__ 
  ? require('./src/screens/Testing/WalletPersistenceTestScreen').default
  : null;
```

---

## Next Steps

1. Run quick test using test screen
2. Monitor logs during tests
3. Verify all tests pass
4. Test on physical device before deploying

For full testing guide, see: `WALLET_PERSISTENCE_COMPREHENSIVE_GUIDE.md`

