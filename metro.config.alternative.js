const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Alternative approach: Use a custom transformer to handle problematic modules
config.transformer = {
  ...config.transformer,
  // Add custom transformer logic if needed
};

// Use resolverMainFields to prioritize browser versions
config.resolver = {
  ...config.resolver,
  alias: {
    // Essential polyfills only
    'stream': path.resolve(__dirname, 'node_modules/readable-stream'),
    'crypto': path.resolve(__dirname, 'src/config/crypto-stub.js'),
    'buffer': path.resolve(__dirname, 'node_modules/buffer'),
    'util': path.resolve(__dirname, 'node_modules/util'),
    'process': path.resolve(__dirname, 'node_modules/process'),
    'events': path.resolve(__dirname, 'node_modules/events'),
    '@noble/hashes/crypto.js': path.resolve(__dirname, 'src/config/crypto-stub.js'),
  },
  resolverMainFields: ['browser', 'react-native', 'main'], // Prioritize browser versions
  sourceExts: [...config.resolver.sourceExts, 'mjs', 'cjs'],
  platforms: ['ios', 'android', 'native', 'web'],
  unstable_enablePackageExports: false,
};

// Disable the problematic serializer entirely
config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => [],
  processModules: (modules, options) => {
    // Filter out modules with undefined paths and log them
    const validModules = modules.filter(module => {
      if (!module.path || typeof module.path !== 'string') {
        console.warn('Filtering out module with invalid path:', module);
        return false;
      }
      return true;
    });
    
    // Use the original processModules but with filtered modules
    return config.serializer.processModules(validModules, options);
  },
};

module.exports = config;
