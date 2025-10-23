/**
 * Platform Detection Utilities
 * Handles detection of different runtime environments
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface PlatformInfo {
  isExpoGo: boolean;
  isDevelopmentBuild: boolean;
  isProduction: boolean;
  isWeb: boolean;
  isNative: boolean;
  hasNativeModules: boolean;
  canUseMWA: boolean;
  environment: 'expo-go' | 'development-build' | 'production' | 'web';
}

/**
 * Detect if running in Expo Go
 * Expo Go has limited native module support
 */
const isExpoGo = (): boolean => {
  try {
    // Method 1: Check for Expo Go specific constants
    if (Constants.appOwnership === 'expo') {
      return true;
    }

    // Method 2: Check for missing native modules that are available in dev builds
    if (__DEV__ && Platform.OS !== 'web') {
      try {
        // Try to access a native module that's only available in dev builds
        const hasNativeModules = !!(global as any).Expo?.modules?.expo?.modules?.ExpoModulesCore;
        return !hasNativeModules;
      } catch {
        return true;
      }
    }

    // Method 3: Check for Expo Go specific manifest
    const manifest = Constants.manifest || Constants.expoConfig;
    if (manifest && typeof manifest === 'object') {
      const extra = (manifest as any).extra;
      if (extra && extra.expoGo === true) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn('Error detecting Expo Go:', error);
    return false;
  }
};

/**
 * Detect if running in a development build
 * Development builds have full native module support
 */
const isDevelopmentBuild = (): boolean => {
  try {
    if (Platform.OS === 'web') {
      return false;
    }

    // Check if we have native modules available
    const hasNativeModules = !!(global as any).Expo?.modules?.expo?.modules?.ExpoModulesCore;
    
    // Development builds have native modules but are not production
    return hasNativeModules && __DEV__;
  } catch (error) {
    console.warn('Error detecting development build:', error);
    return false;
  }
};

/**
 * Detect if running in production
 */
const isProduction = (): boolean => {
  try {
    return !__DEV__ && Platform.OS !== 'web';
  } catch (error) {
    console.warn('Error detecting production:', error);
    return false;
  }
};

/**
 * Check if MWA (Mobile Wallet Adapter) can be used
 * MWA requires native modules and is not available in Expo Go
 */
const canUseMWA = (): boolean => {
  try {
    if (Platform.OS === 'web') {
      return false;
    }

    // MWA requires native modules
    const hasNativeModules = !!(global as any).Expo?.modules?.expo?.modules?.ExpoModulesCore;
    
    // MWA is not available in Expo Go
    const expoGo = isExpoGo();
    
    return hasNativeModules && !expoGo;
  } catch (error) {
    console.warn('Error checking MWA availability:', error);
    return false;
  }
};

/**
 * Get comprehensive platform information
 */
export const getPlatformInfo = (): PlatformInfo => {
  const expoGo = isExpoGo();
  const devBuild = isDevelopmentBuild();
  const production = isProduction();
  const web = Platform.OS === 'web';
  const native = Platform.OS !== 'web';
  const hasNativeModules = !!(global as any).Expo?.modules?.expo?.modules?.ExpoModulesCore;
  const mwaAvailable = canUseMWA();

  let environment: PlatformInfo['environment'];
  if (web) {
    environment = 'web';
  } else if (expoGo) {
    environment = 'expo-go';
  } else if (devBuild) {
    environment = 'development-build';
  } else {
    environment = 'production';
  }

  return {
    isExpoGo: expoGo,
    isDevelopmentBuild: devBuild,
    isProduction: production,
    isWeb: web,
    isNative: native,
    hasNativeModules,
    canUseMWA: mwaAvailable,
    environment
  };
};

/**
 * Quick check for MWA availability
 */
export const isMWAAvailable = (): boolean => {
  return canUseMWA();
};

/**
 * Quick check for Expo Go
 */
export const isRunningInExpoGo = (): boolean => {
  return isExpoGo();
};

/**
 * Get environment-specific configuration
 */
export const getEnvironmentConfig = () => {
  const platformInfo = getPlatformInfo();
  
  return {
    // MWA Configuration
    enableMWA: platformInfo.canUseMWA,
    enableMockMWA: platformInfo.isExpoGo,
    
    // Wallet Configuration
    enableExternalWalletLinking: true,
    enableSignatureVerification: platformInfo.canUseMWA,
    
    // UI Configuration
    showMWADetectionButton: true,
    showMockWalletOptions: platformInfo.isExpoGo,
    
    // Debug Configuration
    enableDebugLogging: platformInfo.isDevelopmentBuild || platformInfo.isExpoGo,
    enableMockData: platformInfo.isExpoGo
  };
};

// Export individual functions for convenience
export {
  isExpoGo,
  isDevelopmentBuild,
  isProduction,
  canUseMWA
};
