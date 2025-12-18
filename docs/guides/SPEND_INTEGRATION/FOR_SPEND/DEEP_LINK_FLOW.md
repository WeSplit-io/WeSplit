# SPEND Deep Link Integration Guide

**For SPEND Development Team** | **Last Updated**: 2025-01-27

This guide explains how to integrate deep links between SPEND and WeSplit for seamless user experience.

---

## Overview

Deep links allow users to seamlessly move between SPEND and WeSplit apps:
- **SPEND → WeSplit**: Redirect users to view/pay their split
- **WeSplit → SPEND**: Return users to SPEND after payment completion

---

## Deep Link Formats

### 1. View Split in WeSplit

**Purpose**: Redirect users from SPEND to WeSplit to view and pay their split.

**App-Scheme Format**:
```
wesplit://view-split?splitId={splitId}&userId={userId}
```

**Universal Link Format** (for web fallback):
```
https://wesplit.io/view-split?splitId={splitId}&userId={userId}
```

**Parameters**:
- `splitId` (required): The split ID returned from `/createSplitFromPayment` or `/batchInviteParticipants`
- `userId` (optional): The user ID of the split creator

**Example**:
```javascript
const deepLink = `wesplit://view-split?splitId=split_1234567890_abc&userId=user_abc123`;

// Or universal link (works for users without app)
const universalLink = `https://wesplit.io/view-split?splitId=split_1234567890_abc&userId=user_abc123`;
```

**Implementation**:
```javascript
// After creating split via API
const response = await createSplitInWeSplit(orderData);
const { splitId, userId } = response.data;

// Generate deep link
const deepLink = `wesplit://view-split?splitId=${splitId}&userId=${userId}`;

// Redirect user (with fallback to app store)
window.location.href = deepLink;

// Fallback: If app not installed, redirect to app store
setTimeout(() => {
  if (document.hasFocus()) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      window.location.href = 'https://apps.apple.com/app/wesplit';
    } else if (isAndroid) {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.wesplit.app';
    }
  }
}, 2000);
```

---

### 2. Return to SPEND After Payment

**Purpose**: Return users from WeSplit back to SPEND app after payment completion.

**App-Scheme Format**:
```
wesplit://spend-callback?callbackUrl={encodedUrl}&orderId={orderId}&status={status}&message={message}
```

**Universal Link Format**:
```
https://wesplit-deeplinks.web.app/spend-callback?callbackUrl={encodedUrl}&orderId={orderId}&status={status}&message={message}
```

**Parameters**:
- `callbackUrl` (required): URL to redirect back to SPEND app (can be app-scheme like `spend://order/123` or web URL)
- `orderId` (optional): SPEND order ID for tracking
- `status` (optional): `success`, `error`, or `cancelled` (default: `success`)
- `message` (optional): Message to display to user

**Example**:
```javascript
// When creating split, include callback URL in metadata
const orderData = {
  // ... other order data
  metadata: {
    callbackUrl: 'spend://order/ORD-123/success', // Your app-scheme URL
    orderId: 'ORD-123',
    webhookUrl: 'https://your-webhook.com/wesplit',
    webhookSecret: 'your_secret'
  }
};

// WeSplit will automatically redirect users back using this callback URL
```

**How It Works**:
1. When creating a split via `/createSplitFromPayment`, include `callbackUrl` in `metadata.callbackUrl`
2. After payment completion in WeSplit, users will see an option to "Return to SPEND"
3. Clicking this option opens the callback URL (your SPEND app or web page)

---

## Complete Integration Flow

### Step 1: Create Split with Callback URL

```javascript
const orderData = {
  email: "customer@example.com",
  amount: 100.00,
  currency: "USDC",
  // ... other required fields
  metadata: {
    // Include callback URL for redirect after payment
    callbackUrl: "spend://order/ORD-123/success", // Your app-scheme
    orderId: "ORD-123",
    webhookUrl: "https://your-webhook.com/wesplit",
    webhookSecret: "your_webhook_secret"
  }
};

const response = await fetch('https://us-central1-wesplit-35186.cloudfunctions.net/createSplitFromPayment', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(orderData)
});

const result = await response.json();
const { splitId, userId } = result.data;
```

