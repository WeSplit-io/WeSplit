/**
 * Environment Variables Test Utility
 * Helps debug environment variable loading issues
 */

import Constants from 'expo-constants';

// Environment variable helper
const getEnvVar = (key: string): string => {
  if (process.env[key]) return process.env[key]!;
  if (process.env[`EXPO_PUBLIC_${key}`]) return process.env[`EXPO_PUBLIC_${key}`]!;
  if (Constants.expoConfig?.extra?.[key]) return Constants.expoConfig.extra[key];
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];
  if ((Constants.manifest as any)?.extra?.[key]) return (Constants.manifest as any).extra[key];
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];
  return '';
};

export function testEnvironmentVariables(): void {
  console.log('🔧 Environment Variables Test:');
  console.log('================================');
  
  // Test Google OAuth variables
  const googleClientId = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
  const androidClientId = getEnvVar('ANDROID_GOOGLE_CLIENT_ID');
  const iosClientId = getEnvVar('IOS_GOOGLE_CLIENT_ID');
  const googleClientSecret = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_SECRET');
  
  console.log('Google OAuth Variables:');
  console.log('  EXPO_PUBLIC_GOOGLE_CLIENT_ID:', googleClientId ? `${googleClientId.substring(0, 20)}...` : 'NOT_FOUND');
  console.log('  ANDROID_GOOGLE_CLIENT_ID:', androidClientId ? `${androidClientId.substring(0, 20)}...` : 'NOT_FOUND');
  console.log('  IOS_GOOGLE_CLIENT_ID:', iosClientId ? `${iosClientId.substring(0, 20)}...` : 'NOT_FOUND');
  console.log('  EXPO_PUBLIC_GOOGLE_CLIENT_SECRET:', googleClientSecret ? `${googleClientSecret.substring(0, 10)}...` : 'NOT_FOUND');
  
  // Test Firebase variables
  const firebaseApiKey = getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY');
  const firebaseProjectId = getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  
  console.log('Firebase Variables:');
  console.log('  EXPO_PUBLIC_FIREBASE_API_KEY:', firebaseApiKey ? `${firebaseApiKey.substring(0, 20)}...` : 'NOT_FOUND');
  console.log('  EXPO_PUBLIC_FIREBASE_PROJECT_ID:', firebaseProjectId || 'NOT_FOUND');
  
  // Test Constants.expoConfig
  console.log('Constants.expoConfig.extra keys:', Object.keys(Constants.expoConfig?.extra || {}));
  
  // Test process.env
  console.log('process.env keys (filtered):', Object.keys(process.env).filter(key => 
    key.includes('GOOGLE') || key.includes('FIREBASE') || key.includes('EXPO_PUBLIC')
  ));
  
  console.log('================================');
  
  // Check for issues
  const issues: string[] = [];
  if (!googleClientId) issues.push('EXPO_PUBLIC_GOOGLE_CLIENT_ID not found');
  if (!androidClientId) issues.push('ANDROID_GOOGLE_CLIENT_ID not found');
  if (!iosClientId) issues.push('IOS_GOOGLE_CLIENT_ID not found');
  if (!firebaseApiKey) issues.push('EXPO_PUBLIC_FIREBASE_API_KEY not found');
  
  if (issues.length > 0) {
    console.warn('⚠️ Environment Variable Issues:');
    issues.forEach(issue => console.warn('  -', issue));
    console.log('');
    console.log('💡 Solutions:');
    console.log('  1. Make sure your .env file is in the project root');
    console.log('  2. Restart your development server (npx expo start --clear)');
    console.log('  3. Check that your .env file has the correct variable names');
    console.log('  4. Make sure there are no spaces around the = sign in .env');
  } else {
    console.log('✅ All environment variables found!');
  }
}
