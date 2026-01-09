# Referral Security Fixes Testing Guide

**Date:** 2025-01-27  
**Status:** Testing Checklist for Applied Security Fixes  
**Purpose:** Verify all critical security fixes are working correctly

---

## Overview

This guide tests the security fixes applied to the referral system:
1. ✅ Firestore security rules
2. ✅ Transaction fixes (deterministic ID, no getDocs)
3. ✅ User ID privacy protection
4. ✅ Account status validation
5. ✅ Authorization checks
6. ✅ Privacy protection (removed referredUserName)

---

## Prerequisites

1. **Test Accounts:** At least 3 test accounts:
   - User A (active account with referral code)
   - User B (new user for signup)
   - User C (suspended/deleted account - optional)

2. **Firebase Console Access:** To verify Firestore rules and data

3. **Development Environment:** App running with logging enabled

---

## Test 1: Firestore Security Rules

### Test 1.1: Verify Rules Are Deployed

**Steps:**
1. Check `config/deployment/firestore.rules` contains referrals rules
2. Deploy rules: `firebase deploy --only firestore:rules`
3. Verify deployment in Firebase Console

**Expected:**
- ✅ Rules file contains `match /referrals/{referralId}` section
- ✅ Rules deployed successfully
- ✅ No deployment errors

**Verification:**
```bash
# Check rules file
cat config/deployment/firestore.rules | grep -A 10 "referrals"

# Deploy rules
firebase deploy --only firestore:rules
```

### Test 1.2: Test Unauthorized Access Prevention

**Steps:**
1. Create a referral: User B signs up with User A's code
2. As User C (different user), try to read User A's referrals
3. Try to create a fake referral record
4. Try to update an existing referral

**Expected:**
- ✅ User C cannot read User A's referrals (Firestore permission denied)
- ✅ User C cannot create referrals for other users
- ✅ User C cannot update referrals they're not involved in
- ✅ Only User A can read their own referrals
- ✅ Only User B (referred user) can read referrals where they're the referred user

**Verification:**
```javascript
// In Firebase Console or test script
// As User C, try to read User A's referral
const referralRef = db.collection('referrals').doc('ref_userA_userB');
await referralRef.get(); // Should fail with permission denied

// As User A, should succeed
const userAReferrals = await db.collection('referrals')
  .where('referrerId', '==', 'userA_id')
  .get(); // Should succeed
```

---

## Test 2: Transaction Fixes

### Test 2.1: Verify Deterministic ID Works

**Steps:**
1. User B signs up with User A's referral code
2. Check Firestore for referral record
3. Try to create the same referral again (idempotency test)

**Expected:**
- ✅ Referral ID is: `ref_userA_id_userB_id` (deterministic, no timestamp)
- ✅ Second attempt doesn't create duplicate
- ✅ Transaction succeeds or fails atomically

**Verification:**
```javascript
// Check referral ID format
const referral = await db.collection('referrals')
  .where('referrerId', '==', 'userA_id')
  .where('referredUserId', '==', 'userB_id')
  .get();

console.assert(referral.docs.length === 1, 'Should have exactly one referral');
console.assert(referral.docs[0].id === 'ref_userA_id_userB_id', 'ID should be deterministic');
```

### Test 2.2: Test Atomic Transaction

**Steps:**
1. Create referral via `trackReferral()`
2. Check both:
   - Referral record exists in `referrals` collection
   - `referred_by` field is set on User B's document

**Expected:**
- ✅ Both operations succeed together
- ✅ If one fails, both fail (atomicity)
- ✅ No partial state where referral exists but `referred_by` is missing

**Verification:**
```javascript
// After referral creation
const userB = await db.collection('users').doc('userB_id').get();
const referral = await db.collection('referrals').doc('ref_userA_id_userB_id').get();

console.assert(referral.exists, 'Referral record should exist');
console.assert(userB.data().referred_by === 'userA_id', 'referred_by should be set');
```

### Test 2.3: Test Idempotency

**Steps:**
1. User B signs up with User A's code (creates referral)
2. Call `trackReferral()` again with same parameters
3. Check Firestore

**Expected:**
- ✅ Only ONE referral record exists
- ✅ No duplicate referrals created
- ✅ `referred_by` is still set correctly
- ✅ Logs show "Referral already exists" message

**Verification:**
```javascript
// Call trackReferral twice
await referralService.trackReferral('userB_id', 'USERACODE');
await referralService.trackReferral('userB_id', 'USERACODE');

// Check only one referral exists
const referrals = await db.collection('referrals')
  .where('referrerId', '==', 'userA_id')
  .where('referredUserId', '==', 'userB_id')
  .get();

console.assert(referrals.size === 1, 'Should have exactly one referral');
```

---

## Test 3: User ID Privacy Protection

### Test 3.1: Verify validateReferralCode Doesn't Expose User ID

**Steps:**
1. Call `validateReferralCode('USERACODE')` from frontend
2. Check response structure
3. Verify no user ID is returned

