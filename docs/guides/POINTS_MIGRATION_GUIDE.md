# Points Migration Guide

This guide explains how to retroactively award points to existing users based on their past actions.

## Overview

The points migration system awards points to existing users for:
- ✅ Completed onboarding (25 points)
- ✅ Profile image uploaded (50 points)
- ✅ First transaction made (100 points)
- ✅ First contact added (30 points)
- ✅ First split created (75 points)
- ✅ All past transactions (10% of transaction amount)

## Migration Service

The migration service is located at `src/services/rewards/pointsMigrationService.ts`.

### Key Features

1. **Idempotent**: Safe to run multiple times - won't duplicate awards
2. **Batch Processing**: Processes users in batches to avoid overwhelming the system
3. **Transaction Backfill**: Awards points for all past internal wallet-to-wallet transfers
4. **Error Handling**: Continues processing even if individual users fail

## Running the Migration

### Option 1: Using TypeScript (Recommended)

```bash
# Migrate all users
npx ts-node scripts/migrate-points.ts

# Migrate with limit (for testing)
npx ts-node scripts/migrate-points.ts --limit=100

# Migrate single user (for testing)
npx ts-node scripts/migrate-points.ts --userId=<user-id>
```

### Option 2: Using the Service Directly

You can also use the migration service in your app code:

```typescript
import { pointsMigrationService } from './services/rewards/pointsMigrationService';

// Migrate single user
const result = await pointsMigrationService.migrateUserPoints(userId);
console.log('Points awarded:', result.pointsAwarded);
console.log('Quests completed:', result.questsCompleted);

// Migrate all users
const stats = await pointsMigrationService.migrateAllUsers(1000);
console.log('Total points awarded:', stats.totalPointsAwarded);
```

### Option 3: Firebase Cloud Function

You can create a Cloud Function to run the migration:

```typescript
// In services/firebase-functions/src/index.js
exports.migratePoints = functions.https.onCall(async (data, context) => {
  // Only allow admin users
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }

  const { pointsMigrationService } = require('../src/services/rewards/pointsMigrationService');
  const stats = await pointsMigrationService.migrateAllUsers();
  
  return {
    success: true,
    stats
  };
});
```

## Migration Process

### Step 1: Quest Completion Check

For each user, the migration checks:

1. **Onboarding**: Checks if `hasCompletedOnboarding === true`
2. **Profile Image**: Checks if `avatar` field exists and is not empty
3. **First Transaction**: Checks transaction history for completed send transactions
4. **First Contact**: Checks contacts collection and transaction-based contacts
5. **First Split**: Checks splits collection for user-created splits

### Step 2: Quest Completion

For each eligible quest:
- Checks if quest is already completed (prevents duplicates)
- If not completed, awards points via `questService.completeQuest()`
- Records quest completion in Firestore

### Step 3: Transaction Points Backfill

For all past transactions:
- Gets all user's send transactions (up to 1000)
- Filters for completed USDC transactions
- Checks if points were already awarded (prevents duplicates)
- Verifies recipient is a registered user (internal transfers only)
- Awards 10% of transaction amount as points

## Migration Results

### Single User Migration

```typescript
{
  userId: string;
  userName: string;
  pointsAwarded: number;
  questsCompleted: string[];
  errors: string[];
}
```

### Batch Migration Stats

```typescript
{
  totalUsers: number;
  processedUsers: number;
  successfulUsers: number;
  failedUsers: number;
  totalPointsAwarded: number;
  errors: string[];
}
```

## Best Practices

1. **Test First**: Run migration on a single user or small batch before migrating all users
2. **Monitor**: Watch for errors and verify points are being awarded correctly
3. **Backup**: Consider backing up your Firestore data before large migrations
4. **Rate Limiting**: The migration includes delays between batches to avoid rate limits
5. **Idempotency**: Safe to re-run if needed - duplicates are prevented

## Troubleshooting

### Migration Not Awarding Points

1. Check if quests are already completed
2. Verify user data exists in Firestore
3. Check transaction history for the user
4. Review error logs for specific issues

### Transactions Not Getting Points

- Only internal transfers (to registered users) get points
- External transfers (to wallet addresses) are skipped
- Transactions must be completed (`status === 'completed'`)
- Points are only awarded for USDC transactions

### Performance Issues

- Use batch limits to process users in smaller groups
- Add delays between batches if needed
- Monitor Firestore quota usage

## Example Migration Flow

```
User: John Doe
- ✅ Has completed onboarding → +25 points
- ✅ Has profile image → +50 points
- ✅ Made 3 transactions ($10, $20, $30) → +6 points (10% of $60)
- ✅ Has 2 contacts → +30 points (first contact quest)
- ✅ Created 1 split → +75 points
Total: 186 points awarded
```

## Questions?

If you encounter issues or need help with the migration, check the logs or contact the development team.

