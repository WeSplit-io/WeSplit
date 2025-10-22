/**
 * OAuth Debugger Utility
 * Helps identify OAuth configuration issues
 */

import { Platform } from 'react-native';
import { getEnvVar, getPlatformGoogleClientId, getOAuthRedirectUri } from './environmentUtils';
import { logger } from 'services/core';

export interface OAuthDebugInfo {
  platform: string;
  clientIds: {
    web: string;
    android: string;
    ios: string;
    current: string;
  };
  redirectUri: string;
  issues: string[];
  recommendations: string[];
}

export function debugOAuthConfiguration(): OAuthDebugInfo {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Get all client IDs
  const webClientId = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
  const androidClientId = getEnvVar('ANDROID_GOOGLE_CLIENT_ID');
  const iosClientId = getEnvVar('IOS_GOOGLE_CLIENT_ID');
  const currentClientId = getPlatformGoogleClientId();
  const redirectUri = getOAuthRedirectUri();

  // Check for missing client IDs
  if (!webClientId) {
    issues.push('Web Google Client ID not found');
    recommendations.push('Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env file');
  }

  if (!androidClientId) {
    issues.push('Android Google Client ID not found');
    recommendations.push('Add ANDROID_GOOGLE_CLIENT_ID to your .env file');
  }

  if (!iosClientId) {
    issues.push('iOS Google Client ID not found');
    recommendations.push('Add IOS_GOOGLE_CLIENT_ID to your .env file');
  }

  // Check client ID format
  if (webClientId && !webClientId.includes('.googleusercontent.com')) {
    issues.push('Web Client ID format appears invalid');
    recommendations.push('Ensure Web Client ID ends with .googleusercontent.com');
  }

  if (androidClientId && !androidClientId.includes('.googleusercontent.com')) {
    issues.push('Android Client ID format appears invalid');
    recommendations.push('Ensure Android Client ID ends with .googleusercontent.com');
  }

  // Check if current client ID matches expected platform
  if (Platform.OS === 'android' && currentClientId !== androidClientId) {
    issues.push('Current client ID does not match Android client ID');
    recommendations.push('Check getPlatformGoogleClientId() function');
  }

  if (Platform.OS === 'ios' && currentClientId !== iosClientId) {
    issues.push('Current client ID does not match iOS client ID');
    recommendations.push('Check getPlatformGoogleClientId() function');
  }

  // Check redirect URI
  if (redirectUri !== 'wesplit://auth') {
    issues.push('Redirect URI is not wesplit://auth');
    recommendations.push('Use wesplit://auth as redirect URI');
  }

  // Platform-specific recommendations
  if (Platform.OS === 'android') {
    recommendations.push('Ensure Android OAuth client has SHA-1 fingerprint: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25');
    recommendations.push('Ensure Android OAuth client has package name: com.wesplit.app');
    recommendations.push('Ensure Android OAuth client has redirect URI: wesplit://auth');
  }

  return {
    platform: Platform.OS,
    clientIds: {
      web: webClientId || 'NOT_FOUND',
      android: androidClientId || 'NOT_FOUND',
      ios: iosClientId || 'NOT_FOUND',
      current: currentClientId || 'NOT_FOUND'
    },
    redirectUri,
    issues,
    recommendations
  };
}

export function logOAuthDebugInfo(): void {
  const debugInfo = debugOAuthConfiguration();
  
  logger.info('OAuth Configuration Debug', {
    platform: debugInfo.platform,
    clientIds: {
      web: debugInfo.clientIds.web.substring(0, 20) + '...',
      android: debugInfo.clientIds.android.substring(0, 20) + '...',
      ios: debugInfo.clientIds.ios.substring(0, 20) + '...',
      current: debugInfo.clientIds.current.substring(0, 20) + '...'
    },
    redirectUri: debugInfo.redirectUri
  }, 'oauthDebugger');
  
  if (debugInfo.issues.length > 0) {
    console.warn('⚠️ Issues Found:');
    debugInfo.issues.forEach(issue => console.warn('  -', issue));
  }
  
  if (debugInfo.recommendations.length > 0) {
    logger.info('Recommendations', { recommendations: debugInfo.recommendations }, 'oauthDebugger');
  }
  
  
  if (debugInfo.issues.length === 0) {
    logger.info('OAuth configuration looks correct', null, 'oauthDebugger');
  } else {
    logger.warn('OAuth configuration has issues that need to be fixed', null, 'oauthDebugger');
  }
}
