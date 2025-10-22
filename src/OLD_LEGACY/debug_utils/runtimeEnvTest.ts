/**
 * Runtime Environment Variable Test
 * Use this to test environment variable access in the actual app
 * Remove this file before production deployment
 */

import Constants from 'expo-constants';
import { logger } from '../services/core';

/**
 * Get environment variable with fallback chain (same as used throughout the app)
 */
const getEnvVar = (key: string): string => {
  if (process.env[key]) {return process.env[key]!;}
  if (process.env[`EXPO_PUBLIC_${key}`]) {return process.env[`EXPO_PUBLIC_${key}`]!;}
  if (Constants.expoConfig?.extra?.[key]) {return Constants.expoConfig.extra[key];}
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) {return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];}
  if ((Constants.manifest as any)?.extra?.[key]) {return (Constants.manifest as any).extra[key];}
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) {return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];}
  return '';
};

/**
 * Test critical environment variables for APK functionality
 */
export const testEnvironmentVariables = (): boolean => {
  console.log('🧪 Runtime Environment Variable Test Starting...');
  
  const tests = [
    // Firebase Configuration
    { key: 'FIREBASE_API_KEY', name: 'Firebase API Key', critical: true },
    { key: 'FIREBASE_AUTH_DOMAIN', name: 'Firebase Auth Domain', critical: true },
    { key: 'FIREBASE_PROJECT_ID', name: 'Firebase Project ID', critical: true },
    { key: 'FIREBASE_STORAGE_BUCKET', name: 'Firebase Storage Bucket', critical: true },
    { key: 'FIREBASE_MESSAGING_SENDER_ID', name: 'Firebase Messaging Sender ID', critical: true },
    { key: 'FIREBASE_APP_ID', name: 'Firebase App ID', critical: true },
    { key: 'FIREBASE_MEASUREMENT_ID', name: 'Firebase Measurement ID', critical: false },
    
    // Solana Configuration
    { key: 'HELIUS_API_KEY', name: 'Helius API Key', critical: true },
    { key: 'FORCE_MAINNET', name: 'Force Mainnet', critical: false },
    { key: 'DEV_NETWORK', name: 'Dev Network', critical: false },
    
    // Company Wallet Configuration
    { key: 'COMPANY_WALLET_ADDRESS', name: 'Company Wallet Address', critical: true },
    { key: 'COMPANY_WALLET_SECRET_KEY', name: 'Company Wallet Secret Key', critical: true },
    { key: 'COMPANY_MIN_SOL_RESERVE', name: 'Company Min SOL Reserve', critical: false },
    { key: 'COMPANY_GAS_FEE_ESTIMATE', name: 'Company Gas Fee Estimate', critical: false },
    
    // OAuth Configuration
    { key: 'GOOGLE_CLIENT_ID', name: 'Google Client ID', critical: true },
    { key: 'ANDROID_GOOGLE_CLIENT_ID', name: 'Android Google Client ID', critical: true },
    { key: 'IOS_GOOGLE_CLIENT_ID', name: 'iOS Google Client ID', critical: true },
    { key: 'APPLE_CLIENT_ID', name: 'Apple Client ID', critical: true },
    { key: 'APPLE_SERVICE_ID', name: 'Apple Service ID', critical: true },
    { key: 'APPLE_TEAM_ID', name: 'Apple Team ID', critical: true },
    { key: 'APPLE_KEY_ID', name: 'Apple Key ID', critical: true },
    { key: 'TWITTER_CLIENT_ID', name: 'Twitter Client ID', critical: false },
    
    // Fee Configuration
    { key: 'COMPANY_FEE_PERCENTAGE', name: 'Company Fee Percentage', critical: false },
    { key: 'COMPANY_MIN_FEE', name: 'Company Min Fee', critical: false },
    { key: 'COMPANY_MAX_FEE', name: 'Company Max Fee', critical: false },
    
    // MoonPay Configuration
    { key: 'MOONPAY_API_KEY', name: 'MoonPay API Key', critical: false },
    { key: 'MOONPAY_SECRET_KEY', name: 'MoonPay Secret Key', critical: false },
    
    // Security Configuration
    { key: 'JWT_SECRET', name: 'JWT Secret', critical: false },
    
    // Email Configuration
    { key: 'EMAIL_USER', name: 'Email User', critical: false },
    { key: 'EMAIL_PASS', name: 'Email Password', critical: false },
    
    // Monitoring
    { key: 'SENTRY_DSN', name: 'Sentry DSN', critical: false },
    { key: 'FIREBASE_SERVER_KEY', name: 'Firebase Server Key', critical: false }
  ];
  
  let allCriticalPassed = true;
  let totalPassed = 0;
  let criticalPassed = 0;
  let totalCritical = 0;
  
  console.log('📋 Testing Environment Variables:');
  console.log('=' .repeat(50));
  
  tests.forEach(test => {
    const value = getEnvVar(test.key);
    const isSet = !!value;
    const status = isSet ? '✅ SET' : '❌ MISSING';
    const criticality = test.critical ? '🔴 CRITICAL' : '🟡 OPTIONAL';
    
    console.log(`${status} ${criticality} ${test.name}`);
    
    if (isSet) {
      totalPassed++;
      if (test.critical) {
        criticalPassed++;
      }
    } else if (test.critical) {
      allCriticalPassed = false;
      console.error(`❌ CRITICAL: ${test.name} is missing!`);
    }
    
    if (test.critical) {
      totalCritical++;
    }
  });
  
  console.log('=' .repeat(50));
  console.log(`📊 Results: ${totalPassed}/${tests.length} variables set`);
  console.log(`🔴 Critical: ${criticalPassed}/${totalCritical} critical variables set`);
  
  if (allCriticalPassed) {
    console.log('✅ All critical environment variables are accessible!');
    console.log('🎉 App should work properly with Firebase and Solana integration');
    
    // Log to logger service if available
    if (logger) {
      logger.info('Environment Variables Test', {
        totalVariables: tests.length,
        variablesSet: totalPassed,
        criticalVariables: totalCritical,
        criticalSet: criticalPassed,
        allCriticalPassed: true
      }, 'envTest');
    }
    
    return true;
  } else {
    console.error('❌ Some critical environment variables are missing!');
    console.error('🚨 App may not function properly without these variables');
    
    // Log to logger service if available
    if (logger) {
      logger.error('Environment Variables Test Failed', {
        totalVariables: tests.length,
        variablesSet: totalPassed,
        criticalVariables: totalCritical,
        criticalSet: criticalPassed,
        allCriticalPassed: false
      }, 'envTest');
    }
    
    return false;
  }
};

