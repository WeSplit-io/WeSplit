/**
 * Points Migration Service
 * Backfills points for existing users based on their historical actions
 */

import { db } from '../../config/firebase/firebase';
import { collection, query, getDocs, where, limit as queryLimit } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { pointsService } from './pointsService';
import { questService } from './questService';
import { firebaseDataService } from '../data/firebaseDataService';

interface MigrationResult {
  userId: string;
  userName: string;
  pointsAwarded: number;
  questsCompleted: string[];
  errors: string[];
}

interface MigrationStats {
  totalUsers: number;
  processedUsers: number;
  successfulUsers: number;
  failedUsers: number;
  totalPointsAwarded: number;
  errors: string[];
}

class PointsMigrationService {
  /**
   * Check if user has completed onboarding
   * Uses the same logic as shouldSkipOnboardingForExistingUser to ensure consistency
   */
  private async checkOnboarding(userId: string, user: any): Promise<boolean> {
    try {
      // If user explicitly has hasCompletedOnboarding field, use that
      if (user.hasCompletedOnboarding !== undefined) {
        return user.hasCompletedOnboarding === true;
      }

      // For existing users without the field, check if they have activity that suggests they've used the app
      // Check if user has a wallet address (indicates they've gone through the setup process)
      if (user.wallet_address && user.wallet_address.trim() !== '') {
        logger.debug('User has wallet address, assuming onboarding completed', { userId }, 'PointsMigrationService');
        return true;
      }

      // Check if user has a name (indicates they've created a profile)
      if (user.name && user.name.trim() !== '') {
        logger.debug('User has name, assuming onboarding completed', { userId }, 'PointsMigrationService');
        return true;
      }

      // Check if user has been verified before (indicates they've used the app)
      // Note: lastVerifiedAt might not be in the user object, but we check if it exists
      if (user.lastVerifiedAt) {
        logger.debug('User has verification history, assuming onboarding completed', { userId }, 'PointsMigrationService');
        return true;
      }

      // Default to false for truly new users
      return false;
    } catch (error) {
      logger.error('Failed to check onboarding status', { userId, error }, 'PointsMigrationService');
      return false;
    }
  }

  /**
   * Check if user has a profile image
   */
  private async checkProfileImage(userId: string, user: any): Promise<boolean> {
    try {
      return !!(user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '');
    } catch (error) {
      logger.error('Failed to check profile image', { userId, error }, 'PointsMigrationService');
      return false;
    }
  }

  /**
   * Check if user has made at least one transaction
   */
  private async checkFirstTransaction(userId: string): Promise<boolean> {
    try {
      const transactions = await firebaseDataService.transaction.getTransactions(userId, 1);
      // Check if user has sent at least one transaction (type='send')
      return transactions.some(tx => tx.type === 'send' && tx.status === 'completed');
    } catch (error) {
      logger.error('Failed to check transactions', { userId, error }, 'PointsMigrationService');
      return false;
    }
  }

  /**
   * Check if user has added at least one contact
   */
  private async checkFirstContact(userId: string): Promise<boolean> {
    try {
      // Try multiple contact sources
      // 1. Check contacts collection
      try {
      const contactsQuery = query(
          collection(db, 'contacts'),
          where('user_id', '==', userId),
        queryLimit(1)
      );
      const contactsSnapshot = await getDocs(contactsQuery);
        if (!contactsSnapshot.empty) {
          return true;
        }
      } catch (error) {
        logger.debug('Contacts collection query failed, trying alternative', { userId }, 'PointsMigrationService');
      }

      // 2. Check transaction-based contacts (users they've transacted with)
      try {
        const { TransactionBasedContactService } = await import('../contacts/transactionBasedContactService');
        const contacts = await TransactionBasedContactService.getTransactionBasedContacts(userId);
        if (contacts.length > 0) {
          return true;
        }
      } catch (error) {
        logger.debug('Transaction-based contacts check failed', { userId }, 'PointsMigrationService');
      }

      return false;
    } catch (error) {
      logger.error('Failed to check contacts', { userId, error }, 'PointsMigrationService');
      return false;
    }
  }

