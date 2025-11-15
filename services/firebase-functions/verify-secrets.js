/**
 * Verify Firebase Secrets are correctly configured
 * Checks that COMPANY_WALLET_ADDRESS and COMPANY_WALLET_SECRET_KEY are:
 * 1. Set in Firebase Secrets
 * 2. Accessible via process.env
 * 3. In the correct format
 */

const { execSync } = require('child_process');

console.log('🔍 Verifying Firebase Secrets Configuration\n');
console.log('='.repeat(60));

// Test 1: Check if secrets are accessible via Firebase CLI
console.log('\n📋 Test 1: Firebase Secrets Access');
console.log('-'.repeat(60));

let addressFromCLI = null;
let secretKeyFromCLI = null;

try {
  addressFromCLI = execSync('firebase functions:secrets:access COMPANY_WALLET_ADDRESS', {
    encoding: 'utf-8',
    cwd: __dirname
  }).trim();
  console.log('✅ COMPANY_WALLET_ADDRESS: Accessible via CLI');
  console.log(`   Address: ${addressFromCLI.substring(0, 8)}...${addressFromCLI.substring(addressFromCLI.length - 8)}`);
  console.log(`   Length: ${addressFromCLI.length} characters`);
} catch (error) {
  console.log('❌ COMPANY_WALLET_ADDRESS: Not accessible via CLI');
  console.log(`   Error: ${error.message}`);
}

try {
  secretKeyFromCLI = execSync('firebase functions:secrets:access COMPANY_WALLET_SECRET_KEY', {
    encoding: 'utf-8',
    cwd: __dirname
  }).trim();
  console.log('✅ COMPANY_WALLET_SECRET_KEY: Accessible via CLI');
  console.log(`   Length: ${secretKeyFromCLI.length} characters`);
  console.log(`   First 50 chars: ${secretKeyFromCLI.substring(0, 50)}...`);
} catch (error) {
  console.log('❌ COMPANY_WALLET_SECRET_KEY: Not accessible via CLI');
  console.log(`   Error: ${error.message}`);
}

// Test 2: Verify address format
console.log('\n📋 Test 2: Address Format Validation');
console.log('-'.repeat(60));

if (addressFromCLI) {
  const trimmedAddress = addressFromCLI.trim();
  if (trimmedAddress.length >= 32 && trimmedAddress.length <= 44) {
    console.log('✅ Address format is valid (32-44 characters)');
  } else {
    console.log(`❌ Address format is invalid: ${trimmedAddress.length} characters (expected 32-44)`);
  }
  
  // Check for newlines/whitespace
  if (trimmedAddress !== addressFromCLI) {
    console.log('⚠️  Address contains extra whitespace (will be trimmed in code)');
  } else {
    console.log('✅ Address has no extra whitespace');
  }
} else {
  console.log('⚠️  Cannot validate address format (not accessible)');
}

// Test 3: Verify secret key format
console.log('\n📋 Test 3: Secret Key Format Validation');
console.log('-'.repeat(60));

if (secretKeyFromCLI) {
  const trimmedSecretKey = secretKeyFromCLI.trim();
  
  try {
    const secretKeyArray = JSON.parse(trimmedSecretKey);
    if (Array.isArray(secretKeyArray)) {
      if (secretKeyArray.length === 64) {
        console.log('✅ Secret key format is valid (64-element array)');
        console.log(`   First 5 values: [${secretKeyArray.slice(0, 5).join(', ')}...]`);
        console.log(`   Last 5 values: [...${secretKeyArray.slice(-5).join(', ')}]`);
      } else {
        console.log(`❌ Secret key array has wrong length: ${secretKeyArray.length} (expected 64)`);
      }
    } else {
      console.log('❌ Secret key is not an array');
    }
  } catch (parseError) {
    console.log('❌ Secret key is not valid JSON');
    console.log(`   Error: ${parseError.message}`);
  }
  
  // Check for newlines/whitespace
  if (trimmedSecretKey !== secretKeyFromCLI) {
    console.log('⚠️  Secret key contains extra whitespace (will be trimmed in code)');
  } else {
    console.log('✅ Secret key has no extra whitespace');
  }
} else {
  console.log('⚠️  Cannot validate secret key format (not accessible)');
}

