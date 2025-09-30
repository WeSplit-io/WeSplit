const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle module resolution issues
config.resolver = {
  ...config.resolver,
  // Add platform extensions
  platforms: ['ios', 'android', 'native', 'web'],
  resolverMainFields: ['react-native', 'browser', 'main'],
  // Enable package exports resolution
  unstable_enablePackageExports: true,
  // Custom resolver to handle jose library
  resolveRequest: (context, moduleName, platform) => {
    // Force jose to use browser version
    if (moduleName === 'jose') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'node_modules/jose/dist/browser/index.js'),
      };
    }
    // Use default resolver for other modules
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Add transformer configuration
config.transformer = {
  ...config.transformer,
  // Enable unstable transform for import.meta
  unstable_allowRequireContext: true,
};

// Exclude Node.js modules that cause issues
config.resolver.blockList = [
  // Block all Node.js jose modules
  /node_modules\/jose\/dist\/node\/.*/,
  /node_modules\/jose\/dist\/node\/cjs\/.*/,
  /node_modules\/jose\/dist\/node\/esm\/.*/,
  /node_modules\/jose\/dist\/node\/.*\.js$/,
  /node_modules\/jose\/dist\/node\/cjs\/runtime\/zlib\.js$/,
  /node_modules\/jose\/dist\/node\/cjs\/jwe\/flattened\/decrypt\.js$/,
  /node_modules\/jose\/dist\/node\/cjs\/index\.js$/,
  // Block specific problematic files
  /node_modules\/jose\/dist\/node\/cjs\/runtime\/zlib\.js$/,
  /node_modules\/jose\/dist\/node\/cjs\/jwe\/flattened\/decrypt\.js$/,
  /node_modules\/jose\/dist\/node\/cjs\/index\.js$/,
  // Block WalletConnect Node.js dependencies
  /node_modules\/xhr2-cookies\/.*/,
  /node_modules\/@walletconnect\/.*\/dist\/.*node.*\.js$/,
];

// Add additional polyfills for jose library and WalletConnect
config.resolver.alias = {
  ...config.resolver.alias,
  // Handle crypto module resolution
  'crypto': path.resolve(__dirname, 'src/config/crypto-stub.js'),
  '@noble/hashes/crypto.js': path.resolve(__dirname, 'src/config/crypto-stub.js'),
  // Node.js polyfills for jose library
  'zlib': path.resolve(__dirname, 'src/config/polyfills/zlib-stub.js'),
  'util': path.resolve(__dirname, 'src/config/polyfills/util-stub.js'),
  'stream': path.resolve(__dirname, 'src/config/polyfills/stream-stub.js'),
  'buffer': path.resolve(__dirname, 'src/config/polyfills/buffer-stub.js'),
  // Node.js polyfills for WalletConnect/xhr2-cookies
  'http': path.resolve(__dirname, 'src/config/polyfills/http-stub.js'),
  'https': path.resolve(__dirname, 'src/config/polyfills/https-stub.js'),
  'os': path.resolve(__dirname, 'src/config/polyfills/os-stub.js'),
  'url': path.resolve(__dirname, 'src/config/polyfills/url-stub.js'),
  'net': path.resolve(__dirname, 'src/config/polyfills/net-stub.js'),
  'tls': path.resolve(__dirname, 'src/config/polyfills/tls-stub.js'),
  'fs': path.resolve(__dirname, 'src/config/polyfills/fs-stub.js'),
  'path': path.resolve(__dirname, 'src/config/polyfills/path-stub.js'),
  // Replace xhr2-cookies with React Native compatible version
  'xhr2-cookies': path.resolve(__dirname, 'src/config/polyfills/xhr2-cookies-stub.js'),
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
};

module.exports = config;
