# Dynamic Badge Creation Guide

This guide explains how to add badges to Firestore so users can claim them using redeem codes **without requiring an app update**.

## Overview

The badge system now supports **dynamic badges** stored in Firestore. When a user enters a redeem code:

1. The system first checks the `badges` collection in Firestore
2. If not found, it falls back to badges defined in `badgeConfig.ts`
3. This allows you to add new badges without deploying a new app version

## Firestore Collection Structure

### Collection: `badges`

Each badge is stored as a document with the document ID as the `badgeId`.

**Collection Path:** `badges/{badgeId}`

### Document Fields

```typescript
{
  // Required fields
  badgeId: string;           // Must match document ID
  title: string;              // Display name (e.g., "WeSplit Community Badge")
  description: string;        // Badge description
  icon: string;               // Emoji or icon identifier (e.g., "🏆")
  
  // Optional fields
  iconUrl?: string;           // Image URL (Firebase Storage gs:// or HTTPS)
  imageUrl?: string;          // Alias for iconUrl
  category?: string;          // "event", "community", "achievement"
  rarity?: string;            // "common", "rare", "epic", "legendary"
  points?: number;            // Points awarded when claimed (default: 0)
  target?: number;            // Target for progress-based badges
  isEventBadge?: boolean;     // true = claimable via redeem code (default: true)
  redeemCode?: string;        // Uppercase redeem code (e.g., "WESPLIT2025")
  isCommunityBadge?: boolean; // true = shown next to user name
  showNextToName?: boolean;   // true = displayed on profile
  progressMetric?: string;    // "split_withdrawals", "transaction_count", "transaction_volume"
  progressLabel?: string;     // Label for progress display
}
```

## Adding a Badge via Firebase Console

