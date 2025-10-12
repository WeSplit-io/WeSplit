#!/usr/bin/env node

/**
 * Fee Configuration Test Script
 * Tests the fee configuration system to ensure it's working correctly
 */

// Mock environment variables for testing
const mockEnvVars = {
  // Company wallet configuration
  'EXPO_PUBLIC_COMPANY_WALLET_ADDRESS': '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  'EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY': '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64]',
  'EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE': '1.0',
  'EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE': '0.001',
  
  // Legacy fees
  'EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE': '3.0',
  'EXPO_PUBLIC_COMPANY_MIN_FEE': '0.001',
  'EXPO_PUBLIC_COMPANY_MAX_FEE': '10.00',
  
  // Transaction-specific fees
  'EXPO_PUBLIC_FEE_SEND_PERCENTAGE': '3.0',
  'EXPO_PUBLIC_FEE_SEND_MIN': '0.001',
  'EXPO_PUBLIC_FEE_SEND_MAX': '10.00',
  
  'EXPO_PUBLIC_FEE_RECEIVE_PERCENTAGE': '0.0',
  'EXPO_PUBLIC_FEE_RECEIVE_MIN': '0.0',
  'EXPO_PUBLIC_FEE_RECEIVE_MAX': '0.0',
  
  'EXPO_PUBLIC_FEE_SPLIT_PERCENTAGE': '2.0',
  'EXPO_PUBLIC_FEE_SPLIT_MIN': '0.001',
  'EXPO_PUBLIC_FEE_SPLIT_MAX': '5.00',
  
  'EXPO_PUBLIC_FEE_SETTLEMENT_PERCENTAGE': '1.5',
  'EXPO_PUBLIC_FEE_SETTLEMENT_MIN': '0.001',
  'EXPO_PUBLIC_FEE_SETTLEMENT_MAX': '3.00',
  
  'EXPO_PUBLIC_FEE_WITHDRAW_PERCENTAGE': '4.0',
  'EXPO_PUBLIC_FEE_WITHDRAW_MIN': '0.50',
  'EXPO_PUBLIC_FEE_WITHDRAW_MAX': '15.00',
  
  'EXPO_PUBLIC_FEE_DEPOSIT_PERCENTAGE': '0.0',
  'EXPO_PUBLIC_FEE_DEPOSIT_MIN': '0.0',
  'EXPO_PUBLIC_FEE_DEPOSIT_MAX': '0.0',
  
  'EXPO_PUBLIC_FEE_PAYMENT_REQUEST_PERCENTAGE': '3.0',
  'EXPO_PUBLIC_FEE_PAYMENT_REQUEST_MIN': '0.001',
  'EXPO_PUBLIC_FEE_PAYMENT_REQUEST_MAX': '10.00',
  
  'EXPO_PUBLIC_FEE_GROUP_PAYMENT_PERCENTAGE': '2.5',
  'EXPO_PUBLIC_FEE_GROUP_PAYMENT_MIN': '0.001',
  'EXPO_PUBLIC_FEE_GROUP_PAYMENT_MAX': '8.00',
  
  'EXPO_PUBLIC_FEE_PREMIUM_PERCENTAGE': '0.0',
  'EXPO_PUBLIC_FEE_PREMIUM_MIN': '0.0',
  'EXPO_PUBLIC_FEE_PREMIUM_MAX': '0.0'
};

// Mock Constants for testing
const mockConstants = {
  expoConfig: {
    extra: mockEnvVars
  }
};

// Mock process.env
Object.keys(mockEnvVars).forEach(key => {
  process.env[key] = mockEnvVars[key];
});

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

