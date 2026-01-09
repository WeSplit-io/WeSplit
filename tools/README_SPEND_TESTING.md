# SPEND Integration Endpoints Testing

This directory contains test scripts to verify all SPEND integration endpoints work correctly.

## Quick Start

### Node.js Script (Recommended)

```bash
# Run all tests
node tools/test-spend-endpoints.js

# Run specific test
node tools/test-spend-endpoints.js create
node tools/test-spend-endpoints.js invite
node tools/test-spend-endpoints.js pay
node tools/test-spend-endpoints.js status
node tools/test-spend-endpoints.js search

# Test complete flow
node tools/test-spend-endpoints.js flow
```

### Shell Script (Alternative)

```bash
# Make executable (first time only)
chmod +x tools/test-spend-endpoints.sh

# Run all tests
./tools/test-spend-endpoints.sh

# Run specific test
./tools/test-spend-endpoints.sh create
./tools/test-spend-endpoints.sh invite
./tools/test-spend-endpoints.sh pay
./tools/test-spend-endpoints.sh status
./tools/test-spend-endpoints.sh search

# Test complete flow
./tools/test-spend-endpoints.sh flow
```

## Configuration

### Environment Variables

You can override default configuration using environment variables:

```bash
# Set custom base URL
export SPEND_API_BASE_URL="https://your-custom-url.cloudfunctions.net"

# Set custom API key
export SPEND_API_KEY="your_api_key_here"

# Run tests
node tools/test-spend-endpoints.js
```

### Default Configuration

- **Base URL**: `https://us-central1-wesplit-35186.cloudfunctions.net`
- **API Key**: `wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg`
- **Treasury Wallet**: `2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp`

## Test Commands

### `create` - Create Split From Payment

Tests the `/createSplitFromPayment` endpoint.

**What it tests**:
- ✅ Split creation with SPEND order data
- ✅ Treasury wallet configuration
- ✅ External metadata setup
- ✅ Returns split ID, bill ID, and user ID

**Example output**:
```
✅ Split created successfully!
ℹ️  Split ID: split_1234567890_abc
ℹ️  Bill ID: bill_1234567890
ℹ️  User ID: user_1234567890
```

---

### `invite` - Batch Invite Participants

Tests the `/batchInviteParticipants` endpoint.

**What it tests**:
- ✅ Inviting multiple participants
- ✅ Email sending (if configured)
- ✅ Invite link generation
- ✅ Handling existing vs new users

**Prerequisites**: Must run `create` first.

**Example output**:
```
✅ Participants invited successfully!
ℹ️  Invited: 3
ℹ️  Existing users: 0
ℹ️  New users: 3
ℹ️  Emails sent: 3
```

---

### `pay` - Pay Participant Share

Tests the `/payParticipantShare` endpoint.

**What it tests**:
- ✅ Recording participant payments
- ✅ Updating both `splits` and `splitWallets` collections
- ✅ Funding calculation
- ✅ Threshold checking

**Prerequisites**: Must run `create` and `invite` first.

**Example output**:
```
✅ Payment recorded successfully!
ℹ️  Amount paid: 33.33
ℹ️  Remaining: 0
ℹ️  Split status: funded
ℹ️  Fully funded: Yes
```

---

### `status` - Get Split Status

Tests the `/getSplitStatus` endpoint.

**What it tests**:
- ✅ Retrieving split status
- ✅ Funding information
- ✅ Participant counts
- ✅ Payment status

**Prerequisites**: Must run `create` first.

**Example output**:
```
✅ Split status retrieved successfully!
ℹ️  Title: Test Store Order
ℹ️  Status: funded
ℹ️  Total amount: 100 USDC
ℹ️  Amount collected: 100 USDC
ℹ️  Completion: 100%
ℹ️  Participants: 4
ℹ️  Participants paid: 4
```

---

### `search` - Search Known Users

Tests the `/searchKnownUsers` endpoint.

**What it tests**:
- ✅ Searching for existing users by email or name (GET request)
- ✅ Returning user information
- ✅ Query parameter handling

**Note**: This is a GET endpoint, not POST. Uses query parameter `query`.

