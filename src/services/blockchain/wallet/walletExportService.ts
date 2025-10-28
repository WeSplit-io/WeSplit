/**
 * Consolidated Wallet Export Service
 * Single source of truth for wallet export functionality
 * Handles both seed phrase and private key exports
 */

import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { logger } from '../../analytics/loggingService';
import { walletRecoveryService } from './walletRecoveryService';

export interface WalletExportResult {
  success: boolean;
  walletAddress?: string;
  seedPhrase?: string;
  privateKey?: string;
  exportType?: 'seed_phrase' | 'private_key' | 'both';
  error?: string;
}

export interface WalletExportOptions {
  includeSeedPhrase?: boolean;
  includePrivateKey?: boolean;
  requireBiometricAuth?: boolean;
}

class WalletExportService {
  /**
   * Export wallet credentials for a specific user and wallet address
   * This is the single method that should be used for all wallet exports
   * Now uses intelligent wallet selection
   */
  async exportWallet(
    userId: string, 
    walletAddress?: string,
    options: WalletExportOptions = {}
  ): Promise<WalletExportResult> {
    try {
      logger.info('Starting wallet export', { userId, walletAddress }, 'WalletExportService');

      // Import the enhanced export service
      const { enhancedWalletExportService } = await import('./enhancedWalletExportService');

      if (walletAddress) {
        // Export specific wallet
        return await enhancedWalletExportService.exportSpecificWallet(userId, walletAddress, options);
      } else {
        // Use intelligent selection
        return await enhancedWalletExportService.exportWalletWithSelection(userId, options);
      }

    } catch (error) {
      logger.error('Failed to export wallet', error, 'WalletExportService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get seed phrase for a specific wallet address
   * Verifies that the seed phrase matches the wallet address
   */
  private async getSeedPhraseForWallet(userId: string, walletAddress: string): Promise<string | null> {
    try {
      logger.info('Retrieving seed phrase for wallet', { userId, walletAddress }, 'WalletExportService');
      
      // Get stored mnemonic
      const mnemonic = await walletRecoveryService.getStoredMnemonic(userId);
      
      if (!mnemonic) {
        logger.warn('No mnemonic found for user', { userId }, 'WalletExportService');
        return null;
      }

      // Validate mnemonic format
      if (!bip39.validateMnemonic(mnemonic)) {
        logger.warn('Invalid mnemonic format', { userId }, 'WalletExportService');
        return null;
      }

      // Verify mnemonic matches wallet address
      try {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const keypair = Keypair.fromSeed(seed.slice(0, 32));
        const derivedAddress = keypair.publicKey.toBase58();
        
        if (derivedAddress === walletAddress) {
          logger.info('Seed phrase verified for wallet address', { userId, walletAddress }, 'WalletExportService');
          return mnemonic;
        } else {
          logger.warn('Seed phrase does not match wallet address', { 
            userId, 
            walletAddress, 
            derivedAddress 
          }, 'WalletExportService');
          return null;
        }
      } catch (verifyError) {
        logger.warn('Failed to verify seed phrase', verifyError, 'WalletExportService');
        return null;
      }

    } catch (error) {
      logger.error('Failed to get seed phrase for wallet', error, 'WalletExportService');
      return null;
    }
  }

  /**
   * Get private key for a specific wallet address
   */
  private async getPrivateKeyForWallet(userId: string, walletAddress: string): Promise<string | null> {
    try {
      logger.info('Retrieving private key for wallet', { userId, walletAddress }, 'WalletExportService');
      
      // Get all stored wallets for the user
      const storedWallets = await walletRecoveryService.getStoredWallets(userId);
      
      // Find the wallet that matches the provided address
      const matchingWallet = storedWallets.find(wallet => wallet.address === walletAddress);
      
      if (matchingWallet && matchingWallet.privateKey) {
        logger.info('Found matching wallet for private key', { userId, walletAddress }, 'WalletExportService');
        return matchingWallet.privateKey;
      }

      logger.warn('No matching private key found for wallet address', { userId, walletAddress }, 'WalletExportService');
      return null;

    } catch (error) {
      logger.error('Failed to get private key for wallet', error, 'WalletExportService');
      return null;
    }
  }

  /**
   * Get export instructions for external wallets
   */
  getExportInstructions(): string {
    return `To export your wallet to external apps like Phantom or Solflare:

SEED PHRASE EXPORT (RECOMMENDED):
1. Open your external wallet app (Phantom, Solflare, etc.)
2. Look for "Import Wallet" or "Restore Wallet" option
3. Choose "Import from Seed Phrase" or "Restore from Mnemonic"
4. Enter your 12-word seed phrase exactly as shown
5. Follow the app's instructions to complete the import

PRIVATE KEY EXPORT (if no seed phrase available):
1. Open your external wallet app
2. Look for "Import Wallet" or "Add Account" option
3. Choose "Import from Private Key" or "Import from Secret Key"
4. Paste your private key (copied from this app)
5. Follow the app's instructions to complete the import

IMPORTANT NOTES:
• Your seed phrase is 12 words (not 24)
• Keep your credentials secure and never share them
• Your credentials are compatible with all BIP39-compatible wallets
• Always verify the wallet address matches after import`;
  }

  /**
   * Check if wallet can be exported (has either seed phrase or private key)
   * Now uses enhanced analysis
   */
  async canExportWallet(userId: string, walletAddress?: string): Promise<{
    canExport: boolean;
    hasSeedPhrase: boolean;
    hasPrivateKey: boolean;
    recommendedWallet?: string;
    error?: string;
  }> {
    try {
      // Import the enhanced export service
      const { enhancedWalletExportService } = await import('./enhancedWalletExportService');
      
      return await enhancedWalletExportService.canExportWallet(userId, walletAddress);
    } catch (error) {
      return {
        canExport: false,
        hasSeedPhrase: false,
        hasPrivateKey: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const walletExportService = new WalletExportService();
export { WalletExportService };
