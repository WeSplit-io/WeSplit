# SPEND Integration Testing Guide

Complete guide for testing both directions of the SPEND integration.

## Overview

The SPEND integration has two main flows:
1. **SPEND → WeSplit**: SPEND creates a split via API
2. **WeSplit → SPEND**: WeSplit automatically pays SPEND when threshold is met

## Prerequisites

1. **Firebase Functions Emulator** running locally
2. **Expo app** running in development mode
3. **Test API key** for authentication
4. **Mock data** ready for testing

## Setup

### 1. Start Firebase Functions Emulator

**Terminal 1:**
```bash
cd services/firebase-functions
npm run serve
# or
npm run dev
```

The emulator will start on `http://localhost:5001`

### 2. Start Expo App

**Terminal 2:**
```bash
npm start
# or
expo start
```

### 3. Get Your API Key

You'll need an API key to authenticate requests. Check your Firebase project settings or use a test key.

## Testing Direction 1: SPEND → WeSplit

### Test 1: Create Split with SPEND Metadata

Use the test script or curl directly:

#### Option A: Using the Test Script

```bash
# Set environment variables
export FIREBASE_PROJECT_ID=wesplit-35186
export FIREBASE_REGION=us-central1
export FIREBASE_API_KEY=your-api-key-here
export FUNCTIONS_EMULATOR=true

# Run the test script
./scripts/test-spend-integration.sh
```

#### Option B: Using curl Directly

```bash
curl -X POST \
  "http://localhost:5001/wesplit-35186/us-central1/createSplitFromPayment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-here" \
  -d '{
    "email": "test@example.com",
    "invoiceId": "SPEND_TEST_INVOICE_001",
    "amount": 100.0,
    "currency": "USD",
    "merchant": {
      "name": "SPEND Test Merchant",
      "address": "123 Test St",
      "phone": "+1234567890"
    },
    "transactionDate": "2024-01-15T10:00:00Z",
    "source": "spend",
    "metadata": {
      "orderId": "SPEND_TEST_ORDER_001",
      "treasuryWallet": "2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp",
      "webhookUrl": "http://localhost:5001/wesplit-35186/us-central1/mockSpendWebhook",
      "webhookSecret": "mock_webhook_secret_for_testing",
      "paymentThreshold": 1.0,
      "paymentTimeout": 7
    }
  }'
```

#### Expected Response

```json
{
  "success": true,
  "split": {
    "id": "split_1234567890_abc",
    "billId": "bill_1234567890",
    "title": "Invoice SPEND_TEST_INVOICE_001",
    "splitType": "spend",
    "externalMetadata": {
      "paymentMode": "merchant_gateway",
      "treasuryWallet": "2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp",
      "orderId": "SPEND_TEST_ORDER_001",
      "webhookUrl": "http://localhost:5001/wesplit-35186/us-central1/mockSpendWebhook",
      "paymentThreshold": 1.0,
      "paymentStatus": "pending"
    }
  }
}
```

#### Verify in App

1. Open the WeSplit app
2. Navigate to "Splits" tab
3. You should see the new SPEND split with:
   - SPEND badge indicator
   - Order ID displayed
   - Payment status showing "Pending"

### Test 2: Create Personal Split (Backward Compatibility)

Test that splits without SPEND metadata still work:

```bash
curl -X POST \
  "http://localhost:5001/wesplit-35186/us-central1/createSplitFromPayment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-here" \
  -d '{
    "email": "test@example.com",
    "invoiceId": "PERSONAL_TEST_INVOICE_001",
    "amount": 50.0,
    "currency": "USD",
    "merchant": {
      "name": "Personal Test Merchant"
    },
    "transactionDate": "2024-01-15T10:00:00Z",
    "source": "manual"
  }'
```

**Expected**: Split created with `splitType: "fair"` (not "spend")

## Testing Direction 2: WeSplit → SPEND

### Test 3: Automatic Payment When Threshold Met

This test requires the full flow:

1. **Create a SPEND split** (use Test 1)
2. **Open the split in the app**
3. **Navigate to SpendSplitScreen** (should auto-route)
4. **Add participants and create wallet**
5. **Make payments until threshold is met**
6. **Verify automatic payment triggers**

#### Step-by-Step:

1. **Create Split via API** (see Test 1)

2. **Open Split in App**:
   - Find the split in SplitsList
   - Tap to open
   - Should route to `SpendSplitScreen` (not FairSplitScreen)

3. **Verify SPEND UI**:
   - Should see SPEND badge
   - Should see payment status component
   - Should NOT see withdraw button (merchant gateway mode)

4. **Create Wallet** (if not already created):
   - Tap "Split" button
   - Select participants
   - Create wallet

5. **Make Payments**:
   - Participants pay their shares
   - Monitor payment progress

6. **Trigger Automatic Payment**:
   - When total paid >= threshold (default 100%)
   - Should automatically:
     - Show "Processing Payment to SPEND" alert
     - Send payment to treasury wallet
     - Call webhook
     - Update payment status to "paid"

