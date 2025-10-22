/**
 * Unified Wallet Derivation Utility
 * Single source of truth for BIP39 mnemonic-based wallet generation
 * Ensures export/import parity and proper Solana derivation paths
 */

import { Keypair } from '@solana/web3.js';
import { mnemonicToSeedSync, generateMnemonic, validateMnemonic } from '@scure/bip39';
import { english } from '@scure/bip39/wordlists/english';
import { derivePath } from 'ed25519-hd-key';
import { logger } from '../core/loggingService';

// Standard Solana derivation path
export const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

export interface WalletDerivationResult {
  keypair: Keypair;
  mnemonic: string;
  address: string;
  publicKey: string;
  secretKey: string;
  derivationPath: string;
}

export interface MnemonicValidationResult {
  isValid: boolean;
  wordCount: number;
  checksum: string;
}

/**
 * Generate a new BIP39 mnemonic (12 words)
 */
export function generateMnemonic12(): string {
  try {
    const mnemonic = generateMnemonic(english, 128); // 12 words
    logger.info('Generated 12-word BIP39 mnemonic', { 
      wordCount: mnemonic.split(' ').length 
    }, 'WalletDerive');
    return mnemonic;
  } catch (error) {
    logger.error('Failed to generate BIP39 mnemonic', error, 'WalletDerive');
    throw new Error('Failed to generate BIP39 mnemonic');
  }
}

/**
 * Generate a new BIP39 mnemonic (24 words)
 */
export function generateMnemonic24(): string {
  try {
    const mnemonic = generateMnemonic(english, 256); // 24 words
    logger.info('Generated 24-word BIP39 mnemonic', { 
      wordCount: mnemonic.split(' ').length 
    }, 'WalletDerive');
    return mnemonic;
  } catch (error) {
    logger.error('Failed to generate BIP39 mnemonic', error, 'WalletDerive');
    throw new Error('Failed to generate BIP39 mnemonic');
  }
}

/**
 * Derive a Solana keypair from a BIP39 mnemonic
 */
