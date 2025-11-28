/**
 * Asset Service
 * Manages user assets (profile images and wallet backgrounds)
 * Handles fetching asset metadata from database and config
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { getAssetInfo, AssetInfo } from './assetConfig';
import { NFTMetadata } from './assetConfig';
import { resolveStorageUrl } from '../shared/storageUrlService';

export interface UserAssetMetadata {
  assetId: string;
  assetType: 'profile_image' | 'wallet_background' | 'profile_border';
  name: string;
  description: string;
  assetUrl?: string | null;
  nftMetadata?: NFTMetadata | null;
  claimed_at?: any;
  claimed_from?: string;
}

/**
 * Get asset metadata for a user's claimed asset
 * First tries to fetch from database subcollection (has actual claimed data)
 * Falls back to config file (has template definitions)
 */
export async function getUserAssetMetadata(
  userId: string,
  assetId: string
): Promise<AssetInfo | null> {
  try {
    // First, try to get from database subcollection (has actual claimed data)
    const assetRef = doc(db, 'users', userId, 'assets', assetId);
    const assetDoc = await getDoc(assetRef);

    if (assetDoc.exists()) {
      const data = assetDoc.data() as UserAssetMetadata;
      
      // Merge database data with config data (database has priority)
      const configAsset = getAssetInfo(assetId);
      
      const metadata: AssetInfo = {
        assetId: data.assetId || assetId,
        name: data.name || configAsset?.name || assetId,
        description: data.description || configAsset?.description || '',
        // Always use config URL for Christmas assets to ensure latest PNG URLs
        url: (configAsset?.category === 'christmas') ? configAsset?.url : (configAsset?.url || data.assetUrl),
        nftMetadata: data.nftMetadata || configAsset?.nftMetadata,
        assetType: data.assetType || configAsset?.assetType || 'profile_image',
        category: configAsset?.category,
        rarity: configAsset?.rarity
      };

      return await withResolvedAssetUrl(assetId, metadata, { userId, source: 'userAssetDoc' });
    }

    // Fallback to config file if not in database
    const configAsset = getAssetInfo(assetId);
    return await withResolvedAssetUrl(assetId, configAsset, { userId, source: 'assetConfig' });
  } catch (error) {
    logger.error('Failed to get user asset metadata', error, 'AssetService');
    // Fallback to config file on error
    const configAsset = getAssetInfo(assetId);
    return await withResolvedAssetUrl(assetId, configAsset, { userId, source: 'assetConfig', fallback: true });
  }
}

/**
 * Get all assets for a user from database
 */
export async function getUserAssets(userId: string): Promise<UserAssetMetadata[]> {
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const assetsRef = collection(db, 'users', userId, 'assets');
    const assetsSnapshot = await getDocs(assetsRef);

    const assets: UserAssetMetadata[] = [];
    assetsSnapshot.forEach((doc) => {
      assets.push({
        assetId: doc.id,
        ...doc.data()
      } as UserAssetMetadata);
    });

    return assets;
  } catch (error) {
    logger.error('Failed to get user assets', error, 'AssetService');
    return [];
  }
}

/**
 * Get asset image URL (from database or config)
 * Priority: Database assetUrl > Database NFT imageUrl > Config url > Config NFT imageUrl
 */
export async function getAssetImageUrl(
  userId: string,
  assetId: string
): Promise<string | null> {
  try {
    const metadata = await getUserAssetMetadata(userId, assetId);
    if (!metadata) {
      return null;
    }

    // Priority: Database URL > Database NFT > Config URL > Config NFT
    return metadata.url || metadata.nftMetadata?.imageUrl || null;
  } catch (error) {
    logger.error('Failed to get asset image URL', error, 'AssetService');
    return null;
  }
}

async function withResolvedAssetUrl(
  assetId: string,
  metadata: AssetInfo | null,
  context: Record<string, unknown>
): Promise<AssetInfo | null> {
  if (!metadata) {
    return null;
  }

  if (!metadata.url) {
    return metadata;
  }

  const resolvedUrl = await resolveStorageUrl(metadata.url, { assetId, ...context });
  if (!resolvedUrl) {
    // Don't return the metadata with unresolved gs:// URL
    // Return metadata without the URL field instead
    const { url, ...metadataWithoutUrl } = metadata;
    return metadataWithoutUrl;
  }

  return {
    ...metadata,
    url: resolvedUrl
  };
}

