# WeSplit Integration - Response to SP3ND Clarification Questions

**Date**: 2025-01-27  
**Status**: Ready for Integration  
**Project ID**: `wesplit-35186`

---

## Question 0: API Key & Configuration

### ✅ PROJECT-ID
**Answer**: `wesplit-35186`

**Base URL Format**: 
- **Production**: `https://us-central1-wesplit-35186.cloudfunctions.net`
- **Test/Staging**: `https://us-central1-wesplit-35186.cloudfunctions.net` (same endpoint, test data isolation via testnet)

### ✅ API Key
**Answer**: Will be provided via email to `vcharles@dappzy.io` once ready.  
**Status**: Pending - will notify when available

### ✅ Test/Staging Environment
**Answer**: 
- **Smart Contracts**: Use **testnet** (Solana Devnet) for all testing
- **API Endpoints**: Same base URL, but we'll use test data and testnet transactions
- **Internal Testing**: Android and iOS teams can use the testnet environment
- **Test Endpoint**: `/testCreateSplitFromPayment` uses the same authentication (Bearer token) but operates on test data

**Note**: The `/testCreateSplitFromPayment` endpoint behaves identically to production but:
- Uses testnet for blockchain transactions
- Stores data in separate test collections (for easy cleanup)
- Returns the same response format
- Requires the same Bearer token authentication

**Error Messages**: If error messages aren't clear, please let us know and we'll improve them.

---

## Question 1: Participant Invitation & Payment Flow

### ✅ Participant Invitation API

**Endpoint**: `POST https://us-central1-wesplit-35186.cloudfunctions.net/inviteParticipantsToSplit`

**Request Format**:
```json
{
  "splitId": "split_1234567890_abc",
  "inviterId": "user_id_of_creator",
  "inviterName": "John Doe",
  "participants": [
    {
      "email": "user1@example.com",
      "name": "User One",
      "amountOwed": 33.33,
      "walletAddress": "optional_wallet_address_if_known"
    },
    {
      "email": "user2@example.com", 
      "name": "User Two",
      "amountOwed": 33.33
    }
  ]
}
```

**Response Format**:
```json
{
  "success": true,
  "invitedCount": 2,
  "message": "Successfully invited 2 participants",
  "participants": [
    {
      "userId": "user_id_1",
      "email": "user1@example.com",
      "status": "invited",
      "amountOwed": 33.33
    }
  ]
}
```

**Authentication**: `Authorization: Bearer YOUR_API_KEY`

### ✅ Multiple Invitations
**Answer**: **Yes, multiple invitations can be sent at once**. Send an array of participants in a single API call.

### ✅ Payment Flow

**Endpoint**: `POST https://us-central1-wesplit-35186.cloudfunctions.net/payParticipantShare`

**Request Format**:
```json
{
  "splitId": "split_1234567890_abc",
  "participantId": "user_id_of_payer",
  "amount": 33.33,
  "currency": "USDC",
  "transactionSignature": "optional_if_payment_already_made_on_chain"
}
```

**Response Format**:
```json
{
  "success": true,
  "transactionSignature": "5j7s8K9...",
  "amountPaid": 33.33,
  "remainingAmount": 0,
  "splitStatus": "active"
}
```

**Authentication**: `Authorization: Bearer YOUR_API_KEY`

**Note**: The API key and full payment endpoint details will be provided along with the API key.

### ✅ Payment Timing
**Answer**: 
- **Yes, participants can pay before all participants are invited**
- **No lock mechanism required** - payments are stored and applied when the split is finalized
- Participants don't need to wait for the repartition to be finished
- The split doesn't need to be "locked" before all participants are invited

### ✅ Payment Before Split Configuration
**Answer**: 
- **Payment is stored and applied later** if the repartition changes when participants are invited
- Payments are not rejected
- Payments are not held - they're immediately recorded and will be applied to the participant's share once the split is finalized

---

## Question 2: Split Amount Distribution

### ✅ Equal vs Unequal Splits
**Answer**: **Splits can be arbitrarily divided** - not limited to equal distribution.

### ✅ Specifying Participant Amounts
**Answer**: 
- The creator can choose the repartition **before** inviting users
- The creator can also adjust the repartition **after** inviting users
- When inviting participants, include the `amountOwed` field for each participant in the invitation request

**Example**:
```json
{
  "participants": [
    {
      "email": "user1@example.com",
      "amountOwed": 50.00  // User 1 pays $50
    },
    {
      "email": "user2@example.com", 
      "amountOwed": 30.00  // User 2 pays $30
    },
    {
      "email": "user3@example.com",
      "amountOwed": 20.00  // User 3 pays $20
    }
  ]
}
```

### ✅ Overpayment Handling
**Answer**: **Overpayments reduce other participants' amounts** for bill coverage.

**Example**:
- Total bill: $100
- User 1 owes: $50, pays: $60 (overpaid by $10)
- User 2 owes: $50, now owes: $40 (reduced by $10)

---

## Question 3: Known Users & Auto-Complete

### ✅ Known Users API Endpoint
**Answer**: Will be set up at the same time as the split access API.  
**Endpoint**: `GET https://us-central1-wesplit-35186.cloudfunctions.net/searchKnownUsers`

**Request Format**:
```
    GET /searchKnownUsers?query=john&limit=20
```

**Query Parameters**:
- `query` (required): Search term (email, name, or wallet address)
- `limit` (optional): Maximum results to return (default: 20)

**Authentication**: `Authorization: Bearer YOUR_API_KEY`