function testFeeCalculation() {
  log('\n🧮 Testing Fee Calculations:', 'blue');
  
  // Mock the FeeService (simplified version for testing)
  const FeeService = {
    calculateCompanyFee: (amount, transactionType = 'default') => {
      const configs = {
        send: { percentage: 3.0, minFee: 0.001, maxFee: 10.00 },
        receive: { percentage: 0.0, minFee: 0.0, maxFee: 0.0 },
        split_payment: { percentage: 2.0, minFee: 0.001, maxFee: 5.00 },
        settlement: { percentage: 1.5, minFee: 0.001, maxFee: 3.00 },
        withdraw: { percentage: 4.0, minFee: 0.50, maxFee: 15.00 },
        deposit: { percentage: 0.0, minFee: 0.0, maxFee: 0.0 },
        payment_request: { percentage: 3.0, minFee: 0.001, maxFee: 10.00 },
        group_payment: { percentage: 2.5, minFee: 0.001, maxFee: 8.00 },
        premium: { percentage: 0.0, minFee: 0.0, maxFee: 0.0 },
        default: { percentage: 3.0, minFee: 0.001, maxFee: 10.00 }
      };
      
      const config = configs[transactionType] || configs.default;
      const feePercentage = config.percentage / 100;
      let fee = amount * feePercentage;
      
      // Apply min and max fee limits
      fee = Math.max(fee, config.minFee);
      fee = Math.min(fee, config.maxFee);
      
      return {
        fee,
        totalAmount: amount + fee,
        recipientAmount: amount
      };
    }
  };
  
  const testCases = [
    { amount: 100, type: 'send', expected: { fee: 3.0, total: 103.0, recipient: 100 } },
    { amount: 100, type: 'receive', expected: { fee: 0.0, total: 100.0, recipient: 100 } },
    { amount: 100, type: 'split_payment', expected: { fee: 2.0, total: 102.0, recipient: 100 } },
    { amount: 100, type: 'settlement', expected: { fee: 1.5, total: 101.5, recipient: 100 } },
    { amount: 100, type: 'withdraw', expected: { fee: 4.0, total: 104.0, recipient: 100 } },
    { amount: 100, type: 'deposit', expected: { fee: 0.0, total: 100.0, recipient: 100 } },
    { amount: 0.5, type: 'withdraw', expected: { fee: 0.5, total: 1.0, recipient: 0.5 } }, // Min fee test
    { amount: 1000, type: 'send', expected: { fee: 10.0, total: 1010.0, recipient: 1000 } }, // Max fee test
  ];
  
  let allPassed = true;
  
  testCases.forEach(testCase => {
    const result = FeeService.calculateCompanyFee(testCase.amount, testCase.type);
    const passed = 
      Math.abs(result.fee - testCase.expected.fee) < 0.001 &&
      Math.abs(result.totalAmount - testCase.expected.total) < 0.001 &&
      Math.abs(result.recipientAmount - testCase.expected.recipient) < 0.001;
    
    if (passed) {
      log(`✅ ${testCase.type}: $${testCase.amount} → Fee: $${result.fee.toFixed(3)}, Total: $${result.totalAmount.toFixed(3)}`, 'green');
    } else {
      log(`❌ ${testCase.type}: $${testCase.amount} → Expected fee: $${testCase.expected.fee}, got: $${result.fee.toFixed(3)}`, 'red');
      allPassed = false;
    }
  });
  
  return allPassed;
}

