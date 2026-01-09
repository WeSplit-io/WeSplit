# Badge Migration via Firebase Console

Since the script requires authentication, the **easiest method** is to use Firebase Console directly.

## Step-by-Step Guide

### 1. Open Firebase Console

Go to: https://console.firebase.google.com/project/wesplit-35186/firestore

### 2. Navigate to Badges Collection

- Click **"Firestore Database"** in the left sidebar
- If `badges` collection doesn't exist, click **"Start collection"**
- Collection ID: `badges`
- Click **"Next"**

### 3. Add Each Badge Document

For each of the 5 badges below, click **"Add document"**:

#### Badge 1: community_wesplit

1. Click **"Add document"**
2. **Document ID**: `community_wesplit` (or leave auto-generated and set `badgeId` field)
3. Add these fields (click **"Add field"** for each):

| Field Name | Type | Value |
|------------|------|-------|
| `badgeId` | string | `community_wesplit` |
| `title` | string | `WeSplit Community` |
| `description` | string | `WeSplit community member` |
| `iconUrl` | string | `gs://wesplit-35186.firebasestorage.app/badges/communauté/wesplit-badge.png` |
| `category` | string | `community` |
| `rarity` | string | `common` |
| `points` | number | `0` |
| `isEventBadge` | boolean | `true` |
| `isCommunityBadge` | boolean | `true` |
| `showNextToName` | boolean | `true` |
| `redeemCode` | string | `WS24X9K` |

4. Click **"Save"**

#### Badge 2: community_superteamfrance

- **Document ID**: `community_superteamfrance`
- **redeemCode**: `STF24M8P`
- **title**: `Superteam France`
- **description**: `Superteam France community member`
- **iconUrl**: `gs://wesplit-35186.firebasestorage.app/badges/communauté/superteamfrance-badge.png`
- **rarity**: `rare`
- (All other fields same as Badge 1)

#### Badge 3: community_monkedao

- **Document ID**: `community_monkedao`
- **redeemCode**: `MKD24N2Q`
- **title**: `MonkeDAO`
- **description**: `MonkeDAO community member`
- **iconUrl**: `gs://wesplit-35186.firebasestorage.app/badges/communauté/monkedao-badge.png`
- **rarity**: `rare`

#### Badge 4: community_diggers

- **Document ID**: `community_diggers`
- **redeemCode**: `DGR24K7R`
- **title**: `Diggers`
- **description**: `Diggers community member`
- **iconUrl**: `gs://wesplit-35186.firebasestorage.app/badges/communauté/diggers-badge.png`
- **rarity**: `rare`

#### Badge 5: event_solana_breakpoint_2025

- **Document ID**: `event_solana_breakpoint_2025`
- **redeemCode**: `BP25X9K`
- **title**: `Solana Breakpoint 2025`
- **description**: `Solana Breakpoint 2025 attendee`
- **iconUrl**: `gs://wesplit-35186.firebasestorage.app/badges/communauté/BP2025-badge.png`
- **category**: `event` (not `community`)
- **rarity**: `epic`
- **points**: `500`
- **isCommunityBadge**: `false`
- **showNextToName**: `false`

## Quick Copy-Paste JSON

For faster entry, you can use the JSON import feature or copy-paste these JSON objects:

### Badge 1 (community_wesplit)
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

### Badge 2 (community_superteamfrance)
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

### Badge 3 (community_monkedao)
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

### Badge 4 (community_diggers)
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

### Badge 5 (event_solana_breakpoint_2025)
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

## ✅ Verify Migration

After adding all 5 badges:

1. **Check Count**: Should see 5 documents in `badges` collection (or 6 if one already existed)
2. **Test in App**:
   - Open app → Rewards → Badges
   - Check console: `"Loaded badges from Firestore"` with count = 5
3. **Test Redeem Code**:
   - Go to Rewards → Redeem Code
   - Enter: `WS24X9K`
   - Should claim successfully

## 🎯 Done!

Once all 5 badges are in Firestore, the app will automatically:
- ✅ Load badges from Firestore (priority over config)
- ✅ Support redeem codes
- ✅ Display badges in UI
- ✅ Allow badge claiming

No app update needed! 🚀
