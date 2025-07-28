# WeSplit Group Lifecycle Test Integration Guide

This guide explains how to integrate the group lifecycle test into the WeSplit app for testing and debugging purposes.

## Quick Integration

### 1. Add Test Component to Navigation

Add the test component to your navigation stack in `App.tsx` or your main navigation file:

```typescript
import GroupLifecycleTest from './src/components/GroupLifecycleTest';

// Add to your Stack.Navigator
<Stack.Screen 
  name="GroupLifecycleTest" 
  component={GroupLifecycleTest}
  options={{ title: 'Group Lifecycle Test' }}
/>
```

### 2. Add Test Button to Settings or Debug Menu

Add a button to navigate to the test screen. You can add this to the Account Settings screen or create a debug menu:

```typescript
// In AccountSettingsScreen.tsx or similar
import { TouchableOpacity, Text } from 'react-native';

const AccountSettingsScreen = () => {
  const navigation = useNavigation();
  
  return (
    <View>
      {/* ... existing settings ... */}
      
      {/* Add this button for testing */}
      <TouchableOpacity
        style={styles.debugButton}
        onPress={() => navigation.navigate('GroupLifecycleTest')}
      >
        <Text style={styles.debugButtonText}>Run Group Lifecycle Test</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### 3. Add Debug Button Styles

Add these styles to your existing styles file:

```typescript
// In AccountSettings/styles.ts or similar
debugButton: {
  backgroundColor: '#FF6B6B',
  padding: 16,
  borderRadius: 8,
  marginTop: 16,
  alignItems: 'center',
},
debugButtonText: {
  color: '#FFF',
  fontSize: 16,
  fontWeight: 'bold',
},
```

## Alternative: Development-Only Integration

If you want to show the test only in development mode:

```typescript
// In your settings screen
{__DEV__ && (
  <TouchableOpacity
    style={styles.debugButton}
    onPress={() => navigation.navigate('GroupLifecycleTest')}
  >
    <Text style={styles.debugButtonText}>🧪 Run Group Lifecycle Test</Text>
  </TouchableOpacity>
)}
```

## Usage Instructions

### 1. Prerequisites
- User must be logged in
- Firebase must be properly configured
- Internet connection required

### 2. Running the Test
1. Navigate to the test screen
2. Tap "Run Group Lifecycle Test"
3. Watch the progress indicators
4. Check console logs for detailed information
5. Review test results on screen

### 3. Interpreting Results

**Green Checkmarks (✅)**: Test passed
**Red X (❌)**: Test failed
**Yellow Spinner (🔄)**: Test running
**Gray Clock (⏳)**: Test pending

### 4. Debug Information

The test provides detailed console logs:
```
🧪 [GroupLifecycleTest] Starting group lifecycle test...
🧪 [GroupLifecycleTest] ✅ Group created: group123
🧪 [GroupLifecycleTest] ✅ Context updated with new group
```

## Troubleshooting

### Common Issues

1. **"Please log in to run tests"**
   - Ensure user is authenticated
   - Check `currentUser` exists in context

2. **Firebase errors**
   - Verify Firebase configuration
   - Check Firestore rules
   - Ensure project has proper permissions

3. **Network errors**
   - Check internet connection
   - Verify Firebase project is accessible

4. **Context errors**
   - Ensure AppContext is properly set up
   - Check that required functions exist in context

### Debug Mode

Enable additional logging by modifying the test component:

```typescript
// In GroupLifecycleTest.tsx
const DEBUG = true;

const log = (message: string) => {
  if (DEBUG) {
    console.log(`🧪 [GroupLifecycleTest] ${message}`);
  }
};
```

## Production Considerations

### Remove from Production Build

To ensure the test doesn't appear in production builds:

```typescript
// In your navigation or settings screen
{__DEV__ && (
  <TouchableOpacity
    style={styles.debugButton}
    onPress={() => navigation.navigate('GroupLifecycleTest')}
  >
    <Text style={styles.debugButtonText}>🧪 Run Group Lifecycle Test</Text>
  </TouchableOpacity>
)}
```

### Conditional Import

You can also conditionally import the test component:

```typescript
// In your navigation file
let GroupLifecycleTest: any = null;

if (__DEV__) {
  GroupLifecycleTest = require('./src/components/GroupLifecycleTest').default;
}

// In your Stack.Navigator
{__DEV__ && GroupLifecycleTest && (
  <Stack.Screen 
    name="GroupLifecycleTest" 
    component={GroupLifecycleTest}
    options={{ title: 'Group Lifecycle Test' }}
  />
)}
```

## Integration with Existing Debug Tools

If you have existing debug tools, you can integrate the test there:

```typescript
// In your existing debug menu
const debugOptions = [
  { title: 'Clear Cache', action: clearCache },
  { title: 'Reset App State', action: resetAppState },
  { title: 'Run Group Lifecycle Test', action: () => navigation.navigate('GroupLifecycleTest') },
  // ... other debug options
];
```

## Testing Different Scenarios

The test component can be modified to test different scenarios:

### Test with Different Users
```typescript
// Modify test data in GroupLifecycleTest.tsx
const testGroupName = `Test Group ${Date.now()}`;
const testMemberEmail = 'different.user@wesplit.com';
```

### Test with Different Currencies
```typescript
// Modify expense data
const expenseData = {
  // ... other fields
  currency: 'USDC', // Change from 'SOL'
  amount: 50, // Adjust amount
};
```

### Test with Different Split Types
```typescript
// Modify split data
const expenseData = {
  // ... other fields
  split_type: 'manual', // Change from 'equal'
  split_data: [
    { user_id: currentUser.id, amount: 30 },
    { user_id: testMemberEmail, amount: 70 }
  ],
};
```

## Conclusion

The group lifecycle test provides a comprehensive way to verify the core functionality of the WeSplit app. By integrating it into your development workflow, you can quickly identify and fix issues with group management, expense handling, and data consistency.

Remember to remove or disable the test in production builds to avoid exposing debug functionality to end users. 