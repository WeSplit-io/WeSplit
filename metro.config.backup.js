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

// Add diagnostic filter to identify modules with undefined paths
const originalProcessModuleFilter = config.serializer.processModuleFilter;
config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => [],
  // Log the first offender so we can fix app code.
  processModuleFilter: (module) => {
    const ok = originalProcessModuleFilter ? originalProcessModuleFilter(module) : true;
    if (!ok) return false;
    if (!module || typeof module.path !== 'string') {
      // Make this noisy so we can see the culprit in the Metro logs.
      // Include anything helpful that exists on the module object.
      // Do NOT crash the build yet; just skip and log for now.
      console.warn('[metro] Skipping module with invalid path:', {
        id: module?.id,
        path: module?.path,
        sourcePath: module?.sourcePath,
        outputType: module?.output?.[0]?.type,
        name: module?.output?.[0]?.data?.name,
        dependencies: module?.dependencies?.map(dep => ({ name: dep.name, path: dep.path })),
        inverseDependencies: module?.inverseDependencies,
      });
      return false;
    }
    return true;
  },
};

module.exports = config;
