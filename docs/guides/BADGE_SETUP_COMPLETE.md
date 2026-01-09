# Badge Setup Complete Guide

## ✅ What's Been Done

1. **Firestore Integration**: Badge service now loads badges from Firestore first, then falls back to config
2. **Security Rules**: Updated to allow public read access to `badges` collection
3. **Migration Scripts**: Created scripts to migrate existing badges
4. **Documentation**: Complete guides for setup and usage

## 🚀 Quick Start

### Step 1: Deploy Security Rules

```bash
cd /Users/charlesvincent/Desktop/GitHub/WeSplit
firebase deploy --only firestore:rules
```

### Step 2: Populate Badges Collection

You have **5 badges** to migrate:

#### Option A: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/project/wesplit-35186/firestore)
2. Click on `badges` collection (or create it)
3. For each badge below, click **Add document** and use the data provided

#### Option B: Use Migration Data

See `scripts/badgeMigrationData.json` for all badge data in JSON format.

### Step 3: Test Connection

1. **Open your app**
2. **Go to Rewards → Badges**
3. **Check console logs** - should see: `Loaded badges from Firestore`

### Step 4: Test Badge Claim

1. **Go to Rewards → Redeem Code**
2. **Enter**: `WS24X9K`
3. **Tap Redeem**
4. **Verify**: Badge is claimed successfully

## 📋 Badges to Migrate

### 1. community_wesplit
- **Document ID**: `community_wesplit`
- **Redeem Code**: `WS24X9K`
- **Fields**: See BADGE_MIGRATION_GUIDE.md

### 2. community_superteamfrance
- **Document ID**: `community_superteamfrance`
- **Redeem Code**: `STF24M8P`

### 3. community_monkedao
- **Document ID**: `community_monkedao`
- **Redeem Code**: `MKD24N2Q`

### 4. community_diggers
- **Document ID**: `community_diggers`
- **Redeem Code**: `DGR24K7R`

### 5. event_solana_breakpoint_2025
- **Document ID**: `event_solana_breakpoint_2025`
- **Redeem Code**: `BP25X9K`

## 🔍 Verification Checklist

- [ ] Firestore rules deployed
- [ ] `badges` collection created
- [ ] All 5 badges added to Firestore
- [ ] App can load badges (check logs)
- [ ] Redeem code works (test with WS24X9K)
- [ ] Badge appears in profile after claim

## 📚 Documentation

- **Setup**: `docs/guides/FIRESTORE_BADGES_SETUP.md`
- **Migration**: `docs/guides/BADGE_MIGRATION_GUIDE.md`
- **Creation**: `docs/guides/DYNAMIC_BADGE_CREATION.md`
- **Testing**: `docs/guides/BADGE_CONNECTION_TEST.md`

## 🎯 Next Steps

Once badges are migrated:

1. ✅ Test all 5 redeem codes
2. ✅ Add new badges directly to Firestore (no app update needed!)
3. ✅ Update existing badges by editing Firestore documents
4. ✅ Remove badges by deleting Firestore documents

## 💡 Key Benefits

- ✅ **No app updates needed** for new badges
- ✅ **Instant availability** (5-minute cache)
- ✅ **Backward compatible** with config badges
- ✅ **Easy management** via Firebase Console

Your badge system is now ready for dynamic badge management! 🎉
