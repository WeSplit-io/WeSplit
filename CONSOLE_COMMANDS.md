# Wallet Persistence - Console Commands

## How to Use React Native Debugger Console

### Step 1: Open Debugger
1. Shake your device (or Cmd+D on iOS simulator / Cmd+M on Android)
2. Select "Debug" or "Open Debugger"
3. React Native Debugger should open in your browser

### Step 2: Open Console Tab
- Click the "Console" tab in React Native Debugger

### Step 3: Run Commands

## ✅ Correct Commands (Copy & Paste These)

### Clear AsyncStorage (Simulate App Update)
```javascript
(async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.clear();
  console.log('✅ AsyncStorage cleared - now test wallet recovery');
})();
```

### Check Storage Status
```javascript
(async () => {
  const WalletPersistenceTester = require('./src/utils/testing/walletPersistenceTester').default;
  const userId = 'YOUR_USER_ID_HERE'; // Replace with your actual userId
  const userEmail = 'your-email@example.com'; // Replace with your email
  const status = await WalletPersistenceTester.getStorageStatus(userId, userEmail);
  console.log('Storage Status:', JSON.stringify(status, null, 2));
})();
```

### Test AsyncStorage Clear
```javascript
(async () => {
  const WalletPersistenceTester = require('./src/utils/testing/walletPersistenceTester').default;
  const userId = 'YOUR_USER_ID_HERE';
  const userEmail = 'your-email@example.com';
  const result = await WalletPersistenceTester.testAsyncStorageClear(userId, userEmail);
  console.log('Test Result:', result);
})();
```

### Run Full Test Suite
```javascript
(async () => {
  const WalletPersistenceTester = require('./src/utils/testing/walletPersistenceTester').default;
  const userId = 'YOUR_USER_ID_HERE';
  const userEmail = 'your-email@example.com';
  const results = await WalletPersistenceTester.runFullTestSuite(userId, userEmail);
  console.log('Test Results:', results);
  const passed = results.filter(r => r.success).length;
  console.log(`✅ ${passed}/${results.length} tests passed`);
})();
```

### Get Current User Info (to find userId)
```javascript
(async () => {
  const { auth } = require('./src/config/firebase/firebase');
  const user = auth.currentUser;
  if (user) {
    console.log('User ID:', user.uid);
    console.log('Email:', user.email);
  } else {
    console.log('No user logged in');
  }
})();
```

## Alternative: Use Test Screen (Easier!)

Instead of console, use the test screen:

1. Add to navigation (temporarily):
```typescript
// In your navigation file
import WalletPersistenceTestScreen from './src/screens/Testing/WalletPersistenceTestScreen';

// Add route (dev only)
{__DEV__ && (
  <Stack.Screen name="WalletPersistenceTest" component={WalletPersistenceTestScreen} />
)}
```

2. Navigate to it:
```typescript
navigation.navigate('WalletPersistenceTest');
```

3. Tap buttons to run tests - no console needed!

## Quick Test (Simplest)

### Method 1: One-Line Clear
```javascript
require('@react-native-async-storage/async-storage').default.clear().then(() => console.log('✅ Cleared'));
```

### Method 2: Using Test Screen
Just navigate to the test screen and tap "Simulate App Update"

## Troubleshooting

### Error: "Cannot find module"
- Make sure you're using `require()` not `import`
- Use `.default` for default exports

### Error: "Unexpected token"
- Wrap async code in `(async () => { ... })();`
- Or use `.then()` instead of `await`

### Error: "userId is not defined"
- First get your userId using the "Get Current User Info" command above
- Replace `YOUR_USER_ID_HERE` with your actual userId

