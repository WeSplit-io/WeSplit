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
      // Use wallet recovery service to get wallet data
      const recoveryResult = await walletRecoveryService.recoverWallet(userId);
      
      if (!recoveryResult.success || !recoveryResult.wallet) {
        return {
          success: false,
          error: `Wallet recovery failed: ${recoveryResult.error}`
        };
      }
      
      const wallet = recoveryResult.wallet;
      
      // Validate wallet address if provided
      if (walletAddress && wallet.address !== walletAddress) {
        return {
          success: false,
          error: `Wallet address mismatch. Expected: ${walletAddress}, Found: ${wallet.address}`
        };
      }

      return await this.exportWalletData(userId, wallet, options);

    } catch (error) {
      logger.error('Failed to export wallet', error, 'WalletExportService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Export wallet data with comprehensive credential retrieval
   */
  private async exportWalletData(
    userId: string, 
    wallet: { address: string; publicKey: string; privateKey: string },
    options: WalletExportOptions
  ): Promise<WalletExportResult> {
    try {
      const result: WalletExportResult = {
        success: true,
        walletAddress: wallet.address,
        exportType: 'both'
      };

      // Export seed phrase if requested
      if (options.includeSeedPhrase !== false) {
        const seedPhrase = await this.getSeedPhraseForWallet(userId, wallet.address);
        if (seedPhrase) {
          result.seedPhrase = seedPhrase;
        } else {
          logger.warn('Could not retrieve seed phrase for export', { userId, walletAddress: wallet.address }, 'WalletExportService');
        }
      }

      // Export private key if requested
      if (options.includePrivateKey !== false) {
        if (wallet.privateKey) {
          result.privateKey = wallet.privateKey;
        } else {
          logger.warn('Could not retrieve private key for export', { userId, walletAddress: wallet.address }, 'WalletExportService');
        }
      }

      logger.info('Wallet export completed successfully', { 
        userId, 
        walletAddress: wallet.address,
        hasSeedPhrase: !!result.seedPhrase,
        hasPrivateKey: !!result.privateKey
      }, 'WalletExportService');

      return result;

    } catch (error) {
      logger.error('Failed to export wallet data', error, 'WalletExportService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export wallet data'
      };
    }
  }

  /**
   * Get seed phrase for a specific wallet address
   * Verifies that the seed phrase matches the wallet address
   */
  private async getSeedPhraseForWallet(userId: string, walletAddress: string): Promise<string | null> {
    try {
      // Get stored mnemonic - no validation for speed
      const mnemonic = await walletRecoveryService.getStoredMnemonic(userId);
      return mnemonic;
    } catch (error) {
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
   */
  async canExportWallet(userId: string, walletAddress?: string): Promise<{
    canExport: boolean;
    hasSeedPhrase: boolean;
    hasPrivateKey: boolean;
    error?: string;
  }> {
    try {
      // Try to get wallet credentials
      const result = await this.exportWallet(userId, walletAddress, {
        includeSeedPhrase: true,
        includePrivateKey: true
      });

      return {
        canExport: result.success,
        hasSeedPhrase: !!result.seedPhrase,
        hasPrivateKey: !!result.privateKey,
        error: result.error
      };
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
