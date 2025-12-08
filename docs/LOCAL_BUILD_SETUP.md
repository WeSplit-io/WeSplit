# Local Build Setup Guide

## Quick Fixes for Build Issues

### Android Build: Missing SDK Location

**Error**: `SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable`

**Solution**:
1. The `android/local.properties` file has been created automatically
2. If it doesn't exist, run:
   ```bash
   bash scripts/setup-android-sdk.sh
   ```

The file should contain:
```properties
sdk.dir=/Users/charlesvincent/Library/Android/sdk
```

**Optional**: Add to your shell profile (`~/.zshrc` or `~/.bash_profile`):
```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH"
```

### iOS Build: Code Signing Not Configured

**Error**: `Code signing not configured!`

**Solution**:
1. Open Xcode:
   ```bash
   open ios/WeSplitBeta.xcworkspace
   ```

2. Configure signing:
   - Select **WeSplitBeta** project in navigator (left sidebar)
   - Select **WeSplitBeta** target
   - Go to **Signing & Capabilities** tab
   - Check **"Automatically manage signing"**
   - Select your **Development Team** from dropdown

3. If you don't see your team:
   - Xcode → Preferences → Accounts
   - Click **+** to add your Apple ID
   - Sign in with your Apple Developer account

4. After configuring, run the build script again:
   ```bash
   npm run build:ipa:local
   ```

## Testing Builds

### Test Android Build
```bash
npm run build:aab:local
```

### Test iOS Build
```bash
npm run build:ipa:local
```

### Run All Build Tests
```bash
npm run test:build
```

## Troubleshooting

### Android: Gradle Build Fails

1. **Clean build**:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

2. **Check Java version**:
   ```bash
   java -version  # Should be Java 17
   ```

3. **Verify SDK path**:
   ```bash
   cat android/local.properties
   ```

### iOS: CocoaPods Issues

1. **Reinstall pods**:
   ```bash
   cd ios
   pod deintegrate
   pod install
   ```

2. **Clean derived data**:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData/WeSplit-*
   ```

### Both: Metro Bundler Errors

1. **Clear cache**:
   ```bash
   npm run clean-cache
   ```

2. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules
   npm install
   ```

## Next Steps

After local builds work:

1. ✅ Test on physical devices
2. ✅ Verify app launches without crashes
3. ✅ Test critical features
4. ✅ Deploy via EAS: `eas build --platform all --profile production`