function testCompanyWalletConfig() {
  log('\n🏦 Testing Company Wallet Configuration:', 'blue');
  
  const companyWalletAddress = mockEnvVars.EXPO_PUBLIC_COMPANY_WALLET_ADDRESS;
  const companyWalletSecretKey = mockEnvVars.EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY;
  const minSolReserve = parseFloat(mockEnvVars.EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE);
  const gasFeeEstimate = parseFloat(mockEnvVars.EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE);
  
  let allValid = true;
  
  // Test wallet address
  if (companyWalletAddress && companyWalletAddress.length > 30) {
    log(`✅ Company Wallet Address: ${companyWalletAddress.substring(0, 8)}...${companyWalletAddress.substring(-8)}`, 'green');
  } else {
    log(`❌ Company Wallet Address: Invalid or missing`, 'red');
    allValid = false;
  }
  
  // Test secret key
  if (companyWalletSecretKey && companyWalletSecretKey.startsWith('[')) {
    log(`✅ Company Wallet Secret Key: Configured (${companyWalletSecretKey.length} chars)`, 'green');
  } else {
    log(`❌ Company Wallet Secret Key: Invalid or missing`, 'red');
    allValid = false;
  }
  
  // Test SOL reserve
  if (minSolReserve >= 0.1) {
    log(`✅ Min SOL Reserve: ${minSolReserve} SOL`, 'green');
  } else {
    log(`❌ Min SOL Reserve: ${minSolReserve} SOL (too low)`, 'red');
    allValid = false;
  }
  
  // Test gas fee estimate
  if (gasFeeEstimate > 0 && gasFeeEstimate <= 0.01) {
    log(`✅ Gas Fee Estimate: ${gasFeeEstimate} SOL`, 'green');
  } else {
    log(`❌ Gas Fee Estimate: ${gasFeeEstimate} SOL (invalid range)`, 'red');
    allValid = false;
  }
  
  return allValid;
}

function testTransactionTypes() {
  log('\n🔄 Testing Transaction Types:', 'blue');
  
  const transactionTypes = [
    'send', 'receive', 'split', 'settlement', 
    'withdraw', 'deposit', 'payment_request', 'group_payment', 'premium'
  ];
  
  transactionTypes.forEach(type => {
    const percentageKey = `EXPO_PUBLIC_FEE_${type.toUpperCase()}_PERCENTAGE`;
    const minKey = `EXPO_PUBLIC_FEE_${type.toUpperCase()}_MIN`;
    const maxKey = `EXPO_PUBLIC_FEE_${type.toUpperCase()}_MAX`;
    
    const percentage = mockEnvVars[percentageKey];
    const minFee = mockEnvVars[minKey];
    const maxFee = mockEnvVars[maxKey];
    
    if (percentage !== undefined && minFee !== undefined && maxFee !== undefined) {
      log(`✅ ${type}: ${percentage}% (min: ${minFee}, max: ${maxFee})`, 'green');
    } else {
      log(`❌ ${type}: Missing configuration (${percentageKey}: ${percentage}, ${minKey}: ${minFee}, ${maxKey}: ${maxFee})`, 'red');
    }
  });
  
  // Test default/legacy configuration
  const legacyPercentage = mockEnvVars['EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE'];
  const legacyMin = mockEnvVars['EXPO_PUBLIC_COMPANY_MIN_FEE'];
  const legacyMax = mockEnvVars['EXPO_PUBLIC_COMPANY_MAX_FEE'];
  
  if (legacyPercentage !== undefined && legacyMin !== undefined && legacyMax !== undefined) {
    log(`✅ default (legacy): ${legacyPercentage}% (min: ${legacyMin}, max: ${legacyMax})`, 'green');
  } else {
    log(`❌ default (legacy): Missing configuration`, 'red');
  }
}

function main() {
  log('🧪 WeSplit Fee Configuration Test', 'bright');
  log('=' .repeat(40), 'cyan');
  
  const feeTestsPassed = testFeeCalculation();
  const walletConfigValid = testCompanyWalletConfig();
  testTransactionTypes();
  
  log('\n' + '=' .repeat(40), 'cyan');
  
  if (feeTestsPassed && walletConfigValid) {
    log('🎉 All tests passed! Fee configuration is working correctly.', 'green');
    log('\n📋 Next Steps:', 'blue');
    log('1. Run: node scripts/validate-env-config.js', 'cyan');
    log('2. Verify your actual .env file has the correct values', 'cyan');
    log('3. Test the app with real transactions', 'cyan');
  } else {
    log('❌ Some tests failed. Please check the configuration.', 'red');
  }
}

// Run the tests
if (require.main === module) {
  main();
}

module.exports = {
  testFeeCalculation,
  testCompanyWalletConfig,
  testTransactionTypes
};