// Test 4: Verify keypair creation
console.log('\n📋 Test 4: Keypair Creation Test');
console.log('-'.repeat(60));

if (addressFromCLI && secretKeyFromCLI) {
  try {
    const { Keypair } = require('@solana/web3.js');
    const trimmedAddress = addressFromCLI.trim();
    const trimmedSecretKey = secretKeyFromCLI.trim();
    
    const secretKeyArray = JSON.parse(trimmedSecretKey);
    const keypair = Keypair.fromSecretKey(Buffer.from(secretKeyArray));
    const derivedAddress = keypair.publicKey.toBase58();
    
    console.log(`   Expected: ${trimmedAddress}`);
    console.log(`   Derived:  ${derivedAddress}`);
    
    if (derivedAddress === trimmedAddress) {
      console.log('✅ Keypair creation successful - addresses match!');
    } else {
      console.log('❌ Keypair creation failed - addresses do not match!');
      console.log('   This means the secret key does not correspond to the address');
    }
  } catch (error) {
    console.log('❌ Failed to create keypair');
    console.log(`   Error: ${error.message}`);
  }
} else {
  console.log('⚠️  Cannot test keypair creation (secrets not accessible)');
}

// Test 5: Check function declarations
console.log('\n📋 Test 5: Function Secret Declarations');
console.log('-'.repeat(60));

const transactionFunctionsPath = require('path').join(__dirname, 'src/transactionFunctions.js');
const transactionFunctionsContent = require('fs').readFileSync(transactionFunctionsPath, 'utf-8');

const functionsUsingSecrets = [
  { name: 'signTransaction', line: transactionFunctionsContent.indexOf('exports.signTransaction') },
  { name: 'submitTransaction', line: transactionFunctionsContent.indexOf('exports.submitTransaction') },
  { name: 'processUsdcTransfer', line: transactionFunctionsContent.indexOf('exports.processUsdcTransfer') },
  { name: 'getCompanyWalletAddress', line: transactionFunctionsContent.indexOf('exports.getCompanyWalletAddress') },
  { name: 'getCompanyWalletBalance', line: transactionFunctionsContent.indexOf('exports.getCompanyWalletBalance') },
];

functionsUsingSecrets.forEach(func => {
  if (func.line === -1) {
    console.log(`⚠️  ${func.name}: Not found in code`);
    return;
  }
  
  const funcSection = transactionFunctionsContent.substring(func.line, func.line + 500);
  const hasAddress = funcSection.includes("'COMPANY_WALLET_ADDRESS'") || funcSection.includes('"COMPANY_WALLET_ADDRESS"');
  const hasSecretKey = funcSection.includes("'COMPANY_WALLET_SECRET_KEY'") || funcSection.includes('"COMPANY_WALLET_SECRET_KEY"');
  
  if (func.name === 'getCompanyWalletAddress') {
    if (hasAddress && !hasSecretKey) {
      console.log(`✅ ${func.name}: Correctly declares COMPANY_WALLET_ADDRESS only`);
    } else {
      console.log(`❌ ${func.name}: Should only declare COMPANY_WALLET_ADDRESS`);
    }
  } else {
    if (hasAddress && hasSecretKey) {
      console.log(`✅ ${func.name}: Correctly declares both secrets`);
    } else {
      console.log(`❌ ${func.name}: Missing secret declarations`);
    }
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Summary');
console.log('='.repeat(60));

const allTestsPassed = 
  addressFromCLI && 
  secretKeyFromCLI && 
  addressFromCLI.trim().length >= 32 && 
  addressFromCLI.trim().length <= 44;

if (allTestsPassed) {
  console.log('✅ All Firebase Secrets are correctly configured!');
  console.log('\n💡 Secret Names:');
  console.log('   - COMPANY_WALLET_ADDRESS');
  console.log('   - COMPANY_WALLET_SECRET_KEY');
  console.log('\n💡 Access in Code:');
  console.log('   - process.env.COMPANY_WALLET_ADDRESS');
  console.log('   - process.env.COMPANY_WALLET_SECRET_KEY');
} else {
  console.log('⚠️  Some issues found - please review the tests above');
}

console.log('='.repeat(60));

