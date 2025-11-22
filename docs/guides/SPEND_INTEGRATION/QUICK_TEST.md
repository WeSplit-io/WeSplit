# SPEND Integration - Quick Test Reference

## 🚀 Quick Start (5 minutes)

### 1. Start Emulator
```bash
cd services/firebase-functions
npm run serve
```

### 2. Test API Endpoint
```bash
# Update these values:
PROJECT_ID="wesplit-35186"
API_KEY="your-api-key"

curl -X POST \
  "http://localhost:5001/${PROJECT_ID}/us-central1/createSplitFromPayment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "email": "test@example.com",
    "invoiceId": "SPEND_TEST_001",
    "amount": 100.0,
    "currency": "USD",
    "merchant": {"name": "Test Merchant"},
    "transactionDate": "2024-01-15T10:00:00Z",
    "source": "spend",
    "metadata": {
      "orderId": "SPEND_ORDER_001",
      "treasuryWallet": "2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp",
      "webhookUrl": "http://localhost:5001/${PROJECT_ID}/us-central1/mockSpendWebhook",
      "webhookSecret": "test_secret",
      "paymentThreshold": 1.0
    }
  }'
```

### 3. Verify in App
- Open WeSplit app
- Go to Splits tab
- Find the new split
- Should see SPEND badge
- Should route to SpendSplitScreen

## 📋 Test Checklist

### API Tests (curl)
- [ ] Create SPEND split with metadata
- [ ] Create personal split (backward compatibility)
- [ ] Test mock webhook endpoint

### Frontend Tests (App)
- [ ] SPEND split routes to SpendSplitScreen
- [ ] SPEND badge displays
- [ ] Payment status component works
- [ ] Automatic payment triggers when threshold met
- [ ] Webhook called successfully

## 🔍 Verify Success

**API Response:**
```json
{
  "split": {
    "splitType": "spend",
    "externalMetadata": {
      "paymentMode": "merchant_gateway",
      "orderId": "SPEND_ORDER_001"
    }
  }
}
```

**App Behavior:**
- Split shows SPEND badge
- Opens SpendSplitScreen (not FairSplitScreen)
- Payment status shows "Pending"
- No withdraw button visible

## 🐛 Common Issues

**Import errors**: Check import paths in `src/services/integrations/spend/`
**Emulator not connecting**: Verify `__DEV__` mode and emulator running
**Payment not triggering**: Check threshold calculation and payment status

## 📚 Full Guide

See `TESTING_GUIDE.md` for complete testing instructions.