### ✅ Data Returned
**Answer**: The API returns:
- `email`: User's email address
- `name`: User's display name
- `walletAddress`: User's Solana wallet address (if available)
- `avatar`: User's avatar URL (if available)
- `userId`: Internal user ID

**Response Format**:
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

### ✅ Search/Filter Method
**Answer**: **Compound search** by:
- Email (prefix match)
- Name (prefix match)
- Wallet address (prefix match)

The search is case-insensitive and returns results matching any of these fields.

### ✅ Privacy/Consent
**Answer**: 
- Only users who have **previously used WeSplit** will appear in search results
- Users must have **opted-in** to being discoverable (this is part of our user registration flow)
- Search results only include users who have consented to being found via email/name search
- Wallet addresses are only shown if the user has made them public

---

## Question 4: Webhook Event Details

### ✅ Webhook Payload Format

WeSplit will send webhooks to SP3ND's endpoint. Here's the payload format for each event:

#### `split.created`
```json
{
  "event": "split.created",
  "split_id": "split_1234567890_abc",
  "order_id": "SPEND_TEST_ORDER_001",
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
  "timestamp": "2025-01-27T10:00:00Z"
}
```

#### `split.participant_added`
```json
{
  "event": "split.participant_added",
  "split_id": "split_1234567890_abc",
  "order_id": "SPEND_TEST_ORDER_001",
  "participant": {
    "user_id": "user_id_2",
    "email": "user2@example.com",
    "amount_owed": 33.33,
    "status": "invited"
  },
  "timestamp": "2025-01-27T10:05:00Z"
}
```

#### `split.participant_paid`
```json
{
  "event": "split.participant_paid",
  "split_id": "split_1234567890_abc",
  "order_id": "SPEND_TEST_ORDER_001",
  "participant": {
    "user_id": "user_id_1",
    "email": "user1@example.com",
    "amount_paid": 33.33,
    "remaining_amount": 0
  },
  "transaction_signature": "5j7s8K9...",
  "timestamp": "2025-01-27T10:10:00Z"
}
```

#### `split.funded`
```json
{
  "event": "split.funded",
  "split_id": "split_1234567890_abc",
  "order_id": "SPEND_TEST_ORDER_001",
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
  "timestamp": "2025-01-27T10:15:00Z"
}
```

#### `split.cancelled`
```json
{
  "event": "split.cancelled",
  "split_id": "split_1234567890_abc",
  "order_id": "SPEND_TEST_ORDER_001",
  "reason": "Creator cancelled",
  "timestamp": "2025-01-27T10:20:00Z"
}
```

### ✅ Webhook Signature Verification

**Method**: **HMAC-SHA256** signature verification

**Header**: `X-WeSplit-Signature`

**Format**: 
```
X-WeSplit-Signature: t=1234567890,v1=abc123def456...
```

Where:
- `t` = timestamp (Unix epoch)
- `v1` = HMAC-SHA256 signature

**Verification Process**:
1. Extract timestamp `t` and signature `v1` from header
2. Check timestamp is within 5 minutes (prevent replay attacks)
3. Create signed payload: `timestamp + "." + JSON.stringify(requestBody)`
4. Compute HMAC-SHA256 using your webhook secret
5. Compare computed signature with `v1` using constant-time comparison

**Example Code** (Node.js):
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

### ✅ Webhook Endpoint URL Format

**Registration**: You'll need to **register your webhook endpoint URL** with us.

**Endpoint Format**: 
- Provide us with your webhook URL (e.g., `https://your-domain.com/webhooks/wesplit`)
- We'll configure it in our system
- You can update it anytime by contacting us

**Alternative**: If you prefer, we can use a Firebase Functions endpoint you provide.

### ✅ Webhook Headers

**Expected Headers**:
```
Content-Type: application/json
X-WeSplit-Signature: t=1234567890,v1=abc123def456...
X-WeSplit-Event: split.participant_paid
User-Agent: WeSplit-Webhooks/1.0
```

**Headers to Validate**:
- `Content-Type`: Must be `application/json`
- `X-WeSplit-Signature`: Required for signature verification
- `X-WeSplit-Event`: Event type (for routing)

---

## Summary of Answers

### ✅ Fully Answered
- API Key & Configuration (pending API key delivery)
- Participant Invitation & Payment Flow (endpoints will be provided)
- Split Amount Distribution
- Known Users API (will be set up)
- Webhook Event Details (payload formats and signature verification)

### 📋 Next Steps

1. **API Key Delivery**: We'll send the API key via email once ready
2. **Endpoint Documentation**: Full API documentation will be added to the GitBook
3. **Webhook Registration**: Please provide your webhook endpoint URL
4. **Testing**: We'll coordinate testnet testing with your team

---

## Additional Information

### Current Implementation Status

**✅ Ready for Integration**:
- Split creation via `createSplitFromPayment` ✅
- Local participant storage in Firebase ✅
- UI for inviting participants ✅
- Payment flow for creator ✅
- Auto-complete UI ✅

**⏳ Pending Setup** (will be ready before integration):
- Participant invitation API endpoint
- Known users API endpoint  
- Payment API endpoint (with bearer token)
- Webhook event handling documentation

### Testing Environment

- **Blockchain**: Solana Devnet
- **API**: Same endpoints, test data isolation
- **Webhooks**: Test webhook endpoint available for testing

### Support & Contact

- **Technical Questions**: vcharles@dappzy.io
- **API Key Requests**: vcharles@dappzy.io
- **Documentation**: [GitBook Link](https://app.gitbook.com/o/4R6HgXdcCs51slYN8ZFp/s/DFFUPkl7yq7DKiHF1OnM/~/change-requests/draft)

---

**Last Updated**: 2025-01-27

