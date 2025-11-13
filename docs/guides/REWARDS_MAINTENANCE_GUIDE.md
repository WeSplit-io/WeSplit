# Rewards Maintenance Guide

## Overview

This guide explains how to maintain and edit reward amounts and percentages across the codebase. All reward values are centralized in a single configuration file for easy maintenance.

## ⚠️ Single Source of Truth

**ALL reward values are defined in ONE file:**
- `src/services/rewards/seasonRewardsConfig.ts`

**DO NOT:**
- ❌ Hardcode reward values anywhere else in the codebase
- ❌ Create duplicate configuration files
- ❌ Modify reward values in service files

**DO:**
- ✅ Edit values only in `seasonRewardsConfig.ts`
- ✅ Use the provided helper functions to get rewards
- ✅ Test changes after modifying rewards

## Quick Start: Editing Rewards

### 1. Open the Configuration File

```bash
src/services/rewards/seasonRewardsConfig.ts
```

### 2. Find the Task You Want to Edit

The file is organized by task categories:
- **Get Started Tasks**: `export_seed_phrase`, `setup_account_pp`, `first_split_with_friends`, `first_external_wallet_linked`
- **Referral Tasks**: `invite_friends_create_account`, `friend_do_first_split_over_10`
- **All Tasks** (Regular Users): `transaction_1_1_request`, `participate_fair_split`, `create_fair_split_owner_bonus`, `degen_split_win`, `degen_split_lose`
- **Partnership Tasks**: Same as "All Tasks" but with enhanced values

### 3. Edit the Value

#### Example 1: Change Fixed Points

To change Season 1 "Export Seed Phrase" reward from 100 to 150 points:

```typescript
export_seed_phrase: {
  1: { type: 'fixed', value: 150 }, // Changed from 100 to 150
  2: { type: 'fixed', value: 100 },
  3: { type: 'fixed', value: 100 },
  4: { type: 'fixed', value: 50 },
  5: { type: 'fixed', value: 50 }
},
```

#### Example 2: Change Percentage

To change Season 1 transaction reward from 8% to 10%:

```typescript
transaction_1_1_request: {
  1: { type: 'percentage', value: 10 }, // Changed from 8 to 10
  2: { type: 'percentage', value: 7 },
  3: { type: 'percentage', value: 6 },
  4: { type: 'percentage', value: 5 },
  5: { type: 'percentage', value: 4 }
},
```

#### Example 3: Change Partnership Reward

To change Season 1 partnership transaction reward from 15% to 18%:

```typescript
// In PARTNERSHIP_REWARDS section
transaction_1_1_request: {
  1: { type: 'percentage', value: 18 }, // Changed from 15 to 18
  2: { type: 'percentage', value: 14 },
  3: { type: 'percentage', value: 12 },
  4: { type: 'percentage', value: 10 },
  5: { type: 'percentage', value: 8 }
},
```

#### Example 4: Change Reward Type

To change Season 2 "Create Fair Split Owner Bonus" from fixed 50 points to percentage 6%:

```typescript
create_fair_split_owner_bonus: {
  1: { type: 'percentage', value: 10 },
  2: { type: 'percentage', value: 6 }, // Changed from fixed 50 to percentage 6%
  3: { type: 'fixed', value: 50 },
  4: { type: 'fixed', value: 50 },
  5: { type: 'fixed', value: 50 }
},
```

### 4. Validate Your Changes

After editing, run the validation function to ensure your changes are valid:

```typescript
import { validateRewardConfig } from './services/rewards/seasonRewardsConfig';

const errors = validateRewardConfig();
if (errors.length > 0) {
  console.error('Configuration errors:', errors);
} else {
  console.log('Configuration is valid!');
}
```

## Reward Types

### Fixed Points

Fixed rewards award a specific number of points regardless of transaction/split amount.

**Example:**
```typescript
export_seed_phrase: {
  1: { type: 'fixed', value: 100 } // Always awards 100 points
}
```

**When to use:**
- One-time actions (export seed phrase, setup account)
- Referral rewards
- Milestone achievements

### Percentage-Based

Percentage rewards calculate points as a percentage of the transaction/split amount.

**Example:**
```typescript
transaction_1_1_request: {
  1: { type: 'percentage', value: 8 } // Awards 8% of transaction amount
}
```

**Calculation:**
- $100 transaction × 8% = 8 points
- $50 transaction × 8% = 4 points
- $10 transaction × 8% = 0.8 → rounds to 1 point

**When to use:**
- Transaction rewards
- Split participation rewards
- Any reward tied to monetary amounts

## Configuration Structure

### SEASON_REWARDS

Standard rewards for regular users:

```typescript
export const SEASON_REWARDS: Record<RewardTask, Record<Season, SeasonReward>> = {
  task_name: {
    1: { type: 'fixed' | 'percentage', value: number },
    2: { type: 'fixed' | 'percentage', value: number },
    3: { type: 'fixed' | 'percentage', value: number },
    4: { type: 'fixed' | 'percentage', value: number },
    5: { type: 'fixed' | 'percentage', value: number }
  }
}
```

### PARTNERSHIP_REWARDS

Enhanced rewards for partnership users (only for specific tasks):

