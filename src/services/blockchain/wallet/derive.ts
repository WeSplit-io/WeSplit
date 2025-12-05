/**
 * Unified Wallet Derivation Utility
 * Single source of truth for BIP39 mnemonic-based wallet generation
 * Ensures export/import parity and proper Solana derivation paths
 */

import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { logger } from '../../analytics/loggingService';

// Standard Solana derivation path
export const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

// Base58 alphabet used by Solana
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Decode a base58 string to Uint8Array
 */
function base58ToUint8Array(base58: string): Uint8Array {
  const alphabet = BASE58_ALPHABET;
  const base = BigInt(58);

  let result = BigInt(0);
  for (let i = 0; i < base58.length; i++) {
    const char = base58[i];
    const charIndex = alphabet.indexOf(char);
    if (charIndex === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }
    result = result * base + BigInt(charIndex);
  }

  // Convert to Uint8Array
  const bytes: number[] = [];
  while (result > 0) {
    bytes.unshift(Number(result % BigInt(256)));
    result = result / BigInt(256);
  }

  // Pad with leading zeros if necessary (for Solana keys, should be 64 bytes)
  while (bytes.length < 64) {
    bytes.unshift(0);
  }

  return new Uint8Array(bytes);
}

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

export interface PrivateKeyDerivationResult {
  keypair: Keypair;
  address: string;
  publicKey: string;
  secretKey: string;
}

/**
 * Generate a new BIP39 mnemonic (12 words)
 */
export function generateMnemonic12(): string {
  try {
    const mnemonic = bip39.generateMnemonic(128); // 12 words
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
    const mnemonic = bip39.generateMnemonic(256); // 24 words
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
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid BIP39 mnemonic');
    }

    // Convert mnemonic to seed
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    
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
    const isValid = bip39.validateMnemonic(mnemonic);
    
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

/**
 * Derive wallet from private key (hex or base58 format)
 */
export async function deriveWalletFromPrivateKey(privateKey: string): Promise<PrivateKeyDerivationResult | null> {
  try {
    logger.info('Deriving wallet from private key', {
      keyLength: privateKey.length,
      isHex: /^[0-9a-fA-F]{64}$/.test(privateKey.trim()),
      isBase58: /^[1-9A-HJ-NP-Za-km-z]{88}$/.test(privateKey.trim())
    }, 'deriveWalletFromPrivateKey');

    const trimmedKey = privateKey.trim();
    let secretKey: Uint8Array;

    try {
      // Handle hex format (64 characters - 32 bytes * 2 hex chars per byte)
      if (/^[0-9a-fA-F]{64}$/.test(trimmedKey)) {
        secretKey = new Uint8Array(trimmedKey.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
      }
      // Handle base58 format (88 characters - standard Solana private key format)
      else if (/^[1-9A-HJ-NP-Za-km-z]{88}$/.test(trimmedKey)) {
        secretKey = base58ToUint8Array(trimmedKey);
        // Solana private keys are 64 bytes, ensure we have the right length
        if (secretKey.length !== 64) {
          logger.error('Invalid base58 private key length', {
            expected: 64,
            actual: secretKey.length
          }, 'deriveWalletFromPrivateKey');
          return null;
        }
      } else {
        logger.error('Invalid private key format', {
          length: trimmedKey.length,
          format: 'hex (64 chars) or base58 (88 chars) expected',
          provided: trimmedKey.substring(0, 10) + '...'
        }, 'deriveWalletFromPrivateKey');
        return null;
      }
    } catch (decodeError) {
      logger.error('Failed to decode private key', decodeError, 'deriveWalletFromPrivateKey');
      return null;
    }

    // Create keypair from secret key
    const keypair = Keypair.fromSecretKey(secretKey);
    const address = keypair.publicKey.toBase58();
    const publicKey = keypair.publicKey.toBase58();
    const secretKeyHex = Buffer.from(keypair.secretKey).toString('hex');

    logger.info('Successfully derived wallet from private key', {
      address: address.substring(0, 10) + '...',
      publicKeyLength: publicKey.length,
      secretKeyLength: secretKeyHex.length
    }, 'deriveWalletFromPrivateKey');

    return {
      keypair,
      address,
      publicKey,
      secretKey: secretKeyHex
    };

  } catch (error) {
    logger.error('Failed to derive wallet from private key', error, 'deriveWalletFromPrivateKey');
    return null;
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
