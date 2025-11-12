# Working Console Commands for React Native Debugger

## ⚠️ Important: React Native Debugger Console Limitations

The React Native Debugger console runs in a browser environment, so `require()` doesn't work directly. Use these alternatives:

---

## ✅ METHOD 1: Use Test Screen (BEST - No Console Needed!)

The test screen is already added to your app. Just:

1. **Reload app** (shake device → Reload)
2. **Add temporary button** in Dashboard or any screen:
```typescript
// Add this button temporarily in DashboardScreen.tsx
<TouchableOpacity 
  onPress={() => navigation.navigate('WalletPersistenceTest')}
  style={{padding: 20, backgroundColor: '#007AFF', margin: 10, borderRadius: 8}}
>
  <Text style={{color: 'white', textAlign: 'center'}}>🧪 Test Wallet Persistence</Text>
</TouchableOpacity>
```

3. **Tap button** → Navigate to test screen
4. **Tap "Simulate App Update"** → Done!

---

## ✅ METHOD 2: Use Global Objects (If Console Works)

If you can access global objects, try:

```javascript
// Try this in console:
global.AsyncStorage?.clear?.().then(() => console.log('✅ Cleared'));
```

Or:

```javascript
// Access via React Native's global
const AsyncStorage = global.AsyncStorage || window.AsyncStorage;
if (AsyncStorage) {
  AsyncStorage.clear().then(() => console.log('✅ Cleared'));
} else {
  console.log('❌ AsyncStorage not available in console');
}
```

---

## ✅ METHOD 3: Use Metro Bundler Console

Instead of React Native Debugger, use Metro Bundler console:

1. **Stop React Native Debugger**
2. **Look at your terminal** where `npm start` or `expo start` is running
3. **Type commands directly in Metro console** (the terminal)

In Metro console, you can use:
```javascript
// This should work in Metro console
require('@react-native-async-storage/async-storage').default.clear().then(() => console.log('✅ Cleared'));
```

---

## ✅ METHOD 4: Add Quick Test Button to Dashboard

Add this to your Dashboard screen temporarily:

```typescript
// In DashboardScreen.tsx, add this button somewhere visible
import AsyncStorage from '@react-native-async-storage/async-storage';

// Add button in render
<TouchableOpacity
  onPress={async () => {
    Alert.alert(
      'Test Wallet Persistence',
      'This will clear AsyncStorage to simulate app update. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert(
              '✅ Cleared',
              'AsyncStorage cleared. Now:\n1. Close app completely\n2. Reopen app\n3. Log in\n4. Check if wallet persists'
            );
          }
        }
      ]
    );
  }}
  style={{
    padding: 16,
    backgroundColor: '#FF9500',
    borderRadius: 8,
    margin: 10,
    alignItems: 'center'
  }}
>
  <Text style={{color: 'white', fontWeight: '600'}}>
    🧪 Test: Clear AsyncStorage
  </Text>
</TouchableOpacity>
```

---

## ✅ METHOD 5: Use ADB/Device Commands (Android)

If you're on Android, use ADB:

```bash
# Clear app data (simulates fresh install)
adb shell pm clear com.wesplit.app

# Or clear only AsyncStorage (requires debug build)
adb shell run-as com.wesplit.app
rm -rf /data/data/com.wesplit.app/files/RCTAsyncLocalStorage_V1
```

---

## ✅ METHOD 6: Use iOS Simulator/Device Settings

For iOS:
1. Settings → General → iPhone Storage
2. Find "WeSplit" app
3. Tap "Offload App" (keeps data) or "Delete App" (removes all)
4. Reinstall app
5. Test recovery

---

## 🎯 RECOMMENDED: Use Test Screen

**The easiest way is to use the test screen I already added:**

1. Add this button to Dashboard (temporarily):
```typescript
<TouchableOpacity onPress={() => navigation.navigate('WalletPersistenceTest')}>
  <Text>🧪 Test Wallet</Text>
</TouchableOpacity>
```

2. Navigate to test screen
3. Tap "Simulate App Update"
4. Done!

**No console needed!** 🎉

---

## Quick Reference

- **Test Screen**: `navigation.navigate('WalletPersistenceTest')`
- **Console**: Doesn't work well with React Native Debugger
- **Best Method**: Use test screen or add button to Dashboard

