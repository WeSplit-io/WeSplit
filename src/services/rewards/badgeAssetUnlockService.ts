/**
 * Badge Asset Unlock Service
 * Automatically unlocks assets based on badges users have earned
 * 
 * This service handles the relationship between badges and exclusive assets.
 * For example, users with the WeSplit community badge automatically get the Admin border.
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { getAssetInfo } from './assetConfig';

/**
 * Badge to Asset mapping
 * Defines which assets are automatically unlocked when a user has certain badges
 */
export const BADGE_ASSET_UNLOCKS: Record<string, string[]> = {
  // Users with the WeSplit community badge get the Admin Crown border
  'community_wesplit': ['profile_border_admin_2024'],
  
  // Add more badge-to-asset mappings here as needed
  // Example:
  // 'champion_2024': ['some_exclusive_asset'],
};

/**
 * Check and unlock assets for a user based on their badges
 * This should be called when:
 * - User earns a new badge
 * - User logs in (to sync any missed unlocks)
 * - User claims a badge via redeem code
 * 
 * @param userId User ID to check and unlock assets for
 * @returns Object containing unlocked assets info
 */
export async function checkAndUnlockBadgeAssets(userId: string): Promise<{
  newlyUnlocked: string[];
  alreadyOwned: string[];
  errors: string[];
}> {
  const result = {
    newlyUnlocked: [] as string[],
    alreadyOwned: [] as string[],
    errors: [] as string[],
  };

  try {
    // Get user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      result.errors.push('User not found');
      return result;
    }

    const userData = userDoc.data();
    const userBadges = userData.badges || [];
    const userProfileBorders = userData.profile_borders || [];
    const userWalletBackgrounds = userData.wallet_backgrounds || [];

    // Check each badge the user has
    for (const badgeId of userBadges) {
      const assetsToUnlock = BADGE_ASSET_UNLOCKS[badgeId];
      
      if (!assetsToUnlock || assetsToUnlock.length === 0) {
        continue;
      }

      // Process each asset that should be unlocked for this badge
      for (const assetId of assetsToUnlock) {
        const assetInfo = getAssetInfo(assetId);
        
        if (!assetInfo) {
          logger.warn('Asset not found in config', { assetId, badgeId }, 'BadgeAssetUnlockService');
          continue;
        }

        // Check if user already owns this asset
        let alreadyOwned = false;
        let updateField = '';
        let currentAssets: string[] = [];

        switch (assetInfo.assetType) {
          case 'profile_border':
            alreadyOwned = userProfileBorders.includes(assetId);
            updateField = 'profile_borders';
            currentAssets = userProfileBorders;
            break;
          case 'wallet_background':
            alreadyOwned = userWalletBackgrounds.includes(assetId);
            updateField = 'wallet_backgrounds';
            currentAssets = userWalletBackgrounds;
            break;
          case 'profile_image':
            alreadyOwned = (userData.profile_assets || []).includes(assetId);
            updateField = 'profile_assets';
            currentAssets = userData.profile_assets || [];
            break;
        }

        if (alreadyOwned) {
          result.alreadyOwned.push(assetId);
          continue;
        }

        // Unlock the asset
        try {
          const updateData: Record<string, any> = {
            [updateField]: [...currentAssets, assetId],
          };

          // Set as active if user doesn't have one
          if (assetInfo.assetType === 'profile_border' && !userData.active_profile_border) {
            updateData.active_profile_border = assetId;
          } else if (assetInfo.assetType === 'wallet_background' && !userData.active_wallet_background) {
            updateData.active_wallet_background = assetId;
          } else if (assetInfo.assetType === 'profile_image' && !userData.active_profile_asset) {
            updateData.active_profile_asset = assetId;
          }

          await updateDoc(userRef, updateData);
          result.newlyUnlocked.push(assetId);
          
          // Update local tracking to prevent duplicate updates in same call
          if (assetInfo.assetType === 'profile_border') {
            userProfileBorders.push(assetId);
          } else if (assetInfo.assetType === 'wallet_background') {
            userWalletBackgrounds.push(assetId);
          }

          logger.info('Asset unlocked via badge', { 
            userId, 
            assetId, 
            badgeId,
            assetType: assetInfo.assetType 
          }, 'BadgeAssetUnlockService');
        } catch (error) {
          logger.error('Failed to unlock asset', { userId, assetId, error }, 'BadgeAssetUnlockService');
          result.errors.push(`Failed to unlock ${assetId}`);
        }
      }
    }

    return result;
  } catch (error) {
    logger.error('Error checking badge assets', { userId, error }, 'BadgeAssetUnlockService');
    result.errors.push('Failed to check badge assets');
    return result;
  }
}

/**
 * Check if a specific badge grants any assets
 * @param badgeId Badge ID to check
 * @returns Array of asset IDs that would be unlocked
 */
export function getBadgeAssets(badgeId: string): string[] {
  return BADGE_ASSET_UNLOCKS[badgeId] || [];
}

/**
 * Get all badges that grant assets
 * @returns Record of badge IDs to asset IDs
 */
export function getAllBadgeAssetUnlocks(): Record<string, string[]> {
  return { ...BADGE_ASSET_UNLOCKS };
}

