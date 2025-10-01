/**
 * Manual Wallet Recovery Script
 * Use this to force wallet recovery for users who lost their wallets
 * when switching authentication methods
 */

import { userWalletService } from '../src/services/userWalletService';
import { walletRecoveryService } from '../src/services/walletRecoveryService';
import { legacyWalletRecoveryService } from '../src/services/legacyWalletRecoveryService';
import { secureStorageService } from '../src/services/secureStorageService';
import { firebaseDataService } from '../src/services/firebaseDataService';

interface RecoveryOptions {
  userId: string;
  email: string;
  expectedWalletAddress?: string;
}

export class ManualWalletRecovery {
  
  /**
   * Attempt comprehensive wallet recovery for a user
   */
  static async recoverWallet(options: RecoveryOptions): Promise<{
    success: boolean;
    walletAddress?: string;
    method?: string;
    error?: string;
  }> {
    const { userId, email, expectedWalletAddress } = options;
    
    console.log('🔄 Starting manual wallet recovery...', { userId, email, expectedWalletAddress });
    
    try {
      // Step 1: Try the new cross-auth recovery system
      console.log('📧 Attempting cross-auth recovery by email...');
      const crossAuthResult = await this.tryCrossAuthRecovery(email);
      if (crossAuthResult.success) {
        console.log('✅ Cross-auth recovery successful!', crossAuthResult);
        return crossAuthResult;
      }
      
      // Step 2: Try the enhanced wallet recovery service
      console.log('🔍 Attempting enhanced wallet recovery...');
      const enhancedResult = await walletRecoveryService.recoverExistingWallet({
        userId,
        email,
        forceRecovery: true
      });
      
      if (enhancedResult.success) {
        console.log('✅ Enhanced recovery successful!', enhancedResult);
        return {
          success: true,
          walletAddress: enhancedResult.walletAddress,
          method: 'enhanced_recovery'
        };
      }
      
      // Step 3: Try legacy recovery if we have an expected address
      if (expectedWalletAddress) {
        console.log('🔄 Attempting legacy recovery...');
        const legacyResult = await legacyWalletRecoveryService.recoverLegacyWallet(
          userId, 
          expectedWalletAddress
        );
        
        if (legacyResult.success) {
          console.log('✅ Legacy recovery successful!', legacyResult);
          return {
            success: true,
            walletAddress: expectedWalletAddress,
            method: legacyResult.method || 'legacy_recovery'
          };
        }
      }
      
      // Step 4: Try to find wallet data in Firebase
      console.log('🔥 Searching Firebase for wallet data...');
      const firebaseResult = await this.searchFirebaseForWallet(email);
      if (firebaseResult.success) {
        console.log('✅ Firebase recovery successful!', firebaseResult);
        return firebaseResult;
      }
      
      // Step 5: Try to force wallet creation with recovery
      console.log('🆕 Attempting to force wallet creation with recovery...');
      const forceResult = await userWalletService.ensureUserWallet(userId);
      if (forceResult.success) {
        console.log('✅ Force wallet creation successful!', forceResult);
        return {
          success: true,
          walletAddress: forceResult.wallet?.address,
          method: 'force_creation'
        };
      }
      
      console.log('❌ All recovery methods failed');
      return {
        success: false,
        error: 'All recovery methods failed. Wallet may be permanently lost.'
      };
      
    } catch (error) {
      console.error('❌ Manual recovery failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Recovery failed with unknown error'
      };
    }
  }
  
  /**
   * Try cross-authentication recovery using email
   */
  private static async tryCrossAuthRecovery(email: string): Promise<{
    success: boolean;
    walletAddress?: string;
    method?: string;
    error?: string;
  }> {
    try {
      // Try to get wallet data stored by email
      const emailWalletData = await secureStorageService.getWalletDataByEmail(email);
      
      if (emailWalletData) {
        console.log('📧 Found wallet data by email:', {
          hasSeedPhrase: !!emailWalletData.seedPhrase,
          hasPrivateKey: !!emailWalletData.privateKey,
          walletAddress: emailWalletData.walletAddress
        });
        
        // Try to restore from seed phrase first
        if (emailWalletData.seedPhrase) {
          try {
            const { consolidatedWalletService } = await import('../src/services/consolidatedWalletService');
            const result = await consolidatedWalletService.importWallet(emailWalletData.seedPhrase);
            
            if (result && result.address) {
              return {
                success: true,
                walletAddress: result.address,
                method: 'email_seed_phrase'
              };
            }
          } catch (error) {
            console.warn('Failed to restore from email-stored seed phrase:', error);
          }
        }
        
        // Try to restore from private key
        if (emailWalletData.privateKey) {
          try {
            const { Keypair } = await import('@solana/web3.js');
            const keyData = new Uint8Array(JSON.parse(emailWalletData.privateKey));
            const keypair = Keypair.fromSecretKey(keyData);
            
            return {
              success: true,
              walletAddress: keypair.publicKey.toBase58(),
              method: 'email_private_key'
            };
          } catch (error) {
            console.warn('Failed to restore from email-stored private key:', error);
          }
        }
      }
      
      return {
        success: false,
        error: 'No cross-auth wallet data found'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cross-auth recovery failed'
      };
    }
  }
  
  /**
   * Search Firebase for wallet data associated with the email
   */
  private static async searchFirebaseForWallet(email: string): Promise<{
    success: boolean;
    walletAddress?: string;
    method?: string;
    error?: string;
  }> {
    try {
      // This would need to be implemented based on your Firebase structure
      // For now, we'll return a placeholder
      console.log('🔥 Firebase search not fully implemented yet');
      
      return {
        success: false,
        error: 'Firebase search not implemented'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Firebase search failed'
      };
    }
  }
  
  /**
   * Get recovery status for a user
   */
  static async getRecoveryStatus(userId: string, email: string): Promise<{
    hasStoredCredentials: boolean;
    hasEmailData: boolean;
    hasFirebaseData: boolean;
    walletAddress?: string;
  }> {
    try {
      // Check for stored credentials
      const seedPhrase = await secureStorageService.getSeedPhrase(userId);
      const privateKey = await secureStorageService.getPrivateKey(userId);
      const hasStoredCredentials = !!(seedPhrase || privateKey);
      
      // Check for email-based data
      const emailData = await secureStorageService.getWalletDataByEmail(email);
      const hasEmailData = !!emailData;
      
      // Check Firebase data
      const user = await firebaseDataService.user.getCurrentUser(userId);
      const hasFirebaseData = !!(user?.wallet_address && user.wallet_address.trim() !== '');
      
      return {
        hasStoredCredentials,
        hasEmailData,
        hasFirebaseData,
        walletAddress: user?.wallet_address
      };
    } catch (error) {
      console.error('Error getting recovery status:', error);
      return {
        hasStoredCredentials: false,
        hasEmailData: false,
        hasFirebaseData: false
      };
    }
  }
}

// Example usage:
// const recovery = await ManualWalletRecovery.recoverWallet({
//   userId: 'your-user-id',
//   email: 'your-email@example.com',
//   expectedWalletAddress: 'your-old-wallet-address' // optional
// });
