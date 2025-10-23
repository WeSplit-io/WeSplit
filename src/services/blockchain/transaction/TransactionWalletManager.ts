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
  async loadWallet(): Promise<boolean> {
    try {
      logger.debug('Loading wallet from secure storage', null, 'TransactionWalletManager');
      
      // Use the existing solanaWalletService to load the wallet securely
      const { solanaWalletService } = await import('../../wallet/solanaWallet.deprecated');
      const walletLoaded = await solanaWalletService.loadWallet();
      
      if (walletLoaded) {
        // Get the keypair from solanaWalletService
        const walletInfo = await solanaWalletService.getWalletInfo();
        if (walletInfo && walletInfo.secretKey) {
          // Convert secret key back to keypair for this service using shared utility
          const keypairResult = keypairUtils.createKeypairFromSecretKey(walletInfo.secretKey);
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