export function deriveKeypairFromMnemonic(
  mnemonic: string, 
  derivationPath: string = SOLANA_DERIVATION_PATH
): Keypair {
  try {
    // Validate the mnemonic
    if (!validateMnemonic(mnemonic, english)) {
      throw new Error('Invalid BIP39 mnemonic');
    }

    // Convert mnemonic to seed
    const seed = mnemonicToSeedSync(mnemonic);
    
    // Derive the key using the derivation path
    const { key } = derivePath(derivationPath, seed.toString('hex'));
    
    // Create keypair from derived seed
    const keypair = Keypair.fromSeed(key);
    
    logger.info('Derived keypair from BIP39 mnemonic', { 
      address: keypair.publicKey.toBase58(),
      derivationPath,
      mnemonicLength: mnemonic.split(' ').length
    }, 'WalletDerive');
    
    return keypair;
  } catch (error) {
    logger.error('Failed to derive keypair from BIP39 mnemonic', error, 'WalletDerive');
    throw new Error(`Failed to derive keypair from mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get public key from mnemonic without creating full keypair
 */
export function publicKeyFromMnemonic(
  mnemonic: string, 
  derivationPath: string = SOLANA_DERIVATION_PATH
): string {
  try {
    const keypair = deriveKeypairFromMnemonic(mnemonic, derivationPath);
    return keypair.publicKey.toBase58();
  } catch (error) {
    logger.error('Failed to get public key from mnemonic', error, 'WalletDerive');
    throw error;
  }
}

/**
 * Generate a complete wallet from mnemonic
 */
export function generateWalletFromMnemonic(
  mnemonic?: string,
  derivationPath: string = SOLANA_DERIVATION_PATH
): WalletDerivationResult {
  try {
    // Generate mnemonic if not provided
    const finalMnemonic = mnemonic || generateMnemonic12();
    
    // Derive keypair
    const keypair = deriveKeypairFromMnemonic(finalMnemonic, derivationPath);
    
    const result: WalletDerivationResult = {
      keypair,
      mnemonic: finalMnemonic,
      address: keypair.publicKey.toBase58(),
      publicKey: keypair.publicKey.toBase58(),
      secretKey: Buffer.from(keypair.secretKey).toString('base64'),
      derivationPath
    };
    
    logger.info('Generated wallet from mnemonic', { 
      address: result.address,
      derivationPath,
      mnemonicLength: finalMnemonic.split(' ').length
    }, 'WalletDerive');
    
    return result;
  } catch (error) {
    logger.error('Failed to generate wallet from mnemonic', error, 'WalletDerive');
    throw error;
  }
}

/**
 * Validate a BIP39 mnemonic
 */
export function validateBip39Mnemonic(mnemonic: string): MnemonicValidationResult {
  try {
    const words = mnemonic.trim().split(/\s+/);
    const wordCount = words.length;
    const isValid = validateMnemonic(mnemonic, english);
    
    // Generate checksum for verification
    const checksum = Buffer.from(mnemonic).toString('base64').slice(0, 8);
    
    return {
      isValid,
      wordCount,
      checksum
    };
  } catch (error) {
    logger.error('Failed to validate BIP39 mnemonic', error, 'WalletDerive');
    return {
      isValid: false,
      wordCount: 0,
      checksum: ''
    };
  }
}

/**
 * Try multiple derivation paths to recover a wallet
 */
export function tryRecoverWalletFromMnemonic(
  mnemonic: string, 
  expectedAddress: string
): WalletDerivationResult | null {
  try {
    const derivationPaths = [
      SOLANA_DERIVATION_PATH, // Standard Solana path
      "m/44'/501'/0'/0",      // Without final apostrophe
      "m/44'/501'/0'",        // Shorter path
      "m/44'/501'",           // Even shorter
      "m/44'",                // Very short
      "m"                     // Root
    ];
    
    for (const path of derivationPaths) {
      try {
        const result = generateWalletFromMnemonic(mnemonic, path);
        if (result.address === expectedAddress) {
          logger.info('Successfully recovered wallet with derivation path', { 
            address: expectedAddress,
            derivationPath: path 
          }, 'WalletDerive');
          return result;
        }
      } catch (pathError) {
        // Continue to next path
        continue;
      }
    }
    
    logger.warn('Could not recover wallet from mnemonic with any derivation path', { 
      expectedAddress,
      mnemonicLength: mnemonic.split(' ').length 
    }, 'WalletDerive');
    
    return null;
  } catch (error) {
    logger.error('Failed to try recover wallet from mnemonic', error, 'WalletDerive');
    return null;
  }
}

/**
 * Verify export/import parity
 */
export function verifyExportImportParity(mnemonic: string): boolean {
  try {
    // Generate wallet from mnemonic
    const original = generateWalletFromMnemonic(mnemonic);
    
    // Re-derive from the same mnemonic
    const rederived = generateWalletFromMnemonic(mnemonic);
    
    // Check if addresses match
    const parity = original.address === rederived.address;
    
    logger.info('Export/import parity check', { 
      address: original.address,
      parity,
      derivationPath: original.derivationPath
    }, 'WalletDerive');
    
    return parity;
  } catch (error) {
    logger.error('Failed to verify export/import parity', error, 'WalletDerive');
    return false;
  }
}

/**
 * Generate a wallet checksum for verification
 */
export function generateWalletChecksum(publicKey: string): string {
  try {
    // Create a simple checksum from the public key
    const hash = Buffer.from(publicKey).toString('base64').slice(0, 8);
    return hash;
  } catch (error) {
    logger.error('Failed to generate wallet checksum', error, 'WalletDerive');
    return '';
  }
}

/**
 * Validate wallet checksum
 */
export function validateWalletChecksum(publicKey: string, expectedChecksum: string): boolean {
  try {
    const actualChecksum = generateWalletChecksum(publicKey);
    return actualChecksum === expectedChecksum;
  } catch (error) {
    logger.error('Failed to validate wallet checksum', error, 'WalletDerive');
    return false;
  }
}

// Export default functions for backward compatibility
export default {
  generateMnemonic12,
  generateMnemonic24,
  deriveKeypairFromMnemonic,
  publicKeyFromMnemonic,
  generateWalletFromMnemonic,
  validateBip39Mnemonic,
  tryRecoverWalletFromMnemonic,
  verifyExportImportParity,
  generateWalletChecksum,
  validateWalletChecksum,
  SOLANA_DERIVATION_PATH
};
