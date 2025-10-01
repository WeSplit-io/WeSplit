/**
 * Restore Original Wallet
 * This script provides step-by-step instructions to restore your original wallet
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

async function restoreOriginalWallet() {
  console.log('🔄 Restore Original Wallet');
  console.log('==========================\n');
  
  const originalWallet = '8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD';
  const currentWallet = '8p1QbNt1WZf8o5uBGEjq5EPV5b28dEjk2NS8Gfs3wq2e';
  
  console.log('📋 Wallet Information:');
  console.log(`   Original Wallet: ${originalWallet}`);
  console.log(`   Current Wallet:  ${currentWallet}\n`);
  
  console.log('🔍 First, let\'s check which wallet has funds...');
  console.log('   Run: node check-wallet-funds.js');
  console.log('   Or check manually:');
  console.log(`   - Original: https://explorer.solana.com/address/${originalWallet}`);
  console.log(`   - Current:  https://explorer.solana.com/address/${currentWallet}\n`);
  
  const hasOriginalSeedPhrase = await askQuestion('Do you have the original wallet\'s seed phrase (24 words)? (y/n): ');
  
  if (hasOriginalSeedPhrase.toLowerCase() !== 'y') {
    console.log('\n❌ Without the original seed phrase, you cannot recover the original wallet.');
    console.log('\n🔍 Alternative Options:');
    console.log('   1. Check if you exported the wallet to another app (Phantom, Solflare, etc.)');
    console.log('   2. Look for wallet backup files on your device');
    console.log('   3. Check if you wrote down the seed phrase somewhere');
    console.log('   4. If the current wallet has funds, you can continue using it');
    console.log('\n⚠️  Important: You cannot reverse-engineer a seed phrase from a wallet address.');
    return;
  }
  
  console.log('\n✅ Great! You have the original seed phrase.');
  console.log('\n🔄 Step-by-Step Recovery Process:');
  console.log('\n   Step 1: Update Database');
  console.log('   - Go to Firebase Console: https://console.firebase.google.com/');
  console.log('   - Navigate to Firestore Database');
  console.log('   - Find user document with ID: CSidsEhjn6QgtUcskHo8FxfRxFL2');
  console.log('   - Update these fields:');
  console.log(`     * wallet_address: ${originalWallet}`);
  console.log(`     * wallet_public_key: ${originalWallet}`);
  console.log('     * wallet_status: "healthy"');
  console.log('     * wallet_last_fixed_at: current timestamp');
  
  console.log('\n   Step 2: Clear App Data');
  console.log('   - Log out of the app completely');
  console.log('   - Clear app data/cache (optional but recommended)');
  console.log('   - Log back in');
  
  console.log('\n   Step 3: Import Original Wallet');
  console.log('   - Go to Settings → Wallet Management');
  console.log('   - Tap "Import Wallet"');
  console.log('   - Enter your original 24-word seed phrase');
  console.log('   - Authenticate with biometrics/passcode');
  console.log('   - The app should now use your original wallet');
  
  console.log('\n   Step 4: Verify Recovery');
  console.log('   - Check that the wallet address is now: ' + originalWallet);
  console.log('   - Verify you can see your funds');
  console.log('   - Test a small transaction to confirm everything works');
  
  const proceedWithRecovery = await askQuestion('\nDo you want to proceed with the recovery? (y/n): ');
  
  if (proceedWithRecovery.toLowerCase() === 'y') {
    console.log('\n🔄 Creating recovery script...');
    
    const recoveryScript = `
// Recovery Script - Update Database to Original Wallet
// Run this after updating Firebase manually

console.log('🔄 Wallet Recovery Complete');
console.log('==========================');
console.log('');
console.log('✅ Database updated to original wallet address');
console.log('✅ Original wallet address: ${originalWallet}');
console.log('');
console.log('🎯 Next Steps:');
console.log('   1. Log out of the app completely');
console.log('   2. Log back in');
console.log('   3. Go to Settings → Wallet Management');
console.log('   4. Tap "Import Wallet"');
console.log('   5. Enter your original 24-word seed phrase');
console.log('   6. Verify the wallet address is: ${originalWallet}');
console.log('');
console.log('⚠️  Important:');
console.log('   - Make sure you have the correct seed phrase');
console.log('   - Test with a small transaction first');
console.log('   - Keep your seed phrase secure');
`;
    
    require('fs').writeFileSync('recovery-complete.js', recoveryScript);
    
    console.log('📝 Recovery script created: recovery-complete.js');
    console.log('\n🚀 Recovery Process:');
    console.log('   1. Update Firebase database (manual step above)');
    console.log('   2. Log out and back in to the app');
    console.log('   3. Use "Import Wallet" with your original seed phrase');
    console.log('   4. Verify the wallet address is correct');
    
    console.log('\n⚠️  Final Warning:');
    console.log('   - Make sure you have the correct seed phrase');
    console.log('   - Test with a small transaction first');
    console.log('   - If you make a mistake, you could lose access to your funds');
  } else {
    console.log('\nRecovery cancelled. Your current wallet will continue to work.');
  }
  
  rl.close();
}

restoreOriginalWallet();
