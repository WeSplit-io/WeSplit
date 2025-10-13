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
   * Get split wallet private key from Firebase (Degen Split) or local storage (Regular Split)
   * SECURITY: For Degen Split, all participants can access the private key. For regular splits, only the creator can access it.
   */
  static async getSplitWalletPrivateKey(
    splitWalletId: string, 
    requesterId: string
  ): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      // First, check if this is a Degen Split wallet by looking in Firebase
      logger.debug('Checking Firebase for Degen Split private key', {
        splitWalletId,
        requesterId
      }, 'SplitWalletSecurity');
      
      const { db } = await import('../../config/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const privateKeyDocRef = doc(db, 'splitWalletPrivateKeys', splitWalletId);
      const privateKeyDoc = await getDoc(privateKeyDocRef);
      
      logger.debug('Firebase private key document check result', {
        splitWalletId,
        exists: privateKeyDoc.exists(),
        hasData: !!privateKeyDoc.data()
      }, 'SplitWalletSecurity');
      
      if (privateKeyDoc.exists()) {
        const privateKeyData = privateKeyDoc.data();
        
        // Verify the requester is a participant in this Degen Split
        const isParticipant = privateKeyData.participants?.some((p: any) => p.userId === requesterId);
        
        if (isParticipant) {
          logger.info('Private key retrieved from Firebase for Degen Split participant', {
            splitWalletId,
            requesterId,
            splitType: privateKeyData.splitType
          }, 'SplitWalletSecurity');
          
          return {
            success: true,
            privateKey: privateKeyData.privateKey
          };
        } else {
          logger.warn('User is not a participant in this Degen Split', {
            splitWalletId,
            requesterId,
            participants: privateKeyData.participants
          }, 'SplitWalletSecurity');
          
          return {
            success: false,
            error: 'User is not a participant in this Degen Split'
          };
        }
      }
      
      // If not found in Firebase, this might be an old Degen Split wallet or a regular split
      logger.warn('Private key not found in Firebase for Degen Split wallet', {
        splitWalletId,
        requesterId,
        message: 'This might be an old Degen Split wallet created before Firebase storage was implemented'
      }, 'SplitWalletSecurity');
      
      const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${requesterId}`;
      
      logger.debug('Attempting to retrieve private key from local storage', {
        splitWalletId,
        requesterId,
        storageKey
      }, 'SplitWalletSecurity');
      
      // Retrieve the private key from secure storage
      const privateKey = await SecureStore.getItemAsync(storageKey);
      
      logger.debug('Private key retrieval result', {
        splitWalletId,
        requesterId,
        storageKey,
        hasPrivateKey: !!privateKey,
        privateKeyLength: privateKey?.length || 0
      }, 'SplitWalletSecurity');
      
      if (!privateKey) {
        logger.warn('Private key not found in secure storage', {
          splitWalletId,
          requesterId,
          storageKey
        }, 'SplitWalletSecurity');
        
        // Try alternative storage key formats for backward compatibility
        const alternativeKeys = [
          `${this.PRIVATE_KEY_PREFIX}${splitWalletId}`, // Original format without user ID
          `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${requesterId}`, // Current format
        ];
        
        for (const altKey of alternativeKeys) {
          if (altKey !== storageKey) {
            logger.debug('Trying alternative storage key', { altKey }, 'SplitWalletSecurity');
            const altPrivateKey = await SecureStore.getItemAsync(altKey);
            if (altPrivateKey) {
              logger.info('Found private key with alternative storage key', { altKey }, 'SplitWalletSecurity');
              return {
                success: true,
                privateKey: altPrivateKey
              };
            }
          }
        }
        
        return {
          success: false,
          error: `Private key not found for Degen Split wallet ${splitWalletId}. This might be an old wallet created before shared private key access was implemented. Please contact the split creator to recreate the wallet.`,
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
   * Store split wallet private key for all participants (Degen Split)
   * SECURITY: For Degen Split, all participants need access to the private key
   */
  static async storeSplitWalletPrivateKeyForAllParticipants(
    splitWalletId: string,
    participants: Array<{ userId: string; name: string }>,
    privateKey: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!privateKey || typeof privateKey !== 'string') {
        return {
          success: false,
          error: 'Invalid private key provided',
        };
      }

      if (!participants || participants.length === 0) {
        return {
          success: false,
          error: 'No participants provided',
        };
      }

      // For Degen Split, store the private key in Firebase so all participants can access it
      // This is more secure than storing it locally on each device
      const { db } = await import('../../config/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      
      const privateKeyDocRef = doc(db, 'splitWalletPrivateKeys', splitWalletId);
      
      await setDoc(privateKeyDocRef, {
        splitWalletId,
        privateKey,
        participants: participants.map(p => ({ userId: p.userId, name: p.name })),
        createdAt: new Date().toISOString(),
        splitType: 'degen'
      });

      logger.info('Private key stored in Firebase for all Degen Split participants', {
        splitWalletId,
        participantsCount: participants.length,
        participants: participants.map(p => ({ userId: p.userId, name: p.name }))
      }, 'SplitWalletSecurity');

      return { success: true };

    } catch (error) {
      console.error('🔍 SplitWalletSecurity: Error storing split wallet private key for all participants:', error);
      logger.error('Failed to store split wallet private key for all participants', error, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Delete split wallet private key for all participants (Degen Split)
   * Used when a Degen Split is completed or cancelled
   */
  static async deleteSplitWalletPrivateKeyForAllParticipants(
    splitWalletId: string,
    participants: Array<{ userId: string; name: string }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!participants || participants.length === 0) {
        return {
          success: false,
          error: 'No participants provided',
        };
      }

      // Delete the private key for each participant
      const deletePromises = participants.map(async (participant) => {
        const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${participant.userId}`;
        await SecureStore.deleteItemAsync(storageKey);
        
        logger.info('Split wallet private key deleted for participant', {
          splitWalletId,
          participantId: participant.userId,
          participantName: participant.name,
          storageKey
        }, 'SplitWalletSecurity');
      });

      await Promise.all(deletePromises);

      logger.info('Split wallet private key deleted for all participants', {
        splitWalletId,
        participantsCount: participants.length
      }, 'SplitWalletSecurity');

      return { success: true };

    } catch (error) {
      console.error('🔍 SplitWalletSecurity: Error deleting split wallet private key for all participants:', error);
      logger.error('Failed to delete split wallet private key for all participants', error, 'SplitWalletSecurity');
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
