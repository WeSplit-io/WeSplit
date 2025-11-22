# SPEND Integration - Meeting Preparation & Notes

**Date**: _______________  
**Attendees**:  
- WeSplit: _______________  
- SPEND: _______________  

**Purpose**: Gather all required information to implement WeSplit as payment gateway for SPEND orders.

---

## ✅ Information We Already Have

- ✅ **Treasury Wallet (Production)**: `2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp`
- ✅ **Memo Format**: `SP3ND Order: {orderId}`
- ✅ **Order ID Format**: Firestore document ID (typically 20 characters, alphanumeric, case-sensitive)
- ✅ **Webhook Payload Format**: Defined in HTML doc
- ✅ **Payment Verification**: On-chain + webhook
- ✅ **Contact**: Kenton Cooley (SP3ND Team)

## ✅ What We've Implemented (To Confirm)

- ✅ **Split Creation API**: `createSplitFromPayment` endpoint ready
- ✅ **Automatic Payment Processing**: When threshold met, WeSplit automatically pays SPEND treasury
- ✅ **Webhook Notification Service**: Ready to send webhook with payment completion data
- ✅ **Items Display**: WeSplit displays order items to users (from `items` array in order data)
- ✅ **Participant Management**: Users can add participants to SPEND splits
- ✅ **Payment Status Tracking**: We track payment status (pending, processing, paid, failed)
- ✅ **Payment Threshold Logic**: Configurable threshold (default: 100%)
- ✅ **Dedicated SPEND Split Screen**: Separate UI for SPEND orders

---

## 🔴 Critical Questions (Must Answer)

### 1. Webhook Configuration ⚠️ HIGH PRIORITY

```
□ Production Webhook URL: _________________________________________________
  (Expected: https://us-central1-{project-id}.cloudfunctions.net/wesplitWebhook)

□ Test/Sandbox Webhook URL: _______________________________________________

□ Authentication Method:
  □ Bearer token (most likely)
  □ Signature verification  
  □ API key in header
  □ Other: _________________________________

□ Webhook Secret/Token (Production): ______________________________________
  (How should we store this? Firebase Secrets?)

□ Webhook Secret/Token (Test/Sandbox): _____________________________________

□ Expected Response Format:
  Success: { "success": true, "order_id": "...", "status": "Funded" }
  Error: { "success": false, "error": "...", "code": "..." }
  □ Confirmed as shown in HTML doc
  □ Different format: _________________________________

□ Webhook Timeout: _____ seconds
□ Retry Policy if Webhook Fails:
  □ WeSplit should retry (how many times? _____)
  □ SP3ND will retry on their side
  □ Manual notification required
```

### 2. Payment Threshold & Timing ⚠️ HIGH PRIORITY

```
□ Payment Threshold:
  □ 100% only (all participants must pay before payment to SP3ND)
  □ Partial allowed (threshold: _____%)
  
□ If Partial Payments Allowed:
  □ What happens if only partial amount collected?
    □ Wait indefinitely
    □ Wait with timeout: _____ days
    □ Pay partial amount to SP3ND
    □ Refund participants
    □ Other: _________________________________

□ Payment Trigger:
  □ Automatic when threshold met (recommended)
  □ Require user confirmation
  □ Other: _________________________________
```

### 3. Order ID & Tracking ⚠️ HIGH PRIORITY

```
□ Order ID Format Confirmation:
  □ Firestore document ID (20 chars, alphanumeric)
  □ Custom order number (format: _________________________________)
  □ Other: _________________________________

□ Memo Format Confirmation:
  Current: "SP3ND Order: {orderId}"
  □ Confirmed ✅
  □ Needs modification: _________________________________

□ Do You Have an Order Lookup API?
  □ Yes, endpoint: _________________________________
  □ No (we'll rely on webhook only)

□ How Do You Identify Orders in Your System?
  □ Firestore document ID
  □ order_number field
  □ Both
  □ Other: _________________________________

□ Items Array Format:
  We're displaying items from the order. Confirm format:
  □ Current format (name, price, quantity) is correct ✅
  □ Different format needed: _________________________________
  □ Additional fields needed (e.g., SKU, image URL): _________________________________
```

### 4. Payment Flow & Currency ⚠️ HIGH PRIORITY

```
□ Payment Currency:
  □ USDC only
  □ SOL, USDC, or BONK (user selects)
  □ Other: _________________________________

□ Payment Amount:
  □ Must match order total_amount exactly
  □ Can be slightly different (tolerance: _____)
  □ Other: _________________________________

□ What Happens if Payment to Treasury Fails?
  □ Retry automatically (how many times? _____)
  □ Notify SP3ND support
  □ Refund participants
  □ Manual intervention required
  □ Other: _________________________________

□ Transaction Verification:
  □ SP3ND verifies on-chain (we send webhook as notification)
  □ SP3ND relies on webhook only (no on-chain verification)
  □ Both (webhook + on-chain verification)
```

---

## 🟡 Important Questions (Should Answer)

