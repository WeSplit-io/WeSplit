# SPEND Deep Link Website Setup - Complete Guide

**Last Updated**: 2025-01-27  
**Status**: ✅ Complete Setup Guide

---

## Overview

This guide ensures the deep link website is properly configured for SPEND integration. The website is hosted at **`wesplit-deeplinks.web.app`** and handles all deep link callbacks.

---

## Website URL

**Primary Deep Links Website**: `https://wesplit-deeplinks.web.app`

This is the Firebase hosting site configured in `.firebaserc`:
```json
{
  "targets": {
    "wesplit-35186": {
      "hosting": {
        "deeplinks": ["wesplit-deeplinks"]
      }
    }
  }
}
```

---

## Supported Deep Link Routes

### 1. Join Split
- **URL**: `https://wesplit-deeplinks.web.app/join-split?data=...`
- **Purpose**: Invite users to join a split
- **Landing Page**: `/public/join-split/index.html`

### 2. View Split
- **URL**: `https://wesplit-deeplinks.web.app/view-split?splitId=...&userId=...`
- **Purpose**: View a split from external source (e.g., SPEND)
- **Landing Page**: `/public/join-split/index.html` (shared)

### 3. Spend Callback ⭐ NEW
- **URL**: `https://wesplit-deeplinks.web.app/spend-callback?callbackUrl=...&orderId=...&status=...`
- **Purpose**: Return users to SPEND app after payment completion
- **Landing Page**: `/public/spend-callback/index.html`

### 4. Referral
- **URL**: `https://wesplit-deeplinks.web.app/referral?code=...`
- **Purpose**: Handle referral links
- **Landing Page**: `/public/referral/index.html`

---

## Firebase Configuration

### `firebase.json` Setup

```json
{
  "hosting": [
    {
      "target": "deeplinks",
      "public": "public",
      "rewrites": [
        {
          "source": "/join-split",
          "destination": "/join-split/index.html"
        },
        {
          "source": "/view-split",
          "destination": "/join-split/index.html"
        },
        {
          "source": "/spend-callback",
          "destination": "/spend-callback/index.html"
        },
        {
          "source": "/referral",
          "destination": "/referral/index.html"
        }
      ],
      "headers": [
        {
          "source": "/.well-known/apple-app-site-association",
          "headers": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        {
          "source": "/.well-known/assetlinks.json",
          "headers": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Universal Link Configuration

### Apple App Site Association

**File**: `public/.well-known/apple-app-site-association` (NO file extension!)

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "G7JK3MSC7S.com.wesplit.app",
        "paths": [
          "/join-split",
          "/join-split/*",
          "/view-split",
          "/view-split/*",
          "/spend-callback",
          "/spend-callback/*",
          "/referral",
          "/referral/*"
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": [
      "G7JK3MSC7S.com.wesplit.app"
    ]
  }
}
```

### Android Asset Links

**File**: `public/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.wesplit.app",
      "sha256_cert_fingerprints": [
        "e6:ea:d2:32:2e:5a:67:60:b1:ae:67:fb:89:13:b3:78:1d:37:44:0f:36:2b:59:f9:7b:64:ff:0e:a6:ef:c1:82"
      ]
    }
  }
]
```

---

## Spend Callback Landing Page

**File**: `public/spend-callback/index.html`

This page:
- ✅ Parses callback parameters from URL
- ✅ Shows payment status (success/error/cancelled)
- ✅ Automatically redirects to SPEND app via callback URL
- ✅ Provides manual redirect button as fallback
- ✅ Works for users with and without WeSplit app

**URL Parameters**:
- `callbackUrl` (required): URL to redirect back to SPEND app
- `orderId` (optional): SPEND order ID
- `status` (optional): `success`, `error`, or `cancelled`
- `message` (optional): Custom message to display

**Example URL**:
```
https://wesplit-deeplinks.web.app/spend-callback?callbackUrl=spend%3A%2F%2Forder%2FORD-123%2Fsuccess&orderId=ORD-123&status=success&message=Payment%20completed%20successfully
```

---

## Code Integration

### Deep Link Handler

The app recognizes these domains:
```typescript
const UNIVERSAL_LINK_DOMAINS = [
  'wesplit.io',
  'www.wesplit.io',
  'wesplit-deeplinks.web.app'  // ✅ Deep links website
];
```

### Generate Spend Callback Universal Link

```typescript
import { generateSpendCallbackUniversalLink } from '../../services/core/deepLinkHandler';

const universalLink = generateSpendCallbackUniversalLink(
  'spend://order/ORD-123/success',
  'ORD-123',
  'success',
  'Payment completed successfully'
);
// Returns: https://wesplit-deeplinks.web.app/spend-callback?callbackUrl=...
```

---

## Deployment

### 1. Deploy to Firebase Hosting

```bash
# Deploy deep links website
firebase deploy --only hosting:deeplinks
```

### 2. Verify Deployment

```bash
# Test Apple AASA
curl -I https://wesplit-deeplinks.web.app/.well-known/apple-app-site-association

# Test Android Asset Links
curl -I https://wesplit-deeplinks.web.app/.well-known/assetlinks.json

# Test Spend Callback page
curl -I https://wesplit-deeplinks.web.app/spend-callback
```

All should return `200 OK` with proper `Content-Type` headers.

### 3. Verify Universal Links

- **iOS**: https://branch.io/resources/aasa-validator/
- **Android**: https://developers.google.com/digital-asset-links/tools/generator

---

## Testing

### Test Spend Callback Flow

1. **Create test split** with callback URL:
```bash
curl -X POST https://us-central1-wesplit-35186.cloudfunctions.net/createSplitFromPayment \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "amount": 100,
    "currency": "USDC",
    "metadata": {
      "callbackUrl": "spend://order/TEST-123/success",
      "orderId": "TEST-123"
    }
  }'
```

2. **Test universal link**:
```
https://wesplit-deeplinks.web.app/spend-callback?callbackUrl=spend%3A%2F%2Forder%2FTEST-123%2Fsuccess&orderId=TEST-123&status=success
```

3. **Expected behavior**:
   - Page loads showing "Payment Successful"
   - Automatically redirects to `spend://order/TEST-123/success`
   - If redirect fails, shows "Return to SPEND" button

---

## URL Consistency

### ✅ Correct Usage

- **Deep Links Website**: `https://wesplit-deeplinks.web.app`
- **Main Website**: `https://wesplit.io` (if separate)
- **App Scheme**: `wesplit://`

### Code References

All code should use:
- `generateSpendCallbackUniversalLink()` → Returns `wesplit-deeplinks.web.app` URLs
- `UNIVERSAL_LINK_DOMAINS` → Includes `wesplit-deeplinks.web.app`
- `firebase.json` → Routes configured for all deep link paths

---

## Checklist

- [x] Firebase hosting target configured (`deeplinks`)
- [x] `firebase.json` includes `/spend-callback` rewrite
- [x] Apple App Site Association includes `/spend-callback` paths
- [x] Android Asset Links configured
- [x] Landing page created at `/public/spend-callback/index.html`
- [x] Deep link handler recognizes `wesplit-deeplinks.web.app`
- [x] `generateSpendCallbackUniversalLink()` uses correct URL
- [x] Documentation updated

---

## Support

- **Technical Questions**: vcharles@dappzy.io
- **Deployment Issues**: Check Firebase hosting logs
- **Universal Link Issues**: Verify AASA/Asset Links files

---

**Status**: ✅ **Ready for Deployment**

All files are configured and ready. Deploy with `firebase deploy --only hosting:deeplinks`.
