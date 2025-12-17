# Badge Migration Execution Guide

## Quick Migration

### Option 1: Run Migration Script

```bash
cd /Users/charlesvincent/Desktop/GitHub/WeSplit
npm run migrate:badges
```

### Option 2: Call from App Code

Add this to an admin screen or call on app startup:

```typescript
import { migrateBadgesToFirestore } from '../services/rewards/badgeMigrationService';

// Migrate badges (non-destructive - skips existing)
const result = await migrateBadgesToFirestore(false);

console.log(`Migrated: ${result.success}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);
```

### Option 3: Firebase Console (Manual)

1. Go to Firebase Console → Firestore
2. Navigate to `badges` collection
3. Add documents using data from `BADGE_SETUP_SUMMARY.md`

## What Gets Migrated

**5 Event/Community Badges:**
- `community_wesplit` (Code: WS24X9K)
- `community_superteamfrance` (Code: STF24M8P)
- `community_monkedao` (Code: MKD24N2Q)
- `community_diggers` (Code: DGR24K7R)
- `event_solana_breakpoint_2025` (Code: BP25X9K)

**Achievement badges stay in config** (can be migrated later if needed)

## After Migration

1. ✅ Badges are in Firestore
2. ✅ App loads badges from Firestore first
3. ✅ Redeem codes work immediately
4. ✅ No app update needed for new badges

## Verification

```bash
# Test connection
npm run migrate:badges

# Or in app, check logs for:
# "Loaded badges from Firestore" with count > 0
```
