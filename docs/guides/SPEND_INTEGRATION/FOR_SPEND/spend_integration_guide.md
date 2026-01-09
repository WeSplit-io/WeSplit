# SPEND\_INTEGRATION\_GUIDE

WeSplit API Documentation for SPEND Integration Partners.

**Base URL:** `https://us-central1-wesplit-35186.cloudfunctions.net`\
**Authentication:** Bearer Token in Authorization header\
**Last Updated:** January 2025

***

## Quick Start

```bash
# Test your API key
curl -X GET "https://us-central1-wesplit-35186.cloudfunctions.net/searchKnownUsers?query=test&limit=5" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

***

## Complete Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SPEND ↔ WESPLIT Integration Flow                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  SPEND APP                        WESPLIT BACKEND                  WESPLIT APP   │
│  ═════════                        ═══════════════                  ════════════   │
│                                                                                   │
│  [1. User initiates order]                                                        │
│           │                                                                       │
│           │ POST /createSplitFromPayment                                          │
│           ├───────────────────────────►┌─────────────────────────┐               │
│           │                            │ • Validate API key       │               │
│           │                            │ • Create/get user        │               │
│           │                            │ • Create split record    │               │
│           │◄───────────────────────────│ • Send webhook (created) │               │
│           │  {splitId, billId, userId} └─────────────────────────┘               │
│                                                                                   │
│  [2. User selects friends to split]                                               │
│           │                                                                       │
│           │ POST /matchUsersByEmail                                               │
│           ├───────────────────────────►┌─────────────────────────┐               │
│           │                            │ • Match emails to users  │               │
│           │◄───────────────────────────│ • Generate invite links  │               │
│           │  {existingUsers, newUsers} └─────────────────────────┘               │
│                                                                                   │
│  [3. Invite participants]                                                         │
│           │                                                                       │
│           │ POST /batchInviteParticipants                                         │
│           ├───────────────────────────►┌─────────────────────────┐               │
│           │                            │ • Add to split           │──────────►📧  │
│           │                            │ • Send email invites     │   Emails     │
│           │◄───────────────────────────│ • Webhook (invited)      │               │
│           │  {results, inviteLinks}    └─────────────────────────┘               │
│                                                                                   │
│  [4. Friends receive invites]                               [Opens WeSplit app]   │
│                                                                     │             │
│                                                             [Pays their share]    │
│                                                                     │             │
│           ┌─────────────────────────┐◄──────────────────────────────┘             │
│           │ Webhook: participant_paid│                                            │
│  ◄────────│ {splitId, participant}   │                                            │
│           └─────────────────────────┘                                             │
│                                                                                   │
│  [5. All shares paid]                                                             │
│           ┌─────────────────────────┐                                             │
│           │ Webhook: split.funded   │                                             │
│  ◄────────│ {splitId, total_amount} │                                             │
│           └─────────────────────────┘                                             │
│                                                                                   │
│  [6. Process order]                                                               │
│           │                                                                       │
│           │ POST /spendWebhook (order.shipped)                                    │
│           ├───────────────────────────►┌─────────────────────────┐               │
│           │                            │ • Update split status    │──────────►📱  │
│           │◄───────────────────────────│ • Notify users           │   App        │
│           │  {success: true}           └─────────────────────────┘               │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

***

## API Endpoints

### 1. Create Split from Payment

Creates a new split from a SPEND order. This is typically the first call when a user initiates a split.

```
POST /createSplitFromPayment
```

Required Fields:

| Field           | Type   | Description                             |
| --------------- | ------ | --------------------------------------- |
| email           | string | Creator's email address                 |
| invoiceId       | string | Unique order/invoice identifier         |
| amount          | number | Total amount (positive number)          |
| currency        | string | Currency code (e.g., "USDC")            |
| merchant.name   | string | Merchant/store name                     |
| transactionDate | string | ISO 8601 date string                    |
| source          | string | Integration source identifier ("spend") |

Request:

```json
{
  "email": "creator@example.com",
  "walletAddress": "SolanaWalletAddress...",
  "invoiceId": "SPEND-ORDER-12345",
  "amount": 150.00,
  "currency": "USDC",
  "merchant": {
    "name": "Amazon",
    "address": "123 Commerce St"
  },
  "transactionDate": "2025-01-09T12:00:00Z",
  "source": "spend",
  "callbackUrl": "spend://order/12345/success",
  "metadata": {
    "orderData": {
      "id": "ord_abc123",
      "order_number": "ORD-12345",
      "store": "amazon",
      "status": "Payment_Pending",
      "total_amount": 150.00,
      "items": [
        {
          "product_id": "B08N5WRWNW",
          "product_title": "Apple AirPods Pro",
          "price": 150.00,
          "quantity": 1,
          "image_url": "https://..."
        }
      ]
    },
    "orderId": "ORD-12345",
    "treasuryWallet": "2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp",
    "webhookUrl": "https://spend.example.com/webhooks/wesplit",
    "webhookSecret": "your_webhook_secret_min_8_chars",
    "paymentThreshold": 1.0
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "userId": "user_abc123",
    "userEmail": "creator@example.com",
    "walletAddress": "SolanaWalletAddress...",
    "splitId": "split_1767967722372_owz9sa98g",
    "billId": "bill_1767967722372_xyz789",
    "splitStatus": "pending",
    "totalAmount": 150.00,
    "currency": "USDC",
    "createdAt": "2025-01-09T12:00:00.000Z",
    "firebaseDocId": "ABC123XYZ"
  },
  "redirectUrl": "spend://order/12345/success?splitId=split_1767967722372_owz9sa98g&userId=user_abc123&status=success"
}
```

> Important: Store the `splitId` - it's required for all subsequent API calls.

***

### 2. Search Known Users

Search for existing WeSplit users by email or name. Useful for autocomplete when inviting friends.

```
GET /searchKnownUsers?query={searchTerm}&limit={maxResults}
```

Parameters:

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| query     | string | Yes      | Search term (min 2 characters)     |
| limit     | number | No       | Max results (default: 20, max: 50) |

Response:

```json
{
  "success": true,
  "users": [
    {
      "userId": "user_123",
      "email": "john@example.com",
      "name": "John Doe",
      "walletAddress": "8x7F...abc",
      "avatar": "https://..."
    }
  ],
  "total": 5
}
```

> Note: Only returns users who have not opted out of discoverability (`discoverable !== false`).

***

### 3. Match Users By Email

Cross-reference a list of emails with WeSplit's user database. Use this to determine which friends already have WeSplit accounts before inviting them.

```
POST /matchUsersByEmail
```

Request:

```json
{
  "emails": ["user1@example.com", "user2@example.com", "user3@example.com"],
  "splitId": "split_123",
  "creatorId": "creator_user_id"
}
```

Request Fields:

| Field     | Type      | Required | Description                        |
| --------- | --------- | -------- | ---------------------------------- |
| emails    | string\[] | Yes      | Array of emails to match (max 100) |
| splitId   | string    | No       | Associates with a specific split   |
| creatorId | string    | No       | Creator user ID for analytics      |

Response:

```json
{
  "success": true,
  "matched": {
    "existingUsers": [
      {
        "email": "user1@example.com",
        "userId": "wesplit_user_id",
        "hasWallet": true,
        "hasAvatar": true,
        "name": "John",
        "walletAddressPreview": "8x7F...abc"
      }
    ],
    "newUsers": [
      {
        "email": "user2@example.com",
        "inviteLink": "https://wesplit-deeplinks.web.app/join-split?invite=..."
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

> Privacy: Only returns first name and wallet preview for existing users. Full details not exposed.

***

### 4. Batch Invite Participants

Invite multiple participants to a split with automatic email notifications. This is the recommended endpoint for inviting participants.

```
POST /batchInviteParticipants
```

Request:

```json
{
  "splitId": "split_1767967722372_owz9sa98g",
  "inviterId": "creator_user_id",
  "inviterName": "John Doe",
  "participants": [
    {
      "email": "friend1@example.com",
      "name": "Friend One",
      "amountOwed": 50.00
    },
    {
      "email": "friend2@example.com",
      "name": "Friend Two",
      "amountOwed": 50.00
    }
  ],
  "sendNotifications": true
}
```

Request Fields:

| Field                      | Type    | Required | Description                                   |
| -------------------------- | ------- | -------- | --------------------------------------------- |
| splitId                    | string  | Yes      | The split to invite to                        |
| inviterId                  | string  | Yes      | User ID of the person inviting                |
| inviterName                | string  | No       | Display name of inviter (used in emails)      |
| participants               | array   | Yes      | Array of participants to invite               |
| participants\[].email      | string  | Yes      | Participant email                             |
| participants\[].name       | string  | No       | Participant display name                      |
| participants\[].amountOwed | number  | No       | Amount owed (auto-calculated if not provided) |
| sendNotifications          | boolean | No       | Send email invites (default: true)            |

Response:

```json
{
  "success": true,
  "results": {
    "addedExisting": [
      {
        "email": "existing@example.com",
        "userId": "user_456",
        "name": "Existing User",
        "amountOwed": 50.00
      }
    ],
    "pendingInvites": [
      {
        "email": "friend1@example.com",
        "name": "Friend One",
        "amountOwed": 50.00,
        "inviteLink": "https://wesplit-deeplinks.web.app/join-split?invite=..."
      }
    ],
    "alreadyParticipant": [],
    "failed": [],
    "emailStatus": [
      {"email": "friend1@example.com", "sent": true, "messageId": "abc123"}
    ]
  },
  "summary": {
    "total": 2,
    "addedExisting": 1,
    "pendingInvites": 1,
    "alreadyParticipant": 0,
    "failed": 0,
    "emailStatus": {
      "total": 1,
      "sent": 1,
      "failed": 0,
      "skipped": 0
    }
  },
  "deepLink": "wesplit://view-split?splitId=...",
  "redirectUrl": "spend://order/12345/success"
}
```

Result Categories:

| Category           | Description                                      |
| ------------------ | ------------------------------------------------ |
| addedExisting      | Existing WeSplit users - added directly to split |
| pendingInvites     | New users - pending account creation, email sent |
| alreadyParticipant | Already in this split - skipped                  |
| failed             | Failed to process - check error field            |

***

### 5. Pay Participant Share

Record a participant's payment for their share. Called when a payment is confirmed on-chain.

```
POST /payParticipantShare
```

Request:

```json
{
  "splitId": "split_1767967722372_owz9sa98g",
  "participantId": "user_456",
  "amount": 50.00,
  "currency": "USDC",
  "transactionSignature": "5KJpABC123..."
}
```

Request Fields:

| Field                | Type   | Required | Description                    |
| -------------------- | ------ | -------- | ------------------------------ |
| splitId              | string | Yes      | The split ID                   |
| participantId        | string | Yes      | User ID of the payer           |
| amount               | number | Yes      | Amount paid (must be positive) |
| currency             | string | No       | Currency (default: "USDC")     |
| transactionSignature | string | No       | On-chain transaction signature |

Response:

```json
{
  "success": true,
  "transactionSignature": "5KJpABC123...",
  "amountPaid": 50.00,
  "remainingAmount": 0,
  "splitStatus": "funded",
  "isFullyFunded": true,
  "deepLink": "wesplit://spend-callback?callbackUrl=...",
  "redirectUrl": "spend://order/12345/success"
}
```

Split Status Values:

| Status    | Description                      |
| --------- | -------------------------------- |
| pending   | Split created, awaiting payments |
| active    | At least one payment received    |
| funded    | All shares paid (threshold met)  |
| completed | Order fulfilled                  |

> Note: When a participant pays, WeSplit automatically sends a `split.participant_paid` webhook. When fully funded, sends `split.funded` webhook.

***

### 6. Get Split Status

Get current status of a split including all participants and payment progress. Use this to poll for updates or display split status in your UI.

```
GET /getSplitStatus?splitId={splitId}
```

Parameters:

| Parameter | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| splitId   | string | Yes      | The split ID to query |

Response:

```json
{
  "success": true,
  "split": {
    "id": "split_1767967722372_owz9sa98g",
    "title": "Amazon Order #12345",
    "status": "pending",
    "splitType": "spend",
    "totalAmount": 150.00,
    "currency": "USDC",
    "amountCollected": 50.00,
    "remainingAmount": 100.00,
    "completionPercentage": "33.33",
    "participantsCount": 3,
    "participantsPaid": 1,
    "createdAt": { "_seconds": 1736424000, "_nanoseconds": 0 },
    "updatedAt": { "_seconds": 1736424060, "_nanoseconds": 0 },
    "externalMetadata": {
      "orderId": "ORD-12345",
      "orderNumber": "ORD-12345",
      "orderStatus": "Payment_Pending",
      "paymentStatus": "pending",
      "paymentThreshold": 1.0
    },
    "participants": [
      {
        "userId": "user_123",
        "email": "user@example.com",
        "name": "John Doe",
        "amountOwed": 50.00,
        "amountPaid": 50.00,
        "status": "paid"
      },
      {
        "userId": null,
        "email": "friend@example.com",
        "name": "Jane Smith",
        "amountOwed": 50.00,
        "amountPaid": 0,
        "status": "invited"
      }
    ]
  }
}
```

Participant Status Values:

| Status   | Description                                       |
| -------- | ------------------------------------------------- |
| accepted | Participant is the creator or has accepted invite |
| invited  | Invitation sent, awaiting response                |
| partial  | Has paid some but not all of their share          |
| paid     | Fully paid their share                            |

***

### 7. Invite Participants to Split (Legacy)

> ⚠️ Deprecated: Use `batchInviteParticipants` instead for enhanced functionality including email notifications.

Invite participants to an existing split. Basic invitation without email notifications.

```
POST /inviteParticipantsToSplit
```

Request:

```json
{
  "splitId": "split_123",
  "inviterId": "creator_user_id",
  "inviterName": "John Doe",
  "participants": [
    {
      "email": "friend@example.com",
      "name": "Friend Name",
      "amountOwed": 50.00,
      "walletAddress": "optional_wallet_address"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "invitedCount": 1,
  "message": "Successfully invited 1 participant(s)",
  "participants": [
    {
      "userId": "user_789",
      "email": "friend@example.com",
      "status": "invited",
      "amountOwed": 50.00
    }
  ],
  "errors": []
}
```

***

## Webhooks

### Webhooks Sent BY WeSplit (to SPEND)

WeSplit sends webhooks to your configured `webhookUrl` (from `metadata.webhookUrl` in createSplitFromPayment) when events occur.

Headers:

```
Content-Type: application/json
X-WeSplit-Signature: t=1234567890,v1=abc123...
X-WeSplit-Event: split.participant_paid
User-Agent: WeSplit-Webhooks/1.0
```

Events:

| Event                        | Description                                | Trigger                                |
| ---------------------------- | ------------------------------------------ | -------------------------------------- |
| `split.created`              | Split successfully created                 | After createSplitFromPayment completes |
| `split.participant_added`    | New participant added to split             | After inviteParticipantsToSplit        |
| `split.participants_invited` | Batch of participants invited              | After batchInviteParticipants          |
| `split.participant_paid`     | Participant completed payment              | After payParticipantShare              |
| `split.funded`               | All participants have paid (threshold met) | When total paid >= threshold           |
| `split.cancelled`            | Split was cancelled                        | When split is cancelled                |

Payload Example (split.created):

```json
{
  "event": "split.created",
  "split_id": "split_1767967722372_owz9sa98g",
  "order_id": "ORD-12345",
  "timestamp": "2025-01-09T12:00:00Z",
  "total_amount": 150.00,
  "currency": "USDC",
  "creator_id": "user_123",
  "participants": [
    {
      "user_id": "user_123",
      "email": "creator@example.com",
      "amount_owed": 150.00
    }
  ]
}
```

Payload Example (split.participant\_paid):

```json
{
  "event": "split.participant_paid",
  "split_id": "split_123",
  "order_id": "ORD-12345",
  "timestamp": "2025-01-09T12:34:56Z",
  "participant": {
    "user_id": "user_456",
    "email": "friend@example.com",
    "amount_paid": 50.00,
    "total_paid": 50.00,
    "remaining_amount": 0
  },
  "transaction_signature": "5KJpABC123..."
}
```

Payload Example (split.funded):

```json
{
  "event": "split.funded",
  "split_id": "split_123",
  "order_id": "ORD-12345",
  "timestamp": "2025-01-09T12:35:00Z",
  "total_amount": 150.00,
  "currency": "USDC",
  "amount_collected": 150.00,
  "participants": [
    {"user_id": "user_123", "amount_paid": 50.00},
    {"user_id": "user_456", "amount_paid": 50.00},
    {"user_id": "user_789", "amount_paid": 50.00}
  ]
}
```

> Important: `split.funded` is the signal to process the order. This means all payments have been collected.

***

### Webhooks Received BY WeSplit (from SPEND)

Send order status updates to WeSplit to keep users informed about their order.

```
POST /spendWebhook
```

Headers:

```
Content-Type: application/json
X-Spend-Signature: t=1234567890,v1=abc123...
```

Events:

| Event                  | Description              | WeSplit Action             |
| ---------------------- | ------------------------ | -------------------------- |
| `order.status_changed` | Order status updated     | Update split metadata      |
| `order.shipped`        | Order has been shipped   | Notify participants        |
| `order.delivered`      | Order has been delivered | Mark split as completed    |
| `order.cancelled`      | Order was cancelled      | Cancel split, notify users |

Payload Example (order.shipped):

```json
{
  "event": "order.shipped",
  "order_id": "ORD-12345",
  "status": "shipped",
  "timestamp": "2025-01-10T10:00:00Z",
  "tracking_number": "1Z999AA10123456784",
  "tracking_url": "https://track.example.com/1Z999AA10123456784"
}
```

Response:

```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

> Note: Signature verification uses the same HMAC-SHA256 algorithm as WeSplit webhooks. The secret used for verification is stored in WeSplit's backend configuration.

***

## Authentication

### API Key Authentication

All requests must include your API key in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

### Webhook Signature Verification

Verify WeSplit webhook signatures using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signatureHeader, secret) {
  // Parse: t=timestamp,v1=signature
  const elements = signatureHeader.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
  const signature = elements.find(e => e.startsWith('v1='))?.split('=')[1];
  
  // Verify timestamp (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return false;
  }
  
  // Verify signature
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

***

## Error Responses

All endpoints return consistent error formats:

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message",
  "code": "ERROR_CODE"
}
```

Common Error Codes:

| Status | Code                     | Description                    |
| ------ | ------------------------ | ------------------------------ |
| 400    | `MISSING_REQUIRED_FIELD` | Required field not provided    |
| 401    | `INVALID_API_KEY`        | API key is invalid or expired  |
| 403    | `NOT_AUTHORIZED`         | Not authorized for this action |
| 404    | `SPLIT_NOT_FOUND`        | Split ID does not exist        |
| 404    | `PARTICIPANT_NOT_FOUND`  | Participant not in split       |
| 405    | `METHOD_NOT_ALLOWED`     | Wrong HTTP method              |
| 429    | `RATE_LIMITED`           | Too many requests              |
| 500    | `INTERNAL_ERROR`         | Server error                   |

***

## Endpoint Reference (Quick)

| Endpoint                     | Method | Description                       |
| ---------------------------- | ------ | --------------------------------- |
| `/createSplitFromPayment`    | POST   | Create a new split from order     |
| `/searchKnownUsers`          | GET    | Search for WeSplit users          |
| `/matchUsersByEmail`         | POST   | Match emails to WeSplit users     |
| `/batchInviteParticipants`   | POST   | Invite participants (recommended) |
| `/inviteParticipantsToSplit` | POST   | Invite participants (legacy)      |
| `/payParticipantShare`       | POST   | Record a payment                  |
| `/getSplitStatus`            | GET    | Get split status and participants |
| `/spendWebhook`              | POST   | Receive SPEND order updates       |

***

## Testing

### Test Endpoints

| Endpoint                 | Method | Purpose                               |
| ------------------------ | ------ | ------------------------------------- |
| `/mockSpendWebhook`      | POST   | Mock webhook receiver (logs payloads) |
| `/testSpendPaymentFlow`  | POST   | Simulate payment flow                 |
| `/getSpendWebhookFormat` | GET    | Get expected webhook format           |

Get Webhook Format:

```bash
curl https://us-central1-wesplit-35186.cloudfunctions.net/getSpendWebhookFormat
```

Test Webhook Call:

```bash
curl -X POST https://us-central1-wesplit-35186.cloudfunctions.net/mockSpendWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "TEST-ORDER-123",
    "split_id": "split_test_123",
    "transaction_signature": "5KJpTestSig...",
    "amount": 100.00,
    "currency": "USDC",
    "participants": ["wallet1...", "wallet2..."],
    "status": "completed",
    "timestamp": "2025-01-09T12:00:00Z"
  }'
```

Run Full Test Suite:

```bash
# From services/firebase-functions directory
npm run test:spend

# With custom configuration
API_KEY=your_key TEST_SPLIT_ID=your_split npm run test:spend
```

Testing Checklist:

* [ ] Create split from payment returns valid splitId
* [ ] Search users returns expected format
* [ ] Match emails correctly identifies existing vs new users
* [ ] Batch invite adds participants and sends emails
* [ ] Get split status returns all participant info
* [ ] Webhooks are received at configured URL
* [ ] Signature verification works correctly

***

## Configuration

### Deep Link Domain

```
https://wesplit-deeplinks.web.app
```

### Supported Currencies

| Currency | Type      | Network |
| -------- | --------- | ------- |
| USDC     | SPL Token | Solana  |
| SOL      | Native    | Solana  |
| BONK     | SPL Token | Solana  |

***

## Metadata Reference

### createSplitFromPayment Metadata Fields

| Field              | Type   | Required | Description                                                    |
| ------------------ | ------ | -------- | -------------------------------------------------------------- |
| `treasuryWallet`   | string | Yes\*    | SPEND treasury wallet for payments. Required for SPEND splits. |
| `orderId`          | string | Yes\*    | Unique order ID. Required when treasuryWallet is provided.     |
| `webhookUrl`       | string | No       | URL to receive WeSplit webhooks                                |
| `webhookSecret`    | string | Cond.    | Required when webhookUrl is provided. Min 8 chars.             |
| `paymentThreshold` | number | No       | 0-1, percentage required to mark split as funded. Default: 1.0 |
| `paymentTimeout`   | number | No       | Timeout in seconds for payment completion                      |
| `callbackUrl`      | string | No       | URL to redirect after actions (deep link supported)            |
| `orderData`        | object | No       | Full SPEND order object for reference                          |

### Order Data Fields (orderData)

When providing full order data, these fields are stored and can be retrieved via getSplitStatus:

| Field              | Description                             |
| ------------------ | --------------------------------------- |
| `id`               | Order ID                                |
| `order_number`     | Human-readable order number             |
| `status`           | Order status (e.g., "Payment\_Pending") |
| `store`            | Store name (e.g., "amazon")             |
| `total_amount`     | Total order amount                      |
| `items`            | Array of order items                    |
| `shipping_address` | Shipping address object                 |
| `tracking_number`  | Tracking number (when shipped)          |
| `tracking_url`     | Tracking URL (when shipped)             |

***

## Common Integration Issues

{% stepper %}
{% step %}
### "Split not found" Error

Cause: Using wrong split ID or split wasn't created successfully.

Solution:

* Use the `splitId` from createSplitFromPayment response, not `firebaseDocId`
* Verify split was created by calling getSplitStatus immediately after creation
{% endstep %}

{% step %}
### Webhooks Not Received

Cause: Webhook URL misconfigured or signature verification failing.

Solution:

* Ensure `webhookUrl` and `webhookSecret` are both provided in metadata
* Verify your endpoint is publicly accessible
* Check webhook\_logs collection in Firebase for delivery status
{% endstep %}

{% step %}
### Email Invitations Not Sent

Cause: Email service not configured or participant already in split.

Solution:

* Check emailStatus in batchInviteParticipants response for details
* Existing participants won't receive duplicate emails
{% endstep %}

{% step %}
### Payment Not Reflected

Cause: Wrong participantId or split already funded.

Solution:

* Use the `userId` from the participants array in getSplitStatus
* For pending invites (null userId), wait for user to accept invitation
{% endstep %}

{% step %}
### Rate Limiting

Cause: Too many requests in short period.

Solution:

* Limit to 100 requests per 15-minute window
* Batch operations where possible (use batchInviteParticipants)
{% endstep %}
{% endstepper %}

***

## Typical Integration Sequence

{% stepper %}
{% step %}
### Create Split When User Initiates Order

```bash
curl -X POST "https://us-central1-wesplit-35186.cloudfunctions.net/createSplitFromPayment" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "creator@example.com",
    "invoiceId": "ORDER-123",
    "amount": 150.00,
    "currency": "USDC",
    "merchant": {"name": "Amazon"},
    "transactionDate": "2025-01-09T12:00:00Z",
    "source": "spend",
    "metadata": {
      "treasuryWallet": "2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp",
      "orderId": "ORDER-123",
      "webhookUrl": "https://your-backend.com/wesplit-webhook",
      "webhookSecret": "your_secret_here"
    }
  }'
```
{% endstep %}

{% step %}
### Check Which Friends Are on WeSplit

```bash
curl -X POST "https://us-central1-wesplit-35186.cloudfunctions.net/matchUsersByEmail" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": ["friend1@example.com", "friend2@example.com"],
    "splitId": "split_123"
  }'
```
{% endstep %}

{% step %}
### Invite Friends to Split

```bash
curl -X POST "https://us-central1-wesplit-35186.cloudfunctions.net/batchInviteParticipants" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "splitId": "split_123",
    "inviterId": "user_abc",
    "inviterName": "John",
    "participants": [
      {"email": "friend1@example.com", "name": "Friend One", "amountOwed": 50.00},
      {"email": "friend2@example.com", "name": "Friend Two", "amountOwed": 50.00}
    ]
  }'
```
{% endstep %}

{% step %}
### Poll for Status or Wait for Webhooks

Option A: Poll

```bash
curl -X GET "https://us-central1-wesplit-35186.cloudfunctions.net/getSplitStatus?splitId=split_123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Option B: Receive webhook at your webhookUrl when split.funded
{% endstep %}

{% step %}
### Update WeSplit When Order Ships

```bash
curl -X POST "https://us-central1-wesplit-35186.cloudfunctions.net/spendWebhook" \
  -H "Content-Type: application/json" \
  -H "X-Spend-Signature: t=1234567890,v1=abc123..." \
  -d '{
    "event": "order.shipped",
    "order_id": "ORDER-123",
    "status": "shipped",
    "tracking_number": "1Z999AA10123456784"
  }'
```
{% endstep %}
{% endstepper %}

***

## Support

For integration support, contact the WeSplit team.

### Additional Resources

* Full API Documentation: `docs/API_ARCHITECTURE_SCHEMATIC.md`
* Firebase Functions Source: `services/firebase-functions/src/spendApiEndpoints.js`
* Test Scripts: `services/firebase-functions/test-spend-endpoints.js`

### Debug Tools

1. Firebase Console: Check `webhook_logs` and `spend_webhook_received` collections
2. Test Endpoints: Use `/getSpendWebhookFormat` to verify expected formats
3. Emulator Mode: Run locally without API key validation for development

### Changelog

| Date     | Change                                                 |
| -------- | ------------------------------------------------------ |
| Jan 2025 | Added batchInviteParticipants with email notifications |
| Jan 2025 | Added matchUsersByEmail endpoint                       |
| Jan 2025 | Enhanced webhook payloads with transaction signatures  |
| Jan 2025 | Initial SPEND integration release                      |
