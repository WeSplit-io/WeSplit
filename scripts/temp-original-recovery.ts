
import { OriginalWalletRecovery } from './recover-original-wallet';

async function runRecovery() {
  try {
    console.log('🔄 Attempting to recover original wallet...');
    
    const result = await OriginalWalletRecovery.recoverOriginalWallet(
      'Iq38ETC4nZUbuMjiZlIGBg1Ulhm1',
      '8pSa67ETKT9eHYXraUvCknhsDDPGbPFLThyucQC4EzPE',
      '4yrBjpAmrNAnipi9hJKJb5qnrxnKFg2PEk2AwGtE8zDg'
    );
    
    if (result.success) {
      console.log('✅ SUCCESS! Original wallet recovered:');
      console.log('   Method:', result.method);
      
      if (result.originalWallet) {
        console.log('   Address:', result.originalWallet.publicKey.toBase58());
        
        // Ask if user wants to force update to original wallet
        console.log('\n🔄 Would you like to force update the user to the original wallet?');
        console.log('   This will replace the current wallet with the original one.');
        
        // For now, just show the option
        console.log('   To force update, run: OriginalWalletRecovery.forceUpdateToOriginalWallet()');
      }
    } else {
      console.log('❌ Recovery failed:', result.error);
      console.log('\n🔍 Possible solutions:');
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
