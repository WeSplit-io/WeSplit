# Badge Migration Guide

This guide explains how to migrate existing badges from `badgeConfig.ts` to Firestore.

## Overview

You have **5 event/community badges** with redeem codes that should be migrated to Firestore:

1. `community_wesplit` - Redeem Code: `WS24X9K`
2. `community_superteamfrance` - Redeem Code: `STF24M8P`
3. `community_monkedao` - Redeem Code: `MKD24N2Q`
4. `community_diggers` - Redeem Code: `DGR24K7R`
5. `event_solana_breakpoint_2025` - Redeem Code: `BP25X9K`

## Migration Methods

### Method 1: Firebase Console (Recommended - Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/project/wesplit-35186/firestore)
2. Navigate to `badges` collection
3. For each badge, click **Add document**
4. Use the badge ID as the **Document ID**
5. Add all fields from the badge definition

**Example for `community_wesplit`:**

```
Document ID: community_wesplit

Fields:
- badgeId (string): community_wesplit
- title (string): WeSplit Community
- description (string): WeSplit community member
- icon (string): 👥
- iconUrl (string): gs://wesplit-35186.firebasestorage.app/badges/communauté/wesplit-badge.png
- category (string): community
- rarity (string): common
- points (number): 0
- isEventBadge (boolean): true
- isCommunityBadge (boolean): true
- showNextToName (boolean): true
- redeemCode (string): WS24X9K
```

### Method 2: Using Migration Script

If you have Firebase Admin SDK set up:

```bash
# Install dependencies (if needed)
npm install firebase-admin

# Run migration script
npx ts-node scripts/migrateBadgesToFirestore.ts

# Or migrate all badges (including achievements)
npx ts-node scripts/migrateBadgesToFirestore.ts --all

# Or overwrite existing badges
npx ts-node scripts/migrateBadgesToFirestore.ts --overwrite
```

### Method 3: Using Firebase CLI

1. Use the provided JSON file: `scripts/badgeMigrationData.json`
2. For each badge, create a JSON file and import:

```bash
# Example for community_wesplit
cat > badge-wesplit.json << EOF
{
  "badgeId": "community_wesplit",
  "title": "WeSplit Community",
  "description": "WeSplit community member",
  "icon": "👥",
  "iconUrl": "gs://wesplit-35186.firebasestorage.app/badges/communauté/wesplit-badge.png",
  "category": "community",
  "rarity": "common",
  "points": 0,
  "isEventBadge": true,
  "isCommunityBadge": true,
  "showNextToName": true,
  "redeemCode": "WS24X9K"
}
EOF

firebase firestore:set badges/community_wesplit badge-wesplit.json
```

## Complete Badge Data

### 1. community_wesplit

```json
{
  "badgeId": "community_wesplit",
  "title": "WeSplit Community",
  "description": "WeSplit community member",
  "icon": "👥",
  "iconUrl": "gs://wesplit-35186.firebasestorage.app/badges/communauté/wesplit-badge.png",
  "category": "community",
  "rarity": "common",
  "points": 0,
  "isEventBadge": true,
  "isCommunityBadge": true,
  "showNextToName": true,
  "redeemCode": "WS24X9K"
}
```

### 2. community_superteamfrance

```json
{
  "badgeId": "community_superteamfrance",
  "title": "Superteam France",
  "description": "Superteam France community member",
  "icon": "🇫🇷",
  "iconUrl": "gs://wesplit-35186.firebasestorage.app/badges/communauté/superteamfrance-badge.png",
  "category": "community",
  "rarity": "rare",
  "points": 0,
  "isEventBadge": true,
  "isCommunityBadge": true,
  "showNextToName": true,
  "redeemCode": "STF24M8P"
}
```

### 3. community_monkedao

```json
{
  "badgeId": "community_monkedao",
  "title": "MonkeDAO",
  "description": "MonkeDAO community member",
  "icon": "🐵",
  "iconUrl": "gs://wesplit-35186.firebasestorage.app/badges/communauté/monkedao-badge.png",
  "category": "community",
  "rarity": "rare",
  "points": 0,
  "isEventBadge": true,
  "isCommunityBadge": true,
  "showNextToName": true,
  "redeemCode": "MKD24N2Q"
}
```

