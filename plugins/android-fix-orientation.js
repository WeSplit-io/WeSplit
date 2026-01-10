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
        if (activity.$) {
          // Remove screenOrientation from all activities, especially MainActivity
          // and GmsBarcodeScanningDelegateActivity (ML Kit barcode scanner)
          if (activity.$['android:screenOrientation']) {
            delete activity.$['android:screenOrientation'];
          }
          // Also remove tools:replace if it exists for screenOrientation
          if (activity.$['tools:replace'] && activity.$['tools:replace'].includes('android:screenOrientation')) {
            const replaceAttrs = activity.$['tools:replace'].split(',').map(s => s.trim());
            const filtered = replaceAttrs.filter(attr => attr !== 'android:screenOrientation');
            if (filtered.length > 0) {
              activity.$['tools:replace'] = filtered.join(',');
            } else {
              delete activity.$['tools:replace'];
            }
          }
        }
      });
    }

    // Also check for any activity-alias elements
    if (application['activity-alias']) {
      application['activity-alias'].forEach((alias) => {
        if (alias.$) {
          if (alias.$['android:screenOrientation']) {
            delete alias.$['android:screenOrientation'];
          }
          // Also remove tools:replace if it exists for screenOrientation
          if (alias.$['tools:replace'] && alias.$['tools:replace'].includes('android:screenOrientation')) {
            const replaceAttrs = alias.$['tools:replace'].split(',').map(s => s.trim());
            const filtered = replaceAttrs.filter(attr => attr !== 'android:screenOrientation');
            if (filtered.length > 0) {
              alias.$['tools:replace'] = filtered.join(',');
            } else {
              delete alias.$['tools:replace'];
            }
          }
        }
      });
    }

    return config;
  });
};

