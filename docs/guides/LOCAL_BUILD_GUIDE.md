# 📦 Local Build Guide for AAB and IPA

This guide explains how to build both Android AAB and iOS IPA files locally without using EAS cloud services.

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

## Quick Start

### Build AAB Only
```bash
npm run build:aab:local
# or
bash scripts/build-aab-production-local.sh
```

### Build IPA Only
```bash
npm run build:ipa:local
# or
bash scripts/build-ipa-production-local.sh
```

### Build Both
```bash
npm run build:both:local
# or
bash scripts/build-both-production-local.sh
```

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

Both scripts load environment variables from `.env` file. Required variables:

```bash
# Network Configuration
EXPO_PUBLIC_NETWORK=mainnet
EXPO_PUBLIC_FORCE_MAINNET=true
EXPO_PUBLIC_DEV_NETWORK=mainnet

# Firebase (if needed)
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...

# Other Expo Public variables
EXPO_PUBLIC_ALCHEMY_API_KEY=...
```

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

## Support

If you encounter issues:
1. Check the troubleshooting sections above
2. Review the build logs for specific error messages
3. Try building from Xcode/Android Studio first to identify issues
4. Ensure all prerequisites are installed and configured

