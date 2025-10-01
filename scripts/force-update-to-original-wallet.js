/**
 * Force Update to Original Wallet
 * This script directly updates the user's wallet address to the original one
 * WARNING: Only use this if you have the original wallet credentials
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function forceUpdateToOriginalWallet() {
  console.log('⚠️  FORCE UPDATE TO ORIGINAL WALLET');
  console.log('=====================================');
  console.log('WARNING: This will change your wallet address!');
  console.log('Only proceed if you have the original wallet credentials.\n');
  
  try {
    // Information from your logs
    const userId = 'CSidsEhjn6QgtUcskHo8FxfRxFL2';
    const originalAddress = '8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD';
    const currentAddress = '8p1QbNt1WZf8o5uBGEjq5EPV5b28dEjk2NS8Gfs3wq2e';
    
    console.log('📋 Current Situation:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Original Wallet: ${originalAddress}`);
    console.log(`   Current Wallet: ${currentAddress}`);
    console.log('');
    
    console.log('🔍 Before proceeding, please check:');
    console.log(`   1. Original wallet: https://explorer.solana.com/address/${originalAddress}`);
    console.log(`   2. Current wallet: https://explorer.solana.com/address/${currentAddress}`);
    console.log('   3. Which wallet has your funds?');
    console.log('   4. Do you have the original wallet\'s seed phrase or private key?');
    console.log('');
    
    const hasOriginalCredentials = await askQuestion('Do you have the original wallet credentials (seed phrase/private key)? (y/n): ');
    
    if (hasOriginalCredentials.toLowerCase() !== 'y') {
      console.log('❌ Cannot proceed without original wallet credentials.');
      console.log('Please recover your original wallet credentials first.');
      return;
    }
    
    const confirmUpdate = await askQuestion('Are you sure you want to force update to the original wallet? (y/n): ');
    
    if (confirmUpdate.toLowerCase() !== 'y') {
      console.log('Update cancelled.');
      return;
    }
    
    console.log('\n🔄 Creating force update script...');
    
    // Create the force update script
    const forceUpdateScript = `
// Force Update to Original Wallet Script
// This script will update the user's wallet address to the original one

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

// Firebase configuration (you'll need to add your config)
const firebaseConfig = {
  // Add your Firebase config here
};

async function forceUpdateWallet() {
  try {
    console.log('🔄 Starting force update to original wallet...');
    
    const userId = '${userId}';
    const originalAddress = '${originalAddress}';
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Update the user document with original wallet address
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      wallet_address: originalAddress,
      wallet_public_key: originalAddress,
      wallet_status: 'healthy',
      wallet_last_fixed_at: new Date().toISOString(),
      wallet_fix_attempts: 0
    });
    
    console.log('✅ Successfully updated user document with original wallet address');
    console.log('   Original wallet address:', originalAddress);
    
    console.log('\\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('   1. You need to store the correct private key for the original wallet');
    console.log('   2. Use the "Import Wallet" feature in the app');
    console.log('   3. Enter your original 24-word seed phrase');
    console.log('   4. This will restore access to your original wallet');
    
    console.log('\\n🔍 Verification:');
    console.log('   1. Log out and log back in to the app');
    console.log('   2. Check if the wallet address is now:', originalAddress);
    console.log('   3. Verify you can access your funds');
    
  } catch (error) {
    console.error('❌ Force update failed:', error);
    console.log('\\n🛠️ Manual Update Instructions:');
    console.log('   1. Go to Firebase Console');
    console.log('   2. Navigate to Firestore Database');
    console.log('   3. Find the user document with ID:', userId);
    console.log('   4. Update wallet_address to:', originalAddress);
    console.log('   5. Update wallet_public_key to:', originalAddress);
  }
}

forceUpdateWallet();
`;
    
    // Write the force update script
    require('fs').writeFileSync('force-update-wallet.js', forceUpdateScript);
    
    console.log('📝 Force update script created: force-update-wallet.js');
    console.log('\n🚀 To run the force update:');
    console.log('   1. Add your Firebase configuration to the script');
    console.log('   2. Run: node force-update-wallet.js');
    
    console.log('\n🛠️ Alternative: Manual Update via Firebase Console');
    console.log('   1. Go to https://console.firebase.google.com/');
    console.log('   2. Select your WeSplit project');
    console.log('   3. Go to Firestore Database');
    console.log('   4. Find the user document with ID: ' + userId);
    console.log('   5. Update these fields:');
    console.log('      - wallet_address: ' + originalAddress);
    console.log('      - wallet_public_key: ' + originalAddress);
    console.log('      - wallet_status: "healthy"');
    console.log('      - wallet_last_fixed_at: current timestamp');
    
    console.log('\n🎯 After the update:');
    console.log('   1. Log out of the app completely');
    console.log('   2. Log back in');
    console.log('   3. Go to Settings → Wallet Management');
    console.log('   4. Use "Import Wallet" with your original seed phrase');
    console.log('   5. This should restore access to your original wallet');
    
    console.log('\n⚠️  Final Warning:');
    console.log('   Make sure you have the original wallet credentials before proceeding.');
    console.log('   Without them, you will lose access to your funds permanently.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

forceUpdateToOriginalWallet();
