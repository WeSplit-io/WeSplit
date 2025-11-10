# Season-Based Rewards System Implementation

## Overview

This document describes the season-based rewards system implementation that supports 5 seasons with different reward structures for various user actions.

## Architecture

### Core Components

1. **Season Service** (`src/services/rewards/seasonService.ts`)
   - Manages season configuration and determines current season
   - Supports 5 seasons with configurable start/end dates

2. **Season Rewards Config** (`src/services/rewards/seasonRewardsConfig.ts`)
   - Defines all reward types and their values per season
   - Supports both fixed points and percentage-based rewards
   - Handles partnership vs regular user rewards

3. **Points Service** (`src/services/rewards/pointsService.ts`)
   - Updated to support season-based calculations
   - New `awardSeasonPoints` method for season-aware rewards
   - Transaction points now use season-based percentages

4. **Referral Service** (`src/services/rewards/referralService.ts`)
   - Tracks referrals and awards referral rewards
   - Handles friend account creation and first split > $10 rewards

5. **Split Rewards Service** (`src/services/rewards/splitRewardsService.ts`)
   - Handles Fair Split and Degen Split rewards
   - Supports owner bonuses and participant rewards
   - Handles win/lose scenarios for Degen Splits

6. **User Action Sync Service** (`src/services/rewards/userActionSyncService.ts`)
   - Updated to handle new quest types
   - Syncs seed phrase export, account setup, external wallet linking
   - Handles first split with friends tracking

## Season Configuration

### Season Dates

- **Season 1**: Jan 1, 2024 - Mar 31, 2024
- **Season 2**: Apr 1, 2024 - Jun 30, 2024
- **Season 3**: Jul 1, 2024 - Sep 30, 2024
- **Season 4**: Oct 1, 2024 - Dec 31, 2024
- **Season 5**: Jan 1, 2025 - Dec 31, 2025

### Reward Types

#### Get Started Tasks (Fixed Points)

| Task | Season 1 | Season 2 | Season 3 | Season 4 | Season 5 |
|------|----------|----------|----------|----------|----------|
| Export seed phrase | 100 | 100 | 100 | 50 | 50 |
| Setup account - PP | 100 | 100 | 100 | 50 | 50 |
| First split with friends | 500 | 500 | 500 | 100 | 100 |
| First external wallet linked | 100 | 100 | 100 | 50 | 50 |

#### Referral Tasks (Fixed Points)

| Task | Season 1 | Season 2 | Season 3 | Season 4 | Season 5 |
|------|----------|----------|----------|----------|----------|
| Invite Friends - create account | 500 | 500 | 500 | 100 | 100 |
| Friend do first split > $10 | 1000 | 1000 | 1000 | 500 | 500 |

#### All Tasks (Regular Users)

| Task | Season 1 | Season 2 | Season 3 | Season 4 | Season 5 |
|------|----------|----------|----------|----------|----------|
| Transaction 1:1/Request | 8% | 7% | 6% | 5% | 4% |
| Participate in a Fair Split | 8% | 7% | 6% | 5% | 4% |
| Create a Fair Split Owner bonus | 10% | 50 | 50 | 50 | 50 |
| Degen Split Win | 8% | 7% | 6% | 5% | 4% |
| Degen Split Lose | 10% | 50 | 50 | 50 | 50 |

#### Partnership Tasks (Enhanced Rewards)

| Task | Season 1 | Season 2 | Season 3 | Season 4 | Season 5 |
|------|----------|----------|----------|----------|----------|
| Transaction 1:1/Request | 15% | 14% | 12% | 10% | 8% |
| Participate in a Fair Split | 15% | 14% | 12% | 10% | 8% |
| Create a Fair Split Owner bonus | 20% | 100 | 100 | 50 | 50 |
| Degen Split Win | 15% | 14% | 12% | 10% | 8% |
| Degen Split Lose | 20% | 100 | 100 | 50 | 50 |

## Usage Examples

### Awarding Transaction Points

```typescript
import { pointsService } from './services/rewards/pointsService';

// Automatically uses current season and user's partnership status
const result = await pointsService.awardTransactionPoints(
  userId,
  transactionAmount,
  transactionId,
  'send'
);
```

### Awarding Split Participation Rewards

