# Rewards Centralization Guide

**Date:** 2024-12-19  
**Purpose:** Show where all rewards are centralized and handled

---

## 🎯 Single Source of Truth Locations

### 1. Quest Points (Fixed & Percentage) ✅

**Location:** `src/services/rewards/seasonRewardsConfig.ts`

**This is the SINGLE SOURCE OF TRUTH for all quest point rewards**

#### Structure:
```typescript
export const SEASON_REWARDS: Record<RewardTask, Record<Season, SeasonReward>> = {
  // Get Started Tasks (Fixed Points)
  export_seed_phrase: {
    1: { type: 'fixed', value: 100 },
    2: { type: 'fixed', value: 100 },
    3: { type: 'fixed', value: 100 },
    4: { type: 'fixed', value: 50 },
    5: { type: 'fixed', value: 50 }
  },
  
  // All Tasks (Percentage-Based)
  transaction_1_1_request: {
    1: { type: 'percentage', value: 8 },  // 8% of transaction amount
    2: { type: 'percentage', value: 7 },
    3: { type: 'percentage', value: 6 },
    4: { type: 'percentage', value: 5 },
    5: { type: 'percentage', value: 4 }
  },
  
  // ... more tasks
}
```

#### Reward Types:
- **`fixed`**: Award a fixed number of points (e.g., 100 points)
- **`percentage`**: Award a percentage of transaction/split amount (e.g., 8% of $100 = 8 points)

#### How It's Used:
1. **Quest Service** (`src/services/rewards/questService.ts`):
   ```typescript
   const season = seasonService.getCurrentSeason();
   const reward = getSeasonReward(questType, season, false);
   const pointsAwarded = calculateRewardPoints(reward, 0);
   ```

2. **Points Service** (`src/services/rewards/pointsService.ts`):
   ```typescript
   const reward = getSeasonReward('transaction_1_1_request', season, isPartnership);
   const pointsAwarded = calculateRewardPoints(reward, transactionAmount);
   ```

3. **Split Rewards Service** (`src/services/rewards/splitRewardsService.ts`):
   ```typescript
   const reward = getSeasonReward('participate_fair_split', season, isPartnership);
   const pointsAwarded = calculateRewardPoints(reward, splitAmount);
   ```

#### Helper Functions:
- `getSeasonReward(task, season, isPartnership)` - Get reward config for a task/season
- `calculateRewardPoints(reward, amount)` - Calculate actual points from reward config

---

### 2. Christmas Calendar Assets ✅

**Location:** `src/services/rewards/christmasCalendarConfig.ts`

**This is the SINGLE SOURCE OF TRUTH for all calendar gifts**

#### Structure:
```typescript
export const CHRISTMAS_CALENDAR_2024: ChristmasCalendarGift[] = [
  // Day 1 - December 1st
  {
    day: 1,
    title: 'Welcome to Christmas! 🎄',
    description: 'Start your journey with some bonus points',
    gift: {
      type: 'points',
      amount: 50
    }
  },
  
  // Day 4 - December 4th
  {
    day: 4,
    title: 'Festive Profile Image',
    description: 'A special profile image for the holidays',
    gift: {
      type: 'asset',
      assetId: 'profile_snowflake_2024',
      assetType: 'profile_image',
      assetUrl: 'https://example.com/assets/profile_snowflake.png',
      name: 'Snowflake Profile',
      description: 'A festive snowflake profile image'
    }
  },
  
  // Day 2 - December 2nd
  {
    day: 2,
    title: 'Early Bird Badge',
    description: 'You\'re an early bird!',
    gift: {
      type: 'badge',
      badgeId: 'early_bird_2024',
      title: 'Early Bird',
      description: 'Started the Christmas calendar early',
      icon: '🐦'
    }
  },
  
  // ... days 1-24
]
```

#### Gift Types:
- **`points`**: Awards points to the user
  ```typescript
  { type: 'points', amount: 50 }
  ```

- **`badge`**: Awards a badge/title for the user profile
  ```typescript
  { 
    type: 'badge', 
    badgeId: 'early_bird_2024',
    title: 'Early Bird',
    description: 'Started the Christmas calendar early',
    icon: '🐦'
  }
  ```

- **`asset`**: Awards an asset (profile image or wallet background)
  ```typescript
  {
    type: 'asset',
    assetId: 'profile_snowflake_2024',
    assetType: 'profile_image' | 'wallet_background',
    assetUrl: 'https://example.com/assets/profile_snowflake.png', // Image URL
    nftMetadata?: { // OR NFT metadata
      contractAddress: '0x1234...',
      tokenId: '1',
      chain: 'ethereum',
      imageUrl: 'https://ipfs.io/...'
    },
    name: 'Snowflake Profile',
    description: 'A festive snowflake profile image'
  }
  ```

#### How It's Used:
1. **Christmas Calendar Service** (`src/services/rewards/christmasCalendarService.ts`):
   ```typescript
   const giftConfig = CHRISTMAS_CALENDAR_2024.find(g => g.day === day);
   // Claims gift based on type (points, badge, or asset)
   ```

2. **Christmas Calendar Component** (`src/components/rewards/ChristmasCalendar.tsx`):
   ```typescript
   // Displays calendar with gifts from CHRISTMAS_CALENDAR_2024
   ```

---

## 📋 Complete File Structure

