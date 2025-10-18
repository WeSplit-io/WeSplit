/**
 * iOS-Specific Network Configuration
 * Provides platform-specific timeout and retry configurations
 */

import { Platform } from 'react-native';

export interface NetworkConfig {
  timeout: {
    api: number;
    database: number;
    notifications: number;
    connection: number;
  };
  retries: {
    maxRetries: number;
    retryDelay: number;
  };
  ios: {
    useLongerTimeouts: boolean;
    useFewerRetries: boolean;
    useLongerDelays: boolean;
  };
}

/**
 * Get network configuration based on platform
 */
export function getNetworkConfig(): NetworkConfig {
  const isIOS = Platform.OS === 'ios';
  
  return {
    timeout: {
      api: isIOS ? 15000 : 10000, // Longer timeout for iOS
      database: isIOS ? 20000 : 15000, // Longer database timeout for iOS
      notifications: isIOS ? 12000 : 8000, // Longer notification timeout for iOS
      connection: isIOS ? 30000 : 20000, // Longer connection timeout for iOS
    },
    retries: {
      maxRetries: isIOS ? 2 : 3, // Fewer retries for iOS to fail faster
      retryDelay: isIOS ? 1000 : 500, // Longer delay between retries for iOS
    },
    ios: {
      useLongerTimeouts: isIOS,
      useFewerRetries: isIOS,
      useLongerDelays: isIOS,
    }
  };
}

/**
 * Get timeout for specific operation type
 */
export function getTimeoutForOperation(operation: 'api' | 'database' | 'notifications' | 'connection'): number {
  const config = getNetworkConfig();
  return config.timeout[operation];
}

/**
 * Get retry configuration
 */
export function getRetryConfig(): { maxRetries: number; retryDelay: number } {
  const config = getNetworkConfig();
  return config.retries;
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Get platform-specific timeout multiplier
 */
export function getTimeoutMultiplier(): number {
  return isIOS() ? 1.5 : 1.0; // iOS gets 50% longer timeouts
}
