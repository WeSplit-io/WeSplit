# Referral System Testing Guide

**Date:** 2025-01-27  
**Status:** Complete Testing Checklist  
**Purpose:** Comprehensive end-to-end testing for the referral code system

---

## Overview

This guide provides step-by-step testing procedures to verify all aspects of the referral code system work correctly, including:
- Code generation and uniqueness
- Deep link handling
- Self-referral prevention
- Rate limiting
- Transaction atomicity
- QR code generation
- Reward awarding

---

## Prerequisites

1. **Test Accounts**: Have at least 2-3 test accounts ready
2. **Firebase Console Access**: To verify Firestore data
3. **Device with App Installed**: For deep link testing
4. **Development Logs**: Enable logging to see detailed flow

---

## 1. Code Generation & Storage Tests

### Test 1.1: New User Gets Referral Code

**Steps:**
1. Create a new user account (phone or email)
2. Complete onboarding
3. Navigate to Referral screen

**Expected Results:**
- ✅ User has a `referral_code` field in Firestore (`users/{userId}`)
- ✅ Code is 8-12 characters, uppercase
- ✅ Code is displayed in ReferralScreen
- ✅ Code persists across app restarts

**Verification:**
```bash
# In Firebase Console or via script
# Check: users/{userId}.referral_code exists and is valid
```

### Test 1.2: Existing User Keeps Same Code

**Steps:**
1. Open ReferralScreen for existing user
2. Note the referral code
3. Close and reopen ReferralScreen
4. Check code again

**Expected Results:**
- ✅ Same referral code is displayed
- ✅ No new code generated
- ✅ No duplicate codes in Firestore

**Verification:**
- Code should match exactly
- Check Firestore: only one `referral_code` value for this user

### Test 1.3: Code Uniqueness

**Steps:**
1. Create 10+ new users rapidly
2. Check all referral codes in Firestore

**Expected Results:**
- ✅ All codes are unique (no duplicates)
- ✅ All codes are valid format (8-12 chars, uppercase)

**Verification:**
```javascript
// Query Firestore
const users = await db.collection('users').get();
const codes = users.docs.map(d => d.data().referral_code).filter(Boolean);
const uniqueCodes = new Set(codes);
console.assert(codes.length === uniqueCodes.size, 'Duplicate codes found!');
```

---

## 2. Deep Link Tests

### Test 2.1: Universal Link Opens App (Not Logged In)

**Steps:**
1. Log out of app (or use fresh install)
2. Share referral link: `https://wesplit-deeplinks.web.app/referral?code=TESTCODE123`
3. Open link on device with app installed

**Expected Results:**
- ✅ App opens automatically
- ✅ Navigates to `AuthMethods` screen
- ✅ After authentication, `CreateProfileScreen` shows referral modal
- ✅ Referral code is pre-filled and validated

**Verification:**
- Check logs for: "Received referral deep link for unauthenticated user"
- Verify `route.params.referralCode` is set

### Test 2.2: Universal Link Opens App (Already Logged In)

**Steps:**
1. Log into app with existing account
2. Open referral link: `https://wesplit-deeplinks.web.app/referral?code=SOMEONEELSESCODE`
3. Observe behavior

**Expected Results:**
- ✅ App opens
- ✅ Shows informational alert: "Referral codes are applied when creating a new account..."
- ✅ No referral is applied to existing account

**Verification:**
- Check logs for: "Referral deep link opened by already-authenticated user"
- Verify no `referred_by` field is changed for existing user

### Test 2.3: App-Scheme Link

**Steps:**
1. Log out of app
2. Open: `wesplit://referral/TESTCODE123` (via URL scheme handler or test tool)
3. Complete onboarding

**Expected Results:**
- ✅ Same behavior as universal link
- ✅ Referral code is applied during signup

---

## 3. Code Input & Validation Tests

### Test 3.1: Valid Code Entry

**Steps:**
1. Start new account creation
2. When asked "Do you have a referral code?", select "Yes"
3. Enter a valid referral code (from another test user)
4. Wait for validation

**Expected Results:**
- ✅ Green checkmark appears after validation
- ✅ "Valid referral code" message shown
- ✅ Continue button is enabled
- ✅ Code is normalized (uppercase, no spaces)

**Verification:**
- Check validation state: `isValid === true`
- Check logs: "Referral code validated successfully"