### Step 1: Navigate to Firestore

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. Click **Start collection** (if `badges` doesn't exist) or navigate to `badges` collection

### Step 2: Create Badge Document

1. Click **Add document**
2. **Document ID**: Enter a unique badge ID (e.g., `community_newpartner_2025`)
3. Add the following fields:

**Example Badge Document:**

```
Document ID: community_newpartner_2025

Fields:
- badgeId (string): community_newpartner_2025
- title (string): New Partner Badge
- description (string): Exclusive badge for our new partner community
- icon (string): 🤝
- iconUrl (string): gs://wesplit-35186.firebasestorage.app/badges/partner-badge.png
- category (string): community
- rarity (string): rare
- points (number): 500
- isEventBadge (boolean): true
- redeemCode (string): NEWPARTNER2025
- isCommunityBadge (boolean): true
- showNextToName (boolean): true
```

### Step 3: Upload Badge Image (Optional)

1. Go to **Storage** in Firebase Console
2. Navigate to `badges/` folder
3. Upload your badge image
4. Copy the `gs://` URL
5. Paste it in the `iconUrl` field of your badge document

## Adding a Badge via Code/Script

### Using Firebase Admin SDK

```typescript
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

async function createBadge() {
  const badgeId = 'community_newpartner_2025';
  
  await db.collection('badges').doc(badgeId).set({
    badgeId: badgeId,
    title: 'New Partner Badge',
    description: 'Exclusive badge for our new partner community',
    icon: '🤝',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/partner-badge.png',
    category: 'community',
    rarity: 'rare',
    points: 500,
    isEventBadge: true,
    redeemCode: 'NEWPARTNER2025',
    isCommunityBadge: true,
    showNextToName: true
  });
  
  console.log(`Badge ${badgeId} created successfully!`);
}
```

### Using Firebase CLI

```bash
# Create a JSON file for the badge
cat > badge.json << EOF
{
  "badgeId": "community_newpartner_2025",
  "title": "New Partner Badge",
  "description": "Exclusive badge for our new partner community",
  "icon": "🤝",
  "iconUrl": "gs://wesplit-35186.firebasestorage.app/badges/partner-badge.png",
  "category": "community",
  "rarity": "rare",
  "points": 500,
  "isEventBadge": true,
  "redeemCode": "NEWPARTNER2025",
  "isCommunityBadge": true,
  "showNextToName": true
}
EOF

# Import to Firestore (requires firebase-tools)
firebase firestore:set badges/community_newpartner_2025 badge.json
```

## Badge Field Details

### Required Fields

- **badgeId**: Must match the document ID
- **title**: Display name shown to users
- **description**: What the badge represents
- **icon**: Emoji or icon identifier (fallback if image fails to load)

### Important Optional Fields

- **redeemCode**: Uppercase code users enter to claim (e.g., "WESPLIT2025")
  - Must be unique across all badges
  - Case-insensitive matching (system converts to uppercase)
  - Minimum 4 characters recommended
  
- **isEventBadge**: Set to `true` for badges claimable via redeem code
  - Defaults to `true` for Firestore badges
  - If `false`, badge won't appear in redeem code flow

- **isCommunityBadge**: Set to `true` to show badge next to user name
  - Appears in profile and account settings
  - Can be activated/deactivated by user

- **points**: Points awarded when badge is claimed
  - Set to `0` or omit if no points should be awarded
  - Points are added to user's total immediately upon claim

- **iconUrl**: Image URL for badge icon
  - Supports `gs://` URLs (Firebase Storage)
  - Supports HTTPS URLs
  - System automatically converts `gs://` to download URLs

## Testing Your Badge

### 1. Verify Badge Appears

1. Open the app
2. Go to **Rewards** → **Badges** tab
3. Your badge should appear in the list (if `isEventBadge: true`)

### 2. Test Redeem Code

1. Go to **Rewards** → **Redeem Code** tab
2. Enter your redeem code (e.g., "NEWPARTNER2025")
3. Tap **Redeem**
4. Badge should be claimed successfully

### 3. Verify Badge Display

1. Go to **Profile** or **Account Settings**
2. Badge should appear in claimed badges list
3. If `isCommunityBadge: true`, it should appear in community badges section

## Cache Management

Badges are cached for **5 minutes** to reduce Firestore reads. If you update a badge:

1. **Wait 5 minutes** for cache to expire, OR
2. **Restart the app** to clear cache, OR
3. **Call `badgeService.invalidateFirestoreBadgesCache()`** (if you have admin access)

## Best Practices

### 1. Badge IDs

- Use descriptive, unique IDs
- Format: `{category}_{name}_{year}` (e.g., `community_wesplit_2025`)
- Avoid special characters except underscores

### 2. Redeem Codes

- Use uppercase letters and numbers
- Make them memorable but not guessable
- Minimum 4 characters
- Consider adding year/event identifier (e.g., "WESPLIT2025")

### 3. Images

- Recommended size: 256x256px or 512x512px
- Format: PNG with transparency
- Upload to Firebase Storage in `badges/` folder
- Use `gs://` URLs for better performance

### 4. Points

- Award meaningful but balanced points
- Community badges: 100-1000 points
- Event badges: 50-500 points
- Achievement badges: Based on difficulty

## Troubleshooting

### Badge Not Appearing

**Issue**: Badge doesn't show in app

**Solutions**:
1. Verify `isEventBadge: true` is set
2. Check badge document exists in `badges` collection
3. Verify document ID matches `badgeId` field
4. Wait 5 minutes for cache to refresh
5. Check Firestore security rules allow reads

### Redeem Code Not Working

**Issue**: Code doesn't claim badge

**Solutions**:
1. Verify `redeemCode` field is set and matches (case-insensitive)
2. Check `isEventBadge: true` is set
3. Verify badge not already claimed by user
4. Check Firestore security rules allow writes
5. Verify badge document exists

### Image Not Loading

**Issue**: Badge image doesn't display

**Solutions**:
1. Verify `iconUrl` or `imageUrl` is set
2. Check Firebase Storage rules allow read access
3. Verify URL is accessible (test in browser)
4. Ensure URL is `gs://` or HTTPS format
5. Check `badge_images` collection if using that system

## Example: Complete Badge Creation Workflow

### 1. Prepare Image

```bash
# Upload to Firebase Storage
# Path: badges/partner-2025.png
# Copy gs:// URL: gs://wesplit-35186.firebasestorage.app/badges/partner-2025.png
```

### 2. Create Firestore Document

**Collection**: `badges`  
**Document ID**: `community_partner_2025`

```json
{
  "badgeId": "community_partner_2025",
  "title": "Partner 2025 Badge",
  "description": "Exclusive badge for our 2025 partners",
  "icon": "🤝",
  "iconUrl": "gs://wesplit-35186.firebasestorage.app/badges/partner-2025.png",
  "category": "community",
  "rarity": "epic",
  "points": 750,
  "isEventBadge": true,
  "redeemCode": "PARTNER2025",
  "isCommunityBadge": true,
  "showNextToName": true
}
```

### 3. Test

1. Open app → Rewards → Redeem Code
2. Enter: `PARTNER2025`
3. Verify badge is claimed
4. Check profile shows badge

## Security Rules

Ensure your Firestore security rules allow badge reads:

```javascript
match /badges/{badgeId} {
  allow read: if true; // Anyone can read badges
  allow write: if request.auth != null && 
                 request.auth.token.admin == true; // Only admins can write
}
```

## Summary

✅ **Badges can now be added to Firestore without app updates**  
✅ **System checks Firestore first, then falls back to config**  
✅ **Redeem codes work immediately after adding badge**  
✅ **Cache refreshes every 5 minutes automatically**  
✅ **Backward compatible with existing config badges**

You can now add badges dynamically by simply creating documents in the `badges` collection!