  /**
   * Check if user has created at least one split
   * Only checks splits where user is the creator (not just a participant)
   */
  private async checkFirstSplit(userId: string): Promise<boolean> {
    try {
      const { SplitStorageService } = await import('../splits/splitStorageService');
      const result = await SplitStorageService.getUserSplits(userId);
      
      if (!result.success || !result.splits) {
        logger.debug('Failed to get splits or no splits returned', { userId }, 'PointsMigrationService');
        return false;
      }

      // Check if user has created at least one split (user is the creator)
      const userCreatedSplits = result.splits.filter(split => split.creatorId === userId);
      const hasCreatedSplit = userCreatedSplits.length > 0;
      
      logger.debug('Split check result', {
        userId,
        totalSplits: result.splits.length,
        createdSplits: userCreatedSplits.length,
        hasCreatedSplit
      }, 'PointsMigrationService');
      
      return hasCreatedSplit;
    } catch (error) {
      logger.error('Failed to check splits', { userId, error }, 'PointsMigrationService');
      return false;
    }
  }

  /**
   * Migrate points for a single user
   */
  async migrateUserPoints(userId: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      userId,
      userName: '',
      pointsAwarded: 0,
      questsCompleted: [],
      errors: []
    };

    try {
      // Get user data
      let user;
      try {
        user = await firebaseDataService.user.getCurrentUser(userId);
        result.userName = user.name || 'Unknown';
      } catch (error) {
        const errorMsg = `Failed to get user data: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        logger.error('Failed to get user data', { userId, error }, 'PointsMigrationService');
        return result;
      }

      if (!user) {
        const errorMsg = 'User not found';
        result.errors.push(errorMsg);
        logger.error('User not found', { userId }, 'PointsMigrationService');
        return result;
      }

      // Define quest checks first
      const questChecks = [
        { id: 'complete_onboarding', check: () => this.checkOnboarding(userId, user), points: 25 },
        { id: 'profile_image', check: () => this.checkProfileImage(userId, user), points: 50 },
        { id: 'first_transaction', check: () => this.checkFirstTransaction(userId), points: 100 },
        { id: 'add_first_contact', check: () => this.checkFirstContact(userId), points: 30 },
        { id: 'create_first_split', check: () => this.checkFirstSplit(userId), points: 75 },
      ];

      // Log comprehensive database status check
      logger.info('Starting points migration for user', { 
        userId, 
        userName: result.userName,
        email: user.email,
        // User document fields from database
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        hasWallet: !!(user.wallet_address && user.wallet_address.trim() !== ''),
        walletAddress: user.wallet_address || '',
        hasName: !!(user.name && user.name.trim() !== ''),
        name: user.name || '',
        hasAvatar: !!(user.avatar && user.avatar.trim() !== ''),
        avatar: user.avatar ? 'exists' : 'none',
        // Points from database
        currentPoints: user.points || 0,
        totalPointsEarned: user.total_points_earned || 0,
        pointsLastUpdated: user.points_last_updated || 'never'
      }, 'PointsMigrationService');
      
      // Check quest completion status in database before migration
      const questStatusBefore: Record<string, boolean> = {};
      for (const questCheck of questChecks) {
        try {
          const isCompleted = await questService.isQuestCompleted(userId, questCheck.id);
          questStatusBefore[questCheck.id] = isCompleted;
          logger.debug('Quest status in database', {
            userId,
            questId: questCheck.id,
            completedInDb: isCompleted
          }, 'PointsMigrationService');
        } catch (error) {
          logger.warn('Failed to check quest status in database', {
            userId,
            questId: questCheck.id,
            error: error instanceof Error ? error.message : String(error)
          }, 'PointsMigrationService');
        }
      }
      
      logger.info('Quest status in database before migration', {
        userId,
        questStatus: questStatusBefore
      }, 'PointsMigrationService');

      for (const questCheck of questChecks) {
        try {
          // Check if quest is already completed
          const isCompleted = await questService.isQuestCompleted(userId, questCheck.id);
          
          if (isCompleted) {
            logger.debug('Quest already completed, skipping', { userId, questId: questCheck.id }, 'PointsMigrationService');
            continue;
          }

          // Check if user has completed the action
          const hasCompleted = await questCheck.check();
          
          logger.debug('Quest eligibility check', {
            userId,
            questId: questCheck.id,
            hasCompleted,
            isCompleted
          }, 'PointsMigrationService');

          if (hasCompleted) {
            // Complete the quest and award points
            const questResult = await questService.completeQuest(userId, questCheck.id);
            
            if (questResult.success) {
              result.pointsAwarded += questResult.pointsAwarded;
              result.questsCompleted.push(questCheck.id);
              logger.info('Quest completed via migration', {
                userId,
                questId: questCheck.id,
                pointsAwarded: questResult.pointsAwarded,
                totalPoints: questResult.totalPoints
              }, 'PointsMigrationService');
            } else {
              const errorMsg = `Failed to complete quest ${questCheck.id}: ${questResult.error || 'Unknown error'}`;
              result.errors.push(errorMsg);
              logger.warn('Quest completion failed', {
                userId,
                questId: questCheck.id,
                error: questResult.error
              }, 'PointsMigrationService');
            }
          } else {
            logger.debug('User has not completed quest requirement', {
              userId,
              questId: questCheck.id
            }, 'PointsMigrationService');
          }
        } catch (error) {
          const errorMsg = `Error checking quest ${questCheck.id}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          logger.error('Error checking quest', { userId, questId: questCheck.id, error }, 'PointsMigrationService');
          // Continue with other quests even if one fails
        }
      }

