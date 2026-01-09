# Badge Connection Test Guide

This guide helps you verify that your app can communicate with the Firestore `badges` collection.

## Quick Test

### Step 1: Deploy Firestore Rules

```bash
cd /Users/charlesvincent/Desktop/GitHub/WeSplit
firebase deploy --only firestore:rules
```

### Step 2: Test in App

1. **Open your app**
2. **Go to Rewards → Badges tab**
3. **Check console logs** for:
   - `Loaded badges from Firestore` - ✅ Connection working
   - `Failed to load badges from Firestore` - ❌ Check connection

### Step 3: Test Badge Claim

1. **Go to Rewards → Redeem Code**
2. **Enter**: `WS24X9K`
3. **Tap Redeem**
4. **Expected**: Badge should be claimed successfully

## Detailed Testing

### Test 1: Verify Badges Collection Exists

**Via Firebase Console:**
1. Go to https://console.firebase.google.com/project/wesplit-35186/firestore
2. Check if `badges` collection exists
3. Verify it contains badge documents

**Via Code:**
The `badgeService.loadFirestoreBadges()` function will:
- Try to read from `badges` collection
- Log success/failure
- Fall back to config badges if Firestore fails

### Test 2: Check Security Rules

**Verify rules are deployed:**
```bash
firebase firestore:rules:validate
firebase deploy --only firestore:rules
```

**Check rules in Console:**
1. Firebase Console → Firestore Database → Rules
2. Verify `badges` collection rules:
   ```javascript
   match /badges/{badgeId} {
     allow read: if true;
     allow write: if request.auth != null;
   }
   ```

### Test 3: Test Badge Loading

**In your app, check logs for:**

✅ **Success indicators:**
```
LOG [INFO] [BadgeService] Loaded badges from Firestore {"count": 5}
```

❌ **Error indicators:**
```
LOG [WARN] [BadgeService] Failed to load badges from Firestore, using config only
```

### Test 4: Verify Badge Claim Flow

**Test redeem code claim:**

1. Enter redeem code: `WS24X9K`
2. Check logs for:
   ```
   LOG [DEBUG] [BadgeService] Getting badge info by redeem code
   LOG [INFO] [BadgeService] Event badge claimed successfully
   ```
3. Verify in Firestore:
   - `users/{userId}/badges/community_wesplit` should exist
   - `users/{userId}.badges` array should include `community_wesplit`

## Troubleshooting

### Issue: "Failed to load badges from Firestore"

**Possible causes:**
1. Collection doesn't exist
2. Security rules not deployed
3. Network error
4. Firebase not initialized

**Solutions:**
1. Create `badges` collection in Firebase Console
2. Deploy rules: `firebase deploy --only firestore:rules`
3. Check network connectivity
4. Verify Firebase initialization in app

### Issue: "Permission denied"

**Possible causes:**
1. Security rules too restrictive
2. User not authenticated
3. Rules not deployed

**Solutions:**
1. Check rules allow public read for `badges`
2. Verify user is logged in
3. Redeploy rules

### Issue: Badges not appearing

**Possible causes:**
1. Cache not refreshed
2. Badges not in Firestore
3. Badge loading failed silently

**Solutions:**
1. Wait 5 minutes or restart app
2. Verify badges exist in Firestore
3. Check console logs for errors

## Expected Behavior

### When Badges Collection is Empty

- App should fall back to `badgeConfig.ts`
- All existing badges should work
- No errors should occur

### When Badges Collection Has Data

- App should load badges from Firestore first
- Firestore badges override config badges with same ID
- Both sources are merged

### When Claiming Badge

1. System checks Firestore badges first
2. Falls back to config badges
3. Claims badge and saves to user's badges
4. Awards points if badge has points

## Verification Checklist

- [ ] Firestore rules deployed
- [ ] `badges` collection exists
- [ ] At least one badge document exists
- [ ] App can read from `badges` collection
- [ ] Badge claim works with redeem code
- [ ] Badge appears in user's profile
- [ ] Points are awarded (if badge has points)

## Quick Commands

```bash
# Deploy rules
firebase deploy --only firestore:rules

# Validate rules
firebase firestore:rules:validate

# Check Firestore status
firebase firestore:databases:list

# Test connection (if script is set up)
npx ts-node scripts/verifyBadgeConnection.ts
```

## Next Steps

Once connection is verified:

1. ✅ Migrate existing badges to Firestore
2. ✅ Test all redeem codes
3. ✅ Add new badges directly to Firestore
4. ✅ Verify no app update needed for new badges
