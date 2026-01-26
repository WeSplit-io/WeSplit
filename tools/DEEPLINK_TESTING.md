# Deep Link Testing Guide

This guide helps you test all deeplinks in the WeSplit app to ensure they're working correctly.

## Quick Start

### 1. Test All Deeplinks Programmatically

Run comprehensive tests to validate parsing logic:

```bash
npm run test:deeplinks:all
```

This will test:
- ✅ Join group links
- ✅ Profile/contact links
- ✅ Send money links
- ✅ Join split links
- ✅ View split links
- ✅ Referral links
- ✅ Spend callback links
- ✅ Invalid link rejection

### 2. Get iOS Testing Commands

```bash
npm run test:deeplinks:ios
```

This prints commands you can use to test deeplinks on iOS Simulator or physical devices.

### 3. Get Android Testing Commands

```bash
npm run test:deeplinks:android
```

This prints commands you can use to test deeplinks on Android Emulator or physical devices.

### 4. Test a Specific URL

```bash
npm run test:deeplinks:manual "wesplit://join/invite_test_123"
```

This will parse the URL and show you the testing commands for that specific link.

## Supported Deeplink Formats

### App-Scheme Links
Format: `wesplit://action/params`

Examples:
- `wesplit://join/invite_123`
- `wesplit://profile/user123/John%20Doe/john@example.com/wallet123`
- `wesplit://send/wallet123/John%20Doe/john@example.com`
- `wesplit://referral/ABC123`

### Universal Links
**Domain:** `https://deeplinks.wesplit.io` (primary domain for Universal Links)

**Configured Universal Link Routes:**
- `https://deeplinks.wesplit.io/join-split` - Join a split invitation
- `https://deeplinks.wesplit.io/view-split` - View an existing split
- `https://deeplinks.wesplit.io/spend-callback` - Return to Spend app after payment
- `https://deeplinks.wesplit.io/referral` - Apply referral code
- `https://deeplinks.wesplit.io/phantom-callback` - Phantom authentication callback

**Note:** Only these 5 routes are configured as Universal Links. Other routes (like `/join/{inviteId}`, `/profile/...`, `/send/...`) are only available as app-scheme links (`wesplit://`).

Examples:
- `https://deeplinks.wesplit.io/join-split?data=<encoded_data>`
- `https://deeplinks.wesplit.io/referral?code=ABC123`
- `https://deeplinks.wesplit.io/view-split?splitId=123&userId=456`

## Testing on iOS

### Simulator
```bash
xcrun simctl openurl booted "wesplit://join/invite_test_123"
```

### Physical Device (via Safari)
1. Open Safari
2. Type: `wesplit://join/invite_test_123`
3. Tap Go

### Universal Links
Open the URL in Safari, Messages, Notes, etc.:
```
https://deeplinks.wesplit.io/join-split?data=<encoded_data>
https://deeplinks.wesplit.io/referral?code=ABC123
```

**Note:** Only the 5 configured routes work as Universal Links. Other routes must use app-scheme format.

## Testing on Android

### Emulator
```bash
adb shell am start -a android.intent.action.VIEW -d "wesplit://join/invite_test_123"
```

### Physical Device (via ADB)
```bash
adb shell am start -a android.intent.action.VIEW -d "wesplit://join/invite_test_123"
```

### Universal Links
Open the URL in Chrome or any browser:
```
https://deeplinks.wesplit.io/join-split?data=<encoded_data>
https://deeplinks.wesplit.io/referral?code=ABC123
```

**Note:** Only the 5 configured routes work as Universal Links. Other routes must use app-scheme format.

## Common Deeplink Actions

### Join Group (App-Scheme Only)
- App-scheme: `wesplit://join/{inviteId}`
- **Note:** Not available as Universal Link. Use `/join-split` for split invitations instead.

