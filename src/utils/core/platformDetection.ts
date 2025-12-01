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

  // MWA is not available in Expo Go
  if (isExpoGo()) {
    return false;
  }

  // For development builds, be more conservative with MWA detection
  // Only claim MWA is available if we can actually verify native modules
  if (isDevelopmentBuild()) {
    // Check for various indicators of native module availability
    const hasExpoModules = !!(global as any).Expo?.modules?.expo?.modules?.ExpoModulesCore;
    const hasReactNativeModules = !!(global as any).TurboModuleRegistry;
    const hasExpoNativeModules = !!(global as any).Expo?.modules;
    const hasNativeModules = hasExpoModules || hasReactNativeModules || hasExpoNativeModules;

    // For dev builds, only claim MWA is available if we have native module indicators
    // The actual MWA functionality will be tested during import
    return hasNativeModules;
  }

  // For production builds, be more strict
  return false;
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
    isDevBuild_result: __DEV__ && Platform.OS !== 'web' && Constants.appOwnership !== 'expo',
    // MWA logic
    mwaLogic: {
      notWeb: Platform.OS !== 'web',
      notExpoGo: !expoGo,
      isDevBuild: devBuild,
      hasNativeModules: hasNativeModules,
      hasTurboModules: !!(global as any).TurboModuleRegistry,
      final: mwaAvailable
    }
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

  // Check if MWA is actually functional (not just theoretically available)
  let mwaActuallyFunctional = false;
  if (platformInfo.canUseMWA) {
    try {
      // Quick test - if we can import without crashing, it's functional
      // This is synchronous check to avoid async issues
      mwaActuallyFunctional = !!(global as any).TurboModuleRegistry?.SolanaMobileWalletAdapter;
    } catch (error) {
      // If checking causes any error, assume not functional
      mwaActuallyFunctional = false;
    }
  }

  return {
    // MWA Configuration - only enable if actually functional
    enableMWA: platformInfo.canUseMWA && mwaActuallyFunctional,
    enableMockMWA: platformInfo.isExpoGo,
    mwaActuallyFunctional,

    // Wallet Configuration
    enableExternalWalletLinking: true,
    enableSignatureVerification: platformInfo.canUseMWA && mwaActuallyFunctional,

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
