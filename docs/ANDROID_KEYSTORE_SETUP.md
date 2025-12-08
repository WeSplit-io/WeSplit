# Android Keystore Setup Guide

## Problem

Your local build is using the **debug keystore** (SHA1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`), but Google Play Console expects the **production keystore** (SHA1: `95:EF:A3:EB:8B:70:7D:CE:06:54:AB:E3:20:C6:F6:09:1E:2D:C6:F3`).

## Solution: Use EAS-Managed Keystore

The production keystore is managed by EAS. For local builds, you have two options:

### Option 1: Use EAS Build (Recommended)

Build using EAS which automatically uses the correct production keystore:

```bash
eas build --platform android --profile production
```

This ensures the build is signed with the correct keystore that matches Google Play Console.

### Option 2: Download Production Keystore from EAS

If you need to build locally with the production keystore:

1. **Download the keystore from EAS**:
   ```bash
   eas credentials --platform android
   ```
   Select your app → Download keystore

2. **Save the keystore** to `android/app/release.keystore` (or another secure location)

3. **Configure in `android/gradle.properties`**:
   ```properties
   MYAPP_RELEASE_STORE_FILE=release.keystore
   MYAPP_RELEASE_KEY_ALIAS=your-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=your-store-password
   MYAPP_RELEASE_KEY_PASSWORD=your-key-password
   ```

4. **Update `android/app/build.gradle`** to use the release keystore:
   ```gradle
   signingConfigs {
       debug {
           storeFile file('debug.keystore')
           storePassword 'android'
           keyAlias 'androiddebugkey'
           keyPassword 'android'
       }
       release {
           if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
               storeFile file(MYAPP_RELEASE_STORE_FILE)
               storePassword MYAPP_RELEASE_STORE_PASSWORD
               keyAlias MYAPP_RELEASE_KEY_ALIAS
               keyPassword MYAPP_RELEASE_KEY_PASSWORD
           }
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
           // ... rest of config
       }
   }
   ```

## Verify Keystore Fingerprint

To verify which keystore is being used:

```bash
# Debug keystore (current - wrong)
keytool -list -v -keystore android/app/debug.keystore -storepass android -alias androiddebugkey | grep SHA1

# Production keystore (expected)
keytool -list -v -keystore android/app/release.keystore -storepass YOUR_PASSWORD -alias YOUR_ALIAS | grep SHA1
```

The production keystore should show: `SHA1: 95:EF:A3:EB:8B:70:7D:CE:06:54:AB:E3:20:C6:F6:09:1E:2D:C6:F3`

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit the production keystore to version control
- Store keystore passwords securely (use environment variables or secure storage)
- Add `android/app/release.keystore` to `.gitignore`
- Consider using EAS Build for production releases to avoid keystore management

## Quick Fix

For immediate production builds, use EAS:

```bash
eas build --platform android --profile production
```

This automatically uses the correct production keystore managed by EAS.

