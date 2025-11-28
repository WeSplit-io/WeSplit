// Debug script to test asset filtering and display names
const { getAssetsByType, getAssetInfo } = require('./src/services/rewards/assetConfig.ts');

// Asset ID mapping for backward compatibility (old IDs -> canonical IDs)
const ASSET_ID_MAPPING = {
  'profile_border_admin': 'profile_border_admin_2025',
  'profile_border_admin_2024': 'profile_border_admin_2025',
  'wallet_biscuit_2024': 'wallet_biscuit_2025',
  'profile_border_ice_crystal_2024': 'profile_border_ice_crystal_2025',
  'profile_border_christmas_wreath_2024': 'profile_border_christmas_wreath_2025',
};

// User's owned assets from logs
const ownedBorders = ["profile_border_admin", "profile_border_admin_2024", "profile_border_ice_crystal_2024", "profile_border_christmas_wreath_2024", "profile_border_admin_2025"];
const ownedBackgrounds = ["wallet_biscuit_2024"];

console.log('Testing asset filtering and display...');

try {
  const allBorders = getAssetsByType('profile_border');
  const allBackgrounds = getAssetsByType('wallet_background');

  console.log('All borders:');
  allBorders.forEach(b => {
    console.log(`  ${b.assetId}: "${b.name}"`);
  });

  console.log('All backgrounds:');
  allBackgrounds.forEach(b => {
    console.log(`  ${b.assetId}: "${b.name}"`);
  });

  console.log('\nUser owned borders:', ownedBorders);
  console.log('User owned backgrounds:', ownedBackgrounds);

  // Test the NEW filtering logic
  const canonicalOwnedBorderIds = new Set();

  ownedBorders.forEach(ownedId => {
    // If this ID has a mapping, use the canonical (mapped) version
    const canonicalId = ASSET_ID_MAPPING[ownedId] || ownedId;

    // Only add if the canonical asset exists in our config
    if (allBorders.some(a => a.assetId === canonicalId)) {
      canonicalOwnedBorderIds.add(canonicalId);
      console.log(`Adding canonical border: ${canonicalId} (from owned: ${ownedId})`);
    } else {
      console.log(`Canonical border not found: ${canonicalId} (from owned: ${ownedId})`);
    }
  });

  const userBorders = allBorders.filter(a => canonicalOwnedBorderIds.has(a.assetId));
  console.log('\nFiltered user borders:');
  userBorders.forEach(b => {
    console.log(`  ${b.assetId}: "${b.name}"`);
  });

  const canonicalOwnedBackgroundIds = new Set();

  ownedBackgrounds.forEach(ownedId => {
    // If this ID has a mapping, use the canonical (mapped) version
    const canonicalId = ASSET_ID_MAPPING[ownedId] || ownedId;

    // Only add if the canonical asset exists in our config
    if (allBackgrounds.some(a => a.assetId === canonicalId)) {
      canonicalOwnedBackgroundIds.add(canonicalId);
      console.log(`Adding canonical background: ${canonicalId} (from owned: ${ownedId})`);
    } else {
      console.log(`Canonical background not found: ${canonicalId} (from owned: ${ownedId})`);
    }
  });

  const userBackgrounds = allBackgrounds.filter(a => canonicalOwnedBackgroundIds.has(a.assetId));
  console.log('\nFiltered user backgrounds:');
  userBackgrounds.forEach(b => {
    console.log(`  ${b.assetId}: "${b.name}"`);
  });

} catch (error) {
  console.error('Error:', error);
}
