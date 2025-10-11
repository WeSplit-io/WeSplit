#!/usr/bin/env node

/**
 * Environment Configuration Validation Script
 * Validates that all required environment variables are properly configured
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

function validateEnvFile() {
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

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return envVars;
}

function validateCompanyWalletConfig(envVars) {
  log('\n🏦 Company Wallet Configuration:', 'blue');
  
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
    if (!envVars[key] || envVars[key] === 'YOUR_COMPANY_WALLET_ADDRESS_HERE' || envVars[key] === 'YOUR_COMPANY_WALLET_SECRET_KEY_HERE') {
      log(`❌ ${key}: Not configured or using placeholder value`, 'red');
      allValid = false;
    } else {
      log(`✅ ${key}: Configured`, 'green');
    }
  });
  
  // Check optional variables
  optional.forEach(key => {
    if (envVars[key]) {
      log(`✅ ${key}: ${envVars[key]}`, 'green');
    } else {
      log(`⚠️  ${key}: Using default value`, 'yellow');
    }
  });
  
  return allValid;
}

function validateFeeConfiguration(envVars) {
  log('\n💰 Fee Configuration:', 'blue');
  
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
    const value = envVars[config.key];
    if (value) {
      log(`✅ ${config.name}: ${value}%`, 'green');
    } else {
      log(`⚠️  ${config.name}: Using default ${config.default}%`, 'yellow');
    }
  });
}

function validateSolanaConfig(envVars) {
  log('\n🔗 Solana Configuration:', 'blue');
  
  const solanaConfigs = [
    { key: 'EXPO_PUBLIC_HELIUS_API_KEY', name: 'Helius API Key', required: true },
    { key: 'EXPO_PUBLIC_FORCE_MAINNET', name: 'Force Mainnet', required: false },
    { key: 'EXPO_PUBLIC_DEV_NETWORK', name: 'Dev Network', required: false }
  ];
  
  let allValid = true;
  
  solanaConfigs.forEach(config => {
    if (!envVars[config.key] || envVars[config.key].includes('YOUR_')) {
      if (config.required) {
        log(`❌ ${config.name}: Not configured`, 'red');
        allValid = false;
      } else {
        log(`⚠️  ${config.name}: Using default`, 'yellow');
      }
    } else {
      log(`✅ ${config.name}: Configured`, 'green');
    }
  });
  
  return allValid;
}

function validateFirebaseConfig(envVars) {
  log('\n🔥 Firebase Configuration:', 'blue');
  
  const firebaseConfigs = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID'
  ];
  
  let allValid = true;
  
  firebaseConfigs.forEach(key => {
    if (!envVars[key] || envVars[key].includes('YOUR_')) {
      log(`❌ ${key}: Not configured`, 'red');
      allValid = false;
    } else {
      log(`✅ ${key}: Configured`, 'green');
    }
  });
  
  return allValid;
}

function generateConfigSummary(envVars) {
  log('\n📊 Configuration Summary:', 'magenta');
  
  const companyWalletConfigured = envVars.EXPO_PUBLIC_COMPANY_WALLET_ADDRESS && 
    !envVars.EXPO_PUBLIC_COMPANY_WALLET_ADDRESS.includes('YOUR_');
  
  const heliusConfigured = envVars.EXPO_PUBLIC_HELIUS_API_KEY && 
    !envVars.EXPO_PUBLIC_HELIUS_API_KEY.includes('YOUR_');
  
  const firebaseConfigured = envVars.EXPO_PUBLIC_FIREBASE_PROJECT_ID && 
    !envVars.EXPO_PUBLIC_FIREBASE_PROJECT_ID.includes('YOUR_');
  
  log(`Company Wallet: ${companyWalletConfigured ? '✅ Configured' : '❌ Not Configured'}`, 
      companyWalletConfigured ? 'green' : 'red');
  log(`Helius RPC: ${heliusConfigured ? '✅ Configured' : '❌ Not Configured'}`, 
      heliusConfigured ? 'green' : 'red');
  log(`Firebase: ${firebaseConfigured ? '✅ Configured' : '❌ Not Configured'}`, 
      firebaseConfigured ? 'green' : 'red');
  
  const isProductionReady = companyWalletConfigured && heliusConfigured && firebaseConfigured;
  
  log(`\n🚀 Production Ready: ${isProductionReady ? '✅ YES' : '❌ NO'}`, 
      isProductionReady ? 'green' : 'red');
  
  if (!isProductionReady) {
    log('\n⚠️  Missing required configurations for production deployment', 'yellow');
  }
  
  return isProductionReady;
}

function main() {
  log('🔍 WeSplit Environment Configuration Validator', 'bright');
  log('=' .repeat(50), 'cyan');
  
  // Check if .env file exists
  if (!validateEnvFile()) {
    process.exit(1);
  }
  
  // Load environment variables
  const envVars = loadEnvFile();
  
  // Validate configurations
  const companyWalletValid = validateCompanyWalletConfig(envVars);
  validateFeeConfiguration(envVars);
  const solanaValid = validateSolanaConfig(envVars);
  const firebaseValid = validateFirebaseConfig(envVars);
  
  // Generate summary
  const isProductionReady = generateConfigSummary(envVars);
  
  log('\n' + '=' .repeat(50), 'cyan');
  
  if (isProductionReady) {
    log('🎉 All configurations are valid! Your app is ready for production.', 'green');
    process.exit(0);
  } else {
    log('❌ Some configurations are missing. Please fix the issues above.', 'red');
    process.exit(1);
  }
}

// Run the validator
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvFile,
  loadEnvFile,
  validateCompanyWalletConfig,
  validateFeeConfiguration,
  validateSolanaConfig,
  validateFirebaseConfig,
  generateConfigSummary
};
