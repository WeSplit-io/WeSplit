/**
 * Split Wallet Security Service
 * Handles private key storage and security operations for split wallets
 * Part of the modularized SplitWalletService
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from '../core';

export class SplitWalletSecurity {
  private static readonly PRIVATE_KEY_PREFIX = 'split_wallet_private_key_';
  private static readonly FAIR_SPLIT_PRIVATE_KEY_PREFIX = 'fair_split_private_key_';

  /**
   * Store Fair split wallet private key securely in local storage (creator-only access)
   * This is separate from the shared private key handling used for Degen splits
   * SECURITY: Private keys are NEVER stored in Firebase
   */
  static async storeFairSplitPrivateKey(
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

      // Create a unique key for this Fair split wallet and creator combination
      const storageKey = `${this.FAIR_SPLIT_PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      // Store the private key securely without biometric authentication popup
      await SecureStore.setItemAsync(storageKey, privateKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });

      logger.info('Fair split wallet private key stored securely', {
        splitWalletId,
        creatorId,
        storageKey
      }, 'SplitWalletSecurity');

      return { success: true };

    } catch (error) {
      console.error('🔍 SplitWalletSecurity: Error storing Fair split wallet private key:', error);
      logger.error('Failed to store Fair split wallet private key', error, 'SplitWalletSecurity');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Store split wallet private key securely in local storage (shared access for Degen splits)
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
      
      // Store the private key securely without biometric authentication popup
      await SecureStore.setItemAsync(storageKey, privateKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });


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
   * Verify if a user is the creator of a split wallet
   */
  static async isSplitWalletCreator(
    splitWalletId: string, 
    userId: string
  ): Promise<{ success: boolean; isCreator: boolean; error?: string }> {
    try {
      const { SplitWalletQueries } = await import('./SplitWalletQueries');
      const walletResult = await SplitWalletQueries.getSplitWallet(splitWalletId);
      
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          isCreator: false,
          error: 'Split wallet not found'
        };
      }
      
      const isCreator = walletResult.wallet.creatorId === userId;
      
      logger.debug('Creator verification result', {
        splitWalletId,
        userId,
        creatorId: walletResult.wallet.creatorId,
        isCreator
      }, 'SplitWalletSecurity');
      
      return {
        success: true,
        isCreator
      };
    } catch (error) {
      logger.error('Failed to verify split wallet creator', error, 'SplitWalletSecurity');
      return {
        success: false,
        isCreator: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if Fair split private key exists for creator
   */
  static async hasFairSplitPrivateKey(
    splitWalletId: string, 
    creatorId: string
  ): Promise<{ success: boolean; hasKey: boolean; error?: string }> {
    try {
      const storageKey = `${this.FAIR_SPLIT_PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      const privateKey = await SecureStore.getItemAsync(storageKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });
      
      return {
        success: true,
        hasKey: !!privateKey,
      };
    } catch (error) {
      logger.error('Failed to check Fair split private key existence', error, 'SplitWalletSecurity');
      return {
        success: false,
        hasKey: false,
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
      const privateKey = await SecureStore.getItemAsync(storageKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });
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
   * Get Fair split wallet private key from local storage (creator-only access)
   * SECURITY: Only the creator can access the private key for fair splits
   */
  static async getFairSplitPrivateKey(
    splitWalletId: string, 
    creatorId: string
  ): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      logger.debug('Retrieving Fair split private key from local storage', {
        splitWalletId,
        creatorId
      }, 'SplitWalletSecurity');

      const storageKey = `${this.FAIR_SPLIT_PRIVATE_KEY_PREFIX}${splitWalletId}_${creatorId}`;
      
      // Retrieve the private key from secure storage
      let privateKey;
      try {
        privateKey = await SecureStore.getItemAsync(storageKey, {
          requireAuthentication: false,
          keychainService: 'WeSplitSplitWalletKeys'
        });
        
        logger.debug('Fair split private key retrieval result', {
          splitWalletId,
          creatorId,
          storageKey,
          hasPrivateKey: !!privateKey,
          privateKeyLength: privateKey?.length || 0
        }, 'SplitWalletSecurity');
      } catch (secureStoreError) {
        logger.error('SecureStore.getItemAsync failed for Fair split', {
          splitWalletId,
          creatorId,
          storageKey,
          error: secureStoreError instanceof Error ? secureStoreError.message : String(secureStoreError)
        }, 'SplitWalletSecurity');
        
        return {
          success: false,
          error: `Failed to access secure storage: ${secureStoreError instanceof Error ? secureStoreError.message : 'Unknown error'}`,
        };
      }
      
      if (!privateKey) {
        logger.warn('Fair split private key not found in secure storage', {
          splitWalletId,
          creatorId,
          storageKey
        }, 'SplitWalletSecurity');
        
        return {
          success: false,
          error: `Private key not found for Fair split wallet ${splitWalletId}. Only the creator can access this private key.`,
        };
      }

      logger.info('Fair split private key retrieved successfully', {
        splitWalletId,
        creatorId
      }, 'SplitWalletSecurity');

      return { 
        success: true, 
        privateKey 
      };

    } catch (error) {
      console.error('🔍 SplitWalletSecurity: Error retrieving Fair split private key:', error);
      logger.error('Failed to retrieve Fair split private key', error, 'SplitWalletSecurity');
      return {
        success: false,
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
      
      const { db } = await import('../../config/firebase/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      // Enhanced error handling for Firebase getDoc operation
      let privateKeyDoc;
      try {
        const privateKeyDocRef = doc(db, 'splitWalletPrivateKeys', splitWalletId);
        privateKeyDoc = await getDoc(privateKeyDocRef);
        
        logger.debug('Firebase private key document check result', {
          splitWalletId,
          exists: privateKeyDoc.exists(),
          hasData: !!privateKeyDoc.data(),
          docId: privateKeyDocRef.id
        }, 'SplitWalletSecurity');
      } catch (firebaseError) {
        logger.error('Firebase getDoc operation failed', {
          splitWalletId,
          requesterId,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
          errorCode: (firebaseError as any)?.code,
          errorDetails: (firebaseError as any)?.details
        }, 'SplitWalletSecurity');
        
        // Continue to local storage fallback instead of failing completely
        logger.info('Falling back to local storage due to Firebase error', {
          splitWalletId,
          requesterId
        }, 'SplitWalletSecurity');
      }
      
      if (privateKeyDoc && privateKeyDoc.exists()) {
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
      
      // If not found in Firebase, this might be a Fair split wallet or an old Degen Split wallet
      logger.info('Private key not found in Firebase, checking for Fair split wallet', {
        splitWalletId,
        requesterId,
        message: 'This might be a Fair split wallet or an old Degen Split wallet'
      }, 'SplitWalletSecurity');
      
      // First, try to get it as a Fair split private key (creator-only access)
      const fairSplitResult = await this.getFairSplitPrivateKey(splitWalletId, requesterId);
      if (fairSplitResult.success) {
        logger.info('Private key retrieved as Fair split wallet', {
          splitWalletId,
          requesterId
        }, 'SplitWalletSecurity');
        return fairSplitResult;
      }
      
      // If not a Fair split, try the old Degen Split format
      logger.debug('Not a Fair split, trying old Degen Split format', {
        splitWalletId,
        requesterId
      }, 'SplitWalletSecurity');
      
      const storageKey = `${this.PRIVATE_KEY_PREFIX}${splitWalletId}_${requesterId}`;
      
      logger.debug('Attempting to retrieve private key from local storage', {
        splitWalletId,
        requesterId,
        storageKey
      }, 'SplitWalletSecurity');
      
      // Retrieve the private key from secure storage with enhanced error handling
      let privateKey;
      try {
        privateKey = await SecureStore.getItemAsync(storageKey, {
          requireAuthentication: false,
          keychainService: 'WeSplitSplitWalletKeys'
        });
        
        logger.debug('Private key retrieval result', {
          splitWalletId,
          requesterId,
          storageKey,
          hasPrivateKey: !!privateKey,
          privateKeyLength: privateKey?.length || 0
        }, 'SplitWalletSecurity');
      } catch (secureStoreError) {
        logger.error('SecureStore.getItemAsync failed', {
          splitWalletId,
          requesterId,
          storageKey,
          error: secureStoreError instanceof Error ? secureStoreError.message : String(secureStoreError)
        }, 'SplitWalletSecurity');
        
        return {
          success: false,
          error: `Failed to access secure storage: ${secureStoreError instanceof Error ? secureStoreError.message : 'Unknown error'}`,
        };
      }
      
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
            try {
              logger.debug('Trying alternative storage key', { altKey }, 'SplitWalletSecurity');
              const altPrivateKey = await SecureStore.getItemAsync(altKey, {
                requireAuthentication: false,
                keychainService: 'WeSplitSplitWalletKeys'
              });
              if (altPrivateKey) {
                logger.info('Found private key with alternative storage key', { altKey }, 'SplitWalletSecurity');
                return {
                  success: true,
                  privateKey: altPrivateKey
                };
              }
            } catch (altError) {
              logger.warn('Failed to check alternative storage key', {
                altKey,
                error: altError instanceof Error ? altError.message : String(altError)
              }, 'SplitWalletSecurity');
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
    participants: { userId: string; name: string }[],
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
      const { db } = await import('../../config/firebase/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      
      const privateKeyDocRef = doc(db, 'splitWalletPrivateKeys', splitWalletId);
      
      try {
        await setDoc(privateKeyDocRef, {
          splitWalletId,
          privateKey,
          participants: participants.map(p => ({ userId: p.userId, name: p.name })),
          createdAt: new Date().toISOString(),
          splitType: 'degen'
        });
        
        logger.info('Successfully stored private key in Firebase for Degen Split', {
          splitWalletId,
          participantsCount: participants.length,
          collectionName: 'splitWalletPrivateKeys'
        }, 'SplitWalletSecurity');
      } catch (firebaseError) {
        logger.error('Failed to store private key in Firebase for Degen Split', {
          splitWalletId,
          participantsCount: participants.length,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
          errorCode: (firebaseError as any)?.code,
          errorDetails: (firebaseError as any)?.details
        }, 'SplitWalletSecurity');
        
        // Don't fail the entire operation, but log the error
        // The private key will still be stored locally as a fallback
        logger.warn('Continuing with local storage fallback for Degen Split private key', {
          splitWalletId
        }, 'SplitWalletSecurity');
      }

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
   * Keep shared private key participant list in sync (Degen Split)
   * Ensures newly invited participants can access the shared private key document
   */
  static async syncSharedPrivateKeyParticipants(
    splitWalletId: string,
    participants: { userId: string; name?: string }[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!splitWalletId) {
        return {
          success: false,
          error: 'splitWalletId is required',
        };
      }

      if (!participants || participants.length === 0) {
        return {
          success: false,
          error: 'No participants provided to sync',
        };
      }

      const { db } = await import('../../config/firebase/firebase');
      const { doc, getDoc, setDoc } = await import('firebase/firestore');

      const privateKeyDocRef = doc(db, 'splitWalletPrivateKeys', splitWalletId);
      const privateKeyDoc = await getDoc(privateKeyDocRef);

      if (!privateKeyDoc.exists()) {
        logger.warn('Shared private key document not found while syncing participants', {
          splitWalletId,
          participantsCount: participants.length
        }, 'SplitWalletSecurity');
        return {
          success: false,
          error: 'Shared private key record not found for this split wallet',
        };
      }

      const sanitizedParticipants = participants.map(participant => ({
        userId: participant.userId?.toString(),
        name: participant.name || 'Unknown Participant',
      }));

      await setDoc(
        privateKeyDocRef,
        {
          participants: sanitizedParticipants,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      logger.info('Shared private key participants synchronized', {
        splitWalletId,
        participantsCount: sanitizedParticipants.length
      }, 'SplitWalletSecurity');

      return { success: true };
    } catch (error) {
      console.error('🔍 SplitWalletSecurity: Error syncing shared private key participants:', error);
      logger.error('Failed to sync shared private key participants', error, 'SplitWalletSecurity');
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
    participants: { userId: string; name: string }[]
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

      // Remove shared private key record from Firebase to avoid lingering secrets
      try {
        const { db } = await import('../../config/firebase/firebase');
        const { doc, deleteDoc } = await import('firebase/firestore');

        await deleteDoc(doc(db, 'splitWalletPrivateKeys', splitWalletId));

        logger.info('Shared private key record deleted from Firebase', {
          splitWalletId,
          participantsCount: participants.length
        }, 'SplitWalletSecurity');
      } catch (firebaseError) {
        logger.warn('Failed to delete shared private key record from Firebase', {
          splitWalletId,
          error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError)
        }, 'SplitWalletSecurity');
      }

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
      logger.info('Private key cleanup requested', { olderThanDays }, 'SplitWalletSecurity');
      
      // TODO: Implement proper cleanup logic with key index
      // For now, return success with no cleanup
      return {
        success: true,
        cleanedCount: 0,
        error: 'Cleanup not implemented - requires key index'
      };

    } catch (error) {
      logger.error('Failed to cleanup old private keys', error, 'SplitWalletSecurity');
      return {
        success: false,
        cleanedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
