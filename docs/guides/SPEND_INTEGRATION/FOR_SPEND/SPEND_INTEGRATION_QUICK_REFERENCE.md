# SPEND ↔ WeSplit Integration Quick Reference

**For SPEND Development Team** | **Last Updated**: 2025-11-28

This document provides everything you need to integrate SPEND with WeSplit's payment gateway. Follow the numbered steps in order.

---

## 🔑 **1. Authentication Setup**

### Your API Key
```
wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg
```

**Expires**: November 28, 2026

**Webhook Secret** (for signature verification):
```
whsec_C4VxSIq3TQdA_Aqxt7Ji44oAEvvplYsy
```

### Authentication Headers
All API requests require:
```http
Authorization: Bearer wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg
Content-Type: application/json
```

### Base URL
```http
https://us-central1-wesplit-35186.cloudfunctions.net
```
**Project ID**: `wesplit-35186`

---

## 🧪 **1.5 Testing Environment**

### Test/Staging Environment
**Use Testnet for Development**: Test the flow on Solana testnet for smart contracts and internal testing teams (Android/iOS).

### Test Endpoints
```http
# Mock webhook for testing (same auth as production)
POST /mockSpendWebhook

# Test payment flow simulation
POST /testSpendPaymentFlow
```

**Test Endpoint Behavior**: Uses same authentication as production. Returns mock responses for integration testing.

### Sample Test Flow
1. Create test split with `/batchInviteParticipants`
2. Simulate payments with `/payParticipantShare`
3. Monitor with `/getSplitStatus`
4. Verify webhooks to your test endpoint

---

## 📋 **SPEND Implementation Status**

Based on your current implementation:

### ✅ **Already Implemented**
- Split creation via API
- Local participant storage in Firebase
- UI for inviting participants
- Payment flow for creator
- Auto-complete UI (ready for known users API)

### 🔄 **Ready to Integrate**
- **Participant invitation API** ← Use `/batchInviteParticipants` above
- **Known users API** ← Use `/searchKnownUsers` above
- **Payment processing** ← Use `/payParticipantShare` above
- **Webhook event handling** ← Implement endpoint for payloads above
- **Real-time funding status** ← Use `/getSplitStatus` above

---

## 📋 **2. Integration Flow (Step-by-Step)**

### **Step 1: When Order is Created (User clicks "Pay with WeSplit")**

**Endpoint**: `POST /matchUsersByEmail`

**Purpose**: Check which participants already have WeSplit accounts.

**Request**:
```json
{
  "emails": ["user1@example.com", "user2@example.com", "user3@example.com"],
  "splitId": "optional_split_id_for_tracking",
  "creatorId": "optional_creator_user_id"
}
```

**Response**:
```json
{
  "success": true,
  "matched": {
    "existingUsers": [
      {
        "email": "user1@example.com",
        "userId": "wesplit_user_123",
        "hasWallet": true,
        "name": "John",
        "hasAvatar": false,
        "walletAddressPreview": "14NMW...4"
      }
    ],
    "newUsers": [
      {
        "email": "user2@example.com",
        "inviteLink": "https://wesplit.io/join-split?invite=encoded_data"
      },
      {
        "email": "user3@example.com",
        "inviteLink": "https://wesplit.io/join-split?invite=encoded_data"
      }
    ]
  },
  "stats": {
    "totalEmails": 3,
    "existingCount": 1,
    "newCount": 2
  }
}
```

### **Step 2: Create Split & Invite Participants**

**Endpoint**: `POST /batchInviteParticipants`

**Purpose**: Create the split and invite all participants at once.

**Multiple Participants**: ✅ Yes, you can invite multiple participants in a single request.

**Split Distribution**: Supports both equal and unequal splits via `amountOwed` field.

**Request**:
```json
{
  "splitId": "spend_order_123456",
  "inviterId": "spend_user_456",
  "inviterName": "John Doe",
  "participants": [
    {
      "email": "user1@example.com",
      "name": "User One",
      "amountOwed": 50.00,  // Custom amount (unequal split)
      "walletAddress": "optional_wallet_address_if_known"
    },
    {
      "email": "user2@example.com",
      "name": "User Two",
      "amountOwed": 30.00   // Custom amount
    },
    {
      "email": "user3@example.com",
      "name": "User Three",
      "amountOwed": 20.00   // Custom amount
    }
  ],
  "sendNotifications": true
}
```

