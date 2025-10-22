/**
 * OAuth Configuration Test Utility
 * Helps debug OAuth setup issues
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logAndroidFingerprintInstructions } from './androidFingerprint';
import { logger } from 'services/loggingService';

// Environment variable helper
const getEnvVar = (key: string): string => {
  if (process.env[key]) {return process.env[key]!;}
  if (process.env[`EXPO_PUBLIC_${key}`]) {return process.env[`EXPO_PUBLIC_${key}`]!;}
  if (Constants.expoConfig?.extra?.[key]) {return Constants.expoConfig.extra[key];}
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) {return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];}
  if ((Constants.manifest as any)?.extra?.[key]) {return (Constants.manifest as any).extra[key];}
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) {return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];}
  return '';
};

export interface OAuthConfigTest {
  googleClientId: string;
  androidGoogleClientId: string;
  iosGoogleClientId: string;
  twitterClientId: string;
  appleClientId: string;
  redirectUri: string;
  platform: string;
  isDevelopment: boolean;
  issues: string[];
  recommendations: string[];
}

export function testOAuthConfiguration(): OAuthConfigTest {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  const googleClientId = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
  const androidGoogleClientId = getEnvVar('ANDROID_GOOGLE_CLIENT_ID');
  const iosGoogleClientId = getEnvVar('IOS_GOOGLE_CLIENT_ID');
  const twitterClientId = getEnvVar('EXPO_PUBLIC_TWITTER_CLIENT_ID');
  const appleClientId = getEnvVar('EXPO_PUBLIC_APPLE_CLIENT_ID');
  const redirectUri = 'wesplit://auth';
  
  // Check Google OAuth configuration
  if (!googleClientId) {
    issues.push('Google Client ID is not configured');
    recommendations.push('Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your environment variables');
  } else if (!googleClientId.includes('.googleusercontent.com')) {
    issues.push('Google Client ID format appears invalid');
    recommendations.push('Ensure your Google Client ID ends with .googleusercontent.com');
  }
  
  // Check platform-specific Google OAuth configuration
  if (Platform.OS === 'android' && !androidGoogleClientId) {
    issues.push('Android Google Client ID is not configured');
    recommendations.push('Add ANDROID_GOOGLE_CLIENT_ID to your environment variables');
  } else if (Platform.OS === 'ios' && !iosGoogleClientId) {
    issues.push('iOS Google Client ID is not configured');
    recommendations.push('Add IOS_GOOGLE_CLIENT_ID to your environment variables');
  }
  
  // Check Twitter OAuth configuration
  if (!twitterClientId) {
    issues.push('Twitter Client ID is not configured');
    recommendations.push('Add EXPO_PUBLIC_TWITTER_CLIENT_ID to your environment variables');
  }
  
  // Check Apple OAuth configuration
  if (!appleClientId) {
    issues.push('Apple Client ID is not configured');
    recommendations.push('Add EXPO_PUBLIC_APPLE_CLIENT_ID to your environment variables');
  }
  
  // Check redirect URI configuration
  if (redirectUri !== 'wesplit://auth') {
    issues.push('Redirect URI should be wesplit://auth for proper deep link handling');
    recommendations.push('Use wesplit://auth as the redirect URI in your OAuth configuration');
  }
  
  // Platform-specific recommendations
  if (Platform.OS === 'android') {
    recommendations.push('Ensure your Google OAuth client is configured for Android with package name: com.wesplit.app');
    recommendations.push('Add your app\'s SHA-1 fingerprint to the Google OAuth client configuration');
    recommendations.push('Run: keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android');
  } else if (Platform.OS === 'ios') {
    recommendations.push('Ensure your Google OAuth client is configured for iOS with bundle ID: com.wesplit.app');
  }
  
  return {
    googleClientId: googleClientId || 'NOT_CONFIGURED',
    androidGoogleClientId: androidGoogleClientId || 'NOT_CONFIGURED',
    iosGoogleClientId: iosGoogleClientId || 'NOT_CONFIGURED',
    twitterClientId: twitterClientId || 'NOT_CONFIGURED',
    appleClientId: appleClientId || 'NOT_CONFIGURED',
    redirectUri,
    platform: Platform.OS,
    isDevelopment: __DEV__,
    issues,
    recommendations
  };
}

export function logOAuthConfiguration(): void {
  const config = testOAuthConfiguration();
  
  logger.info('OAuth Configuration Test Results', { platform: config.platform, isDevelopment: config.isDevelopment, googleClientId: config.googleClientId.substring(0, 20) + '...', androidGoogleClientId: config.androidGoogleClientId.substring(0, 20) + '...', iosGoogleClientId: config.iosGoogleClientId.substring(0, 20) + '...', twitterClientId: config.twitterClientId.substring(0, 20) + '...', appleClientId: config.appleClientId.substring(0, 20) + '...', redirectUri: config.redirectUri }, 'oauthTest');
  
  if (config.issues.length > 0) {
    console.warn('⚠️ OAuth Configuration Issues:');
    config.issues.forEach(issue => console.warn('  -', issue));
  }
  
  if (config.recommendations.length > 0) {
    logger.info('Recommendations', { recommendations: config.recommendations }, 'oauthTest');
  }
  
  // Add Android-specific fingerprint instructions
  if (config.platform === 'android') {
    logAndroidFingerprintInstructions();
  }
  
  if (config.issues.length === 0) {
    logger.info('OAuth configuration looks good!', null, 'oauthTest');
  }
}
