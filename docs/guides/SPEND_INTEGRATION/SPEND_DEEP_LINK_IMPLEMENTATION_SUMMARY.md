# SPEND Deep Link Implementation Summary

**Date**: 2025-01-27  
**Status**: ✅ Complete and Ready for Integration

---

## Overview

This document summarizes the deep link and redirect URL implementation for SPEND integration. All components are now properly configured to enable seamless user flow between SPEND and WeSplit apps.

---

## What Was Implemented

### 1. ✅ Deep Link Handler Enhancements

**File**: `src/services/core/deepLinkHandler.ts`

**Changes**:
- Added `spend-callback` action to `DeepLinkData` interface
- Added parsing logic for `spend-callback` deep links
- Added handler in `setupDeepLinkListeners` to redirect users back to SPEND app
- Added utility functions:
  - `generateSpendCallbackLink()` - Generate app-scheme callback links
  - `generateSpendCallbackUniversalLink()` - Generate universal callback links

**Deep Link Format**:
```
wesplit://spend-callback?callbackUrl={encodedUrl}&orderId={orderId}&status={status}&message={message}
```

### 2. ✅ API Endpoint Enhancements

**File**: `services/firebase-functions/src/spendApiEndpoints.js`

**Changes**:
- Enhanced `/payParticipantShare` endpoint to include `deepLink` and `redirectUrl` in response
- Enhanced `/batchInviteParticipants` endpoint to include `deepLink` and `redirectUrl` in response
- Deep links are automatically generated when `externalMetadata.callbackUrl` is provided

**Response Format**:
```json
{
  "success": true,
  // ... other fields
  "deepLink": "wesplit://spend-callback?callbackUrl=...&status=success",
  "redirectUrl": "spend://order/ORD-123/success"
}
```

### 3. ✅ SpendSplitScreen Updates

**File**: `src/screens/SpendSplit/SpendSplitScreen.tsx`

**Changes**:
- Added import for `Linking` and `generateSpendCallbackLink`
- Updated payment success handler to:
  - Check for `callbackUrl` in split metadata
  - Generate callback deep link
  - Show "Return to SPEND" button in success alert
  - Handle redirect with fallback error handling

**User Experience**:
- After payment completion, users see option to "Return to SPEND"
- Clicking redirects them back to SPEND app using the callback URL
- If redirect fails, user sees error message and can manually return

### 4. ✅ App Configuration Updates

**File**: `app.config.js`

**Changes**:
- Added Android intent filters for `/spend-callback` universal links
- Ensures Android App Links work for spend-callback deep links

---

## Deep Link Flow

### Website Configuration

**Deep Links Website**: `https://wesplit-deeplinks.web.app`

This is the Firebase hosting site for all deep link callbacks, including:
- `/join-split` - Split invitations
- `/view-split` - View splits from external sources
- `/spend-callback` - Return to SPEND after payment ⭐ NEW
- `/referral` - Referral links

### SPEND → WeSplit Flow

1. **User clicks "Pay with WeSplit" in SPEND**
2. **SPEND calls `/createSplitFromPayment` API** with `metadata.callbackUrl`
3. **API returns** `splitId` and `userId`
4. **SPEND redirects user** using:
   ```
   wesplit://view-split?splitId={splitId}&userId={userId}
   ```
   Or universal link:
   ```
   https://wesplit-deeplinks.web.app/view-split?splitId={splitId}&userId={userId}
   ```
5. **WeSplit app opens** and shows split details
6. **User completes payment** in WeSplit

### WeSplit → SPEND Flow

1. **Payment completes** in WeSplit
2. **WeSplit checks** for `callbackUrl` in split metadata
3. **If callback URL exists**:
   - Shows "Return to SPEND" button
   - Generates callback deep link (app-scheme):
     ```
     wesplit://spend-callback?callbackUrl={encodedUrl}&status=success
     ```
   - Or universal link (for web fallback):
     ```
     https://wesplit-deeplinks.web.app/spend-callback?callbackUrl={encodedUrl}&status=success
     ```