### Profile (Add Contact) - App-Scheme Only
- App-scheme: `wesplit://profile/{userId}/{userName}/{userEmail}/{walletAddress}`
- **Note:** Not available as Universal Link. Only works via app-scheme.

### Send Money - App-Scheme Only
- App-scheme: `wesplit://send/{walletAddress}/{userName}/{userEmail}`
- **Note:** Not available as Universal Link. Only works via app-scheme.

### Join Split
- App-scheme: `wesplit://join-split?data={encoded_data}`
- Universal: `https://deeplinks.wesplit.io/join-split?data={encoded_data}`
- Also supports: `?splitId={id}` or `?invite={base64url}`

### View Split
- App-scheme: `wesplit://view-split?splitId={id}&userId={userId}`
- Universal: `https://deeplinks.wesplit.io/view-split?splitId={id}&userId={userId}`

### Referral
- App-scheme: `wesplit://referral?code={code}` or `wesplit://referral/{code}`
- Universal: `https://deeplinks.wesplit.io/referral?code={code}`

### Spend Callback
- App-scheme: `wesplit://spend-callback?callbackUrl={url}&orderId={id}&status={status}`
- Universal: `https://deeplinks.wesplit.io/spend-callback?callbackUrl={url}&orderId={id}&status={status}`

### Phantom Callback
- App-scheme: `wesplit://phantom-callback?response_type={type}&wallet_id={id}`
- Universal: `https://deeplinks.wesplit.io/phantom-callback?response_type={type}&wallet_id={id}`

## Troubleshooting

### Deeplinks Not Opening App

1. **Check app is installed** - Universal links only work if the app is installed
2. **Verify configuration** - Run `npm run test:deeplinks` to check config files
3. **Check domain verification** - iOS and Android verify universal links
4. **Rebuild app** - After config changes, rebuild: `npx expo prebuild --clean`

### Universal Links Not Working

1. **Deploy assetlinks.json** - Must be accessible at `https://deeplinks.wesplit.io/.well-known/assetlinks.json`
2. **Deploy apple-app-site-association** - Must be accessible at `https://deeplinks.wesplit.io/.well-known/apple-app-site-association`
3. **Verify headers** - Must have `Content-Type: application/json` header
4. **Check domain verification** - Android verifies App Links automatically
5. **Verify route is configured** - Only these 5 routes work as Universal Links:
   - `/join-split`
   - `/view-split`
   - `/spend-callback`
   - `/referral`
   - `/phantom-callback`

### App-Scheme Links Not Working

1. **Check app.config.js** - Verify `scheme: "wesplit"` is set
2. **Rebuild app** - Run `npx expo prebuild --clean` after changes
3. **Check platform-specific config** - Verify intent filters (Android) and URL schemes (iOS)

## Related Commands

- `npm run test:deeplinks` - Test configuration files
- `npm run test:formats` - Test link format generation
- `npm run test:links` - Test invitation link generation
- `npm run test:flow` - Test invitation flow

## Universal Link Configuration

**Domain:** `https://deeplinks.wesplit.io`

**Configured Routes (Universal Links):**
1. `/join-split` - Join a split invitation
2. `/view-split` - View an existing split
3. `/spend-callback` - Return to Spend app after payment
4. `/referral` - Apply referral code
5. `/phantom-callback` - Phantom authentication callback

**App-Scheme Only Routes:**
- `/join/{inviteId}` - Join group (legacy, use `/join-split` for splits)
- `/profile/{userId}/...` - Add contact from profile QR
- `/send/{walletAddress}/...` - Send money to wallet address
- `/transfer/{walletAddress}/...` - Transfer to external wallet

**Note:** The website serves landing pages at `deeplinks.wesplit.io` that redirect to app-scheme links. Universal Links only work for the 5 configured routes listed above.

## Additional Resources

- [Deep Link Handler Source](../src/services/core/deepLinkHandler.ts)
- [App Configuration](../app.config.js)
- [Firebase Hosting Config](../firebase.json)
