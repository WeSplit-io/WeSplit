// Simple script to fix user assets - replace 2024 IDs with 2025 IDs
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./config/environment/production/firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://wesplit-35186.firebaseio.com'
});

const db = admin.firestore();

// Asset ID mapping
const ASSET_ID_MAPPING = {
  'profile_border_admin': 'profile_border_admin_2025',
  'profile_border_admin_2024': 'profile_border_admin_2025',
  'wallet_biscuit_2024': 'wallet_biscuit_2025',
  'profile_border_ice_crystal_2024': 'profile_border_ice_crystal_2025',
  'profile_border_christmas_wreath_2024': 'profile_border_christmas_wreath_2025',
};

async function fixUserAssets(userId) {
  try {
    console.log(`Fixing assets for user: ${userId}`);

    // Get user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log('User not found');
      return;
    }

    const userData = userDoc.data();
    console.log('Current user data:', {
      profile_borders: userData.profile_borders,
      wallet_backgrounds: userData.wallet_backgrounds,
      active_profile_border: userData.active_profile_border,
      active_wallet_background: userData.active_wallet_background
    });

    // Update profile borders
    const updatedBorders = userData.profile_borders?.map(borderId =>
      ASSET_ID_MAPPING[borderId] || borderId
    ) || [];

    // Remove duplicates
    const uniqueBorders = [...new Set(updatedBorders)];

    // Update wallet backgrounds
    const updatedBackgrounds = userData.wallet_backgrounds?.map(bgId =>
      ASSET_ID_MAPPING[bgId] || bgId
    ) || [];

    // Remove duplicates
    const uniqueBackgrounds = [...new Set(updatedBackgrounds)];

    // Update active assets
    const activeProfileBorder = ASSET_ID_MAPPING[userData.active_profile_border] || userData.active_profile_border;
    const activeWalletBackground = ASSET_ID_MAPPING[userData.active_wallet_background] || userData.active_wallet_background;

    // Update the user document
    await userRef.update({
      profile_borders: uniqueBorders,
      wallet_backgrounds: uniqueBackgrounds,
      active_profile_border: activeProfileBorder,
      active_wallet_background: activeWalletBackground,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Updated user data:', {
      profile_borders: uniqueBorders,
      wallet_backgrounds: uniqueBackgrounds,
      active_profile_border: activeProfileBorder,
      active_wallet_background: activeWalletBackground
    });

    console.log('✅ User assets fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing user assets:', error);
  } finally {
    admin.app().delete();
  }
}

// Run the script
const userId = 'GymQMVM4niW8v1DdEwNSnY5VePq1';
fixUserAssets(userId);
