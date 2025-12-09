/**
 * Shared Keypair Utilities
 * Centralizes keypair creation and management logic
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { logger } from '../core';

export interface KeypairCreationResult {
  success: boolean;
  keypair?: Keypair;
  format?: 'base64' | 'json_array' | 'hex' | 'base58' | 'comma_separated';
  error?: string;
}

// Base58 alphabet used by Solana
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Decode a base58 string to Uint8Array
 */
function base58ToUint8Array(base58: string): Uint8Array {
  const alphabet = BASE58_ALPHABET;
  const base = BigInt(58);

  // Validate all characters are in the base58 alphabet first
  for (let i = 0; i < base58.length; i++) {
    const char = base58[i];
    if (!alphabet.includes(char)) {
      throw new Error(`Invalid base58 character at position ${i}: '${char}' (char code: ${char.charCodeAt(0)})`);
    }
  }

  let result = BigInt(0);
  for (let i = 0; i < base58.length; i++) {
    const char = base58[i];
    const charIndex = alphabet.indexOf(char);
    if (charIndex === -1) {
      // This should never happen due to validation above, but keep for safety
      throw new Error(`Invalid base58 character: ${char} at position ${i}`);
    }
    result = result * base + BigInt(charIndex);
  }

  // Convert to Uint8Array using proper base58 decoding algorithm
  // This is the standard algorithm for base58 decoding
  const bytes: number[] = [];
  
  // Use proper integer division for BigInt
  while (result > 0) {
    const remainder = result % BigInt(256);
    bytes.unshift(Number(remainder));
    result = (result - remainder) / BigInt(256);
  }

  // For Solana private keys, we expect exactly 64 bytes
  // If we have fewer bytes, pad with leading zeros
  // If we have more bytes, take the last 64 bytes (shouldn't happen for valid keys)
  if (bytes.length < 64) {
    // Pad with leading zeros
    while (bytes.length < 64) {
      bytes.unshift(0);
    }
  } else if (bytes.length > 64) {
    // Take the last 64 bytes (rightmost bytes)
    return new Uint8Array(bytes.slice(-64));
  }

  return new Uint8Array(bytes);
}

export class KeypairUtils {
  /**
   * Create a keypair from secret key with automatic format detection
   * Handles both base64 and JSON array formats
   */
  static createKeypairFromSecretKey(secretKey: string): KeypairCreationResult {
    if (!secretKey || typeof secretKey !== 'string' || secretKey.trim().length === 0) {
      return {
        success: false,
        error: 'Secret key is empty or invalid'
      };
    }

    // Trim and clean the key - remove any whitespace, newlines, or control characters
    let trimmedKey = secretKey.trim();
    // Remove any non-printable characters that might have been added during encryption/decryption
    trimmedKey = trimmedKey.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    // Check if it's base58 format first (88 characters, common for Solana private keys)
    // Base58 uses characters: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    // Try base58 if length is 88 (standard Solana private key length)
    // CRITICAL: For 88-character keys, prioritize base58 over base64
    if (trimmedKey.length === 88) {
      logger.debug('KeypairUtils: Detected 88-character key, attempting base58 first', {
        keyPreview: trimmedKey.substring(0, 10) + '...',
        keyEnd: '...' + trimmedKey.substring(trimmedKey.length - 10)
      }, 'KeypairUtils');
      
      try {
        // Check if it looks like base58 (contains only base58 characters)
        // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
        // Excludes: 0, O, I, l to avoid confusion
        const isBase58Like = /^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmedKey);
        
        logger.debug('KeypairUtils: Base58 format check', {
          isBase58Like,
          keyLength: trimmedKey.length,
          firstChar: trimmedKey[0],
          lastChar: trimmedKey[trimmedKey.length - 1],
          allCharsValid: trimmedKey.split('').every(char => BASE58_ALPHABET.includes(char))
        }, 'KeypairUtils');
        
        if (isBase58Like) {
          logger.debug('KeypairUtils: Attempting base58 decode using bs58 library', {
            keyLength: trimmedKey.length
          }, 'KeypairUtils');
          
          try {
            // Use bs58 library for proper base58 decoding (standard for Solana)
            const secretKeyBuffer = bs58.decode(trimmedKey);
            
            logger.debug('KeypairUtils: Base58 decode successful', {
              bufferLength: secretKeyBuffer.length,
              expectedLength: 64
            }, 'KeypairUtils');
            
            if (secretKeyBuffer.length === 64) {
              try {
                const keypair = Keypair.fromSecretKey(secretKeyBuffer);
                
                logger.info('KeypairUtils: Created keypair from base58 format', {
                  publicKey: keypair.publicKey.toBase58(),
                  keyLength: trimmedKey.length,
                  bufferLength: secretKeyBuffer.length
                }, 'KeypairUtils');
                
                return { success: true, keypair, format: 'base58' };
              } catch (keypairError) {
                logger.error('Base58 decoded but Keypair.fromSecretKey failed', {
                  error: keypairError instanceof Error ? keypairError.message : String(keypairError),
                  bufferLength: secretKeyBuffer.length,
                  firstBytes: Array.from(secretKeyBuffer.slice(0, 5))
                }, 'KeypairUtils');
                // Fall through to try other formats
              }
            } else {
              logger.warn('Base58 decoded key has wrong length', {
                expected: 64,
                actual: secretKeyBuffer.length,
                keyLength: trimmedKey.length
              }, 'KeypairUtils');
              // Fall through to try other formats
            }
          } catch (base58DecodeError) {
            logger.error('Base58 decode failed using bs58 library', {
              error: base58DecodeError instanceof Error ? base58DecodeError.message : String(base58DecodeError),
              keyLength: trimmedKey.length,
              keyPreview: trimmedKey.substring(0, 20) + '...',
              invalidChars: trimmedKey.split('').filter(char => !BASE58_ALPHABET.includes(char))
            }, 'KeypairUtils');
            // Fall through to try other formats
          }
        } else {
          // Check which characters are invalid
          const invalidChars = trimmedKey.split('').filter(char => !BASE58_ALPHABET.includes(char));
          logger.debug('KeypairUtils: Key does not match base58 pattern', {
            keyLength: trimmedKey.length,
            invalidChars: invalidChars.slice(0, 10), // Log first 10 invalid chars
            invalidCharCount: invalidChars.length
          }, 'KeypairUtils');
        }
      } catch (base58Error) {
        // Not base58 or decode failed - try other formats
        logger.debug('Base58 decode failed or not base58, trying other formats', {
          error: base58Error instanceof Error ? base58Error.message : String(base58Error),
          keyLength: trimmedKey.length
        }, 'KeypairUtils');
      }
    }