### Test 3.2: Invalid Code Entry

**Steps:**
1. Start new account creation
2. Enter invalid code: `INVALID123`
3. Wait for validation

**Expected Results:**
- ✅ Red X icon appears
- ✅ Error message: "Referral code not found. Please check and try again."
- ✅ Continue button is disabled

**Verification:**
- Check validation state: `isValid === false`
- Check logs: "Referral code not found"

### Test 3.3: Code Too Short

**Steps:**
1. Enter code with < 8 characters: `SHORT`
2. Observe validation

**Expected Results:**
- ✅ Immediate error: "Referral code must be at least 8 characters"
- ✅ No API call made (client-side validation)

### Test 3.4: Self-Referral Prevention

**Steps:**
1. Get User A's referral code
2. Start creating account for User A (same user)
3. Try to enter User A's own referral code

**Expected Results:**
- ✅ Code validation may pass (code exists)
- ✅ But during `trackReferral()`, self-referral is blocked
- ✅ No referral record created with `referrerId === referredUserId`
- ✅ Logs show: "Self-referral attempt blocked"

**Verification:**
- Check Firestore: No referral document where `referrerId === referredUserId`
- Check logs for self-referral warning

### Test 3.5: Rate Limiting

**Steps:**
1. Rapidly validate 30+ different referral codes (or same code 30+ times)
2. Observe behavior

**Expected Results:**
- ✅ First 30 requests succeed
- ✅ 31st request fails with: "Too many referral code lookups. Please wait X minutes."
- ✅ After 15 minutes, rate limit resets

**Verification:**
- Check logs for rate limit warnings
- Verify rate limit is per-user (if userId provided) or per-session

---

## 4. Referral Tracking & Rewards Tests

### Test 4.1: Happy Path Referral

**Steps:**
1. User A has referral code: `REFCODE123`
2. User B signs up using `REFCODE123`
3. User B completes profile creation

**Expected Results:**
- ✅ Firestore `users/B.referred_by === A.id`
- ✅ Firestore `referrals` collection has document:
  - `referrerId === A.id`
  - `referredUserId === B.id`
  - `status === 'active'`
  - `milestones.accountCreated.achieved === true`
- ✅ User A receives points (check points balance increased)
- ✅ Logs show: "Referral tracked successfully"

**Verification:**
```javascript
// In Firebase Console or script
const referral = await db.collection('referrals')
  .where('referrerId', '==', 'userA_id')
  .where('referredUserId', '==', 'userB_id')
  .get();

console.assert(!referral.empty, 'Referral record should exist');
console.assert(userB.referred_by === 'userA_id', 'referred_by should be set');
```

### Test 4.2: Idempotency (Duplicate Prevention)

**Steps:**
1. User B signs up with User A's code (creates referral)
2. Manually call `trackReferral(B.id, A_code)` again (via script or debug)
3. Check Firestore

**Expected Results:**
- ✅ Only ONE referral document exists for (A → B)
- ✅ No duplicate referral records
- ✅ `referred_by` is still set correctly
- ✅ Points are NOT awarded twice
- ✅ Logs show: "Referral already exists between users, skipping duplicate creation"

**Verification:**
```javascript
const referrals = await db.collection('referrals')
  .where('referrerId', '==', 'userA_id')
  .where('referredUserId', '==', 'userB_id')
  .get();

console.assert(referrals.size === 1, 'Should have exactly one referral record');
```

### Test 4.3: Transaction Atomicity

**Steps:**
1. Simulate network failure during referral creation
2. Check Firestore state

**Expected Results:**
- ✅ Either BOTH referral record AND `referred_by` are set, OR NEITHER is set
- ✅ No partial state where referral exists but `referred_by` is missing (or vice versa)

**Verification:**
- This is hard to test manually, but transaction ensures atomicity
- Check logs for transaction success/failure

### Test 4.4: First Split Reward

**Steps:**
1. User B (referred by A) creates a split > $10
2. User B completes the split (pays their portion)
3. Check rewards

**Expected Results:**
- ✅ User A receives first split referral reward points
- ✅ Firestore referral document updated:
  - `milestones.firstSplit.achieved === true`
  - `rewardsAwarded.firstSplitOver10 === true`
  - `status === 'completed'` (if all rewards awarded)
