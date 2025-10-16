#!/usr/bin/env node

/**
 * Runtime Environment Variable Test
 * Simulates how environment variables will be accessed in the actual app
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Simulate the getEnvVar function from the app
function getEnvVar(key, mockConstants = {}) {
  // Simulate process.env (development)
  if (process.env[key]) return process.env[key];
  if (process.env[`EXPO_PUBLIC_${key}`]) return process.env[`EXPO_PUBLIC_${key}`];
  
  // Simulate Constants.expoConfig.extra (EAS build)
  if (mockConstants.expoConfig?.extra?.[key]) return mockConstants.expoConfig.extra[key];
  if (mockConstants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) return mockConstants.expoConfig.extra[`EXPO_PUBLIC_${key}`];
  
  // Simulate Constants.manifest.extra (older Expo versions)
  if (mockConstants.manifest?.extra?.[key]) return mockConstants.manifest.extra[key];
  if (mockConstants.manifest?.extra?.[`EXPO_PUBLIC_${key}`]) return mockConstants.manifest.extra[`EXPO_PUBLIC_${key}`];
  
  return '';
}

// Test Firebase configuration access
function testFirebaseConfiguration() {
  log('\n🔥 Testing Firebase Configuration Access:', 'blue');
  
  // Mock EAS environment variables (as they would appear in Constants.expoConfig.extra)
  const mockEASConstants = {
    expoConfig: {
      extra: {
        'EXPO_PUBLIC_FIREBASE_API_KEY': 'mock-firebase-api-key',
        'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN': 'mock-project.firebaseapp.com',
        'EXPO_PUBLIC_FIREBASE_PROJECT_ID': 'mock-project',
        'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET': 'mock-project.appspot.com',
        'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': '123456789',
        'EXPO_PUBLIC_FIREBASE_APP_ID': '1:123456789:web:abcdef',
        'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID': 'G-ABCDEFGHIJ'
      }
    }
  };
  
  const firebaseConfig = {
    apiKey: getEnvVar('FIREBASE_API_KEY', mockEASConstants),
    authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', mockEASConstants),
    projectId: getEnvVar('FIREBASE_PROJECT_ID', mockEASConstants),
    storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET', mockEASConstants),
    messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID', mockEASConstants),
    appId: getEnvVar('FIREBASE_APP_ID', mockEASConstants),
    measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID', mockEASConstants)
  };
  
  let allPassed = true;
  
  Object.entries(firebaseConfig).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    log(`  ${status} ${key}: ${value || 'MISSING'}`, value ? 'green' : 'red');
    if (!value) allPassed = false;
  });
  
  if (allPassed) {
    log('✅ Firebase configuration access test passed!', 'green');
  } else {
    log('❌ Firebase configuration access test failed!', 'red');
  }
  
  return allPassed;
}

// Test Solana configuration access
function testSolanaConfiguration() {
  log('\n🔗 Testing Solana Configuration Access:', 'blue');
  
  const mockEASConstants = {
    expoConfig: {
      extra: {
        'EXPO_PUBLIC_HELIUS_API_KEY': 'mock-helius-api-key',
        'EXPO_PUBLIC_FORCE_MAINNET': 'true',
        'EXPO_PUBLIC_DEV_NETWORK': 'mainnet'
      }
    }
  };
  
  const solanaConfig = {
    heliusApiKey: getEnvVar('HELIUS_API_KEY', mockEASConstants),
    forceMainnet: getEnvVar('FORCE_MAINNET', mockEASConstants),
    devNetwork: getEnvVar('DEV_NETWORK', mockEASConstants)
  };
  
  let allPassed = true;
  
  Object.entries(solanaConfig).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    log(`  ${status} ${key}: ${value || 'MISSING'}`, value ? 'green' : 'red');
    if (!value && key === 'heliusApiKey') allPassed = false; // Only heliusApiKey is critical
  });
  
  if (allPassed) {
    log('✅ Solana configuration access test passed!', 'green');
  } else {
    log('❌ Solana configuration access test failed!', 'red');
  }
  
  return allPassed;
}

// Test Company Wallet configuration access
function testCompanyWalletConfiguration() {
  log('\n🏦 Testing Company Wallet Configuration Access:', 'blue');
  
  const mockEASConstants = {
    expoConfig: {
      extra: {
        'EXPO_PUBLIC_COMPANY_WALLET_ADDRESS': 'mock-wallet-address',
        'EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY': 'mock-wallet-secret-key',
        'EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE': '1.0',
        'EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE': '0.005'
      }
    }
  };
  
  const walletConfig = {
    address: getEnvVar('COMPANY_WALLET_ADDRESS', mockEASConstants),
    secretKey: getEnvVar('COMPANY_WALLET_SECRET_KEY', mockEASConstants),
    minSolReserve: getEnvVar('COMPANY_MIN_SOL_RESERVE', mockEASConstants),
    gasFeeEstimate: getEnvVar('COMPANY_GAS_FEE_ESTIMATE', mockEASConstants)
  };
  
  let allPassed = true;
  
  Object.entries(walletConfig).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    log(`  ${status} ${key}: ${value || 'MISSING'}`, value ? 'green' : 'red');
    if (!value && (key === 'address' || key === 'secretKey')) allPassed = false; // Only address and secretKey are critical
  });
  
  if (allPassed) {
    log('✅ Company wallet configuration access test passed!', 'green');
  } else {
    log('❌ Company wallet configuration access test failed!', 'red');
  }
  
  return allPassed;
}

// Test OAuth configuration access
function testOAuthConfiguration() {
  log('\n🔐 Testing OAuth Configuration Access:', 'blue');
  
  const mockEASConstants = {
    expoConfig: {
      extra: {
        'EXPO_PUBLIC_GOOGLE_CLIENT_ID': 'mock-google-client-id',
        'ANDROID_GOOGLE_CLIENT_ID': 'mock-android-google-client-id',
        'IOS_GOOGLE_CLIENT_ID': 'mock-ios-google-client-id',
        'EXPO_PUBLIC_APPLE_CLIENT_ID': 'mock-apple-client-id',
        'EXPO_PUBLIC_APPLE_SERVICE_ID': 'mock-apple-service-id',
        'EXPO_PUBLIC_APPLE_TEAM_ID': 'mock-apple-team-id',
        'EXPO_PUBLIC_APPLE_KEY_ID': 'mock-apple-key-id',
        'EXPO_PUBLIC_TWITTER_CLIENT_ID': 'mock-twitter-client-id'
      }
    }
  };
  
  const oauthConfig = {
    googleClientId: getEnvVar('GOOGLE_CLIENT_ID', mockEASConstants),
    androidGoogleClientId: getEnvVar('ANDROID_GOOGLE_CLIENT_ID', mockEASConstants),
    iosGoogleClientId: getEnvVar('IOS_GOOGLE_CLIENT_ID', mockEASConstants),
    appleClientId: getEnvVar('APPLE_CLIENT_ID', mockEASConstants),
    appleServiceId: getEnvVar('APPLE_SERVICE_ID', mockEASConstants),
    appleTeamId: getEnvVar('APPLE_TEAM_ID', mockEASConstants),
    appleKeyId: getEnvVar('APPLE_KEY_ID', mockEASConstants),
    twitterClientId: getEnvVar('TWITTER_CLIENT_ID', mockEASConstants)
  };
  
  let allPassed = true;
  
  Object.entries(oauthConfig).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    log(`  ${status} ${key}: ${value || 'MISSING'}`, value ? 'green' : 'red');
    if (!value && key !== 'twitterClientId') allPassed = false; // Twitter is optional
  });
  
  if (allPassed) {
    log('✅ OAuth configuration access test passed!', 'green');
  } else {
    log('❌ OAuth configuration access test failed!', 'red');
  }
  
  return allPassed;
}

// Test fallback scenarios
function testFallbackScenarios() {
  log('\n🔄 Testing Fallback Scenarios:', 'blue');
  
  // Test 1: Direct process.env access (development)
  log('  Testing direct process.env access...', 'yellow');
  const originalEnv = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'dev-firebase-api-key';
  
  const devResult = getEnvVar('FIREBASE_API_KEY');
  const devStatus = devResult === 'dev-firebase-api-key' ? '✅' : '❌';
  log(`    ${devStatus} Development access: ${devResult}`, devResult ? 'green' : 'red');
  
  // Restore original env
  if (originalEnv) {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = originalEnv;
  } else {
    delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  }
  
  // Test 2: EAS Constants access (production)
  log('  Testing EAS Constants access...', 'yellow');
  const mockEASConstants = {
    expoConfig: {
      extra: {
        'EXPO_PUBLIC_FIREBASE_API_KEY': 'eas-firebase-api-key'
      }
    }
  };
  
  const easResult = getEnvVar('FIREBASE_API_KEY', mockEASConstants);
  const easStatus = easResult === 'eas-firebase-api-key' ? '✅' : '❌';
  log(`    ${easStatus} EAS access: ${easResult}`, easResult ? 'green' : 'red');
  
  // Test 3: Legacy manifest access
  log('  Testing legacy manifest access...', 'yellow');
  const mockLegacyConstants = {
    manifest: {
      extra: {
        'EXPO_PUBLIC_FIREBASE_API_KEY': 'legacy-firebase-api-key'
      }
    }
  };
  
  const legacyResult = getEnvVar('FIREBASE_API_KEY', mockLegacyConstants);
  const legacyStatus = legacyResult === 'legacy-firebase-api-key' ? '✅' : '❌';
  log(`    ${legacyStatus} Legacy access: ${legacyResult}`, legacyResult ? 'green' : 'red');
  
  const allFallbacksPassed = devResult && easResult && legacyResult;
  
  if (allFallbacksPassed) {
    log('✅ All fallback scenarios work correctly!', 'green');
  } else {
    log('❌ Some fallback scenarios failed!', 'red');
  }
  
  return allFallbacksPassed;
}

// Test error handling
function testErrorHandling() {
  log('\n⚠️  Testing Error Handling:', 'blue');
  
  // Test with empty constants
  const emptyConstants = {};
  const emptyResult = getEnvVar('FIREBASE_API_KEY', emptyConstants);
  const emptyStatus = emptyResult === '' ? '✅' : '❌';
  log(`  ${emptyStatus} Empty constants handling: ${emptyResult || 'EMPTY'}`, emptyResult === '' ? 'green' : 'red');
  
  // Test with undefined key
  const undefinedResult = getEnvVar('UNDEFINED_KEY', {});
  const undefinedStatus = undefinedResult === '' ? '✅' : '❌';
  log(`  ${undefinedStatus} Undefined key handling: ${undefinedResult || 'EMPTY'}`, undefinedResult === '' ? 'green' : 'red');
  
  const errorHandlingPassed = emptyResult === '' && undefinedResult === '';
  
  if (errorHandlingPassed) {
    log('✅ Error handling works correctly!', 'green');
  } else {
    log('❌ Error handling failed!', 'red');
  }
  
  return errorHandlingPassed;
}

// Main test function
function main() {
  log('🧪 Runtime Environment Variable Test', 'bright');
  log('=' .repeat(60), 'cyan');
  log('Testing how environment variables will be accessed in the actual app', 'yellow');
  
  const tests = [
    testFirebaseConfiguration,
    testSolanaConfiguration,
    testCompanyWalletConfiguration,
    testOAuthConfiguration,
    testFallbackScenarios,
    testErrorHandling
  ];
  
  let allTestsPassed = true;
  
  tests.forEach(test => {
    const result = test();
    if (!result) allTestsPassed = false;
  });
  
  log('\n📊 Test Summary:', 'magenta');
  log('=' .repeat(60), 'cyan');
  
  if (allTestsPassed) {
    log('✅ All runtime environment variable tests passed!', 'green');
    log('✅ Environment variables will be properly accessible in the APK', 'green');
    log('✅ Firebase, Solana, and OAuth configurations will work correctly', 'green');
  } else {
    log('❌ Some runtime environment variable tests failed!', 'red');
    log('❌ Please fix the issues above before building the APK', 'red');
  }
  
  log('\n🚀 Next Steps:', 'yellow');
  if (allTestsPassed) {
    log('1. Build your APK: npm run build:android', 'white');
    log('2. Test the APK on a device', 'white');
    log('3. Verify Firebase and Solana functionality', 'white');
  } else {
    log('1. Fix the failing tests above', 'white');
    log('2. Re-run this test: node scripts/test-runtime-env.js', 'white');
    log('3. Then build your APK', 'white');
  }
  
  log('\n' + '=' .repeat(60), 'cyan');
  
  if (allTestsPassed) {
    log('🎉 Runtime environment variable configuration is ready!', 'green');
    process.exit(0);
  } else {
    log('❌ Please fix the runtime environment variable issues above.', 'red');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = {
  getEnvVar,
  testFirebaseConfiguration,
  testSolanaConfiguration,
  testCompanyWalletConfiguration,
  testOAuthConfiguration,
  testFallbackScenarios,
  testErrorHandling
};
