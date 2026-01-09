# Badge Setup Summary

## ✅ What's Complete

### 1. Code Changes
- ✅ Badge service now loads from Firestore first, then config
- ✅ Security rules updated for `badges` collection
- ✅ `firebase.json` updated with Firestore config
- ✅ Test function added to verify connection

### 2. Files Created
- ✅ `scripts/migrateBadgesToFirestore.ts` - Migration script
- ✅ `scripts/badgeMigrationData.json` - Badge data in JSON
- ✅ `docs/guides/FIRESTORE_BADGES_SETUP.md` - Setup guide
- ✅ `docs/guides/BADGE_MIGRATION_GUIDE.md` - Migration guide
- ✅ `docs/guides/DYNAMIC_BADGE_CREATION.md` - Badge creation guide
- ✅ `docs/guides/BADGE_CONNECTION_TEST.md` - Testing guide

## 🚀 Next Steps (Do These Now)

### Step 1: Deploy Security Rules

```bash
cd /Users/charlesvincent/Desktop/GitHub/WeSplit
firebase deploy --only firestore:rules
```

### Step 2: Add Badges to Firestore

You need to add **5 badges** to the `badges` collection.

**Easiest Method - Firebase Console:**

1. Go to: https://console.firebase.google.com/project/wesplit-35186/firestore
2. Click on `badges` collection (create it if it doesn't exist)
3. For each badge, click **Add document** and use the data below

### Badge 1: community_wesplit

**Document ID**: `community_wesplit`

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

### Badge 2: community_superteamfrance

**Document ID**: `community_superteamfrance`

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

### Badge 3: community_monkedao

**Document ID**: `community_monkedao`

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

### Badge 4: community_diggers

**Document ID**: `community_diggers`

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

### Badge 5: event_solana_breakpoint_2025

**Document ID**: `event_solana_breakpoint_2025`

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

### Step 3: Test Connection

1. **Open your app**
2. **Go to Rewards → Badges tab**
3. **Check console logs** - you should see:
   ```
   LOG [INFO] [BadgeService] Loaded badges from Firestore {"count": 5}
   ```

### Step 4: Test Badge Claim

1. **Go to Rewards → Redeem Code**
2. **Enter**: `WS24X9K`
3. **Tap Redeem**
4. **Expected**: Badge claimed successfully ✅

## 🔍 How to Verify It's Working

### Check 1: Firestore Console
- Go to Firebase Console → Firestore
- Verify `badges` collection has 5 documents
- Each document should have all the fields above

### Check 2: App Logs
- Open app → Rewards → Badges
- Look for: `Loaded badges from Firestore`
- Should show count: 5

### Check 3: Badge Claim
- Try redeeming: `WS24X9K`
- Should claim successfully
- Badge should appear in profile

### Check 4: Test All Codes
- `WS24X9K` - WeSplit Community
- `STF24M8P` - Superteam France
- `MKD24N2Q` - MonkeDAO
- `DGR24K7R` - Diggers
- `BP25X9K` - Solana Breakpoint 2025

## 📝 Quick Reference

**Collection**: `badges`  
**Project**: `wesplit-35186`  
**Rules**: Deploy with `firebase deploy --only firestore:rules`  
**Cache**: 5 minutes (auto-refreshes)

## 🎉 Benefits

Once set up:
- ✅ Add badges without app updates
- ✅ Update badges instantly
- ✅ Remove badges easily
- ✅ All changes available within 5 minutes

## 📚 Full Documentation

- **Setup**: `docs/guides/FIRESTORE_BADGES_SETUP.md`
- **Migration**: `docs/guides/BADGE_MIGRATION_GUIDE.md`
- **Creation**: `docs/guides/DYNAMIC_BADGE_CREATION.md`
- **Testing**: `docs/guides/BADGE_CONNECTION_TEST.md`

---

**Status**: ✅ Code ready, ⏳ Waiting for badge migration to Firestore
