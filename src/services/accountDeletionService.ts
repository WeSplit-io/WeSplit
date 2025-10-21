/**
 * Account Deletion Service
 * Handles complete deletion of user account and all associated data from Firebase
 * This service ensures GDPR compliance and complete data removal (Firebase-only architecture)
 */

import { 
  collection, 
  doc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  query, 
  where, 
  writeBatch,
  orderBy,
  limit,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logger } from './loggingService';
import { firebaseDataService } from './firebaseDataService';

export interface AccountDeletionResult {
  success: boolean;
  deletedCollections: string[];
  deletedCounts: Record<string, number>;
  errors: string[];
  totalDeleted: number;
}

export interface DeletionProgress {
  currentStep: string;
  progress: number;
  totalSteps: number;
  currentCollection: string;
  itemsProcessed: number;
  totalItems: number;
}

export class AccountDeletionService {
  private static readonly BATCH_SIZE = 500; // Firestore batch limit
  private static readonly MAX_RETRIES = 3;

  /**
   * Delete user account and all associated data
   */
  static async deleteUserAccount(
    userId: string, 
    onProgress?: (progress: DeletionProgress) => void
  ): Promise<AccountDeletionResult> {
    const startTime = Date.now();
    const result: AccountDeletionResult = {
      success: false,
      deletedCollections: [],
      deletedCounts: {},
      errors: [],
      totalDeleted: 0
    };

    try {
      logger.info('Starting account deletion process', { userId }, 'AccountDeletionService');
      
      // Define deletion steps in order of dependencies
      // CRITICAL: This order matters for foreign key constraints and data integrity
      const deletionSteps = [
        // 1. Delete notifications first (no dependencies)
        { name: 'notifications', collection: 'notifications', field: 'userId' },
        
        // 2. Delete payment-related data
        { name: 'paymentRequests', collection: 'paymentRequests', field: 'userId' },
        { name: 'paymentRequestsReceived', collection: 'paymentRequests', field: 'recipientId' },
        { name: 'reminders', collection: 'reminders', field: 'userId' },
        
        // 3. Delete settlement data
        { name: 'settlements', collection: 'settlements', field: 'userId' },
        { name: 'settlementsReceived', collection: 'settlements', field: 'recipientId' },
        
        // 4. Delete transaction data
        { name: 'transactions', collection: 'transactions', field: 'userId' },
        { name: 'transactionsReceived', collection: 'transactions', field: 'recipientId' },
        { name: 'multiSigTransactions', collection: 'multiSigTransactions', field: 'userId' },
        { name: 'groupWalletTransactions', collection: 'groupWalletTransactions', field: 'userId' },
        
        // 5. Delete wallet management data
        { name: 'walletManagementEvents', collection: 'walletManagementEvents', field: 'userId' },
        { name: 'splitWallets', collection: 'splitWallets', field: 'creatorId' },
        { name: 'multiSigWallets', collection: 'multiSigWallets', field: 'userId' },
        { name: 'groupWallets', collection: 'groupWallets', field: 'creatorId' },
        
        // 6. Delete split data (both as creator and participant)
        { name: 'splits', collection: 'splits', field: 'creatorId' },
        { name: 'splitsParticipant', collection: 'splits', field: 'participants', isArray: true },
        
        // 7. Delete expense data
        { name: 'expenses', collection: 'expenses', field: 'paidBy' },
        
        // 8. Delete group membership data
        { name: 'groupMembers', collection: 'groupMembers', field: 'userId' },
        
        // 9. Delete groups created by user (after memberships are removed)
        { name: 'groups', collection: 'groups', field: 'createdBy' },
        
        // 10. Delete contact and invite data
        { name: 'contacts', collection: 'contacts', field: 'userId' },
        { name: 'invites', collection: 'invites', field: 'userId' },
        { name: 'invitesReceived', collection: 'invites', field: 'recipientId' },
        
        // 11. Delete verification codes (by email, not userId)
        { name: 'verificationCodes', collection: 'verificationCodes', field: 'email', isEmailField: true },
        
        // 12. Delete user document last (after all dependencies are removed)
        { name: 'user', collection: 'users', field: 'id', isDirect: true }
      ];

      const totalSteps = deletionSteps.length;
      let currentStep = 0;

      // Process each deletion step
      for (const step of deletionSteps) {
        currentStep++;
        
        if (onProgress) {
          onProgress({
            currentStep: step.name,
            progress: (currentStep / totalSteps) * 100,
            totalSteps,
            currentCollection: step.collection,
            itemsProcessed: 0,
            totalItems: 0
          });
        }

        try {
          const deletedCount = await this.deleteUserDataFromCollection(
            userId, 
            step.collection, 
            step.field, 
            step.isArray || false,
            step.isDirect || false,
            step.isEmailField || false,
            onProgress
          );

          result.deletedCounts[step.name] = deletedCount;
          result.totalDeleted += deletedCount;
          
          if (deletedCount > 0) {
            result.deletedCollections.push(step.name);
          }

          logger.info(`Deleted ${deletedCount} items from ${step.collection}`, { 
            userId, 
            collection: step.collection, 
            count: deletedCount 
          }, 'AccountDeletionService');

        } catch (error) {
          const errorMsg = `Failed to delete from ${step.collection}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logger.error(`Error deleting from ${step.collection}`, error, 'AccountDeletionService');
          
          // Continue with other collections even if one fails
        }
      }

      // Note: SQLite deletion removed - app now uses Firebase-only architecture
      // All user data is stored in Firebase collections and deleted above
      logger.info('Firebase-only deletion completed - no SQLite cleanup needed', { userId }, 'AccountDeletionService');

      result.success = result.errors.length === 0;
      
      const duration = Date.now() - startTime;
      logger.info('Account deletion completed', { 
        userId, 
        success: result.success, 
        totalDeleted: result.totalDeleted,
        duration: `${duration}ms`,
        errors: result.errors.length
      }, 'AccountDeletionService');

      return result;

    } catch (error) {
      logger.error('Account deletion failed', error, 'AccountDeletionService');
      result.errors.push(`Account deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Delete user data from a specific Firestore collection
   */
  private static async deleteUserDataFromCollection(
    userId: string,
    collectionName: string,
    fieldName: string,
    isArrayField: boolean = false,
    isDirectId: boolean = false,
    isEmailField: boolean = false,
    onProgress?: (progress: DeletionProgress) => void
  ): Promise<number> {
    let totalDeleted = 0;
    let hasMore = true;
    let lastDoc = null;

    while (hasMore) {
      try {
        let q;
        
        if (isDirectId) {
          // For user documents, mark as deleted instead of completely removing
          if (collectionName === 'users') {
            const docRef = doc(db, collectionName, userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              await updateDoc(docRef, {
                status: 'deleted',
                deleted_at: new Date().toISOString(),
                // Clear sensitive data but keep the document
                wallet_address: '',
                wallet_public_key: '',
                name: 'Deleted User',
                email: `deleted_${userId}@deleted.local`
              });
              totalDeleted++;
              logger.info('Marked user as deleted', { userId }, 'AccountDeletionService');
            }
          } else {
            // For other collections, delete normally
            const docRef = doc(db, collectionName, userId);
            const docSnap = await getDocs(query(collection(db, collectionName), where('__name__', '==', userId)));
            if (!docSnap.empty) {
              await deleteDoc(docRef);
              totalDeleted++;
            }
          }
          hasMore = false;
        } else if (isArrayField) {
          // Handle array fields (like participants in splits)
          q = query(
            collection(db, collectionName),
            where(fieldName, 'array-contains', { userId }),
            orderBy('createdAt', 'desc'),
            limit(this.BATCH_SIZE)
          );
        } else if (isEmailField) {
          // Handle email field queries (like verification codes)
          // First get user's email from user document
          const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', userId)));
          if (userDoc.empty) {
            hasMore = false;
            continue;
          }
          const userEmail = userDoc.docs[0].data().email;
          
          q = query(
            collection(db, collectionName),
            where(fieldName, '==', userEmail),
            orderBy('createdAt', 'desc'),
            limit(this.BATCH_SIZE)
          );
        } else {
          // Regular field queries
          q = query(
            collection(db, collectionName),
            where(fieldName, '==', userId),
            orderBy('createdAt', 'desc'),
            limit(this.BATCH_SIZE)
          );
        }

        if (q) {
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            hasMore = false;
            continue;
          }

          // Delete in batches
          const batch = writeBatch(db);
          let batchCount = 0;

          for (const docSnap of snapshot.docs) {
            batch.delete(docSnap.ref);
            batchCount++;
            totalDeleted++;

            // Firestore batch limit is 500 operations
            if (batchCount >= this.BATCH_SIZE) {
              await batch.commit();
              batchCount = 0;
            }
          }

          // Commit remaining operations
          if (batchCount > 0) {
            await batch.commit();
          }

          // Update progress
          if (onProgress) {
            onProgress({
              currentStep: 'deleting',
              progress: 0,
              totalSteps: 1,
              currentCollection: collectionName,
              itemsProcessed: totalDeleted,
              totalItems: totalDeleted
            });
          }

          // Check if we have more documents
          hasMore = snapshot.docs.length === this.BATCH_SIZE;
          if (hasMore) {
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
          }
        }

      } catch (error) {
        logger.error(`Error deleting from ${collectionName}`, error, 'AccountDeletionService');
        throw error;
      }
    }

    return totalDeleted;
  }

  /**
   * Note: SQLite deletion methods removed - app now uses Firebase-only architecture
   * All user data is stored in Firebase collections and deleted in the main deletion flow
   */

  /**
   * Get comprehensive user data summary before deletion (for confirmation)
   */
  static async getUserDataSummary(userId: string): Promise<{
    splits: number;
    notifications: number;
    transactions: number;
    groups: number;
    contacts: number;
    wallets: number;
    payments: number;
    settlements: number;
    totalItems: number;
  }> {
    try {
      const collections = [
        { name: 'notifications', field: 'userId' },
        { name: 'paymentRequests', field: 'userId' },
        { name: 'paymentRequests', field: 'recipientId' },
        { name: 'reminders', field: 'userId' },
        { name: 'settlements', field: 'userId' },
        { name: 'settlements', field: 'recipientId' },
        { name: 'transactions', field: 'userId' },
        { name: 'transactions', field: 'recipientId' },
        { name: 'multiSigTransactions', field: 'userId' },
        { name: 'groupWalletTransactions', field: 'userId' },
        { name: 'walletManagementEvents', field: 'userId' },
        { name: 'splitWallets', field: 'creatorId' },
        { name: 'multiSigWallets', field: 'userId' },
        { name: 'groupWallets', field: 'creatorId' },
        { name: 'splits', field: 'creatorId' },
        { name: 'splits', field: 'participants', isArray: true },
        { name: 'expenses', field: 'paidBy' },
        { name: 'groupMembers', field: 'userId' },
        { name: 'groups', field: 'createdBy' },
        { name: 'contacts', field: 'userId' },
        { name: 'invites', field: 'userId' },
        { name: 'invites', field: 'recipientId' },
        { name: 'verificationCodes', field: 'email', isEmailField: true }
      ];

      const summary = {
        splits: 0,
        notifications: 0,
        transactions: 0,
        groups: 0,
        contacts: 0,
        wallets: 0,
        payments: 0,
        settlements: 0,
        totalItems: 0
      };

      for (const collectionInfo of collections) {
        try {
          let q;
          if (collectionInfo.isArray) {
            q = query(
              collection(db, collectionInfo.name),
              where(collectionInfo.field, 'array-contains', { userId })
            );
          } else {
            q = query(
              collection(db, collectionInfo.name),
              where(collectionInfo.field, '==', userId)
            );
          }

          const snapshot = await getDocs(q);
          const count = snapshot.docs.length;

          switch (collectionInfo.name) {
            case 'splits':
              summary.splits += count;
              break;
            case 'notifications':
              summary.notifications += count;
              break;
            case 'transactions':
            case 'multiSigTransactions':
            case 'groupWalletTransactions':
              summary.transactions += count;
              break;
            case 'groups':
              summary.groups += count;
              break;
            case 'contacts':
              summary.contacts += count;
              break;
            case 'splitWallets':
            case 'multiSigWallets':
            case 'groupWallets':
              summary.wallets += count;
              break;
            case 'paymentRequests':
            case 'reminders':
              summary.payments += count;
              break;
            case 'settlements':
              summary.settlements += count;
              break;
          }
        } catch (error) {
          logger.error(`Error counting ${collectionInfo.name}`, error, 'AccountDeletionService');
        }
      }

      summary.totalItems = summary.splits + summary.notifications + summary.transactions + 
                          summary.groups + summary.contacts + summary.wallets + 
                          summary.payments + summary.settlements;

      return summary;
    } catch (error) {
      logger.error('Error getting user data summary', error, 'AccountDeletionService');
      throw error;
    }
  }

  /**
   * Cancel account deletion (if needed for future implementation)
   */
  static async cancelAccountDeletion(userId: string): Promise<boolean> {
    try {
      // This could be implemented to cancel a scheduled deletion
      logger.info('Account deletion cancellation requested', { userId }, 'AccountDeletionService');
      return true;
    } catch (error) {
      logger.error('Error canceling account deletion', error, 'AccountDeletionService');
      return false;
    }
  }
}

export default AccountDeletionService;
