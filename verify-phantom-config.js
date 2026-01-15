/**
 * Phantom Configuration Verification Script
 * Run this to verify Phantom auth is properly configured
 * 
 * Usage: node verify-phantom-config.js
 */

// Simulate environment variables (in real app, these come from Expo config)
const mockEnv = {
  EXPO_PUBLIC_PHANTOM_APP_ID: process.env.EXPO_PUBLIC_PHANTOM_APP_ID || '',
  EXPO_PUBLIC_PHANTOM_APP_ORIGIN: process.env.EXPO_PUBLIC_PHANTOM_APP_ORIGIN || 'https://wesplit.io',
  EXPO_PUBLIC_PHANTOM_REDIRECT_URI: process.env.EXPO_PUBLIC_PHANTOM_REDIRECT_URI || 'wesplit://phantom-callback',
  EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN: process.env.EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN || 'false',
  EXPO_PUBLIC_PHANTOM_SPLIT_WALLETS: process.env.EXPO_PUBLIC_PHANTOM_SPLIT_WALLETS || 'false',
  __DEV__: process.env.NODE_ENV !== 'production',
};

console.log('🔍 Phantom Configuration Verification\n');
console.log('='.repeat(60));

// Check required config
const requiredConfig = {
  appId: mockEnv.EXPO_PUBLIC_PHANTOM_APP_ID,
  appOrigin: mockEnv.EXPO_PUBLIC_PHANTOM_APP_ORIGIN,
  redirectUri: mockEnv.EXPO_PUBLIC_PHANTOM_REDIRECT_URI,
};

console.log('\n📋 Required Configuration:');
let allRequiredPresent = true;
for (const [key, value] of Object.entries(requiredConfig)) {
  const isSet = !!value && value !== 'undefined';
  const status = isSet ? '✅' : '❌';
  console.log(`  ${status} ${key}: ${isSet ? value : 'MISSING'}`);
  if (!isSet) allRequiredPresent = false;
}

// Check feature flags
console.log('\n🚩 Feature Flags:');
const isDev = mockEnv.__DEV__;
const socialLoginEnabled = isDev || mockEnv.EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN === 'true';
const splitWalletsEnabled = isDev || mockEnv.EXPO_PUBLIC_PHANTOM_SPLIT_WALLETS === 'true';

console.log(`  ${isDev ? '✅' : '⚠️'} Development Mode: ${isDev}`);
console.log(`  ${socialLoginEnabled ? '✅' : '❌'} Social Login: ${socialLoginEnabled ? 'ENABLED' : 'DISABLED'}`);
console.log(`  ${splitWalletsEnabled ? '✅' : '❌'} Split Wallets: ${splitWalletsEnabled ? 'ENABLED' : 'DISABLED'}`);

// Check if Phantom auth button will show
const isPhantomConfigured = allRequiredPresent;
const willShowButton = isPhantomConfigured && socialLoginEnabled;

console.log('\n🎯 Phantom Auth Button Status:');
console.log(`  ${isPhantomConfigured ? '✅' : '❌'} Phantom SDK Configured: ${isPhantomConfigured}`);
console.log(`  ${willShowButton ? '✅' : '❌'} Button Will Show: ${willShowButton ? 'YES' : 'NO'}`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary:');

if (allRequiredPresent && willShowButton) {
  console.log('  ✅ Phantom authentication is PROPERLY CONFIGURED');
  console.log('  ✅ Auth button will be visible in the app');
} else {
  console.log('  ❌ Phantom authentication is NOT FULLY CONFIGURED');
  
  if (!allRequiredPresent) {
    console.log('\n  Missing required configuration:');
    for (const [key, value] of Object.entries(requiredConfig)) {
      if (!value || value === 'undefined') {
        console.log(`    - ${key}`);
      }
    }
  }
  
  if (!socialLoginEnabled && !isDev) {
    console.log('\n  ⚠️  Social Login is disabled in production');
    console.log('     Set EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true to enable');
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n💡 To enable in production, set these environment variables:');
console.log('   EXPO_PUBLIC_PHANTOM_APP_ID=your-app-id-from-phantom-portal');
console.log('   EXPO_PUBLIC_PHANTOM_APP_ORIGIN=https://wesplit.io');
console.log('   EXPO_PUBLIC_PHANTOM_REDIRECT_URI=wesplit://phantom-callback');
console.log('   EXPO_PUBLIC_PHANTOM_SOCIAL_LOGIN=true');
console.log('\n');
