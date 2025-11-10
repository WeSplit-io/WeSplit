/**
 * Asset Configuration Service
 * Centralized configuration for all user assets (profile images and wallet backgrounds)
 * 
 * This file defines all assets available in the app.
 * Assets can be easily edited here by the design team.
 * 
 * Asset Structure:
 * - assetId: Unique identifier for the asset
 * - name: Display name for the asset
 * - description: Description of the asset
 * - url: URL to the asset image
 * - assetType: Type of asset ('profile_image' or 'wallet_background')
 * - category: Category of the asset (e.g., 'christmas', 'seasonal', 'special')
 * - rarity: Rarity level (e.g., 'common', 'rare', 'epic', 'legendary')
 */

export interface NFTMetadata {
  contractAddress: string;
  tokenId: string;
  chain: 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base' | string;
  imageUrl?: string; // NFT image preview URL
  metadataUrl?: string; // IPFS or other metadata URL
}

export interface AssetInfo {
  assetId: string;
  name: string;
  description: string;
  // Support both image URLs and NFTs
  url?: string; // For image URLs (HTTP/HTTPS)
  nftMetadata?: NFTMetadata; // For NFTs
  assetType: 'profile_image' | 'wallet_background';
  category?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

/**
 * Asset Definitions
 * All assets available in the app
 */
export const ASSET_DEFINITIONS: Record<string, AssetInfo> = {
  // Christmas Calendar 2024 Profile Images
  'profile_snowflake_2024': {
    assetId: 'profile_snowflake_2024',
    name: 'Snowflake Profile',
    description: 'A festive snowflake profile image',
    url: 'https://example.com/assets/profile_snowflake.png', // TODO: Replace with actual asset URL
    assetType: 'profile_image',
    category: 'christmas',
    rarity: 'common'
  },
  'profile_reindeer_2024': {
    assetId: 'profile_reindeer_2024',
    name: 'Reindeer Profile',
    description: 'A cute reindeer profile image',
    url: 'https://example.com/assets/profile_reindeer.png', // TODO: Replace with actual asset URL
    assetType: 'profile_image',
    category: 'christmas',
    rarity: 'common'
  },
  'profile_ornament_2024': {
    assetId: 'profile_ornament_2024',
    name: 'Ornament Profile',
    description: 'A festive ornament profile image',
    url: 'https://example.com/assets/profile_ornament.png', // TODO: Replace with actual asset URL
    assetType: 'profile_image',
    category: 'christmas',
    rarity: 'rare'
  },
  
  // Christmas Calendar 2024 Wallet Backgrounds
  'wallet_winter_2024': {
    assetId: 'wallet_winter_2024',
    name: 'Winter Wonderland',
    description: 'A beautiful winter scene for your wallet',
    url: 'https://example.com/assets/wallet_winter.png', // TODO: Replace with actual asset URL
    assetType: 'wallet_background',
    category: 'christmas',
    rarity: 'common'
  },
  'wallet_christmas_2024': {
    assetId: 'wallet_christmas_2024',
    name: 'Christmas Magic',
    description: 'A magical Christmas scene',
    url: 'https://example.com/assets/wallet_christmas.png', // TODO: Replace with actual asset URL
    assetType: 'wallet_background',
    category: 'christmas',
    rarity: 'rare'
  },
  'wallet_solstice_2024': {
    assetId: 'wallet_solstice_2024',
    name: 'Winter Solstice',
    description: 'Celebrate the longest night',
    url: 'https://example.com/assets/wallet_solstice.png', // TODO: Replace with actual asset URL
    assetType: 'wallet_background',
    category: 'christmas',
    rarity: 'epic'
  },
  
  // Add more assets here as they are created
  // Example:
  // 'profile_default': {
  //   assetId: 'profile_default',
  //   name: 'Default Profile',
  //   description: 'Default profile image',
  //   url: 'https://example.com/assets/default.png',
  //   assetType: 'profile_image',
  //   category: 'default',
  //   rarity: 'common'
  // },
};

/**
 * Get asset information by asset ID
 * @param assetId Asset identifier
 * @returns Asset information or null if not found
 */
export function getAssetInfo(assetId: string): AssetInfo | null {
  return ASSET_DEFINITIONS[assetId] || null;
}

/**
 * Get all assets
 * @returns Array of all asset definitions
 */
export function getAllAssets(): AssetInfo[] {
  return Object.values(ASSET_DEFINITIONS);
}

/**
 * Get assets by type
 * @param assetType Asset type ('profile_image' or 'wallet_background')
 * @returns Array of assets of the specified type
 */
export function getAssetsByType(assetType: AssetInfo['assetType']): AssetInfo[] {
  return Object.values(ASSET_DEFINITIONS).filter(
    asset => asset.assetType === assetType
  );
}

/**
 * Get assets by category
 * @param category Asset category
 * @returns Array of assets in the category
 */
export function getAssetsByCategory(category: string): AssetInfo[] {
  return Object.values(ASSET_DEFINITIONS).filter(
    asset => asset.category === category
  );
}

/**
 * Get assets by rarity
 * @param rarity Asset rarity level
 * @returns Array of assets with the rarity
 */
export function getAssetsByRarity(rarity: AssetInfo['rarity']): AssetInfo[] {
  return Object.values(ASSET_DEFINITIONS).filter(
    asset => asset.rarity === rarity
  );
}

/**
 * Check if an asset exists
 * @param assetId Asset identifier
 * @returns True if asset exists, false otherwise
 */
export function assetExists(assetId: string): boolean {
  return assetId in ASSET_DEFINITIONS;
}

