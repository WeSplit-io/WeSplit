/**
 * Configuration Index
 * Centralized exports for all configuration
 */

// Core Configuration
export { getConfig } from './unified';
// envConfig doesn't exist as named export - use default export instead
export { default as envConfig } from './env';

// Categorized Configuration
export * from './firebase';
export * from './network';
export * from './constants';

// Platform Configuration - CommonJS modules, import dynamically if needed
// export { platformConstants } from './platform-constants';
// export { cryptoStub } from './crypto-stub';
