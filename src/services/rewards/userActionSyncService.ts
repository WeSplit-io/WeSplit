/**
 * User Action Sync Service
 * Ensures user actions are properly synced with database and trigger quest completions
 * This service acts as a centralized handler for all user actions that should trigger rewards
 */

import { logger } from '../analytics/loggingService';
import { questService } from './questService';
import { firebaseDataService } from '../data/firebaseDataService';

class UserActionSyncService {
  /**
   * Sync onboarding completion
   * Should be called when user completes onboarding flow
   */
  async syncOnboardingCompletion(userId: string, hasCompleted: boolean = true): Promise<void> {
    try {
      // Update user document with onboarding status
      await firebaseDataService.user.updateUser(userId, {
        hasCompletedOnboarding: hasCompleted
      });

      logger.info('Onboarding status synced', { userId, hasCompleted }, 'UserActionSyncService');

      // Trigger onboarding quest completion if not already completed
      if (hasCompleted) {
        try {
          const isCompleted = await questService.isQuestCompleted(userId, 'complete_onboarding');
          if (!isCompleted) {
            const questResult = await questService.completeQuest(userId, 'complete_onboarding');
            if (questResult.success) {
              logger.info('✅ Onboarding quest completed', {
                userId,
                pointsAwarded: questResult.pointsAwarded
              }, 'UserActionSyncService');
            }
          }
        } catch (questError) {
          logger.error('Failed to complete onboarding quest', { userId, questError }, 'UserActionSyncService');
          // Don't throw - quest completion failure shouldn't break onboarding
        }
      }
    } catch (error) {
      logger.error('Failed to sync onboarding completion', { userId, error }, 'UserActionSyncService');
      throw error;
    }
  }

  /**
   * Sync profile image upload
   * Should be called when user uploads or updates their avatar
   */
  async syncProfileImage(userId: string, avatarUrl: string): Promise<void> {
    try {
      // Update user document with avatar
      await firebaseDataService.user.updateUser(userId, {
        avatar: avatarUrl
      });

      logger.info('Profile image synced', { userId, hasAvatar: !!avatarUrl }, 'UserActionSyncService');

      // Trigger profile image quest completion if avatar exists and not already completed
      if (avatarUrl && avatarUrl.trim() !== '') {
        try {
          const isCompleted = await questService.isQuestCompleted(userId, 'profile_image');
          if (!isCompleted) {
            const questResult = await questService.completeQuest(userId, 'profile_image');
            if (questResult.success) {
              logger.info('✅ Profile image quest completed', {
                userId,
                pointsAwarded: questResult.pointsAwarded
              }, 'UserActionSyncService');
            }
          }
        } catch (questError) {
          logger.error('Failed to complete profile image quest', { userId, questError }, 'UserActionSyncService');
          // Don't throw - quest completion failure shouldn't break profile update
        }
      }
    } catch (error) {
      logger.error('Failed to sync profile image', { userId, error }, 'UserActionSyncService');
      throw error;
    }
  }

  /**
   * Sync first transaction
   * Should be called when user completes their first transaction
   * Note: This is already handled in ConsolidatedTransactionService and sendInternal.ts
   * but we keep this for consistency and as a fallback
   */
  async syncFirstTransaction(userId: string): Promise<void> {
    try {
      // Check if this is the user's first transaction
      const isCompleted = await questService.isQuestCompleted(userId, 'first_transaction');
      if (!isCompleted) {
        // Verify user actually has a completed transaction
        const transactions = await firebaseDataService.transaction.getTransactions(userId, 1);
        const hasCompletedTransaction = transactions.some(
          tx => tx.type === 'send' && tx.status === 'completed'
        );

        if (hasCompletedTransaction) {
          const questResult = await questService.completeQuest(userId, 'first_transaction');
          if (questResult.success) {
            logger.info('✅ First transaction quest completed', {
              userId,
              pointsAwarded: questResult.pointsAwarded
            }, 'UserActionSyncService');
          }
        }
      }
    } catch (error) {
      logger.error('Failed to sync first transaction', { userId, error }, 'UserActionSyncService');
      // Don't throw - quest completion failure shouldn't break transaction flow
    }
  }