### Configuration Files (Single Source of Truth)

1. **`src/services/rewards/seasonRewardsConfig.ts`**
   - ✅ Quest point rewards (fixed & percentage)
   - ✅ Season-based rewards (1-5)
   - ✅ Partnership rewards
   - ✅ Helper functions: `getSeasonReward()`, `calculateRewardPoints()`

2. **`src/services/rewards/christmasCalendarConfig.ts`**
   - ✅ Christmas calendar gifts (days 1-24)
   - ✅ Points, badges, and assets
   - ✅ Asset URLs and NFT metadata

3. **`src/services/rewards/assetConfig.ts`**
   - ✅ Asset definitions (templates)
   - ✅ Asset metadata (name, description, URL, NFT)
   - ✅ Helper function: `getAssetInfo()`

4. **`src/services/rewards/badgeConfig.ts`**
   - ✅ Badge definitions (templates)
   - ✅ Badge metadata (title, description, icon, iconUrl)
   - ✅ Helper function: `getBadgeInfo()`

### Service Files (Handle Logic)

1. **`src/services/rewards/questService.ts`**
   - Handles quest completion
   - Uses `seasonRewardsConfig.ts` for point calculation
   - Awards points via `pointsService.awardSeasonPoints()`

2. **`src/services/rewards/pointsService.ts`**
   - Handles point awarding
   - Uses `seasonRewardsConfig.ts` for reward calculation
   - Records point transactions

3. **`src/services/rewards/christmasCalendarService.ts`**
   - Handles calendar gift claiming
   - Uses `christmasCalendarConfig.ts` for gift definitions
   - Stores assets in database subcollection

4. **`src/services/rewards/assetService.ts`**
   - Fetches asset metadata from database
   - Falls back to `assetConfig.ts` if not in database
   - Merges database + config data

---

## 🔧 How to Edit Rewards

### Edit Quest Points

**File:** `src/services/rewards/seasonRewardsConfig.ts`

**Example: Change Season 1 transaction reward from 8% to 10%**
```typescript
transaction_1_1_request: {
  1: { type: 'percentage', value: 10 }, // Changed from 8 to 10
  2: { type: 'percentage', value: 7 },
  // ...
}
```

**Example: Change Season 1 "Export Seed Phrase" from 100 to 150 points**
```typescript
export_seed_phrase: {
  1: { type: 'fixed', value: 150 }, // Changed from 100 to 150
  2: { type: 'fixed', value: 100 },
  // ...
}
```

### Edit Calendar Assets

**File:** `src/services/rewards/christmasCalendarConfig.ts`

**Example: Change Day 4 asset URL**
```typescript
{
  day: 4,
  title: 'Festive Profile Image',
  description: 'A special profile image for the holidays',
  gift: {
    type: 'asset',
    assetId: 'profile_snowflake_2024',
    assetType: 'profile_image',
    assetUrl: 'https://new-url.com/assets/profile_snowflake.png', // Changed URL
    name: 'Snowflake Profile',
    description: 'A festive snowflake profile image'
  }
}
```

**Example: Change Day 1 points amount**
```typescript
{
  day: 1,
  title: 'Welcome to Christmas! 🎄',
  description: 'Start your journey with some bonus points',
  gift: {
    type: 'points',
    amount: 100 // Changed from 50 to 100
  }
}
```

---

## 📊 Data Flow

### Quest Points Flow
```
User completes action
  ↓
questService.completeQuest()
  ↓
seasonRewardsConfig.getSeasonReward() → Gets reward config
  ↓
seasonRewardsConfig.calculateRewardPoints() → Calculates points
  ↓
pointsService.awardSeasonPoints() → Awards points
  ↓
Points stored in database
```

### Calendar Assets Flow
```
User claims calendar gift
  ↓
christmasCalendarService.claimGift()
  ↓
christmasCalendarConfig.CHRISTMAS_CALENDAR_2024 → Gets gift config
  ↓
Based on gift type:
  - Points: Awarded via pointsService
  - Badge: Stored in user.badges[]
  - Asset: Stored in users/{userId}/assets/{assetId}
  ↓
Asset metadata stored in database subcollection
```

---

## ✅ Summary

### Quest Points (Fixed & Percentage)
- **Centralized in:** `src/services/rewards/seasonRewardsConfig.ts`
- **Used by:** `questService.ts`, `pointsService.ts`, `splitRewardsService.ts`
- **Types:** `fixed` (points) or `percentage` (of amount)
- **Seasons:** 1-5 (each task has rewards for all seasons)

### Calendar Assets
- **Centralized in:** `src/services/rewards/christmasCalendarConfig.ts`
- **Used by:** `christmasCalendarService.ts`, `ChristmasCalendar.tsx`
- **Types:** `points`, `badge`, or `asset`
- **Days:** 1-24 (December 1-24)

### Asset Definitions
- **Centralized in:** `src/services/rewards/assetConfig.ts`
- **Used by:** `assetService.ts`, `ProfileAssetDisplay.tsx`
- **Purpose:** Template definitions for assets

### Badge Definitions
- **Centralized in:** `src/services/rewards/badgeConfig.ts`
- **Used by:** `BadgeDisplay.tsx`
- **Purpose:** Template definitions for badges

---

**All rewards are centralized in configuration files for easy maintenance!** 🎉

