# Testing Android Builds Locally

## AAB Build Status

✅ **AAB Successfully Created!**

- **Location**: `android/app/build/outputs/bundle/release/app-release.aab`
- **Size**: 73 MB
- **Format**: Android App Bundle (AAB)
- **Signed with**: Debug keystore (for local testing)

## Important Notes

⚠️ **Keystore Warning**: 
- This AAB is signed with the **debug keystore** (SHA1: `5E:8F:16:06...`)
- For **Google Play Console uploads**, you need the **production keystore** (SHA1: `95:EF:A3:EB...`)
- **For local testing**, the debug keystore is fine

## Testing Options

### Option 1: Convert AAB to APK for Direct Installation

AAB files cannot be directly installed on devices. You need to convert to APK first:

```bash
# Install bundletool (if not already installed)
# Download from: https://github.com/google/bundletool/releases

# Convert AAB to APK set
bundletool build-apks \
  --bundle=android/app/build/outputs/bundle/release/app-release.aab \
  --output=app.apks \
  --mode=universal

# Extract universal APK
unzip app.apks -d app-universal
```

### Option 2: Build APK Directly (Easier for Testing)

For local device testing, build an APK instead:

```bash
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Option 3: Use EAS Build (Recommended for Production)

For production builds with the correct keystore:

```bash
eas build --platform android --profile production
```

This automatically uses the production keystore managed by EAS.

## Installing on Device

### Using APK (Recommended for Testing)

1. **Build APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Connect device via USB** and enable USB debugging

3. **Install APK**:
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

   Or use the helper script:
   ```bash
   bash scripts/install-android-build.sh
   ```

### Using AAB (For Play Store)

AAB files are for Google Play Console uploads only. They cannot be directly installed on devices.

1. **Upload to Play Console**:
   - Go to [Google Play Console](https://play.google.com/console)
   - Select your app
   - Production → Create new release
   - Upload `android/app/build/outputs/bundle/release/app-release.aab`

2. **Note**: You'll need the production keystore for Play Store uploads. Use EAS Build instead:
   ```bash
   eas build --platform android --profile production
   ```

## Verifying the Build

### Check AAB Contents

```bash
# List AAB contents
unzip -l android/app/build/outputs/bundle/release/app-release.aab | head -20
```

### Check Signing Certificate

```bash
# For AAB (requires bundletool)
bundletool dump manifest \
  --bundle=android/app/build/outputs/bundle/release/app-release.aab

# For APK
apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk
```

## Next Steps

1. ✅ **AAB Created** - Ready for testing conversion or Play Store (with production keystore)
2. 🔄 **Build APK** - For direct device installation and testing
3. 🧪 **Test on Device** - Install and verify app works correctly
4. 📤 **Upload to Play Store** - Use EAS Build for production keystore signing

## Troubleshooting

### AAB Too Large

The AAB is 73 MB which is reasonable. If you need to reduce size:
- Enable ProGuard/R8 minification
- Remove unused assets
- Use Android App Bundle's dynamic delivery features

### Can't Install AAB

AAB files cannot be directly installed. You must:
- Convert to APK using bundletool, OR
- Upload to Play Console for distribution

### Wrong Keystore for Play Store

If you get keystore mismatch errors:
- Use EAS Build: `eas build --platform android --profile production`
- This automatically uses the correct production keystore