  /**
   * Sync first contact addition
   * Should be called when user adds their first contact
   */
  async syncFirstContact(userId: string): Promise<void> {
    try {
      // Check if this is the user's first contact
      const isCompleted = await questService.isQuestCompleted(userId, 'add_first_contact');
      if (!isCompleted) {
        // Verify user actually has contacts
        const contacts = await firebaseDataService.contact.getContacts(userId);
        if (contacts.length > 0) {
          const questResult = await questService.completeQuest(userId, 'add_first_contact');
          if (questResult.success) {
            logger.info('✅ First contact quest completed', {
              userId,
              pointsAwarded: questResult.pointsAwarded,
              contactsCount: contacts.length
            }, 'UserActionSyncService');
          }
        }
      }
    } catch (error) {
      logger.error('Failed to sync first contact', { userId, error }, 'UserActionSyncService');
      // Don't throw - quest completion failure shouldn't break contact addition
    }
  }

  /**
   * Sync first split creation
   * Should be called when user creates their first split
   */
  async syncFirstSplit(userId: string): Promise<void> {
    try {
      // Check if this is the user's first split
      const isCompleted = await questService.isQuestCompleted(userId, 'create_first_split');
      if (!isCompleted) {
        // Verify user actually created a split
        const { SplitStorageService } = await import('../splits/splitStorageService');
        const result = await SplitStorageService.getUserSplits(userId);
        
        if (result.success && result.splits) {
          const userCreatedSplits = result.splits.filter(split => split.creatorId === userId);
          if (userCreatedSplits.length > 0) {
            const questResult = await questService.completeQuest(userId, 'create_first_split');
            if (questResult.success) {
              logger.info('✅ First split quest completed', {
                userId,
                pointsAwarded: questResult.pointsAwarded,
                splitsCreated: userCreatedSplits.length
              }, 'UserActionSyncService');
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to sync first split', { userId, error }, 'UserActionSyncService');
      // Don't throw - quest completion failure shouldn't break split creation
    }
  }

  /**
   * Check and backfill transaction points for old transactions
   * Only processes recent transactions (last 50) to avoid performance issues
   */
  private async checkAndBackfillTransactionPoints(userId: string): Promise<void> {
    try {
      // Get recent send transactions (only check last 50 to keep it lightweight)
      const transactions = await firebaseDataService.transaction.getTransactions(userId, 50);
      const sendTransactions = transactions.filter(
        tx => tx.type === 'send' && tx.status === 'completed' && tx.currency === 'USDC'
      );

      if (sendTransactions.length === 0) {
        return;
      }

      // Check which transactions have already been awarded points
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');
      const pointsService = (await import('./pointsService')).pointsService;
      
      const pointsTransactionsQuery = query(
        collection(db, 'points_transactions'),
        where('user_id', '==', userId),
        where('source', '==', 'transaction_reward')
      );
      const pointsTransactionsSnapshot = await getDocs(pointsTransactionsQuery);
      const awardedTransactionIds = new Set<string>();
      
      pointsTransactionsSnapshot.forEach(doc => {
        const data = doc.data() as any;
        if (data.source_id) {
          let txId = data.source_id;
          txId = txId.replace('_sender', '').replace('_recipient', '');
          awardedTransactionIds.add(txId);
          awardedTransactionIds.add(data.source_id);
        }
      });

      // Check each transaction and award points if missing
      for (const tx of sendTransactions) {
        let txSignature = tx.tx_hash;
        if (!txSignature || txSignature.trim() === '') {
          txSignature = tx.id;
        }

        // Skip if already awarded
        if (txSignature && awardedTransactionIds.has(txSignature)) {
          continue;
        }
        if (tx.id && awardedTransactionIds.has(tx.id)) {
          continue;
        }

        // Check if this is an internal transfer (recipient is a registered user)
        // to_user can be either a user ID or a wallet address
        let recipientUser = null;
        try {
          // First try to get by user ID (if to_user is a user ID)
          recipientUser = await firebaseDataService.user.getCurrentUser(tx.to_user || '');
        } catch {
          // If that fails, try to get by wallet address
          try {
            recipientUser = await firebaseDataService.user.getUserByWalletAddress(tx.to_user || '');
          } catch {
            // If both fail, check if it's a Solana wallet address (43-44 chars)
            const toUser = tx.to_user || '';
            if (toUser.length >= 43 && toUser.length <= 44) {
              // Likely a Solana wallet address, check if it's an external transfer
              recipientUser = await firebaseDataService.user.getUserByWalletAddress(toUser);
            }
          }
        }
        
        if (!recipientUser) {
          // External transfer, no points
          continue;
        }

        // Award points for this transaction
        if (txSignature && tx.amount > 0) {
          const pointsResult = await pointsService.awardTransactionPoints(
            userId,
            tx.amount,
            txSignature,
            'send'
          );

          if (pointsResult.success) {
            logger.info('Transaction points backfilled', {
              userId,
              transactionId: txSignature,
              pointsAwarded: pointsResult.pointsAwarded,
              totalPoints: pointsResult.totalPoints
            }, 'UserActionSyncService');
          }
        }
      }
    } catch (error) {
      logger.error('Failed to check and backfill transaction points', { userId, error }, 'UserActionSyncService');
      // Don't throw - this is a background sync
    }
  }

  /**
   * Verify and sync all user actions
   * This is a comprehensive check that ensures database state matches user actions
   * Should be called periodically or after important actions
   */
  async verifyAndSyncUserActions(userId: string): Promise<{
    synced: string[];
    errors: string[];
  }> {
    const synced: string[] = [];
    const errors: string[] = [];

    try {
      // Get user data
      const user = await firebaseDataService.user.getCurrentUser(userId);

      // 1. Check onboarding
      if (user.hasCompletedOnboarding || user.wallet_address || user.name) {
        try {
          await this.syncOnboardingCompletion(userId, true);
          synced.push('onboarding');
        } catch (error) {
          errors.push(`Failed to sync onboarding: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 2. Check profile image
      if (user.avatar && user.avatar.trim() !== '') {
        try {
          await this.syncProfileImage(userId, user.avatar);
          synced.push('profile_image');
        } catch (error) {
          errors.push(`Failed to sync profile image: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 3. Check first transaction
      try {
        await this.syncFirstTransaction(userId);
        synced.push('first_transaction');
        
        // Also check if transaction points need to be backfilled for old transactions
        await this.checkAndBackfillTransactionPoints(userId);
      } catch (error) {
        errors.push(`Failed to sync first transaction: ${error instanceof Error ? error.message : String(error)}`);
      }

      // 4. Check first contact
      try {
        await this.syncFirstContact(userId);
        synced.push('first_contact');
      } catch (error) {
        errors.push(`Failed to sync first contact: ${error instanceof Error ? error.message : String(error)}`);
      }

      // 5. Check first split
      try {
        await this.syncFirstSplit(userId);
        synced.push('first_split');
      } catch (error) {
        errors.push(`Failed to sync first split: ${error instanceof Error ? error.message : String(error)}`);
      }

      logger.info('User actions verified and synced', {
        userId,
        synced: synced.length,
        errors: errors.length
      }, 'UserActionSyncService');

    } catch (error) {
      logger.error('Failed to verify and sync user actions', { userId, error }, 'UserActionSyncService');
      errors.push(`Failed to verify user actions: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { synced, errors };
  }
}

// Export singleton instance
export const userActionSyncService = new UserActionSyncService();

