# Firebase Phone Authentication Setup

## Issue: reCAPTCHA Enterprise Error on Mobile

When trying to link phone numbers on mobile, you may encounter:
```
Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.
Firebase: Error (auth/argument-error)
```

## Root Cause

Firebase Phone Auth is trying to use **reCAPTCHA Enterprise** which isn't properly configured or available for mobile React Native/Expo apps using the web Firebase SDK.

## Solution: Disable reCAPTCHA Enterprise in Firebase Console

### Steps:

1. **Go to Firebase Console**
   - Navigate to: https://console.firebase.google.com/project/wesplit-35186/authentication/providers

2. **Open Phone Authentication Settings**
   - Click on "Phone" in the sign-in providers list
   - Or go to: Authentication > Sign-in method > Phone

3. **Disable reCAPTCHA Enterprise**
   - Look for "reCAPTCHA Enterprise" or "reCAPTCHA" settings
   - **Disable** reCAPTCHA Enterprise
   - **Enable** "reCAPTCHA v2" (if available) OR disable reCAPTCHA entirely for mobile
   - Save changes

4. **Alternative: Use App Check (Recommended for Production)**
   - Go to: Firebase Console > Build > App Check
   - Register your app
   - This provides better security than reCAPTCHA for mobile apps

### For React Native/Expo Apps:

Since you're using the web Firebase SDK (`firebase/auth`) in Expo, Firebase tries to use reCAPTCHA Enterprise by default. For mobile apps, you should:

1. **Disable reCAPTCHA Enterprise** (as above)
2. **OR** use App Check for mobile apps
3. **OR** switch to `@react-native-firebase/auth` (requires native build, not Expo Go)

## Verify Fix

After making changes:
1. Wait 1-2 minutes for changes to propagate
2. Try linking a phone number again
3. The error should be resolved

## Current Workaround

Until reCAPTCHA Enterprise is disabled, phone linking will show a helpful error message directing users to contact support.

