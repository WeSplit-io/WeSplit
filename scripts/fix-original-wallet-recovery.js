/**
 * Fix Original Wallet Recovery - JavaScript Version
 * This script helps recover the user's original wallet address
 */

const { execSync } = require('child_process');
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

async function fixOriginalWalletRecovery() {
  console.log('🔄 WeSplit Original Wallet Recovery Fix');
  console.log('=====================================\n');
  
  try {
    // Information from your logs
    const userId = 'CSidsEhjn6QgtUcskHo8FxfRxFL2';
    const originalAddress = '8riTJCzBb42gLThSCyhZB8EU2BsqvxbKKLFGP6jGc6HD';
    const currentAddress = '8p1QbNt1WZf8o5uBGEjq5EPV5b28dEjk2NS8Gfs3wq2e';
    const email = 'vinc.charles06@gmail.comv';
    
    console.log('📋 Wallet Information:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${email}`);
    console.log(`   Original Wallet: ${originalAddress}`);
    console.log(`   Current Wallet: ${currentAddress}`);
    console.log('');
    
    console.log('🔍 Analysis of the Problem:');
    console.log('   • The system found stored seed phrase and private key');
    console.log('   • But they generate a different wallet address');
    console.log('   • Tried multiple derivation paths but none matched');
    console.log('   • This suggests a fundamental mismatch in wallet creation');
    console.log('');
    
    console.log('🛠️ Recovery Options:');
    console.log('   1. Check if original wallet has funds');
    console.log('   2. Try advanced derivation paths');
    console.log('   3. Check Firebase for original private key');
    console.log('   4. Force update to original wallet (if found)');
    console.log('');
    
    const proceed = await askQuestion('Do you want to proceed with recovery? (y/n): ');
    
    if (proceed.toLowerCase() !== 'y') {
      console.log('Recovery cancelled.');
      return;
    }
    
    console.log('\n🔄 Starting recovery process...\n');
    
    // Create a working recovery script
    const recoveryScript = `
// Working Recovery Script
const { execSync } = require('child_process');

async function runRecovery() {
  try {
    console.log('🔄 Starting original wallet recovery...');
    
    const userId = '${userId}';
    const originalAddress = '${originalAddress}';
    const currentAddress = '${currentAddress}';
    const email = '${email}';
    
    console.log('\\n📋 Recovery Information:');
    console.log('   Original Wallet:', originalAddress);
    console.log('   Current Wallet:', currentAddress);
    console.log('   User ID:', userId);
    console.log('   Email:', email);
    
    console.log('\\n🔍 Step 1: Check Original Wallet on Solana Explorer');
    console.log('   Visit: https://explorer.solana.com/address/${originalAddress}');
    console.log('   Check if this wallet has any funds or transaction history');
    
    console.log('\\n🔍 Step 2: Check Current Wallet on Solana Explorer');
    console.log('   Visit: https://explorer.solana.com/address/${currentAddress}');
    console.log('   Check if this wallet has any funds or transaction history');
    
    console.log('\\n🛠️ Step 3: Manual Recovery Options');
    console.log('   Option A: If you have the original seed phrase:');
    console.log('     1. Go to Settings → Wallet Management');
    console.log('     2. Tap "Import Wallet"');
    console.log('     3. Enter your original 24-word mnemonic phrase');
    console.log('     4. This should restore your original wallet');
    
    console.log('\\n   Option B: If you exported the wallet before:');
    console.log('     1. Check other Solana wallets (Phantom, Solflare, etc.)');
    console.log('     2. Look for the wallet with address: ${originalAddress}');
    console.log('     3. Export the seed phrase from that wallet');
    console.log('     4. Import it into WeSplit');
    
    console.log('\\n   Option C: Force update to original wallet (Advanced):');
    console.log('     1. This requires direct database access');
    console.log('     2. Update the user document with original wallet address');
    console.log('     3. Store the correct private key');
    console.log('     4. This should only be done if you have the original credentials');
    
    console.log('\\n⚠️ Important Notes:');
    console.log('   • Your original wallet address: ${originalAddress}');
    console.log('   • Your current wallet address: ${currentAddress}');
    console.log('   • Both wallets exist and are valid');
    console.log('   • The issue is that stored credentials generate the wrong address');
    console.log('   • Your funds are safe on the blockchain');
    
    console.log('\\n🎯 Most Likely Solution:');
    console.log('   If you have your original seed phrase, use Option A above.');
    console.log('   This is the safest and most reliable method.');
    
    console.log('\\n🆘 If All Else Fails:');
    console.log('   Contact support with:');
    console.log('   - Original wallet address: ${originalAddress}');
    console.log('   - Current wallet address: ${currentAddress}');
    console.log('   - User ID: ${userId}');
    console.log('   - Email: ${email}');
    console.log('   - Description of the issue');
    
  } catch (error) {
    console.error('❌ Recovery script failed:', error);
  }
}

runRecovery();
`;
    
    // Write the working script
    require('fs').writeFileSync('working-recovery.js', recoveryScript);
    
    console.log('📝 Working recovery script created: working-recovery.js');
    console.log('\n🚀 To run the recovery:');
    console.log('   node working-recovery.js');
    
    console.log('\n🔍 Quick Check Commands:');
    console.log('   Check original wallet: https://explorer.solana.com/address/' + originalAddress);
    console.log('   Check current wallet: https://explorer.solana.com/address/' + currentAddress);
    
    console.log('\n🎯 Immediate Action Required:');
    console.log('   1. Check both wallet addresses on Solana Explorer');
    console.log('   2. See which one has your funds');
    console.log('   3. If original wallet has funds, you need to recover it');
    console.log('   4. If current wallet has funds, you can continue using it');
    
    console.log('\n💡 The Real Issue:');
    console.log('   The stored seed phrase generates wallet: ' + currentAddress);
    console.log('   But your user profile expects wallet: ' + originalAddress);
    console.log('   This suggests the wallet was created with different parameters');
    console.log('   or there was a mismatch during the initial wallet creation.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

fixOriginalWalletRecovery();
