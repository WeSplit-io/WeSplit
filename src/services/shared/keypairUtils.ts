/**
 * Shared Keypair Utilities
 * Centralizes keypair creation and management logic
 */

import { Keypair } from '@solana/web3.js';
import { logger } from '../loggingService';

export interface KeypairCreationResult {
  success: boolean;
  keypair?: Keypair;
  format?: 'base64' | 'json_array';
  error?: string;
}

export class KeypairUtils {
  /**
   * Create a keypair from secret key with automatic format detection
   * Handles both base64 and JSON array formats
   */
  static createKeypairFromSecretKey(secretKey: string): KeypairCreationResult {
    try {
      // Try base64 format first
      const secretKeyBuffer = Buffer.from(secretKey, 'base64');
      const keypair = Keypair.fromSecretKey(secretKeyBuffer);
      
      logger.info('KeypairUtils: Created keypair from base64 format', {
        publicKey: keypair.publicKey.toBase58()
      }, 'KeypairUtils');
      
      return { success: true, keypair, format: 'base64' };
    } catch (base64Error) {
      try {
        // Try JSON array format as fallback
        const secretKeyArray = JSON.parse(secretKey);
        if (!Array.isArray(secretKeyArray)) {
          throw new Error('Secret key is not an array');
        }
        
        const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
        
        logger.info('KeypairUtils: Created keypair from JSON array format', {
          publicKey: keypair.publicKey.toBase58(),
          arrayLength: secretKeyArray.length
        }, 'KeypairUtils');
        
        return { success: true, keypair, format: 'json_array' };
      } catch (jsonError) {
        const errorMessage = `Failed to create keypair from secret key. Base64 error: ${base64Error instanceof Error ? base64Error.message : String(base64Error)}, JSON error: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`;
        
        logger.error('KeypairUtils: Failed to create keypair from secret key', {
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
