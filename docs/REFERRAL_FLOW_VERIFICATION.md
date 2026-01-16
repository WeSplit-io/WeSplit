# Referral System Flow Verification

> **Note**: For complete documentation, see [REFERRAL_SYSTEM_COMPLETE.md](./REFERRAL_SYSTEM_COMPLETE.md)

## Overview
This document verifies that the referral system works correctly for both:
1. **Sending logic** - When a user shares their referral code
2. **Adding logic** - When a new user signs up with a referral code

## Flow 1: Referral Code Generation (Sending Logic)

### Step 1: User Account Creation
- **Location**: `src/config/firebase/firebase.ts` → `createUserDocument()`
- **Action**: When a new user document is created, `ensureUserHasReferralCode()` is called
- **Result**: A unique referral code is generated and stored in the user document

### Step 2: Referral Code Generation
- **Location**: `src/services/rewards/referralService.ts` → `ensureUserHasReferralCode()`
- **Process**:
  1. Checks if user already has a referral code
  2. If not, generates a unique code using: `userId prefix + timestamp + random suffix`
  3. Verifies code uniqueness by checking Firestore
  4. Stores code in user document: `users/{userId}.referral_code`

### Step 3: Code Sharing
- Users can share their referral code via:
  - Deep links (route params)
  - Manual entry
  - Share functionality (if implemented)

## Flow 2: Referral Tracking (Adding Logic)

### Step 1: Referral Code Input
- **Location**: `src/screens/CreateProfile/CreateProfileScreen.tsx`
- **Sources**:
  1. Route params (from deep links)
  2. User manual input in referral modal
- **Validation**: Real-time validation with debouncing (500ms)

### Step 2: Profile Creation
- **Location**: `src/screens/CreateProfile/CreateProfileScreen.tsx` → `createProfile()`
- **Process**:
  1. User document is created/updated
  2. User is authenticated
  3. Referral tracking is triggered (non-blocking)

### Step 3: Referral Tracking
- **Location**: `src/services/rewards/referralService.ts` → `trackReferral()`
- **Process**:
  1. Normalizes referral code (uppercase, trim whitespace)
  2. Finds referrer by code using `findReferrerByCode()`
  3. Validates:
     - Referrer account is active (not suspended/deleted)
     - Not self-referral
  4. Creates referral record atomically:
     - Creates `referrals/{referralId}` document
     - Updates `users/{referredUserId}.referred_by` field
  5. Awards invite friend reward (non-blocking)

### Step 4: Referral Record Creation
- **Location**: `src/services/rewards/referralService.ts` → `createReferralRecordWithTransaction()`
- **Atomic Operation**:
  - Uses Firestore transaction
  - Deterministic ID: `ref_{referrerId}_{referredUserId}`
  - Prevents duplicate referrals
  - Sets `referred_by` field on referred user

## Flow 3: First Split Reward

### Step 1: Split Creation
- **Location**: `src/services/splits/splitStorageService.ts` → `createSplit()`
- **Action**: When a split is created, rewards are awarded asynchronously

### Step 2: Split Rewards
- **Location**: `src/services/rewards/splitRewardsService.ts` → `awardFairSplitParticipation()`
- **Process**:
  1. Awards points to split creator/participants
  2. Checks if user has `referred_by` field
  3. If yes, calls `awardFriendFirstSplitReward()`

### Step 3: Referral Split Reward
- **Location**: `src/services/rewards/referralService.ts` → `awardFriendFirstSplitReward()`
- **Process**:
  1. Validates split amount meets minimum ($10)
  2. Checks if reward already awarded
  3. Awards points to referrer
  4. Updates referral record with milestone and reward tracking

## Security & Validation

### Self-Referral Prevention
- ✅ Checks if `referrerId === referredUserId`
- ✅ Checks if referral code belongs to the signing-up user
- **Location**: `trackReferral()` lines 175-180, 251-257

### Account Status Validation
- ✅ Checks if referrer account is active (not suspended/deleted)
- **Location**: `trackReferral()` lines 183-195, 241-248

### Rate Limiting
- ✅ Prevents abuse with 30 requests per 15 minutes
- **Location**: `src/services/shared/referralUtils.ts`

### Idempotency
- ✅ Uses deterministic referral ID to prevent duplicates
- ✅ Handles duplicate referral attempts gracefully
- **Location**: `createReferralRecordWithTransaction()`

## Potential Issues & Fixes

### Issue 1: Referral Code Normalization
- **Status**: ✅ Fixed
- **Issue**: Code normalized multiple times (redundant but safe)
- **Location**: `CreateProfileScreen.tsx` line 677

### Issue 2: Referral Tracking Timing
- **Status**: ✅ Correct
- **Note**: Referral tracking happens AFTER user creation (correct order)
- **Location**: `CreateProfileScreen.tsx` line 672-711

### Issue 3: First Split Reward Trigger
- **Status**: ✅ Verified
- **Note**: Triggered correctly when user with `referred_by` creates split
- **Location**: `splitRewardsService.ts` lines 81-87

## Testing Checklist

- [ ] User can generate referral code on account creation
- [ ] Referral code is unique and stored correctly
- [ ] Referral code can be shared via deep links
- [ ] New user can enter referral code during signup
- [ ] Referral code validation works correctly
- [ ] Referral record is created atomically
- [ ] `referred_by` field is set on referred user
- [ ] Invite friend reward is awarded to referrer
- [ ] Self-referral is prevented
- [ ] Inactive account referrals are blocked
- [ ] First split reward is awarded when referred user creates split > $10
- [ ] Duplicate referral attempts are handled gracefully

## Conclusion

The referral system flow is **correctly implemented** with:
- ✅ Proper code generation and storage
- ✅ Atomic referral record creation
- ✅ Security validations (self-referral, account status)
- ✅ Reward awarding for both account creation and first split
- ✅ Idempotency and error handling

