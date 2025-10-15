#!/usr/bin/env node

/**
 * Real Configuration Test
 * Tests the actual app configuration with current environment variables
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

// Load actual environment variables from .env file
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return envVars;
}

// Simulate the getEnvVar function from the app
function getEnvVar(key, envVars = {}) {
  // Try to get from process.env first (for development)
  if (process.env[key]) return process.env[key];
  if (process.env[`EXPO_PUBLIC_${key}`]) return process.env[`EXPO_PUBLIC_${key}`];
  
  // Try to get from loaded env vars
  if (envVars[key]) return envVars[key];
  if (envVars[`EXPO_PUBLIC_${key}`]) return envVars[`EXPO_PUBLIC_${key}`];
  
  return '';
}

// Test actual Firebase configuration
function testActualFirebaseConfig() {
  log('\n🔥 Testing Actual Firebase Configuration:', 'blue');
  
  const envVars = loadEnvFile();
  
  const firebaseConfig = {
    apiKey: getEnvVar('FIREBASE_API_KEY', envVars),
    authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', envVars) || "wesplit-35186.firebaseapp.com",
    projectId: getEnvVar('FIREBASE_PROJECT_ID', envVars) || "wesplit-35186",
    storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET', envVars) || "wesplit-35186.appspot.com",
    messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID', envVars),
    appId: getEnvVar('FIREBASE_APP_ID', envVars),
    measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID', envVars)
  };
  
  log('  Current Firebase Configuration:', 'yellow');
  Object.entries(firebaseConfig).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const displayValue = value ? (key.includes('Key') || key.includes('Secret') ? 'SET' : value) : 'MISSING';
    log(`    ${status} ${key}: ${displayValue}`, value ? 'green' : 'red');
  });
  
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const allRequiredPresent = requiredFields.every(field => firebaseConfig[field]);
  
  return {
    passed: allRequiredPresent,
    config: firebaseConfig
  };
}

// Test actual Solana configuration
function testActualSolanaConfig() {
  log('\n🔗 Testing Actual Solana Configuration:', 'blue');
  
  const envVars = loadEnvFile();
  
  const solanaConfig = {
    heliusApiKey: getEnvVar('HELIUS_API_KEY', envVars),
    forceMainnet: getEnvVar('FORCE_MAINNET', envVars) || 'false',
    devNetwork: getEnvVar('DEV_NETWORK', envVars) || 'devnet'
  };
  
  log('  Current Solana Configuration:', 'yellow');
  Object.entries(solanaConfig).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const displayValue = key === 'heliusApiKey' ? (value ? 'SET' : 'MISSING') : value;
    log(`    ${status} ${key}: ${displayValue}`, value ? 'green' : 'red');
  });
  
  return {
    passed: !!solanaConfig.heliusApiKey,
    config: solanaConfig
  };
}

// Test actual Company Wallet configuration
function testActualCompanyWalletConfig() {
  log('\n🏦 Testing Actual Company Wallet Configuration:', 'blue');
  
  const envVars = loadEnvFile();
  
  const walletConfig = {
    address: getEnvVar('COMPANY_WALLET_ADDRESS', envVars),
    secretKey: getEnvVar('COMPANY_WALLET_SECRET_KEY', envVars),
    minSolReserve: getEnvVar('COMPANY_MIN_SOL_RESERVE', envVars) || '0.01',
    gasFeeEstimate: getEnvVar('COMPANY_GAS_FEE_ESTIMATE', envVars) || '0.001'
  };
  
  log('  Current Company Wallet Configuration:', 'yellow');
  Object.entries(walletConfig).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const displayValue = key === 'secretKey' ? (value ? 'SET' : 'MISSING') : value;
    log(`    ${status} ${key}: ${displayValue}`, value ? 'green' : 'red');
  });
  
  return {
    passed: walletConfig.address && walletConfig.secretKey,
    config: walletConfig
  };
}

// Test actual OAuth configuration
function testActualOAuthConfig() {
  log('\n🔐 Testing Actual OAuth Configuration:', 'blue');
  
  const envVars = loadEnvFile();
  
  const oauthConfig = {
    googleClientId: getEnvVar('GOOGLE_CLIENT_ID', envVars),
    androidGoogleClientId: getEnvVar('ANDROID_GOOGLE_CLIENT_ID', envVars),
    iosGoogleClientId: getEnvVar('IOS_GOOGLE_CLIENT_ID', envVars),
    appleClientId: getEnvVar('APPLE_CLIENT_ID', envVars),
    appleServiceId: getEnvVar('APPLE_SERVICE_ID', envVars),
    appleTeamId: getEnvVar('APPLE_TEAM_ID', envVars),
    appleKeyId: getEnvVar('APPLE_KEY_ID', envVars),
    twitterClientId: getEnvVar('TWITTER_CLIENT_ID', envVars)
  };
  
  log('  Current OAuth Configuration:', 'yellow');
  Object.entries(oauthConfig).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const displayValue = value ? 'SET' : 'MISSING';
    log(`    ${status} ${key}: ${displayValue}`, value ? 'green' : 'red');
  });
  
  const criticalKeys = ['googleClientId', 'androidGoogleClientId', 'iosGoogleClientId', 'appleClientId', 'appleServiceId', 'appleTeamId', 'appleKeyId'];
  const allCriticalPresent = criticalKeys.every(key => oauthConfig[key]);
  
  return {
    passed: allCriticalPresent,
    config: oauthConfig
  };
}

// Test EAS configuration
function testEASConfiguration() {
  log('\n☁️  Testing EAS Configuration:', 'blue');
  
  const easPath = path.join(process.cwd(), 'eas.json');
  if (!fs.existsSync(easPath)) {
    log('  ❌ eas.json file not found', 'red');
    return { passed: false };
  }
  
  try {
    const easConfig = JSON.parse(fs.readFileSync(easPath, 'utf8'));
    const productionProfile = easConfig.build?.production;
    
    if (!productionProfile) {
      log('  ❌ Production profile not found in eas.json', 'red');
      return { passed: false };
    }
    
    const envVars = productionProfile.env || {};
    const envVarCount = Object.keys(envVars).length;
    
    log(`  ✅ Production profile found with ${envVarCount} environment variables`, 'green');
    
    // Check for critical variables
    const criticalVars = [
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_HELIUS_API_KEY',
      'EXPO_PUBLIC_COMPANY_WALLET_ADDRESS'
    ];
    
    log('  Critical Environment Variables in EAS:', 'yellow');
    criticalVars.forEach(varName => {
      const isPresent = envVars.hasOwnProperty(varName);
      const status = isPresent ? '✅' : '❌';
      log(`    ${status} ${varName}`, isPresent ? 'green' : 'red');
    });
    
    const allCriticalPresent = criticalVars.every(varName => envVars.hasOwnProperty(varName));
    
    return {
      passed: allCriticalPresent,
      envVarCount,
      criticalVarsPresent: criticalVars.filter(varName => envVars.hasOwnProperty(varName)).length
    };
    
  } catch (error) {
    log(`  ❌ Error reading eas.json: ${error.message}`, 'red');
    return { passed: false };
  }
}

// Test app configuration
function testAppConfiguration() {
  log('\n📱 Testing App Configuration:', 'blue');
  
  const appConfigPath = path.join(process.cwd(), 'app.config.js');
  if (!fs.existsSync(appConfigPath)) {
    log('  ❌ app.config.js file not found', 'red');
    return { passed: false };
  }
  
  try {
    const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
    
    // Check for key configurations
    const checks = [
      { name: 'Expo SDK Version', pattern: /sdkVersion/i, required: true },
      { name: 'App Name', pattern: /name.*['"`]/, required: true },
      { name: 'Bundle Identifier', pattern: /bundleIdentifier/i, required: true },
      { name: 'Platform Configurations', pattern: /android.*:|ios.*:/i, required: true },
      { name: 'Extra Configuration', pattern: /extra.*:/, required: true }
    ];
    
    log('  App Configuration Checks:', 'yellow');
    let allChecksPassed = true;
    
    checks.forEach(check => {
      const isPresent = check.pattern.test(appConfigContent);
      const status = isPresent ? '✅' : '❌';
      log(`    ${status} ${check.name}`, isPresent ? 'green' : 'red');
      if (check.required && !isPresent) allChecksPassed = false;
    });
    
    return { passed: allChecksPassed };
    
  } catch (error) {
    log(`  ❌ Error reading app.config.js: ${error.message}`, 'red');
    return { passed: false };
  }
}

// Main test function
function main() {
  log('🧪 Real Configuration Test', 'bright');
  log('=' .repeat(60), 'cyan');
  log('Testing actual app configuration with current environment variables', 'yellow');
  
  const tests = [
    { name: 'Firebase Configuration', test: testActualFirebaseConfig },
    { name: 'Solana Configuration', test: testActualSolanaConfig },
    { name: 'Company Wallet Configuration', test: testActualCompanyWalletConfig },
    { name: 'OAuth Configuration', test: testActualOAuthConfig },
    { name: 'EAS Configuration', test: testEASConfiguration },
    { name: 'App Configuration', test: testAppConfiguration }
  ];
  
  let allTestsPassed = true;
  const results = [];
  
  tests.forEach(({ name, test }) => {
    const result = test();
    results.push({ name, ...result });
    if (!result.passed) allTestsPassed = false;
  });
  
  log('\n📊 Test Summary:', 'magenta');
  log('=' .repeat(60), 'cyan');
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    log(`${status} ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`, result.passed ? 'green' : 'red');
  });
  
  log('\n🎯 Configuration Status:', 'magenta');
  log('=' .repeat(60), 'cyan');
  
  if (allTestsPassed) {
    log('✅ All configurations are properly set up', 'green');
    log('✅ Environment variables are accessible', 'green');
    log('✅ EAS configuration is complete', 'green');
    log('✅ App is ready for production build', 'green');
  } else {
    log('❌ Some configurations need attention', 'red');
    log('❌ Please fix the failing configurations before building', 'red');
  }
  
  log('\n🚀 Next Steps:', 'yellow');
  if (allTestsPassed) {
    log('1. ✅ All configurations are ready', 'white');
    log('2. 🏗️  Proceed with APK build: npm run build:android', 'white');
    log('3. 📱 Test the APK on a device', 'white');
    log('4. 👤 Verify complete user experience', 'white');
  } else {
    log('1. 🔧 Fix the failing configurations', 'white');
    log('2. 🧪 Re-run this test: node scripts/test-real-config.js', 'white');
    log('3. 🏗️  Then proceed with APK build', 'white');
  }
  
  log('\n' + '=' .repeat(60), 'cyan');
  
  if (allTestsPassed) {
    log('🎉 All configurations are ready for production APK build!', 'green');
    process.exit(0);
  } else {
    log('❌ Please fix the configuration issues above.', 'red');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = {
  testActualFirebaseConfig,
  testActualSolanaConfig,
  testActualCompanyWalletConfig,
  testActualOAuthConfig,
  testEASConfiguration,
  testAppConfiguration
};