    try {
      // Try base64 format (most common for stored keys)
      // Note: base64 decode might succeed even for invalid base64, so we need to check the result
      let secretKeyBuffer: Buffer;
      try {
        // Remove any padding issues or extra characters
        const cleanBase64 = trimmedKey.replace(/[^A-Za-z0-9+/=]/g, '');
        secretKeyBuffer = Buffer.from(cleanBase64, 'base64');
      } catch (decodeError) {
        // If clean base64 fails, try original trimmed key
        try {
          secretKeyBuffer = Buffer.from(trimmedKey, 'base64');
        } catch (retryError) {
          throw new Error(`Base64 decode failed: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`);
        }
      }
      
      // Verify it's a valid 64-byte key
      if (secretKeyBuffer.length === 64) {
        try {
          // Validate the buffer contains reasonable byte values (0-255)
          const hasInvalidBytes = secretKeyBuffer.some(byte => byte < 0 || byte > 255);
          if (hasInvalidBytes) {
            throw new Error('Buffer contains invalid byte values');
          }
          
          const keypair = Keypair.fromSecretKey(secretKeyBuffer);
          
          logger.info('KeypairUtils: Created keypair from base64 format', {
            publicKey: keypair.publicKey.toBase58(),
            keyLength: trimmedKey.length,
            bufferLength: secretKeyBuffer.length
          }, 'KeypairUtils');
          
          return { success: true, keypair, format: 'base64' };
        } catch (keypairError) {
          // If Keypair.fromSecretKey fails, log the actual error and rethrow
          const errorMsg = keypairError instanceof Error ? keypairError.message : String(keypairError);
          logger.error('KeypairUtils: Keypair.fromSecretKey failed for base64', {
            error: errorMsg,
            bufferLength: secretKeyBuffer.length,
            keyLength: trimmedKey.length,
            firstBytes: Array.from(secretKeyBuffer.slice(0, 5))
          }, 'KeypairUtils');
          throw new Error(`Keypair creation failed: ${errorMsg}`);
        }
      } else {
        throw new Error(`Invalid base64 key length: expected 64 bytes, got ${secretKeyBuffer.length}`);
      }
    } catch (base64Error) {
      try {
        // Try JSON array format as fallback
        const secretKeyArray = JSON.parse(trimmedKey);
        if (!Array.isArray(secretKeyArray)) {
          throw new Error('Secret key is not an array');
        }
        
        if (secretKeyArray.length !== 64) {
          throw new Error(`Invalid array length: expected 64, got ${secretKeyArray.length}`);
        }
        
        const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
        
        logger.info('KeypairUtils: Created keypair from JSON array format', {
          publicKey: keypair.publicKey.toBase58(),
          arrayLength: secretKeyArray.length
        }, 'KeypairUtils');
        
        return { success: true, keypair, format: 'json_array' };
      } catch (jsonError) {
        // Try hex format as another fallback (64 hex chars = 32 bytes, but Solana needs 64 bytes)
        // Actually, Solana secret keys are 64 bytes, so hex would be 128 chars
        try {
          if (/^[0-9a-fA-F]{128}$/.test(trimmedKey)) {
            // Hex format (128 hex chars = 64 bytes)
            const secretKeyBuffer = Buffer.from(trimmedKey, 'hex');
            if (secretKeyBuffer.length === 64) {
              const keypair = Keypair.fromSecretKey(secretKeyBuffer);
              
              logger.info('KeypairUtils: Created keypair from hex format', {
                publicKey: keypair.publicKey.toBase58()
              }, 'KeypairUtils');
              
              return { success: true, keypair, format: 'hex' };
            }
          }
        } catch (hexError) {
          // Continue to final error
        }

        // Last resort: try to detect if it's a raw Uint8Array string or other format
        // Check if it looks like it might be a direct array representation
        let finalError = jsonError;
        try {
          // Check if it's a comma-separated list of numbers (like "1,2,3,...")
          if (/^\d+(,\d+){63,}$/.test(trimmedKey)) {
            const numbers = trimmedKey.split(',').map(n => parseInt(n.trim(), 10));
            if (numbers.length === 64 && numbers.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
              const keypair = Keypair.fromSecretKey(new Uint8Array(numbers));
              
              logger.info('KeypairUtils: Created keypair from comma-separated format', {
                publicKey: keypair.publicKey.toBase58()
              }, 'KeypairUtils');
              
              return { success: true, keypair, format: 'comma_separated' };
            }
          }
        } catch (commaError) {
          finalError = commaError;
        }

        const errorMessage = `Failed to create keypair from secret key. Tried base64, JSON array, hex, and comma-separated formats. Base64 error: ${base64Error instanceof Error ? base64Error.message : String(base64Error)}, JSON error: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`;
        
        logger.error('KeypairUtils: Failed to create keypair from secret key', {
          keyLength: trimmedKey.length,
          keyPreview: trimmedKey.substring(0, 30) + '...',
          keyEnd: '...' + trimmedKey.substring(trimmedKey.length - 10),
          isBase64Like: /^[A-Za-z0-9+/=]+$/.test(trimmedKey),
          isJsonLike: trimmedKey.trim().startsWith('['),
          isHexLike: /^[0-9a-fA-F]+$/.test(trimmedKey),
          base64Error: base64Error instanceof Error ? base64Error.message : String(base64Error),
          jsonError: jsonError instanceof Error ? jsonError.message : String(jsonError),
          errorMessage
        }, 'KeypairUtils');
        
        return { 
          success: false, 
          error: errorMessage 
        };
      }
    }
  }

  /**
   * Convert keypair secret key to base64 format
   */
  static keypairToBase64(keypair: Keypair): string {
    return Buffer.from(keypair.secretKey).toString('base64');
  }

  /**
   * Convert keypair secret key to JSON array format
   */
  static keypairToJsonArray(keypair: Keypair): string {
    return JSON.stringify(Array.from(keypair.secretKey));
  }

  /**
   * Validate that a keypair matches an expected public key
   */
  static validateKeypairAddress(keypair: Keypair, expectedAddress: string): boolean {
    const actualAddress = keypair.publicKey.toBase58();
    const isValid = actualAddress === expectedAddress;
    
    if (!isValid) {
      logger.warn('KeypairUtils: Keypair address validation failed', {
        expectedAddress,
        actualAddress
      }, 'KeypairUtils');
    }
    
    return isValid;
  }

  /**
   * Create a keypair and validate it matches the expected address
   */
  static createAndValidateKeypair(secretKey: string, expectedAddress: string): KeypairCreationResult {
    const result = this.createKeypairFromSecretKey(secretKey);
    
    if (!result.success || !result.keypair) {
      return result; // Return the error result
    }
    
    if (!this.validateKeypairAddress(result.keypair, expectedAddress)) {
      return {
        success: false,
        error: `Keypair address mismatch. Expected: ${expectedAddress}, Got: ${result.keypair.publicKey.toBase58()}`
      };
    }
    
    return result;
  }
}

export const keypairUtils = KeypairUtils;