/**
 * Test Firebase configuration specifically
 */
export const testFirebaseConfiguration = (): boolean => {
  console.log('🔥 Testing Firebase Configuration...');
  
  const firebaseConfig = {
    apiKey: getEnvVar('FIREBASE_API_KEY'),
    authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('FIREBASE_APP_ID'),
    measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID')
  };
  
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  let allRequiredPresent = true;
  
  requiredFields.forEach(field => {
    const value = firebaseConfig[field as keyof typeof firebaseConfig];
    const status = value ? '✅' : '❌';
    console.log(`${status} ${field}: ${value ? 'SET' : 'MISSING'}`);
    
    if (!value) {
      allRequiredPresent = false;
    }
  });
  
  if (allRequiredPresent) {
    console.log('✅ Firebase configuration is complete!');
    return true;
  } else {
    console.error('❌ Firebase configuration is incomplete!');
    return false;
  }
};

/**
 * Test Solana configuration specifically
 */
export const testSolanaConfiguration = (): boolean => {
  console.log('🔗 Testing Solana Configuration...');
  
  const heliusApiKey = getEnvVar('HELIUS_API_KEY');
  const forceMainnet = getEnvVar('FORCE_MAINNET');
  const devNetwork = getEnvVar('DEV_NETWORK');
  
  console.log(`Helius API Key: ${heliusApiKey ? '✅ SET' : '❌ MISSING'}`);
  console.log(`Force Mainnet: ${forceMainnet ? '✅ SET' : '⚠️  Using default'}`);
  console.log(`Dev Network: ${devNetwork ? '✅ SET' : '⚠️  Using default'}`);
  
  if (heliusApiKey) {
    console.log('✅ Solana configuration is ready!');
    return true;
  } else {
    console.error('❌ Solana configuration is missing Helius API Key!');
    return false;
  }
};

/**
 * Test Company Wallet configuration specifically
 */
export const testCompanyWalletConfiguration = (): boolean => {
  console.log('🏦 Testing Company Wallet Configuration...');
  
  const address = getEnvVar('COMPANY_WALLET_ADDRESS');
  const secretKey = getEnvVar('COMPANY_WALLET_SECRET_KEY');
  const minSolReserve = getEnvVar('COMPANY_MIN_SOL_RESERVE');
  const gasFeeEstimate = getEnvVar('COMPANY_GAS_FEE_ESTIMATE');
  
  console.log(`Wallet Address: ${address ? '✅ SET' : '❌ MISSING'}`);
  console.log(`Secret Key: ${secretKey ? '✅ SET' : '❌ MISSING'}`);
  console.log(`Min SOL Reserve: ${minSolReserve ? '✅ SET' : '⚠️  Using default'}`);
  console.log(`Gas Fee Estimate: ${gasFeeEstimate ? '✅ SET' : '⚠️  Using default'}`);
  
  if (address && secretKey) {
    console.log('✅ Company wallet configuration is ready!');
    return true;
  } else {
    console.error('❌ Company wallet configuration is incomplete!');
    return false;
  }
};

/**
 * Run all environment variable tests
 */
export const runAllEnvironmentTests = (): boolean => {
  console.log('🚀 Running All Environment Variable Tests...');
  console.log('=' .repeat(60));
  
  const results = [
    testEnvironmentVariables(),
    testFirebaseConfiguration(),
    testSolanaConfiguration(),
    testCompanyWalletConfiguration()
  ];
  
  const allPassed = results.every(result => result);
  
  console.log('=' .repeat(60));
  if (allPassed) {
    console.log('🎉 All environment variable tests passed!');
    console.log('✅ Your app is ready for production use');
  } else {
    console.error('❌ Some environment variable tests failed!');
    console.error('🚨 Please check your EAS environment variable configuration');
  }
  
  return allPassed;
};

// Export for easy testing
export default {
  testEnvironmentVariables,
  testFirebaseConfiguration,
  testSolanaConfiguration,
  testCompanyWalletConfiguration,
  runAllEnvironmentTests
};