**Response**:
```json
{
  "success": true,
  "results": {
    "addedExisting": [
      {
        "email": "user1@example.com",
        "userId": "wesplit_user_123",
        "name": "User One",
        "amountOwed": 50.00
      }
    ],
    "pendingInvites": [
      {
        "email": "user2@example.com",
        "name": "User Two",
        "amountOwed": 30.00,
        "inviteLink": "https://wesplit.io/join-split?invite=..."
      },
      {
        "email": "user3@example.com",
        "name": "User Three",
        "amountOwed": 20.00,
        "inviteLink": "https://wesplit.io/join-split?invite=..."
      }
    ],
    "alreadyParticipant": [],
    "failed": []
  },
  "summary": {
    "addedExisting": 1,
    "pendingInvites": 2,
    "alreadyParticipant": 0,
    "failed": 0
  }
}
```

**Payment Timing**: Participants can pay before all participants are invited. No "lock" mechanism required.

### **Step 2.5: Payment Flow Details**

**Endpoint**: `POST /payParticipantShare`

**Purpose**: Record participant payments (including creator payments).

**Payment Rules**:
- Participants can pay before all invitations are sent
- Overpayments reduce other participants' amounts proportionally
- Payments are immediately recorded and applied

**Example**: Total bill $100, User 1 owes $50 but pays $60 (overpays $10)
- User 1's remaining: $0 (fully paid)
- User 2's amount reduces from $50 to $40

**Request**:
```json
{
  "splitId": "spend_order_123456",
  "participantId": "user_id_of_payer",
  "amount": 33.33,
  "currency": "USDC",
  "transactionSignature": "optional_solana_tx_signature"
}
```

**Response**:
```json
{
  "success": true,
  "transactionSignature": "5j7s8K9...",
  "amountPaid": 33.33,
  "remainingAmount": 0,
  "splitStatus": "active"
}
```

### **Step 3: Check Split Status (Optional)**

**Endpoint**: `GET /getSplitStatus?splitId=your_split_id`

**Purpose**: Monitor payment progress in real-time.

**Response**:
```json
{
  "success": true,
  "split": {
    "id": "spend_order_123456",
    "status": "active",
    "totalAmount": 100.0,
    "amountCollected": 33.33,
    "completionPercentage": "33.30",
    "participantsCount": 3,
    "participantsPaid": 1,
    "participants": [
      {
        "userId": "user_123",
        "email": "user1@example.com",
        "name": "User One",
        "amountOwed": 33.33,
        "amountPaid": 33.33,
        "status": "paid"
      },
      {
        "userId": "user_456",
        "email": "user2@example.com",
        "name": "User Two",
        "amountOwed": 33.33,
        "amountPaid": 0,
        "status": "invited"
      }
    ]
  }
}
```

### **Step 4: Search Known Users (Optional - For Auto-complete)**

**Endpoint**: `GET /searchKnownUsers?query=john&limit=20`

**Purpose**: Search for existing WeSplit users for auto-complete in invite flow.

**Search Fields**: Email, name, or wallet address (prefix match, case-insensitive).

**Privacy**: Only returns users who haven't opted out of discovery.

