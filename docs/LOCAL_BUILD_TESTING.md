# Local Build Testing Guide

This guide helps you test builds locally before deploying to production, ensuring your app bundles correctly and launches on devices.

## Quick Start

Run the comprehensive build test:
```bash
npm run test:build
```

This will test:
- ✅ Dependencies and environment
- ✅ TypeScript compilation
- ✅ Metro bundler (Android & iOS)
- ✅ Prebuild (native code generation)
- ✅ Build setup verification

## Testing on Physical Devices

### Android

#### Option 1: Development Build (Recommended for Testing)
```bash
# Start Metro bundler
npm start

# In another terminal, run on connected device
npm run android
```

#### Option 2: Production APK (Local Build)
```bash
# Build production APK locally
npm run build:aab:local

# Or use the script directly
bash scripts/build-aab-production-local.sh
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

#### Option 3: Install on Connected Device
```bash
# Connect Android device via USB with USB debugging enabled
adb devices  # Verify device is connected

# Install the APK
adb install android/app/build/outputs/apk/release/app-release.apk
```

### iOS

#### Option 1: Development Build (Recommended for Testing)
```bash
# Start Metro bundler
npm start

# In another terminal, run on connected device/simulator
npm run ios
```

#### Option 2: Production IPA (Local Build)
```bash
# Build production IPA locally
npm run build:ipa:local

# Or use the script directly
bash scripts/build-ipa-production-local.sh
```

The IPA will be at: `tools/builds/ios/WeSplit-YYYYMMDD-HHMMSS.ipa`

#### Option 3: Install via Xcode
1. Open Xcode: `open ios/WeSplitBeta.xcworkspace`
2. Select your device from the device dropdown
3. Product → Run (⌘R)

## Testing Checklist

Before deploying to production, verify:

- [ ] **Bundling**: `npm run test:build` passes all tests
- [ ] **Android Launch**: App launches on Android device/emulator
- [ ] **iOS Launch**: App launches on iOS device/simulator
- [ ] **Critical Features**: Test core functionality (wallet, transactions, splits)
- [ ] **No Crashes**: App doesn't crash on launch or during use
- [ ] **Balance Display**: Balance loads correctly
- [ ] **Transaction Flow**: Can send/receive transactions
- [ ] **Network**: App connects to correct network (devnet/mainnet)

## Common Issues & Solutions

### Android Build Fails

**Issue**: Gradle build errors
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleRelease
```

**Issue**: Keystore not found
- Ensure keystore is configured in `android/app/build.gradle`
- Or use debug keystore for testing: `./gradlew assembleDebug`

### iOS Build Fails

**Issue**: Code signing errors
1. Open Xcode: `open ios/WeSplitBeta.xcworkspace`
2. Select project → Target → Signing & Capabilities
3. Check "Automatically manage signing"
4. Select your Development Team

**Issue**: CocoaPods errors
```bash
cd ios
pod deintegrate
pod install
```

### Metro Bundler Errors

**Issue**: Module resolution errors
```bash
# Clear cache and reinstall
npm run clean-cache
rm -rf node_modules
npm install
```

**Issue**: Bundle size too large
- Check for duplicate dependencies
- Use `npx expo export --dump-sourcemap` to analyze bundle

## Production Build Testing

### Test Production Environment Locally

1. **Set Production Environment**:
```bash
export NODE_ENV=production
export APP_ENV=production
export EXPO_PUBLIC_NETWORK=mainnet
export EXPO_PUBLIC_FORCE_MAINNET=true
```

2. **Run Build Test**:
```bash
npm run test:build
```

3. **Build Production APK/IPA**:
```bash
# Android
npm run build:aab:local

# iOS
npm run build:ipa:local
```

### Verify Production Build

- [ ] App uses mainnet (not devnet)
- [ ] Production Firebase functions are used
- [ ] No dev flags are active (`__DEV__` checks)
- [ ] App version and build number are correct
- [ ] All environment variables are set correctly

## EAS Build Testing

After local testing passes, test with EAS:

```bash
# Android
eas build --platform android --profile preview --local

# iOS (requires macOS)
eas build --platform ios --profile preview --local
```

The `--local` flag builds on your machine instead of EAS servers, allowing you to test the exact build process.

## Troubleshooting

### App Crashes on Launch

1. Check logs:
   ```bash
   # Android
   adb logcat | grep -i "error\|exception\|crash"
   
   # iOS (in Xcode)
   # View → Debug Area → Show Debug Area
   ```

2. Verify fixes:
   - Check for undefined variables (like `subscriptionId` fix)
   - Verify all imports are correct
   - Check for require cycles

### Bundle Fails to Load

1. Check Metro bundler output for errors
2. Verify all dependencies are installed: `npm install`
3. Clear cache: `npm run clean-cache`

### Native Modules Not Found

1. Run prebuild: `npx expo prebuild --clean`
2. Reinstall pods (iOS): `cd ios && pod install`
3. Rebuild Gradle (Android): `cd android && ./gradlew clean`

## Next Steps

After successful local testing:

1. ✅ Commit all changes
2. ✅ Push to repository
3. ✅ Create EAS build: `eas build --platform all --profile production`
4. ✅ Test the EAS build on TestFlight/Internal Testing
5. ✅ Deploy to production

---

**Note**: Local builds use debug signing. For production App Store/Play Store releases, ensure proper code signing is configured.

