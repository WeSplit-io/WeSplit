# SPEND Integration Production Readiness Checklist

## Overview
This checklist ensures the SPEND integration is ready for production deployment and can handle real SP3ND webhook data securely and reliably.

## ✅ Completed Items

### Code Quality & Security
- [x] Removed duplicate code (`removeUndefinedValues`)
- [x] Added comprehensive SP3ND order validation
- [x] Secured sensitive data (no logging of webhook secrets, wallets, emails)
- [x] Enhanced webhook payload validation
- [x] Centralized orderId extraction logic
- [x] Added timestamp parsing utility (supports all SP3ND formats)
- [x] Improved error handling throughout data flow

### Data Flow
- [x] Backend handles SP3ND order data in multiple formats
- [x] Frontend extracts order data correctly
- [x] Webhook payload matches SP3ND expected format
- [x] Payment flow integrated with merchant gateway mode

---

## 🔴 Critical Production Requirements

### 1. API Key Management
**Status**: ⚠️ Needs Production Setup

**Current State**:
- API keys stored in Firestore `apiKeys` collection (good)
- Fallback to `process.env.ALLOWED_API_KEYS` for development (acceptable)

**Required Actions**:
- [ ] **Create production API key in Firestore**:
  ```javascript
  // Firestore: apiKeys collection
  {
    key: "spend_production_key_here",
    source: "spend",
    active: true,
    permissions: ["create_split"],
    createdAt: Timestamp,
    expiresAt: null // or set expiration date
  }
  ```
- [ ] **Remove or secure `ALLOWED_API_KEYS` env var** (only for development)
- [ ] **Set up API key rotation policy** (if needed)
- [ ] **Document API key management process** for SP3ND team

**Files to Update**:
- `services/firebase-functions/src/externalPaymentIntegration.js` (already supports Firestore)

---

### 2. Environment Configuration
**Status**: ⚠️ Needs Verification

**Required Actions**:
- [ ] **Verify Firebase Functions environment variables**:
  - [ ] `FUNCTIONS_EMULATOR` is NOT set in production
  - [ ] Production project ID is configured
  - [ ] Firebase Admin SDK initialized correctly
- [ ] **Set up production Firebase project**:
  - [ ] Deploy functions to production
  - [ ] Configure CORS for SP3ND domain
  - [ ] Set up Firestore security rules for `apiKeys` collection
- [ ] **Verify rate limiting**:
  - [ ] Current: 100 requests per 15 minutes per API key
  - [ ] Adjust if needed for SP3ND's expected volume
  - [ ] Consider Redis/Firestore for distributed rate limiting

**Files to Review**:
- `services/firebase-functions/src/externalPaymentIntegration.js` (rate limiting)
- `firebase.json` (deployment config)

---

### 3. Treasury Wallet Configuration
**Status**: ✅ Configured

**Current State**:
- Production treasury wallet: `2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp`
- Stored in `SPEND_CONFIG` constant

