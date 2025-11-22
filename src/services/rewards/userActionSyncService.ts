/**
 * User Action Sync Service
 * Ensures user actions are properly synced with database and trigger quest completions
 * This service acts as a centralized handler for all user actions that should trigger rewards
 */

import { logger } from '../analytics/loggingService';
import { questService } from './questService';
import { firebaseDataService } from '../data/firebaseDataService';
import { seasonService } from './seasonService';
import { getSeasonReward, calculateRewardPoints } from './seasonRewardsConfig';
import { pointsService } from './pointsService';
import { referralService } from './referralService';
import { badgeService } from './badgeService';

class UserActionSyncService {
  /**
   * Sync onboarding completion
   * ⚠️ DISABLED: This quest has been replaced by the season-based system
   * This method is kept for backward compatibility but will not award points
   */
  async syncOnboardingCompletion(userId: string, hasCompleted: boolean = true): Promise<void> {
    try {
      // Update user document with onboarding status
      await firebaseDataService.user.updateUser(userId, {
        hasCompletedOnboarding: hasCompleted
      });

      logger.info('Onboarding status synced', { userId, hasCompleted }, 'UserActionSyncService');

      // DISABLED: Old quest (complete_onboarding) - replaced by season-based system
      // Quest completion is now handled by setup_account_pp quest
      // No points will be awarded for this legacy quest
    } catch (error) {
      logger.error('Failed to sync onboarding completion', { userId, error }, 'UserActionSyncService');
      throw error;
    }
  }

  /**
   * Sync profile image upload
   * ⚠️ DISABLED: This quest has been replaced by the season-based system
   * This method is kept for backward compatibility but will not award points
   */
  async syncProfileImage(userId: string, avatarUrl: string): Promise<void> {
    try {
      // Update user document with avatar
      await firebaseDataService.user.updateUser(userId, {
        avatar: avatarUrl
      });

      logger.info('Profile image synced', { userId, hasAvatar: !!avatarUrl }, 'UserActionSyncService');

      // DISABLED: Old quest (profile_image) - replaced by season-based system
      // No points will be awarded for this legacy quest
    } catch (error) {
      logger.error('Failed to sync profile image', { userId, error }, 'UserActionSyncService');
      throw error;
    }
  }

  /**
   * Sync first transaction
   * ⚠️ DISABLED: This quest has been replaced by the season-based system
   * Transaction points are now awarded via awardTransactionPoints() which uses season-based rewards
   * This method is kept for backward compatibility but will not award points
   */
  async syncFirstTransaction(userId: string): Promise<void> {
    try {
      // DISABLED: Old quest (first_transaction) - replaced by season-based system
      // Transaction points are now awarded via awardTransactionPoints() which uses season-based rewards
      // No points will be awarded for this legacy quest
      logger.info('First transaction sync called (disabled)', { userId }, 'UserActionSyncService');
    } catch (error) {
      logger.error('Failed to sync first transaction', { userId, error }, 'UserActionSyncService');
      // Don't throw - quest completion failure shouldn't break transaction flow
    }
  }

  /**
   * Sync first contact addition
   * ⚠️ DISABLED: This quest has been replaced by the season-based system
   * This method is kept for backward compatibility but will not award points
   */
  async syncFirstContact(userId: string): Promise<void> {
    try {
      // DISABLED: Old quest (add_first_contact) - replaced by season-based system
      // No points will be awarded for this legacy quest
      logger.info('First contact sync called (disabled)', { userId }, 'UserActionSyncService');
    } catch (error) {
      logger.error('Failed to sync first contact', { userId, error }, 'UserActionSyncService');
      // Don't throw - quest completion failure shouldn't break contact addition
    }
  }

