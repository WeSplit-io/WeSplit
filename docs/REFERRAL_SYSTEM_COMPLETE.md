# Referral System - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Complete Flow](#complete-flow)
4. [Code Normalization](#code-normalization)
5. [Points Attribution](#points-attribution)
6. [Firestore Rules](#firestore-rules)
7. [Security & Validation](#security--validation)
8. [Error Handling](#error-handling)
9. [Testing Guide](#testing-guide)
10. [Troubleshooting](#troubleshooting)

## Overview

The referral system allows users to invite friends and earn rewards when their referrals create accounts and complete actions. The system handles:

- Referral code generation and validation
- Case-insensitive code matching
- Atomic referral record creation
- Points attribution to referrers
- Referral count tracking
- Security and authorization

## System Architecture

### Key Components

1. **Frontend**: `CreateProfileScreen.tsx` - User input and validation
2. **Service Layer**: `referralService.ts` - Core business logic
3. **Quest System**: `questService.ts` - Points awarding
4. **Points System**: `pointsService.ts` - Points balance management
5. **Firestore**: Database for referral records and user data

### Data Flow

```
User Input → Validation → Referrer Lookup → Record Creation → Points Awarding
```

## Complete Flow

### For New Users

1. **Code Entry**: User enters referral code in CreateProfileScreen
2. **Validation**: `validateReferralCode` checks code exists (with case variations)
3. **Profile Creation**: User creates profile with referral code
4. **Referral Tracking**: `trackReferral` creates referral record atomically
5. **Points Awarding**: Referrer receives points via quest system

### For Referrers

1. **Referral Record**: Created in `referrals` collection
2. **Points Awarded**: Added to referrer's balance
3. **Count Display**: Calculated from referrals collection
4. **UI Display**: Shown in ReferralScreen

## Code Normalization

### Why Normalization

- Ensures consistent storage and querying
- Handles legacy codes with different casing
- Prevents duplicate codes with different cases

### Normalization Process

1. **Input**: User enters code (any case)
2. **Normalize**: Convert to uppercase, trim whitespace
3. **Query**: Try normalized version first
4. **Fallback**: If not found, try case variations:
   - Original input code
   - Lowercase
   - Title case
   - Multiple split patterns (first N uppercase + rest lowercase)
   - Reverse split patterns
   - Alternating case patterns
5. **Update**: If found with different case, normalize in database

### Case Variations Handled

- `SFXKKFHZMHXR` (normalized/uppercase)
- `SFXKKFHZmhxr` (mixed case - first 8 uppercase, rest lowercase)
- `sfxkkfhzmhxr` (lowercase)
- `Sfxkkfhzmhxr` (title case)
- Any other case pattern (comprehensive matching)

## Points Attribution

### Account Creation Reward

When a new user signs up with a referral code:
- `awardInviteFriendReward` is called
- Uses `questService.completeQuest` to award season-based points
- Points come from `referralConfig` → `invite_friend_account` reward
- Updates referral record with points tracking
- Updates legacy `rewardsAwarded.accountCreated` field

### First Split Reward

When a referred user completes their first split > $10:
- `awardFriendFirstSplitReward` is called
- Awards additional points to referrer
- Updates referral record with milestone tracking

### Points Tracking

- Points stored in referral record: `totalPointsEarned`
- Each reward tracks: `pointsAwarded`, `awardedAt`, `season`
- Points added to user's total balance via `pointsService`
- Community badge bonus applied (2x if active)

## Firestore Rules

### Users Collection

```javascript
match /users/{userId} {
  // Allow authenticated users to read any user document
  // This enables referral code queries
  allow read: if request.auth != null;
  
  // Users can create their own document
  allow create: if request.auth != null && request.auth.uid == userId;
  
  // Users can update their own document (referred_by, points, etc.)
  allow update: if request.auth != null && request.auth.uid == userId;
}
```

### Referrals Collection

```javascript
match /referrals/{referralId} {
  // Allow read if user is referrer or referred user
  allow read: if request.auth != null &&
    (request.auth.uid == resource.data.referrerId ||
     request.auth.uid == resource.data.referredUserId);

  // Allow create if authenticated user is the referred user
  allow create: if request.auth != null &&
    request.auth.uid == request.resource.data.referredUserId;

  // Allow updates for involved users (referrer can update for points tracking)
  allow update: if request.auth != null &&
    (request.auth.uid == resource.data.referrerId ||
     request.auth.uid == resource.data.referredUserId);
}
```

## Security & Validation

### Authentication Required
- All Firestore operations require authentication
- Rules check `request.auth != null`

### Authorization Checks
- Users can only read their own referrals (or referrals they're involved in)
- Only referred user can create referral record
- Only involved users can update referral record

### Self-Referral Prevention
- Code checks `referrer.id === referredUserId`
- Returns error if self-referral attempted

### Account Status Validation
- Checks referrer account is not suspended/deleted
- Prevents rewards to inactive accounts

## Error Handling

### Validation Errors
- Invalid codes return appropriate error messages
- Rate limiting errors are handled
- Permission errors are logged with context

### Transaction Errors
- Duplicate referrals are handled gracefully (idempotency)
- Missing user errors are caught
- Errors are logged with full context

### Update Errors
- Non-critical updates log errors but don't throw
- Critical operations (creation) throw errors
- Error messages include error codes for debugging

## Testing Guide

### Manual Testing Checklist

#### Referral Creation
- [ ] Create new user with valid referral code
- [ ] Verify referral record created in Firestore
- [ ] Verify `referred_by` field set on new user
- [ ] Verify points awarded to referrer
- [ ] Verify referral count increments for referrer

#### Case Variations
- [ ] Test with uppercase code
- [ ] Test with lowercase code
- [ ] Test with mixed case code
- [ ] Verify all variations work
- [ ] Verify code is normalized in database

#### Error Cases
- [ ] Test with invalid code (should show error)
- [ ] Test with duplicate referral (should be idempotent)
- [ ] Test with self-referral (should be blocked)
- [ ] Test with inactive referrer account (should be blocked)

#### Security
- [ ] Verify unauthorized users cannot read referrals
- [ ] Verify users cannot create referrals for others
- [ ] Verify users cannot update referrals they're not involved in

## Troubleshooting

### Issue: Code Not Found
**Symptoms**: User enters valid code but gets "not found" error

**Possible Causes**:
1. Code stored with different case
2. Code not normalized in database
3. Firestore query permissions issue

**Solutions**:
1. System automatically tries case variations
2. Code is normalized when found
3. Verify Firestore rules are deployed

### Issue: Points Not Awarded
**Symptoms**: Referral created but referrer doesn't get points

**Possible Causes**:
1. Points awarding failed (non-blocking)
2. Quest already completed
3. Reward config disabled

**Solutions**:
1. Check logs for award errors
2. Verify quest completion status
3. Check referral config is enabled

### Issue: Referral Count Not Updating
**Symptoms**: Referral created but count doesn't increase

**Possible Causes**:
1. UI not refreshing
2. Query not finding referral record
3. Authorization issue

**Solutions**:
1. Refresh ReferralScreen
2. Verify referral record exists in Firestore
3. Check Firestore rules allow read

## Files Reference

### Core Files
- `src/services/rewards/referralService.ts` - Main referral service
- `src/services/rewards/referralConfig.ts` - Reward configuration
- `src/services/shared/referralUtils.ts` - Utility functions
- `src/screens/CreateProfile/CreateProfileScreen.tsx` - Profile creation
- `src/screens/Rewards/ReferralScreen.tsx` - Referral display
- `config/deployment/firestore.rules` - Security rules

### Related Services
- `src/services/rewards/questService.ts` - Quest completion
- `src/services/rewards/pointsService.ts` - Points management
- `src/services/rewards/seasonService.ts` - Season management

## Recent Fixes (2024)

### Fix 1: Undefined Variable Bug
- **File**: `src/screens/CreateProfile/CreateProfileScreen.tsx`
- **Issue**: Referenced undefined `trimmedCode` variable
- **Fix**: Changed to `finalReferralCode`

### Fix 2: Firestore Rules Documentation
- **File**: `config/deployment/firestore.rules`
- **Issue**: Rules needed clarification
- **Fix**: Added comprehensive comments

### Fix 3: Error Handling Improvements
- **File**: `src/services/rewards/referralService.ts`
- **Issue**: Error logging could be improved
- **Fix**: Enhanced error logging with context and error codes

### Fix 4: Case Variation Handling
- **File**: `src/services/rewards/referralService.ts`
- **Issue**: Codes with different cases not found
- **Fix**: Comprehensive case variation matching

## Summary

The referral system is fully functional and handles:
- ✅ Code validation with case variations
- ✅ Atomic referral record creation
- ✅ Points attribution to referrers
- ✅ Referral count tracking
- ✅ Security and authorization
- ✅ Error handling and logging
- ✅ Code normalization

All systems are properly connected and ready for production use.

