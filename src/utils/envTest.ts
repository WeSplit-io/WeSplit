/**
 * Environment Variables Test Utility
 * Helps debug environment variable loading issues
 */
import { logger } from '../services/loggingService';
import Constants from 'expo-constants';

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

export function testEnvironmentVariables(): void {
  logger.info('Environment Variables Test', null, 'envTest');
  
  // Test Google OAuth variables
  const googleClientId = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
  const androidClientId = getEnvVar('ANDROID_GOOGLE_CLIENT_ID');
  const iosClientId = getEnvVar('IOS_GOOGLE_CLIENT_ID');
  const googleClientSecret = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_SECRET');
  
  logger.info('Google OAuth Variables', {
    googleClientId: googleClientId ? `${googleClientId.substring(0, 20)}...` : 'NOT_FOUND',
    androidClientId: androidClientId ? `${androidClientId.substring(0, 20)}...` : 'NOT_FOUND',
    iosClientId: iosClientId ? `${iosClientId.substring(0, 20)}...` : 'NOT_FOUND',
    googleClientSecret: googleClientSecret ? `${googleClientSecret.substring(0, 10)}...` : 'NOT_FOUND'
  }, 'envTest');
  
  // Test Firebase variables
  const firebaseApiKey = getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY');
  const firebaseProjectId = getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  
  logger.info('Firebase Variables', {
    firebaseApiKey: firebaseApiKey ? `${firebaseApiKey.substring(0, 20)}...` : 'NOT_FOUND',
    firebaseProjectId: firebaseProjectId || 'NOT_FOUND'
  }, 'envTest');
  
  // Test Constants.expoConfig
  logger.debug('Constants.expoConfig.extra keys', { keys: Object.keys(Constants.expoConfig?.extra || {}) }, 'envTest');
  
  // Test process.env
  logger.debug('process.env keys (filtered)', { 
    keys: Object.keys(process.env).filter(key => 
      key.includes('GOOGLE') || key.includes('FIREBASE') || key.includes('EXPO_PUBLIC')
    )
  }, 'envTest');
  
  
  // Check for issues
  const issues: string[] = [];
  if (!googleClientId) {issues.push('EXPO_PUBLIC_GOOGLE_CLIENT_ID not found');}
  if (!androidClientId) {issues.push('ANDROID_GOOGLE_CLIENT_ID not found');}
  if (!iosClientId) {issues.push('IOS_GOOGLE_CLIENT_ID not found');}
  if (!firebaseApiKey) {issues.push('EXPO_PUBLIC_FIREBASE_API_KEY not found');}
  
  if (issues.length > 0) {
    console.warn('⚠️ Environment Variable Issues:');
    issues.forEach(issue => console.warn('  -', issue));
    logger.info('Solutions', { solutions: ['Make sure your .env file is in the project root', 'Restart your development server (npx expo start --clear)', 'Check that your .env file has the correct variable names', 'Make sure there are no spaces around the = sign in .env'] }, 'envTest');
  } else {
    logger.info('All environment variables found!', null, 'envTest');
  }
}
