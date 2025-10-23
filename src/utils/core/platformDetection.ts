/**
 * Platform Detection Utilities
 * Handles detection of different runtime environments
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

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
 * Expo Go has limited native module support and a specific app ownership.
 */
const isExpoGo = (): boolean => {
  // The most reliable way to detect Expo Go is `Constants.appOwnership === 'expo'`.
  // If `Constants.appOwnership` is `null` or `undefined`, it's ambiguous,
  // but typically a development client would have 'standalone'.
  return Constants.appOwnership === 'expo';
};

/**
 * Detect if running in a development build (custom client)
 * Development builds have full native module support and are not Expo Go.
 */
const isDevelopmentBuild = (): boolean => {
  if (Platform.OS === 'web') {
    return false;
  }

  // A development build should have __DEV__ set to true
  if (!__DEV__) {
    return false;
  }

  // It should not be Expo Go (based on strict definition)
  if (isExpoGo()) {
    return false;
  }

  // If it's __DEV__ and not Expo Go, and appOwnership is not 'expo',
  // we consider it a development build. This handles the `null` appOwnership case.
  return Constants.appOwnership !== 'expo';
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
 * MWA requires native modules and is not available in Expo Go.
 * Note: Even in development builds, MWA may not be available if native modules aren't properly configured.
 */
const canUseMWA = (): boolean => {
  if (Platform.OS === 'web') {
    return false;
  }

  // MWA is available if it's a development build AND native modules are available.
  // This is a more conservative check since MWA requires specific native module setup.
  return isDevelopmentBuild() && !!(global as any).Expo?.modules?.expo?.modules?.ExpoModulesCore;
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

  // Debug logging - Updated Platform Detection
  console.log('🔍 Platform Detection Debug (FIXED):', {
    Constants_appOwnership: Constants.appOwnership,
    __DEV__,
    Platform_OS: Platform.OS,
    hasNativeModules,
    hasDevClient: !!(global as any).Expo?.modules?.expo?.modules?.ExpoDevClient,
    expoGo,
    devBuild,
    production,
    mwaAvailable,
    environment,
    Constants_manifest: !!Constants.manifest,
    Constants_expoConfig: !!Constants.expoConfig,
    global_Expo_modules: !!(global as any).Expo?.modules,
    applicationId: Application.applicationId,
    appOwnership: Constants.appOwnership,
    // Logic breakdown
    isExpoGo_result: Constants.appOwnership === 'expo',
    isDevBuild_result: __DEV__ && Platform.OS !== 'web' && Constants.appOwnership !== 'expo'
  });

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
