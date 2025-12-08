# 🚀 Quick Test Guide - Android Builds

## ✅ Builds Created Successfully!

### AAB (Android App Bundle)
- **Location**: `android/app/build/outputs/bundle/release/app-release.aab`
- **Size**: 73 MB
- **Purpose**: For Google Play Console uploads
- **Status**: ✅ Ready (but signed with debug keystore - see note below)

### APK (Android Package)
- **Location**: `android/app/build/outputs/apk/release/app-release.apk`
- **Size**: 117 MB
- **Purpose**: For direct device installation and testing
- **Status**: ✅ Ready for local testing

## 📱 Testing on Your Device

### Quick Install (APK)

1. **Connect your Android device via USB**

2. **Enable USB Debugging**:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

3. **Install APK**:
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

   Or use the helper script:
   ```bash
   bash scripts/install-android-build.sh
   ```

4. **Launch the app**:
   ```bash
   adb shell am start -n com.wesplit.app/.MainActivity
   ```

### View Logs While Testing

```bash
# Watch logs in real-time
adb logcat | grep -i "wesplit\|error\|exception"

# Or view all logs
adb logcat
```

## ⚠️ Important Notes

### Keystore Warning

**Current Status**: Both builds are signed with the **debug keystore** (SHA1: `5E:8F:16:06...`)

**For Google Play Console**: You need the **production keystore** (SHA1: `95:EF:A3:EB...`)

**Solution for Play Store Uploads**:
```bash
# Use EAS Build which automatically uses the correct production keystore
eas build --platform android --profile production
```

### Testing Checklist

After installing, verify:
- [ ] App launches without crashes
- [ ] Wallet balance loads correctly
- [ ] Can send/receive transactions
- [ ] Splits functionality works
- [ ] No runtime errors in logs
- [ ] Network connection (mainnet/devnet) is correct

## 📊 Build Information

- **Version**: 1.1.2
- **Build Number**: 11228
- **Environment**: Production (mainnet)
- **Signed with**: Debug keystore (for testing only)

## 🎯 Next Steps

1. ✅ **Test locally** - Install APK and verify functionality
2. 🔧 **Fix any issues** - Address crashes or bugs found during testing
3. 📤 **Build for Play Store** - Use `eas build --platform android --profile production` for production keystore
4. 🚀 **Deploy** - Upload to Google Play Console

---

**Note**: The AAB is ready, but for Play Store uploads, use EAS Build to ensure the correct production keystore is used.

