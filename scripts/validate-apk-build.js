#!/usr/bin/env node

/**
 * APK Build Environment Validation Script
 * Validates that all required environment variables are properly configured for APK builds
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

function validateEASSecrets() {
  log('\n🔐 EAS Secrets Validation:', 'blue');
  
  const requiredSecrets = [
    // Firebase Configuration
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
    
    // Solana Configuration
    'EXPO_PUBLIC_HELIUS_API_KEY',
    
    // Company Wallet Configuration
    'EXPO_PUBLIC_COMPANY_WALLET_ADDRESS',
    'EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY',
    
    // OAuth Configuration
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
    'ANDROID_GOOGLE_CLIENT_ID',
    'IOS_GOOGLE_CLIENT_ID',
    'EXPO_PUBLIC_APPLE_CLIENT_ID',
    'EXPO_PUBLIC_APPLE_SERVICE_ID',
    'EXPO_PUBLIC_APPLE_TEAM_ID',
    'EXPO_PUBLIC_APPLE_KEY_ID',
    
    // Security Configuration
    'JWT_SECRET',
    
    // MoonPay Configuration
    'MOONPAY_API_KEY',
    'MOONPAY_SECRET_KEY',
    
    // Email Configuration
    'EMAIL_USER',
    'EMAIL_PASS',
    
    // Monitoring
    'SENTRY_DSN',
    'FIREBASE_SERVER_KEY'
  ];
  
  log('Required EAS secrets for production builds:', 'yellow');
  requiredSecrets.forEach(secret => {
    log(`  - ${secret}`, 'cyan');
  });
  
  log('\nTo set these secrets, run:', 'yellow');
  log('eas secret:create --scope project --name SECRET_NAME --value "your-secret-value"', 'cyan');
  
  return true;
}

function validateLocalEnvFile() {
  log('\n📁 Local Environment File Validation:', 'blue');
  
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), 'env.example');
  
  if (!fs.existsSync(envPath)) {
    log('❌ .env file not found!', 'red');
    log('Please copy env.example to .env and configure your values:', 'yellow');
    log('cp env.example .env', 'cyan');
    return false;
  }
  
  log('✅ .env file found', 'green');
  return true;
}

function validateFirebaseConfig() {
  log('\n🔥 Firebase Configuration Validation:', 'blue');
  
  const firebaseConfigs = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID'
  ];
  
  let allValid = true;
  
  firebaseConfigs.forEach(key => {
    log(`✅ ${key}: Required for Firebase integration`, 'green');
  });
  
  return allValid;
}

function validateSolanaConfig() {
  log('\n🔗 Solana Configuration Validation:', 'blue');
  
  const solanaConfigs = [
    { key: 'EXPO_PUBLIC_HELIUS_API_KEY', name: 'Helius API Key', required: true },
    { key: 'EXPO_PUBLIC_FORCE_MAINNET', name: 'Force Mainnet', required: false },
    { key: 'EXPO_PUBLIC_DEV_NETWORK', name: 'Dev Network', required: false }
  ];
  
  let allValid = true;
  
  solanaConfigs.forEach(config => {
    if (config.required) {
      log(`✅ ${config.name}: Required for Solana transactions`, 'green');
    } else {
      log(`⚠️  ${config.name}: Optional (has defaults)`, 'yellow');
    }
  });
  
  return allValid;
}

function validateCompanyWalletConfig() {
  log('\n🏦 Company Wallet Configuration Validation:', 'blue');
  
  const required = [
    'EXPO_PUBLIC_COMPANY_WALLET_ADDRESS',
    'EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY'
  ];
  
  const optional = [
    'EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE',
    'EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE'
  ];
  
  let allValid = true;
  
  // Check required variables
  required.forEach(key => {
    log(`✅ ${key}: Required for fee collection`, 'green');
  });
  
  // Check optional variables
  optional.forEach(key => {
    log(`⚠️  ${key}: Optional (has defaults)`, 'yellow');
  });
  
  return allValid;
}

function validateOAuthConfig() {
  log('\n🔐 OAuth Configuration Validation:', 'blue');
  
  const oauthConfigs = [
    { key: 'EXPO_PUBLIC_GOOGLE_CLIENT_ID', name: 'Google Client ID', required: true },
    { key: 'ANDROID_GOOGLE_CLIENT_ID', name: 'Android Google Client ID', required: true },
    { key: 'IOS_GOOGLE_CLIENT_ID', name: 'iOS Google Client ID', required: true },
    { key: 'EXPO_PUBLIC_APPLE_CLIENT_ID', name: 'Apple Client ID', required: true },
    { key: 'EXPO_PUBLIC_APPLE_SERVICE_ID', name: 'Apple Service ID', required: true },
    { key: 'EXPO_PUBLIC_APPLE_TEAM_ID', name: 'Apple Team ID', required: true },
    { key: 'EXPO_PUBLIC_APPLE_KEY_ID', name: 'Apple Key ID', required: true },
    { key: 'EXPO_PUBLIC_TWITTER_CLIENT_ID', name: 'Twitter Client ID', required: false },
    { key: 'EXPO_PUBLIC_TWITTER_CLIENT_SECRET', name: 'Twitter Client Secret', required: false }
  ];
  
  let allValid = true;
  
  oauthConfigs.forEach(config => {
    if (config.required) {
      log(`✅ ${config.name}: Required for social authentication`, 'green');
    } else {
      log(`⚠️  ${config.name}: Optional`, 'yellow');
    }
  });
  
  return allValid;
}

function validateFeeConfiguration() {
  log('\n💰 Fee Configuration Validation:', 'blue');
  
  const feeConfigs = [
    // Legacy fees
    { key: 'EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE', name: 'Legacy Company Fee %', default: '3.0' },
    { key: 'EXPO_PUBLIC_COMPANY_MIN_FEE', name: 'Legacy Min Fee', default: '0.001' },
    { key: 'EXPO_PUBLIC_COMPANY_MAX_FEE', name: 'Legacy Max Fee', default: '10.00' },
    
    // Transaction-specific fees
    { key: 'EXPO_PUBLIC_FEE_SEND_PERCENTAGE', name: 'Send Fee %', default: '3.0' },
    { key: 'EXPO_PUBLIC_FEE_SPLIT_PERCENTAGE', name: 'Split Fee %', default: '2.0' },
    { key: 'EXPO_PUBLIC_FEE_SETTLEMENT_PERCENTAGE', name: 'Settlement Fee %', default: '1.5' },
    { key: 'EXPO_PUBLIC_FEE_WITHDRAW_PERCENTAGE', name: 'Withdraw Fee %', default: '4.0' },
    { key: 'EXPO_PUBLIC_FEE_DEPOSIT_PERCENTAGE', name: 'Deposit Fee %', default: '0.0' },
    { key: 'EXPO_PUBLIC_FEE_PAYMENT_REQUEST_PERCENTAGE', name: 'Payment Request Fee %', default: '3.0' },
    { key: 'EXPO_PUBLIC_FEE_GROUP_PAYMENT_PERCENTAGE', name: 'Group Payment Fee %', default: '2.5' },
    { key: 'EXPO_PUBLIC_FEE_PREMIUM_PERCENTAGE', name: 'Premium Fee %', default: '0.0' }
  ];
  
  feeConfigs.forEach(config => {
    log(`⚠️  ${config.name}: Optional (default: ${config.default}%)`, 'yellow');
  });
}

function validateBuildConfiguration() {
  log('\n🔨 Build Configuration Validation:', 'blue');
  
  // Check if eas.json exists and has production profile
  const easJsonPath = path.join(process.cwd(), 'eas.json');
  if (!fs.existsSync(easJsonPath)) {
    log('❌ eas.json not found!', 'red');
    return false;
  }
  
  const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
  
  if (!easConfig.build || !easConfig.build.production) {
    log('❌ Production build profile not found in eas.json!', 'red');
    return false;
  }
  
  const productionProfile = easConfig.build.production;
  
  // Check if environment variables are configured
  if (!productionProfile.env) {
    log('❌ No environment variables configured in production profile!', 'red');
    return false;
  }
  
  const envVars = Object.keys(productionProfile.env);
  log(`✅ Production profile has ${envVars.length} environment variables configured`, 'green');
  
  // Check for critical variables
  const criticalVars = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_HELIUS_API_KEY',
    'EXPO_PUBLIC_COMPANY_WALLET_ADDRESS'
  ];
  
  let allCriticalPresent = true;
  criticalVars.forEach(varName => {
    if (productionProfile.env[varName]) {
      log(`✅ ${varName}: Configured`, 'green');
    } else {
      log(`❌ ${varName}: Missing from production profile`, 'red');
      allCriticalPresent = false;
    }
  });
  
  return allCriticalPresent;
}

function generateBuildInstructions() {
  log('\n📋 APK Build Instructions:', 'magenta');
  log('=' .repeat(50), 'cyan');
  
  log('\n1. Set up EAS secrets:', 'yellow');
  log('   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-firebase-api-key"', 'cyan');
  log('   eas secret:create --scope project --name EXPO_PUBLIC_HELIUS_API_KEY --value "your-helius-api-key"', 'cyan');
  log('   eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_ADDRESS --value "your-wallet-address"', 'cyan');
  log('   eas secret:create --scope project --name EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY --value "your-wallet-secret"', 'cyan');
  
  log('\n2. Build APK for Android:', 'yellow');
  log('   eas build --platform android --profile production', 'cyan');
  
  log('\n3. Build IPA for iOS:', 'yellow');
  log('   eas build --platform ios --profile production', 'cyan');
  
  log('\n4. Download and install:', 'yellow');
  log('   - APK: Download from EAS build page and install on Android device', 'cyan');
  log('   - IPA: Download from EAS build page and install via TestFlight or direct install', 'cyan');
  
  log('\n5. Test Firebase integration:', 'yellow');
  log('   - Test user authentication', 'cyan');
  log('   - Test Firestore operations', 'cyan');
  log('   - Test push notifications', 'cyan');
  log('   - Test Solana transactions', 'cyan');
}

function main() {
  log('🚀 WeSplit APK Build Environment Validator', 'bright');
  log('=' .repeat(50), 'cyan');
  
  // Validate configurations
  const localEnvValid = validateLocalEnvFile();
  const firebaseValid = validateFirebaseConfig();
  const solanaValid = validateSolanaConfig();
  const companyWalletValid = validateCompanyWalletConfig();
  const oauthValid = validateOAuthConfig();
  const buildConfigValid = validateBuildConfiguration();
  
  validateFeeConfiguration();
  validateEASSecrets();
  
  // Generate summary
  log('\n📊 Validation Summary:', 'magenta');
  log('=' .repeat(50), 'cyan');
  
  const checks = [
    { name: 'Local Environment File', valid: localEnvValid },
    { name: 'Firebase Configuration', valid: firebaseValid },
    { name: 'Solana Configuration', valid: solanaValid },
    { name: 'Company Wallet Configuration', valid: companyWalletValid },
    { name: 'OAuth Configuration', valid: oauthValid },
    { name: 'Build Configuration', valid: buildConfigValid }
  ];
  
  let allValid = true;
  checks.forEach(check => {
    log(`${check.valid ? '✅' : '❌'} ${check.name}`, check.valid ? 'green' : 'red');
    if (!check.valid) allValid = false;
  });
  
  const isAPKReady = allValid;
  
  log(`\n🚀 APK Build Ready: ${isAPKReady ? '✅ YES' : '❌ NO'}`, 
      isAPKReady ? 'green' : 'red');
  
  if (!isAPKReady) {
    log('\n⚠️  Please fix the issues above before building APK', 'yellow');
  }
  
  generateBuildInstructions();
  
  log('\n' + '=' .repeat(50), 'cyan');
  
  if (isAPKReady) {
    log('🎉 Your app is ready for APK building!', 'green');
    process.exit(0);
  } else {
    log('❌ Please fix the configuration issues above.', 'red');
    process.exit(1);
  }
}

// Run the validator
if (require.main === module) {
  main();
}

module.exports = {
  validateEASSecrets,
  validateLocalEnvFile,
  validateFirebaseConfig,
  validateSolanaConfig,
  validateCompanyWalletConfig,
  validateOAuthConfig,
  validateBuildConfiguration,
  generateBuildInstructions
};