      // Backfill transaction points for past transactions
      try {
        const transactionPoints = await this.backfillTransactionPoints(userId);
        result.pointsAwarded += transactionPoints.pointsAwarded;
        
        if (transactionPoints.pointsAwarded > 0) {
          logger.info('Transaction points backfilled', {
            userId,
            pointsAwarded: transactionPoints.pointsAwarded,
            transactionsProcessed: transactionPoints.transactionsProcessed
          }, 'PointsMigrationService');
        }
      } catch (error) {
        const errorMsg = `Error backfilling transaction points: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        logger.error('Error backfilling transaction points', { userId, error }, 'PointsMigrationService');
      }

      logger.info('Points migration completed for user', {
        userId,
        pointsAwarded: result.pointsAwarded,
        questsCompleted: result.questsCompleted.length
      }, 'PointsMigrationService');

      return result;
    } catch (error) {
      const errorMsg = `Failed to migrate user points: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      logger.error('Failed to migrate user points', { userId, error }, 'PointsMigrationService');
      return result;
    }
  }

  /**
   * Migrate points for all users
   */
  async migrateAllUsers(limit?: number): Promise<MigrationStats> {
    const stats: MigrationStats = {
      totalUsers: 0,
      processedUsers: 0,
      successfulUsers: 0,
      failedUsers: 0,
      totalPointsAwarded: 0,
      errors: []
    };

    try {
      logger.info('Starting points migration for all users', { limit }, 'PointsMigrationService');

      // Get all users
      const usersQuery = query(
        collection(db, 'users'),
        limit ? queryLimit(limit) : queryLimit(10000) // Large limit for all users
      );

      const usersSnapshot = await getDocs(usersQuery);
      stats.totalUsers = usersSnapshot.docs.length;

      logger.info('Found users to migrate', { count: stats.totalUsers }, 'PointsMigrationService');

      // Process users in batches to avoid overwhelming the system
      const batchSize = 10;
      const userDocs = usersSnapshot.docs;

      for (let i = 0; i < userDocs.length; i += batchSize) {
        const batch = userDocs.slice(i, i + batchSize);
        
        logger.info('Processing batch', {
          batchNumber: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
          totalBatches: Math.ceil(userDocs.length / batchSize)
        }, 'PointsMigrationService');

        const batchResults = await Promise.allSettled(
          batch.map(doc => this.migrateUserPoints(doc.id))
        );

        for (const batchResult of batchResults) {
          stats.processedUsers++;

          if (batchResult.status === 'fulfilled') {
            const result = batchResult.value;
            
            if (result.errors.length === 0 || result.pointsAwarded > 0) {
              stats.successfulUsers++;
              stats.totalPointsAwarded += result.pointsAwarded;
            } else {
              stats.failedUsers++;
              stats.errors.push(...result.errors);
            }
          } else {
            stats.failedUsers++;
            stats.errors.push(batchResult.reason?.message || 'Unknown error');
          }

          // Small delay between batches to avoid rate limiting
          if (i + batchSize < userDocs.length) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
        }
      }

      logger.info('Points migration completed for all users', {
        totalUsers: stats.totalUsers,
        processedUsers: stats.processedUsers,
        successfulUsers: stats.successfulUsers,
        failedUsers: stats.failedUsers,
        totalPointsAwarded: stats.totalPointsAwarded
      }, 'PointsMigrationService');

      return stats;
    } catch (error) {
      logger.error('Failed to migrate all users', error, 'PointsMigrationService');
      stats.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      return stats;
    }
  }

  /**
   * Backfill transaction points for past transactions
   * Awards 10% of transaction amount (see TRANSACTION_POINTS_PERCENTAGE in rewardsConfig.ts)
   * for all past internal wallet-to-wallet transfers
   */
  private async backfillTransactionPoints(userId: string): Promise<{
    pointsAwarded: number;
    transactionsProcessed: number;
  }> {
    try {
      // Get all user's send transactions
      const transactions = await firebaseDataService.transaction.getTransactions(userId, 1000); // Get up to 1000 transactions
      
      // Filter for completed send transactions (only internal transfers get points)
      const sendTransactions = transactions.filter(tx => 
        tx.type === 'send' && 
        tx.status === 'completed' &&
        tx.currency === 'USDC' // Only USDC transactions
      );

      let totalPointsAwarded = 0;
      let processedCount = 0;

      // Check which transactions have already been awarded points
      const { collection, query, where, getDocs } = await import('firebase/firestore');
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
          // Extract transaction signature from source_id
          // source_id can be: signature, signature_sender, signature_recipient, or transaction document ID
          let txId = data.source_id;
          // Remove suffixes if present
          txId = txId.replace('_sender', '').replace('_recipient', '');
          awardedTransactionIds.add(txId);
          // Also add the original source_id to catch variations
          awardedTransactionIds.add(data.source_id);
        }
      });

      // Process each transaction
      for (const tx of sendTransactions) {
        // Get transaction signature - prefer tx_hash, fallback to transaction document ID
        // tx_hash is the blockchain transaction signature (Solana signature)
        // tx.id is the Firestore document ID
        let txSignature = tx.tx_hash;
        if (!txSignature || txSignature.trim() === '') {
          // Fallback to transaction document ID, removing any suffixes
          txSignature = tx.id.replace('_sender', '').replace('_recipient', '');
        }
        
        // Check if points were already awarded for this transaction
        // Check both the clean signature and variations
        if (txSignature && awardedTransactionIds.has(txSignature)) {
          logger.debug('Transaction already awarded points, skipping', {
            userId,
            transactionId: txSignature,
            txHash: tx.tx_hash,
            txId: tx.id
          }, 'PointsMigrationService');
          continue;
        }
        
        // Also check if transaction document ID matches (in case tx_hash wasn't stored)
        if (tx.id && awardedTransactionIds.has(tx.id)) {
          logger.debug('Transaction already awarded points (by document ID), skipping', {
            userId,
            transactionId: tx.id,
            txHash: tx.tx_hash
          }, 'PointsMigrationService');
          continue;
        }

        // Check if recipient is a registered user (internal transfer)
        // For migration, we need to distinguish between:
        // 1. User IDs (Firebase document IDs, typically 20-28 chars)
        // 2. Wallet addresses (Solana addresses, typically 43-44 chars)
        // 
        // Strategy: Try to fetch the user by to_user value
        // If successful, it's a user ID (internal transfer)
        // If it fails or to_user looks like a wallet address, it's external (skip)
        const recipientIdentifier = tx.to_user;
        
        if (!recipientIdentifier || recipientIdentifier.trim() === '') {
          // No recipient identifier, skip
          logger.debug('Transaction has no recipient identifier, skipping', {
            userId,
            transactionId: txSignature
          }, 'PointsMigrationService');
          continue;
        }

        // Solana wallet addresses are typically 43-44 characters (base58 encoded)
        // Firebase document IDs are typically 20-28 characters
        // If it's 43-44 chars and looks like base58, it's likely a wallet address
        const isLikelyWalletAddress = recipientIdentifier.length >= 43 && recipientIdentifier.length <= 44;
        
        if (isLikelyWalletAddress) {
          // Likely a wallet address (external transfer), skip
          logger.debug('Transaction recipient looks like wallet address (external transfer), skipping', {
            userId,
            transactionId: txSignature,
            recipientLength: recipientIdentifier.length
          }, 'PointsMigrationService');
          continue;
        }

        // Try to fetch the user by the recipient identifier
        // If successful, it's a user ID (internal transfer)
        let isInternalTransfer = false;
        try {
          const recipientUser = await firebaseDataService.user.getCurrentUser(recipientIdentifier);
          if (recipientUser && recipientUser.id) {
            isInternalTransfer = true;
            logger.debug('Transaction recipient is registered user (internal transfer)', {
              userId,
              transactionId: txSignature,
              recipientUserId: recipientUser.id
            }, 'PointsMigrationService');
          }
        } catch (error) {
          // Recipient not found in users collection, likely external transfer
          logger.debug('Transaction recipient not found in users (external transfer), skipping', {
            userId,
            transactionId: txSignature,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, 'PointsMigrationService');
          continue;
        }

        if (!isInternalTransfer) {
          // Not an internal transfer, skip
          continue;
        }

        // Award points for this transaction (10% of amount)
        const { calculateTransactionPoints } = await import('./rewardsConfig');
        const pointsAwarded = calculateTransactionPoints(tx.amount);
        
        if (pointsAwarded > 0 && txSignature) {
          const pointsResult = await pointsService.awardPoints(
            userId,
            pointsAwarded,
            'transaction_reward',
            txSignature, // This will be stored as source_id in points_transactions
            `Retroactive points for ${tx.amount} USDC transaction`
          );

          if (pointsResult.success) {
            totalPointsAwarded += pointsAwarded;
            processedCount++;
            logger.info('Transaction points awarded', {
              userId,
              transactionId: txSignature,
              transactionHash: tx.tx_hash,
              transactionDocId: tx.id,
              amount: tx.amount,
              pointsAwarded,
              recipientUserId: recipientIdentifier
            }, 'PointsMigrationService');
          } else {
            logger.warn('Failed to award transaction points', {
              userId,
              transactionId: txSignature,
              error: pointsResult.error
            }, 'PointsMigrationService');
          }
        } else if (!txSignature) {
          logger.warn('Cannot award points: transaction has no signature or document ID', {
            userId,
            txHash: tx.tx_hash,
            txId: tx.id,
            amount: tx.amount
          }, 'PointsMigrationService');
        }
      }

      return {
        pointsAwarded: totalPointsAwarded,
        transactionsProcessed: processedCount
      };
    } catch (error) {
      logger.error('Failed to backfill transaction points', { userId, error }, 'PointsMigrationService');
      return {
        pointsAwarded: 0,
        transactionsProcessed: 0
      };
    }
  }

  /**
   * Get migration status for a user (check which quests should be completed)
   */
  async getMigrationStatus(userId: string): Promise<{
    eligibleQuests: string[];
    completedQuests: string[];
    pendingQuests: string[];
  }> {
    try {
      const user = await firebaseDataService.user.getCurrentUser(userId);
      
      const questChecks = [
        { id: 'complete_onboarding', check: () => this.checkOnboarding(userId, user) },
        { id: 'profile_image', check: () => this.checkProfileImage(userId, user) },
        { id: 'first_transaction', check: () => this.checkFirstTransaction(userId) },
        { id: 'add_first_contact', check: () => this.checkFirstContact(userId) },
        { id: 'create_first_split', check: () => this.checkFirstSplit(userId) },
      ];

      const eligibleQuests: string[] = [];
      const completedQuests: string[] = [];
      const pendingQuests: string[] = [];

      for (const questCheck of questChecks) {
        const isCompleted = await questService.isQuestCompleted(userId, questCheck.id);
        
        if (isCompleted) {
          completedQuests.push(questCheck.id);
        } else {
          const hasCompleted = await questCheck.check();
          
          if (hasCompleted) {
            eligibleQuests.push(questCheck.id);
            pendingQuests.push(questCheck.id);
          }
        }
      }

      return {
        eligibleQuests,
        completedQuests,
        pendingQuests
      };
    } catch (error) {
      logger.error('Failed to get migration status', { userId, error }, 'PointsMigrationService');
      return {
        eligibleQuests: [],
        completedQuests: [],
        pendingQuests: []
      };
    }
  }
}

// Export singleton instance
export const pointsMigrationService = new PointsMigrationService();