**Required Actions**:
- [ ] **Verify treasury wallet address with SP3ND team** (confirm it's correct)
- [ ] **Test payment to treasury wallet** in staging environment
- [ ] **Verify memo format** matches SP3ND expectations: `"SP3ND Order: {orderId}"`

**Files**:
- `src/services/integrations/spend/SpendTypes.ts` (SPEND_CONFIG)

---

### 4. Webhook Configuration
**Status**: ⚠️ Needs SP3ND Setup

**Current State**:
- Webhook retry logic implemented (3 attempts with exponential backoff)
- Webhook payload validation added
- Webhook failures don't block payment (correct behavior)

**Required Actions**:
- [ ] **Get production webhook URL from SP3ND team**
- [ ] **Get production webhook secret from SP3ND team**
- [ ] **Test webhook endpoint** with SP3ND team:
  - [ ] Verify authentication (Bearer token)
  - [ ] Verify payload format matches their expectations
  - [ ] Test retry logic with temporary failures
- [ ] **Set up webhook monitoring**:
  - [ ] Log all webhook calls (without sensitive data)
  - [ ] Alert on repeated webhook failures
  - [ ] Track webhook success rate

**Files**:
- `src/services/integrations/spend/SpendWebhookService.ts`

---

### 5. Error Monitoring & Logging
**Status**: ⚠️ Needs Production Setup

**Current State**:
- Uses `logger` service for logging
- Sensitive data excluded from logs

**Required Actions**:
- [ ] **Set up production error monitoring**:
  - [ ] Configure Sentry or similar service
  - [ ] Set up alerts for critical errors
  - [ ] Monitor webhook failures
  - [ ] Track payment processing errors
- [ ] **Set up logging aggregation**:
  - [ ] Firebase Functions logs (Cloud Logging)
  - [ ] Frontend error tracking
  - [ ] Webhook call logs
- [ ] **Create error dashboard**:
  - [ ] Track error rates
  - [ ] Monitor payment success rates
  - [ ] Track webhook success rates

**Files to Review**:
- `src/services/analytics/loggingService.ts`
- `services/firebase-functions/src/externalPaymentIntegration.js` (error handling)

---

### 6. Testing & Validation
**Status**: ⚠️ Needs Production Testing

**Required Actions**:
- [ ] **End-to-end testing with SP3ND**:
  - [ ] Test split creation with real SP3ND order data
  - [ ] Test payment flow (user → split wallet → treasury wallet)
  - [ ] Test webhook notification
  - [ ] Test error scenarios (invalid data, network failures)
- [ ] **Load testing**:
  - [ ] Test with expected production volume
  - [ ] Verify rate limiting works correctly
  - [ ] Test concurrent split creation
- [ ] **Security testing**:
  - [ ] Test API key validation
  - [ ] Test input sanitization
  - [ ] Test XSS/injection prevention
  - [ ] Verify sensitive data is never logged

**Test Scenarios**:
1. Valid SP3ND order → Split created successfully
2. Invalid order data → Proper error returned
3. Missing required fields → Validation error
4. Duplicate order ID → Handled correctly
5. Payment threshold met → Automatic payment triggered
6. Webhook failure → Payment still succeeds, webhook retried

---

### 7. Documentation
**Status**: ⚠️ Needs Final Review

**Required Actions**:
- [ ] **Review all SPEND integration documentation**:
  - [ ] `SP3ND_ORDER_SCHEMA.md` - Up to date
  - [ ] `SPEND_DATA_FLOW.md` - Accurate
  - [ ] `SPEND_SCREENS_SPECIFICATION.md` - Complete
- [ ] **Create production deployment guide**:
  - [ ] Step-by-step deployment instructions
  - [ ] Environment variable setup
  - [ ] API key configuration
  - [ ] Webhook configuration
- [ ] **Create runbook for operations**:
  - [ ] How to monitor SPEND integration
  - [ ] How to troubleshoot common issues
  - [ ] How to handle webhook failures
  - [ ] How to handle payment failures

**Files to Create/Update**:
- `docs/guides/SPEND_INTEGRATION/PRODUCTION_DEPLOYMENT.md` (NEW)
- `docs/guides/SPEND_INTEGRATION/OPERATIONS_RUNBOOK.md` (NEW)

---

### 8. Data Validation & Edge Cases
**Status**: ✅ Mostly Complete

**Current State**:
- SP3ND order validation added
- Timestamp parsing supports all formats
- Input sanitization implemented

**Required Actions**:
- [ ] **Test edge cases**:
  - [ ] Very large order amounts
  - [ ] Orders with many items (100+)
  - [ ] Orders with missing optional fields
  - [ ] Orders with invalid timestamps
  - [ ] Orders with special characters in strings
- [ ] **Verify data integrity**:
  - [ ] All SP3ND order fields preserved correctly
  - [ ] No data loss during transformation
  - [ ] Timestamps converted correctly

---

### 9. Performance Optimization
**Status**: ⚠️ Needs Review

**Required Actions**:
- [ ] **Review Firebase Functions performance**:
  - [ ] Function timeout settings (default: 60s)
  - [ ] Memory allocation
  - [ ] Cold start optimization
- [ ] **Optimize Firestore queries**:
  - [ ] Add indexes if needed
  - [ ] Review query patterns
  - [ ] Optimize for expected load
- [ ] **Frontend performance**:
  - [ ] Verify data extraction is efficient
  - [ ] Check component rendering performance
  - [ ] Optimize image loading for order items

---

### 10. Security Audit
**Status**: ⚠️ Recommended

**Required Actions**:
- [ ] **Security review**:
  - [ ] API key storage and validation
  - [ ] Input sanitization
  - [ ] XSS prevention
  - [ ] SQL injection prevention (N/A - using Firestore)
  - [ ] Rate limiting effectiveness
- [ ] **Access control**:
  - [ ] Firestore security rules for `apiKeys` collection
  - [ ] Verify only authorized services can access webhook secrets
- [ ] **Data privacy**:
  - [ ] Verify customer emails are handled securely
  - [ ] Verify wallet addresses are not exposed unnecessarily
  - [ ] Verify webhook secrets are never logged

---

## 📋 Pre-Production Checklist

Before going to production, ensure:

- [ ] All code changes reviewed and approved
- [ ] All tests passing
- [ ] Documentation complete
- [ ] API keys configured in Firestore
- [ ] Webhook URL and secret obtained from SP3ND
- [ ] Treasury wallet address verified
- [ ] Error monitoring set up
- [ ] Logging configured
- [ ] Rate limiting tested
- [ ] End-to-end testing completed with SP3ND
- [ ] Security review completed
- [ ] Performance testing completed
- [ ] Rollback plan prepared

---

## 🚀 Deployment Steps

1. **Deploy Firebase Functions**:
   ```bash
   cd services/firebase-functions
   firebase deploy --only functions:createSplitFromPayment
   ```

2. **Verify Deployment**:
   - Check Firebase Console for function status
   - Test endpoint with valid API key
   - Verify logs are working

3. **Configure Production API Key**:
   - Create API key in Firestore
   - Share with SP3ND team securely

4. **Share Endpoint with SP3ND**:
   - Provide production endpoint URL
   - Provide API key (securely)
   - Provide webhook configuration details

5. **Monitor Initial Requests**:
   - Watch Firebase Functions logs
   - Monitor error rates
   - Verify webhook calls are working

---

## 📞 Support & Escalation

**For Issues**:
1. Check Firebase Functions logs
2. Check error monitoring dashboard
3. Review webhook call logs
4. Contact SP3ND team if webhook issues
5. Escalate to development team if needed

**Key Contacts**:
- SP3ND Team: [Contact information]
- WeSplit API Support: api-support@wesplit.com
- Development Team: [Contact information]

---

## Notes

- All sensitive data (webhook secrets, API keys, wallet addresses) should NEVER be logged
- Webhook failures should not block payments (payment is on-chain)
- Rate limiting is per API key per IP address
- All SP3ND order data is preserved in `externalMetadata.orderData`
- Timestamp parsing supports all formats from SP3ND schema

