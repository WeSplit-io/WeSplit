/**
 * Integration test to verify Firebase Secrets work with TransactionSigningService
 * This simulates what happens when a Firebase Function is called
 */

const { execSync } = require('child_process');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');

// Get secrets from Firebase CLI
function getSecrets() {
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
    console.error('❌ Failed to fetch secrets:', error.message);
    return null;
  }
}

// Simulate TransactionSigningService initialization
async function testTransactionSigningService() {
  console.log('🧪 Testing TransactionSigningService Initialization...\n');
  
  const secrets = getSecrets();
  if (!secrets) {
    return false;
  }
  
  const companyWalletAddress = secrets.address?.trim();
  const companyWalletSecretKey = secrets.secretKey?.trim();
  
  // Simulate the initialization process from transactionSigningService.js
  try {
    console.log('1️⃣  Parsing secret key...');
    const secretKeyArray = JSON.parse(companyWalletSecretKey);
    
    if (!Array.isArray(secretKeyArray) || secretKeyArray.length !== 64) {
      console.log(`   ❌ Invalid format: Expected array of 64 numbers, got ${Array.isArray(secretKeyArray) ? secretKeyArray.length : typeof secretKeyArray}`);
      return false;
    }
    console.log(`   ✅ Secret key parsed: Array of ${secretKeyArray.length} numbers`);
    
    console.log('2️⃣  Creating keypair...');
    const keypair = Keypair.fromSecretKey(Buffer.from(secretKeyArray));
    const derivedAddress = keypair.publicKey.toBase58();
    console.log(`   ✅ Keypair created: ${derivedAddress.substring(0, 8)}...${derivedAddress.substring(derivedAddress.length - 8)}`);
    
    console.log('3️⃣  Verifying address match...');
    if (derivedAddress !== companyWalletAddress) {
      console.log(`   ❌ Address mismatch!`);
      console.log(`      Expected: ${companyWalletAddress}`);
      console.log(`      Got:      ${derivedAddress}`);
      return false;
    }
    console.log(`   ✅ Addresses match!`);
    
    console.log('4️⃣  Testing connection (optional - requires RPC endpoint)...');
    // Try to get balance if RPC is available
    const rpcUrl = process.env.HELIUS_RPC_URL || process.env.EXPO_PUBLIC_HELIUS_RPC_URL;
    if (rpcUrl) {
      try {
        const connection = new Connection(rpcUrl, 'confirmed');
        const balance = await connection.getBalance(keypair.publicKey);
        const solBalance = balance / 1e9;
        console.log(`   ✅ Balance check successful: ${solBalance.toFixed(4)} SOL`);
      } catch (error) {
        console.log(`   ⚠️  Could not check balance (RPC may be unavailable): ${error.message}`);
      }
    } else {
      console.log(`   ⚠️  Skipping balance check (no RPC URL configured)`);
    }
    
    console.log('\n✅ TransactionSigningService initialization test PASSED!');
    console.log('✅ Secrets are properly configured and accessible');
    console.log('✅ Keypair can be created and used for signing');
    
    return true;
  } catch (error) {
    console.error(`\n❌ Initialization failed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// Main test
async function runTest() {
  console.log('='.repeat(60));
  console.log('🔐 Firebase Secrets Integration Test');
  console.log('='.repeat(60));
  console.log();
  
  const result = await testTransactionSigningService();
  
  console.log();
  console.log('='.repeat(60));
  if (result) {
    console.log('✅ ALL TESTS PASSED');
    console.log('✅ Your Firebase Secrets are correctly configured');
    console.log('✅ TransactionSigningService can initialize successfully');
    process.exit(0);
  } else {
    console.log('❌ TESTS FAILED');
    console.log('❌ Please check your Firebase Secrets configuration');
    process.exit(1);
  }
}

runTest().catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});

