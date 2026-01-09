# Firestore Badges Collection Setup Guide

This guide will help you verify and set up the `badges` collection in your Firestore database.

## ✅ Current Status

Your Firestore database is **already configured and working**:
- ✅ Project ID: `wesplit-35186`
- ✅ Firestore is initialized in your app
- ✅ Security rules file exists: `config/deployment/firestore.rules`
- ✅ Firestore rules have been updated to include `badges` collection

## Step 1: Verify Firestore Database Exists

### Option A: Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **wesplit-35186**
3. Click on **Firestore Database** in the left sidebar
4. If you see "Get started" or "Create database", click it
5. Choose:
   - **Mode**: Production mode (recommended) or Test mode
   - **Location**: Choose closest to your users (e.g., `us-central1`, `europe-west1`)

### Option B: Check via Firebase CLI

```bash
# Check if Firestore is enabled
firebase projects:list

# Check Firestore status
firebase firestore:databases:list
```

## Step 2: Deploy Security Rules

Your security rules have been updated to allow:
- ✅ Public read access to `badges` collection (for redeem code lookup)
- ✅ Authenticated write access (you can restrict to admins later)
- ✅ User read access to their own claimed badges

### Deploy Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Or deploy everything
firebase deploy
```

### Verify Rules Deployment

1. Go to Firebase Console → Firestore Database → Rules
2. You should see the new rules for `badges` collection
3. Rules should include:
   ```javascript
   match /badges/{badgeId} {
     allow read: if true;
     allow write: if request.auth != null;
   }
   ```

## Step 3: Create the Badges Collection

### Option A: Create via Firebase Console

1. Go to **Firestore Database** in Firebase Console
2. Click **Start collection** (if no collections exist) or click **Add collection**
3. Collection ID: `badges`
4. Click **Next**
5. **Don't add a document yet** - just create the empty collection
6. Click **Done**

### Option B: Create via Code (First Badge)

You can create your first badge document directly, which will create the collection automatically:

```typescript
// Example: Create a test badge
import { doc, setDoc } from 'firebase/firestore';
import { db } from './src/config/firebase/firebase';

const badgeId = 'test_badge_2025';

await setDoc(doc(db, 'badges', badgeId), {
  badgeId: badgeId,
  title: 'Test Badge',
  description: 'This is a test badge',
  icon: '🧪',
  category: 'event',
  isEventBadge: true,
  redeemCode: 'TEST2025',
  points: 100
});
```

## Step 4: Verify Collection Structure

After creating the collection, verify it exists:

1. Go to Firebase Console → Firestore Database
2. You should see `badges` in the collections list
3. Click on `badges` to view documents (should be empty initially)

## Step 5: Create Your First Badge

### Using Firebase Console

1. Click on `badges` collection
2. Click **Add document**
3. **Document ID**: Enter a unique badge ID (e.g., `community_test_2025`)
4. Add fields:

```
Field          | Type    | Value
---------------|---------|--------------------------
badgeId        | string  | community_test_2025
title          | string  | Test Community Badge
description    | string  | A test badge for verification
icon           | string  | 🧪
category       | string  | community
isEventBadge    | boolean | true
redeemCode      | string  | TEST2025
points          | number  | 100
isCommunityBadge| boolean | true
```

5. Click **Save**

### Using Firebase CLI

Create a JSON file `test-badge.json`:

```json
{
  "badgeId": "community_test_2025",
  "title": "Test Community Badge",
  "description": "A test badge for verification",
  "icon": "🧪",
  "category": "community",
  "isEventBadge": true,
  "redeemCode": "TEST2025",
  "points": 100,
  "isCommunityBadge": true
}
```

Then deploy:

```bash
firebase firestore:set badges/community_test_2025 test-badge.json
```

## Step 6: Test Badge Claim

1. Open your app
2. Go to **Rewards** → **Redeem Code** tab
3. Enter: `TEST2025`
4. Tap **Redeem**
5. Badge should be claimed successfully!

## Step 7: Verify in Firestore

After claiming, check:

1. **User's badges subcollection**: `users/{userId}/badges/{badgeId}`
   - Should contain the claimed badge document
   
2. **User document**: `users/{userId}`
   - `badges` array should include the badge ID
   - `active_badge` can be set to the badge ID

## Troubleshooting

### Collection Doesn't Appear

**Issue**: `badges` collection not showing in Firebase Console

**Solutions**:
1. Refresh the page
2. Check you're in the correct project (`wesplit-35186`)
3. Verify Firestore is enabled (not just Realtime Database)
4. Try creating a document manually - collection will be created automatically

### Rules Not Deploying

**Issue**: Rules deployment fails

**Solutions**:
1. Check you're logged in: `firebase login`
2. Verify project: `firebase use wesplit-35186`
3. Check rules syntax: `firebase firestore:rules:validate`
4. Deploy with verbose: `firebase deploy --only firestore:rules --debug`

### Badge Not Found

**Issue**: Redeem code doesn't work

**Solutions**:
1. Verify badge document exists in `badges` collection
2. Check `redeemCode` field matches (case-insensitive, but stored uppercase)
3. Verify `isEventBadge: true` is set
4. Wait 5 minutes for cache to refresh, or restart app
5. Check Firestore rules allow read access

### Permission Denied

**Issue**: Error when trying to read/write badges

**Solutions**:
1. Verify rules are deployed: `firebase deploy --only firestore:rules`
2. Check user is authenticated
3. Verify rules syntax is correct
4. Check Firebase Console → Firestore → Rules tab shows updated rules

## Security Recommendations

### For Production

Update the rules to restrict badge writes to admins only:

```javascript
match /badges/{badgeId} {
  allow read: if true;
  // Only admins can write
  allow write: if request.auth != null && 
                 request.auth.token.admin == true;
}
```

To set admin token, you'll need to use Firebase Admin SDK or set custom claims.

### Current Rules (Development-Friendly)

Current rules allow any authenticated user to write badges. This is fine for development but should be restricted in production.

## Next Steps

1. ✅ Firestore database verified/created
2. ✅ Security rules deployed
3. ✅ `badges` collection created
4. ✅ First test badge created
5. ✅ Badge claim tested

Now you can add badges dynamically without app updates! See [DYNAMIC_BADGE_CREATION.md](./DYNAMIC_BADGE_CREATION.md) for detailed badge creation instructions.

## Quick Reference

**Collection Path**: `badges/{badgeId}`

**Required Fields**:
- `badgeId` (string)
- `title` (string)
- `description` (string)
- `icon` (string)

**Important Optional Fields**:
- `redeemCode` (string) - Uppercase, unique
- `isEventBadge` (boolean) - Must be `true` for redeem codes
- `points` (number) - Points awarded on claim
- `isCommunityBadge` (boolean) - Show in community badges section

**Deploy Rules**:
```bash
firebase deploy --only firestore:rules
```

**Check Status**:
```bash
firebase firestore:rules:validate
```