**Example output**:
```
✅ User search completed!
ℹ️  Found: 2
ℹ️    - participant1@example.com: Participant One (user_123)
ℹ️    - participant2@example.com: Participant Two (user_456)
```

---

### `flow` - Complete Flow Test

Tests the complete SPEND integration flow end-to-end.

**What it tests**:
1. ✅ Create split from payment
2. ✅ Invite participants
3. ✅ Record participant payment
4. ✅ Get split status

**Example output**:
```
📝 Step 1: Creating split...
✅ Split created successfully!

📧 Step 2: Inviting participants...
✅ Participants invited successfully!

💰 Step 3: Recording payment...
✅ Payment recorded successfully!

📊 Step 4: Getting split status...
✅ Split status retrieved successfully!

Flow Test Summary
Create split: ✅
Invite participants: ✅
Record payment: ✅
Get status: ✅
```

---

## Test Data

The scripts use test data that simulates real SPEND integration:

- **Email**: `creator@example.com` (required top-level field)
- **Invoice ID**: `INV-<timestamp>` (required top-level field)
- **Amount**: `100.00` (required top-level field)
- **Currency**: `USDC` (required top-level field)
- **Source**: `spend` (required top-level field)
- **Order ID**: `test_order_<timestamp>` (in metadata.orderId)
- **Order Number**: `ORD-<timestamp>` (in metadata.orderNumber)
- **Store**: `amazon` (in metadata.store)
- **Total Amount**: `100.00 USDC`
- **Participants**: 3 participants with equal shares (33.33, 33.33, 33.34)
- **Treasury Wallet**: SPEND production treasury wallet (in metadata.treasuryWallet)

**Important**: The `createSplitFromPayment` endpoint expects a flat structure with required fields at the top level, and SPEND-specific data in the `metadata` object.

## Verification

After running tests, you can verify in Firebase Console:

1. **Check `splits` collection**:
   - Find split by ID (shown in test output)
   - Verify participants array
   - Check `externalMetadata` for SPEND data

2. **Check `splitWallets` collection**:
   - Find wallet by `billId` (shown in test output)
   - Verify participants have correct `amountPaid`
   - Check synchronization with `splits` collection

3. **Check `pending_invitations` collection**:
   - Verify invitations were created for new users
   - Check invite links are valid

4. **Check `apiKeys` collection**:
   - Verify API key usage was logged
   - Check `lastUsedAt` and `usageCount`

## Troubleshooting

### API Key Errors

If you get authentication errors:

```bash
# Check API key is set correctly
echo $SPEND_API_KEY

# Or set it explicitly
export SPEND_API_KEY="your_key_here"
node tools/test-spend-endpoints.js
```

### Network Errors

If you get connection errors:

```bash
# Check base URL is correct
echo $SPEND_API_BASE_URL

# Test connectivity
curl -I https://us-central1-wesplit-35186.cloudfunctions.net/createSplitFromPayment
```

### Missing Prerequisites

Some tests require previous tests to run first:

- `invite` requires `create`
- `pay` requires `create` and `invite`
- `status` requires `create`

Use `flow` command to run all tests in sequence.

## Expected Results

### Successful Test Run

All tests should return:
- ✅ HTTP 200 status
- ✅ `"success": true` in response
- ✅ Valid data in response body

### Common Issues

1. **Split not found**: Run `create` test first
2. **Participant not found**: Run `invite` test first
3. **Payment threshold not met**: Record more payments
4. **Email sending failed**: Check Firebase secrets `EMAIL_USER` and `EMAIL_PASSWORD`

## Integration with CI/CD

You can integrate these tests into your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Test SPEND Endpoints
  run: |
    export SPEND_API_KEY="${{ secrets.SPEND_API_KEY }}"
    node tools/test-spend-endpoints.js flow
```

## Next Steps

After verifying endpoints work:

1. ✅ Deploy updated functions (if you made changes)
2. ✅ Share endpoint list with SPEND team
3. ✅ Monitor API usage in Firebase Console
4. ✅ Set up webhook endpoints for SPEND
5. ✅ Test with real SPEND order data

---

**Last Updated**: 2025-01-27
