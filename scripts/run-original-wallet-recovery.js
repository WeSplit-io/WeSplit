/**
 * Run Original Wallet Recovery
 * This script helps recover the user's original wallet address
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

async function runOriginalWalletRecovery() {
  console.log('🔄 WeSplit Original Wallet Recovery Tool');
  console.log('========================================\n');
  
  try {
    // Get the information from the logs
    const userId = 'Iq38ETC4nZUbuMjiZlIGBg1Ulhm1';
    const originalAddress = '8pSa67ETKT9eHYXraUvCknhsDDPGbPFLThyucQC4EzPE';
    const currentAddress = '4yrBjpAmrNAnipi9hJKJb5qnrxnKFg2PEk2AwGtE8zDg';
    
    console.log('📋 Detected Information:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Original Wallet: ${originalAddress}`);
    console.log(`   Current Wallet: ${currentAddress}`);
    console.log('');
    
    const proceed = await askQuestion('Do you want to proceed with recovery? (y/n): ');
    
    if (proceed.toLowerCase() !== 'y') {
      console.log('Recovery cancelled.');
      return;
    }
    
    console.log('\n🔄 Starting original wallet recovery...\n');
    
    // Create the recovery script
    const recoveryScript = `
import { OriginalWalletRecovery } from './recover-original-wallet';

async function runRecovery() {
  try {
    console.log('🔄 Attempting to recover original wallet...');
    
    const result = await OriginalWalletRecovery.recoverOriginalWallet(
      '${userId}',
      '${originalAddress}',
      '${currentAddress}'
    );
    
    if (result.success) {
      console.log('✅ SUCCESS! Original wallet recovered:');
      console.log('   Method:', result.method);
      
      if (result.originalWallet) {
        console.log('   Address:', result.originalWallet.publicKey.toBase58());
        
        // Ask if user wants to force update to original wallet
        console.log('\\n🔄 Would you like to force update the user to the original wallet?');
        console.log('   This will replace the current wallet with the original one.');
        
        // For now, just show the option
        console.log('   To force update, run: OriginalWalletRecovery.forceUpdateToOriginalWallet()');
      }
    } else {
      console.log('❌ Recovery failed:', result.error);
      console.log('\\n🔍 Possible solutions:');
      console.log('   1. Check if you have the original seed phrase');
      console.log('   2. Check if you exported the wallet before');
      console.log('   3. Check if the original wallet has funds');
      console.log('   4. Contact support with the original wallet address');
    }
    
  } catch (error) {
    console.error('❌ Recovery script failed:', error);
  }
}

runRecovery();
`;
    
    // Write the script
    require('fs').writeFileSync('temp-original-recovery.ts', recoveryScript);
    
    console.log('📝 Recovery script created: temp-original-recovery.ts');
    console.log('\n🚀 To run the recovery:');
    console.log('   1. Make sure you have TypeScript and dependencies installed');
    console.log('   2. Run: npx ts-node temp-original-recovery.ts');
    
    console.log('\n🔍 What the recovery will try:');
    console.log('   1. Legacy recovery service');
    console.log('   2. Alternative derivation paths');
    console.log('   3. Firebase private key search');
    console.log('   4. Pattern reconstruction');
    console.log('   5. Fund recovery check');
    
    console.log('\n⚠️  Important Notes:');
    console.log('   • Your original wallet address: ' + originalAddress);
    console.log('   • Your current wallet address: ' + currentAddress);
    console.log('   • If recovery succeeds, you can force update to the original wallet');
    console.log('   • If recovery fails, your funds may still be safe on the blockchain');
    
    console.log('\n🆘 Alternative Solutions:');
    console.log('   1. If you have the original seed phrase, use "Import Wallet" in the app');
    console.log('   2. Check if you exported the wallet to another app (Phantom, Solflare, etc.)');
    console.log('   3. Check the original wallet address on Solana Explorer for funds');
    console.log('   4. Contact support with your original wallet address');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

runOriginalWalletRecovery();
