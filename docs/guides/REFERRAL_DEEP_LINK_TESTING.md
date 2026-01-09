# Referral Deep Link Testing Guide

**Date:** 2025-01-27  
**Status:** Critical Fix Applied - Testing Required  
**Purpose:** Guide for testing referral deep links, especially on TestFlight and Android testing builds

---

## Critical Fix Applied

**Issue Found:** The referral code was being lost during navigation from `AuthMethods` → `Verification` → `CreateProfile`.

**Fix Applied:**
- `AuthMethodsScreen` now reads `referralCode` from route params and passes it to `Verification` and `CreateProfile`
- `VerificationScreen` now preserves `referralCode` when navigating to `CreateProfile`
- All navigation paths now include `referralCode` in params

---

## TestFlight (iOS) Testing Considerations

### Universal Links on TestFlight

Universal links work differently on TestFlight compared to production:

1. **AASA File Requirements:**
   - The `.well-known/apple-app-site-association` file must be accessible at:
     - `https://wesplit-deeplinks.web.app/.well-known/apple-app-site-association`
   - Content-Type must be `application/json` (no file extension)
   - Must be served over HTTPS

2. **App Configuration:**
   - `app.config.js` must include `associatedDomains`:
     ```javascript
     associatedDomains: [
       "applinks:wesplit-deeplinks.web.app"
     ]
     ```
   - App must be properly signed with your Team ID

3. **TestFlight-Specific Behavior:**
   - Universal links may not work immediately after installing from TestFlight
   - iOS caches AASA files - may need to wait a few minutes after deployment
   - Reinstalling the app can help refresh the AASA cache
   - Universal links work better when the app is already installed (not during first install)

4. **Testing Steps:**
   ```bash
   # 1. Deploy AASA file to Firebase Hosting
   firebase deploy --only hosting:deeplinks
   
   # 2. Verify AASA is accessible
   curl https://wesplit-deeplinks.web.app/.well-known/apple-app-site-association
   
   # 3. Install app from TestFlight
   # 4. Wait 2-3 minutes for iOS to fetch AASA
   # 5. Send yourself a referral link via Messages/Notes
   # 6. Long-press the link - should see "Open in WeSplit"
   ```

5. **Troubleshooting TestFlight:**
   - If links don't work, try:
     - Reinstalling the app
     - Waiting 5-10 minutes after AASA deployment
     - Using Safari to open the link first (forces AASA fetch)
     - Checking iOS Settings → [Your App] → Associated Domains

---

## Android Testing Considerations

### App Links on Android Testing Builds

1. **Asset Links Requirements:**
   - The `.well-known/assetlinks.json` file must be accessible at:
     - `https://wesplit-deeplinks.web.app/.well-known/assetlinks.json`
   - Must include SHA256 fingerprint of your signing key
   - Must be served over HTTPS

2. **App Configuration:**
   - `app.config.js` must include `intentFilters`:
     ```javascript
     intentFilters: [
       {
         action: "VIEW",
         autoVerify: true,
         data: [
           { scheme: "https", host: "wesplit-deeplinks.web.app", pathPrefix: "/referral" }
         ],
         category: ["BROWSABLE", "DEFAULT"]
       }
     ]
     ```

3. **Testing Build Behavior:**
   - App Links work immediately on Android (no caching like iOS)
   - Must use the same signing key as production (or update assetlinks.json)
   - Debug builds may not work if using debug signing key

4. **Testing Steps:**
   ```bash
   # 1. Get your app's SHA256 fingerprint
   keytool -list -v -keystore your-keystore.jks -alias your-alias
   
   # 2. Update assetlinks.json with fingerprint
   # 3. Deploy to Firebase Hosting
   firebase deploy --only hosting:deeplinks
   
   # 4. Verify assetlinks.json
   curl https://wesplit-deeplinks.web.app/.well-known/assetlinks.json
   
   # 5. Install app on Android device
   # 6. Send yourself a referral link
   # 7. Tap the link - should open directly in app
   ```

