/**
 * Android SHA-1 Fingerprint Utility
 * Helps get the SHA-1 fingerprint for Android OAuth configuration
 */

import { Platform } from 'react-native';
import { logger } from '../services/loggingService';

export interface AndroidFingerprintInfo {
  platform: string;
  packageName: string;
  isAndroid: boolean;
  instructions: string[];
  debugFingerprint?: string;
  releaseFingerprint?: string;
}

export function getAndroidFingerprintInfo(): AndroidFingerprintInfo {
  const isAndroid = Platform.OS === 'android';
  const packageName = 'com.wesplit.app';
  
  const instructions = [
    'To get your SHA-1 fingerprint, run one of these commands:',
    '',
    'For DEBUG keystore (development):',
    'keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android',
    '',
    'For RELEASE keystore (production):',
    'keytool -list -v -keystore android/app/release.keystore -alias release -storepass YOUR_STORE_PASSWORD -keypass YOUR_KEY_PASSWORD',
    '',
    'Then:',
    '1. Copy the SHA1 fingerprint (the long string after "SHA1:")',
    '2. Go to Google Cloud Console → APIs & Services → Credentials',
    '3. Find your Android OAuth 2.0 Client ID',
    '4. Add the SHA-1 fingerprint to the "SHA-1 certificate fingerprints" section',
    '5. Save the configuration'
  ];

  return {
    platform: Platform.OS,
    packageName,
    isAndroid,
    instructions,
    debugFingerprint: 'Run the keytool command above to get your debug SHA-1',
    releaseFingerprint: 'Run the keytool command above to get your release SHA-1'
  };
}

export function logAndroidFingerprintInstructions(): void {
  const info = getAndroidFingerprintInfo();
  
  console.log('🔧 Android SHA-1 Fingerprint Configuration:');
  console.log('Platform:', info.platform);
  console.log('Package Name:', info.packageName);
  console.log('Is Android:', info.isAndroid);
  
  if (info.isAndroid) {
    console.log('📋 Instructions:');
    info.instructions.forEach(instruction => {
      if (instruction.trim() === '') {
        console.log('');
      } else {
        console.log(instruction);
      }
    });
  } else {
    console.log('ℹ️ This is not an Android platform, SHA-1 fingerprint not needed');
  }
}

export function getKeytoolCommand(keystoreType: 'debug' | 'release' = 'debug'): string {
  if (keystoreType === 'debug') {
    return 'keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android';
  } else {
    return 'keytool -list -v -keystore android/app/release.keystore -alias release -storepass YOUR_STORE_PASSWORD -keypass YOUR_KEY_PASSWORD';
  }
}