**Expected:**
- ✅ Response is: `{ exists: boolean, error?: string }`
- ✅ No `id` or `referrerId` field in response
- ✅ User ID is not exposed to frontend

**Verification:**
```typescript
// In CreateProfileScreen or test
const validation = await referralService.validateReferralCode('USERACODE');
console.assert('exists' in validation, 'Should have exists field');
console.assert(!('id' in validation), 'Should NOT have id field');
console.assert(!('referrerId' in validation), 'Should NOT have referrerId field');
```

### Test 3.2: Verify findReferrerByCode Is Private

**Steps:**
1. Try to call `findReferrerByCode()` from frontend code
2. Check TypeScript compilation

**Expected:**
- ✅ `findReferrerByCode()` is marked `private` in TypeScript
- ✅ Frontend code cannot access it (TypeScript error)
- ✅ Only internal service methods can use it

**Verification:**
```typescript
// This should cause TypeScript error
const result = await referralService.findReferrerByCode('CODE'); // ❌ Error: Property is private
```

---

## Test 4: Account Status Validation

### Test 4.1: Test Suspended Account Rejection

**Steps:**
1. Suspend User A's account (set `status: 'suspended'` in Firestore)
2. User B tries to sign up with User A's referral code
3. Check validation and tracking

**Expected:**
- ✅ `validateReferralCode()` returns `{ exists: false, error: 'This referral code is no longer valid.' }`
- ✅ `trackReferral()` returns `{ success: false, error: 'This referral code is no longer valid' }`
- ✅ No referral record is created
- ✅ No rewards are awarded

**Verification:**
```javascript
// Suspend user
await db.collection('users').doc('userA_id').update({ status: 'suspended' });

// Try validation
const validation = await referralService.validateReferralCode('USERACODE');
console.assert(validation.exists === false, 'Should return false for suspended account');
console.assert(validation.error?.includes('no longer valid'), 'Should have appropriate error');

// Try tracking
const result = await referralService.trackReferral('userB_id', 'USERACODE');
console.assert(result.success === false, 'Should fail for suspended account');
```

### Test 4.2: Test Deleted Account Rejection

**Steps:**
1. Delete User A's account (set `status: 'deleted'`)
2. Repeat Test 4.1

**Expected:**
- ✅ Same behavior as suspended account
- ✅ Deleted accounts cannot receive referral rewards

---

## Test 5: Authorization Checks

### Test 5.1: Test getUserReferrals Authorization

**Steps:**
1. As User A, call `getUserReferrals(userA_id, userA_id)`
2. As User C, try to call `getUserReferrals(userA_id, userC_id)`
3. Check results

**Expected:**
- ✅ User A can view their own referrals
- ✅ User C gets error: "Unauthorized: Cannot view other users' referrals"
- ✅ Exception is thrown for unauthorized access

**Verification:**
```typescript
// Authorized access
const userAReferrals = await referralService.getUserReferrals('userA_id', 'userA_id');
console.assert(Array.isArray(userAReferrals), 'Should return array');

// Unauthorized access
try {
  await referralService.getUserReferrals('userA_id', 'userC_id');
  console.assert(false, 'Should throw error');
} catch (error) {
  console.assert(error.message.includes('Unauthorized'), 'Should throw unauthorized error');
}
```

---

## Test 6: Privacy Protection (referredUserName)

### Test 6.1: Verify referredUserName Not Stored

**Steps:**
1. Create a new referral
2. Check referral record in Firestore
3. Verify `referredUserName` field

**Expected:**
- ✅ New referral records do NOT have `referredUserName` field
- ✅ Old referral records may still have it (backward compatibility)
- ✅ Privacy is protected for new referrals

**Verification:**
```javascript
// Check new referral
const newReferral = await db.collection('referrals').doc('ref_userA_userB').get();
const data = newReferral.data();

console.assert(!data.referredUserName, 'New referrals should not have referredUserName');
console.assert(data.referrerId, 'Should have referrerId');
console.assert(data.referredUserId, 'Should have referredUserId');
```

---

## Test 7: Code Generation Uniqueness

### Test 7.1: Test Improved Code Generation

**Steps:**
1. Generate 100 referral codes rapidly
2. Check for duplicates
3. Verify format

**Expected:**
- ✅ All codes are unique (no duplicates)
- ✅ Codes are 8-12 characters
- ✅ Codes include random suffix (better uniqueness)

**Verification:**
```javascript
const codes = [];
for (let i = 0; i < 100; i++) {
  const code = referralService.generateReferralCode('testUserId123456789');
  codes.push(code);
}

const uniqueCodes = new Set(codes);
console.assert(codes.length === uniqueCodes.size, 'All codes should be unique');
console.assert(codes.every(c => c.length >= 8 && c.length <= 12), 'All codes should be valid length');
```

---

## Test 8: End-to-End Flow

### Test 8.1: Complete Secure Referral Flow

