# SP3ND Integration - Complete Planning Document

**Purpose**: This document contains all questions, requirements, and implementation specifications for integrating WeSplit as a payment gateway for SP3ND.

**Last Updated**: 2025-01-XX  
**Status**: Planning Phase

---

## 📋 Table of Contents

1. [Questions for SP3ND Meeting](#questions-for-sp3nd-meeting)
2. [Information Checklist](#information-checklist)
3. [Cursor Plan Implementation Prompt](#cursor-plan-implementation-prompt)
4. [Meeting Agenda](#meeting-agenda)
5. [Post-Meeting Action Items](#post-meeting-action-items)

---

## Questions for SP3ND Meeting

### 🔴 Critical Technical Questions

#### 1. Webhook Configuration
- **What is the exact webhook endpoint URL?**
  - Production: `_________________`
  - Sandbox/Test: `_________________`
  
- **What authentication method do you use?**
  - [ ] Bearer token
  - [ ] Signature verification
  - [ ] API key
  - [ ] Other: `_________________`
  
- **What is the webhook secret/token?**
  - Production: `_________________`
  - Sandbox: `_________________`
  
- **What is the expected response format?**
  - Success: `_________________`
  - Error: `_________________`
  
- **What happens if the webhook fails?**
  - Retry policy: `_________________`
  - Timeout: `_________________`
  - Notification method: `_________________`

#### 2. Payment Threshold
- **Must payment be 100% of order total, or can it be partial?**
  - [ ] 100% only
  - [ ] Partial allowed (threshold: `_____%`)
  
- **What happens if only partial amount is collected?**
  - [ ] Wait indefinitely
  - [ ] Wait with timeout (days: `_____`)
  - [ ] Pay partial amount
  - [ ] Refund participants
  - [ ] Other: `_________________`

#### 3. Order ID and Tracking
- **What is the exact format of the order ID?**
  - [ ] Firestore document ID
  - [ ] Custom order number
  - [ ] Other: `_________________`
  
- **How should we reference orders in transaction memo?**
  - Confirmed format: `SP3ND Order: {orderId}` ✅
  - Any variations needed? `_________________`
  
- **Do you have an order lookup API we can call to verify?**
  - [ ] Yes, endpoint: `_________________`
  - [ ] No

#### 4. Payment Flow
- **Should payment be automatic when threshold is met?**
  - [ ] Yes, automatic
  - [ ] No, require user confirmation
  
- **Can users cancel/refund after payment is sent?**
  - [ ] Yes
  - [ ] No
  - [ ] Case-by-case
  
- **What happens if payment to your treasury fails?**
  - [ ] Retry automatically
  - [ ] Notify SP3ND support
  - [ ] Refund participants
  - [ ] Other: `_________________`

#### 5. Error Handling
- **What should we do if payment fails after participants paid?**
  - [ ] Retry payment
  - [ ] Refund participants
  - [ ] Notify SP3ND
  - [ ] Manual intervention required
  
- **Do you have a refund API we should call?**
  - [ ] Yes, endpoint: `_________________`
  - [ ] No
  
- **How should we handle disputes between users and SP3ND?**
  - Process: `_________________`
  - Contact: `_________________`

#### 6. Transaction Requirements
- **Confirm memo format: `SP3ND Order: {orderId}`**
  - [ ] Confirmed ✅
  - [ ] Needs modification: `_________________`
  
- **Any other transaction metadata required?**
  - [ ] No
  - [ ] Yes: `_________________`
  
- **Do you verify transactions on-chain, or only via webhook?**
  - [ ] On-chain verification
  - [ ] Webhook only
  - [ ] Both

#### 7. User Experience
- **Should users see "Processing payment to SP3ND" in the app?**
  - [ ] Yes
  - [ ] No, keep it generic
  
- **Can users invite others to split SP3ND orders?**
  - [ ] Yes
  - [ ] No
  - [ ] Limited (max participants: `_____`)
  
- **Should participants see it's a SP3ND order?**
  - [ ] Yes, show merchant name
  - [ ] No, keep generic

#### 8. Testing and Sandbox
- **Do you have a sandbox/test environment?**
  - [ ] Yes
  - [ ] No
  
- **What is the test treasury wallet address?**
  - `_________________`
  
- **What is the test webhook URL?**
  - `_________________`
  
- **Can we test with small amounts?**
  - [ ] Yes, minimum: `_____ USDC`
  - [ ] No restrictions

#### 9. Legal and Compliance
- **Any terms of service we need to agree to?**
  - [ ] Yes, document: `_________________`
  - [ ] No
  
- **Any liability disclaimers needed?**
  - [ ] Yes
  - [ ] No
  
- **Any regulatory requirements we should know about?**
  - [ ] Yes: `_________________`
  - [ ] No

#### 10. Support and Monitoring
- **Who do we contact for integration issues?**
  - Name: `_________________`
  - Email: `_________________`
  - Slack/Channel: `_________________`
  
- **Do you have a status page or monitoring dashboard?**
  - [ ] Yes, URL: `_________________`
  - [ ] No
  
- **How should we report bugs or issues?**
  - Process: `_________________`
  - Priority levels: `_________________`

---

## Information Checklist

### ✅ Already Have
- [x] Treasury wallet address: `2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp`
- [x] Memo format: `SP3ND Order: {orderId}`
- [x] Order structure with `wesplit_data` field
- [x] Webhook payload format (from HTML)
- [x] Payment verification process

### 📝 Need to Collect

#### Technical
- [ ] Webhook URL (production)
- [ ] Webhook URL (sandbox/test)
- [ ] Webhook authentication method
- [ ] Webhook secret/token
- [ ] Order ID format/field name
- [ ] Payment threshold (100% or partial)
- [ ] Timeout policy (if partial payments)
- [ ] Retry policy for failed payments
- [ ] Refund API endpoint (if exists)
- [ ] Order lookup API (if exists)

#### Business Logic
- [ ] Payment trigger (automatic vs manual)
- [ ] Cancellation policy
- [ ] Refund policy
- [ ] Dispute resolution process
- [ ] Partial payment handling

#### Testing
- [ ] Test treasury wallet address
- [ ] Test webhook URL
- [ ] Test API keys
- [ ] Test order IDs format
- [ ] Sandbox environment access

#### Support
- [ ] Technical contact email
- [ ] Support channel (Slack, email, etc.)
- [ ] Escalation process
- [ ] Status page URL

---

## Cursor Plan Implementation Prompt

### How to Use This Prompt

1. **First**: Fill in the answers from the SP3ND meeting in the sections marked with `[TO BE FILLED]`
2. **Then**: Use this complete prompt with Cursor Plan to generate the implementation plan
3. **Finally**: Review and refine the generated plan before implementation

---

```
# WeSplit x SP3ND Payment Gateway Integration - Complete Implementation Plan

## Context & Background

WeSplit is a React Native mobile app for splitting bills between friends. Currently, users can:
- Create splits from receipts/invoices
- Invite friends to split costs
- Collect payments from participants
- Withdraw funds to their own wallets (manual action)

SP3ND is an e-commerce platform that wants to integrate WeSplit as a payment gateway. Their requirement:
- When a user creates an order on SP3ND and selects "WeSplit" payment
- SP3ND sends order data to WeSplit API
- WeSplit creates a split and collects payments from participants
- When payment threshold is met → WeSplit AUTOMATICALLY pays SP3ND's treasury wallet
- WeSplit notifies SP3ND via webhook

## Technical Requirements

### 1. Data Structure Extensions

Extend the Split interface to support merchant gateway mode:

```typescript
interface Split {
  // ... existing fields ...
  
  externalMetadata?: {
    // Payment mode: 'personal' | 'merchant_gateway'
    paymentMode: 'personal' | 'merchant_gateway';
    
    // Merchant gateway fields (SP3ND)
    treasuryWallet?: string;        // SP3ND treasury: 2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp
    orderId?: string;               // SP3ND order ID
    webhookUrl?: string;            // SP3ND webhook endpoint [TO BE FILLED]
    webhookSecret?: string;         // Webhook auth token [TO BE FILLED]
    paymentThreshold?: number;      // Default: 1.0 (100%) [TO BE FILLED]
    paymentTimeout?: number;        // Days to wait for partial payments [TO BE FILLED]
    paymentStatus?: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
    paymentTransactionSig?: string; // On-chain transaction signature
    paymentAttempts?: number;       // Retry counter
    lastPaymentAttempt?: string;   // ISO timestamp
    idempotencyKey?: string;        // Prevent duplicate payments
  };
}
```

### 2. Backend Implementation Requirements

#### A. Firebase Function Updates
**File**: `services/firebase-functions/src/externalPaymentIntegration.js`

**Task**: Modify `createSplitFromPayment` to:
- Accept new fields: `metadata.orderId`, `metadata.treasuryWallet`, `metadata.webhookUrl`, `metadata.webhookSecret`
- Store these in `split.externalMetadata`
- Set `paymentMode: 'merchant_gateway'` when `treasuryWallet` is provided
- Set `paymentMode: 'personal'` otherwise (default)
- Validate all required fields before creating split

#### B. Payment Mode Service
**New File**: `src/services/split/PaymentModeService.ts`

**Tasks**:
- `getPaymentMode(split: Split): 'personal' | 'merchant_gateway'`
  - Check `split.externalMetadata?.treasuryWallet` to determine mode
  - Return 'merchant_gateway' if treasury wallet exists
  - Return 'personal' otherwise
  
- `requiresMerchantPayment(split: Split): boolean`
  - Return true if payment mode is 'merchant_gateway'
  
- `isPaymentThresholdMet(split: Split, totalPaid: number): boolean`
  - Calculate required amount: `split.totalAmount * (split.externalMetadata?.paymentThreshold || 1.0)`
  - Return `totalPaid >= requiredAmount`
  
- `isPaymentAlreadyProcessed(split: Split): boolean`
  - Check if `paymentStatus === 'paid'` or `'processing'`
  - Return true to prevent duplicate payments

#### C. Merchant Payment Service
**New File**: `src/services/split/MerchantPaymentService.ts`

**Tasks**:
- `processMerchantPayment(splitId: string, splitWalletId: string): Promise<PaymentResult>`
  - Verify payment mode (must be 'merchant_gateway')
  - Check if already paid (idempotency check)
  - Verify threshold is met
  - Mark as 'processing' (atomic update to prevent duplicates)
  - Send payment to treasury wallet with memo: `SP3ND Order: {orderId}`
  - Verify transaction on-chain
  - Mark as 'paid' on success
  - Call webhook (async, with retry logic)
  - Handle errors: mark as 'failed', increment retry counter
  - Return PaymentResult with transaction signature

- `sendPaymentToMerchant()`: 
  - Use existing `SplitWalletPayments.extractFairSplitFunds()`
  - Send to `treasuryWallet` instead of creator's wallet
  - Include memo: `SP3ND Order: {orderId}`
  - Return transaction signature

- `callMerchantWebhook()`: 
  - POST to webhook URL with payload:
    ```json
    {
      "order_id": string,
      "split_id": string,
      "transaction_signature": string,
      "amount": number,
      "currency": "USDC",
      "participants": string[],
      "status": "completed",
      "timestamp": ISO8601
    }
    ```
  - Include authentication header: `Authorization: Bearer {webhookSecret}`
  - Retry up to 3 times with exponential backoff (1s, 2s, 4s)
  - Don't fail payment if webhook fails (log error)
  - Return success/failure status

- `updatePaymentStatus()`: 
  - Atomic Firestore update
  - Update `externalMetadata.paymentStatus`
  - Update `externalMetadata.paymentTransactionSig` (if provided)
  - Update `externalMetadata.paymentAttempts` (increment)
  - Update `externalMetadata.lastPaymentAttempt` (timestamp)

#### D. Payment Completion Hook
**File**: `src/services/split/SplitWalletPayments.ts`

**Task**: Add `checkAndProcessMerchantPayment(splitWalletId: string): Promise<void>`
- Called when all participants have paid (in `checkPaymentCompletion` or similar)
- Get associated split by `billId`
- Check if merchant payment required using `PaymentModeService.requiresMerchantPayment()`
- If yes, trigger `MerchantPaymentService.processMerchantPayment()`
- Handle errors gracefully (log, don't crash)
- Update UI state if needed

#### E. Safeguards Service
**New File**: `src/services/split/MerchantPaymentSafeguards.ts`

**Tasks**:
- `validatePayment(split: Split, wallet: SplitWallet): Promise<ValidationResult>`
  - Check treasury wallet is configured and valid Solana address
  - Check order ID exists
  - Verify split wallet balance >= total amount
  - Check not already paid
  - Check retry limit not exceeded (max 5 attempts)
  - Return ValidationResult with errors array

- `createIdempotencyKey(orderId: string): string`
  - Generate: `merchant_payment_{orderId}_{timestamp}`
  - Store in split metadata

- `checkIdempotency(split: Split, idempotencyKey: string): boolean`
  - Check if payment with this key already processed
  - Return true if duplicate

### 3. Frontend Implementation Requirements

#### A. Payment Mode Detection
**File**: `src/screens/FairSplit/FairSplitScreen.tsx`

**Tasks**:
- Import `PaymentModeService`
- In `checkPaymentCompletion()`:
  - Get payment mode: `PaymentModeService.getPaymentMode(splitData)`
  - If `paymentMode === 'merchant_gateway'`:
    - Show "Processing payment to merchant..." UI state
    - Disable withdraw button
    - Show merchant payment status component
    - Trigger automatic payment: `MerchantPaymentService.processMerchantPayment()`
    - Show success alert: "Payment sent to SP3ND. Order will be fulfilled shortly."
    - Show error alert if payment fails
  - If `paymentMode === 'personal'`:
    - Show existing withdraw button (current behavior)
    - User manually withdraws to their wallet

#### B. UI Components
**New File**: `src/components/split/MerchantPaymentStatus.tsx`

**Tasks**:
- Component to display merchant payment status
- Props: `split: Split`, `paymentStatus: string`
- States:
  - "Pending" - Waiting for threshold
  - "Processing" - Payment in progress
  - "Paid" - Payment completed (show transaction link)
  - "Failed" - Payment failed (show retry button)
- Show transaction signature as Solana explorer link
- Show retry button if failed (admin only or with confirmation)

#### C. Split Details Screen
**File**: `src/screens/SplitDetails/SplitDetailsScreen.tsx`

**Tasks**:
- Check if split is merchant gateway mode
- Show "Payment Gateway" badge for SP3ND splits
- Display merchant payment status component
- Show order ID and treasury wallet (if user is creator)
- Hide withdraw button for merchant gateway splits

### 4. Error Handling Requirements

#### A. Payment Failures
- If payment to treasury fails:
  - Mark status as 'failed'
  - Increment retry counter
  - Log error with full context (splitId, orderId, error message)
  - Notify admin (optional: send alert)
  - Allow manual retry (admin tool or user confirmation)
  - Max retries: 5 attempts
  - After max retries: Mark as 'failed', notify admin for manual intervention

#### B. Webhook Failures
- Retry up to 3 times with exponential backoff (1s, 2s, 4s)
- Don't fail payment if webhook fails (payment is on-chain, webhook is notification)
- Log webhook failures separately
- Queue for manual retry if all retries fail
- Store webhook failure status in split metadata

#### C. Partial Payments
- If threshold not 100% and partial payment collected:
  - Check timeout: if `paymentTimeout` days passed, process payment
  - Or pay partial amount (if SP3ND supports)
  - Or refund participants (if configured)
  - Decision based on SP3ND requirements [TO BE FILLED]

#### D. Idempotency
- Use idempotency keys: `merchant_payment_{orderId}_{timestamp}`
- Check before processing: if already paid with same key, return success
- Store idempotency key in split metadata
- Prevent duplicate payments even if function called multiple times

#### E. Transaction Verification
- After sending payment, verify on-chain:
  - Check transaction signature status
  - Verify amount matches
  - Verify recipient is treasury wallet
  - Verify memo matches format
  - Only mark as 'paid' after verification succeeds
  - If verification fails, mark as 'failed' and retry

### 5. Testing Requirements

#### A. Unit Tests
- Payment mode detection logic
- Threshold calculation
- Idempotency checks
- Validation logic
- Webhook payload formatting

#### B. Integration Tests
- Full payment flow: participants pay → merchant payment triggered
- Webhook calling with mock endpoint
- Error scenarios: payment fails, webhook fails
- Retry logic verification
- Idempotency verification

#### C. Test Data
- Mock SP3ND webhook endpoint (use ngrok or similar)
- Test treasury wallet address [TO BE FILLED]
- Test order IDs format [TO BE FILLED]
- Test with small amounts (0.1 USDC)

#### D. Test Scenarios
1. **Happy Path**: All participants pay → Payment sent → Webhook called → Success
2. **Payment Failure**: Payment fails → Retry → Success
3. **Webhook Failure**: Payment succeeds → Webhook fails → Retry → Success
4. **Partial Payment**: Only 80% paid → Wait or refund (based on config)
5. **Duplicate Prevention**: Payment called twice → Second call returns already processed
6. **Timeout**: Partial payment → Timeout reached → Process or refund

### 6. Security Requirements

#### A. Webhook Security
- Store webhook secret securely (Firebase Secrets, not in code)
- Use Bearer token authentication: `Authorization: Bearer {secret}`
- Validate webhook responses (check status codes)
- Don't expose webhook secrets in frontend
- Rotate secrets periodically

#### B. Payment Security
- Verify balance before payment (prevent overdraft)
- Use atomic Firestore updates (prevent race conditions)
- Prevent duplicate payments (idempotency keys)
- Log all payment attempts (audit trail)
- Verify transaction on-chain before marking complete

#### C. Data Privacy
- Don't expose webhook secrets in frontend
- Don't log sensitive data (mask secrets in logs)
- Encrypt treasury wallet addresses in logs (optional)
- Follow GDPR/privacy regulations

### 7. Monitoring & Logging

#### A. Logging
- Log all merchant payment attempts with:
  - splitId, orderId, transactionSig, timestamp
  - Payment status (pending, processing, paid, failed)
  - Error messages (if failed)
  - Retry attempts
  
- Log webhook calls with:
  - Webhook URL, payload, response status
  - Retry attempts
  - Success/failure status

#### B. Monitoring
- Alert on payment failures (after max retries)
- Alert on webhook failures (after all retries)
- Track payment success rate (target: >99%)
- Monitor retry counts (alert if high)
- Track average payment processing time

#### C. Metrics
- Payment success rate
- Webhook success rate
- Average payment processing time
- Retry frequency
- Error types and frequencies

### 8. Implementation Phases

**Phase 1: Foundation (Week 1)**
- Extend Split interface with `externalMetadata`
- Create `PaymentModeService` with all methods
- Update `createSplitFromPayment` to store SP3ND metadata
- Add unit tests for mode detection
- Update TypeScript types

**Phase 2: Core Logic (Week 2)**
- Create `MerchantPaymentService` with payment logic
- Implement payment to treasury wallet
- Add idempotency checks
- Add error handling and retries
- Add integration tests

**Phase 3: Integration (Week 3)**
- Hook into payment completion flow
- Update UI components (FairSplitScreen, SplitDetailsScreen)
- Implement webhook calling with retry logic
- Add merchant payment status component
- Add monitoring and logging

**Phase 4: Safeguards (Week 4)**
- Create `MerchantPaymentSafeguards` service
- Add validation checks
- Implement refund mechanism (if needed)
- Add admin tools for manual intervention
- Comprehensive testing (unit + integration)

**Phase 5: Deployment (Week 5)**
- Deploy to staging environment
- Test with SP3ND sandbox
- Fix any issues found
- Production rollout (gradual)
- Monitor and iterate

### 9. Code Quality Requirements

- TypeScript strict mode enabled
- Comprehensive error handling (try-catch, error types)
- Detailed logging (use existing logger service)
- Code comments for complex logic
- Follow existing code patterns and conventions
- Backward compatibility (don't break existing splits)
- No breaking changes to existing APIs

### 10. Documentation Requirements

- Update API documentation for `createSplitFromPayment`
- Add inline code comments for complex logic
- Create integration guide for SP3ND
- Document error codes and meanings
- Create troubleshooting guide
- Update README with new features

## Deliverables

Create a complete implementation plan that includes:

1. **File-by-file changes** with code structure and key functions
2. **Data flow diagrams** showing payment flow
3. **Error handling strategies** for each failure point
4. **Testing plan** with test cases
5. **Deployment checklist** with step-by-step instructions
6. **Risk mitigation strategies** for each identified risk
7. **Timeline** with milestones and dependencies

## Constraints

- Must be backward compatible (existing splits continue to work)
- Must not break existing personal splitting functionality
- Must handle errors gracefully (no crashes)
- Must be production-ready (not MVP, full error handling)
- Must include comprehensive testing (unit + integration)
- Must follow existing code patterns

## SP3ND-Specific Configuration

**Treasury Wallet**: `2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp`  
**Memo Format**: `SP3ND Order: {orderId}`  
**Webhook URL**: `[TO BE FILLED FROM MEETING]`  
**Webhook Secret**: `[TO BE FILLED FROM MEETING]`  
**Payment Threshold**: `[TO BE FILLED FROM MEETING]` (default: 1.0 = 100%)  
**Payment Timeout**: `[TO BE FILLED FROM MEETING]` (days, if partial payments allowed)  
**Test Treasury Wallet**: `[TO BE FILLED FROM MEETING]`  
**Test Webhook URL**: `[TO BE FILLED FROM MEETING]`

## Questions to Resolve

Before implementation, confirm with SP3ND:
- [ ] Exact webhook URL and authentication method
- [ ] Payment threshold (100% or partial)
- [ ] Timeout policy for partial payments
- [ ] Refund policy and API
- [ ] Test environment details
- [ ] Support contacts and escalation process
```

---

## Meeting Agenda

### Pre-Meeting Preparation
- [ ] Review SP3ND's HTML integration document
- [ ] List current WeSplit capabilities
- [ ] Prepare technical questions
- [ ] Prepare business questions
- [ ] Review this document

### Meeting Structure (60 minutes)

#### Introduction (5 min)
- Review integration goals
- Confirm understanding of both approaches
- Set expectations

#### Technical Deep Dive (30 min)
- Webhook configuration
- Payment flow details
- Error handling scenarios
- Testing environment
- Transaction requirements

#### Business Logic (15 min)
- Payment thresholds
- Refund policies
- User experience preferences
- Support processes

#### Next Steps (10 min)
- Timeline confirmation
- Documentation handoff
- Follow-up meetings
- Action items

---

## Post-Meeting Action Items

After the meeting, update this document with:

- [ ] Actual webhook URL (production and sandbox)
- [ ] Authentication method confirmed
- [ ] Payment threshold confirmed
- [ ] Timeout policy confirmed
- [ ] Test environment details
- [ ] Support contacts
- [ ] Any special requirements
- [ ] Fill in all `[TO BE FILLED]` sections in Cursor Plan prompt

Then use the updated Cursor Plan prompt to generate the implementation plan.

---

## Notes Section

### Meeting Notes (Date: ___________)

**Attendees:**
- WeSplit: _________________
- SP3ND: _________________

**Key Decisions:**
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

**Open Questions:**
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

**Action Items:**
- [ ] _________________________________________________
- [ ] _________________________________________________
- [ ] _________________________________________________

---

**Document Version**: 1.0  
**Created**: 2025-01-XX  
**Next Review**: After SP3ND meeting