4. **User clicks "Return to SPEND"**
5. **WeSplit opens callback URL** (SPEND app or web)
   - If app-scheme: Opens directly in SPEND app
   - If universal link: Opens landing page which redirects to SPEND
6. **SPEND receives callback** and updates order status

---

## API Integration

### Creating Split with Callback

```javascript
const orderData = {
  email: "customer@example.com",
  amount: 100.00,
  currency: "USDC",
  metadata: {
    callbackUrl: "spend://order/ORD-123/success", // Required for return flow
    orderId: "ORD-123",
    webhookUrl: "https://your-webhook.com/wesplit",
    webhookSecret: "your_secret"
  }
};

const response = await createSplitInWeSplit(orderData);
const { splitId, userId } = response.data;

// Redirect to WeSplit
const deepLink = `wesplit://view-split?splitId=${splitId}&userId=${userId}`;
window.location.href = deepLink;
```

### Handling Return Callback

```javascript
// In SPEND app, handle callback URL
// Example: spend://order/ORD-123/success?splitId=split_123&status=success

function handleWeSplitCallback(url) {
  const urlObj = new URL(url);
  const params = new URLSearchParams(urlObj.search);
  
  const splitId = params.get('splitId');
  const status = params.get('status');
  const orderId = params.get('orderId');
  
  if (status === 'success') {
    updateOrderStatus(orderId, 'paid');
    showSuccessMessage('Payment completed via WeSplit!');
  }
}
```

---

## Testing

### Test Deep Links

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

2. **Test view-split link**:
```
wesplit://view-split?splitId=YOUR_SPLIT_ID&userId=YOUR_USER_ID
```

3. **Test callback link**:
```
wesplit://spend-callback?callbackUrl=spend://order/TEST-123/success&orderId=TEST-123&status=success
```

---

## Documentation

### For SPEND Team

- **Deep Link Flow Guide**: `docs/guides/SPEND_INTEGRATION/FOR_SPEND/DEEP_LINK_FLOW.md`
- **Quick Reference**: `docs/guides/SPEND_INTEGRATION/FOR_SPEND/SPEND_INTEGRATION_QUICK_REFERENCE.md`
- **API Reference**: `docs/guides/SPEND_INTEGRATION/FOR_SPEND/SPEND_API_REFERENCE.md`

### For WeSplit Team

- **Implementation Details**: This document
- **Website Setup Guide**: `docs/guides/SPEND_INTEGRATION/WEBSITE_DEEP_LINK_SETUP_COMPLETE.md` ⭐ NEW
- **Deep Link Handler**: `src/services/core/deepLinkHandler.ts`
- **Spend Integration**: `src/services/integrations/spend/`

### Website Configuration

- **Website URL**: `https://wesplit-deeplinks.web.app`
- **Firebase Hosting Target**: `deeplinks`
- **Deployment**: `firebase deploy --only hosting:deeplinks`
- **Landing Pages**: `/public/spend-callback/index.html` ⭐ NEW

---

## Key Features

✅ **Bidirectional Deep Links**
- SPEND → WeSplit: View and pay split
- WeSplit → SPEND: Return after payment

✅ **Automatic Redirect URLs**
- API endpoints include deep links in responses
- No manual URL construction needed

✅ **Universal Link Support**
- Works for users with app installed
- Falls back to web/app store for users without app

✅ **Error Handling**
- Graceful fallback if redirect fails
- Clear error messages for users

✅ **Callback URL Support**
- Flexible callback URL format (app-scheme or web)
- Optional order ID and status tracking

---

## Next Steps for SPEND Team

1. **Implement callback URL handling** in SPEND app
2. **Test deep link flow** end-to-end
3. **Configure callback URLs** in split creation requests
4. **Handle return callbacks** to update order status

---

## Support

- **Technical Questions**: vcharles@dappzy.io
- **Integration Issues**: Check documentation in `docs/guides/SPEND_INTEGRATION/`
- **API Issues**: See `SPEND_API_REFERENCE.md`

---

**Status**: ✅ **Ready for Integration**

All components are implemented, tested, and documented. SPEND team can now integrate deep links for seamless user experience.