**Request**:
```http
GET /searchKnownUsers?query=john&limit=20
Authorization: Bearer wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg
```

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "userId": "user_id_1",
      "email": "john@example.com",
      "name": "John Doe",
      "walletAddress": "14NMWDU6HUJmWn6FNZFneJrfuxqiq9krg4VAHUqV11Sk",
      "avatar": "https://firebasestorage.googleapis.com/.../avatar.jpg"
    }
  ],
  "total": 1
}
```

---

## 🔄 **3. Webhook Implementation (SPEND Side)**

### **WeSplit → SPEND Webhook**

**Your Endpoint**: Configure in split creation (see step 2)

**Purpose**: Receive payment notifications when users pay.

**Headers We Send**:
```http
Authorization: Bearer whsec_C4VxSIq3TQdA_Aqxt7Ji44oAEvvplYsy
X-WeSplit-Signature: t=timestamp,v1=hmac_signature
X-WeSplit-Event: split.participant_paid OR split.funded
Content-Type: application/json
User-Agent: WeSplit-Webhooks/1.0
```

**All Webhook Event Payloads**:

#### `split.created` (Split Created)
```json
{
  "event": "split.created",
  "split_id": "spend_order_123456",
  "order_id": "SPEND_ORDER_123",
  "total_amount": 100.00,
  "currency": "USDC",
  "creator_id": "user_id_of_creator",
  "participants": [
    {
      "user_id": "user_id_1",
      "email": "user1@example.com",
      "amount_owed": 33.33
    }
  ],
  "timestamp": "2025-11-28T10:00:00Z"
}
```

#### `split.participant_added` (New Participant Invited)
```json
{
  "event": "split.participant_added",
  "split_id": "spend_order_123456",
  "order_id": "SPEND_ORDER_123",
  "participant": {
    "user_id": "user_id_2",
    "email": "user2@example.com",
    "amount_owed": 33.33,
    "status": "invited"
  },
  "timestamp": "2025-11-28T10:05:00Z"
}
```

#### `split.participant_paid` (Payment Made)
```json
{
  "event": "split.participant_paid",
  "split_id": "spend_order_123456",
  "order_id": "SPEND_ORDER_123",
  "participant": {
    "user_id": "wesplit_user_123",
    "email": "user1@example.com",
    "amount_paid": 33.33,
    "remaining_amount": 0
  },
  "transaction_signature": "5j7s8K9...",
  "timestamp": "2025-11-28T10:10:00Z"
}
```

#### `split.funded` (Split Fully Paid - Triggers Merchant Payment)
```json
{
  "event": "split.funded",
  "split_id": "spend_order_123456",
  "order_id": "SPEND_ORDER_123",
  "total_amount": 100.00,
  "amount_collected": 100.00,
  "currency": "USDC",
  "transaction_signature": "final_transaction_signature",
  "participants": [
    {
      "user_id": "user_id_1",
      "amount_paid": 33.33
    }
  ],
  "timestamp": "2025-11-28T10:15:00Z"
}
```

#### `split.cancelled` (Split Cancelled)
```json
{
  "event": "split.cancelled",
  "split_id": "spend_order_123456",
  "order_id": "SPEND_ORDER_123",
  "reason": "Creator cancelled",
  "timestamp": "2025-11-28T10:20:00Z"
}
```

**Your Response**:
```http
HTTP 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Payment notification received"
}
```

### **Webhook Security & Signature Verification**

**Signature Algorithm**: HMAC-SHA256

**Header Format**: `X-WeSplit-Signature: t=timestamp,v1=signature`

**Verification Process**:
1. Extract timestamp `t` and signature `v1` from header
2. Check timestamp is within 5 minutes (prevents replay attacks)
3. Create signed payload: `timestamp + "." + JSON.stringify(requestBody)`
4. Compute HMAC-SHA256 using your webhook secret
5. Compare using constant-time comparison

**Node.js Example**:
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signatureHeader, secret) {
  const elements = signatureHeader.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
  const signature = elements.find(e => e.startsWith('v1='))?.split('=')[1];

  // Check timestamp (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return false; // Timestamp too old
  }

  // Create signed payload
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;

  // Compute HMAC
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}
```

**Expected Headers**:
- `Content-Type: application/json`
- `X-WeSplit-Signature: t=1234567890,v1=abc123def456...`
- `X-WeSplit-Event: split.participant_paid` (event type)
- `User-Agent: WeSplit-Webhooks/1.0`

### **Webhook Endpoint Configuration**
- **Update Method**: Contact us to change your webhook endpoint
- **Format**: Any valid HTTPS URL you provide
- **Alternative**: We can use a Firebase Functions endpoint if preferred

