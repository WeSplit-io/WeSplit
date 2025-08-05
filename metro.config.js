const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for problematic modules
config.resolver = {
  ...config.resolver,
  alias: {
    'rpc-websockets': require.resolve('rpc-websockets'),
    'buffer': require.resolve('buffer'),
    'stream': require.resolve('readable-stream'),
    'util': require.resolve('util'),
    'process': require.resolve('process'),
    // Add stream alias for cipher-base
    'stream$': require.resolve('readable-stream'),
    // Fix for @noble/hashes crypto.js issue
    '@noble/hashes/crypto.js': require.resolve('@noble/hashes/crypto'),
    // Platform-specific resolutions
    'crypto': require.resolve('react-native-crypto'),
    // Additional polyfills
    'events': require.resolve('events'),
    // Fix for cipher-base stream dependency
    'cipher-base': require.resolve('./src/config/cipher-base-fix.js'),
  },
  resolverMainFields: ['react-native', 'browser', 'main'],
  sourceExts: [...config.resolver.sourceExts, 'mjs', 'cjs'],
  platforms: ['ios', 'android', 'native', 'web'],
  // Add platform-specific module resolution with better error handling
  resolveRequest: (context, moduleName, platform) => {
    // Handle rpc-websockets for iOS
    if (moduleName === 'rpc-websockets' && platform === 'ios') {
      try {
        return {
          filePath: require.resolve('rpc-websockets'),
          type: 'sourceFile',
        };
      } catch (error) {
        console.warn('Failed to resolve rpc-websockets for iOS, using fallback');
        return {
          filePath: require.resolve('buffer'),
          type: 'sourceFile',
        };
      }
    }
    
    // Handle @noble/hashes crypto.js for iOS
    if (moduleName === '@noble/hashes/crypto.js' && platform === 'ios') {
      try {
        return {
          filePath: require.resolve('@noble/hashes/crypto'),
          type: 'sourceFile',
        };
      } catch (error) {
        console.warn('Failed to resolve @noble/hashes/crypto.js for iOS, using fallback');
        return {
          filePath: require.resolve('react-native-crypto'),
          type: 'sourceFile',
        };
      }
    }
    
    // Handle WebSocket for iOS
    if (moduleName === 'ws' && platform === 'ios') {
      try {
        return {
          filePath: require.resolve('ws'),
          type: 'sourceFile',
        };
      } catch (error) {
        console.warn('Failed to resolve ws for iOS, using fallback');
        return {
          filePath: require.resolve('buffer'),
          type: 'sourceFile',
        };
      }
    }
    
    // Handle cipher-base stream dependency
    if (moduleName === 'stream' && (platform === 'ios' || platform === 'android')) {
      return {
        filePath: require.resolve('readable-stream'),
        type: 'sourceFile',
      };
    }
    
    return context.resolveRequest(context, moduleName, platform);
  },
  // Add node_modules resolution
  nodeModulesPaths: [
    require.resolve('react-native-crypto'),
    require.resolve('ws'),
    require.resolve('@noble/hashes'),
    require.resolve('./src/config/cipher-base-fix.js'),
  ],
};

// Fix serializer issues
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
  // Add transformer for problematic modules
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;