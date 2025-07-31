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
  },
  resolverMainFields: ['react-native', 'browser', 'main'],
  sourceExts: [...config.resolver.sourceExts, 'mjs', 'cjs'],
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
};

module.exports = config;