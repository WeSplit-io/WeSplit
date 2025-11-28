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
 * - assetType: Type of asset ('profile_image', 'wallet_background', or 'profile_border')
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
  assetType: 'profile_image' | 'wallet_background' | 'profile_border';
  category?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

/**
 * Asset Definitions
 * All assets available in the app
 */
const FIREBASE_STORAGE_BUCKET = 'gs://wesplit-35186.appspot.com';

const buildBorderUrl = (fileName: string) =>
  `${FIREBASE_STORAGE_BUCKET}/visuals-app/christmas/Rewards/Borders/${fileName}`;

const buildBackgroundUrl = (fileName: string) =>
  `${FIREBASE_STORAGE_BUCKET}/visuals-app/christmas/Rewards/Backgrounds/${fileName}`;

export const ASSET_DEFINITIONS: Record<string, AssetInfo> = {
  // Christmas 2025 Profile Images (not available)
  /*
  'profile_snowflake_2025': {
    assetId: 'profile_snowflake_2025',
    name: 'Snowflake Profile',
    description: 'A festive snowflake profile image',
    url: buildAssetUrl('profile_snowflake_2025.png'),
    assetType: 'profile_image',
    category: 'christmas',
    rarity: 'common'
  },
  'profile_reindeer_2025': {
    assetId: 'profile_reindeer_2025',
    name: 'Reindeer Profile',
    description: 'A cute reindeer profile image',
    url: buildAssetUrl('profile_reindeer_2025.png'),
    assetType: 'profile_image',
    category: 'christmas',
    rarity: 'common'
  },
  'profile_ornament_2025': {
    assetId: 'profile_ornament_2025',
    name: 'Ornament Profile',
    description: 'A festive ornament profile image',
    url: buildAssetUrl('profile_ornament_2025.png'),
    assetType: 'profile_image',
    category: 'christmas',
    rarity: 'rare'
  },
  */
  
  // Christmas 2025 Profile Borders (PNG - not uploaded)
  /*
  'profile_border_candycane_2025': {
    assetId: 'profile_border_candycane_2025',
    name: 'Candy Cane Border',
    description: 'Striped candy cane ring for your avatar',
    url: buildAssetUrl('profile_border_candycane_2025.png'),
    assetType: 'profile_border',
    category: 'christmas',
    rarity: 'rare'
  },
  'profile_border_aurora_2025': {
    assetId: 'profile_border_aurora_2025',
    name: 'Aurora Border',
    description: 'A glowing aurora halo for your profile picture',
    url: buildAssetUrl('profile_border_aurora_2025.png'),
    assetType: 'profile_border',
    category: 'christmas',
    rarity: 'epic'
  },
  'profile_border_midnight_2025': {
    assetId: 'profile_border_midnight_2025',
    name: 'Midnight Frost Border',
    description: 'Frosted midnight rim for a premium look',
    url: buildAssetUrl('profile_border_midnight_2025.png'),
    assetType: 'profile_border',
    category: 'christmas',
    rarity: 'legendary'
  },
  */
  
  // Christmas 2025 Profile Borders (PNG)
  'profile_border_admin_2025': {
    assetId: 'profile_border_admin_2025',
    name: 'Admin Crown',
    description: 'Exclusive golden crown border for administrators',
    url: buildBorderUrl('AdminBorder.png'),
    assetType: 'profile_border',
    category: 'special',
    rarity: 'legendary'
  },
  'profile_border_christmas_wreath_2025': {
    assetId: 'profile_border_christmas_wreath_2025',
    name: 'Christmas Wreath',
    description: 'A festive wreath border with holly and berries',
    url: buildBorderUrl('ChristmasBorder.png'),
    assetType: 'profile_border',
    category: 'christmas',
    rarity: 'epic'
  },
  'profile_border_ice_crystal_2025': {
    assetId: 'profile_border_ice_crystal_2025',
    name: 'Ice Crystal',
    description: 'Sparkling ice crystal border for a frosty look',
    url: buildBorderUrl('IceBorder.png'),
    assetType: 'profile_border',
    category: 'christmas',
    rarity: 'rare'
  },
  
  // Christmas Calendar 2025 Wallet Backgrounds (PNG - not uploaded)
  /*
  'wallet_winter_2025': {
    assetId: 'wallet_winter_2025',
    name: 'Winter Wonderland',
    description: 'A beautiful winter scene for your wallet',
    url: buildAssetUrl('wallet_winter_2025.png'),
    assetType: 'wallet_background',
    category: 'christmas',
    rarity: 'common'
  },
  'wallet_christmas_2025': {
    assetId: 'wallet_christmas_2025',
    name: 'Christmas Magic',
    description: 'A magical Christmas scene',
    url: buildAssetUrl('wallet_christmas_2025.png'),
    assetType: 'wallet_background',
    category: 'christmas',
    rarity: 'rare'
  },
  */
  
  // Christmas 2025 Wallet Backgrounds (PNG)
  'wallet_biscuit_2025': {
    assetId: 'wallet_biscuit_2025',
    name: 'Biscuit Bliss',
    description: 'Festive gingerbread cookie background for your balance card',
    url: buildBackgroundUrl('BiscuitBackground.png'),
    assetType: 'wallet_background',
    category: 'christmas',
    rarity: 'rare'
  },

  'wallet_snowflakes_2025': {
    assetId: 'wallet_snowflakes_2025',
    name: 'Snowflake Dance',
    description: 'Delicate snowflakes floating across your balance card',
    url: buildBackgroundUrl('SnowFlakes.png'),
    assetType: 'wallet_background',
    category: 'christmas',
    rarity: 'epic'
  },
  'wallet_snowland_2025': {
    assetId: 'wallet_snowland_2025',
    name: 'Snow Land',
    description: 'A magical winter landscape with penguin for your balance card',
    url: buildBackgroundUrl('SnowLand.png'),
    assetType: 'wallet_background',
    category: 'christmas',
    rarity: 'legendary'
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

/**
 * Validate asset configuration
 * Ensures all assets have valid required fields and consistent data
 * 
 * @returns Array of validation errors (empty if valid)
 */
export function validateAssetConfig(): string[] {
  const errors: string[] = [];
  const validRarities: Array<AssetInfo['rarity']> = ['common', 'rare', 'epic', 'legendary'];
  const validAssetTypes: AssetInfo['assetType'][] = ['profile_image', 'wallet_background', 'profile_border'];
  const validChains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'];
  
  Object.entries(ASSET_DEFINITIONS).forEach(([assetId, asset]) => {
    // Required fields
    if (!asset.assetId || asset.assetId.trim() === '') {
      errors.push(`Asset '${assetId}' has empty or missing assetId`);
    }
    if (asset.assetId !== assetId) {
      errors.push(`Asset '${assetId}' has mismatched assetId: '${asset.assetId}'`);
    }
    if (!asset.name || asset.name.trim() === '') {
      errors.push(`Asset '${assetId}' has empty or missing name`);
    }
    if (!asset.description || asset.description.trim() === '') {
      errors.push(`Asset '${assetId}' has empty or missing description`);
    }
    if (!asset.assetType) {
      errors.push(`Asset '${assetId}' has missing assetType`);
    } else if (!validAssetTypes.includes(asset.assetType)) {
      errors.push(`Asset '${assetId}' has invalid assetType: '${asset.assetType}'`);
    }
    
    // Rarity validation
    if (asset.rarity && !validRarities.includes(asset.rarity)) {
      errors.push(`Asset '${assetId}' has invalid rarity: '${asset.rarity}'`);
    }
    
    // URL or NFT validation - must have at least one
    if (!asset.url && !asset.nftMetadata) {
      errors.push(`Asset '${assetId}' must have either url or nftMetadata`);
    }
    
    // URL validation
    if (asset.url) {
      if (typeof asset.url !== 'string' || asset.url.trim() === '') {
        errors.push(`Asset '${assetId}' has invalid url`);
      } else if (!asset.url.startsWith('http://') && 
                 !asset.url.startsWith('https://') && 
                 !asset.url.startsWith('gs://')) {
        errors.push(`Asset '${assetId}' has url that doesn't start with http://, https://, or gs://: '${asset.url}'`);
      }
    }
    
    // NFT metadata validation
    if (asset.nftMetadata) {
      if (!asset.nftMetadata.contractAddress || asset.nftMetadata.contractAddress.trim() === '') {
        errors.push(`Asset '${assetId}' NFT metadata has empty or missing contractAddress`);
      }
      if (!asset.nftMetadata.tokenId || asset.nftMetadata.tokenId.trim() === '') {
        errors.push(`Asset '${assetId}' NFT metadata has empty or missing tokenId`);
      }
      if (asset.nftMetadata.chain && !validChains.includes(asset.nftMetadata.chain)) {
        // Allow other chains as strings, but warn about common ones
        if (typeof asset.nftMetadata.chain === 'string' && asset.nftMetadata.chain.length > 0) {
          // Valid custom chain
        } else {
          errors.push(`Asset '${assetId}' NFT metadata has invalid chain: '${asset.nftMetadata.chain}'`);
        }
      }
      if (asset.nftMetadata.imageUrl) {
        if (typeof asset.nftMetadata.imageUrl !== 'string' || asset.nftMetadata.imageUrl.trim() === '') {
          errors.push(`Asset '${assetId}' NFT metadata has invalid imageUrl`);
        }
      }
    }
  });
  
  return errors;
}

