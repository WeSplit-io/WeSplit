# SPEND Splits - Complete Logic Summary

**Date**: 2025-01-27  
**Status**: ✅ Complete Implementation  
**Version**: 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Complete Flow](#complete-flow)
4. [Key Components](#key-components)
5. [Data Structures](#data-structures)
6. [API Endpoints](#api-endpoints)
7. [Deep Links & Callbacks](#deep-links--callbacks)
8. [Payment Processing](#payment-processing)
9. [Security](#security)
10. [Error Handling](#error-handling)

---

## 🎯 Overview

SPEND Splits enable users to split bills from SPEND orders and automatically pay merchants when the payment threshold is met. The system handles:

- **Split Creation**: From SPEND orders via API
- **Participant Management**: Inviting and managing participants
- **Payment Collection**: Participants pay their shares
- **Automatic Merchant Payment**: When threshold is met, funds are sent to SPEND treasury
- **Webhooks**: Bidirectional communication with SPEND
- **Deep Links**: Seamless navigation between SPEND and WeSplit apps

---

## 🏗️ Architecture

### System Components

```
┌─────────────────┐
│   SPEND App     │
└────────┬────────┘
         │ API Calls
         ▼
┌─────────────────────────────────┐
│   WeSplit Firebase Functions    │
│  - createSplitFromPayment        │
│  - batchInviteParticipants       │
│  - payParticipantShare           │
│  - getSplitStatus                │
│  - spendWebhook                  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│      Firestore Database         │
│  - splits collection             │
│  - split_wallets collection     │
│  - pending_invitations          │
│  - webhook_logs                 │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    WeSplit Mobile App           │
│  - SpendSplitScreen             │
│  - Payment processing           │
│  - Deep link handling           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Solana Blockchain            │
│  - Split wallet creation        │
│  - Participant payments        │
│  - Merchant payment             │
└─────────────────────────────────┘
```

---

## 🔄 Complete Flow

### Phase 1: Split Creation (SPEND → WeSplit)

```
1. User clicks "Pay with WeSplit" in SPEND
   ↓
2. SPEND calls POST /createSplitFromPayment
   Request: {
     email, amount, currency,
     metadata: {
       treasuryWallet: "SPEND_TREASURY_ADDRESS",
       orderId: "ORD-123",
       callbackUrl: "spend://order/ORD-123/success",
       webhookUrl: "https://spend.com/webhook",
       webhookSecret: "secret",
       paymentThreshold: 1.0
     },
     order: { /* SP3ND order data */ }
   }
   ↓
3. WeSplit API validates:
   - ✅ Payment data structure
   - ✅ Callback URL (security check)
   - ✅ Treasury wallet format
   - ✅ Order ID presence
   ↓
4. API creates split document in Firestore:
   {
     id: "split_123...",
     splitType: "spend",
     totalAmount: 100.00,
     currency: "USDC",
     status: "pending",
     externalMetadata: {
       paymentMode: "merchant_gateway",
       treasuryWallet: "SPEND_TREASURY",
       orderId: "ORD-123",
       callbackUrl: "spend://order/ORD-123/success",
       paymentStatus: "pending",
       paymentThreshold: 1.0,
       orderData: { /* Full SP3ND order */ }
     },
     participants: [/* Creator only initially */]
   }
   ↓
5. API returns:
   {
     success: true,
     data: {
       splitId: "split_123...",
       userId: "user_456",
       redirectUrl: "spend://order/ORD-123/success?splitId=..."
     }
   }
   ↓
6. SPEND redirects user to WeSplit:
   URL: https://wesplit-deeplinks.web.app/view-split?splitId=split_123&userId=user_456
```

---

### Phase 2: Participant Invitation

```
1. User opens WeSplit app (via deep link)
   ↓
2. App navigates to SpendSplitScreen
   ↓
3. User can invite participants:
   Option A: Via API (SPEND side)
   - SPEND calls POST /batchInviteParticipants
   - WeSplit processes invitations
   - Existing users: Added directly
   - New users: Pending invitations created
   
   Option B: Via App (User side)
   - User clicks "Invite Participants"
   - Selects contacts
   - Invitations sent via email/SMS
   ↓
4. Participants receive invitations:
   - Email with deep link
   - Deep link: https://wesplit-deeplinks.web.app/join-split?data=...
   ↓
5. Participants join split:
   - Click invitation link
   - Create account (if new)
   - Join split
   - Added to participants array
```

---

### Phase 3: Payment Collection

```
1. Participant opens split in WeSplit app
   ↓
2. User clicks "Pay My Share"
   ↓
3. App checks if split wallet exists:
   - If not: Creates split wallet on Solana
   - If yes: Uses existing wallet
   ↓
4. User confirms payment:
   - Amount: Their share (amountOwed)
   - Destination: Split wallet address
   - Context: 'fair_split_contribution'
   ↓
5. Transaction executed:
   - User's wallet → Split wallet
   - Transaction signature recorded
   - Participant status: 'paid'
   - amountPaid updated
   ↓
6. Payment recorded in Firestore:
   - Split document: participants[].amountPaid updated
   - Split wallet: participants[].amountPaid updated
   - Transaction logged
```

---

### Phase 4: Automatic Merchant Payment

```
1. Payment threshold check (polling every 10 seconds):
   - Total paid >= (totalAmount * paymentThreshold)
   - All participants have paid
   ↓
2. Threshold met → Trigger merchant payment:
   - Check: !isPaymentAlreadyProcessed()
   - Status: 'processing'
   ↓
3. Execute merchant payment:
   - Source: Split wallet
   - Destination: SPEND treasury wallet
   - Amount: split.totalAmount
   - Memo: "SP3ND Order: {orderId}"
   - Context: 'spend_split_payment'
   ↓
4. Transaction executed:
   - SplitWalletPayments.extractFairSplitFunds()
   - UnifiedWithdrawalService.withdraw()
   - On-chain transaction to treasury
   ↓
5. Payment status updated:
   - externalMetadata.paymentStatus: 'paid'
   - externalMetadata.paymentTransactionSig: "tx_signature"
   - split.status: 'completed'
   ↓
6. Webhook sent to SPEND (async):
   - Event: 'split.funded'
   - Payload: { order_id, split_id, transaction_signature, amount, ... }
   - Retry logic: 3 attempts with exponential backoff
   ↓
7. Notifications sent (async):
   - All participants notified
   - "Payment Sent to SPEND ✅"
   ↓
8. Deep link callback (if callbackUrl provided):
   - Generate: wesplit://spend-callback?callbackUrl=...&status=success
   - User can return to SPEND app
```

---

## 🔧 Key Components

### 1. Split Creation Service

**File**: `services/firebase-functions/src/externalPaymentIntegration.js`

**Function**: `createSplitFromPayment()`

**Responsibilities**:
- ✅ Validates payment data
- ✅ Validates callback URL (security)
- ✅ Extracts SP3ND order data
- ✅ Converts currency to USDC
- ✅ Creates split document
- ✅ Stores external metadata
- ✅ Returns splitId and userId

**Key Logic**:
```javascript
// Determine split type
const hasTreasuryWallet = metadata.treasuryWallet?.trim() !== '';
const splitType = hasTreasuryWallet ? 'spend' : 'fair';

// Build externalMetadata
externalMetadata = {
  paymentMode: hasTreasuryWallet ? 'merchant_gateway' : 'personal',
  treasuryWallet: metadata.treasuryWallet,
  orderId: sp3ndOrder?.id || metadata.orderId,
  callbackUrl: metadata.callbackUrl, // Validated
  paymentStatus: 'pending',
  paymentThreshold: metadata.paymentThreshold || 1.0,
  orderData: { /* Full SP3ND order */ }
};
```

---

### 2. Payment Mode Service

**File**: `src/services/integrations/spend/SpendPaymentModeService.ts`

**Responsibilities**:
- ✅ Determines payment mode (personal vs merchant_gateway)
- ✅ Checks if merchant payment required
- ✅ Validates payment threshold
- ✅ Checks if payment already processed
- ✅ Extracts order ID, treasury wallet, etc.

**Key Methods**:
```typescript
getPaymentMode(split): 'personal' | 'merchant_gateway'
requiresMerchantPayment(split): boolean
isPaymentThresholdMet(split, totalPaid): boolean
isPaymentAlreadyProcessed(split): boolean
getTreasuryWallet(split): string | undefined
getOrderId(split): string | undefined
```

---

### 3. Merchant Payment Service

**File**: `src/services/integrations/spend/SpendMerchantPaymentService.ts`

**Function**: `processMerchantPayment()`

**Responsibilities**:
- ✅ Validates split and wallet
- ✅ Checks payment threshold
- ✅ Prevents duplicate payments (idempotency)
- ✅ Executes payment to treasury
- ✅ Updates payment status atomically
- ✅ Sends webhook to SPEND
- ✅ Notifies participants

**Key Logic**:
```typescript
// 1. Validate
if (!requiresMerchantPayment(split)) return error;
if (isPaymentAlreadyProcessed(split)) return already_processed;
if (!isPaymentThresholdMet(split, totalPaid)) return threshold_not_met;

// 2. Mark as processing (atomic)
updatePaymentStatus(split, { paymentStatus: 'processing' });

// 3. Execute payment
const result = await sendPaymentToMerchant(split, splitWalletId, creatorId);

// 4. Update status
if (result.success) {
  updatePaymentStatus(split, { 
    paymentStatus: 'paid',
    paymentTransactionSig: result.transactionSignature 
  });
  updateSplitStatus(split, 'completed');
}

// 5. Async operations (non-blocking)
callWebhookAsync(split, transactionSignature, amount);
notifyParticipantsAsync(split, transactionSignature, amount);
```

---

### 4. Spend Split Screen

**File**: `src/screens/SpendSplit/SpendSplitScreen.tsx`

**Responsibilities**:
- ✅ Displays split details
- ✅ Shows payment progress
- ✅ Handles participant payments
- ✅ Monitors payment threshold
- ✅ Triggers automatic merchant payment
- ✅ Handles callback redirects

**Key Features**:
- Polling: Checks payment completion every 10 seconds
- Auto-payment: Triggers when threshold met
- Wallet creation: Creates split wallet if needed
- Deep links: Handles callback redirects

---

### 5. Deep Link Handler

**File**: `src/services/core/deepLinkHandler.ts`

**Responsibilities**:
- ✅ Parses deep link URLs
- ✅ Validates callback URLs (security)
- ✅ Handles spend-callback action
- ✅ Redirects users to SPEND app

**Key Actions**:
- `view-split`: Open split from SPEND
- `spend-callback`: Return to SPEND after payment
- `join-split`: Join split from invitation

---

## 📊 Data Structures

### Split Document (Firestore)

```typescript
{
  id: "split_1234567890_abc",
  billId: "bill_123...",
  title: "Order ORD-123",
  description: "Split for Amazon order",
  totalAmount: 100.00,
  currency: "USDC",
  splitType: "spend",
  status: "pending" | "active" | "completed" | "cancelled",
  creatorId: "user_123",
  creatorName: "John Doe",
  participants: [
    {
      userId: "user_123",
      email: "john@example.com",
      name: "John Doe",
      walletAddress: "14NMW...",
      amountOwed: 50.00,
      amountPaid: 50.00,
      status: "paid"
    }
  ],
  externalMetadata: {
    paymentMode: "merchant_gateway",
    treasuryWallet: "2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp",
    orderId: "ORD-123",
    orderNumber: "ORD-1234567890",
    orderStatus: "Payment_Pending",
    store: "amazon",
    callbackUrl: "spend://order/ORD-123/success",
    webhookUrl: "https://spend.com/webhook",
    webhookSecret: "secret",
    paymentStatus: "pending" | "processing" | "paid" | "failed",
    paymentThreshold: 1.0,
    paymentTransactionSig: "tx_signature",
    paymentAttempts: 0,
    orderData: { /* Full SP3ND order */ }
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Split Wallet Document (Firestore)

```typescript
{
  id: "wallet_123...",
  billId: "bill_123...",
  walletAddress: "SPLIT_WALLET_ADDRESS",
  totalAmount: 100.00,
  currency: "USDC",
  creatorId: "user_123",
  status: "active" | "completed",
  participants: [
    {
      userId: "user_123",
      amountOwed: 50.00,
      amountPaid: 50.00,
      walletAddress: "USER_WALLET"
    }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🌐 API Endpoints

### 1. Create Split from Payment

**Endpoint**: `POST /createSplitFromPayment`

**Purpose**: Create split from SPEND order

**Request**:
```json
{
  "email": "customer@example.com",
  "amount": 100.00,
  "currency": "USDC",
  "metadata": {
    "treasuryWallet": "SPEND_TREASURY_ADDRESS",
    "orderId": "ORD-123",
    "callbackUrl": "spend://order/ORD-123/success",
    "webhookUrl": "https://spend.com/webhook",
    "webhookSecret": "secret",
    "paymentThreshold": 1.0
  },
  "order": { /* SP3ND order data */ }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "splitId": "split_123...",
    "userId": "user_456",
    "redirectUrl": "spend://order/ORD-123/success?splitId=..."
  }
}
```

---

### 2. Batch Invite Participants

**Endpoint**: `POST /batchInviteParticipants`

**Purpose**: Invite multiple participants to split

**Request**:
```json
{
  "splitId": "split_123",
  "inviterId": "user_123",
  "inviterName": "John Doe",
  "participants": [
    {
      "email": "user1@example.com",
      "name": "User One",
      "amountOwed": 33.33
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
    "addedExisting": [...],
    "pendingInvites": [...],
    "alreadyParticipant": [],
    "failed": []
  },
  "deepLink": "wesplit://view-split?splitId=...",
  "redirectUrl": "spend://order/ORD-123/success"
}
```

---

### 3. Pay Participant Share

**Endpoint**: `POST /payParticipantShare`

**Purpose**: Record participant payment

**Request**:
```json
{
  "splitId": "split_123",
  "participantId": "user_456",
  "amount": 33.33,
  "currency": "USDC",
  "transactionSignature": "tx_signature"
}
```

**Response**:
```json
{
  "success": true,
  "amountPaid": 33.33,
  "remainingAmount": 0,
  "splitStatus": "active",
  "isFullyFunded": false,
  "deepLink": "wesplit://spend-callback?callbackUrl=...&status=success",
  "redirectUrl": "spend://order/ORD-123/success"
}
```

---

### 4. Get Split Status

**Endpoint**: `GET /getSplitStatus?splitId=split_123`

**Purpose**: Get current split status

**Response**:
```json
{
  "success": true,
  "split": {
    "id": "split_123",
    "status": "active",
    "totalAmount": 100.00,
    "amountCollected": 66.66,
    "completionPercentage": "66.66",
    "participantsCount": 3,
    "participantsPaid": 2,
    "externalMetadata": {
      "orderId": "ORD-123",
      "paymentStatus": "pending",
      "paymentThreshold": 1.0
    }
  }
}
```

---

### 5. Spend Webhook (Incoming)

**Endpoint**: `POST /spendWebhook`

**Purpose**: Receive order status updates from SPEND

**Request**:
```json
{
  "event": "order.shipped",
  "order_id": "ORD-123",
  "status": "shipped",
  "tracking_number": "1Z999AA...",
  "timestamp": "2025-01-27T10:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook received and processed"
}
```

---

## 🔗 Deep Links & Callbacks

### Deep Link Flow

```
SPEND → WeSplit:
  URL: https://wesplit-deeplinks.web.app/view-split?splitId=...&userId=...
  Action: Opens SpendSplitScreen

WeSplit → SPEND:
  URL: wesplit://spend-callback?callbackUrl=spend://order/ORD-123/success&status=success
  Action: Opens SPEND app with callback
```

### Security

- ✅ Callback URLs validated
- ✅ Dangerous protocols blocked
- ✅ Script injection prevented
- ✅ Secure logging (no sensitive data)

---

## 💰 Payment Processing

### Participant Payment Flow

```
1. User clicks "Pay My Share"
   ↓
2. App validates:
   - User balance sufficient
   - Split wallet exists (creates if needed)
   - Amount correct
   ↓
3. Transaction executed:
   - User wallet → Split wallet
   - Amount: amountOwed
   - Context: 'fair_split_contribution'
   ↓
4. Payment recorded:
   - participant.amountPaid += amount
   - participant.status = 'paid'
   - Split totalPaid updated
   ↓
5. Threshold check:
   - If totalPaid >= threshold: Trigger merchant payment
```

### Merchant Payment Flow

```
1. Threshold met (polling detects)
   ↓
2. Validation:
   - requiresMerchantPayment() = true
   - isPaymentThresholdMet() = true
   - !isPaymentAlreadyProcessed() = true
   ↓
3. Mark as processing (atomic):
   - paymentStatus: 'processing'
   - idempotencyKey: generated
   ↓
4. Execute payment:
   - SplitWalletPayments.extractFairSplitFunds()
   - Split wallet → Treasury wallet
   - Memo: "SP3ND Order: {orderId}"
   ↓
5. Update status (atomic):
   - paymentStatus: 'paid'
   - paymentTransactionSig: "tx_signature"
   - split.status: 'completed'
   ↓
6. Async operations:
   - Webhook to SPEND
   - Notifications to participants
   - Deep link callback (if provided)
```

---

## 🔒 Security

### URL Validation

- ✅ Callback URLs validated before use
- ✅ Dangerous protocols blocked (`javascript:`, `data:`, etc.)
- ✅ Script injection patterns detected
- ✅ Only safe protocols allowed

### Data Protection

- ✅ Sensitive data not logged
- ✅ Callback URLs not exposed in logs
- ✅ Webhook secrets never logged
- ✅ Secure error messages

### Payment Security

- ✅ Idempotency keys prevent duplicates
- ✅ Atomic status updates
- ✅ Transaction verification
- ✅ Threshold validation

---

## ⚠️ Error Handling

### Payment Failures

- ✅ Retry logic for webhooks
- ✅ Status tracking (failed attempts)
- ✅ Error messages to users
- ✅ Logging for debugging

### Validation Errors

- ✅ Clear error messages
- ✅ Field-level validation
- ✅ Type checking
- ✅ Required field checks

---

## 📈 Status Flow

```
pending → active → completed
   ↓         ↓
   └─────────┴─→ cancelled
```

**Payment Status**:
```
pending → processing → paid
   ↓
failed (can retry)
```

---

## 🔄 Webhook Flow

### WeSplit → SPEND

**Events**:
- `split.created`
- `split.participant_added`
- `split.participant_paid`
- `split.funded` ⭐ (triggers when threshold met)
- `split.cancelled`

**Retry Logic**:
- 3 attempts
- Delays: 1s, 2s, 4s
- Exponential backoff

### SPEND → WeSplit

**Events**:
- `order.status_changed`
- `order.shipped`
- `order.delivered`
- `order.cancelled`

**Updates**:
- Split externalMetadata.orderStatus
- Tracking information
- Delivery status

---

## ✅ Key Features

1. **Automatic Payment**: When threshold met, payment sent automatically
2. **Idempotency**: Prevents duplicate payments
3. **Atomic Updates**: Status updates are atomic
4. **Webhooks**: Bidirectional communication
5. **Deep Links**: Seamless navigation
6. **Security**: URL validation, data protection
7. **Error Handling**: Comprehensive error handling
8. **Retry Logic**: Webhook retries with backoff

---

## 📚 Related Documentation

- **API Reference**: `SPEND_API_REFERENCE.md`
- **Security Guide**: `DEEP_LINK_SECURITY_GUIDE.md`
- **Integration Guide**: `SPEND_INTEGRATION_QUICK_REFERENCE.md`
- **Deep Link Flow**: `DEEP_LINK_FLOW.md`

---

**Last Updated**: 2025-01-27  
**Status**: ✅ Production Ready