### 4. community_diggers

```json
{
  "badgeId": "community_diggers",
  "title": "Diggers",
  "description": "Diggers community member",
  "icon": "⛏️",
  "iconUrl": "gs://wesplit-35186.firebasestorage.app/badges/communauté/diggers-badge.png",
  "category": "community",
  "rarity": "rare",
  "points": 0,
  "isEventBadge": true,
  "isCommunityBadge": true,
  "showNextToName": true,
  "redeemCode": "DGR24K7R"
}
```

### 5. event_solana_breakpoint_2025

```json
{
  "badgeId": "event_solana_breakpoint_2025",
  "title": "Solana Breakpoint 2025",
  "description": "Solana Breakpoint 2025 attendee",
  "icon": "🎯",
  "iconUrl": "gs://wesplit-35186.firebasestorage.app/badges/communauté/BP2025-badge.png",
  "category": "event",
  "rarity": "epic",
  "points": 500,
  "isEventBadge": true,
  "isCommunityBadge": false,
  "showNextToName": false,
  "redeemCode": "BP25X9K"
}
```

## Verification Steps

### 1. Check Badges in Firestore

1. Go to Firebase Console → Firestore Database
2. Click on `badges` collection
3. Verify all 5 badges are present
4. Check that each badge has all required fields

### 2. Test Badge Loading

1. Open your app
2. Go to **Rewards** → **Badges** tab
3. Badges should appear in the list
4. Event/community badges should be visible

### 3. Test Badge Claim

1. Go to **Rewards** → **Redeem Code** tab
2. Enter one of the redeem codes (e.g., `WS24X9K`)
3. Tap **Redeem**
4. Badge should be claimed successfully
5. Check that badge appears in your profile

### 4. Verify in Firestore

After claiming, verify:

1. **User's badges subcollection**: `users/{userId}/badges/{badgeId}`
   - Should contain the claimed badge document
   
2. **User document**: `users/{userId}`
   - `badges` array should include the badge ID

## Troubleshooting

### Badges Not Appearing

**Issue**: Badges don't show in app after migration

**Solutions**:
1. Wait 5 minutes for cache to refresh
2. Restart the app
3. Verify badges exist in Firestore Console
4. Check Firestore rules allow read access
5. Verify `isEventBadge: true` is set

### Redeem Code Not Working

**Issue**: Redeem code doesn't claim badge

**Solutions**:
1. Verify `redeemCode` field matches exactly (case-insensitive)
2. Check `isEventBadge: true` is set
3. Verify badge not already claimed
4. Check Firestore rules allow writes
5. Verify badge document exists in `badges` collection

### Connection Errors

**Issue**: Cannot connect to Firestore

**Solutions**:
1. Verify Firestore is enabled in Firebase Console
2. Check Firebase project ID is correct (`wesplit-35186`)
3. Verify security rules are deployed
4. Check network connectivity
5. Verify Firebase config in app

## Post-Migration

After successful migration:

1. ✅ All 5 badges should be in Firestore
2. ✅ Badges should be claimable via redeem codes
3. ✅ Badges should appear in app
4. ✅ System should check Firestore first, then config

## Next Steps

Once migration is complete:

1. **Test all redeem codes** to ensure they work
2. **Add new badges** directly to Firestore (no app update needed!)
3. **Update existing badges** by editing Firestore documents
4. **Remove badges** by deleting Firestore documents (if needed)

## Quick Reference

**Badges to Migrate**: 5
- 4 community badges
- 1 event badge

**Redeem Codes**:
- `WS24X9K` - WeSplit Community
- `STF24M8P` - Superteam France
- `MKD24N2Q` - MonkeDAO
- `DGR24K7R` - Diggers
- `BP25X9K` - Solana Breakpoint 2025

**Collection Path**: `badges/{badgeId}`

**Deploy Rules**: `firebase deploy --only firestore:rules`