### 5. Error Handling & Edge Cases

```
□ If Payment Fails After Participants Paid:
  □ Retry payment to SP3ND
  □ Refund participants automatically
  □ Notify SP3ND for manual intervention
  □ Other: _________________________________

□ Do You Have a Refund API?
  □ Yes, endpoint: _________________________________
  □ No (manual refunds only)

□ Cancellation Policy:
  □ Can users cancel after payment sent to SP3ND?
  □ Can users cancel before payment sent?
  □ Case-by-case basis
  □ Other: _________________________________

□ Dispute Resolution:
  Process: _________________________________
  Contact: _________________________________
```

### 6. Testing Environment ⚠️ HIGH PRIORITY

```
□ Do You Have a Sandbox/Test Environment?
  □ Yes
  □ No

□ Test Treasury Wallet Address: ____________________________________________
  (Different from production: 2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp)

□ Test Webhook URL: _______________________________________________________

□ Can We Test with Small Amounts?
  □ Yes, minimum: _____ USDC
  □ No restrictions
  □ Other: _________________________________

□ Test Order IDs Format:
  □ Same as production
  □ Different format: _________________________________

□ How Do We Get Test API Keys/Credentials?
  Process: _________________________________

□ Testing Webhook Endpoint:
  We have a mock webhook endpoint for testing. Can you provide:
  □ Test webhook endpoint we can call
  □ Expected test payload format
  □ Test webhook secret/token
  □ How to verify test webhook calls are received
```

### 7. User Experience

```
□ Should Users See "Processing payment to SP3ND" in App?
  □ Yes, show merchant name ✅ (Currently implemented)
  □ No, keep generic ("Processing payment...")
  □ Other: _________________________________

□ Can Users Invite Others to Split SP3ND Orders?
  □ Yes, unlimited ✅ (Currently implemented)
  □ Yes, limited (max: _____ participants)
  □ No, only original order creator
  □ Other: _________________________________

□ Should Participants See It's a SP3ND Order?
  □ Yes, show merchant name "SP3ND" ✅ (Currently implemented)
  □ No, keep generic
  □ Other: _________________________________

□ Items Display:
  We're showing order items to users. Is this correct?
  □ Yes, show items ✅ (Currently implemented)
  □ No, hide items
  □ Show only item count, not details
  □ Other: _________________________________

□ Payment Status Visibility:
  We show payment status (pending, processing, paid, failed). Is this correct?
  □ Yes ✅ (Currently implemented)
  □ No, hide status
  □ Show different statuses: _________________________________
```

### 8. Support & Monitoring

```
□ Technical Contact for Integration Issues:
  Name: _________________________________
  Email: _________________________________
  Slack/Channel: _________________________________

□ Support Escalation Process:
  Process: _________________________________
  Response Time SLA: _________________________________

□ Do You Have a Status Page or Monitoring Dashboard?
  □ Yes, URL: _________________________________
  □ No

□ How Should We Report Bugs or Issues?
  Process: _________________________________
  Priority Levels: _________________________________

□ Do You Want Monitoring/Alerting Setup?
  □ Yes, alert on: _________________________________
  □ No
```

### 9. Legal & Compliance

```
□ Any Terms of Service We Need to Agree To?
  □ Yes, document: _________________________________
  □ No

□ Any Liability Disclaimers Needed?
  □ Yes
  □ No

□ Any Regulatory Requirements?
  □ Yes: _________________________________
  □ No
```

---

## 📋 Integration Flow Confirmation

```
□ Confirm the Flow:
  1. User creates order on SP3ND → selects "WeSplit" payment
  2. SP3ND calls WeSplit API to create split
     □ API endpoint: `createSplitFromPayment` ✅ (Ready)
     □ Data SP3ND sends:
       - email (user email)
       - invoiceId (order ID)
       - amount (order total)
       - currency (USDC)
       - metadata.treasuryWallet (SPEND treasury address) ✅
       - metadata.orderId (SPEND order ID) ✅
       - metadata.webhookUrl (SPEND webhook endpoint) ✅
       - metadata.webhookSecret (webhook auth token) ✅
       - metadata.items (array of order items) ✅
       - metadata.paymentThreshold (optional, default: 1.0) ✅
  3. WeSplit creates split with splitType='spend', users can pay into split wallet
  4. Users can add participants to the split ✅ (Implemented)
  5. When threshold met → WeSplit automatically pays SP3ND treasury ✅ (Implemented)
     - Payment includes memo: "SP3ND Order: {orderId}" ✅
  6. WeSplit calls webhook to notify SP3ND ✅ (Ready)
     - Payload includes: order_id, split_id, transaction_signature, amount, currency, participants, status, timestamp
  7. SP3ND verifies payment and fulfills order
  
  □ Confirmed
  □ Different flow: _________________________________

□ Webhook Payload We Send:
  We're sending this format. Confirm it's correct:
  {
    "order_id": "SPEND_ORDER_123",
    "split_id": "split_abc123",
    "transaction_signature": "5KJp...",
    "amount": 100.00,
    "currency": "USDC",
    "participants": ["wallet1...", "wallet2..."],
    "status": "completed",
    "timestamp": "2024-01-15T10:30:00Z"
  }
  □ Confirmed ✅
  □ Needs modification: _________________________________
```

