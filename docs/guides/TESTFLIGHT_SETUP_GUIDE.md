# 🍎 TestFlight Setup Guide for WeSplit

## Prerequisites ✅

- ✅ Apple Developer Account (Individual or Organization)
- ✅ EAS CLI installed and logged in
- ✅ iOS app configured in EAS
- ✅ Distribution certificate and provisioning profile

## Step 1: Apple Developer Account Setup

### 1.1 Verify Your Apple Developer Account
```bash
# Check your current status
eas whoami
# Should show: devadmindappzy
```

### 1.2 Apple Developer Portal Access
1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Sign in with your Apple ID
3. Verify you have an **active** Apple Developer Program membership
4. Check that your app `com.wesplit.app` is registered

## Step 2: App Store Connect Setup

### 2.1 Access App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Sign in with the same Apple ID
3. Navigate to "My Apps"
4. Look for "WeSplit" app or create it if it doesn't exist

### 2.2 Create App Record (if needed)
If your app doesn't exist in App Store Connect:
1. Click "+" → "New App"
2. Fill in:
   - **Platform**: iOS
   - **Name**: WeSplit
   - **Primary Language**: English
   - **Bundle ID**: com.wesplit.app
   - **SKU**: wesplit-ios (unique identifier)

## Step 3: TestFlight Configuration

### 3.1 Access TestFlight
1. In App Store Connect, select your WeSplit app
2. Click on "TestFlight" tab
3. You'll see sections for:
   - **Internal Testing** (up to 100 testers)
   - **External Testing** (up to 10,000 testers)

### 3.2 Internal Testing Setup (Recommended for Mass Distribution)
1. Click "Internal Testing"
2. Create a new group:
   - **Group Name**: "WeSplit Beta Testers"
   - **Description**: "Internal testing group for WeSplit app"

## Step 4: Build and Upload to TestFlight

### 4.1 Build with Mass Distribution Profile
```bash
# Build the IPA optimized for TestFlight
npm run build:ipa:mass
```

### 4.2 Automatic Upload
- EAS will automatically upload the build to TestFlight
- No manual upload needed!

### 4.3 Verify Upload
1. Go to App Store Connect → TestFlight
2. Check "Builds" section
3. Your build should appear after processing (5-15 minutes)

## Step 5: Add Testers

### 5.1 Internal Testers (Up to 100)
1. In TestFlight → Internal Testing
2. Click "Add Testers"
3. Add email addresses of your testers
4. Testers will receive email invitations

### 5.2 External Testers (Up to 10,000)
1. In TestFlight → External Testing
2. Create a new group
3. Add testers by email
4. Submit for Beta App Review (takes 24-48 hours)

## Step 6: Tester Experience

### 6.1 What Testers Receive
1. **Email invitation** from Apple
2. **TestFlight app** download link
3. **Installation instructions**

### 6.2 Tester Installation Process
1. Download TestFlight app from App Store
2. Open invitation email
3. Tap "Start Testing" or "View in TestFlight"
4. Install WeSplit app
5. Launch and test!

## Step 7: Management and Updates

### 7.1 Adding More Testers
- Internal: Add up to 100 testers instantly
- External: Add up to 10,000 testers (requires review)

### 7.2 Updating the App
```bash
# Build new version
npm run build:ipa:mass
# EAS auto-increments build number
# New build automatically appears in TestFlight
```

### 7.3 Managing Testers
- View tester feedback in App Store Connect
- Remove testers if needed
- Send reminders to testers

## 🎯 Benefits of This Setup

✅ **Matches Android APK Distribution**
- Simple invitation → install process
- No device registration needed
- Works on any iOS device

✅ **Scalable**
- Up to 10,000 external testers
- Easy to add/remove testers
- Automatic build updates

✅ **Professional**
- Official Apple testing platform
- Built-in crash reporting
- Tester feedback collection

## 🚨 Important Notes

1. **Build Processing**: First build takes 5-15 minutes to process
2. **Beta Review**: External testing requires Apple review (24-48 hours)
3. **Tester Limit**: Internal = 100, External = 10,000
4. **Build Expiry**: TestFlight builds expire after 90 days
5. **Updates**: New builds automatically replace old ones

## 📞 Support

If you encounter issues:
1. Check EAS build logs
2. Verify Apple Developer account status
3. Ensure app is properly configured in App Store Connect
4. Contact Apple Developer Support if needed

---

**Next Step**: Run `npm run build:ipa:mass` to build and upload to TestFlight!
