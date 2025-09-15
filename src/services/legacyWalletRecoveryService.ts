/**
 * Legacy Wallet Recovery Service
 * Handles recovery of wallets created with the old system that had mismatched keypairs and mnemonics
 */

import { Keypair } from '@solana/web3.js';
import { logger } from './loggingService';
import { secureStorageService } from './secureStorageService';
import { firebaseDataService } from './firebaseDataService';

export interface LegacyRecoveryResult {
  success: boolean;
  keypair?: Keypair;
  method?: string;
  error?: string;
}

export class LegacyWalletRecoveryService {
  
  /**
   * Attempt to recover a legacy wallet using various methods
   */
  static async recoverLegacyWallet(userId: string, expectedAddress: string): Promise<LegacyRecoveryResult> {
    try {
      logger.info('Attempting legacy wallet recovery', { userId, expectedAddress }, 'LegacyWalletRecoveryService');
      
      // Method 1: Check if there's a stored private key that we missed
      const privateKey = await secureStorageService.getPrivateKey(userId);
      if (privateKey) {
        try {
          const keyData = new Uint8Array(JSON.parse(privateKey));
          const keypair = Keypair.fromSecretKey(keyData);
          
          if (keypair.publicKey.toBase58() === expectedAddress) {
            logger.info('Found matching private key in secure storage', { expectedAddress }, 'LegacyWalletRecoveryService');
            return {
              success: true,
              keypair,
              method: 'stored_private_key'
            };
          }
        } catch (error) {
          logger.warn('Failed to parse stored private key', error, 'LegacyWalletRecoveryService');
        }
      }
      
      // Method 2: Try to find the original keypair in Firebase (if it was stored there)
      const user = await firebaseDataService.user.getCurrentUser(userId);
      if (user.wallet_secret_key) {
        try {
          const keyData = new Uint8Array(JSON.parse(user.wallet_secret_key));
          const keypair = Keypair.fromSecretKey(keyData);
          
          if (keypair.publicKey.toBase58() === expectedAddress) {
            logger.info('Found matching private key in Firebase', { expectedAddress }, 'LegacyWalletRecoveryService');
            
            // Store it in secure storage for future use
            await secureStorageService.storePrivateKey(userId, user.wallet_secret_key);
            
            return {
              success: true,
              keypair,
              method: 'firebase_private_key'
            };
          }
        } catch (error) {
          logger.warn('Failed to parse Firebase private key', error, 'LegacyWalletRecoveryService');
        }
      }
      
      // Method 3: Try to recover from the original wallet creation process
      // This is a last resort - we'll need to recreate the wallet with the same seed
      const seedPhrase = await secureStorageService.getSeedPhrase(userId);
      if (seedPhrase) {
        const recoveryResult = await this.trySeedPhraseRecovery(seedPhrase, expectedAddress);
        if (recoveryResult.success) {
          return recoveryResult;
        }
      }
      
      // Method 4: Check if this is a known wallet pattern
      const patternResult = await this.tryKnownPatterns(expectedAddress);
      if (patternResult.success) {
        return patternResult;
      }
      
      return {
        success: false,
        error: 'No recovery method found for this wallet'
      };
      
    } catch (error) {
      logger.error('Legacy wallet recovery failed', error, 'LegacyWalletRecoveryService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Try to recover using the seed phrase with various methods
   */
  private static async trySeedPhraseRecovery(seedPhrase: string, expectedAddress: string): Promise<LegacyRecoveryResult> {
    try {
      // Try the original deterministic method
      const seedBytes = new TextEncoder().encode(seedPhrase);
      const keypair = Keypair.fromSeed(seedBytes.slice(0, 32));
      
      if (keypair.publicKey.toBase58() === expectedAddress) {
        logger.info('Recovered wallet using original deterministic method', { expectedAddress }, 'LegacyWalletRecoveryService');
        return {
          success: true,
          keypair,
          method: 'original_deterministic'
        };
      }
      
      // Try with different seed encodings
      const encodings = [
        seedPhrase,
        seedPhrase.toLowerCase(),
        seedPhrase.toUpperCase(),
        seedPhrase.trim(),
        seedPhrase.replace(/\s+/g, ' '),
        seedPhrase.replace(/\s+/g, '')
      ];
      
      for (const encoding of encodings) {
        if (encoding !== seedPhrase) {
          const seedBytes = new TextEncoder().encode(encoding);
          const keypair = Keypair.fromSeed(seedBytes.slice(0, 32));
          
          if (keypair.publicKey.toBase58() === expectedAddress) {
            logger.info('Recovered wallet using modified seed encoding', { expectedAddress, encoding }, 'LegacyWalletRecoveryService');
            return {
              success: true,
              keypair,
              method: 'modified_encoding'
            };
          }
        }
      }
      
      return {
        success: false,
        error: 'Seed phrase recovery failed'
      };
      
    } catch (error) {
      logger.error('Seed phrase recovery failed', error, 'LegacyWalletRecoveryService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Try known wallet patterns (for testing or known wallets)
   */
  private static async tryKnownPatterns(expectedAddress: string): Promise<LegacyRecoveryResult> {
    try {
      // This is where you could add known wallet patterns
      // For example, if you have test wallets or known wallet addresses
      
      // Example: Check if this is a test wallet
      const testWallets = [
        // Add known test wallet addresses and their private keys here
      ];
      
      for (const testWallet of testWallets) {
        if (testWallet.address === expectedAddress) {
          const keypair = Keypair.fromSecretKey(new Uint8Array(testWallet.privateKey));
          return {
            success: true,
            keypair,
            method: 'known_pattern'
          };
        }
      }
      
      return {
        success: false,
        error: 'No known patterns matched'
      };
      
    } catch (error) {
      logger.error('Known pattern recovery failed', error, 'LegacyWalletRecoveryService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Create a new wallet for the user if recovery fails
   */
  static async createNewWalletForUser(userId: string): Promise<LegacyRecoveryResult> {
    try {
      logger.info('Creating new wallet for user after recovery failure', { userId }, 'LegacyWalletRecoveryService');
      
      // Get the old wallet address before we update it
      const user = await firebaseDataService.user.getCurrentUser(userId);
      const oldWalletAddress = user.wallet_address;
      
      // Generate a new keypair
      const newKeypair = Keypair.generate();
      const newAddress = newKeypair.publicKey.toBase58();
      
      // Update Firebase with new wallet address
      await firebaseDataService.user.updateUser(userId, {
        wallet_address: newAddress,
        wallet_public_key: newAddress
      });
      
      // Store the new private key
      const secretKeyArray = Array.from(newKeypair.secretKey);
      await secureStorageService.storePrivateKey(userId, JSON.stringify(secretKeyArray));
      
      // Clear balance cache since we have a new wallet
      const { userWalletService } = await import('./userWalletService');
      await userWalletService.clearBalanceCache(userId);
      
      // Attempt to recover funds from old wallet
      const { fundRecoveryService } = await import('./fundRecoveryService');
      
      if (oldWalletAddress && oldWalletAddress !== newAddress) {
        logger.info('Attempting to recover funds from old wallet', { userId, oldWalletAddress, newAddress }, 'LegacyWalletRecoveryService');
        
        try {
          const recoveryResult = await fundRecoveryService.recoverFundsFromOldWallet(
            userId,
            oldWalletAddress,
            newAddress
          );
          
          if (recoveryResult.success && recoveryResult.recoveredAmount && recoveryResult.recoveredAmount > 0) {
            logger.info('Successfully recovered funds from old wallet', {
              userId,
              oldWalletAddress,
              newAddress,
              recoveredAmount: recoveryResult.recoveredAmount
            }, 'LegacyWalletRecoveryService');
          } else {
            logger.info('No funds to recover from old wallet', { userId, oldWalletAddress, newAddress }, 'LegacyWalletRecoveryService');
          }
        } catch (recoveryError) {
          logger.warn('Fund recovery failed, but new wallet was created successfully', {
            userId,
            oldWalletAddress,
            newAddress,
            error: recoveryError.message
          }, 'LegacyWalletRecoveryService');
        }
      }
      
      logger.info('Created new wallet for user', { userId, newAddress }, 'LegacyWalletRecoveryService');
      
      return {
        success: true,
        keypair: newKeypair,
        method: 'new_wallet_created'
      };
      
    } catch (error) {
      logger.error('Failed to create new wallet for user', error, 'LegacyWalletRecoveryService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const legacyWalletRecoveryService = LegacyWalletRecoveryService;
