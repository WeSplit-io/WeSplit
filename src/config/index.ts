/**
 * Configuration Index
 * Centralized exports for all configuration
 */

// Core Configuration
export { getConfig } from './unified';
export { envConfig } from './env';

// Categorized Configuration
export * from './firebase';
export * from './network';
export * from './constants';

// Platform Configuration
export { platformConstants } from './platform-constants';
export { cryptoStub } from './crypto-stub';
