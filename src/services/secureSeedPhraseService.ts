/**
 * Secure Seed Phrase Service
 * Handles seed phrase generation, storage, and access without database storage
 * Complies with jurisdiction requirements by keeping seed phrases device-only
 */

import { secureStorageService } from './secureStorageService';
import { consolidatedWalletService } from './consolidatedWalletService';
import { logger } from './loggingService';
import * as bip39 from 'bip39';

export interface SeedPhraseInfo {
  mnemonic: string;
  address: string;
  walletType: 'app-generated';
  createdAt: number;
}

class SecureSeedPhraseService {
  private readonly SEED_PHRASE_KEY = 'secure_seed_phrase';
  private readonly WALLET_INFO_KEY = 'wallet_info';

  /**
   * Generate a cryptographically secure seed phrase (12 words for better UX)
   */
  async generateSecureSeedPhrase(): Promise<SeedPhraseInfo> {
    try {
      logger.info('Generating cryptographically secure seed phrase', null, 'SecureSeedPhrase');
      
      // Generate a cryptographically secure mnemonic (12 words for better user experience)
      const mnemonic = bip39.generateMnemonic(128); // 12 words - compatible with most wallets
      
      // Validate the generated mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Generated mnemonic is invalid');
      }

      // Create wallet from the mnemonic
      const walletInfo = await consolidatedWalletService.importWallet(mnemonic);
      
      const seedPhraseInfo: SeedPhraseInfo = {
        mnemonic,
        address: walletInfo.address,
        walletType: 'app-generated',
        createdAt: Date.now()
      };

      logger.info('Secure seed phrase generated successfully', { 
        address: walletInfo.address,
        wordCount: mnemonic.split(' ').length 
      }, 'SecureSeedPhrase');

      return seedPhraseInfo;
    } catch (error) {
      logger.error('Failed to generate secure seed phrase', error, 'SecureSeedPhrase');
      throw new Error('Failed to generate secure seed phrase');
    }
  }

  /**
   * Store seed phrase securely on device only (never in database)
   */
  async storeSeedPhraseSecurely(seedPhraseInfo: SeedPhraseInfo): Promise<void> {
    try {
      logger.info('Storing seed phrase securely on device', { 
        address: seedPhraseInfo.address 
      }, 'SecureSeedPhrase');

      // Store the mnemonic securely on device
      await secureStorageService.storeSecureData(
        this.SEED_PHRASE_KEY, 
        seedPhraseInfo.mnemonic
      );

      // Store wallet info (without sensitive data) for reference
      const walletInfo = {
        address: seedPhraseInfo.address,
        walletType: seedPhraseInfo.walletType,
        createdAt: seedPhraseInfo.createdAt
      };

      await secureStorageService.storeSecureData(
        this.WALLET_INFO_KEY,
        JSON.stringify(walletInfo)
      );

      logger.info('Seed phrase stored securely on device', { 
        address: seedPhraseInfo.address 
      }, 'SecureSeedPhrase');
    } catch (error) {
      logger.error('Failed to store seed phrase securely', error, 'SecureSeedPhrase');
      throw new Error('Failed to store seed phrase securely');
    }
  }

  /**
   * Retrieve seed phrase from secure device storage
   */
  async getSeedPhraseSecurely(): Promise<string | null> {
    try {
      logger.info('Retrieving seed phrase from secure device storage', null, 'SecureSeedPhrase');
      
      const mnemonic = await secureStorageService.getSecureData(this.SEED_PHRASE_KEY);
      
      if (mnemonic && bip39.validateMnemonic(mnemonic)) {
        logger.info('Seed phrase retrieved successfully from device storage', null, 'SecureSeedPhrase');
        return mnemonic;
      }

      logger.warn('No valid seed phrase found in device storage', null, 'SecureSeedPhrase');
      return null;
    } catch (error) {
      logger.error('Failed to retrieve seed phrase from device storage', error, 'SecureSeedPhrase');
      return null;
    }
  }

  /**
   * Get wallet info (without sensitive data)
   */
  async getWalletInfo(): Promise<{ address: string; walletType: string; createdAt: number } | null> {
    try {
      const walletInfoStr = await secureStorageService.getSecureData(this.WALLET_INFO_KEY);
      if (walletInfoStr) {
        return JSON.parse(walletInfoStr);
      }
      return null;
    } catch (error) {
      logger.error('Failed to retrieve wallet info', error, 'SecureSeedPhrase');
      return null;
    }
  }

  /**
   * Check if user has a secure seed phrase stored
   */
  async hasSecureSeedPhrase(): Promise<boolean> {
    try {
      const mnemonic = await this.getSeedPhraseSecurely();
      return mnemonic !== null && bip39.validateMnemonic(mnemonic);
    } catch (error) {
      logger.error('Failed to check for secure seed phrase', error, 'SecureSeedPhrase');
      return false;
    }
  }

  /**
   * Initialize secure wallet for user (SINGLE WALLET ONLY)
   * Each user gets exactly ONE app-generated wallet that can be exported to external providers
   * This should work with the existing app wallet created during signup
   */
  async initializeSecureWallet(userId: string): Promise<{ address: string; isNew: boolean }> {
    try {
      logger.info('Initializing secure wallet for user (single wallet only)', { userId }, 'SecureSeedPhrase');

      // First, check if user already has a secure seed phrase stored
      const existingMnemonic = await this.getSeedPhraseSecurely();
      
      if (existingMnemonic && bip39.validateMnemonic(existingMnemonic)) {
        // User already has their ONE secure wallet - return it
        const walletInfo = await this.getWalletInfo();
        if (walletInfo) {
          logger.info('User already has their single secure wallet', { 
            userId, 
            address: walletInfo.address 
          }, 'SecureSeedPhrase');
          return { address: walletInfo.address, isNew: false };
        }
      }

      // Check if user has an existing app wallet in Firebase
      try {
        const { firebaseDataService } = await import('./firebaseDataService');
        const existingUser = await firebaseDataService.user.getCurrentUser(userId);
        
        if (existingUser?.wallet_address && existingUser.wallet_address.trim() !== '') {
          logger.info('User has existing app wallet, retrieving seed phrase', { 
            userId, 
            existingWalletAddress: existingUser.wallet_address 
          }, 'SecureSeedPhrase');
          
          // Try to get the existing seed phrase from secure storage
          const existingSeedPhrase = await this.getExistingAppWalletSeedPhrase(userId);
          
          if (existingSeedPhrase && bip39.validateMnemonic(existingSeedPhrase)) {
            // Store the existing seed phrase in our secure storage
            const walletInfo = await consolidatedWalletService.importWallet(existingSeedPhrase);
            
            const seedPhraseInfo: SeedPhraseInfo = {
              mnemonic: existingSeedPhrase,
              address: walletInfo.address,
              walletType: 'app-generated',
              createdAt: Date.now()
            };
            
            await this.storeSeedPhraseSecurely(seedPhraseInfo);
            
            logger.info('Existing app wallet seed phrase retrieved and stored securely', { 
              userId, 
              address: walletInfo.address 
            }, 'SecureSeedPhrase');
            
            return { address: walletInfo.address, isNew: false };
          }
        }
      } catch (error) {
        logger.warn('Could not retrieve existing app wallet, will create new one', { userId, error }, 'SecureSeedPhrase');
      }

      // Only generate new wallet if no existing wallet found
      logger.info('Generating new secure wallet for user (no existing wallet found)', { userId }, 'SecureSeedPhrase');
      const seedPhraseInfo = await this.generateSecureSeedPhrase();
      
      // Store securely on device (this will be their ONLY app wallet)
      await this.storeSeedPhraseSecurely(seedPhraseInfo);

      logger.info('New secure wallet initialized successfully', { 
        userId, 
        address: seedPhraseInfo.address 
      }, 'SecureSeedPhrase');

      return { address: seedPhraseInfo.address, isNew: true };
    } catch (error) {
      logger.error('Failed to initialize secure wallet', error, 'SecureSeedPhrase');
      throw new Error('Failed to initialize secure wallet');
    }
  }

  /**
   * Clear all secure seed phrase data (for logout/account deletion)
   */
  async clearSecureSeedPhrase(): Promise<void> {
    try {
      logger.info('Clearing secure seed phrase data', null, 'SecureSeedPhrase');
      
      await secureStorageService.removeSecureData(this.SEED_PHRASE_KEY);
      await secureStorageService.removeSecureData(this.WALLET_INFO_KEY);
      
      logger.info('Secure seed phrase data cleared successfully', null, 'SecureSeedPhrase');
    } catch (error) {
      logger.error('Failed to clear secure seed phrase data', error, 'SecureSeedPhrase');
      throw new Error('Failed to clear secure seed phrase data');
    }
  }

  /**
   * Validate seed phrase format
   */
  validateSeedPhrase(seedPhrase: string): boolean {
    return bip39.validateMnemonic(seedPhrase);
  }

  /**
   * Get seed phrase word count
   */
  getSeedPhraseWordCount(seedPhrase: string): number {
    return seedPhrase.split(' ').length;
  }

  /**
   * Format seed phrase for display (with security warnings)
   */
  formatSeedPhraseForDisplay(seedPhrase: string): string[] {
    if (!this.validateSeedPhrase(seedPhrase)) {
      throw new Error('Invalid seed phrase format');
    }
    
    return seedPhrase.split(' ');
  }

  /**
   * Check if seed phrase is compatible with external wallets
   */
  isCompatibleWithExternalWallets(seedPhrase: string): boolean {
    if (!this.validateSeedPhrase(seedPhrase)) {
      return false;
    }
    
    const wordCount = this.getSeedPhraseWordCount(seedPhrase);
    // Most external wallets support 12-word BIP39 mnemonics
    return wordCount === 12;
  }

  /**
   * Get the existing app wallet seed phrase from secure storage
   * This retrieves the seed phrase that was created during user signup
   */
  async getExistingAppWalletSeedPhrase(userId: string): Promise<string | null> {
    try {
      logger.info('Retrieving existing app wallet seed phrase', { userId }, 'SecureSeedPhrase');
      
      // Use the same method that the original app wallet system uses
      const { secureStorageService } = await import('./secureStorageService');
      
      // The original app wallet system stores seed phrases using this method
      const seedPhrase = await secureStorageService.getSeedPhrase(userId);
      
      if (seedPhrase && bip39.validateMnemonic(seedPhrase)) {
        logger.info('Found existing app wallet seed phrase', { userId }, 'SecureSeedPhrase');
        return seedPhrase;
      }
      
      logger.warn('No existing app wallet seed phrase found', { userId }, 'SecureSeedPhrase');
      return null;
    } catch (error) {
      logger.error('Failed to retrieve existing app wallet seed phrase', error, 'SecureSeedPhrase');
      return null;
    }
  }

  /**
   * Get the single app wallet address for external linking
   */
  async getAppWalletAddress(): Promise<string | null> {
    try {
      const walletInfo = await this.getWalletInfo();
      return walletInfo?.address || null;
    } catch (error) {
      logger.error('Failed to get app wallet address', error, 'SecureSeedPhrase');
      return null;
    }
  }

  /**
   * Get export instructions for external wallets (single wallet)
   */
  getExportInstructions(): string {
    return `Your single app wallet can be exported to external providers using your 12-word seed phrase.

Compatible with:
• Phantom Wallet
• Solflare Wallet  
• Trust Wallet
• MetaMask
• And many others

To import your app wallet into another provider:
1. Open your preferred wallet app
2. Look for "Import Wallet" or "Restore Wallet"
3. Select "Import with Seed Phrase"
4. Enter your 12 words in order
5. Your wallet will be restored with all funds

Note: This is your single app-generated wallet. All your WeSplit funds will be accessible in the external wallet.`;
  }
}

export const secureSeedPhraseService = new SecureSeedPhraseService();
