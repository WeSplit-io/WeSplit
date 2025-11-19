# Event Badge Creation Guide

This guide walks you through creating event badges with redeem codes for the WeSplit rewards system.

## Overview

Event badges are special badges that users can claim by entering a redeem code. These badges are perfect for:
- Special events and promotions
- Limited-time campaigns
- Community rewards
- Partnership collaborations
- Seasonal celebrations

## Prerequisites

- Access to Firebase Console
- Badge image file ready (recommended: 512x512px PNG with transparent background)
- Event details (name, description, points, rarity)

---

## Step 1: Prepare Badge Image

### Image Requirements
- **Format**: PNG (with transparency) or JPG
- **Size**: 512x512px (recommended)
- **Aspect Ratio**: 1:1 (square)
- **File Size**: Under 2MB
- **Background**: Transparent (for PNG) or solid color

### Design Tips
- Use high contrast colors for visibility
- Ensure text/numbers are readable at small sizes
- Keep design simple and recognizable
- Match your event theme/branding

---

## Step 2: Upload Image to Firebase Storage

### Option A: Using Firebase Console

1. **Open Firebase Console**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project

2. **Navigate to Storage**
   - Click "Storage" in the left sidebar
   - Click "Get Started" if first time

3. **Create Folder Structure**
   - Create folder: `badge_images/`
   - This keeps badge images organized

4. **Upload Image**
   - Click "Upload file" in `badge_images/` folder
   - Select your badge image file
   - Name it: `{badgeId}.png` (e.g., `event_summer_2024.png`)

5. **Get Download URL**
   - Click on the uploaded file
   - Click "Copy download URL"
   - Save this URL for Step 3

### Option B: Using Firebase Storage API (Programmatic)

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase/firebase';

async function uploadBadgeImage(badgeId: string, imageFile: File) {
  const imageRef = ref(storage, `badge_images/${badgeId}.png`);
  await uploadBytes(imageRef, imageFile);
  const downloadURL = await getDownloadURL(imageRef);
  return downloadURL;
}
```

---

## Step 3: Create Badge Image Document in Firestore

### Using Firebase Console

1. **Navigate to Firestore Database**
   - Click "Firestore Database" in Firebase Console

2. **Create Collection**
   - Create collection: `badge_images` (if it doesn't exist)

3. **Create Document**
   - Click "Add document"
   - Document ID: `{badgeId}` (e.g., `event_summer_2024`)
   - Add fields:
     ```
     imageUrl: {paste_download_url_from_step_2}
     uploadedAt: {current_timestamp}
     ```

### Using Firestore API

```typescript
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase/firebase';

async function createBadgeImageDocument(badgeId: string, imageUrl: string) {
  const badgeImageRef = doc(db, 'badge_images', badgeId);
  await setDoc(badgeImageRef, {
    imageUrl: imageUrl,
    uploadedAt: serverTimestamp()
  });
}
```

---

## Step 4: Add Badge to Configuration

### File Location
`src/services/rewards/badgeConfig.ts`

### Badge Definition Template

```typescript
'event_{event_name}_{year}': {
  badgeId: 'event_{event_name}_{year}',
  title: '{Event Name} {Year}',
  description: '{Event description}',
  icon: '{emoji_or_icon}', // Fallback if image fails
  iconUrl: undefined, // Will be fetched from Firebase Storage
  category: 'event',
  rarity: 'common' | 'rare' | 'epic' | 'legendary',
  points: {points_value}, // Points awarded when claimed
  isEventBadge: true,
  redeemCode: '{REDEEM_CODE}' // Uppercase, alphanumeric, no spaces
}
```

### Example: Summer Event 2024 Badge

```typescript
'event_summer_2024': {
  badgeId: 'event_summer_2024',
  title: 'Summer Event 2024',
  description: 'Participated in Summer Event',
  icon: '☀️',
  iconUrl: undefined,
  category: 'event',
  rarity: 'rare',
  points: 200,
  isEventBadge: true,
  redeemCode: 'SUMMER2024'
}
```

### Redeem Code Guidelines

- **Format**: Uppercase alphanumeric
- **Length**: 6-20 characters (recommended: 8-12)
- **Uniqueness**: Must be unique across all event badges
- **Examples**:
  - ✅ `SUMMER2024`
  - ✅ `WINTER2024`
  - ✅ `EVENT2024ABC`
  - ❌ `summer 2024` (spaces not allowed)
  - ❌ `summer-2024` (hyphens not recommended)

---

## Step 5: Test Badge Creation

### 1. Verify Image URL
- Check that the image URL is accessible
- Test in browser: paste URL and verify image loads
- Ensure URL is HTTPS (required for production)

### 2. Verify Firestore Document
- Check `badge_images/{badgeId}` document exists
- Verify `imageUrl` field contains valid URL

### 3. Test Redeem Code
- Open app → Rewards → How to Earn Points
- Navigate to "Badges" tab
- Click "Redeem Code" tab
- Enter redeem code
- Verify badge appears and can be claimed

### 4. Verify Badge Display
- After claiming, check "Claimed" tab
- Verify badge image displays correctly
- Check badge appears in user's profile

---

## Step 6: Distribute Redeem Codes

### Distribution Methods

1. **Social Media**
   - Post on Twitter, Instagram, etc.
   - Include redeem code in post
   - Use event hashtags

2. **Email Campaigns**
   - Send to user mailing list
   - Include in event announcement emails

3. **In-App Notifications**
   - Push notifications with redeem code
   - In-app banners or modals

4. **Partnership Channels**
   - Share with partners
   - Include in partner communications

5. **Event Pages**
   - Display on event landing pages
   - Include in event descriptions

### Best Practices

- **Time-Limited**: Set expiration dates if needed
- **Limited Quantity**: Track redemption count
- **Clear Instructions**: Tell users where to enter code
- **Support**: Provide help if users have issues

---

## Database Structure

### Badge Images Collection
```
badge_images/{badgeId}
  - imageUrl: string (Firebase Storage download URL)
  - uploadedAt: timestamp
