/**
 * Platform Constants Stub for React Native
 * Provides platform-specific constants for React Native environment
 */

// Mock platform constants
const PlatformConstants = {
  // iOS constants
  forceTouchAvailable: false,
  interfaceIdiom: 'phone',
  osVersion: '15.0',
  reactNativeVersion: {
    major: 0,
    minor: 72,
    patch: 0,
  },
  systemName: 'iOS',
  
  // Android constants
  apiLevel: 30,
  brand: 'Google',
  model: 'Pixel',
  release: '11',
  serial: 'unknown',
  
  // Common
  isTesting: false,
  isTVOS: false,
  uiMode: 'normal',
};

module.exports = PlatformConstants;
