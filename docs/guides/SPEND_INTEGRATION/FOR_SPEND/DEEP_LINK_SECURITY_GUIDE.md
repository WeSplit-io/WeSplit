# SPEND Deep Link Security & Integration Guide

**For SPEND Development Team** | **Last Updated**: 2025-01-27  
**Status**: ✅ Production Ready - Security Hardened

---

## 🔒 Security Overview

This guide ensures secure deep link integration between SPEND and WeSplit. All security measures are implemented and tested.

---

## ✅ Security Features Implemented

### 1. **URL Validation**
- ✅ Callback URLs are validated before use
- ✅ Dangerous protocols are blocked (`javascript:`, `data:`, `vbscript:`, etc.)
- ✅ Script injection patterns are detected and rejected
- ✅ Only safe protocols allowed: `http://`, `https://`, `spend://` (app-scheme)

### 2. **Data Protection**
- ✅ Sensitive data (callback URLs) are not logged in production
- ✅ URL encoding/decoding is handled securely
- ✅ No sensitive data exposed in error messages
- ✅ Proper error handling prevents information leakage

### 3. **Input Sanitization**
- ✅ All URL parameters are validated and sanitized
- ✅ Status values are whitelisted (`success`, `error`, `cancelled`)
- ✅ Order IDs are validated for format
- ✅ Messages are sanitized before display

---

## 🔐 Security Best Practices for SPEND Team

### 1. **Callback URL Security**

**✅ DO:**
```javascript
// Use app-scheme URLs (recommended)
const callbackUrl = 'spend://order/ORD-123/success';

// Or HTTPS URLs (also safe)
const callbackUrl = 'https://spend.com/orders/ORD-123/success';
```

**❌ DON'T:**
```javascript
// Never use dangerous protocols
const callbackUrl = 'javascript:alert("xss")';  // ❌ BLOCKED
const callbackUrl = 'data:text/html,<script>';   // ❌ BLOCKED
const callbackUrl = 'file:///etc/passwd';       // ❌ BLOCKED
```

### 2. **URL Encoding**

**Always encode callback URLs when passing to WeSplit:**

```javascript
// ✅ Correct: URL is properly encoded
const callbackUrl = 'spend://order/ORD-123/success';
const encoded = encodeURIComponent(callbackUrl);
// Result: spend%3A%2F%2Forder%2FORD-123%2Fsuccess

// ✅ Correct: Using URLSearchParams (automatic encoding)
const params = new URLSearchParams({
  callbackUrl: 'spend://order/ORD-123/success'
});
```

### 3. **Data in URLs**

**Minimize sensitive data in URLs:**

```javascript
// ✅ Good: Only order ID (non-sensitive)
const callbackUrl = 'spend://order/ORD-123/success';

// ❌ Avoid: Sensitive data in URL
const callbackUrl = 'spend://order/ORD-123?token=secret123';  // ❌ Token exposed
```

### 4. **Error Handling**

**Handle errors securely:**

```javascript
// ✅ Good: Generic error message
catch (error) {
  logger.error('Payment failed', { orderId }); // Don't log sensitive data
  showError('Payment failed. Please try again.');
}

// ❌ Avoid: Exposing internal details
catch (error) {
  showError(`Error: ${error.stack}`);  // ❌ Exposes internal details
}
```

---

## 🔄 Complete Integration Flow (Secure)

### Step 1: Create Split with Secure Callback

```javascript
const orderData = {
  email: "customer@example.com",
  amount: 100.00,
  currency: "USDC",
  metadata: {
    // ✅ Secure callback URL (app-scheme or HTTPS)
    callbackUrl: "spend://order/ORD-123/success",
    orderId: "ORD-123",
    webhookUrl: "https://your-webhook.com/wesplit",
    webhookSecret: "your_webhook_secret"
  }
};

const response = await createSplitInWeSplit(orderData);
```

**Security Checks:**
- ✅ Callback URL is validated on backend
- ✅ Dangerous protocols are rejected
- ✅ Script injection patterns are blocked

### Step 2: Redirect to WeSplit

```javascript
const { splitId, userId } = response.data;

// ✅ Use universal link (secure, works for all users)
const deepLink = `https://wesplit-deeplinks.web.app/view-split?splitId=${splitId}&userId=${userId}`;

// Or app-scheme (if you know user has app)
const appSchemeLink = `wesplit://view-split?splitId=${splitId}&userId=${userId}`;

