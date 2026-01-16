# Referral System - Complete Overview

> **Note**: This document has been superseded by [REFERRAL_SYSTEM_COMPLETE.md](./REFERRAL_SYSTEM_COMPLETE.md). Please refer to that document for the most up-to-date information.

## Overview
This document explains how the referral system works, including tracking, points attribution, and display.

## How Referrals Are Tracked

### 1. When a New User Signs Up
When a user creates their profile with a referral code:

1. **Code Validation** (`validateReferralCode`):
   - Normalizes the code (uppercase, trim whitespace)
   - Tries normalized query first
   - If not found, tries case variations:
     - Original input code
     - Lowercase
     - Mixed case (first 8 uppercase + rest lowercase) - handles "SFXKKFHZmhxr" pattern
     - Title case
   - If found with case variation, normalizes the code in database

2. **Referrer Lookup** (`findReferrerByCode`):
   - Uses same case variation logic as validation
   - Normalizes code in database if found with different case
   - Returns referrer user info

3. **Referral Record Creation** (`trackReferral`):
   - Creates referral record in `referrals` collection
   - Document ID: `ref_{referrerId}_{referredUserId}` (ensures uniqueness)
   - Sets `referred_by` field on referred user's document
   - Awards points to referrer (non-blocking)

### 2. Referral Record Structure
```typescript
{
  id: "ref_{referrerId}_{referredUserId}",
  referrerId: string,
  referredUserId: string,
  createdAt: timestamp,
  status: 'active' | 'completed' | 'pending' | 'expired',
  milestones: {
    accountCreated: { achieved: true, achievedAt: timestamp },
    firstSplit: { achieved: false }
  },
  rewardsAwarded: {
    accountCreated: boolean,
    firstSplitOver10: boolean,
    [rewardId]: ReferralRewardTracking
  },
  totalPointsEarned: number,
  lastActivityAt: timestamp
}
```

## Points Attribution

### 1. Account Creation Reward
When a new user signs up with a referral code:
- `awardInviteFriendReward` is called
- Uses `questService.completeQuest` to award points
- Points come from `referralConfig` → `invite_friend_account` reward
- Updates referral record with points awarded
- Updates legacy `rewardsAwarded.accountCreated` field

### 2. First Split Reward
When a referred user completes their first split > $10:
- `awardFriendFirstSplitReward` is called
- Awards additional points to referrer
- Updates referral record

### 3. Points Tracking
- Points are stored in referral record: `totalPointsEarned`
- Each reward tracks: `pointsAwarded`, `awardedAt`, `season`
- Points are also added to user's total points balance via `pointsService`

## Referral Count Display

### How Count is Calculated
In `ReferralScreen.tsx`:
```typescript
const referrals = await referralService.getUserReferrals(currentUser.id, currentUser.id);
setReferralCount(referrals.length);
```

### `getUserReferrals` Method
- Queries `referrals` collection where `referrerId == userId`
- Returns all referrals for that user
- Count = number of referral records

## Referral Code Normalization

### Why Normalization is Important
- Ensures consistent storage and querying
- Handles legacy codes with different casing
- Prevents duplicate codes with different cases

### Normalization Process
1. **Input**: User enters code (any case)
2. **Normalize**: Convert to uppercase, trim whitespace
3. **Query**: Try normalized version first
4. **Fallback**: If not found, try case variations
5. **Update**: If found with different case, normalize in database

### Case Variations Handled
- `SFXKKFHZMHXR` (normalized/uppercase)
- `SFXKKFHZmhxr` (mixed case - first 8 uppercase, rest lowercase)
- `sfxkkfhzmhxr` (lowercase)
- `Sfxkkfhzmhxr` (title case)

## Referral Code Usage Tracking

### Current Implementation
- Referral records track each referral
- Each record has: `referrerId`, `referredUserId`, `createdAt`
- Can query by `referrerId` to get all referrals

### To Track Code Usage Statistics
You can:
1. Query referrals by `referrerId` to count uses
2. Query by `createdAt` to see usage over time
3. Group by `referrerId` to see which codes are most used

### Example Query
```typescript
// Get all referrals for a user
const referralsRef = collection(db, 'referrals');
const q = query(referralsRef, where('referrerId', '==', userId));
const snapshot = await getDocs(q);
const count = snapshot.size; // Total referrals
```

## Files Modified

### Core Referral Service
- `src/services/rewards/referralService.ts`:
  - Updated `validateReferralCode` to handle case variations
  - Updated `findReferrerByCode` to handle case variations
  - Ensures codes are normalized in database when found

### Profile Creation
- `src/screens/CreateProfile/CreateProfileScreen.tsx`:
  - Passes original code (not pre-normalized) to service
  - Allows service to try case variations

## Testing Checklist

✅ **Referral Code Validation**
- [ ] Enter uppercase code → should find if exists
- [ ] Enter mixed case code → should find and normalize
- [ ] Enter lowercase code → should find and normalize
- [ ] Invalid code → should show error

✅ **Referral Tracking**
- [ ] New user signs up with code → referral record created
- [ ] Referrer gets points → check points balance
- [ ] Referral count updates → check ReferralScreen

✅ **Code Normalization**
- [ ] Code found with different case → database updated to normalized
- [ ] Future lookups use normalized code → faster queries

## Next Steps

1. **Monitor Referral Creation**: Check logs when new users sign up
2. **Verify Points**: Ensure referrers receive points correctly
3. **Check Counts**: Verify referral counts display correctly in UI
4. **Database Cleanup**: Consider running a migration to normalize all existing codes

