# WeSplit API Reference for SPEND Integration

**Base URL**: `https://us-central1-wesplit-35186.cloudfunctions.net`  
**Authentication**: Bearer token in `Authorization` header  
**Content-Type**: `application/json`

---


## Table of Contents

1. [Authentication](#authentication)
2. [Data Schemas](#data-schemas)
   - [SP3ND Order Schema](#sp3nd-order-schema)
   - [Order Status Values](#order-status-values)
3. [Endpoints](#endpoints)
   - [Create Split from Payment](#1-create-split-from-payment)
   - [Invite Participants to Split](#2-invite-participants-to-split)
   - [Pay Participant Share](#3-pay-participant-share)
   - [Search Known Users](#4-search-known-users)
   - [Get Split Status](#5-get-split-status)
4. [Webhooks](#webhooks)
   - [WeSplit → SPEND (Outgoing)](#wesplit--spend-outgoing)
   - [SPEND → WeSplit (Incoming)](#spend--wesplit-incoming)
5. [Error Handling](#error-handling)
6. [Testing](#testing)

---

## Authentication

All API requests require a Bearer token in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

**API Key Status**: Contact `vcharles@dappzy.io` to obtain your API key.

---

## Data Schemas

### SP3ND Order Schema

SP3ND orders are JSON objects containing complete order information. Here's the complete schema:

#### Root Order Object
```json
{
  "id": "string (required)",
  "order_number": "string (optional)",
  "user_id": "string (required)",
  "user_wallet": "string (optional)",
  "customer_email": "string (optional)",
  "status": "string (required)",
  "created_at": "timestamp (optional)",
  "updated_at": "timestamp (optional)",
  "store": "string (required)",
  "items": "array of OrderItem (optional)",
  "subtotal": "number (optional)",
  "discount": "number (optional)",
  "voucher_code": "string (optional)",
  "voucher_id": "string (optional)",
  "fx_conversion_fee": "number (optional)",
  "tax_amount": "number (optional)",
  "shipping_amount": "number (optional)",
  "no_kyc_fee": "number (optional)",
  "total_amount": "number (optional)",
  "usd_total_at_payment": "number (optional)",
  "shipping_address": "ShippingAddress (optional)",
  "shipping_country": "string (optional)",
  "shipping_option": "string (optional)",
  "is_international_shipping": "boolean (optional)",
  "payment_method": "string (optional)",
  "transaction_signature": "string (optional)",
  "transaction_state": "string (optional)",
  "payment_initiated_at": "timestamp (optional)",
  "payment_confirmed_at": "timestamp (optional)",
  "payment_verified_at": "timestamp (optional)",
  "reference_number": "string (optional)",
  "tracking_number": "string (optional)",
  "tracking_url": "string (optional)",
  "additional_notes": "string (optional)"
}
```

#### OrderItem Schema
```json
{
  "name": "string (optional)",
  "product_title": "string (optional)",
  "product_id": "string (optional)",
  "product_url": "string (optional)",
  "price": "number (required)",
  "quantity": "number (required)",
  "category": "string (optional)",
  "image": "string (optional)",
  "image_url": "string (optional)"
}
```

#### Order Status Values
- `Created` - Order created, awaiting payment
- `Payment_Pending` - Payment transaction initiated
- `Funded` - Payment confirmed (Supabase)
- `Processing` - Order being processed
- `Paid` - Payment confirmed (Firebase)
- `Ordered` - Order placed with store
- `Shipped` - Order shipped
- `Delivered` - Order delivered
- `Completed` - Order completed
- `Canceled` / `Cancelled` - Order canceled
- `Refunded` - Order refunded

#### Example Order
See `SP3ND_ORDER_JSON_MODEL.json` for a complete example with sample data.

---

## Endpoints

### 1. Create Split from Payment

Creates a new split from a SPEND order/payment.

**Endpoint**: `POST /createSplitFromPayment`

**Request Body**:
```json
{
  "email": "user@example.com",
  "invoiceId": "INV-123456",
  "amount": 100.00,
  "currency": "USDC",
  "merchant": {
    "name": "Amazon",
    "address": "optional address"
  },
  "transactionDate": "2025-01-27T10:00:00Z",
  "source": "spend",
  "walletAddress": "14NMWDU6HUJmWn6FNZFneJrfuxqiq9krg4VAHUqV11Sk",
  "items": [
    {
      "name": "Product Name",
      "price": 50.00,
      "quantity": 2
    }
  ],
  "metadata": {
    "treasuryWallet": "SPEND_TREASURY_WALLET_ADDRESS",
    "orderId": "SPEND_ORDER_123",
    "webhookUrl": "https://your-webhook-endpoint.com/wesplit",
    "webhookSecret": "your_webhook_secret_min_8_chars",
    "paymentThreshold": 1.0,
    "paymentTimeout": 3600
  },
  "order": {
    "id": "ord_123",
    "order_number": "ORD-2025-001",
    "status": "Payment_Pending",
    "store": "amazon",
    "total_amount": 100.00,
    "items": [...]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user_id_123",
    "userEmail": "user@example.com",
    "walletAddress": "14NMWDU...",
    "splitId": "split_1234567890_abc",
    "splitStatus": "pending",
    "totalAmount": 100.00,
    "currency": "USDC",
    "createdAt": "2025-01-27T10:00:00Z"
  }
}
```

---

### 2. Invite Participants to Split

Invites one or more participants to an existing split.

**Endpoint**: `POST /inviteParticipantsToSplit`

**Request Body**:
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
      "walletAddress": "optional_wallet_address"
    },
    {
      "email": "user2@example.com",
      "name": "User Two",
      "amountOwed": 33.33
    }
  ]
}
```

**Response**:
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
    },
    {
      "userId": "user_id_2",
      "email": "user2@example.com",
      "status": "invited",
      "amountOwed": 33.33
    }
  ],
  "errors": []
}
```

**Notes**:
- Multiple participants can be invited in a single request
- Participants can pay before all participants are invited
- No lock mechanism required - payments are stored and applied

---

### 3. Pay Participant Share

Records a participant's payment for their share.

**Endpoint**: `POST /payParticipantShare`

**Request Body**:
```json
{
  "splitId": "split_1234567890_abc",
  "participantId": "user_id_of_payer",
  "amount": 33.33,
  "currency": "USDC",
  "transactionSignature": "5j7s8K9..."
}
```

**Response**:
```json
{
  "success": true,
  "transactionSignature": "5j7s8K9...",
  "amountPaid": 33.33,
  "remainingAmount": 0,
  "splitStatus": "active",
  "isFullyFunded": false
}
```

**Notes**:
- Participants can pay before the split configuration is finalized
- Overpayments reduce other participants' amounts
- When `isFullyFunded` is `true`, the `split.funded` webhook is triggered

---

### 4. Search Known Users

Search for existing WeSplit users (for autocomplete).

**Endpoint**: `GET /searchKnownUsers`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term (min 2 chars) |
| `limit` | number | No | Max results (default: 20, max: 50) |

**Example**: `GET /searchKnownUsers?query=john&limit=20`

**Response**:
```json
{
  "success": true,
  "users": [
    {
      "userId": "user_id_1",
      "email": "john@example.com",
      "name": "John Doe",
      "walletAddress": "14NMWDU...",
      "avatar": "https://..."
    }
  ],
  "total": 1
}
```

**Notes**:
- Searches by email, name, or wallet address (prefix match)
- Only returns users who have opted-in to being discoverable
- Case-insensitive search

---

### 5. Get Split Status

Get the current status of a split.

**Endpoint**: `GET /getSplitStatus`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `splitId` | string | Yes | The split ID |

**Example**: `GET /getSplitStatus?splitId=split_1234567890_abc`

**Response**:
```json
{
  "success": true,
  "split": {
    "id": "split_1234567890_abc",
    "title": "Order ORD-2025-001",
    "status": "active",
    "splitType": "spend",
    "totalAmount": 100.00,
    "currency": "USDC",
    "amountCollected": 66.66,
    "remainingAmount": 33.34,
    "completionPercentage": "66.66",
    "participantsCount": 3,
    "participantsPaid": 2,
    "createdAt": "2025-01-27T10:00:00Z",
    "externalMetadata": {
      "orderId": "SPEND_ORDER_123",
      "orderNumber": "ORD-2025-001",
      "orderStatus": "Payment_Pending",
      "paymentStatus": "pending",
      "paymentThreshold": 1.0
    },
    "participants": [
      {
        "userId": "user_1",
        "email": "user1@example.com",
        "name": "User One",
        "amountOwed": 33.33,
        "amountPaid": 33.33,
        "status": "paid"
      }
    ]
  }
}
```

---

## Webhooks

### WeSplit → SPEND (Outgoing)

WeSplit sends webhooks to SPEND when split events occur.

**Webhook URL**: Configured via `metadata.webhookUrl` when creating the split

**Signature Verification**:
- Header: `X-WeSplit-Signature: t=1234567890,v1=abc123def456...`
- Method: HMAC-SHA256
- Payload: `${timestamp}.${JSON.stringify(body)}`
- Secret: From `metadata.webhookSecret`

#### Events

**`split.created`**
```json
{
  "event": "split.created",
  "split_id": "split_1234567890_abc",
  "order_id": "SPEND_ORDER_123",
  "total_amount": 100.00,
  "currency": "USDC",
  "creator_id": "user_id",
  "participants": [
    {
      "user_id": "user_1",
      "email": "user1@example.com",
      "amount_owed": 33.33
    }
  ],
  "timestamp": "2025-01-27T10:00:00Z"
}
```

**`split.participant_added`**
```json
{
  "event": "split.participant_added",
  "split_id": "split_1234567890_abc",
  "order_id": "SPEND_ORDER_123",
  "participants": [
    {
      "user_id": "user_2",
      "email": "user2@example.com",
      "amount_owed": 33.33,
      "status": "invited"
    }
  ],
  "timestamp": "2025-01-27T10:05:00Z"
}
```

**`split.participant_paid`**
```json
{
  "event": "split.participant_paid",
  "split_id": "split_1234567890_abc",
  "order_id": "SPEND_ORDER_123",
  "participant": {
    "user_id": "user_1",
    "email": "user1@example.com",
    "amount_paid": 33.33,
    "total_paid": 33.33,
    "remaining_amount": 0
  },
  "transaction_signature": "5j7s8K9...",
  "timestamp": "2025-01-27T10:10:00Z"
}
```

**`split.funded`**
```json
{
  "event": "split.funded",
  "split_id": "split_1234567890_abc",
  "order_id": "SPEND_ORDER_123",
  "total_amount": 100.00,
  "amount_collected": 100.00,
  "currency": "USDC",
  "participants": [
    {
      "user_id": "user_1",
      "amount_paid": 33.33
    }
  ],
  "timestamp": "2025-01-27T10:15:00Z"
}
```

**`split.cancelled`**
```json
{
  "event": "split.cancelled",
  "split_id": "split_1234567890_abc",
  "order_id": "SPEND_ORDER_123",
  "reason": "Creator cancelled",
  "timestamp": "2025-01-27T10:20:00Z"
}
```

#### Signature Verification (Node.js Example)

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

---

### SPEND → WeSplit (Incoming)

SPEND sends webhooks to WeSplit when order status changes.

**Endpoint**: `POST /spendWebhook`

**Signature Header**: `X-Spend-Signature: t=1234567890,v1=abc123...`

**Expected Events**:

**`order.status_changed`**
```json
{
  "event": "order.status_changed",
  "order_id": "SPEND_ORDER_123",
  "status": "shipped",
  "timestamp": "2025-01-27T10:00:00Z"
}
```

**`order.shipped`**
```json
{
  "event": "order.shipped",
  "order_id": "SPEND_ORDER_123",
  "status": "shipped",
  "tracking_number": "1Z999AA10123456784",
  "tracking_url": "https://tracking.url",
  "timestamp": "2025-01-27T10:00:00Z"
}
```

**`order.delivered`**
```json
{
  "event": "order.delivered",
  "order_id": "SPEND_ORDER_123",
  "status": "delivered",
  "timestamp": "2025-01-27T10:00:00Z"
}
```

**`order.cancelled`**
```json
{
  "event": "order.cancelled",
  "order_id": "SPEND_ORDER_123",
  "status": "cancelled",
  "reason": "Customer requested cancellation",
  "timestamp": "2025-01-27T10:00:00Z"
}
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "message": "Detailed message"
}
```

**Common Error Codes**:

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Invalid or missing API key |
| 403 | `FORBIDDEN` | Permission denied |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Testing

### Test Endpoint

**Endpoint**: `POST /testCreateSplitFromPayment`

Same request format as `createSplitFromPayment` but doesn't create actual data.

### Mock Webhook

**Endpoint**: `POST /mockSpendWebhook`

Test your webhook integration. Logs are stored in Firestore `spend_webhook_logs` collection.

### Webhook Format Reference

**Endpoint**: `GET /getSpendWebhookFormat`

Returns the expected webhook payload format with documentation.

---

## Environment URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://us-central1-wesplit-35186.cloudfunctions.net` |
| Testing | Same URL (uses testnet for blockchain transactions) |

---

## Support

- **Technical Questions**: vcharles@dappzy.io
- **API Key Requests**: vcharles@dappzy.io
- **Documentation**: [GitBook](https://app.gitbook.com/o/4R6HgXdcCs51slYN8ZFp/s/DFFUPkl7yq7DKiHF1OnM/)

---

**Last Updated**: 2025-01-27