### Step 2: Redirect User to WeSplit

```javascript
// Generate deep link
const deepLink = `wesplit://view-split?splitId=${splitId}&userId=${userId}`;

// Redirect user
window.location.href = deepLink;

// Fallback to app store if app not installed
setTimeout(() => {
  if (document.hasFocus()) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      window.location.href = 'https://apps.apple.com/app/wesplit';
    } else if (isAndroid) {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.wesplit.app';
    }
  }
}, 2000);
```

### Step 3: Handle Return from WeSplit

When users complete payment in WeSplit, they'll be redirected back using your `callbackUrl`:

```javascript
// In your SPEND app, handle the callback URL
// Example: spend://order/ORD-123/success?splitId=split_123&status=success

function handleWeSplitCallback(url) {
  const urlObj = new URL(url);
  const params = new URLSearchParams(urlObj.search);
  
  const splitId = params.get('splitId');
  const status = params.get('status'); // 'success', 'error', or 'cancelled'
  const orderId = params.get('orderId');
  
  if (status === 'success') {
    // Payment completed successfully
    // Update order status, show success message, etc.
    updateOrderStatus(orderId, 'paid');
    showSuccessMessage('Payment completed via WeSplit!');
  } else if (status === 'error') {
    // Payment failed
    showErrorMessage('Payment failed. Please try again.');
  } else if (status === 'cancelled') {
    // User cancelled
    showInfoMessage('Payment cancelled.');
  }
}
```

---

## API Response Deep Links

Some API endpoints automatically include deep links in their responses:

### `/payParticipantShare` Response

```json
{
  "success": true,
  "transactionSignature": "5j7s8K9...",
  "amountPaid": 33.33,
  "remainingAmount": 0,
  "splitStatus": "active",
  "isFullyFunded": false,
  "deepLink": "wesplit://spend-callback?callbackUrl=...&status=success",
  "redirectUrl": "spend://order/ORD-123/success"
}
```

### `/batchInviteParticipants` Response

```json
{
  "success": true,
  "results": { ... },
  "deepLink": "wesplit://view-split?splitId=split_123&userId=user_456",
  "redirectUrl": "spend://order/ORD-123/success"
}
```

---

## Best Practices

### 1. Always Provide Callback URLs

Include `callbackUrl` in split metadata to enable seamless return flow:
```javascript
metadata: {
  callbackUrl: "spend://order/{orderId}/success", // Required for return flow
  orderId: "ORD-123",
  // ... other metadata
}
```

### 2. Use Universal Links as Fallback

Universal links (`https://wesplit.io/...`) work for:
- Users with WeSplit app installed (opens directly in app)
- Users without app (shows web page with app store links)

### 3. Handle App Not Installed

Always provide fallback to app store:
```javascript
setTimeout(() => {
  if (document.hasFocus()) {
    // App didn't open, redirect to app store
    redirectToAppStore();
  }
}, 2000);
```

### 4. Test Deep Links

Test both scenarios:
- **With app installed**: Deep link should open WeSplit directly
- **Without app**: Should show web page or redirect to app store

---

## Error Handling

### Invalid Deep Link

If a deep link is invalid or malformed:
- WeSplit will show an error alert
- User stays in WeSplit app
- No redirect occurs

### Callback URL Fails

If callback URL cannot be opened:
- WeSplit shows error message
- User can manually return to SPEND
- Payment is still processed (on-chain)

---

## Testing

### Test Deep Links

1. **Create test split**:
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

## Support

- **Technical Questions**: vcharles@dappzy.io
- **Deep Link Issues**: Check that URLs are properly encoded
- **Integration Help**: See `SPEND_INTEGRATION_QUICK_REFERENCE.md`

---

**Last Updated**: 2025-01-27