```typescript
import { splitRewardsService } from './services/rewards/splitRewardsService';

// Fair Split
const result = await splitRewardsService.awardFairSplitParticipation({
  userId,
  splitId,
  splitType: 'fair',
  splitAmount: 100,
  isOwner: true
});

// Degen Split
const result = await splitRewardsService.awardDegenSplitParticipation({
  userId,
  splitId,
  splitType: 'degen',
  splitAmount: 100,
  isOwner: false,
  isWinner: true
});
```

### Tracking Referrals

```typescript
import { referralService } from './services/rewards/referralService';

// Track referral when user signs up
const result = await referralService.trackReferral(
  newUserId,
  referralCode,
  referrerId
);

// Award points when friend does first split > $10
await referralService.awardFriendFirstSplitReward(
  referrerId,
  referredUserId,
  splitAmount
);
```

### Syncing User Actions

```typescript
import { userActionSyncService } from './services/rewards/userActionSyncService';

// Sync seed phrase export
await userActionSyncService.syncSeedPhraseExport(userId);

// Sync external wallet linking
await userActionSyncService.syncExternalWalletLinking(userId);

// Sync first split with friends
await userActionSyncService.syncFirstSplitWithFriends(
  userId,
  splitId,
  participantCount
);
```

## Integration Points

### Where to Integrate

1. **Transaction Completion**
   - Already integrated in `ConsolidatedTransactionService` and `sendInternal.ts`
   - Automatically uses season-based rewards

2. **Split Creation**
   - Call `splitRewardsService.awardFairSplitParticipation()` after creating a Fair Split
   - Call `splitRewardsService.awardDegenSplitParticipation()` after Degen Split completion
   - Call `userActionSyncService.syncFirstSplitWithFriends()` for first split with friends

3. **User Registration**
   - Call `referralService.trackReferral()` when new user signs up
   - Call `userActionSyncService.syncAccountSetupPP()` after onboarding

4. **Seed Phrase Export**
   - Call `userActionSyncService.syncSeedPhraseExport()` after user exports seed phrase

5. **External Wallet Linking**
   - Call `userActionSyncService.syncExternalWalletLinking()` after linking external wallet

## Partnership Status

Users can have partnership status which provides enhanced rewards:

```typescript
// Set partnership status
await firebaseDataService.user.updateUser(userId, {
  is_partnership: true
});
```

Partnership status is automatically checked when awarding rewards and uses the enhanced reward tables.

## Referral System

### Referral Code Generation

```typescript
import { referralService } from './services/rewards/referralService';

const referralCode = referralService.generateReferralCode(userId);
```

### Tracking Referrals

When a new user signs up with a referral code:

1. System tracks the referral relationship
2. Awards points to referrer when friend creates account
3. Awards points to referrer when friend does first split > $10

## Database Schema

### User Model Updates

```typescript
interface User {
  // ... existing fields
  is_partnership?: boolean; // Partnership status
  referral_code?: string; // User's referral code
  referred_by?: string; // User ID who referred this user
}
```

### Points Transaction Updates

```typescript
interface PointsTransaction {
  // ... existing fields
  season?: number; // Season when points were awarded
  task_type?: string; // Task type that triggered the reward
}
```

### Referral Collection

New `referrals` collection tracks referral relationships:

```typescript
interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserName?: string;
  createdAt: string;
  hasCreatedAccount: boolean;
  hasDoneFirstSplit: boolean;
  firstSplitAmount?: number;
  rewardsAwarded: {
    accountCreated: boolean;
    firstSplitOver10: boolean;
  };
}
```

## Testing

### Test Season Configuration

To test different seasons, update the season dates in `seasonService.ts` or use the `getSeasonForDate()` method:

```typescript
import { seasonService } from './services/rewards/seasonService';

const testDate = new Date('2024-06-15');
const season = seasonService.getSeasonForDate(testDate); // Returns 2
```

### Test Partnership Rewards

```typescript
// Set user as partnership
await firebaseDataService.user.updateUser(userId, {
  is_partnership: true
});

// Award transaction points (will use partnership rates)
await pointsService.awardTransactionPoints(userId, 100, 'tx_123', 'send');
```

## Migration Notes

- Existing points transactions will not have season info (backward compatible)
- New quest types are automatically available but need to be triggered
- Partnership status needs to be set manually for existing users
- Referral codes need to be generated for existing users if needed

## Future Enhancements

1. Admin interface for managing seasons
2. Analytics dashboard for season performance
3. Automatic season transitions
4. Referral leaderboard
5. Partnership application system