```typescript
export const PARTNERSHIP_REWARDS: Record<PartnershipTask, Record<Season, SeasonReward>> = {
  task_name: {
    1: { type: 'fixed' | 'percentage', value: number },
    // ... same structure
  }
}
```

## Helper Functions

### Get Reward for a Task

```typescript
import { getSeasonReward } from './services/rewards/seasonRewardsConfig';
import { seasonService } from './services/rewards/seasonService';

const season = seasonService.getCurrentSeason();
const isPartnership = user.is_partnership || false;

const reward = getSeasonReward('transaction_1_1_request', season, isPartnership);
// Returns: { type: 'percentage', value: 8 } (or partnership value if applicable)
```

### Calculate Points

```typescript
import { calculateRewardPoints } from './services/rewards/seasonRewardsConfig';

const reward = getSeasonReward('transaction_1_1_request', season, isPartnership);
const transactionAmount = 100;

const points = calculateRewardPoints(reward, transactionAmount);
// For percentage: 100 × 8% = 8 points
// For fixed: returns the fixed value directly
```

### Get All Rewards for a Season

```typescript
import { getAllSeasonRewards } from './services/rewards/seasonRewardsConfig';

const season = 1;
const isPartnership = false;

const allRewards = getAllSeasonRewards(season, isPartnership);
// Returns object with all task rewards for the season
```

## Validation Rules

The system automatically validates:

1. **All seasons must have rewards** - No missing values
2. **Reward type must be valid** - Either 'fixed' or 'percentage'
3. **Values must be non-negative** - No negative points
4. **Percentages must be ≤ 100%** - No percentages over 100%

### Running Validation

```typescript
import { validateRewardConfig } from './services/rewards/seasonRewardsConfig';

const errors = validateRewardConfig();
if (errors.length > 0) {
  console.error('Configuration errors:');
  errors.forEach(error => console.error(`  - ${error}`));
} else {
  console.log('✅ Configuration is valid!');
}
```

## Common Editing Scenarios

### Scenario 1: Update All Seasons for a Task

To change a reward across all seasons:

```typescript
export_seed_phrase: {
  1: { type: 'fixed', value: 150 }, // Updated
  2: { type: 'fixed', value: 150 }, // Updated
  3: { type: 'fixed', value: 150 }, // Updated
  4: { type: 'fixed', value: 100 }, // Updated
  5: { type: 'fixed', value: 100 }  // Updated
},
```

### Scenario 2: Add a New Season

If you need to add Season 6:

1. Update `Season` type in `seasonService.ts` to include 6
2. Add Season 6 configuration to all tasks in `seasonRewardsConfig.ts`
3. Update season dates in `seasonService.ts`

### Scenario 3: Change Partnership Multiplier

To increase partnership rewards by 2x:

```typescript
// If regular user gets 8%, partnership gets 16%
transaction_1_1_request: {
  1: { type: 'percentage', value: 16 }, // 2x of 8%
  // ...
}
```

### Scenario 4: Switch Between Fixed and Percentage

To change from fixed to percentage:

```typescript
// Before
create_fair_split_owner_bonus: {
  1: { type: 'fixed', value: 50 }
}

// After
create_fair_split_owner_bonus: {
  1: { type: 'percentage', value: 10 } // Now 10% of split amount
}
```

## Testing Changes

### 1. Unit Tests

After making changes, run unit tests:

```bash
npm test -- seasonRewardsConfig
```

### 2. Manual Testing

Test the changes in development:

```typescript
import { getSeasonReward, calculateRewardPoints } from './services/rewards/seasonRewardsConfig';
import { seasonService } from './services/rewards/seasonService';

// Test fixed reward
const fixedReward = getSeasonReward('export_seed_phrase', 1, false);
console.log('Fixed reward:', fixedReward); // Should show your new value

// Test percentage reward
const percentageReward = getSeasonReward('transaction_1_1_request', 1, false);
const points = calculateRewardPoints(percentageReward, 100);
console.log('Points for $100:', points); // Should match your calculation
```

### 3. Integration Testing

Test that rewards are awarded correctly:
- Create a transaction and verify points
- Create a split and verify points
- Check referral rewards

## Best Practices

1. **Always validate** after making changes
2. **Test in development** before deploying
3. **Document changes** in commit messages
4. **Keep seasons consistent** - Don't make drastic changes between seasons
5. **Consider impact** - Changing rewards affects all users
6. **Use version control** - Commit changes with clear messages

## Troubleshooting

### Issue: Changes not applying

**Solution:** Ensure you're editing `seasonRewardsConfig.ts` and not a cached version. Restart the development server.

### Issue: Validation errors

**Solution:** Check that:
- All seasons (1-5) have values
- Reward types are 'fixed' or 'percentage'
- Values are non-negative
- Percentages are ≤ 100

### Issue: Wrong reward type

**Solution:** Ensure you're using the correct task name and checking partnership status correctly.

## File Locations

- **Main Config**: `src/services/rewards/seasonRewardsConfig.ts`
- **Season Service**: `src/services/rewards/seasonService.ts`
- **This Guide**: `docs/guides/REWARDS_MAINTENANCE_GUIDE.md`
- **Implementation Guide**: `docs/guides/SEASON_REWARDS_IMPLEMENTATION.md`

## Support

If you need help:
1. Check this guide first
2. Review `seasonRewardsConfig.ts` comments
3. Check implementation guide
4. Ask the team