- ✅ Logs show: "Friend first split reward awarded"

**Verification:**
```javascript
const referral = await getReferral('userA_id', 'userB_id');
console.assert(referral.milestones.firstSplit.achieved === true);
console.assert(referral.rewardsAwarded.firstSplitOver10 === true);
```

### Test 4.5: First Split Reward Not Duplicated

**Steps:**
1. User B completes first split > $10 (reward awarded to A)
2. User B completes second split > $10
3. Check rewards

**Expected Results:**
- ✅ User A receives reward ONLY for first split
- ✅ Second split does NOT trigger additional reward
- ✅ Logs show: "Friend first split reward already awarded"

---

## 5. Sharing & QR Code Tests

### Test 5.1: Share Message Contains Deep Link

**Steps:**
1. Open ReferralScreen
2. Tap "Share" button
3. Check shared message

**Expected Results:**
- ✅ Message includes: `https://wesplit-deeplinks.web.app/referral?code=...`
- ✅ Message includes Telegram download link
- ✅ Message includes raw referral code as fallback

### Test 5.2: QR Code Generation

**Steps:**
1. Open ReferralScreen
2. Tap "QR Code" button
3. Observe QR modal

**Expected Results:**
- ✅ Modal opens with QR code displayed
- ✅ QR code contains: `https://wesplit-deeplinks.web.app/referral?code=...`
- ✅ QR code is scannable
- ✅ Copy/Share buttons work

**Verification:**
- Scan QR code with another device
- Should open the referral link

### Test 5.3: QR Code Scanning

**Steps:**
1. Generate QR code for User A's referral
2. Scan with device B (not logged in)
3. Complete signup

**Expected Results:**
- ✅ QR code scans correctly
- ✅ Opens referral link
- ✅ Referral is applied during signup

---

## 6. Error Handling Tests

### Test 6.1: Network Failure During Referral Tracking

**Steps:**
1. Start signup with referral code
2. Simulate network failure (airplane mode) during `trackReferral()`
3. Check logs

**Expected Results:**
- ✅ Error is logged (not swallowed)
- ✅ User account creation still succeeds (referral is non-blocking)
- ✅ Logs show: "Error tracking referral" or "Background referral tracking task failed"

### Test 6.2: Invalid Code During Profile Creation

**Steps:**
1. Enter invalid code during signup
2. Complete profile creation anyway (skip validation)

**Expected Results:**
- ✅ Profile creation succeeds
- ✅ Referral tracking fails gracefully
- ✅ User is not blocked from completing signup
- ✅ Logs show referral tracking failure

---

## 7. Edge Cases & Security Tests

### Test 7.1: Code Enumeration Prevention

**Steps:**
1. Try to validate 100+ random codes rapidly
2. Observe rate limiting

**Expected Results:**
- ✅ After 30 requests, rate limit kicks in
- ✅ Error message: "Too many referral code lookups..."
- ✅ Legitimate users can still validate codes (rate limit is per-user)

### Test 7.2: Case Sensitivity

**Steps:**
1. User A has code: `ABC123XYZ`
2. User B enters: `abc123xyz` (lowercase)
3. User B enters: `AbC 123 XyZ` (mixed case with spaces)

**Expected Results:**
- ✅ Code is normalized to `ABC123XYZ`
- ✅ Code validation succeeds
- ✅ Referral tracking works correctly

### Test 7.3: Special Characters

**Steps:**
1. Try entering code with special characters: `ABC@123!XYZ`
2. Observe behavior

**Expected Results:**
- ✅ Code is normalized (special chars may remain, but spaces removed, uppercased)
- ✅ Validation checks if normalized code exists

---

## 8. Integration Tests

### Test 8.1: Complete End-to-End Flow

**Steps:**
1. User A shares referral code via QR/Share
2. User B scans/clicks link
3. User B signs up with referral code
4. User B completes first split > $10
5. Verify all rewards

**Expected Results:**
- ✅ All steps complete successfully
- ✅ User A receives both rewards (account creation + first split)
- ✅ All Firestore data is consistent
- ✅ No duplicate records
- ✅ All logs show success

### Test 8.2: Multiple Simultaneous Referrals

**Steps:**
1. User A shares code with 5 friends
2. All 5 sign up simultaneously
3. Check Firestore

