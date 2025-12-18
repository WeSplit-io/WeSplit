# SPEND Deep Link Integration - Complete Guide

**For SPEND Development Team** | **Last Updated**: 2025-01-27  
**Status**: ✅ Production Ready - Complete Integration Guide

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Security Overview](#security-overview)
3. [Deep Link Formats](#deep-link-formats)
4. [Integration Flow](#integration-flow)
5. [API Reference](#api-reference)
6. [Security Best Practices](#security-best-practices)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### 1. Get Your API Credentials

**API Key**:
```
wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg
```

**Base URL**:
```
https://us-central1-wesplit-35186.cloudfunctions.net
```

**Webhook Secret**:
```
whsec_C4VxSIq3TQdA_Aqxt7Ji44oAEvvplYsy
```

### 2. Create Split with Callback

```javascript
const response = await fetch('https://us-central1-wesplit-35186.cloudfunctions.net/createSplitFromPayment', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: "customer@example.com",
    amount: 100.00,
    currency: "USDC",
    metadata: {
      callbackUrl: "spend://order/ORD-123/success",  // ✅ Your callback URL
      orderId: "ORD-123",
      webhookUrl: "https://your-webhook.com/wesplit",
      webhookSecret: "your_secret"
    }
  })
});

const { splitId, userId } = (await response.json()).data;
```

### 3. Redirect User to WeSplit

```javascript
// Universal link (works for all users)
const deepLink = `https://wesplit-deeplinks.web.app/view-split?splitId=${splitId}&userId=${userId}`;
window.location.href = deepLink;
```

### 4. Handle Return from WeSplit

```javascript
// In your SPEND app, handle the callback URL
function handleWeSplitCallback(url) {
  const params = new URLSearchParams(new URL(url).search);
  const status = params.get('status'); // 'success', 'error', or 'cancelled'
  const orderId = params.get('orderId');
  
  if (status === 'success') {
    updateOrderStatus(orderId, 'paid');
  }
}
```

**That's it!** Your integration is complete.

---

## 🔒 Security Overview

### ✅ Security Features

- **URL Validation**: All callback URLs are validated
- **Protocol Blocking**: Dangerous protocols are blocked
- **Script Injection Prevention**: Script tags and event handlers are blocked
- **Secure Logging**: No sensitive data in logs
- **Input Validation**: All inputs are validated and sanitized

### 🔐 Security Requirements

**✅ Required:**
- Use safe protocols only (`spend://` or `https://`)
- Encode URLs properly
- Validate all inputs
- Handle errors securely

**❌ Never:**
- Use `javascript:`, `data:`, or other dangerous protocols
- Include sensitive data in URLs
- Expose error details to users
- Log sensitive data

**See**: `DEEP_LINK_SECURITY_GUIDE.md` for complete security details.

---

## 🔗 Deep Link Formats

### View Split (SPEND → WeSplit)

**Purpose**: Redirect users to view and pay their split

**App-Scheme**:
```
wesplit://view-split?splitId={splitId}&userId={userId}
```

**Universal Link** (Recommended):
```
https://wesplit-deeplinks.web.app/view-split?splitId={splitId}&userId={userId}
```

**Parameters**:
- `splitId` (required): Split ID from API response
- `userId` (optional): User ID of split creator

**Example**:
```javascript
const deepLink = `https://wesplit-deeplinks.web.app/view-split?splitId=split_123&userId=user_456`;
```

---

### Spend Callback (WeSplit → SPEND)

**Purpose**: Return users to SPEND app after payment

**App-Scheme**:
```
wesplit://spend-callback?callbackUrl={encodedUrl}&orderId={orderId}&status={status}
```

**Universal Link**:
```
https://wesplit-deeplinks.web.app/spend-callback?callbackUrl={encodedUrl}&orderId={orderId}&status={status}
```

**Parameters**:
- `callbackUrl` (required): URL to redirect back to SPEND (must be encoded)
- `orderId` (optional): SPEND order ID
- `status` (optional): `success`, `error`, or `cancelled`
- `message` (optional): Custom message

**Example**:
```javascript
// Your callback URL
const callbackUrl = 'spend://order/ORD-123/success';

// WeSplit generates this automatically when payment completes
// You just need to handle it in your app
```

---

## 🔄 Complete Integration Flow

### Step-by-Step Flow

```
1. User clicks "Pay with WeSplit" in SPEND
   ↓
2. SPEND calls /createSplitFromPayment with callbackUrl
   ↓
3. WeSplit API validates callbackUrl (security check)
   ↓
4. API returns splitId and userId
   ↓
5. SPEND redirects user to WeSplit
   URL: https://wesplit-deeplinks.web.app/view-split?splitId=...
   ↓
6. WeSplit app opens (or web page if app not installed)
   ↓
7. User completes payment in WeSplit
   ↓
8. WeSplit validates callbackUrl (security check)
   ↓
9. WeSplit redirects user back to SPEND
   URL: spend://order/ORD-123/success?splitId=...&status=success
   ↓
10. SPEND app receives callback and updates order status
```

---

## 📡 API Reference

### Create Split from Payment

**Endpoint**: `POST /createSplitFromPayment`

**Request**:
```json
{
  "email": "customer@example.com",
  "amount": 100.00,
  "currency": "USDC",
  "metadata": {
    "callbackUrl": "spend://order/ORD-123/success",
    "orderId": "ORD-123",
    "webhookUrl": "https://your-webhook.com/wesplit",
    "webhookSecret": "your_secret"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "splitId": "split_1234567890_abc",
    "userId": "user_abc123",
    "redirectUrl": "spend://order/ORD-123/success?splitId=..."
  }
}
```

**Security**: ✅ Callback URL is validated before storing

---

### Pay Participant Share

**Endpoint**: `POST /payParticipantShare`

**Response** (includes deep link if callback URL provided):
```json
{
  "success": true,
  "amountPaid": 33.33,
  "deepLink": "wesplit://spend-callback?callbackUrl=...&status=success",
  "redirectUrl": "spend://order/ORD-123/success"
}
```

---

## 🔐 Security Best Practices

### 1. Callback URL Security

**✅ DO:**
```javascript
// App-scheme (recommended)
const callbackUrl = 'spend://order/ORD-123/success';

// HTTPS (also safe)
const callbackUrl = 'https://spend.com/orders/ORD-123/success';
```

**❌ DON'T:**
```javascript
// Dangerous protocols (BLOCKED)
const callbackUrl = 'javascript:alert("xss")';  // ❌
const callbackUrl = 'data:text/html,<script>';   // ❌
```

### 2. URL Encoding

**Always encode URLs:**
```javascript
// ✅ Correct
const encoded = encodeURIComponent('spend://order/ORD-123/success');
// Result: spend%3A%2F%2Forder%2FORD-123%2Fsuccess

// ✅ Also correct (automatic encoding)
const params = new URLSearchParams({
  callbackUrl: 'spend://order/ORD-123/success'
});
```

### 3. Data Minimization

**Only include necessary data:**
```javascript
// ✅ Good: Only order ID
const callbackUrl = 'spend://order/ORD-123/success';

// ❌ Avoid: Sensitive data
const callbackUrl = 'spend://order/ORD-123?token=secret123';  // ❌
```

### 4. Error Handling

**Secure error handling:**
```javascript
// ✅ Good: Generic error
catch (error) {
  logger.error('Payment failed', { orderId });  // Server-side only
  showError('Payment failed. Please try again.');
}

// ❌ Avoid: Exposing details
catch (error) {
  showError(`Error: ${error.stack}`);  // ❌
}
```

---

## 🧪 Testing

### Test Deep Links

**1. Test View Split Link:**
```
https://wesplit-deeplinks.web.app/view-split?splitId=TEST_SPLIT_ID&userId=TEST_USER_ID
```

**2. Test Callback Link:**
```
https://wesplit-deeplinks.web.app/spend-callback?callbackUrl=spend%3A%2F%2Forder%2FTEST-123%2Fsuccess&orderId=TEST-123&status=success
```

**3. Test Malicious URLs (Should Be Blocked):**
```javascript
// These should all be rejected:
- javascript:alert("xss")
- data:text/html,<script>
- spend://order/123?x=<script>
```

### Test Complete Flow

```bash
# 1. Create test split
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

# 2. Use returned splitId to test view-split link
# 3. Complete payment in WeSplit
# 4. Verify callback is received in SPEND app
```

---

## 🔧 Troubleshooting

### Issue: Callback URL Not Working

**Check:**
1. ✅ URL is properly encoded
2. ✅ Uses safe protocol (`spend://` or `https://`)
3. ✅ No dangerous characters
4. ✅ URL is valid format

**Solution**: Validate URL before sending to WeSplit API

---

### Issue: Deep Link Not Opening App

**Check:**
1. ✅ Using universal link format
2. ✅ URL is correct
3. ✅ App is installed
4. ✅ Universal links configured

**Solution**: Use universal links (`https://wesplit-deeplinks.web.app/...`)

---

### Issue: Security Error

**Cause**: Invalid callback URL detected

**Solution**: 
- Use safe protocols only
- Remove any script tags or event handlers
- Validate URL before sending

---

## 📚 Additional Resources

- **Security Guide**: `DEEP_LINK_SECURITY_GUIDE.md`
- **API Reference**: `SPEND_API_REFERENCE.md`
- **Quick Reference**: `SPEND_INTEGRATION_QUICK_REFERENCE.md`
- **Deep Link Flow**: `DEEP_LINK_FLOW.md`

---

## ✅ Integration Checklist

### Setup
- [ ] API key obtained
- [ ] Webhook secret configured
- [ ] Callback URL format decided
- [ ] Error handling implemented

### Security
- [ ] Callback URLs use safe protocols
- [ ] URLs are properly encoded
- [ ] No sensitive data in URLs
- [ ] Input validation implemented
- [ ] Error handling is secure

### Testing
- [ ] Tested with valid URLs
- [ ] Tested with malicious URLs (all blocked)
- [ ] Tested complete flow end-to-end
- [ ] Tested error scenarios

### Production
- [ ] All security measures verified
- [ ] Monitoring configured
- [ ] Support contact information ready
- [ ] Documentation reviewed

---

## 📞 Support

**Technical Questions**: vcharles@dappzy.io  
**Security Issues**: vcharles@dappzy.io (Subject: `[SECURITY]`)  
**API Issues**: See `SPEND_API_REFERENCE.md`

---

## 🎯 Summary

**Status**: ✅ **PRODUCTION READY**

- ✅ All security measures implemented
- ✅ Deep links properly configured
- ✅ Complete documentation provided
- ✅ Testing guide included
- ✅ Troubleshooting guide included

**Next Steps**:
1. Review security guide
2. Test integration
3. Deploy to production

---

**Last Updated**: 2025-01-27  
**Version**: 1.0.0
