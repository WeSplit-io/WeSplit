/**
 * Enhanced Wallet Export Service
 * Handles multiple wallet scenarios and provides proper wallet selection for export
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
  walletType?: 'primary' | 'secondary' | 'legacy';
  error?: string;
}

export interface WalletExportOptions {
  includeSeedPhrase?: boolean;
  includePrivateKey?: boolean;
  requireBiometricAuth?: boolean;
  preferSeedPhrase?: boolean;
}

export interface WalletSelectionResult {
  primaryWallet: {
    address: string;
    hasSeedPhrase: boolean;
    hasPrivateKey: boolean;
    balance?: number;
  };
  secondaryWallets: Array<{
    address: string;
    hasSeedPhrase: boolean;
    hasPrivateKey: boolean;
    balance?: number;
  }>;
  recommendedExport: {
    walletAddress: string;
    exportType: 'seed_phrase' | 'private_key';
    reason: string;
  };
}

class EnhancedWalletExportService {
  /**
   * Analyze all stored wallets and recommend the best export option
   */
  async analyzeWalletExportOptions(userId: string): Promise<WalletSelectionResult> {
    try {
      logger.info('Analyzing wallet export options', { userId }, 'EnhancedWalletExportService');

      // Get all stored wallets
      const storedWallets = await walletRecoveryService.getStoredWallets(userId);
      logger.info('Found stored wallets', { userId, count: storedWallets.length }, 'EnhancedWalletExportService');

      if (storedWallets.length === 0) {
        throw new Error('No wallets found for export');
      }

      // Get stored mnemonic
      const storedMnemonic = await walletRecoveryService.getStoredMnemonic(userId);
      
      // Analyze each wallet
      const walletAnalysis = await Promise.all(
        storedWallets.map(async (wallet) => {
          const analysis = {
            address: wallet.address,
            hasSeedPhrase: false,
            hasPrivateKey: !!wallet.privateKey,
            balance: 0, // Will be populated if needed
            walletType: 'unknown' as 'primary' | 'secondary' | 'legacy'
          };

          // Check if this wallet has a matching seed phrase
          if (storedMnemonic) {
            try {
              const seed = await bip39.mnemonicToSeed(storedMnemonic);
              const keypair = Keypair.fromSeed(seed.slice(0, 32));
              const derivedAddress = keypair.publicKey.toBase58();
              
              if (derivedAddress === wallet.address) {
                analysis.hasSeedPhrase = true;
                analysis.walletType = 'primary';
              }
            } catch (error) {
              logger.warn('Failed to verify seed phrase for wallet', { 
                userId, 
                walletAddress: wallet.address, 
                error 
              }, 'EnhancedWalletExportService');
            }
          }

          return analysis;
        })
      );

      // Determine primary wallet (the one with seed phrase or most recent)
      const primaryWallet = walletAnalysis.find(w => w.hasSeedPhrase) || walletAnalysis[0];
      const secondaryWallets = walletAnalysis.filter(w => w.address !== primaryWallet.address);

      // Determine recommended export
      let recommendedExport;
      if (primaryWallet.hasSeedPhrase) {
        recommendedExport = {
          walletAddress: primaryWallet.address,
          exportType: 'seed_phrase' as const,
          reason: 'This wallet has a seed phrase which is the most portable export format'
        };
      } else if (primaryWallet.hasPrivateKey) {
        recommendedExport = {
          walletAddress: primaryWallet.address,
          exportType: 'private_key' as const,
          reason: 'This wallet can be exported via private key (no seed phrase available)'
        };
      } else {
        throw new Error('No exportable credentials found for any wallet');
      }

      const result: WalletSelectionResult = {
        primaryWallet,
        secondaryWallets,
        recommendedExport
      };

      logger.info('Wallet analysis completed', { 
        userId, 
        primaryWallet: primaryWallet.address,
        recommendedExport: recommendedExport.exportType,
        totalWallets: storedWallets.length
      }, 'EnhancedWalletExportService');

      return result;

    } catch (error) {
      logger.error('Failed to analyze wallet export options', error, 'EnhancedWalletExportService');
      throw error;
    }
  }

  /**
   * Export wallet with intelligent selection
   * PRIORITY: Always export the active wallet that the user is actually using
   */
  async exportWalletWithSelection(
    userId: string, 
    options: WalletExportOptions = {}
  ): Promise<WalletExportResult> {
    try {
      logger.info('Starting intelligent wallet export', { userId }, 'EnhancedWalletExportService');

      // FIRST: Try to get the active wallet (the one the user is actually using)
      const { simplifiedWalletService } = await import('./simplifiedWalletService');
      const activeWalletResult = await simplifiedWalletService.ensureUserWallet(userId);
      
      if (activeWalletResult.success && activeWalletResult.wallet) {
        const activeWalletAddress = activeWalletResult.wallet.address;
        
        logger.info('Found active wallet, attempting export', { 
          userId, 
          walletAddress: activeWalletAddress 
        }, 'EnhancedWalletExportService');

        // Try to export the active wallet first
        const activeWalletExport = await this.exportSpecificWallet(userId, activeWalletAddress, options);
        
        if (activeWalletExport.success) {
          logger.info('Successfully exported active wallet', { 
            userId, 
            walletAddress: activeWalletAddress,
            exportType: activeWalletExport.exportType
          }, 'EnhancedWalletExportService');
          
          return {
            ...activeWalletExport,
            walletType: 'primary'
          };
        } else {
          logger.warn('Failed to export active wallet, trying other options', { 
            userId, 
            walletAddress: activeWalletAddress,
            error: activeWalletExport.error
          }, 'EnhancedWalletExportService');
        }
      }

      // FALLBACK: If active wallet export failed, analyze all wallets
      logger.info('Active wallet export failed, analyzing all wallets', { userId }, 'EnhancedWalletExportService');
      const analysis = await this.analyzeWalletExportOptions(userId);
      
      // Use recommended export as fallback
      const recommendedWallet = analysis.recommendedExport.walletAddress;
      const exportType = analysis.recommendedExport.exportType;

      logger.info('Using fallback wallet for export', { 
        userId, 
        walletAddress: recommendedWallet,
        exportType,
        reason: analysis.recommendedExport.reason
      }, 'EnhancedWalletExportService');

      // Export the recommended wallet
      const result = await this.exportSpecificWallet(userId, recommendedWallet, {
        ...options,
        preferSeedPhrase: exportType === 'seed_phrase'
      });

      return {
        ...result,
        walletType: analysis.primaryWallet.address === recommendedWallet ? 'primary' : 'secondary'
      };

    } catch (error) {
      logger.error('Failed to export wallet with selection', error, 'EnhancedWalletExportService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Export a specific wallet by address
   */
  async exportSpecificWallet(
    userId: string, 
    walletAddress: string,
    options: WalletExportOptions = {}
  ): Promise<WalletExportResult> {
    try {
      logger.info('Exporting specific wallet', { userId, walletAddress }, 'EnhancedWalletExportService');

      const {
        includeSeedPhrase = true,
        includePrivateKey = true,
        preferSeedPhrase = true
      } = options;

      const result: WalletExportResult = {
        success: true,
        walletAddress,
        exportType: 'both'
      };

      // Try to get seed phrase first if preferred
      if (includeSeedPhrase && preferSeedPhrase) {
        const seedPhrase = await this.getSeedPhraseForWallet(userId, walletAddress);
        if (seedPhrase) {
          result.seedPhrase = seedPhrase;
          result.exportType = 'seed_phrase';
          logger.info('Seed phrase retrieved for export', { userId, walletAddress }, 'EnhancedWalletExportService');
        }
      }

      // Try to get private key
      if (includePrivateKey) {
        const privateKey = await this.getPrivateKeyForWallet(userId, walletAddress);
        if (privateKey) {
          result.privateKey = privateKey;
          if (!result.seedPhrase) {
            result.exportType = 'private_key';
          }
          logger.info('Private key retrieved for export', { userId, walletAddress }, 'EnhancedWalletExportService');
        }
      }

      // Determine final export type
      if (result.seedPhrase && result.privateKey) {
        result.exportType = 'both';
      } else if (result.seedPhrase) {
        result.exportType = 'seed_phrase';
      } else if (result.privateKey) {
        result.exportType = 'private_key';
      } else {
        return {
          success: false,
          error: 'No export credentials available for this wallet'
        };
      }

      logger.info('Wallet export completed', { 
        userId, 
        walletAddress,
        exportType: result.exportType,
        hasSeedPhrase: !!result.seedPhrase,
        hasPrivateKey: !!result.privateKey
      }, 'EnhancedWalletExportService');

      return result;

    } catch (error) {
      logger.error('Failed to export specific wallet', error, 'EnhancedWalletExportService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get seed phrase for a specific wallet address
   */
  private async getSeedPhraseForWallet(userId: string, walletAddress: string): Promise<string | null> {
    try {
      logger.info('Retrieving seed phrase for wallet', { userId, walletAddress }, 'EnhancedWalletExportService');
      
      // Get stored mnemonic
      const mnemonic = await walletRecoveryService.getStoredMnemonic(userId);
      
      if (!mnemonic) {
        logger.warn('No mnemonic found for user', { userId }, 'EnhancedWalletExportService');
        return null;
      }

      // Validate mnemonic format
      if (!bip39.validateMnemonic(mnemonic)) {
        logger.warn('Invalid mnemonic format', { userId }, 'EnhancedWalletExportService');
        return null;
      }

      // Verify mnemonic matches wallet address
      try {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const keypair = Keypair.fromSeed(seed.slice(0, 32));
        const derivedAddress = keypair.publicKey.toBase58();
        
        if (derivedAddress === walletAddress) {
          logger.info('Seed phrase verified for wallet address', { userId, walletAddress }, 'EnhancedWalletExportService');
          return mnemonic;
        } else {
          logger.warn('Seed phrase does not match wallet address', { 
            userId, 
            walletAddress, 
            derivedAddress 
          }, 'EnhancedWalletExportService');
          return null;
        }
      } catch (verifyError) {
        logger.warn('Failed to verify seed phrase', verifyError, 'EnhancedWalletExportService');
        return null;
      }

    } catch (error) {
      logger.error('Failed to get seed phrase for wallet', error, 'EnhancedWalletExportService');
      return null;
    }
  }

  /**
   * Get private key for a specific wallet address
   */
  private async getPrivateKeyForWallet(userId: string, walletAddress: string): Promise<string | null> {
    try {
      logger.info('Retrieving private key for wallet', { userId, walletAddress }, 'EnhancedWalletExportService');
      
      // Get all stored wallets for the user
      const storedWallets = await walletRecoveryService.getStoredWallets(userId);
      
      // Find the wallet that matches the provided address
      const matchingWallet = storedWallets.find(wallet => wallet.address === walletAddress);
      
      if (matchingWallet && matchingWallet.privateKey) {
        logger.info('Found matching wallet for private key', { userId, walletAddress }, 'EnhancedWalletExportService');
        return matchingWallet.privateKey;
      }

      logger.warn('No matching private key found for wallet address', { userId, walletAddress }, 'EnhancedWalletExportService');
      return null;

    } catch (error) {
      logger.error('Failed to get private key for wallet', error, 'EnhancedWalletExportService');
      return null;
    }
  }

  /**
   * Get export instructions for external wallets
   */
  getExportInstructions(): string {
    return `To export your wallet to external apps like Phantom or Solflare:

SEED PHRASE EXPORT (Recommended):
1. Open your external wallet app
2. Look for "Import Wallet" or "Restore Wallet" option
3. Choose "Import from Seed Phrase" or "Restore from Mnemonic"
4. Enter your 24-word seed phrase exactly as shown
5. Follow the app's instructions to complete the import

PRIVATE KEY EXPORT (Alternative):
1. Open your external wallet app
2. Look for "Import Wallet" or "Add Account" option
3. Choose "Import from Private Key" or "Import from Secret Key"
4. Paste your private key (copied from this app)
5. Follow the app's instructions to complete the import

Your credentials are compatible with all BIP39-compatible wallets.`;
  }

  /**
   * Check if wallet can be exported (has either seed phrase or private key)
   * PRIORITY: Always check the active wallet first
   */
  async canExportWallet(userId: string, walletAddress?: string): Promise<{
    canExport: boolean;
    hasSeedPhrase: boolean;
    hasPrivateKey: boolean;
    recommendedWallet?: string;
    error?: string;
  }> {
    try {
      logger.info('Checking wallet export capability', { userId, walletAddress }, 'EnhancedWalletExportService');

      if (walletAddress) {
        // Check specific wallet
        const result = await this.exportSpecificWallet(userId, walletAddress, {
          includeSeedPhrase: true,
          includePrivateKey: true
        });

        return {
          canExport: result.success,
          hasSeedPhrase: !!result.seedPhrase,
          hasPrivateKey: !!result.privateKey,
          recommendedWallet: walletAddress,
          error: result.error
        };
      } else {
        // FIRST: Try to get the active wallet (the one the user is actually using)
        const { simplifiedWalletService } = await import('./simplifiedWalletService');
        const activeWalletResult = await simplifiedWalletService.ensureUserWallet(userId);
        
        if (activeWalletResult.success && activeWalletResult.wallet) {
          const activeWalletAddress = activeWalletResult.wallet.address;
          
          logger.info('Checking active wallet export capability', { 
            userId, 
            walletAddress: activeWalletAddress 
          }, 'EnhancedWalletExportService');

          // Check the active wallet first
          const activeResult = await this.exportSpecificWallet(userId, activeWalletAddress, {
            includeSeedPhrase: true,
            includePrivateKey: true
          });

          if (activeResult.success) {
            logger.info('Active wallet can be exported', { 
              userId, 
              walletAddress: activeWalletAddress,
              hasSeedPhrase: !!activeResult.seedPhrase,
              hasPrivateKey: !!activeResult.privateKey
            }, 'EnhancedWalletExportService');

            return {
              canExport: true,
              hasSeedPhrase: !!activeResult.seedPhrase,
              hasPrivateKey: !!activeResult.privateKey,
              recommendedWallet: activeWalletAddress
            };
          } else {
            logger.warn('Active wallet cannot be exported, analyzing alternatives', { 
              userId, 
              walletAddress: activeWalletAddress,
              error: activeResult.error
            }, 'EnhancedWalletExportService');
          }
        }

        // FALLBACK: Analyze all wallets and recommend best option
        logger.info('Analyzing all wallets for export options', { userId }, 'EnhancedWalletExportService');
        const analysis = await this.analyzeWalletExportOptions(userId);
        
        return {
          canExport: true,
          hasSeedPhrase: analysis.primaryWallet.hasSeedPhrase,
          hasPrivateKey: analysis.primaryWallet.hasPrivateKey,
          recommendedWallet: analysis.recommendedExport.walletAddress
        };
      }
    } catch (error) {
      logger.error('Failed to check wallet export capability', error, 'EnhancedWalletExportService');
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
export const enhancedWalletExportService = new EnhancedWalletExportService();
export { EnhancedWalletExportService };