```

### User Badge Claims
```
users/{userId}/badges/{badgeId}
  - badgeId: string
  - claimed: boolean
  - claimedAt: timestamp
  - imageUrl: string (cached from badge_images)
  - points: number
  - title: string
  - description: string
  - redeemCode: string (for event badges)
```

### User Document
```
users/{userId}
  - badges: string[] (array of badge IDs)
  - active_badge: string (currently active badge ID)
```

---

## Troubleshooting

### Image Not Displaying

**Issue**: Badge image doesn't show up

**Solutions**:
1. Verify image URL is accessible (test in browser)
2. Check Firebase Storage rules allow read access
3. Ensure image URL is HTTPS
4. Check Firestore `badge_images` document exists
5. Verify `imageUrl` field in document is correct

### Redeem Code Not Working

**Issue**: Redeem code doesn't claim badge

**Solutions**:
1. Check redeem code is uppercase (system auto-converts)
2. Verify badge exists in `badgeConfig.ts`
3. Check `isEventBadge: true` is set
4. Verify badge not already claimed
5. Check Firestore rules allow writes

### Badge Not Appearing

**Issue**: Badge doesn't show in "Redeem Code" tab

**Solutions**:
1. Verify `category: 'event'` or `isEventBadge: true`
2. Check badge not already claimed
3. Verify badge is in `badgeConfig.ts`
4. Restart app to refresh badge list

---

## Advanced: Batch Badge Creation

### Creating Multiple Event Badges

If creating multiple badges for an event:

1. **Prepare all images** (follow Step 1)
2. **Upload all to Firebase Storage** (follow Step 2)
3. **Create all Firestore documents** (follow Step 3)
4. **Add all to `badgeConfig.ts`** (follow Step 4)

### Script Template

```typescript
// scripts/createEventBadges.ts
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../src/config/firebase/firebase';

const eventBadges = [
  {
    badgeId: 'event_summer_2024',
    imageUrl: 'https://...',
    redeemCode: 'SUMMER2024',
    // ... other fields
  },
  // ... more badges
];

async function createEventBadges() {
  for (const badge of eventBadges) {
    // Create badge image document
    await setDoc(doc(db, 'badge_images', badge.badgeId), {
      imageUrl: badge.imageUrl,
      uploadedAt: new Date()
    });
    
    // Badge config is added manually to badgeConfig.ts
    console.log(`Created badge: ${badge.badgeId}`);
  }
}
```

---

## Checklist

Before distributing redeem codes, verify:

- [ ] Badge image uploaded to Firebase Storage
- [ ] Image URL is accessible and HTTPS
- [ ] Firestore `badge_images/{badgeId}` document created
- [ ] Badge added to `badgeConfig.ts`
- [ ] Redeem code is unique and uppercase
- [ ] Badge tested in app (redeem code works)
- [ ] Badge displays correctly after claiming
- [ ] Points awarded correctly
- [ ] Badge appears in "Claimed" tab

---

## Support

If you encounter issues:

1. Check Firebase Console for errors
2. Review app logs for badge service errors
3. Verify all steps completed correctly
4. Test with a simple badge first
5. Contact development team if needed

---

## Example: Complete Event Badge Creation

### Event: New Year 2025 Celebration

1. **Image**: `newyear_2025.png` (512x512px, 🎉 emoji design)
2. **Upload**: Firebase Storage → `badge_images/newyear_2025.png`
3. **URL**: `https://firebasestorage.googleapis.com/v0/b/.../newyear_2025.png`
4. **Firestore**: `badge_images/newyear_2025` → `{ imageUrl: "..." }`
5. **Config**:
   ```typescript
   'event_newyear_2025': {
     badgeId: 'event_newyear_2025',
     title: 'New Year 2025',
     description: 'Celebrated New Year 2025',
     icon: '🎉',
     iconUrl: undefined,
     category: 'event',
     rarity: 'common',
     points: 100,
     isEventBadge: true,
     redeemCode: 'NEWYEAR2025'
   }
   ```
6. **Distribute**: Share code `NEWYEAR2025` on social media
7. **Test**: Verify users can redeem and claim badge

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0