**Signature Verification** (Recommended):
```javascript
const crypto = require('crypto');

function verifySignature(payload, signatureHeader, secret) {
  const [t, v1] = signatureHeader.split(',');
  const timestamp = t.split('=')[1];
  const signature = v1.split('=')[1];

  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## 🔄 **4. SPEND → WeSplit Webhook (Optional)**

### **Order Status Updates**

**Our Endpoint**: `POST /spendWebhook`

**Purpose**: Send order status updates (shipped, delivered, etc.)

**Your Headers**:
```http
X-Spend-Signature: t=timestamp,v1=hmac_signature  // Optional but recommended
Content-Type: application/json
```

**Example Payload**:
```json
{
  "event": "order.shipped",
  "order_id": "SPEND_ORDER_123",
  "status": "shipped",
  "tracking_number": "1Z999AA1234567890",
  "tracking_url": "https://www.ups.com/track?trackingNumber=1Z999AA1234567890",
  "timestamp": "2025-11-28T14:30:00Z"
}
```

---

## ⚠️ **5. Error Handling**

### Common HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| `200` | Success | Process response |
| `400` | Bad Request | Check request format |
| `401` | Unauthorized | Check API key |
| `404` | Not Found | Verify splitId/user exists |
| `429` | Rate Limited | Wait and retry (100 req/15min) |
| `500` | Server Error | Retry with backoff |

### Error Response Format
```json
{
  "success": false,
  "error": "Clear, descriptive error message",
  "code": "ERROR_CODE"
}
```

**Note**: Error messages are designed to be clear and actionable. If you encounter unclear errors, let us know for improvement.

### Rate Limiting
- **Limit**: 100 requests per 15 minutes per API key
- **Headers**: Include rate limit info in responses
- **Backoff**: Implement exponential backoff for retries

---

## 🧪 **6. Testing**

### Test Endpoints
```http
# Mock webhook for testing
POST https://us-central1-wesplit-35186.cloudfunctions.net/mockSpendWebhook

# Test payment flow
POST https://us-central1-wesplit-35186.cloudfunctions.net/testSpendPaymentFlow
```

### Test API Key
Use the same API key for both production and testing.

### Sample Test Flow
1. Create test split with `/batchInviteParticipants`
2. Simulate payments with `/payParticipantShare`
3. Monitor with `/getSplitStatus`
4. Verify webhooks to your test endpoint

---

## 📞 **7. Support & Contact**

### For Integration Issues
- **API Key**: Already provided above (expires Nov 2026)
- **Technical Support**: `vcharles@dappzy.io`
- **API Documentation**: See `SPEND_API_REFERENCE.md`
- **Webhook Testing**: Use `/mockSpendWebhook` endpoint

### Implementation Checklist
- [x] **Obtained API key** (provided above, expires Nov 2026)
- [ ] Implemented `/matchUsersByEmail` call
- [ ] Implemented `/batchInviteParticipants` call
- [ ] Set up webhook endpoint for payment notifications
- [ ] Tested with mock data
- [ ] Verified signature validation (use webhook secret above)
- [ ] Implemented error handling
- [ ] Tested rate limiting scenarios (100 req/15min)

---

## 📋 **Complete Integration Checklist**

### ✅ **What We Provide (Ready to Use)**
- [x] **API Key**: `wsk_05uyyl_bk27aDC8dOiNh-oInWEtQwS4mKy2EWi3VVYg`
- [x] **Webhook Secret**: `whsec_C4VxSIq3TQdA_Aqxt7Ji44oAEvvplYsy`
- [x] **Base URL**: `https://us-central1-wesplit-35186.cloudfunctions.net`
- [x] **All Endpoints**: 8 production + 3 testing endpoints deployed
- [x] **Webhook Security**: HMAC-SHA256 signature verification code
- [x] **Data Schemas**: Complete SP3ND order format documentation
- [x] **Error Handling**: Comprehensive error response formats
- [x] **Testing Environment**: Testnet support with test endpoints

### 🔄 **What You Need to Implement**

#### **Phase 1: Basic Integration**
- [ ] Implement `/matchUsersByEmail` call (when order created)
- [ ] Implement `/batchInviteParticipants` call (create split + invites)
- [ ] Set up webhook endpoint for payment notifications
- [ ] Implement HMAC signature verification for webhooks

#### **Phase 2: Enhanced Features**
- [ ] Add user search with `/searchKnownUsers` (auto-complete)
- [ ] Monitor split progress with `/getSplitStatus`
- [ ] Handle overpayment distribution logic
- [ ] Send order status updates via `/spendWebhook` (optional)

#### **Phase 3: Production Testing**
- [ ] Test with real SP3ND order data
- [ ] Verify webhook signature validation
- [ ] Test error scenarios and rate limiting
- [ ] Validate payment flow end-to-end

### 📞 **Contact & Support**

- **API Documentation**: This guide + `SPEND_API_REFERENCE.md`
- **Testing Help**: Use `/mockSpendWebhook` and `/testSpendPaymentFlow`
- **Production Deployment**: Coordinate via email for final testing

---

**🎯 Ready for integration! All systems operational.**
