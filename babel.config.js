module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
          alias: {
            // Essential polyfills for React Native compatibility
            'stream': './node_modules/readable-stream',
            'crypto': './src/config/crypto-stub.js',
            'buffer': './node_modules/buffer',
            'util': './node_modules/util',
            'process': './node_modules/process',
            'events': './node_modules/events',
            '@noble/hashes/crypto.js': './src/config/crypto-stub.js',
            // Platform constants polyfill
            'PlatformConstants': './src/config/platform-constants.js',
          },
        },
      ],
    ],
  };
};