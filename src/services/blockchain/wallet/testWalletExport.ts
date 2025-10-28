/**
 * Wallet Export Service Test
 * Simple test to verify the consolidated wallet export functionality
 */

import { walletExportService } from '../services/blockchain/wallet/walletExportService';

export const testWalletExport = async (userId: string) => {
  try {
    console.log('🧪 Testing wallet export functionality...');
    
    // Test 1: Check if wallet can be exported
    const canExport = await walletExportService.canExportWallet(userId);
    console.log('✅ Can export wallet:', canExport);
    
    if (canExport.canExport) {
      // Test 2: Export wallet with both seed phrase and private key
      const exportResult = await walletExportService.exportWallet(userId, undefined, {
        includeSeedPhrase: true,
        includePrivateKey: true
      });
      
      console.log('✅ Export result:', {
        success: exportResult.success,
        walletAddress: exportResult.walletAddress,
        exportType: exportResult.exportType,
        hasSeedPhrase: !!exportResult.seedPhrase,
        hasPrivateKey: !!exportResult.privateKey,
        error: exportResult.error
      });
      
      // Test 3: Get export instructions
      const instructions = walletExportService.getExportInstructions();
      console.log('✅ Export instructions available:', instructions.length > 0);
      
      return {
        success: true,
        canExport: canExport.canExport,
        exportResult,
        instructions: instructions.substring(0, 100) + '...'
      };
    } else {
      console.log('❌ Cannot export wallet:', canExport.error);
      return {
        success: false,
        canExport: false,
        error: canExport.error
      };
    }
    
  } catch (error) {
    console.error('❌ Wallet export test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
