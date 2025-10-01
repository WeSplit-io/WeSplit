/**
 * Recover Funded Wallet
 * This script helps recover the original wallet that has funds
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

async function recoverFundedWallet() {
  console.log('💰 RECOVER FUNDED WALLET');
  console.log('========================');
  console.log('⚠️  URGENT: Your original wallet has funds that need to be recovered!\n');
  
  const originalWallet = '8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD';
  const currentWallet = '8p1QbNt1WZf8o5uBGEjq5EPV5b28dEjk2NS8Gfs3wq2e';
  const userId = 'CSidsEhjn6QgtUcskHo8FxfRxFL2';
  
  console.log('📋 Wallet Status:');
  console.log(`   ✅ Original Wallet (HAS FUNDS): ${originalWallet}`);
  console.log(`   ❌ Current Wallet (NO FUNDS):   ${currentWallet}`);
  console.log(`   👤 User ID: ${userId}\n`);
  
  console.log('🔍 Check your original wallet:');
  console.log(`   Solscan: https://solscan.io/account/${originalWallet}`);
  console.log(`   Solana Explorer: https://explorer.solana.com/address/${originalWallet}\n`);
  
  const hasSeedPhrase = await askQuestion('Do you have the original wallet\'s 24-word seed phrase? (y/n): ');
  
  if (hasSeedPhrase.toLowerCase() !== 'y') {
    console.log('\n❌ CRITICAL: Without the original seed phrase, you cannot recover the funded wallet!');
    console.log('\n🔍 URGENT SEARCH - Look for the seed phrase in:');
    console.log('   1. WeSplit app export (Settings → Wallet Management → Export Wallet)');
    console.log('   2. Other Solana wallets (Phantom, Solflare, etc.)');
    console.log('   3. Device backup files');
    console.log('   4. Written notes or documents');
    console.log('   5. Password managers');
    console.log('   6. Email backups');
    console.log('   7. Cloud storage (Google Drive, iCloud, etc.)');
    
    console.log('\n⚠️  IMPORTANT:');
    console.log('   - The seed phrase is the ONLY way to recover the funded wallet');
    console.log('   - You cannot reverse-engineer it from the wallet address');
    console.log('   - Your funds are safe on the blockchain, but you need the seed phrase to access them');
    
    console.log('\n🆘 If you cannot find the seed phrase:');
    console.log('   - Contact support immediately');
    console.log('   - Provide the original wallet address: ' + originalWallet);
    console.log('   - Explain that you lost access to a funded wallet');
    
    return;
  }
  
  console.log('\n✅ EXCELLENT! You have the original seed phrase.');
  console.log('\n🔄 RECOVERY PROCESS:');
  console.log('\n   Step 1: Update Firebase Database');
  console.log('   - Go to: https://console.firebase.google.com/');
  console.log('   - Select your WeSplit project');
  console.log('   - Go to Firestore Database');
  console.log('   - Find document with ID: ' + userId);
  console.log('   - Update these fields:');
  console.log(`     * wallet_address: ${originalWallet}`);
  console.log(`     * wallet_public_key: ${originalWallet}`);
  console.log('     * wallet_status: "healthy"');
  console.log('     * wallet_last_fixed_at: ' + new Date().toISOString());
  
  console.log('\n   Step 2: Clear App and Re-login');
  console.log('   - Log out of the app completely');
  console.log('   - Clear app data/cache (recommended)');
  console.log('   - Log back in with your email');
  
  console.log('\n   Step 3: Import Original Wallet');
  console.log('   - Go to Settings → Wallet Management');
  console.log('   - Tap "Import Wallet"');
  console.log('   - Enter your original 24-word seed phrase');
  console.log('   - Authenticate with biometrics/passcode');
  console.log('   - Verify the wallet address is: ' + originalWallet);
  
  console.log('\n   Step 4: Verify Recovery');
  console.log('   - Check that you can see your funds');
  console.log('   - Test a small transaction to confirm access');
  console.log('   - Verify the wallet address in the app matches: ' + originalWallet);
  
  const proceedWithRecovery = await askQuestion('\n🚀 Ready to proceed with recovery? (y/n): ');
  
  if (proceedWithRecovery.toLowerCase() === 'y') {
    console.log('\n🔄 Creating recovery checklist...');
    
    const recoveryChecklist = `
// RECOVERY CHECKLIST - FUNDED WALLET
// ===================================

console.log('💰 FUNDED WALLET RECOVERY CHECKLIST');
console.log('====================================');
console.log('');
console.log('✅ Step 1: Firebase Database Update');
console.log('   - User ID: ${userId}');
console.log('   - Update wallet_address to: ${originalWallet}');
console.log('   - Update wallet_public_key to: ${originalWallet}');
console.log('   - Set wallet_status to: "healthy"');
console.log('');
console.log('✅ Step 2: App Recovery');
console.log('   - Log out completely');
console.log('   - Log back in');
console.log('   - Go to Settings → Wallet Management');
console.log('   - Tap "Import Wallet"');
console.log('   - Enter original 24-word seed phrase');
console.log('');
console.log('✅ Step 3: Verification');
console.log('   - Wallet address should be: ${originalWallet}');
console.log('   - Check funds are visible');
console.log('   - Test small transaction');
console.log('');
console.log('⚠️  CRITICAL REMINDERS:');
console.log('   - Keep your seed phrase secure');
console.log('   - Test with small amounts first');
console.log('   - Your funds are safe on the blockchain');
console.log('   - Original wallet: ${originalWallet}');
`;
    
    require('fs').writeFileSync('funded-wallet-recovery-checklist.js', recoveryChecklist);
    
    console.log('📝 Recovery checklist created: funded-wallet-recovery-checklist.js');
    console.log('\n🎯 RECOVERY PRIORITY:');
    console.log('   1. Update Firebase database FIRST');
    console.log('   2. Then use the app to import the original wallet');
    console.log('   3. Verify you can access your funds');
    
    console.log('\n⚠️  FINAL WARNING:');
    console.log('   - Make sure you have the CORRECT seed phrase');
    console.log('   - Test with a small transaction first');
    console.log('   - If you make a mistake, you could lose access to your funds');
    console.log('   - Your original wallet address: ' + originalWallet);
    
  } else {
    console.log('\nRecovery cancelled. Your funds remain in the original wallet: ' + originalWallet);
    console.log('You can attempt recovery later when you\'re ready.');
  }
  
  rl.close();
}

recoverFundedWallet();