**Expected Results:**
- ✅ All 5 referral records created
- ✅ All 5 `referred_by` fields set correctly
- ✅ No race conditions or duplicate records
- ✅ User A receives rewards for all 5 referrals

---

## 9. Performance Tests

### Test 9.1: Code Validation Response Time

**Steps:**
1. Measure time for `findReferrerByCode()` calls
2. Test with valid and invalid codes

**Expected Results:**
- ✅ Validation completes in < 1 second
- ✅ Rate limiting doesn't significantly slow down legitimate requests

### Test 9.2: Transaction Performance

**Steps:**
1. Measure time for `createReferralRecordWithTransaction()`
2. Test under load

**Expected Results:**
- ✅ Transaction completes in < 2 seconds
- ✅ No timeout errors under normal load

---

## 10. Manual Testing Checklist

Use this checklist for quick manual verification:

- [ ] New user gets referral code automatically
- [ ] Existing user keeps same code
- [ ] Referral code is 8-12 characters, uppercase
- [ ] Share button includes deep link
- [ ] QR code button opens modal with scannable QR
- [ ] Deep link opens app and routes to auth
- [ ] Referral code pre-fills in CreateProfileScreen
- [ ] Valid code shows green checkmark
- [ ] Invalid code shows error
- [ ] Self-referral is blocked
- [ ] Referral record created in Firestore
- [ ] `referred_by` field set correctly
- [ ] Referrer receives account creation reward
- [ ] Referrer receives first split reward
- [ ] Rewards not duplicated
- [ ] Rate limiting works (30 requests/15min)
- [ ] Errors are logged (not swallowed)
- [ ] Account creation succeeds even if referral fails

---

## 11. Automated Test Script (Optional)

Create a test script to verify Firestore invariants:

```javascript
// scripts/test-referral-invariants.js
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function testReferralInvariants() {
  console.log('Testing referral system invariants...\n');

  // Test 1: No self-referrals
  const referrals = await db.collection('referrals').get();
  const selfReferrals = referrals.docs.filter(doc => {
    const data = doc.data();
    return data.referrerId === data.referredUserId;
  });
  console.assert(selfReferrals.length === 0, `Found ${selfReferrals.length} self-referrals!`);

  // Test 2: All referrals have referred_by set
  const users = await db.collection('users').get();
  const usersWithReferrals = users.docs.filter(doc => {
    const data = doc.data();
    return data.referred_by;
  });
  
  for (const userDoc of usersWithReferrals) {
    const user = userDoc.data();
    const referral = await db.collection('referrals')
      .where('referredUserId', '==', userDoc.id)
      .where('referrerId', '==', user.referred_by)
      .get();
    console.assert(!referral.empty, `User ${userDoc.id} has referred_by but no referral record!`);
  }

  // Test 3: No duplicate referrals
  const referralPairs = new Set();
  for (const doc of referrals.docs) {
    const data = doc.data();
    const pair = `${data.referrerId}_${data.referredUserId}`;
    console.assert(!referralPairs.has(pair), `Duplicate referral: ${pair}`);
    referralPairs.add(pair);
  }

  console.log('✅ All invariants passed!');
}

testReferralInvariants().catch(console.error);
```

---

## 12. Common Issues & Troubleshooting

### Issue: Referral code not applying

**Check:**
1. Is code normalized correctly? (uppercase, no spaces)
2. Does referrer exist in Firestore?
3. Check logs for `trackReferral()` errors
4. Verify `referred_by` field is being set

### Issue: Rate limit errors during testing

**Solution:**
- Wait 15 minutes for rate limit to reset
- Or use different user IDs for testing
- Rate limit is per-identifier

### Issue: Duplicate referral records

**Check:**
1. Verify idempotency check is working
2. Check if `getReferral()` is finding existing referrals
3. Look for race conditions (should be prevented by transactions)

### Issue: Rewards not awarded

**Check:**
1. Verify referral record exists
2. Check reward configuration in `referralConfig.ts`
3. Check quest service logs
4. Verify season is correct

---

## Conclusion

After completing all tests above, the referral system should be verified as:
- ✅ Functionally correct
- ✅ Secure (rate limiting, self-referral prevention)
- ✅ Robust (transactions, idempotency, error handling)
- ✅ User-friendly (deep links, QR codes, clear validation)

If any test fails, refer to the specific section in the audit document for implementation details.
