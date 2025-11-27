# Deep Link & Universal Link Setup Guide

**Last Updated**: 2025-01-27  
**Status**: Implementation Complete - Deployment Required

---

## Overview

This document explains the deep link and universal link setup for WeSplit, enabling split invitations to work for:
- **Users WITH the app**: Opens directly in app
- **Users WITHOUT the app**: Opens web page → redirects to app store

---

## Link Formats

### 1. App-Scheme Links (Internal Use Only)
```
wesplit://join-split?data=<encoded_invitation_data>
wesplit://view-split?splitId=xxx
```

**Use Cases**:
- Only works if the app is already installed
- Used internally when we know the user has the app

### 2. Universal Links (External Sharing)
```
https://wesplit.io/join-split?data=<encoded_invitation_data>
https://wesplit.io/view-split?splitId=xxx
```

**Use Cases**:
- Sharing via SMS, WhatsApp, email, social media
- QR codes (works for everyone)
- Works for users without the app (web fallback)

---

## Implementation Details

### Files Modified

1. **`src/services/splits/splitInvitationService.ts`**
   - Added `generateUniversalLink()` method
   - Added `generateAppSchemeLink()` method
   - Updated `validateInvitationURL()` to support both formats
   - Added `isInvitationURL()` helper

2. **`src/services/core/deepLinkHandler.ts`**
   - Added `isWeSplitDeepLink()` function
   - Updated `parseWeSplitDeepLink()` to parse both app-scheme and universal links
   - Added `UNIVERSAL_LINK_DOMAINS` constant

3. **`app.config.js`**
   - Added iOS `associatedDomains` for universal links
   - Added Android `intentFilters` for App Links

4. **`src/screens/SplitDetails/SplitDetailsScreen.tsx`**
   - Updated `generateQRCodeData()` to use universal links
   - Updated `handleLinkShare()` to use universal links

5. **`src/screens/QRCode/QRCodeScreen.tsx`**
   - Updated `handleBarCodeScanned()` to recognize both formats

---

## Web Hosting Setup (Firebase Hosting)

### Files Created

1. **`firebase.json`** - Hosting configuration
2. **`public/join-split/index.html`** - Landing page for split invitations
3. **`public/.well-known/apple-app-site-association`** - iOS Universal Links config
4. **`public/.well-known/assetlinks.json`** - Android App Links config

### Deployment Steps

1. **Update Apple App Site Association**
   - Replace `TEAM_ID` with your actual Apple Team ID
   - File: `public/.well-known/apple-app-site-association`

2. **Update Android Asset Links**
   - Replace `YOUR_SHA256_FINGERPRINT_HERE` with your signing key fingerprint
   - Get fingerprint: `keytool -list -v -keystore your-keystore.jks`
   - File: `public/.well-known/assetlinks.json`

3. **Deploy to Firebase Hosting**
   ```bash
   firebase deploy --only hosting
   ```

4. **Verify Universal Links**
   - iOS: https://branch.io/resources/aasa-validator/
   - Android: https://developers.google.com/digital-asset-links/tools/generator

---

## How It Works

### Flow for Users WITH the App

```
1. User receives link: https://wesplit.io/join-split?data=...
2. iOS/Android recognizes the domain (universal links / app links)
3. App opens directly with the link data
4. deepLinkHandler.ts parses the URL
5. User is navigated to SplitDetails screen
```

### Flow for Users WITHOUT the App

```
1. User receives link: https://wesplit.io/join-split?data=...
2. Browser opens the web page
3. Page attempts to open app via deep link (wesplit://)
4. If app doesn't open in 2 seconds, shows download options
5. User clicks "App Store" or "Play Store" button
6. After installing, user can click the link again to join
```

---

## Testing

### Test Universal Links (iOS)

1. Send yourself a link via Messages or Notes
2. Long-press the link
3. You should see "Open in WeSplit" option

### Test App Links (Android)

1. Send yourself a link via any app
2. Tap the link
3. Should open directly in WeSplit (no browser redirect)

### Test Web Fallback

1. Open link in desktop browser
2. Should see landing page with app store buttons
3. On mobile browser (with app installed), should attempt to open app

---

## Configuration Reference

### iOS Associated Domains (app.config.js)
```javascript
associatedDomains: [
  "applinks:wesplit.io",
  "applinks:www.wesplit.io"
]
```

### Android Intent Filters (app.config.js)
```javascript
intentFilters: [
  {
    action: "VIEW",
    autoVerify: true,
    data: [
      { scheme: "https", host: "wesplit.io", pathPrefix: "/join-split" },
      { scheme: "https", host: "wesplit.io", pathPrefix: "/view-split" }
    ],
    category: ["BROWSABLE", "DEFAULT"]
  }
]
```

---

## Troubleshooting

### Universal Links Not Working (iOS)

1. Verify AASA file is accessible at `https://wesplit.io/.well-known/apple-app-site-association`
2. Check Content-Type is `application/json`
3. Verify Team ID is correct
4. Reinstall app (iOS caches AASA)

### App Links Not Working (Android)

1. Verify assetlinks.json at `https://wesplit.io/.well-known/assetlinks.json`
2. Check SHA256 fingerprint matches your signing key
3. Use Digital Asset Links verification tool
4. Clear app defaults in Android settings

### Links Opening in Browser Instead of App

1. Ensure associated domains / intent filters are configured
2. Rebuild the app after config changes
3. Reinstall the app
4. Check if link was typed (iOS only opens links that are tapped)

---

## Security Considerations

1. **AASA and assetlinks.json** must be served over HTTPS
2. **Signature verification** in assetlinks.json prevents spoofing
3. **Invitation expiration** - links expire after 24 hours by default
4. **Invitation data** is encoded but not encrypted (only includes public info)

---

## Related Documentation

- [Apple Universal Links](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
- [Android App Links](https://developer.android.com/training/app-links)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)

