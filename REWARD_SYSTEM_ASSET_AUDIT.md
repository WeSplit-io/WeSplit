# Reward System Asset Distribution Audit

**Date:** 2024-12-19  
**Focus:** Asset distribution (image URLs and NFTs), claiming, and usage

## Executive Summary

This audit verifies the end-to-end flow of asset distribution in the reward system, ensuring that:
1. Assets can be distributed as image URLs or NFTs
2. Users can properly claim and use the assets
3. Labels/icons are properly displayed in the calendar

---

## Current Implementation Status

### ✅ What's Working

1. **Asset Types Defined**
   - ✅ `AssetGift` type supports `assetUrl: string`
   - ✅ Asset configuration in `assetConfig.ts` has `url: string` field
   - ✅ Badge configuration supports `icon?: string` (emoji or identifier)

2. **Asset Claiming**
   - ✅ Assets are properly claimed via Firestore transaction
   - ✅ Asset IDs are stored in user document (`profile_assets[]`, `wallet_backgrounds[]`)
   - ✅ Active asset is set automatically

3. **Asset Storage**
   - ✅ Asset IDs stored in database
   - ✅ Asset definitions in `assetConfig.ts` contain URLs

### ❌ Issues Found

1. **Asset URLs Not Stored in User Data**
   - ❌ Only `assetId` is stored, not the `assetUrl`
   - ❌ When user claims asset, URL is lost (only ID stored)
   - ❌ Cannot retrieve asset URL from user data alone

2. **NFT Support Missing**
   - ❌ No NFT metadata support (contract address, token ID, chain)
   - ❌ Types don't support NFT-specific fields
   - ❌ Cannot distribute NFTs as gifts

3. **Asset Images Not Displayed**
   - ❌ Christmas Calendar modal doesn't show asset preview image
   - ❌ ProfileAssetDisplay only shows name, not actual image
   - ❌ No image rendering from URLs

4. **Badge Icon Ambiguity**
   - ⚠️ Badge `icon` field comment says "URL or icon identifier" but only emojis used
   - ⚠️ No support for badge image URLs

---

## Detailed Analysis

### 1. Asset Type Definitions

**Current:**
```typescript
export interface AssetGift {
  type: 'asset';
  assetId: string;
  assetType: 'profile_image' | 'wallet_background';
  assetUrl: string;  // ✅ URL supported
  name: string;
  description?: string;
}
```

**Issue:** No NFT support

**Needed:**
```typescript
export interface AssetGift {
  type: 'asset';
  assetId: string;
  assetType: 'profile_image' | 'wallet_background';
  // Support both URL and NFT
  assetUrl?: string;  // For image URLs
  nftMetadata?: {    // For NFTs
    contractAddress: string;
    tokenId: string;
    chain: string;  // 'ethereum', 'polygon', etc.
    imageUrl?: string;  // NFT image preview
  };
  name: string;
  description?: string;
}
```

### 2. Asset Claiming Flow

**Current Flow:**
1. User claims asset → `claimGift()` called
2. Asset ID added to `profile_assets[]` or `wallet_backgrounds[]`
3. Active asset set if none exists
4. **URL/NFT metadata NOT stored in user document**

**Issue:** Cannot retrieve asset URL/NFT from user data

**Needed:**
- Store asset metadata (URL or NFT) in user document
- Or: Store in subcollection `users/{userId}/assets/{assetId}` with full metadata

### 3. Asset Display

**Christmas Calendar Modal:**
- ❌ Shows asset name and description
- ❌ Does NOT show asset image preview
- ❌ No image rendering from `assetUrl`

**ProfileAssetDisplay:**
- ❌ Only shows asset name as text
- ❌ Does NOT display actual image from URL
- ❌ No image component

**Needed:**
- Display actual images from URLs
- Support NFT image previews
- Fallback for missing images

### 4. Badge Icons

**Current:**
- Badge `icon` field supports emoji (✅ working)
- Comment says "URL or icon identifier" but no URL support implemented

**Needed:**
- Support badge image URLs
- Display badge images in BadgeDisplay component

---

## Recommendations

### Priority 1: Critical Fixes

1. **Add NFT Support to Types**
   - Update `AssetGift` interface to support NFT metadata
   - Update `AssetInfo` interface in `assetConfig.ts`

2. **Store Asset Metadata in User Data**
   - Option A: Store in user document subcollection `users/{userId}/assets/{assetId}`
   - Option B: Store asset metadata in user document arrays (more complex)

3. **Display Asset Images**
   - Update Christmas Calendar modal to show asset preview
   - Update ProfileAssetDisplay to render images from URLs

### Priority 2: Enhancements

4. **Badge Image Support**
   - Support badge image URLs
   - Update BadgeDisplay to show images

5. **NFT Integration**
   - Add NFT metadata fetching
   - Support multiple chains
   - Display NFT images

---

## Implementation Plan

### Step 1: Update Types
- [ ] Add NFT metadata to `AssetGift`
- [ ] Update `AssetInfo` to support NFTs
- [ ] Update badge types to support image URLs

### Step 2: Update Claiming Logic
- [ ] Store asset metadata (URL/NFT) when claiming
- [ ] Create asset subcollection or update user document structure

### Step 3: Update Display Components
- [ ] Add image rendering to Christmas Calendar modal
- [ ] Add image rendering to ProfileAssetDisplay
- [ ] Add image rendering to BadgeDisplay (if URLs supported)

### Step 4: Update Asset Config
- [ ] Add NFT examples to asset config
- [ ] Add badge image URL examples

---

## Files to Modify

1. `src/types/rewards.ts` - Add NFT support
2. `src/services/rewards/christmasCalendarService.ts` - Store asset metadata
3. `src/components/rewards/ChristmasCalendar.tsx` - Display asset images
4. `src/components/profile/ProfileAssetDisplay.tsx` - Render images
5. `src/services/rewards/assetConfig.ts` - Add NFT examples
6. `src/services/rewards/badgeConfig.ts` - Add image URL support
7. `src/services/data/firebaseDataService.ts` - Update data structure

---

**Status:** 🔴 **Needs Implementation**  
**Priority:** **High** - Users cannot see or use asset images currently