**Steps:**
1. User A shares referral code
2. User B opens referral link (deep link)
3. User B signs up with referral code
4. Verify all security checks pass
5. Check final state

**Expected:**
- ✅ Deep link preserves referral code through navigation
- ✅ Code validation uses `validateReferralCode()` (no user ID exposed)
- ✅ Account status is validated
- ✅ Transaction creates referral atomically
- ✅ Firestore rules prevent unauthorized access
- ✅ No privacy leaks (no user IDs, no names in referral records)

**Verification Checklist:**
- [ ] Referral code pre-filled in CreateProfileScreen
- [ ] Validation succeeds without exposing user ID
- [ ] Account status check passes
- [ ] Referral record created with deterministic ID
- [ ] `referred_by` field set atomically
- [ ] No `referredUserName` in new referral record
- [ ] User A can view their referrals
- [ ] User C cannot view User A's referrals
- [ ] Rewards awarded correctly

---

## Test 9: Error Handling

### Test 9.1: Test Rate Limiting

**Steps:**
1. Rapidly validate 30+ referral codes
2. Check rate limit behavior

**Expected:**
- ✅ First 30 requests succeed
- ✅ 31st request returns error: "Too many referral code lookups..."
- ✅ Error message includes wait time

**Verification:**
```typescript
// Rapid validation
for (let i = 0; i < 35; i++) {
  const result = await referralService.validateReferralCode('TESTCODE', 'testUser');
  if (i >= 30) {
    console.assert(result.exists === false, 'Should be rate limited');
    console.assert(result.error?.includes('Too many'), 'Should have rate limit error');
  }
}
```

### Test 9.2: Test Transaction Error Handling

**Steps:**
1. Create referral successfully
2. Try to create duplicate (should handle gracefully)
3. Check logs

**Expected:**
- ✅ Duplicate creation doesn't throw unhandled error
- ✅ Idempotency handled gracefully
- ✅ Logs show "Referral already exists" message
- ✅ Returns success (idempotent operation)

---

## Test 10: Backward Compatibility

### Test 10.1: Verify Old Referrals Still Work

**Steps:**
1. Check existing referral records (may have `referredUserName`)
2. Verify `getUserReferrals()` still works
3. Verify old referral data is readable

**Expected:**
- ✅ Old referrals with `referredUserName` still work
- ✅ Code handles missing `referredUserName` gracefully
- ✅ No breaking changes for existing data

---

## Quick Test Script

Run this in your app's console or test environment:

```typescript
// Quick security test
async function testReferralSecurity() {
  console.log('🧪 Testing Referral Security Fixes...\n');

  // Test 1: validateReferralCode doesn't expose user ID
  const validation = await referralService.validateReferralCode('TESTCODE');
  console.assert(!('id' in validation), '✅ User ID not exposed');
  console.assert('exists' in validation, '✅ Returns exists boolean');

  // Test 2: getUserReferrals requires authorization
  try {
    await referralService.getUserReferrals('userA_id', 'userC_id');
    console.assert(false, '❌ Authorization check failed');
  } catch (error) {
    console.assert(error.message.includes('Unauthorized'), '✅ Authorization check works');
  }

  // Test 3: Account status validation
  // (Requires suspended account setup)
  
  console.log('\n✅ Security tests passed!');
}

testReferralSecurity();
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Firestore rules deployed and tested
- [ ] Transaction fixes verified (no getDocs errors)
- [ ] User ID privacy confirmed (validateReferralCode works)
- [ ] Account status validation tested
- [ ] Authorization checks working
- [ ] Privacy protection verified (no referredUserName in new records)
- [ ] Code generation uniqueness improved
- [ ] Idempotency working correctly
- [ ] Error handling tested
- [ ] Backward compatibility verified

---

## Troubleshooting

### Issue: Firestore Permission Denied

**Check:**
- Rules are deployed: `firebase deploy --only firestore:rules`
- User is authenticated
- User ID matches referrerId or referredUserId

### Issue: Transaction Fails

**Check:**
- No `getDocs()` calls in transaction
- Using `transaction.get()` for individual documents
- Deterministic ID format is correct

### Issue: User ID Still Exposed

**Check:**
- Frontend uses `validateReferralCode()` not `findReferrerByCode()`
- `findReferrerByCode()` is marked `private`
- No direct Firestore queries from frontend

---

## Success Criteria

All tests should pass:
- ✅ Firestore rules prevent unauthorized access
- ✅ Transactions work without errors
- ✅ User IDs not exposed to frontend
- ✅ Account status validated
- ✅ Authorization checks enforced
- ✅ Privacy protected (no names in referral records)
- ✅ Code generation is unique
- ✅ Idempotency works correctly

---

## Related Documentation

- [Referral System Security Audit](../audits/REFERRAL_SYSTEM_SECURITY_AUDIT.md)
- [Referral System Testing Guide](./REFERRAL_SYSTEM_TESTING_GUIDE.md)
- [Referral Deep Link Testing](./REFERRAL_DEEP_LINK_TESTING.md)
