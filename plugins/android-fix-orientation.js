const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to fix Android 16 orientation warnings
 * 
 * This plugin removes screenOrientation restrictions from AndroidManifest.xml
 * to comply with Android 16 requirements for large screen devices (tablets, foldables).
 * 
 * Android 16 will ignore orientation restrictions on devices with width >= 600dp,
 * so we remove them proactively to avoid warnings and ensure proper behavior.
 */
module.exports = function withAndroidOrientationFix(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application || !manifest.application[0]) {
      return config;
    }

    const application = manifest.application[0];
    
    // Remove screenOrientation from MainActivity
    if (application.activity) {
      application.activity.forEach((activity) => {
        if (activity.$ && activity.$.name) {
          // Remove screenOrientation from all activities, especially MainActivity
          // and GmsBarcodeScanningDelegateActivity (ML Kit barcode scanner)
          if (activity.$['android:screenOrientation']) {
            delete activity.$['android:screenOrientation'];
          }
        }
      });
    }

    // Also check for any activity-alias elements
    if (application['activity-alias']) {
      application['activity-alias'].forEach((alias) => {
        if (alias.$ && alias.$['android:screenOrientation']) {
          delete alias.$['android:screenOrientation'];
        }
      });
    }

    return config;
  });
};

