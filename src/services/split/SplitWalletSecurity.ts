/**
 * Split Wallet Security Service
 * Handles private key storage and security operations for split wallets
 * Part of the modularized SplitWalletService
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from '../loggingService';

export class SplitWalletSecurity {
  private static readonly PRIVATE_KEY_PREFIX = 'split_wallet_private_key_';

  /**
   * Store split wallet private key securely in local storage
   * SECURITY: Private keys are NEVER stored in Firebase
   */
  static async storeSplitWalletPrivateKey(
    splitWalletId: string, 
    creatorId: string, 
    privateKey: string
  ): Promise<{ success: boolean; error?: string }> {
    try {

      if (!privateKey || typeof privateKey !== 'string') {
        return {
          success: false,
          error: 'Invalid private key provided',
        };
      }

      // Create a unique key for this split wallet and creator combination
      const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      // Store the private key securely
      await SecureStore.setItemAsync(storageKey, privateKey);


      logger.info('Split wallet private key stored securely', {
        splitWalletId,
        creatorId,
        storageKey
      }, 'SplitWalletSecurity');

      return { success: true };

    } catch (error) {
      console.error('🔍 SplitWalletSecurity: Error storing split wallet private key:', error);
      logger.error('Failed to store split wallet private key', error, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if local private key exists for split wallet
   */
  static async hasLocalPrivateKey(
    splitWalletId: string, 
    creatorId: string
  ): Promise<{ success: boolean; hasKey: boolean; error?: string }> {
    try {

      const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      // Check if the key exists
      const privateKey = await SecureStore.getItemAsync(storageKey);
      const hasKey = !!privateKey;


      return { 
        success: true, 
        hasKey 
      };

    } catch (error) {
      console.error('🔍 SplitWalletSecurity: Error checking for local private key:', error);
      logger.error('Failed to check for local private key', error, 'SplitWalletSecurity');
      return {
        success: false,
        hasKey: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get split wallet private key from local storage
   * SECURITY: Only the creator can access their split wallet's private key
   */
  static async getSplitWalletPrivateKey(
    splitWalletId: string, 
    requesterId: string
  ): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {

      const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${requesterId}`;
      
      // Retrieve the private key from secure storage
      const privateKey = await SecureStore.getItemAsync(storageKey);
      
      if (!privateKey) {
        
        return {
          success: false,
          error: `Private key not found in local storage for split wallet ${splitWalletId}`,
        };
      }


      logger.info('Split wallet private key retrieved from local storage', {
        splitWalletId,
        requesterId
      }, 'SplitWalletSecurity');

      return { 
        success: true, 
        privateKey 
      };

    } catch (error) {
      console.error('🔍 SplitWalletSecurity: Error retrieving split wallet private key:', error);
      logger.error('Failed to retrieve split wallet private key', error, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Delete split wallet private key from local storage
   * Used when a split is completed or cancelled
   */
  static async deleteSplitWalletPrivateKey(
    splitWalletId: string, 
    creatorId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {

      const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      // Delete the private key from secure storage
      await SecureStore.deleteItemAsync(storageKey);


      logger.info('Split wallet private key deleted from local storage', {
        splitWalletId,
        creatorId
      }, 'SplitWalletSecurity');

      return { success: true };

    } catch (error) {
      console.error('🔍 SplitWalletSecurity: Error deleting split wallet private key:', error);
      logger.error('Failed to delete split wallet private key', error, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * List all stored split wallet private keys for a creator
   * Used for debugging and cleanup purposes
   */
  static async listStoredPrivateKeys(
    creatorId: string
  ): Promise<{ success: boolean; keys: string[]; error?: string }> {
    try {

      // Note: SecureStore doesn't provide a way to list all keys
      // This is a limitation of the secure storage implementation
      // In a real implementation, you might want to maintain a separate index
      
      
      return {
        success: true,
        keys: [],
        error: 'SecureStore does not support listing all stored keys'
      };

    } catch (error) {
      console.error('🔍 SplitWalletSecurity: Error listing stored private keys:', error);
      logger.error('Failed to list stored private keys', error, 'SplitWalletSecurity');
      return {
        success: false,
        keys: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Clean up old private keys (for maintenance)
   * This would require maintaining a separate index of stored keys
   */
  static async cleanupOldPrivateKeys(
    olderThanDays: number = 30
  ): Promise<{ success: boolean; cleanedCount: number; error?: string }> {
    try {

      // Note: This is a placeholder implementation
      // In a real implementation, you would need to maintain a separate index
      // of stored keys with timestamps to enable cleanup
      
      
      return {
        success: true,
        cleanedCount: 0,
        error: 'Cleanup not implemented - requires key index'
      };

    } catch (error) {
      console.error('🔍 SplitWalletSecurity: Error cleaning up old private keys:', error);
      logger.error('Failed to cleanup old private keys', error, 'SplitWalletSecurity');
      return {
        success: false,
        cleanedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
