/**
 * BIP39 Wallet Service
 * Proper BIP39 mnemonic generation and derivation for Solana wallets
 */

import * as bip39 from 'bip39';
import { Keypair } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { logger } from './loggingService';

export interface Bip39WalletResult {
  keypair: Keypair;
  mnemonic: string;
  address: string;
  publicKey: string;
  secretKey: string;
}

export class Bip39WalletService {
  
  /**
   * Generate a new BIP39 wallet with proper mnemonic and keypair correspondence
   */
  static generateWallet(): Bip39WalletResult {
    try {
      // Generate a proper BIP39 mnemonic
      const mnemonic = bip39.generateMnemonic(128); // 12 words
      
      // Derive the keypair from the mnemonic
      const keypair = this.deriveKeypairFromMnemonic(mnemonic);
      
      const address = keypair.publicKey.toBase58();
      const publicKey = keypair.publicKey.toBase58();
      const secretKey = Buffer.from(keypair.secretKey).toString('base64');
      
      logger.info('Generated BIP39 wallet', { 
        address,
        mnemonicLength: mnemonic.split(' ').length 
      }, 'Bip39WalletService');
      
      return {
        keypair,
        mnemonic,
        address,
        publicKey,
        secretKey
      };
    } catch (error) {
      logger.error('Failed to generate BIP39 wallet', error, 'Bip39WalletService');
      throw error;
    }
  }
  
  /**
   * Derive a keypair from a BIP39 mnemonic
   */
  static deriveKeypairFromMnemonic(mnemonic: string, derivationPath: string = "m/44'/501'/0'/0'"): Keypair {
    try {
      // Validate the mnemonic
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid BIP39 mnemonic');
      }
      
      // Convert mnemonic to seed
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      
      // Derive the key using the derivation path
      const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
      
      // Create keypair from derived seed
      const keypair = Keypair.fromSeed(derivedSeed);
      
      logger.info('Derived keypair from BIP39 mnemonic', { 
        address: keypair.publicKey.toBase58(),
        derivationPath 
      }, 'Bip39WalletService');
      
      return keypair;
    } catch (error) {
      logger.error('Failed to derive keypair from BIP39 mnemonic', error, 'Bip39WalletService');
      throw error;
    }
  }
  
  /**
   * Import wallet from BIP39 mnemonic
   */
  static importWalletFromMnemonic(mnemonic: string): Bip39WalletResult {
    try {
      // Derive the keypair from the mnemonic
      const keypair = this.deriveKeypairFromMnemonic(mnemonic);
      
      const address = keypair.publicKey.toBase58();
      const publicKey = keypair.publicKey.toBase58();
      const secretKey = Buffer.from(keypair.secretKey).toString('base64');
      
      logger.info('Imported BIP39 wallet from mnemonic', { 
        address,
        mnemonicLength: mnemonic.split(' ').length 
      }, 'Bip39WalletService');
      
      return {
        keypair,
        mnemonic,
        address,
        publicKey,
        secretKey
      };
    } catch (error) {
      logger.error('Failed to import BIP39 wallet from mnemonic', error, 'Bip39WalletService');
      throw error;
    }
  }
  
  /**
   * Validate a BIP39 mnemonic
   */
  static validateMnemonic(mnemonic: string): boolean {
    try {
      return bip39.validateMnemonic(mnemonic);
    } catch (error) {
      logger.error('Failed to validate BIP39 mnemonic', error, 'Bip39WalletService');
      return false;
    }
  }
  
  /**
   * Try to recover wallet from mnemonic with different derivation paths
   */
  static tryRecoverWalletFromMnemonic(mnemonic: string, expectedAddress: string): Bip39WalletResult | null {
    try {
      const derivationPaths = [
        "m/44'/501'/0'/0'", // Standard Solana derivation path
        "m/44'/501'/0'/0",   // Without final apostrophe
        "m/44'/501'/0'",     // Shorter path
        "m/44'/501'",        // Even shorter
        "m/44'",             // Very short
        "m"                  // Root
      ];
      
      for (const path of derivationPaths) {
        try {
          const keypair = this.deriveKeypairFromMnemonic(mnemonic, path);
          if (keypair.publicKey.toBase58() === expectedAddress) {
            logger.info('Successfully recovered wallet with derivation path', { 
              address: expectedAddress,
              derivationPath: path 
            }, 'Bip39WalletService');
            
            return {
              keypair,
              mnemonic,
              address: keypair.publicKey.toBase58(),
              publicKey: keypair.publicKey.toBase58(),
              secretKey: Buffer.from(keypair.secretKey).toString('base64')
            };
          }
        } catch (pathError) {
          // Continue to next path
          continue;
        }
      }
      
      logger.warn('Could not recover wallet from mnemonic with any derivation path', { 
        expectedAddress,
        mnemonicLength: mnemonic.split(' ').length 
      }, 'Bip39WalletService');
      
      return null;
    } catch (error) {
      logger.error('Failed to try recover wallet from mnemonic', error, 'Bip39WalletService');
      return null;
    }
  }
  
  /**
   * Check if a mnemonic is a valid BIP39 mnemonic
   */
  static isBip39Mnemonic(mnemonic: string): boolean {
    try {
      const words = mnemonic.trim().split(/\s+/);
      
      // Check if it's 12 or 24 words
      if (words.length !== 12 && words.length !== 24) {
        return false;
      }
      
      // Check if it's a valid BIP39 mnemonic
      return bip39.validateMnemonic(mnemonic);
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const bip39WalletService = Bip39WalletService;
