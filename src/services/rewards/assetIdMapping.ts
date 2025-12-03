/**
 * Mapping for legacy asset IDs to their canonical counterparts.
 * Keeps backward compatibility for users who earned assets in prior seasons.
 */
export const LEGACY_ASSET_ID_MAPPING: Record<string, string> = {
  'profile_border_admin': 'profile_border_admin_2025',
  'profile_border_admin_2024': 'profile_border_admin_2025',
  'wallet_biscuit_2024': 'wallet_biscuit_2025',
  'profile_border_ice_crystal_2024': 'profile_border_ice_crystal_2025',
  'profile_border_christmas_wreath_2024': 'profile_border_christmas_wreath_2025',
};

/**
 * Resolve an asset ID to its canonical version if it exists in the legacy map.
 * Handles chained mappings while preventing infinite loops.
 */
export const getCanonicalAssetId = (assetId?: string | null): string | undefined => {
  if (!assetId) {
    return undefined;
  }

  let canonicalId = assetId;
  const visited = new Set<string>();

  while (LEGACY_ASSET_ID_MAPPING[canonicalId] && !visited.has(canonicalId)) {
    visited.add(canonicalId);
    canonicalId = LEGACY_ASSET_ID_MAPPING[canonicalId];
  }

  return canonicalId;
};

/**
 * Utility helper for callers that need access to the raw map (e.g. UI lists).
 */
export const getLegacyAssetIdMapping = (): Record<string, string> => LEGACY_ASSET_ID_MAPPING;