5. **Troubleshooting Android:**
   - If links open in browser instead of app:
     - Check Android Settings → Apps → [Your App] → Open by default
     - Verify assetlinks.json fingerprint matches signing key
     - Use [Digital Asset Links Tester](https://developers.google.com/digital-asset-links/tools/generator)
   - Clear app defaults: Settings → Apps → [Your App] → Clear defaults

---

## End-to-End Testing Flow

### Test Case 1: Universal Link → New User Signup

**Steps:**
1. Ensure app is NOT installed (or uninstall it)
2. Generate referral link: `https://wesplit-deeplinks.web.app/referral?code=TESTCODE123`
3. Open link on device (iOS/Android)
4. **Expected:**
   - iOS: Safari opens → shows landing page → can open in App Store
   - Android: Browser opens → shows landing page → can open in Play Store
5. Install app from TestFlight/Play Store
6. Open the referral link again
7. **Expected:**
   - App opens automatically
   - Navigates to `AuthMethods` screen
   - `referralCode` is stored in route params
8. Complete signup (email or phone)
9. Navigate to `Verification` screen
10. **Expected:**
    - `referralCode` is preserved in route params
11. Complete verification
12. Navigate to `CreateProfile` screen
13. **Expected:**
    - `referralCode` is pre-filled in the referral input field
    - Code is automatically validated
    - Green checkmark appears if code is valid

### Test Case 2: App Already Installed

**Steps:**
1. App is already installed from TestFlight/Play Store
2. Open referral link: `https://wesplit-deeplinks.web.app/referral?code=TESTCODE123`
3. **Expected:**
   - App opens immediately (no browser redirect)
   - Navigates to `AuthMethods` with `referralCode` param
4. Complete signup flow
5. **Expected:**
   - Referral code is preserved through all navigation steps
   - Code is pre-filled in `CreateProfile`

### Test Case 3: App-Scheme Link (Internal)

**Steps:**
1. App is installed
2. Open app-scheme link: `wesplit://referral/TESTCODE123`
3. **Expected:**
   - App opens immediately
   - Same behavior as universal link

### Test Case 4: Already Authenticated User

**Steps:**
1. User is already logged in
2. Open referral link
3. **Expected:**
   - App opens
   - Shows alert: "Referral codes are applied when creating a new account..."
   - No referral is applied to existing account

---

## Verification Checklist

After deploying the fix, verify:

- [ ] `AuthMethodsScreen` reads `route.params?.referralCode`
- [ ] `AuthMethodsScreen` passes `referralCode` to `Verification` screen
- [ ] `VerificationScreen` preserves `referralCode` when navigating to `CreateProfile`
- [ ] `CreateProfileScreen` receives `referralCode` in route params
- [ ] `CreateProfileScreen` pre-fills referral input with code
- [ ] Code is automatically validated when pre-filled
- [ ] Universal links work on TestFlight (iOS)
- [ ] App Links work on Android testing builds
- [ ] AASA file is accessible and valid
- [ ] Asset Links file is accessible and valid

---

## Debugging Tips

### Check Route Params

Add logging to verify referral code is being passed:

```typescript
// In AuthMethodsScreen
useEffect(() => {
  const params = route.params as any;
  logger.info('AuthMethods route params', { 
    referralCode: params?.referralCode,
    allParams: params 
  }, 'AuthMethodsScreen');
}, [route.params]);

// In VerificationScreen
useEffect(() => {
  logger.info('Verification route params', { 
    referralCode: route.params?.referralCode,
    allParams: route.params 
  }, 'VerificationScreen');
}, [route.params]);

// In CreateProfileScreen
useEffect(() => {
  const params = route.params as any;
  logger.info('CreateProfile route params', { 
    referralCode: params?.referralCode,
    allParams: params 
  }, 'CreateProfileScreen');
}, [route.params]);
```

### Test Deep Link Parsing

```typescript
import { parseWeSplitDeepLink } from '../../services/core/deepLinkHandler';

// Test URL parsing
const testUrl = 'https://wesplit-deeplinks.web.app/referral?code=TESTCODE123';
const parsed = parseWeSplitDeepLink(testUrl);
console.log('Parsed referral link:', parsed);
// Should output: { action: 'referral', referralCode: 'TESTCODE123' }
```

### Verify AASA File

```bash
# Check AASA file
curl -I https://wesplit-deeplinks.web.app/.well-known/apple-app-site-association

# Should return:
# Content-Type: application/json
# Status: 200 OK
```

### Verify Asset Links File

```bash
# Check assetlinks.json
curl https://wesplit-deeplinks.web.app/.well-known/assetlinks.json

# Should return valid JSON with your app's package name and SHA256 fingerprint
```

---

## Known Issues & Workarounds

### Issue: Universal Links Not Working on TestFlight

**Symptoms:**
- Links open in Safari instead of app
- No "Open in WeSplit" option when long-pressing link

**Workarounds:**
1. Wait 5-10 minutes after AASA deployment
2. Reinstall the app
3. Open link in Safari first (forces AASA fetch)
4. Check iOS Settings → [Your App] → Associated Domains

### Issue: App Links Open in Browser on Android

**Symptoms:**
- Links open in Chrome instead of app
- App doesn't appear as option when tapping link

**Workarounds:**
1. Verify assetlinks.json fingerprint matches signing key
2. Clear app defaults: Settings → Apps → [Your App] → Clear defaults
3. Reinstall the app
4. Use Digital Asset Links Tester to verify configuration

### Issue: Referral Code Not Pre-filled

**Symptoms:**
- Deep link opens app correctly
- But referral code is not pre-filled in `CreateProfile`

**Debugging:**
1. Check logs for route params at each navigation step
2. Verify `referralCode` is being passed in navigation params
3. Check `CreateProfileScreen` useEffect that reads route params

---

## Production Deployment Checklist

Before deploying to production:

- [ ] AASA file deployed and accessible
- [ ] Asset Links file deployed and accessible
- [ ] AASA file includes correct Team ID
- [ ] Asset Links file includes correct SHA256 fingerprint
- [ ] `app.config.js` includes `associatedDomains` for iOS
- [ ] `app.config.js` includes `intentFilters` for Android
- [ ] Tested on TestFlight (iOS)
- [ ] Tested on Android testing build
- [ ] Verified referral code flows through all navigation steps
- [ ] Verified referral code is pre-filled in `CreateProfile`
- [ ] Verified referral code validation works
- [ ] Verified referral tracking works after profile creation

---

## Related Documentation

- [Deep Link Universal Link Setup](./DEEP_LINK_UNIVERSAL_LINK_SETUP.md)
- [Referral System Testing Guide](./REFERRAL_SYSTEM_TESTING_GUIDE.md)
- [Referral Code Flow Audit](../audits/REFERRAL_CODE_FLOW_AUDIT.md)