---

## 📝 Meeting Notes

### Key Decisions

1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

### Open Questions

1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

### Action Items

- [ ] **WeSplit**: _________________________________
- [ ] **SP3ND**: _________________________________
- [ ] **Both**: _________________________________

### Next Steps

- [ ] _________________________________
- [ ] _________________________________
- [ ] _________________________________

---

## ✅ Post-Meeting Checklist

After the call, update:

- [ ] Fill in all `[TO BE FILLED]` sections in `SP3ND_INTEGRATION_PLAN.md`
- [ ] Update webhook URLs in configuration
- [ ] Store webhook secrets securely (Firebase Secrets)
- [ ] Document all decisions in meeting notes
- [ ] Share updated plan with SP3ND for confirmation
- [ ] Create implementation timeline based on answers

---

## 🚨 Red Flags to Watch For

If any of these come up, ask for clarification:

- ❌ No test environment available
- ❌ Unclear error handling process
- ❌ No webhook authentication method
- ❌ Vague payment threshold requirements
- ❌ No support contact provided
- ❌ Webhook payload format different from what we've implemented
- ❌ Items array format different from what we're displaying
- ❌ Order ID format different from Firestore document ID

## 🎯 Key Questions Based on Our Implementation

### Items Array
```
□ We're displaying items with: name, price, quantity
  □ Is this format correct?
  □ Do you need additional fields (SKU, image URL, description)?
  □ Should we show subtotal/tax separately or only total?
```

### Participant Management
```
□ We allow users to add participants to SPEND splits
  □ Is this allowed?
  □ Any restrictions (max participants, who can add)?
  □ Should participants see it's a SPEND order?
```

### Payment Flow
```
□ We automatically pay when threshold is met
  □ Is this the expected behavior?
  □ Should we wait for confirmation?
  □ Any delay required before payment?
```

### Webhook Testing
```
□ We have a mock webhook endpoint for testing
  □ Can you test calling our endpoint?
  □ What's your webhook endpoint we should call?
  □ How can we verify webhook delivery?
```

---

## 📊 Technical Feasibility Assessment

**Status**: ✅ **IMPLEMENTED & READY FOR TESTING**

**Confidence Level**: 98%

**What We Have Implemented**:
- ✅ Payment completion detection
- ✅ Merchant payment capability
- ✅ Memo support
- ✅ HTTP client with retry logic
- ✅ Transaction execution
- ✅ Split wallet infrastructure
- ✅ Automatic payment trigger (implemented in SpendSplitScreen)
- ✅ Payment mode detection (SpendPaymentModeService)
- ✅ Webhook notification service (SpendWebhookService)
- ✅ Payment threshold logic (configurable, default 100%)
- ✅ Payment status tracking (in externalMetadata)
- ✅ Items display (SpendOrderItems component)
- ✅ Participant invitation (integrated with SplitParticipantInvitationService)
- ✅ Dedicated SPEND split screen (SpendSplitScreen)
- ✅ Payment status UI (SpendPaymentStatus component)
- ✅ Order badge (SpendOrderBadge component)

**What We Need from SPEND**:
- ⚠️ Production webhook URL and credentials
- ⚠️ Test/sandbox environment details
- ⚠️ Confirmation of webhook payload format
- ⚠️ Confirmation of items array format
- ⚠️ Testing coordination

**Ready for**: Integration testing with SPEND's test environment

---

## 🔗 Quick Reference

### SP3ND Configuration (From HTML Doc)

- **Treasury Wallet**: `2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp`
- **Memo Format**: `SP3ND Order: {orderId}`
- **Order Status Flow**: `Created → Payment_Pending → Funded/Paid → Ordered → Shipped → Delivered → Completed`
- **Webhook Endpoint Format**: `https://us-central1-{project-id}.cloudfunctions.net/wesplitWebhook`

### Webhook Payload Format (From HTML Doc)

```json
{
  "order_id": "abc123xyz789",
  "split_id": "wesplit_split_123",
  "transaction_signature": "5KJp...",
  "amount": 150.50,
  "currency": "SOL",  // or "USDC", "BONK"
  "participants": [
    "wallet1...",
    "wallet2...",
    "wallet3..."
  ],
  "status": "completed",  // "pending", "completed", "failed"
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Expected Webhook Response

**Success**:
```json
{
  "success": true,
  "order_id": "abc123xyz789",
  "status": "Funded",
  "message": "Payment received and order updated"
}
```

**Error**:
```json
{
  "success": false,
  "error": "Order not found",
  "code": "ORDER_NOT_FOUND"
}
```

---

**Last Updated**: _______________  
**Next Review**: After meeting with SPEND dev team

