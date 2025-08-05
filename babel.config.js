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
            // Add specific aliases for problematic modules
            'rpc-websockets': './node_modules/rpc-websockets',
            '@noble/hashes/crypto.js': './node_modules/@noble/hashes/crypto',
            'crypto': './node_modules/react-native-crypto',
            'ws': './node_modules/ws',
          },
        },
      ],
    ],
  };
}; 