const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle module resolution issues
config.resolver = {
  ...config.resolver,
  alias: {
    // Handle crypto module resolution
    'crypto': path.resolve(__dirname, 'src/config/crypto-stub.js'),
    '@noble/hashes/crypto.js': path.resolve(__dirname, 'src/config/crypto-stub.js'),
    // Add theme alias
    '@theme': path.resolve(__dirname, 'src/theme'),
    '@features': path.resolve(__dirname, 'src/features'),
    '@components': path.resolve(__dirname, 'src/components'),
    '@screens': path.resolve(__dirname, 'src/screens'),
    '@services': path.resolve(__dirname, 'src/services'),
    '@utils': path.resolve(__dirname, 'src/utils'),
    '@types': path.resolve(__dirname, 'src/types'),
    '@libs': path.resolve(__dirname, 'src/libs'),
    '@config': path.resolve(__dirname, 'src/config'),
  },
  // Add platform extensions
  platforms: ['ios', 'android', 'native', 'web'],
};

// Add transformer configuration
config.transformer = {
  ...config.transformer,
  // Enable unstable transform for import.meta
  unstable_allowRequireContext: true,
};

module.exports = config;