// Redirect user
window.location.href = deepLink;
```

**Security:**
- ✅ URLs are properly encoded
- ✅ No sensitive data in URL
- ✅ Universal links are validated

### Step 3: Handle Return from WeSplit

```javascript
// In SPEND app, handle callback URL securely
function handleWeSplitCallback(url) {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    // ✅ Validate parameters
    const splitId = params.get('splitId');
    const status = params.get('status');
    const orderId = params.get('orderId');
    
    // ✅ Validate status value
    const validStatuses = ['success', 'error', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    // ✅ Update order status securely
    if (status === 'success') {
      updateOrderStatus(orderId, 'paid');
      showSuccessMessage('Payment completed via WeSplit!');
    } else {
      handlePaymentError(status, orderId);
    }
  } catch (error) {
    // ✅ Secure error handling
    logger.error('Callback handling failed', { error: error.message });
    showError('Unable to process callback. Please check order status manually.');
  }
}
```

---

## 🛡️ Security Checklist

### For SPEND Team

- [ ] **Callback URLs use safe protocols only**
  - ✅ `spend://` (app-scheme)
  - ✅ `https://` (web URL)
  - ❌ Never `javascript:`, `data:`, etc.

- [ ] **URLs are properly encoded**
  - ✅ Use `encodeURIComponent()` or `URLSearchParams`
  - ✅ Test with special characters

- [ ] **No sensitive data in URLs**
  - ✅ Only use order IDs, status codes
  - ❌ Never include tokens, secrets, passwords

- [ ] **Error handling is secure**
  - ✅ Generic error messages for users
  - ✅ Detailed logs (server-side only)
  - ❌ Never expose stack traces to users

- [ ] **Input validation**
  - ✅ Validate all parameters from WeSplit
  - ✅ Whitelist allowed status values
  - ✅ Sanitize user-facing messages

---

## 🔍 Security Testing

### Test Malicious URLs (Should Be Blocked)

```javascript
// These should all be rejected by WeSplit:

// ❌ JavaScript injection
const malicious1 = 'javascript:alert("xss")';

// ❌ Data URL with script
const malicious2 = 'data:text/html,<script>alert("xss")</script>';

// ❌ Script tags
const malicious3 = 'spend://order/123?x=<script>alert("xss")</script>';

// ❌ Event handlers
const malicious4 = 'spend://order/123?x=test"onclick="alert(1)';
```

### Test Valid URLs (Should Work)

```javascript
// ✅ These should all work:

// App-scheme
const valid1 = 'spend://order/ORD-123/success';

// HTTPS
const valid2 = 'https://spend.com/orders/ORD-123/success';

// With query parameters
const valid3 = 'spend://order/ORD-123/success?ref=app';
```

---

## 📋 Deep Link Formats (Secure)

### View Split

**App-Scheme:**
```
wesplit://view-split?splitId={splitId}&userId={userId}
```

**Universal Link:**
```
https://wesplit-deeplinks.web.app/view-split?splitId={splitId}&userId={userId}
```

**Security:**
- ✅ `splitId` and `userId` are validated
- ✅ No sensitive data exposed
- ✅ URLs are properly encoded

### Spend Callback

**App-Scheme:**
```
wesplit://spend-callback?callbackUrl={encodedUrl}&orderId={orderId}&status={status}
```

**Universal Link:**
```
https://wesplit-deeplinks.web.app/spend-callback?callbackUrl={encodedUrl}&orderId={orderId}&status={status}
```

**Security:**
- ✅ `callbackUrl` is validated and sanitized
- ✅ `status` is whitelisted
- ✅ `orderId` is validated
- ✅ All parameters are URL-encoded

---

## 🚨 Security Incidents

### If You Suspect a Security Issue

1. **Immediately revoke API key** if compromised
2. **Contact**: vcharles@dappzy.io
3. **Do NOT** log sensitive details
4. **Do NOT** expose error details to users

### Reporting Security Issues

- **Email**: vcharles@dappzy.io
- **Subject**: `[SECURITY] SPEND Integration Issue`
- **Include**: 
  - Description of issue
  - Steps to reproduce (if applicable)
  - Order ID (if related to specific order)
  - **Do NOT** include sensitive data in email

---

## ✅ Production Checklist

Before going live, verify:

- [ ] All callback URLs use safe protocols
- [ ] URLs are properly encoded
- [ ] No sensitive data in URLs
- [ ] Error handling is secure
- [ ] Input validation is implemented
- [ ] Logging doesn't expose sensitive data
- [ ] Webhook signatures are verified
- [ ] API keys are stored securely

---

## 📚 Additional Resources

- **API Reference**: `SPEND_API_REFERENCE.md`
- **Deep Link Flow**: `DEEP_LINK_FLOW.md`
- **Integration Guide**: `SPEND_INTEGRATION_QUICK_REFERENCE.md`

---

## 🔐 Security Summary

**✅ Implemented:**
- URL validation and sanitization
- Protocol whitelisting
- Script injection prevention
- Secure logging (no sensitive data)
- Input validation
- Error handling

**✅ For SPEND Team:**
- Use safe protocols only
- Encode URLs properly
- Don't include sensitive data
- Validate all inputs
- Handle errors securely

---

**Status**: ✅ **Security Hardened & Production Ready**

All security measures are implemented and tested. Follow this guide for secure integration.
