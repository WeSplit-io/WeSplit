const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simplified configuration to prevent module resolution issues
config.resolver = {
  ...config.resolver,
  resolverMainFields: ['react-native', 'browser', 'main'],
  platforms: ['ios', 'android', 'native', 'web'],
  // Remove complex alias configuration that might cause issues
  sourceExts: [...config.resolver.sourceExts, 'mjs', 'cjs'],
  
  // Add alias to help resolve the problematic import
  alias: {
    '@reown/appkit-wallet/utils': '@reown/appkit-wallet/dist/esm/exports/utils.js',
  },
};

config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    mangle: {
      ...config.transformer.minifierConfig?.mangle,
      keep_fnames: true,
    },
  },
  experimentalImportSupport: false,
  inlineRequires: true,
};

module.exports = config;