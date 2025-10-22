/**
 * Environment Utilities for WeSplit
 * Centralized environment variable handling
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Get environment variable with fallback chain
 */
export const getEnvVar = (key: string): string => {
  if (process.env[key]) {return process.env[key]!;}
  if (process.env[`EXPO_PUBLIC_${key}`]) {return process.env[`EXPO_PUBLIC_${key}`]!;}
  if (Constants.expoConfig?.extra?.[key]) {return Constants.expoConfig.extra[key];}
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) {return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];}
  if ((Constants.manifest as any)?.extra?.[key]) {return (Constants.manifest as any).extra[key];}
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) {return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];}
  return '';
};

/**
 * Get platform-specific Google Client ID
 */
export const getPlatformGoogleClientId = (): string => {
  switch (Platform.OS) {
    case 'android':
      return getEnvVar('ANDROID_GOOGLE_CLIENT_ID') || getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
    case 'ios':
      return getEnvVar('IOS_GOOGLE_CLIENT_ID') || getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
    case 'web':
      return getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
    default:
      return getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
  }
};

/**
 * Get OAuth redirect URI
 */
export const getOAuthRedirectUri = (): string => {
  return 'wesplit://auth';
};
