# Christmas Calendar Implementation Guide

## Overview

The Christmas Calendar system is a 24-day advent calendar (December 1-24) that allows users to claim daily gifts. The system supports three types of gifts:
- **Points**: Awards points to users
- **Badges**: Awards badges/titles for user profiles
- **Assets**: Awards profile images or wallet backgrounds

## Architecture

### Data Structure

#### User Claims (Subcollection)
```
users/{userId}/christmas_calendar/{day}
  - day: number (1-24)
  - claimed: boolean
  - claimed_at: timestamp
  - gift_id: string
  - gift_data: Gift (snapshot at claim time)
  - year: number
```

#### Detailed Claim Records (Subcollection)
```
users/{userId}/christmas_calendar_claims/{claimId}
  - user_id: string
  - year: number
  - day: number
  - gift: Gift
  - claimed_at: timestamp
  - timezone: string (user's timezone at claim time)
```

#### User Document Fields
The user document stores:
- `badges`: string[] - Array of badge IDs earned
- `active_badge`: string - Currently active badge ID
- `profile_assets`: string[] - Array of profile asset IDs owned
- `active_profile_asset`: string - Currently active profile asset ID
- `wallet_backgrounds`: string[] - Array of wallet background asset IDs owned
- `active_wallet_background`: string - Currently active wallet background asset ID

### Files Structure

```
src/
├── types/
│   └── rewards.ts                    # Christmas calendar types
│   └── index.ts                      # User type with badge/asset fields
├── services/
│   └── rewards/
│       ├── christmasCalendarConfig.ts # Gift definitions (EDITABLE)
│       └── christmasCalendarService.ts # Core calendar logic
├── components/
│   └── rewards/
│       └── ChristmasCalendar.tsx      # UI component
└── screens/
    └── Rewards/
        └── RewardsScreen.tsx          # Integration point
```

## Configuration

### Editing Gifts

All gifts are defined in `src/services/rewards/christmasCalendarConfig.ts`. This file contains the `CHRISTMAS_CALENDAR_2024` array with 24 gift definitions.

**To edit a gift:**

1. Open `src/services/rewards/christmasCalendarConfig.ts`
2. Find the day you want to edit (1-24)
3. Modify the gift object:

```typescript
{
  day: 1,
  title: 'Welcome to Christmas! 🎄',
  description: 'Start your journey with some bonus points',
  gift: {
    type: 'points',
    amount: 50  // Change this value
  }
}
```

### Gift Types

#### Points Gift
```typescript
{
  type: 'points',
  amount: 100  // Number of points to award
}
```

#### Badge Gift
```typescript
{
  type: 'badge',
  badgeId: 'unique_badge_id',  // Unique identifier
  title: 'Badge Name',          // Display name
  description: 'Badge description',
  icon: '🎄'                    // Optional emoji/icon
}
```

#### Asset Gift
```typescript
{
  type: 'asset',
  assetId: 'unique_asset_id',           // Unique identifier
  assetType: 'profile_image' | 'wallet_background',
  assetUrl: 'https://example.com/asset.png',  // Asset URL
  name: 'Asset Name',                     // Display name
  description: 'Optional description'     // Optional
}
```

## Features

### Timezone Handling
- Uses user's local timezone to determine current day
- Automatically detects device timezone
- Validates claims based on user's local time

### Claim Validation
- Users can claim today's gift
- Users can claim past gifts they missed (catch-up)
- Users cannot claim future gifts
- Prevents duplicate claims
- Validates calendar is active (Dec 1-24)

### Gift Distribution
- **Points**: Automatically added to user's points balance
- **Badges**: Added to user's badges array, set as active if none selected
- **Assets**: Added to appropriate array (profile_assets or wallet_backgrounds), set as active if none selected

### Tracking
- All claims are recorded in `christmas_calendar_claims` subcollection
- Points transactions are logged in the points transaction system
- User document is updated atomically using Firestore transactions

## Usage

### Service API

```typescript
import { christmasCalendarService } from '../../services/rewards/christmasCalendarService';

// Get user's calendar status
const status = await christmasCalendarService.getUserCalendarStatus(userId, timezone);

// Claim a gift
const result = await christmasCalendarService.claimGift(userId, day, timezone);

// Check if day can be claimed
const canClaim = christmasCalendarService.canClaimDay(day, timezone);

// Get current day (1-24 or null)
const currentDay = christmasCalendarService.getCurrentDay(timezone);

// Check if calendar is active
const isActive = christmasCalendarService.isCalendarActive(timezone);
```

### UI Component

The `ChristmasCalendar` component is already integrated into `RewardsScreen`. It automatically:
- Loads user's calendar status
- Displays all 24 days in a grid
- Shows claimed/unclaimed status
- Highlights today's gift
- Handles gift claiming with preview modal

## Database Schema

### Firestore Collections

1. **users/{userId}/christmas_calendar/{day}**
   - Stores claim status for each day
   - Document ID is the day number (1-24)

2. **users/{userId}/christmas_calendar_claims/{claimId}**
   - Detailed claim records for tracking/analytics
   - Auto-generated document IDs

3. **users/{userId}**
   - User document with badge/asset arrays
   - Points balance

### Security Rules

Ensure Firestore security rules allow:
- Users to read/write their own `christmas_calendar` subcollection
- Users to read/write their own `christmas_calendar_claims` subcollection
- Users to update their own user document (for badges/assets)

Example rules:
```javascript
match /users/{userId}/christmas_calendar/{day} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

match /users/{userId}/christmas_calendar_claims/{claimId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## Future Enhancements

The system is designed to support multiple years:
- Currently hardcoded for 2024
- Can be extended by:
  1. Creating new config files (e.g., `christmasCalendarConfig2025.ts`)
  2. Updating service to handle multiple years
  3. Adding year selection in UI

## Testing

### Manual Testing Checklist

1. **Calendar Display**
   - [ ] Calendar shows all 24 days
   - [ ] Today's day is highlighted
   - [ ] Claimed days show checkmark
   - [ ] Future days are locked

2. **Gift Claiming**
   - [ ] Can claim today's gift
   - [ ] Can claim past gifts (catch-up)
   - [ ] Cannot claim future gifts
   - [ ] Cannot claim same gift twice
   - [ ] Points are added correctly
   - [ ] Badges are added to user profile
   - [ ] Assets are added to user profile

3. **Timezone Handling**
   - [ ] Uses device timezone correctly
   - [ ] Calendar is active Dec 1-24 only
   - [ ] Shows inactive message outside dates

4. **Error Handling**
   - [ ] Handles network errors gracefully
   - [ ] Shows appropriate error messages
   - [ ] Prevents duplicate claims

## Admin Dashboard Integration

The admin dashboard (in separate project) can:
- Query `users/{userId}/christmas_calendar_claims` to see all claims
- Query user documents to see badges/assets owned
- View points transactions for calendar gifts
- Generate analytics on gift distribution

## Notes

- Gift URLs in config are placeholders - replace with actual asset URLs
- Badge icons can be emojis or icon identifiers
- Asset URLs should be publicly accessible
- All gift data is snapshotted at claim time for historical accuracy

