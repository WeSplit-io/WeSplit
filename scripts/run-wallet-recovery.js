/**
 * Simple Wallet Recovery Runner
 * Run this script to attempt wallet recovery
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

async function runWalletRecovery() {
  console.log('🔄 WeSplit Wallet Recovery Tool');
  console.log('================================\n');
  
  try {
    // Get user information
    const email = await askQuestion('Enter your email address: ');
    const userId = await askQuestion('Enter your user ID (or press Enter to skip): ');
    const expectedWalletAddress = await askQuestion('Enter your old wallet address (or press Enter to skip): ');
    
    console.log('\n🔄 Starting recovery process...\n');
    
    // Create a temporary recovery script
    const recoveryScript = `
import { ManualWalletRecovery } from './manual-wallet-recovery';
import { userWalletService } from '../src/services/userWalletService';

async function runRecovery() {
  try {
    console.log('🔄 Attempting wallet recovery...');
    
    const result = await ManualWalletRecovery.recoverWallet({
      userId: '${userId || 'unknown'}',
      email: '${email}',
      expectedWalletAddress: '${expectedWalletAddress || ''}'
    });
    
    if (result.success) {
      console.log('✅ SUCCESS! Wallet recovered:');
      console.log('   Address:', result.walletAddress);
      console.log('   Method:', result.method);
    } else {
      console.log('❌ Recovery failed:', result.error);
    }
    
    // Also try the standard wallet service
    console.log('\\n🔄 Trying standard wallet service...');
    const walletResult = await userWalletService.ensureUserWallet('${userId || 'unknown'}');
    if (walletResult.success) {
      console.log('✅ Standard service found wallet:', walletResult.wallet?.address);
    } else {
      console.log('❌ Standard service failed:', walletResult.error);
    }
    
  } catch (error) {
    console.error('❌ Recovery script failed:', error);
  }
}

runRecovery();
`;
    
    // Write the script to a temporary file
    require('fs').writeFileSync('temp-recovery.ts', recoveryScript);
    
    console.log('📝 Recovery script created. To run it:');
    console.log('   1. Make sure you have TypeScript and dependencies installed');
    console.log('   2. Run: npx ts-node temp-recovery.ts');
    console.log('   3. Or compile and run: tsc temp-recovery.ts && node temp-recovery.js');
    
    console.log('\n📋 Alternative manual steps:');
    console.log('   1. Log out of the app completely');
    console.log('   2. Log back in with the same email address');
    console.log('   3. The new recovery system should automatically attempt recovery');
    console.log('   4. If that fails, go to Settings → Wallet Management');
    console.log('   5. Look for recovery options in the wallet management screen');
    
    console.log('\n🔍 Recovery methods that will be attempted:');
    console.log('   • Cross-authentication recovery by email');
    console.log('   • Enhanced wallet recovery service');
    console.log('   • Legacy wallet recovery');
    console.log('   • Firebase data search');
    console.log('   • Force wallet creation with recovery');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

runWalletRecovery();
