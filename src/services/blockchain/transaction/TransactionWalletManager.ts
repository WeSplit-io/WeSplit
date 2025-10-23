/**
 * Transaction Wallet Manager
 * Handles wallet loading and management for transactions
 */

import { Keypair } from '@solana/web3.js';
import { logger } from '../../analytics/loggingService';
import { keypairUtils } from '../../shared/keypairUtils';

export class TransactionWalletManager {
  private keypair: Keypair | null = null;

  /**
   * Load wallet from secure storage
   */
  async loadWallet(userId?: string): Promise<boolean> {
    try {
      logger.debug('Loading wallet from secure storage', null, 'TransactionWalletManager');
      
      if (!userId) {
        logger.warn('No userId provided for wallet loading', null, 'TransactionWalletManager');
        return false;
      }
      
      // Use the walletService to ensure user wallet
      const { walletService } = await import('../wallet');
      const walletResult = await walletService.ensureUserWallet(userId);
      
      if (walletResult.success && walletResult.wallet && walletResult.wallet.secretKey) {
        // Convert secret key back to keypair for this service using shared utility
        const keypairResult = keypairUtils.createKeypairFromSecretKey(walletResult.wallet.secretKey);
        if (keypairResult.success && keypairResult.keypair) {
          this.keypair = keypairResult.keypair;
          
          logger.debug('Wallet loaded successfully', {
            address: this.keypair.publicKey.toBase58()
          });
          
          return true;
        }
      }
      
      console.warn('🔗 TransactionWalletManager: Failed to load wallet');
      return false;
    } catch (error) {
      console.error('🔗 TransactionWalletManager: Error loading wallet:', error);
      return false;
    }
  }

  /**
   * Get the current keypair
   */
  getKeypair(): Keypair | null {
    return this.keypair;
  }

  /**
   * Check if wallet is loaded
   */
  isWalletLoaded(): boolean {
    return this.keypair !== null;
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(): Promise<{ address: string; publicKey: string } | null> {
    if (!this.keypair) {
      return null;
    }

    return {
      address: this.keypair.publicKey.toBase58(),
      publicKey: this.keypair.publicKey.toBase58()
    };
  }
}
