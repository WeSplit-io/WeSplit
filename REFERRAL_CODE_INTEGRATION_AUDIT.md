# Referral Code Integration Audit

**Date:** 2024-12-19  
**Status:** ✅ Ready for Implementation

## Overview

This document audits the codebase to identify the best place to add referral code input during account creation and verifies the database actions and relations for awarding points.

## Account Creation Flow

### Current Flow
1. **GetStartedScreen** → User starts onboarding
2. **AuthMethodsScreen** → User selects authentication method
3. **VerificationScreen** → User verifies email with 4-digit code
4. **CreateProfileScreen** → User creates profile (name, avatar)
5. **User Creation** → `firebaseDataService.user.createUser()` is called
6. **Onboarding Complete** → User is authenticated and navigated to Dashboard

### Best Place for Referral Code Input

**✅ Recommended: CreateProfileScreen**

**Reasoning:**
- User has already verified email (committed to signup)
- Occurs before user creation (can pass referral code to createUser)
- Part of onboarding flow (natural place for optional input)
- User is already entering profile information (name, avatar)
- Can be optional field (doesn't block account creation)

**Alternative Options:**
- ❌ **VerificationScreen**: Too early, user might not have referral code yet
- ❌ **GetStartedScreen**: Too early, user might abandon signup
- ❌ **AuthMethodsScreen**: Not related to authentication method

## Database Actions & Relations

### 1. User Document Structure

**Location:** `src/types/index.ts`

```typescript
interface User {
  referral_code?: string;  // User's own referral code (generated)
  referred_by?: string;   // User ID who referred this user (set during signup)
}
```

### 2. Referral Service

**Location:** `src/services/rewards/referralService.ts`

**Key Methods:**
- `trackReferral(referredUserId, referralCode?, referrerId?)` - Main method to track referral
- `findReferrerByCode(referralCode)` - Finds referrer by referral code
- `createReferralRecord(referrerId, referredUserId)` - Creates referral record in `referrals` collection
- `awardInviteFriendReward(referrerId, referredUserId)` - Awards points to referrer

**Database Collections:**
- `users` - User documents with `referral_code` and `referred_by` fields
- `referrals` - Referral records with referrer/referred relationship

### 3. Points Awarding Flow

**When Friend Creates Account:**
1. `referralService.trackReferral()` is called with referral code
2. `findReferrerByCode()` finds the referrer by code
3. `createReferralRecord()` creates referral record in `referrals` collection
4. `awardInviteFriendReward()` awards points to referrer:
   - Uses `pointsService.awardSeasonPoints()` with:
     - Source: `'referral_reward'`
     - Task type: `'invite_friends_create_account'`
     - Season-based points (from `seasonRewardsConfig.ts`)
5. Updates user's `referred_by` field with referrer's ID

**When Friend Does First Split > $10:**
1. `splitRewardsService.awardFairSplitParticipation()` or similar detects first split
2. Checks if user has `referred_by` field
3. Calls `referralService.awardFriendFirstSplitReward(referrerId, referredUserId, splitAmount)`
4. Awards points to referrer with task type: `'friend_do_first_split_over_10'`

### 4. Current Implementation Status

**✅ Already Implemented:**
- `referralService.trackReferral()` - Fully implemented
- `referralService.findReferrerByCode()` - Fully implemented
- `referralService.awardInviteFriendReward()` - Fully implemented
- `referralService.awardFriendFirstSplitReward()` - Fully implemented
- User type includes `referred_by` field
- Points service supports referral rewards

**✅ Implemented:**
- ✅ Referral code input field in CreateProfileScreen
- ✅ Passing referral code to `trackReferral()` during user creation
- ✅ Support for referral code from route params (for deep links)
- ✅ Non-blocking referral tracking (errors don't prevent account creation)
- ✅ Auto-uppercase and space removal for referral codes
- ✅ Comprehensive logging for debugging

## Implementation Plan

### Step 1: Add Referral Code Input to CreateProfileScreen ✅ COMPLETED

**File:** `src/screens/CreateProfile/CreateProfileScreen.tsx`

**Changes Implemented:**
1. ✅ Added state for referral code: `const [referralCode, setReferralCode] = useState<string>('');`
2. ✅ Added optional TextInput field for referral code with icon and hint text
3. ✅ Auto-uppercase and remove spaces from input
4. ✅ Support referral code from route params (for deep links)
5. ✅ Added styles for referral code input field

### Step 2: Update User Creation Flow ✅ COMPLETED

**File:** `src/screens/CreateProfile/CreateProfileScreen.tsx` (handleNext function)

**Changes Implemented:**
1. ✅ After user is created, check if referral code was provided
2. ✅ If provided, call `referralService.trackReferral(user.id, referralCode)` in non-blocking async
3. ✅ Handle referral tracking errors gracefully (non-blocking, doesn't fail account creation)
4. ✅ Comprehensive logging for debugging and monitoring

### Step 3: Verify Database Relations

**Collections to Verify:**
- `users` collection: `referred_by` field is set correctly
- `referrals` collection: Referral records are created correctly
- `points_transactions` collection: Points are awarded with correct source and task type

## Database Schema Verification

### Users Collection
```typescript
{
  id: string;
  referral_code?: string;  // Generated for user
  referred_by?: string;    // Set when user signs up with referral code
  // ... other fields
}
```

### Referrals Collection
```typescript
{
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserName?: string;
  createdAt: Timestamp;
  hasCreatedAccount: boolean;
  hasDoneFirstSplit: boolean;
  firstSplitAmount?: number;
  rewardsAwarded: {
    accountCreated: boolean;
    firstSplitOver10: boolean;
  };
}
```

### Points Transactions Collection
```typescript
{
  id: string;
  user_id: string;
  amount: number;
  source: 'referral_reward' | 'transaction_reward' | 'quest_completion' | ...;
  task_type?: 'invite_friends_create_account' | 'friend_do_first_split_over_10' | ...;
  season?: number;
  description?: string;
  created_at: Timestamp;
}
```

## Testing Checklist

- [x] User can enter referral code during profile creation ✅
- [x] Referral code is optional (doesn't block account creation) ✅
- [x] Referral code is validated (checks if code exists) ✅
- [x] Referrer is found by referral code ✅
- [x] Referral record is created in `referrals` collection ✅
- [x] User's `referred_by` field is set correctly ✅
- [x] Points are awarded to referrer when friend creates account ✅
- [x] Points are awarded to referrer when friend does first split > $10 ✅
- [x] Duplicate referrals are prevented ✅
- [x] Invalid referral codes are handled gracefully ✅
- [x] Referral code can be passed via route params (deep links) ✅
- [x] Auto-uppercase and space removal for referral codes ✅

## Integration Points

### 1. CreateProfileScreen → referralService
- Call `trackReferral()` after user creation
- Pass `user.id` and `referralCode`

### 2. referralService → pointsService
- Call `awardSeasonPoints()` for account creation reward
- Call `awardSeasonPoints()` for first split reward

### 3. referralService → firebaseDataService
- Update user's `referred_by` field
- Create referral record in `referrals` collection

### 4. splitRewardsService → referralService
- Call `awardFriendFirstSplitReward()` when friend does first split > $10

## Implementation Summary

### ✅ Completed Features

1. **Referral Code Input Field**
   - Optional input field in CreateProfileScreen
   - Icon and hint text for better UX
   - Auto-uppercase and space removal
   - Max length: 12 characters
   - Support for route params (deep links)

2. **Referral Tracking Integration**
   - Non-blocking async referral tracking
   - Comprehensive error handling
   - Detailed logging for debugging
   - Doesn't fail account creation if referral tracking fails

3. **Code Quality**
   - Follows existing codebase patterns
   - Uses logger instead of console
   - Proper error handling
   - Clean and maintainable code
   - Future-proof for enhancements

### Notes

- ✅ Referral code input is optional (user can skip it)
- ✅ Referral tracking is non-blocking (errors don't prevent account creation)
- ✅ Referral code validation checks if code exists before accepting
- ✅ Points are awarded based on current season (from `seasonRewardsConfig.ts`)
- ✅ Duplicate referrals are prevented by checking `rewardsAwarded` flags
- ✅ Referral code can be passed via route params for deep links
- ✅ Auto-uppercase and space removal for better UX

