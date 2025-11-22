# 📦 Local Build Guide for AAB and IPA

This guide explains how to build both Android AAB and iOS IPA files locally without using EAS cloud services.

**Date:** 2025-01-16  
**Purpose:** Complete guide for building production AAB and IPA files locally (without EAS Build)

## Prerequisites

### For Android AAB Builds
- ✅ Java 17 (OpenJDK)
- ✅ Android SDK and build tools
- ✅ Gradle (included with project)
- ✅ Production keystore configured (optional, defaults to debug keystore)

### For iOS IPA Builds
- ✅ macOS (required for iOS builds)
- ✅ Xcode (latest version recommended)
- ✅ Xcode Command Line Tools
- ✅ CocoaPods (`sudo gem install cocoapods`)
- ✅ Apple Developer Account (for code signing)
- ✅ Valid provisioning profiles

## 🚀 Quick Start (5 minutes)

### Step 1: Create `.env.production` file (For Production Builds)

```bash
# Copy the template
cp config/environment/env.production.template .env.production

# Edit and fill in the values
nano .env.production  # or use your favorite editor
```

**Required values to fill:**
- All `EXPO_PUBLIC_FIREBASE_*` variables (get from [Firebase Console](https://console.firebase.google.com/project/wesplit-35186/settings/general))
- At least one RPC API key (recommended for better performance)
- `EXPO_PUBLIC_NETWORK=mainnet` for production
- `EXPO_PUBLIC_USE_PROD_FUNCTIONS=true` for production

### Step 2: Verify Firebase Secrets (For Production Builds)

```bash
# Run the verification script
./scripts/verify-firebase-secrets.sh
```

### Step 3: Deploy Firebase Functions (For Production Builds)

```bash
cd services/firebase-functions
firebase deploy --only functions
```

### Step 4: Build

#### Build AAB Only
```bash
npm run build:aab:local
# or
bash scripts/build-aab-production-local.sh
```

#### Build IPA Only
```bash
npm run build:ipa:local
# or
bash scripts/build-ipa-production-local.sh
```

#### Build Both
```bash
npm run build:both:local
# or
bash scripts/build-both-production-local.sh
```

**Note:** For production builds, ensure `.env.production` is set up and Firebase Functions are deployed first.

## Build Output Locations

### Android AAB
- **Location**: `android/app/build/outputs/bundle/release/app-release.aab`
- **Size**: Typically 20-50 MB

### iOS IPA
- **Location**: `tools/builds/ios/WeSplit-YYYYMMDD-HHMMSS.ipa`
- **Size**: Typically 30-80 MB
- **Archive**: `tools/builds/ios/WeSplit.xcarchive`

## Android AAB Build Details

### Environment Setup
The script automatically:
1. Loads environment variables from `.env` file
2. Sets production environment variables
3. Validates network configuration
4. Synchronizes Android version from `app.config.js`

### Signing Configuration
By default, the build uses the debug keystore. For production Play Store uploads:

1. Create a release keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/release.keystore \
  -alias release -keyalg RSA -keysize 2048 -validity 10000
```

2. Configure in `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=release.keystore
MYAPP_RELEASE_KEY_ALIAS=release
MYAPP_RELEASE_STORE_PASSWORD=your_store_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

### Troubleshooting Android Builds

**Issue**: Build fails with "Java version mismatch"
```bash
# Set Java 17
export JAVA_HOME=$(brew --prefix)/opt/openjdk@17
export PATH=$JAVA_HOME/bin:$PATH
```

**Issue**: Build fails with "SDK not found"
- Ensure Android SDK is installed via Android Studio
- Check `android/local.properties` has `sdk.dir` set correctly

## iOS IPA Build Details

### First-Time Setup

1. **Open Xcode and Configure Signing**:
   ```bash
   open ios/WeSplit.xcworkspace
   ```
   - Select the WeSplit project
   - Select the WeSplit target
   - Go to "Signing & Capabilities"
   - Check "Automatically manage signing"
   - Select your Development Team

2. **Install CocoaPods Dependencies**:
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Test Build from Xcode**:
   - In Xcode: Product → Archive
   - This helps identify any configuration issues before using the script

### Code Signing

The build script uses automatic code signing. Ensure:
- You're logged into Xcode with your Apple ID
- Xcode → Preferences → Accounts → Add your Apple ID
- Your team is selected in the project settings

### Distribution Methods

The default export uses `development` method. To change:

1. Edit `scripts/build-ipa-production-local.sh`
2. Find the `ExportOptions.plist` section
3. Change `method` to one of:
   - `development` - For development/testing
   - `ad-hoc` - For Ad Hoc distribution
   - `app-store` - For App Store/TestFlight
   - `enterprise` - For Enterprise distribution

### Troubleshooting iOS Builds

**Issue**: "No signing certificate found"
- Open Xcode → Preferences → Accounts
- Select your Apple ID → Download Manual Profiles
- Or ensure "Automatically manage signing" is enabled

**Issue**: "Provisioning profile not found"
- Ensure your bundle ID matches your App ID in Apple Developer Portal
- Check that provisioning profiles are downloaded in Xcode

**Issue**: Archive builds but export fails
- Try exporting manually from Xcode Organizer:
  - Xcode → Window → Organizer
  - Select your archive
  - Click "Distribute App"
  - Follow the wizard

**Issue**: "CocoaPods not found"
```bash
sudo gem install cocoapods
cd ios
pod install
```

## Environment Variables

Both scripts load environment variables from `.env` or `.env.production` file. Required variables:

```bash
# Network Configuration (REQUIRED for production)
EXPO_PUBLIC_NETWORK=mainnet
EXPO_PUBLIC_FORCE_MAINNET=true
EXPO_PUBLIC_DEV_NETWORK=mainnet
EXPO_PUBLIC_USE_PROD_FUNCTIONS=true

# Firebase Configuration (REQUIRED)
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=wesplit-35186.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=wesplit-35186
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=wesplit-35186.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# RPC Configuration (OPTIONAL but RECOMMENDED for better performance)
EXPO_PUBLIC_HELIUS_API_KEY=your-helius-api-key
# OR
EXPO_PUBLIC_ALCHEMY_API_KEY=your-alchemy-api-key
# OR
EXPO_PUBLIC_GETBLOCK_API_KEY=your-getblock-api-key
```

**Important:** 
- Replace all placeholder values with actual values
- Never commit `.env.production` to version control (it should be in `.gitignore`)
- Get Firebase config values from [Firebase Console](https://console.firebase.google.com/project/wesplit-35186/settings/general)

## Build Time

- **AAB Build**: ~5-15 minutes (depending on machine)
- **IPA Build**: ~10-20 minutes (depending on machine)
- **Both**: ~15-35 minutes total

## Verification

### Verify AAB
```bash
# Check AAB exists and get size
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# Validate AAB structure (requires bundletool)
# bundletool build-apks --bundle=app-release.aab --output=app.apks
```

### Verify IPA
```bash
# Check IPA exists and get size
ls -lh tools/builds/ios/*.ipa

# Check IPA contents (optional)
unzip -l tools/builds/ios/WeSplit-*.ipa | head -20
```

## Uploading to Stores

### Google Play Console
1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to Production → Create new release
4. Upload `android/app/build/outputs/bundle/release/app-release.aab`

### App Store Connect / TestFlight
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to TestFlight tab
4. Upload IPA using Transporter app or Xcode Organizer
5. Or use: `xcrun altool --upload-app --file your-app.ipa --apiKey YOUR_API_KEY --apiIssuer YOUR_ISSUER_ID`

## Notes

- ⚠️ **AAB builds use debug keystore by default** - Configure release keystore for production
- ⚠️ **IPA builds require macOS and Xcode** - Cannot build iOS on other platforms
- ⚠️ **Code signing must be configured in Xcode first** - The script cannot set this up automatically
- ✅ **Both scripts clean previous builds** - No need to manually clean
- ✅ **Environment variables are validated** - Scripts check network config before building

## Production Build Checklist

Before building production AAB/IPA:

- [ ] `.env.production` file exists with all required variables
- [ ] All Firebase environment variables are set correctly
- [ ] `EXPO_PUBLIC_USE_PROD_FUNCTIONS=true` in `.env.production`
- [ ] `EXPO_PUBLIC_NETWORK=mainnet` in `.env.production`
- [ ] Firebase Functions secrets are set (verified with script)
- [ ] Firebase Functions are deployed to production
- [ ] Test transaction works in production build

## Troubleshooting

### Issue: Environment variables show as `${VAR_NAME}` in logs

**Cause:** `.env.production` not loaded or variables not set

**Solution:**
1. Verify `.env.production` exists in project root
2. Check variables are set (no empty values)
3. Rebuild with `--clear-cache` flag
4. Verify `app.config.js` is reading from `.env.production`

### Issue: Transactions fail with "internal" error

**Possible Causes:**
1. Firebase Functions not deployed
2. Firebase Secrets not set
3. `EXPO_PUBLIC_USE_PROD_FUNCTIONS` not set to `true`

**Solution:**
1. Verify functions are deployed: `firebase functions:list`
2. Verify secrets are set: `./scripts/verify-firebase-secrets.sh`
3. Check `.env.production` has `EXPO_PUBLIC_USE_PROD_FUNCTIONS=true`
4. Check Firebase Functions logs: `firebase functions:log`

### Issue: Firebase initialization fails

**Cause:** Firebase environment variables missing or incorrect

**Solution:**
1. Verify all Firebase variables in `.env.production`
2. Get correct values from [Firebase Console](https://console.firebase.google.com/project/wesplit-35186/settings/general)
3. Rebuild after updating `.env.production`

### Issue: "Secret not found" errors in Firebase Functions

**Cause:** Firebase Secrets not set in Firebase Secret Manager

**Solution:**
1. Run `./scripts/verify-firebase-secrets.sh` to check which secrets are missing
2. Set missing secrets (see Firebase Secrets Setup guide)
3. Redeploy functions: `cd services/firebase-functions && firebase deploy --only functions`

## Related Documentation

- [Firebase Secrets Setup](./FIREBASE_SECRETS_SETUP_GUIDE.md)
- [Firebase Functions Network Setup](./FIREBASE_FUNCTIONS_NETWORK_SETUP.md)
- [Troubleshooting Transaction Errors](./TROUBLESHOOTING_TRANSACTION_ERRORS.md)
- [Network Configuration](../NETWORK_CONFIGURATION.md)

### Consolidated Documentation

The following file has been consolidated into this guide:
- `LOCAL_PRODUCTION_BUILD_SETUP.md` - Production build setup details (now included above)

## Support

If you encounter issues:
1. Check the troubleshooting sections above
2. Review the build logs for specific error messages
3. Try building from Xcode/Android Studio first to identify issues
4. Ensure all prerequisites are installed and configured