#### Verify Payment:

Check the logs for:
```
[INFO] SPEND merchant payment threshold met, processing automatic payment
[INFO] Sending payment to SPEND treasury
[INFO] SPEND merchant payment processed successfully
[INFO] SPEND webhook called successfully
```

### Test 4: Mock Webhook Endpoint

Test the mock webhook endpoint:

```bash
curl -X POST \
  "http://localhost:5001/wesplit-35186/us-central1/mockSpendWebhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock_webhook_secret_for_testing" \
  -d '{
    "order_id": "SPEND_TEST_ORDER_001",
    "split_id": "split_test_123",
    "transaction_signature": "5KJpTestSignature1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "amount": 100.0,
    "currency": "USDC",
    "participants": [
      "TestWallet12345678901234567890123456789012"
    ],
    "status": "completed",
    "timestamp": "2024-01-15T10:00:00Z"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "order_id": "SPEND_TEST_ORDER_001",
  "status": "Funded",
  "message": "Payment received and order updated (mock response)"
}
```

## Frontend Testing

### Test 5: SPEND Split Screen Navigation

1. **Create SPEND split** via API
2. **Open app** → Splits tab
3. **Tap SPEND split**
4. **Verify**:
   - Routes to `SpendSplitScreen` (not FairSplitScreen)
   - Shows SPEND badge in header
   - Shows payment status component
   - Shows order ID

### Test 6: Payment Status Component

1. **Open SPEND split**
2. **Check payment status**:
   - **Pending**: Before threshold met
   - **Processing**: During payment
   - **Paid**: After successful payment
   - **Failed**: If payment fails (with retry button)

3. **Test retry** (if failed):
   - Tap "Retry Payment" button
   - Should attempt payment again

### Test 7: Transaction Explorer Link

1. **After payment succeeds**
2. **Tap "View Transaction"** link
3. **Verify**: Opens Solana explorer with transaction signature

## Integration Testing Checklist

### ✅ Direction 1: SPEND → WeSplit

- [ ] API accepts SPEND metadata
- [ ] Split created with `splitType: "spend"`
- [ ] `externalMetadata` stored correctly
- [ ] `paymentMode` set to `"merchant_gateway"`
- [ ] Validation works (treasuryWallet required with orderId)
- [ ] Backward compatibility (personal splits still work)

### ✅ Direction 2: WeSplit → SPEND

- [ ] Routes to SpendSplitScreen (not FairSplitScreen)
- [ ] Payment threshold detection works
- [ ] Automatic payment triggers when threshold met
- [ ] Payment sent to treasury wallet with correct memo
- [ ] Webhook called with correct payload
- [ ] Payment status updates correctly
- [ ] Idempotency prevents duplicate payments
- [ ] Error handling works (retry on failure)

### ✅ UI Components

- [ ] SPEND badge displays correctly
- [ ] Payment status component shows correct state
- [ ] Transaction explorer link works
- [ ] Retry button appears on failure
- [ ] No withdraw button for SPEND splits

## Debugging

### Check Logs

**Firebase Functions Emulator:**
```bash
# Watch emulator logs
cd services/firebase-functions
npm run serve
# Look for function calls and errors
```

**Expo App:**
- Check Metro bundler logs
- Check device/simulator console
- Look for `[INFO]` and `[ERROR]` logs with `SpendSplitScreen` or `SpendMerchantPaymentService`

### Common Issues

1. **Import Path Errors**:
   - Verify all imports use correct relative paths
   - Check `src/services/integrations/spend/` imports

2. **Firebase Connection**:
   - Verify emulator is running
   - Check `__DEV__` mode is enabled
   - Verify app connects to emulator

3. **Payment Not Triggering**:
   - Check threshold calculation
   - Verify `isPaymentThresholdMet()` returns true
   - Check `isPaymentAlreadyProcessed()` returns false

4. **Webhook Fails**:
   - Check webhook URL is correct
   - Verify webhook secret matches
   - Check network connectivity

## Production Testing

Before deploying to production:

1. **Update Configuration**:
   - Replace mock webhook URL with SPEND's actual webhook
   - Update treasury wallet to production address
   - Set production API keys

2. **Test with Real Data**:
   - Use real SPEND order IDs
   - Test with actual treasury wallet
   - Verify webhook calls reach SPEND

3. **Monitor**:
   - Check Firebase Functions logs
   - Monitor webhook responses
   - Track payment success rate

## Next Steps

1. **Get SPEND's Webhook URL**: From SPEND team
2. **Get Production Treasury Wallet**: Confirm with SPEND
3. **Test End-to-End**: Full flow with real SPEND integration
4. **Deploy**: Once all tests pass

## Support

If you encounter issues:
1. Check logs (emulator + app)
2. Verify configuration (API keys, URLs)
3. Test with mock data first
4. Contact SPEND team for webhook/API issues

