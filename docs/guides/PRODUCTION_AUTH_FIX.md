# 🔧 Production APK Authentication Fix Guide

## 🚨 **Current Issue: Login Works in Expo but Fails in Production APK**

This is a common issue with production builds. Here's how to fix it:

## 🔍 **Root Causes:**

1. **Environment Variables Not Loading**: Production builds may not load environment variables correctly
2. **Firebase Configuration Issues**: Firebase may not initialize properly in production
3. **OAuth Configuration Problems**: OAuth client IDs may not be properly configured
4. **Network Connectivity Issues**: Production builds may have different network behavior
5. **AsyncStorage Persistence Issues**: Authentication state may not persist correctly

## 🛠️ **Immediate Fixes:**

### **1. Add Debug Screen to Your App**

Add the debug screen to your app navigation to test authentication:

```typescript
// In your navigation stack, add:
import { AuthDebugScreen } from '../screens/Debug/AuthDebugScreen';

// Add to your navigator:
<Stack.Screen 
  name="AuthDebug" 
  component={AuthDebugScreen} 
  options={{ title: 'Auth Debug' }} 
/>
```

### **2. Test Environment Variables**

The debug screen will show you exactly which environment variables are missing or incorrect.

### **3. Common Production Issues & Solutions:**

#### **Issue: Environment Variables Not Loading**
- **Symptom**: Firebase config shows "Missing" values
- **Solution**: Check EAS environment variables configuration
- **Fix**: Ensure all `EXPO_PUBLIC_*` variables are set in EAS

#### **Issue: OAuth Client IDs Missing**
- **Symptom**: Google sign-in fails
- **Solution**: Verify OAuth client IDs in EAS environment variables
- **Fix**: Add `ANDROID_GOOGLE_CLIENT_ID` and `IOS_GOOGLE_CLIENT_ID`

#### **Issue: Firebase Project Not Accessible**
- **Symptom**: Network connectivity test fails
- **Solution**: Check Firebase project configuration
- **Fix**: Verify project ID and network access

#### **Issue: Authentication State Not Persisting**
- **Symptom**: User gets logged out after app restart
- **Solution**: Clear app data and test fresh login
- **Fix**: Use the "Clear Data" button in debug screen

## 📱 **Step-by-Step Testing Process:**

### **Step 1: Add Debug Screen**
1. Add the `AuthDebugScreen` to your app
2. Navigate to the debug screen
3. Run diagnostics to see what's wrong

### **Step 2: Check Environment Variables**
1. Look for missing environment variables
2. Verify Firebase configuration
3. Check OAuth client IDs

### **Step 3: Test Authentication**
1. Use the "Run Tests" button
2. Test Firebase auth initialization
3. Test OAuth configuration

### **Step 4: Clear and Retry**
1. Use "Clear Data" button
2. Restart the app
3. Try login again

## 🔧 **Environment Variable Checklist:**

Make sure these are set in EAS environment variables:

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_web_client_id
ANDROID_GOOGLE_CLIENT_ID=your_android_client_id
IOS_GOOGLE_CLIENT_ID=your_ios_client_id

# Optional
EXPO_PUBLIC_HELIUS_API_KEY=your_helius_key
```

## 🚀 **Quick Fix Commands:**

### **1. Check Current Environment Variables:**
```bash
npx eas-cli env:list --environment production
```

### **2. Set Missing Environment Variables:**
```bash
npx eas-cli env:create --environment production --name EXPO_PUBLIC_FIREBASE_API_KEY --value your_value
```

### **3. Rebuild with Fixed Environment:**
```bash
npx eas-cli build --platform android --profile production
```

## 📊 **Debug Information to Collect:**

When testing, collect this information:

1. **Environment Status**: What environment variables are missing?
2. **Firebase Status**: Is Firebase initializing correctly?
3. **OAuth Status**: Are OAuth client IDs configured?
4. **Network Status**: Can the app reach Firebase servers?
5. **Error Messages**: What specific errors are you seeing?

## 🎯 **Expected Results After Fix:**

- ✅ Environment variables load correctly
- ✅ Firebase initializes without errors
- ✅ OAuth client IDs are properly configured
- ✅ Network connectivity tests pass
- ✅ Login process works in production APK

## 📞 **Next Steps:**

1. **Add the debug screen** to your app
2. **Run diagnostics** to identify the specific issue
3. **Fix the identified problems** (usually environment variables)
4. **Test the login process** again
5. **Report results** with specific error messages

## 🔄 **If Issues Persist:**

1. **Check EAS environment variables** configuration
2. **Verify Firebase project** settings
3. **Test with different networks** (WiFi vs mobile data)
4. **Clear app data** and try fresh login
5. **Check device permissions** (internet, network state)

The debug screen will give you exact information about what's wrong and how to fix it!
