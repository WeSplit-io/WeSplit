# Integration Checklist for "spend"

Use this checklist to ensure you have everything needed to integrate with WeSplit.

## ✅ Pre-Integration Requirements

### Documentation
- [ ] Read `EXTERNAL_WEB_APP_TECHNICAL_INTEGRATION.md` completely
- [ ] Understand API authentication requirements
- [ ] Review all code examples
- [ ] Understand error handling and retry logic
- [ ] Review app redirection implementation

### Technical Requirements
- [ ] Server-side backend (Node.js, Python, PHP, etc.)
- [ ] HTTPS endpoint (required for production)
- [ ] Environment variable support (.env files)
- [ ] Ability to make HTTP POST requests
- [ ] Error logging system

### Data Requirements
- [ ] Access to user email addresses
- [ ] Access to Amazon order data
- [ ] Access to USDC payment amounts
- [ ] Ability to generate unique order IDs
- [ ] Access to product details (ASIN, URLs, etc.)

## ✅ Integration Steps

### Step 1: Get API Credentials
- [ ] Contact api-support@wesplit.com
- [ ] Provide company name: "spend"
- [ ] Provide contact email
- [ ] Provide expected request volume
- [ ] Receive API key
- [ ] Receive base URL (with actual PROJECT-ID)
- [ ] Receive test endpoint URL

### Step 2: Environment Setup
- [ ] Create `.env` file
- [ ] Add `WESPLIT_API_KEY` to `.env`
- [ ] Add `WESPLIT_API_URL` to `.env`
- [ ] Add `.env` to `.gitignore`
- [ ] Verify `.env` is not committed to version control
- [ ] Test environment variable loading

### Step 3: Implement Core Functions
- [ ] Create `validatePaymentData()` function
- [ ] Create `sanitizePaymentData()` function
- [ ] Create `createSplitInWeSplit()` function
- [ ] Implement retry logic with exponential backoff
- [ ] Add error handling
- [ ] Add logging

### Step 4: Implement App Redirection
- [ ] Create `buildWeSplitDeepLink()` function
- [ ] Create `redirectToWeSplitApp()` function
- [ ] Implement fallback for app not installed
- [ ] Test deep link on iOS
- [ ] Test deep link on Android
- [ ] Test fallback behavior

### Step 5: Integrate into Payment Flow
- [ ] Identify where to call WeSplit API (after payment success)
- [ ] Prepare order data structure
- [ ] Map Amazon order data to WeSplit format
- [ ] Call WeSplit API (async, don't block payment)
- [ ] Store WeSplit IDs (userId, splitId) in database
- [ ] Handle errors gracefully (don't fail payment)
- [ ] Redirect user to WeSplit app after success

### Step 6: Testing
- [ ] Test with test endpoint (no real data created)
- [ ] Test with valid Amazon order data
- [ ] Test error scenarios (invalid API key, validation errors)
- [ ] Test rate limiting behavior
- [ ] Test app redirection on iOS device
- [ ] Test app redirection on Android device
- [ ] Test fallback when app not installed
- [ ] Test with missing optional fields
- [ ] Test with all optional fields
- [ ] Verify split appears in WeSplit app

### Step 7: Production Deployment
- [ ] Deploy to staging environment
- [ ] Test in staging with real API key
- [ ] Monitor API responses
- [ ] Monitor error rates
- [ ] Set up alerts for API failures
- [ ] Deploy to production
- [ ] Monitor production metrics

## ✅ Data Mapping Checklist

Ensure you can provide:

### Required Fields
- [ ] `email` - User's email address
- [ ] `invoiceId` - Unique order ID (format: `AMZ-ORD-{orderId}`)
- [ ] `amount` - Total in USDC
- [ ] `currency` - "USDC"
- [ ] `merchant.name` - "Amazon"
- [ ] `transactionDate` - ISO 8601 format
- [ ] `source` - "spend-amazon"

### Recommended Fields
- [ ] `walletAddress` - User's USDC wallet address
- [ ] `invoiceNumber` - Human-readable order number
- [ ] `items[]` - Array of products with name, price, quantity, category
- [ ] `subtotal` - Subtotal in USDC
- [ ] `tax` - Tax amount (if applicable)
- [ ] `receiptNumber` - Receipt/order number
- [ ] `metadata` - Amazon-specific data:
  - [ ] `orderId`
  - [ ] `amazonOrderNumber`
  - [ ] `items[].asin`
  - [ ] `items[].productUrl`
  - [ ] `items[].seller`
  - [ ] `items[].imageUrl` (optional)
  - [ ] `shippingAddress` (optional)
  - [ ] `deliveryDate` (optional)

## ✅ Security Checklist

- [ ] API key stored in environment variables only
- [ ] `.env` file in `.gitignore`
- [ ] API key never exposed in client-side code
- [ ] All requests use HTTPS
- [ ] Input validation before sending to API
- [ ] Input sanitization implemented
- [ ] Error messages don't expose sensitive data
- [ ] Rate limiting respected (100 req/15min)

## ✅ Error Handling Checklist

- [ ] Handle 400 (Bad Request) errors
- [ ] Handle 401 (Unauthorized) errors
- [ ] Handle 429 (Rate Limited) errors
- [ ] Handle 500 (Server Error) errors
- [ ] Implement retry logic for 429 and 500
- [ ] Log all errors
- [ ] Don't fail payment if WeSplit integration fails
- [ ] Store failed integrations for retry later (optional)

## ✅ Monitoring Checklist

- [ ] Set up logging for API requests
- [ ] Set up logging for API responses
- [ ] Set up logging for errors
- [ ] Monitor API response times
- [ ] Monitor error rates
- [ ] Set up alerts for high error rates
- [ ] Track success rate of split creation
- [ ] Monitor rate limit usage

## ✅ Support Information

If you need help:
- **Email**: api-support@wesplit.com
- **Include in support request**:
  - Your API key (masked: `sk_...xxxx`)
  - Error message
  - Request data (sanitized, no sensitive info)
  - Response data (if available)
  - Steps to reproduce

---

**Once all items are checked, you're ready to integrate!**

**Last Updated**: 2024

