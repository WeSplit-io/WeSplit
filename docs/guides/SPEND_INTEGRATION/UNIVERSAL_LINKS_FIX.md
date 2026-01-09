# Universal Links Fix - Critical Issues Resolved

**Date:** 2025-01-17  
**Status:** ✅ Fixed - Deployment Required

---

## Issues Found

1. **Missing Domain in App Configuration**
   - iOS `associatedDomains` was missing `wesplit-deeplinks.web.app`
   - Android `intentFilters` was missing `wesplit-deeplinks.web.app`
   - This caused universal links from `wesplit-deeplinks.web.app` to not open the app

2. **Web Page Not Handling view-split URLs**
   - The `join-split/index.html` page only handled `join-split` URLs with `data` parameter
   - It didn't handle `view-split` URLs with `splitId` and `userId` parameters
   - The "Open in WeSplit" button didn't work for view-split links

3. **Button Click Handler Not Working**
   - The button href was set but click events weren't properly handled
   - No explicit click handler to ensure app opens

---

## Fixes Applied

### 1. Updated `app.config.js`

#### iOS Associated Domains
Added `wesplit-deeplinks.web.app` to the `associatedDomains` array:
```javascript
associatedDomains: [
  "applinks:wesplit.io",
  "applinks:www.wesplit.io",
  "applinks:wesplit-deeplinks.web.app"  // ✅ Added
]
```

#### Android Intent Filters
Added `wesplit-deeplinks.web.app` to all path prefixes:
```javascript
{
  scheme: "https",
  host: "wesplit-deeplinks.web.app",  // ✅ Added
  pathPrefix: "/join-split"
},
{
  scheme: "https",
  host: "wesplit-deeplinks.web.app",  // ✅ Added
  pathPrefix: "/view-split"
},
{
  scheme: "https",
  host: "wesplit-deeplinks.web.app",  // ✅ Added
  pathPrefix: "/spend-callback"
}
```

### 2. Updated `public/join-split/index.html`

#### Enhanced URL Parsing
- Now handles both `view-split` URLs (with `splitId` and `userId`)
- Handles `join-split` URLs with `data` parameter
- Handles `join-split` URLs with `invite` parameter (base64 encoded)

#### Fixed Deep Link Generation
- `view-split`: Generates `wesplit://view-split?splitId=...&userId=...`
- `join-split`: Generates `wesplit://join-split?data=...`
- Android: Uses Intent URLs for better reliability
- iOS: Uses app-scheme links

#### Fixed Button Click Handler
- Added explicit click event listener
- Ensures app opens when button is clicked
- Works for both view-split and join-split links

---

## Deployment Steps

### 1. Deploy Web Pages (Firebase Hosting)
```bash
firebase deploy --only hosting:deeplinks
```

This deploys:
- Updated `join-split/index.html` with proper URL handling
- AASA file at `/.well-known/apple-app-site-association`
- Asset Links file at `/.well-known/assetlinks.json`

### 2. Rebuild and Deploy App

**Important:** The app must be rebuilt and redeployed for the universal links to work!

#### iOS
```bash
# Build new app with updated associatedDomains
eas build --platform ios --profile production

# Or for TestFlight
eas build --platform ios --profile preview
```

#### Android
```bash
# Build new app with updated intentFilters
eas build --platform android --profile production
```

### 3. Verify Universal Links

#### iOS Verification
1. Deploy hosting first
2. Wait 5-10 minutes for iOS to fetch AASA file
3. Test on device:
   - Send yourself a link: `https://wesplit-deeplinks.web.app/view-split?splitId=test&userId=test`
   - Long-press the link in Messages/Notes
   - Should see "Open in WeSplit" option
   - Tap it - should open app directly

#### Android Verification
1. Deploy hosting first
2. Test on device:
   - Open link in browser: `https://wesplit-deeplinks.web.app/view-split?splitId=test&userId=test`
   - Should open directly in app (no browser redirect)
   - If not, clear app defaults in Android settings

#### Web Page Verification
1. Open in browser: `https://wesplit-deeplinks.web.app/view-split?splitId=test&userId=test`
2. Click "Open in WeSplit" button
3. Should attempt to open app (or show app store if not installed)

---

## Testing Checklist

- [ ] Deploy Firebase Hosting
- [ ] Rebuild iOS app with new associatedDomains
- [ ] Rebuild Android app with new intentFilters
- [ ] Test iOS universal link (long-press in Messages)
- [ ] Test Android app link (tap in browser)
- [ ] Test web page button click (desktop browser)
- [ ] Test web page button click (mobile browser)
- [ ] Verify view-split URLs work
- [ ] Verify join-split URLs work
- [ ] Verify spend-callback URLs work

---

## Important Notes

1. **Universal Links Require App Rebuild**
   - Changes to `associatedDomains` and `intentFilters` require a new app build
   - Simply deploying hosting is NOT enough
   - The app must be rebuilt and users must update to the new version

2. **iOS AASA Caching**
   - iOS caches the AASA file
   - After deploying hosting, wait 5-10 minutes before testing
   - Reinstalling the app can help refresh the cache

3. **Android App Links Verification**
   - Android verifies the assetlinks.json file
   - Must be served over HTTPS
   - Must have correct Content-Type: application/json
   - Must match the app's signing certificate fingerprint

4. **Web Fallback**
   - If app is not installed, web page shows download buttons
   - Button click attempts to open app, falls back to app store
   - Works on all platforms (iOS, Android, Desktop)

---

## Related Files

- `app.config.js` - App configuration (iOS/Android deep links)
- `public/join-split/index.html` - Web landing page
- `public/.well-known/apple-app-site-association` - iOS universal links config
- `public/.well-known/assetlinks.json` - Android app links config
- `firebase.json` - Firebase hosting configuration

---

## Next Steps

1. Deploy hosting: `firebase deploy --only hosting:deeplinks`
2. Rebuild iOS app: `eas build --platform ios`
3. Rebuild Android app: `eas build --platform android`
4. Test on devices
5. Update users to new app version
