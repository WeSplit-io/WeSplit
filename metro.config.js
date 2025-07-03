const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(defaultConfig, {
  resolver: {
    resolverMainFields: ['react-native', 'browser', 'main'],
    platforms: ['ios', 'android', 'native', 'web'],
    sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs', 'cjs'],
    alias: {
      '@reown/appkit-wallet/utils': '@reown/appkit-wallet/dist/esm/exports/utils.js',
    },
  },
  transformer: {
    minifierConfig: {
      ...defaultConfig.transformer.minifierConfig,
      mangle: {
        ...defaultConfig.transformer.minifierConfig?.mangle,
        keep_fnames: true,
      },
    },
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});