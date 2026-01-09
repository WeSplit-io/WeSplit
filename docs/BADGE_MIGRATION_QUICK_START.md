# Badge Migration - Quick Start

## ✅ Security Rules Deployed

You've already deployed the security rules! Great!

## 🚀 Run Migration (Choose One Method)

### Method 1: Using .env File (Easiest)

If you have a `.env` file with Firebase credentials:

```bash
npm run migrate:badges
```

The script will automatically load credentials from `.env`.

### Method 2: Set Environment Variables

```bash
export EXPO_PUBLIC_FIREBASE_API_KEY="your-api-key"
export EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
export EXPO_PUBLIC_FIREBASE_APP_ID="your-app-id"

npm run migrate:badges
```

### Method 3: Firebase Console (No Script Needed)

**Easiest option if you don't have credentials handy:**

1. Go to: https://console.firebase.google.com/project/wesplit-35186/firestore
2. Click **"Start collection"** or navigate to `badges` collection
3. For each badge below, click **"Add document"**:
   - Document ID: Use the `badgeId`
   - Fields: Add all fields from the badge object

**Badge Data:**

See `scripts/badgeMigrationData.json` for complete JSON data, or use the simplified data below:

#### Badge 1: community_wesplit
- Document ID: `community_wesplit`
- Fields:
  - `badgeId` (string): `community_wesplit`
  - `title` (string): `WeSplit Community`
  - `description` (string): `WeSplit community member`
  - `icon` (string): `👥`
  - `iconUrl` (string): `gs://wesplit-35186.firebasestorage.app/badges/communauté/wesplit-badge.png`
  - `category` (string): `community`
  - `rarity` (string): `common`
  - `points` (number): `0`
  - `isEventBadge` (boolean): `true`
  - `isCommunityBadge` (boolean): `true`
  - `showNextToName` (boolean): `true`
  - `redeemCode` (string): `WS24X9K`

#### Badge 2: community_superteamfrance
- Document ID: `community_superteamfrance`
- Redeem Code: `STF24M8P`
- (Same structure as above, see `badgeMigrationData.json`)

#### Badge 3: community_monkedao
- Document ID: `community_monkedao`
- Redeem Code: `MKD24N2Q`

#### Badge 4: community_diggers
- Document ID: `community_diggers`
- Redeem Code: `DGR24K7R`

#### Badge 5: event_solana_breakpoint_2025
- Document ID: `event_solana_breakpoint_2025`
- Redeem Code: `BP25X9K`
- `points`: `500`
- `category`: `event`

## ✅ Verify Migration

After migration (any method):

1. **Check Firestore**: Should see 5 documents in `badges` collection
2. **Test in App**:
   - Open app → Rewards → Badges
   - Check console logs: Should see `"Loaded badges from Firestore"` with count = 5
3. **Test Redeem Code**:
   - Go to Rewards → Redeem Code tab
   - Enter: `WS24X9K`
   - Should claim successfully

## 📋 Complete Badge Data

For full JSON data, see: `scripts/badgeMigrationData.json`

Or use the migration script which has all data embedded.

---

**Recommendation**: Use **Method 3 (Firebase Console)** if you want to avoid setting up credentials. It's the fastest and most reliable.
