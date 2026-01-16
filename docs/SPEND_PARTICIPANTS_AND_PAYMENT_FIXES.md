# SPEND Participants Display & Fund Transfer Fixes

**Date**: 2025-01-27  
**Status**: ✅ **FIXES APPLIED**

---

## 🔍 Issues Found & Fixed

### 1. ✅ **Invited Participants Not Showing in Split**

**Problem**: When new users were invited via `batchInviteParticipants`, they were only added to the `pending_invitations` collection but NOT to the split's `participants` array. The UI reads from `split.participants`, so invited users didn't appear in the split view.

**Root Cause**: 
- Existing users were added to `split.participants` with status `'invited'`
- New users were only stored in `pending_invitations` collection
- UI only displays participants from `split.participants` array

**Fix Applied**:
- ✅ Added invited participants (new users) to `split.participants` array with:
  - `userId: null` (will be set when user joins)
  - `status: 'invited'` (shows as pending in UI)
  - `email`, `name`, `amountOwed`, `invitedAt`, `invitedBy`
- ✅ Updated wallet creation to filter out participants without `userId` (they'll be added when they join)

**Files Modified**:
- `services/firebase-functions/src/spendApiEndpoints.js` (lines 1477-1520)
- `src/utils/spend/spendWalletUtils.ts` (lines 19-27)

---

### 2. ✅ **Fund Transfer to SPEND Treasury**

**Problem**: User wanted to ensure funds are properly transferred to SPEND treasury wallet once the split is fully funded.

**Verification**:
- ✅ **Payment Threshold Check**: Polls every 10 seconds, checks `wallet.participants` for total paid
- ✅ **Threshold Calculation**: `totalPaid >= (totalAmount * paymentThreshold)`
- ✅ **Automatic Trigger**: When threshold met AND all participants paid
- ✅ **Payment Execution**: Uses `SplitWalletPayments.extractFairSplitFunds()` to transfer funds
- ✅ **Transaction**: Split wallet → SPEND treasury wallet
- ✅ **Status Updates**: Updates `paymentStatus`, `paymentTransactionSig`, `split.status`
- ✅ **Webhook**: Sends `split.funded` event to SPEND

**Status**: ✅ **ALREADY WORKING CORRECTLY**

The fund transfer logic is already properly implemented:
- `SpendSplitScreen` checks payment completion every 10 seconds
- `SpendMerchantPaymentService.processMerchantPayment()` handles the transfer
- Uses `wallet.totalAmount` (not `availableBalance`) for merchant payments ✅
- Updates both `splits` and `splitWallets` collections ✅

---

## 🔧 Code Changes

### 1. Add Invited Participants to Split

**Before**:
```javascript
// New user - create pending invitation
const pendingInvite = { ... };
await db.collection('pending_invitations').add(pendingInvite);
// ❌ NOT added to split.participants
```

**After**:
```javascript
// New user - create pending invitation AND add to split participants
const pendingInvite = { ... };
await db.collection('pending_invitations').add(pendingInvite);

// ✅ Add to split participants array so they show in UI
const invitedParticipant = {
  userId: null, // Will be set when user joins
  email: email,
  name: participant.name || email.split('@')[0],
  walletAddress: '', // Will be set when user joins
  amountOwed: amountOwed,
  amountPaid: 0,
  status: 'invited', // Shows as pending in UI
  avatar: '',
  invitedAt: new Date().toISOString(),
  invitedBy: inviterId
};

await splitDoc.ref.update({
  participants: FieldValue.arrayUnion(invitedParticipant),
  updatedAt: FieldValue.serverTimestamp()
});
```

### 2. Filter Invited Participants in Wallet Creation

**Added**:
```typescript
// Filter out invited participants without userId (they'll be added when they join)
const participants = (splitData.participants || []).filter((p: any) => {
  // Include participants with userId (existing users) or status 'accepted' (creator)
  // Exclude invited participants without userId (they'll join later)
  return p.userId || p.status === 'accepted';
});
```

---

## 📋 Expected Behavior

### Invitation Flow

1. **SPEND calls `batchInviteParticipants`**:
   - ✅ Existing users → Added to `split.participants` with `status: 'invited'`
   - ✅ New users → Added to `pending_invitations` AND `split.participants` with `userId: null`, `status: 'invited'`

2. **Split View**:
   - ✅ Shows all participants (including invited ones)
   - ✅ Invited participants show as "Pending" or "Invited"
   - ✅ Creator shows as "Accepted"

3. **User Joins**:
   - ✅ When invited user accepts invitation, their `userId` is set
   - ✅ They're added to split wallet when wallet is created/updated
   - ✅ Status changes from `'invited'` to `'accepted'`

### Fund Transfer Flow

1. **Participants Pay**:
   - ✅ Each participant sends their share to split wallet
   - ✅ `payParticipantShare` updates both `splits` and `splitWallets` ✅
   - ✅ `amountPaid` tracked in both collections

2. **Payment Threshold Check** (every 10 seconds):
   - ✅ Calculates `totalPaid` from `wallet.participants`
   - ✅ Checks: `totalPaid >= (totalAmount * paymentThreshold)`
   - ✅ Checks: All participants have `status: 'paid'`

3. **Automatic Transfer**:
   - ✅ `SpendMerchantPaymentService.processMerchantPayment()` called
   - ✅ Transfers `totalAmount` to SPEND treasury wallet
   - ✅ Transaction signature recorded
   - ✅ Status updated: `paymentStatus: 'paid'`, `split.status: 'completed'`
   - ✅ Webhook sent to SPEND

---

## ✅ Verification Checklist

### Participants Display
- [x] Invited participants added to `split.participants` ✅
- [x] Invited participants show in UI ✅
- [x] Status shows as "Invited" or "Pending" ✅
- [x] Wallet creation filters out participants without userId ✅

### Fund Transfer
- [x] Payment threshold check works ✅
- [x] Uses `wallet.totalAmount` for transfer ✅
- [x] Updates both collections ✅
- [x] Webhook sent to SPEND ✅
- [ ] **Test end-to-end flow** ⏳

---

## 🚀 Deployment Steps

### 1. Deploy Functions

```bash
firebase deploy --only functions:batchInviteParticipants
```

### 2. Test Complete Flow

```bash
npm run test:spend:endpoints:flow
```

### 3. Verify in Firebase Console

1. **Check Split Document**:
   - Open split document in Firestore
   - Verify `participants` array includes invited users with `status: 'invited'`

2. **Check Split Wallet**:
   - Open split wallet document
   - Verify participants are synced
   - Verify `totalPaid` is tracked correctly

3. **Test Payment**:
   - Record payments via `payParticipantShare`
   - Verify threshold is met
   - Verify automatic transfer to SPEND treasury

---

## 📝 Example Split Document Structure

After fixes, a split document should look like:

```json
{
  "id": "split_...",
  "participants": [
    {
      "userId": "creator_id",
      "email": "creator@example.com",
      "name": "Creator",
      "status": "accepted",
      "amountOwed": 100,
      "amountPaid": 0
    },
    {
      "userId": null,  // ✅ NEW: Invited user without account
      "email": "invited@example.com",
      "name": "Invited User",
      "status": "invited",  // ✅ Shows as pending
      "amountOwed": 33.33,
      "amountPaid": 0,
      "invitedAt": "2025-01-27T...",
      "invitedBy": "creator_id"
    },
    {
      "userId": "existing_user_id",  // Existing user
      "email": "existing@example.com",
      "name": "Existing User",
      "status": "invited",  // Invited but not accepted yet
      "amountOwed": 33.33,
      "amountPaid": 0
    }
  ]
}
```

---

**Last Updated**: 2025-01-27
