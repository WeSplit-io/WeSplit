const { withPlugins } = require('@expo/config-plugins');

const withFirebaseNoAppDelegate = (config) => {
  // This plugin does nothing - it's just a placeholder to prevent
  // the auto-registration of @react-native-firebase/app plugin
  return config;
};

module.exports = withFirebaseNoAppDelegate;