  /**
   * Sync first split creation
   * ⚠️ DISABLED: This quest has been replaced by the season-based system
   * Split rewards are now handled by first_split_with_friends quest and split rewards service
   * This method is kept for backward compatibility but will not award points
   */
  async syncFirstSplit(userId: string): Promise<void> {
    try {
      // DISABLED: Old quest (create_first_split) - replaced by season-based system
      // Split rewards are now handled by first_split_with_friends quest and split rewards service
      // No points will be awarded for this legacy quest
      logger.info('First split sync called (disabled)', { userId }, 'UserActionSyncService');
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

      // DISABLED: Legacy quests (complete_onboarding, profile_image)
      // These have been replaced by the new season-based quest system
      // 1. Check onboarding - DISABLED
      // if (user.hasCompletedOnboarding || user.wallet_address || user.name) {
      //   try {
      //     await this.syncOnboardingCompletion(userId, true);
      //     synced.push('onboarding');
      //   } catch (error) {
      //     errors.push(`Failed to sync onboarding: ${error instanceof Error ? error.message : String(error)}`);
      //   }
      // }

      // 2. Check profile image - DISABLED
      // if (user.avatar && user.avatar.trim() !== '') {
      //   try {
      //     await this.syncProfileImage(userId, user.avatar);
      //     synced.push('profile_image');
      //   } catch (error) {
      //     errors.push(`Failed to sync profile image: ${error instanceof Error ? error.message : String(error)}`);
      //   }
      // }

      // DISABLED: Legacy quests (first_transaction, add_first_contact, create_first_split)
      // These have been replaced by the new season-based quest system
      // 3. Check first transaction - DISABLED
      // try {
      //   await this.syncFirstTransaction(userId);
      //   synced.push('first_transaction');
      //   
      //   // Also check if transaction points need to be backfilled for old transactions
      //   await this.checkAndBackfillTransactionPoints(userId);
      // } catch (error) {
      //   errors.push(`Failed to sync first transaction: ${error instanceof Error ? error.message : String(error)}`);
      // }

      // 4. Check first contact - DISABLED
      // try {
      //   await this.syncFirstContact(userId);
      //   synced.push('first_contact');
      // } catch (error) {
      //   errors.push(`Failed to sync first contact: ${error instanceof Error ? error.message : String(error)}`);
      // }

      // 5. Check first split - DISABLED
      // try {
      //   await this.syncFirstSplit(userId);
      //   synced.push('first_split');
      // } catch (error) {
      //   errors.push(`Failed to sync first split: ${error instanceof Error ? error.message : String(error)}`);
      // }

      // 6. Check seed phrase export
      try {
        await this.syncSeedPhraseExport(userId);
        synced.push('seed_phrase_export');
      } catch (error) {
        errors.push(`Failed to sync seed phrase export: ${error instanceof Error ? error.message : String(error)}`);
      }

      // 7. Check external wallet linking
      try {
        await this.syncExternalWalletLinking(userId);
        synced.push('external_wallet_linking');
      } catch (error) {
        errors.push(`Failed to sync external wallet linking: ${error instanceof Error ? error.message : String(error)}`);
      }

      // 8. Backfill badge points for previously claimed badges
      try {
        const backfillResult = await badgeService.backfillBadgePoints(userId);
        if (backfillResult.pointsAwarded > 0) {
          synced.push(`badge_points_backfill (${backfillResult.pointsAwarded} points)`);
          logger.info('Badge points backfilled', {
            userId,
            pointsAwarded: backfillResult.pointsAwarded,
            badgesProcessed: backfillResult.badgesProcessed
          }, 'UserActionSyncService');
        }
        if (backfillResult.errors.length > 0) {
          errors.push(...backfillResult.errors);
        }
      } catch (error) {
        errors.push(`Failed to backfill badge points: ${error instanceof Error ? error.message : String(error)}`);
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

  /**
   * Sync seed phrase export
   * Should be called when user exports their seed phrase
   */
  async syncSeedPhraseExport(userId: string): Promise<void> {
    try {
      const isCompleted = await questService.isQuestCompleted(userId, 'export_seed_phrase');
      if (!isCompleted) {
        // Check if user has seed phrase (indicates they've exported it)
        const user = await firebaseDataService.user.getCurrentUser(userId);
        if (user.wallet_has_seed_phrase) {
          // completeQuest will handle awarding points (no need to call awardSeasonPoints separately)
          const questResult = await questService.completeQuest(userId, 'export_seed_phrase');
          
          if (questResult.success) {
            logger.info('✅ Seed phrase export quest completed', {
              userId,
              pointsAwarded: questResult.pointsAwarded,
              totalPoints: questResult.totalPoints
            }, 'UserActionSyncService');
          }
        }
      }
    } catch (error) {
      logger.error('Failed to sync seed phrase export', { userId, error }, 'UserActionSyncService');
      // Don't throw - quest completion failure shouldn't break flow
    }
  }

  /**
   * Sync account setup with privacy policy
   * Should be called when user completes account setup with privacy policy acceptance
   */
  async syncAccountSetupPP(userId: string): Promise<void> {
    try {
      const isCompleted = await questService.isQuestCompleted(userId, 'setup_account_pp');
      if (!isCompleted) {
        // Check if user has completed onboarding (indicates they've set up account)
        const user = await firebaseDataService.user.getCurrentUser(userId);
        if (user.hasCompletedOnboarding) {
          // completeQuest will handle awarding points (no need to call awardSeasonPoints separately)
          const questResult = await questService.completeQuest(userId, 'setup_account_pp');
          
          if (questResult.success) {
            logger.info('✅ Account setup PP quest completed', {
              userId,
              pointsAwarded: questResult.pointsAwarded,
              totalPoints: questResult.totalPoints
            }, 'UserActionSyncService');
          }
        }
      }
    } catch (error) {
      logger.error('Failed to sync account setup PP', { userId, error }, 'UserActionSyncService');
      // Don't throw - quest completion failure shouldn't break flow
    }
  }

  /**
   * Sync first split with friends
   * Should be called when user creates their first split with friends
   */
  async syncFirstSplitWithFriends(userId: string, splitId: string, participantCount: number): Promise<void> {
    try {
      const isCompleted = await questService.isQuestCompleted(userId, 'first_split_with_friends');
      if (!isCompleted) {
        // Check if split has multiple participants (friends)
        if (participantCount > 1) {
          // completeQuest will handle awarding points (no need to call awardSeasonPoints separately)
          const questResult = await questService.completeQuest(userId, 'first_split_with_friends');
          
          if (questResult.success) {
            logger.info('✅ First split with friends quest completed', {
              userId,
              splitId,
              participantCount,
              pointsAwarded: questResult.pointsAwarded,
              totalPoints: questResult.totalPoints
            }, 'UserActionSyncService');
          }
        }
      }
    } catch (error) {
      logger.error('Failed to sync first split with friends', { userId, error }, 'UserActionSyncService');
      // Don't throw - quest completion failure shouldn't break split creation
    }
  }

  /**
   * Sync external wallet linking
   * Should be called when user links their first external wallet
   */
  async syncExternalWalletLinking(userId: string): Promise<void> {
    try {
      const isCompleted = await questService.isQuestCompleted(userId, 'first_external_wallet_linked');
      if (!isCompleted) {
        // Check if user has linked external wallets
        const linkedWallets = await firebaseDataService.linkedWallet.getLinkedWallets(userId);
        const externalWallets = linkedWallets.filter(w => w.type === 'external');
        
        if (externalWallets.length > 0) {
          // completeQuest will handle awarding points (no need to call awardSeasonPoints separately)
          const questResult = await questService.completeQuest(userId, 'first_external_wallet_linked');
          
          if (questResult.success) {
            logger.info('✅ External wallet linking quest completed', {
              userId,
              pointsAwarded: questResult.pointsAwarded,
              totalPoints: questResult.totalPoints
            }, 'UserActionSyncService');
          }
        }
      }
    } catch (error) {
      logger.error('Failed to sync external wallet linking', { userId, error }, 'UserActionSyncService');
      // Don't throw - quest completion failure shouldn't break flow
    }
  }
}

// Export singleton instance
export const userActionSyncService = new UserActionSyncService();

