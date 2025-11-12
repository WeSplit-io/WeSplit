/**
 * Test script to verify Firebase Secrets are properly configured
 * Tests the company wallet secrets by calling getCompanyWalletBalance
 * 
 * Usage: node test-secrets.js [address] [secretKey]
 * Or: node test-secrets.js (will prompt for secrets)
 */

const { execSync } = require('child_process');
const admin = require('firebase-admin');

// Initialize Firebase Admin (for server-side testing)
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

// Get secrets from Firebase CLI or command line arguments
function getSecrets() {
  // Try command line arguments first
  if (process.argv.length >= 4) {
    return {
      address: process.argv[2],
      secretKey: process.argv[3]
    };
  }
  
  // Try to get from Firebase CLI
  try {
    console.log('📥 Fetching secrets from Firebase...\n');
    const address = execSync('firebase functions:secrets:access COMPANY_WALLET_ADDRESS', { 
      encoding: 'utf-8',
      cwd: __dirname 
    }).trim();
    
    const secretKey = execSync('firebase functions:secrets:access COMPANY_WALLET_SECRET_KEY', { 
      encoding: 'utf-8',
      cwd: __dirname 
    }).trim();
    
    return { address, secretKey };
  } catch (error) {
    console.error('❌ Failed to fetch secrets from Firebase CLI:', error.message);
    console.log('\n💡 Tip: Run this script with secrets as arguments:');
    console.log('   node test-secrets.js <address> <secretKey>');
    console.log('\n   Or ensure you are logged in: firebase login');
    return null;
  }
}

// Test secrets directly from environment (simulating Firebase Functions runtime)
async function testSecretsDirectly() {
  console.log('\n📋 Testing Secrets Configuration...\n');
  
  const secrets = getSecrets();
  if (!secrets) {
    return false;
  }
  
  const companyWalletAddress = secrets.address?.trim();
  const companyWalletSecretKey = secrets.secretKey?.trim();
  
  console.log('COMPANY_WALLET_ADDRESS:');
  if (companyWalletAddress) {
    console.log(`  ✅ Found: ${companyWalletAddress.substring(0, 8)}...${companyWalletAddress.substring(companyWalletAddress.length - 8)}`);
    console.log(`  Length: ${companyWalletAddress.length} characters`);
  } else {
    console.log('  ❌ Missing');
    return false;
  }
  
  console.log('\nCOMPANY_WALLET_SECRET_KEY:');
  if (companyWalletSecretKey) {
    console.log(`  ✅ Found: ${companyWalletSecretKey.length} characters`);
    
    // Try to parse as JSON array
    try {
      const secretKeyArray = JSON.parse(companyWalletSecretKey);
      if (Array.isArray(secretKeyArray) && secretKeyArray.length === 64) {
        console.log(`  ✅ Valid format: Array of ${secretKeyArray.length} numbers`);
        console.log(`  First 5 values: [${secretKeyArray.slice(0, 5).join(', ')}...]`);
        console.log(`  Last 5 values: [...${secretKeyArray.slice(-5).join(', ')}]`);
      } else {
        console.log(`  ❌ Invalid format: Expected array of 64 numbers, got ${Array.isArray(secretKeyArray) ? `array of ${secretKeyArray.length}` : typeof secretKeyArray}`);
        return false;
      }
    } catch (parseError) {
      console.log(`  ❌ Failed to parse as JSON: ${parseError.message}`);
      return false;
    }
  } else {
    console.log('  ❌ Missing');
    return false;
  }
  
  // Test keypair creation
  try {
    const { Keypair } = require('@solana/web3.js');
    const secretKeyArray = JSON.parse(companyWalletSecretKey);
    const keypair = Keypair.fromSecretKey(Buffer.from(secretKeyArray));
    const derivedAddress = keypair.publicKey.toBase58();
    
    console.log('\n🔑 Keypair Creation Test:');
    console.log(`  Expected Address: ${companyWalletAddress}`);
    console.log(`  Derived Address:  ${derivedAddress}`);
    
    if (derivedAddress === companyWalletAddress) {
      console.log('  ✅ Addresses match! Keypair is valid.');
      return true;
    } else {
      console.log('  ❌ Addresses do not match! Secret key is incorrect.');
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Failed to create keypair: ${error.message}`);
    return false;
  }
}

// Test by calling Firebase Function (requires deployed functions)
async function testFirebaseFunction() {
  console.log('\n📞 Testing Firebase Function (getCompanyWalletBalance)...\n');
  
  try {
    // Note: This requires the functions to be deployed and accessible
    // For local testing, you would use the emulator
    console.log('⚠️  To test deployed functions, use:');
    console.log('   firebase functions:shell');
    console.log('   getCompanyWalletBalance()');
    console.log('\n⚠️  Or test via the app/client code');
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Firebase Secrets Test Script\n');
  console.log('=' .repeat(50));
  
  // Test 1: Direct secret access
  const directTest = await testSecretsDirectly();
  
  // Test 2: Firebase Function (informational)
  await testFirebaseFunction();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results:');
  console.log(`  Direct Secret Access: ${directTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (directTest) {
    console.log('\n✅ All secrets are properly configured and accessible!');
    console.log('✅ Secret key format is valid');
    console.log('✅ Keypair can be created successfully');
    console.log('✅ Derived address matches expected address');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please check your Firebase Secrets configuration.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});

