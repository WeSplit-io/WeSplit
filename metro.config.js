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
    // Essential polyfills for React Native mobile apps
    'stream': path.resolve(__dirname, 'node_modules/readable-stream'),
    'crypto': path.resolve(__dirname, 'src/config/crypto-stub.js'),
    'buffer': path.resolve(__dirname, 'node_modules/buffer'),
    'util': path.resolve(__dirname, 'node_modules/util'),
    'process': path.resolve(__dirname, 'node_modules/process'),
    'events': path.resolve(__dirname, 'node_modules/events'),
    '@noble/hashes/crypto.js': path.resolve(__dirname, 'src/config/crypto-stub.js'),
    // WebSocket polyfill for Node.js ws module
    'ws': path.resolve(__dirname, 'src/config/websocket-stub.js'),
    // Node.js modules that crypto/wallet libraries need
    'os': path.resolve(__dirname, 'node_modules/os-browserify'),
    'path': path.resolve(__dirname, 'node_modules/path-browserify'),
    'url': path.resolve(__dirname, 'node_modules/url'),
    'querystring': path.resolve(__dirname, 'node_modules/querystring-es3'),
    'string_decoder': path.resolve(__dirname, 'node_modules/string_decoder'),
    'inherits': path.resolve(__dirname, 'node_modules/inherits'),
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
};

module.exports = config;
