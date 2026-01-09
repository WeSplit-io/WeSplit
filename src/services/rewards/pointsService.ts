/**
 * Points Service
 * Manages user points for transactions and quests
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { PointsAwardResult, PointsTransaction } from '../../types/rewards';
import { firebaseDataService } from '../data/firebaseDataService';
import { MIN_TRANSACTION_AMOUNT_FOR_POINTS } from './rewardsConfig';
import { seasonService, Season } from './seasonService';
import { getSeasonReward, calculateRewardPoints } from './seasonRewardsConfig';
import { applyCommunityBadgeBonus } from './communityBadgeBonusService';

class PointsService {
  /**
   * Award points for a wallet-to-wallet transaction
   * Uses season-based percentage rewards (All or Partnership)
   * Only awards points for internal wallet-to-wallet transfers (not external)
   * Only awards points for 'send' transactions (sender gets points)
   * 
   * ✅ IDEMPOTENT: Checks if points were already awarded for this transaction to prevent duplicates
   */
  async awardTransactionPoints(
    userId: string,
    transactionAmount: number,
    transactionId: string,
    transactionType: 'send' | 'receive'
  ): Promise<PointsAwardResult> {
    try {
      // ✅ CRITICAL: Check if points were already awarded for this transaction (idempotency)
      // This prevents duplicate point awards if the function is called multiple times
      const existingPointsTransaction = await this.getPointsTransactionBySourceId(userId, transactionId);
      if (existingPointsTransaction) {
        logger.info('Points already awarded for this transaction, skipping duplicate award', {
          userId,
          transactionId,
          transactionAmount,
          existingPointsAmount: existingPointsTransaction.amount,
          existingPointsTransactionId: existingPointsTransaction.id
        }, 'PointsService');
        return {
          success: true,
          pointsAwarded: existingPointsTransaction.amount,
          totalPoints: await this.getUserPoints(userId),
          error: undefined
        };
      }

      // Only award points for 'send' transactions (sender gets points)
      if (transactionType !== 'send') {
        return {
          success: false,
          pointsAwarded: 0,
          totalPoints: await this.getUserPoints(userId),
          error: 'Points only awarded to transaction sender'
        };
      }

      // Validate transaction amount
      if (transactionAmount < MIN_TRANSACTION_AMOUNT_FOR_POINTS) {
        logger.warn('Transaction amount too small to award points', {
          userId,
          transactionAmount,
          transactionId,
          minimumAmount: MIN_TRANSACTION_AMOUNT_FOR_POINTS
        }, 'PointsService');
        return {
          success: false,
          pointsAwarded: 0,
          totalPoints: await this.getUserPoints(userId),
          error: `Transaction amount too small to award points (minimum: $${MIN_TRANSACTION_AMOUNT_FOR_POINTS})`
        };
      }

      // Get user to check partnership status
      const user = await firebaseDataService.user.getCurrentUser(userId);
      const isPartnership = user.is_partnership || false;
      
      // Get current season
      const season = seasonService.getCurrentSeason();
      
      // Get season-based reward for transaction
      const reward = getSeasonReward('transaction_1_1_request', season, isPartnership);
      const basePoints = calculateRewardPoints(reward, transactionAmount);
      
      // Note: Community badge bonus is automatically applied in awardSeasonPoints()
      // This ensures double points for all users with active community badges

      if (basePoints <= 0) {
        logger.warn('Calculated points are zero or negative', {
          userId,
          transactionAmount,
          basePoints,
          transactionId,
          season,
          isPartnership,
          reward
        }, 'PointsService');
        return {
          success: false,
          pointsAwarded: 0,
          totalPoints: await this.getUserPoints(userId),
          error: 'Calculated points are zero or negative'
        };
      }

      logger.info('Awarding transaction points', {
        userId,
        transactionAmount,
        basePoints,
        transactionId,
        season,
        isPartnership,
        rewardType: reward.type,
        rewardValue: reward.value
      }, 'PointsService');

      // Award points to user with season info
      // Community badge bonus will be applied automatically in awardSeasonPoints()
      const result = await this.awardSeasonPoints(
        userId,
        basePoints,
        'transaction_reward',
        transactionId,
        `Points for ${transactionAmount} USDC transaction (Season ${season})`,
        season,
        'transaction_1_1_request'
      );

      return result;
    } catch (error) {
      logger.error('Failed to award transaction points', { error: error instanceof Error ? error.message : String(error) }, 'PointsService');
      return {
        success: false,
        pointsAwarded: 0,
        totalPoints: await this.getUserPoints(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Award points to a user (season-based or legacy)
   * 
   * This is the unified method for awarding points. If season is not provided,
   * it defaults to the current season. This consolidates the previous
   * awardPoints() and awardSeasonPoints() methods.
   * 
   * @param userId - User ID
   * @param amount - Points amount to award
   * @param source - Source of the points
   * @param sourceId - Optional source ID (transaction ID, quest ID, etc.)
   * @param description - Optional description
   * @param season - Optional season number (defaults to current season)
   * @param taskType - Optional task type for tracking
   */
  async awardSeasonPoints(
    userId: string,
    amount: number,
    source: 'transaction_reward' | 'quest_completion' | 'admin_adjustment' | 'season_reward' | 'referral_reward',
    sourceId?: string,
    description?: string,
    season?: Season,
    taskType?: string
  ): Promise<PointsAwardResult> {
    try {
      if (amount <= 0) {
        return {
          success: false,
          pointsAwarded: 0,
          totalPoints: await this.getUserPoints(userId),
          error: 'Points amount must be greater than 0'
        };
      }

      // Apply community badge bonus (double points) for all sources except admin adjustments
      // Admin adjustments should not be doubled as they are manual corrections
      let finalAmount = amount;
      let bonusApplied = false;
      let bonusInfo: { hasActiveCommunityBadge: boolean; multiplier: number; activeBadgeId?: string } | null = null;
      
      if (source !== 'admin_adjustment') {
        const bonusResult = await applyCommunityBadgeBonus(amount, userId);
        finalAmount = bonusResult.finalPoints;
        bonusApplied = bonusResult.hasActiveCommunityBadge;
        bonusInfo = {
          hasActiveCommunityBadge: bonusResult.hasActiveCommunityBadge,
          multiplier: bonusResult.multiplier,
          activeBadgeId: bonusResult.activeBadgeId
        };
        
        if (bonusApplied) {
          logger.info('Community badge bonus applied in awardSeasonPoints', {
            userId,
            source,
            baseAmount: amount,
            finalAmount,
            multiplier: bonusResult.multiplier,
            activeBadgeId: bonusResult.activeBadgeId
          }, 'PointsService');
        }
      }

      // Get current user points
      const currentPoints = await this.getUserPoints(userId);

      // Update user document with new points
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return {
          success: false,
          pointsAwarded: 0,
          totalPoints: 0,
          error: 'User not found'
        };
      }

      const newPoints = (userDoc.data().points || 0) + finalAmount;
      const totalEarned = (userDoc.data().total_points_earned || 0) + finalAmount;

      // Update user points atomically
      await updateDoc(userRef, {
        points: newPoints,
        total_points_earned: totalEarned,
        points_last_updated: serverTimestamp()
      });

      // Use current season if not provided (for backward compatibility)
      const effectiveSeason = season !== undefined ? season : seasonService.getCurrentSeason();

      // Update description to include bonus info if applied
      let finalDescription = description || `Awarded ${amount} points`;
      if (bonusApplied && bonusInfo) {
        // Only add bonus note if description doesn't already mention it
        if (!description?.includes('Community Badge Bonus')) {
          finalDescription = `${description || `Awarded ${amount} points`} - Community Badge Bonus: ${bonusInfo.multiplier}x`;
        }
      }

      // Record points transaction with season info
      await this.recordPointsTransaction(
        userId,
        finalAmount,
        source,
        sourceId || '',
        finalDescription,
        effectiveSeason,
        taskType
      );

      logger.info('Points awarded successfully', {
        userId,
        baseAmount: amount,
        finalAmount,
        currentPoints,
        newPoints,
        source,
        season: effectiveSeason,
        taskType,
        hasActiveCommunityBadge: bonusInfo?.hasActiveCommunityBadge || false,
        multiplier: bonusInfo?.multiplier || 1
      }, 'PointsService');

      return {
        success: true,
        pointsAwarded: finalAmount,
        totalPoints: newPoints
      };
    } catch (error) {
      logger.error('Failed to award season points', { error: error instanceof Error ? error.message : String(error) }, 'PointsService');
      return {
        success: false,
        pointsAwarded: 0,
        totalPoints: await this.getUserPoints(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Award points to a user (legacy method - now redirects to awardSeasonPoints)
   * 
   * @deprecated Use awardSeasonPoints() instead. This method is kept for backward compatibility
   * and will be removed in a future version.
   */
  awardPoints(
    userId: string,
    amount: number,
    source: 'transaction_reward' | 'quest_completion' | 'admin_adjustment' | 'season_reward' | 'referral_reward',
    sourceId?: string,
    description?: string
  ): Promise<PointsAwardResult> {
    // Redirect to awardSeasonPoints (season will default to current season)
    return this.awardSeasonPoints(
      userId,
      amount,
      source,
      sourceId,
      description
      // season and taskType are optional - will default to current season
    );
  }

  /**
   * Get user's current points
   */
  async getUserPoints(userId: string): Promise<number> {
    try {
      const user = await firebaseDataService.user.getCurrentUser(userId);
      return user.points || 0;
    } catch (error) {
      logger.error('Failed to get user points', { error: error instanceof Error ? error.message : String(error) }, 'PointsService');
      return 0;
    }
  }

  /**
   * Check if points were already awarded for a transaction (idempotency check)
   * @param userId - User ID
   * @param sourceId - Transaction signature/ID
   * @returns Existing points transaction if found, null otherwise
   */
  private async getPointsTransactionBySourceId(
    userId: string,
    sourceId: string
  ): Promise<PointsTransaction | null> {
    try {
      const { collection, query, where, getDocs, limit: limitQuery } = await import('firebase/firestore');
      
      // Query for existing points transaction with this source_id
      const q = query(
        collection(db, 'points_transactions'),
        where('user_id', '==', userId),
        where('source', '==', 'transaction_reward'),
        where('source_id', '==', sourceId),
        limitQuery(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty && querySnapshot.docs.length > 0) {
        const docSnapshot = querySnapshot.docs[0];
        if (docSnapshot) {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            user_id: data.user_id,
            amount: data.amount,
            source: data.source,
            source_id: data.source_id,
            description: data.description,
            created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            season: data.season,
            task_type: data.task_type
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to check for existing points transaction', { error: error instanceof Error ? error.message : String(error) }, 'PointsService');
      // Return null on error to allow the award to proceed (fail open)
      return null;
    }
  }

  /**
   * Record a points transaction for history
   */
  async recordPointsTransaction(
    userId: string,
    amount: number,
    source: 'transaction_reward' | 'quest_completion' | 'admin_adjustment' | 'season_reward' | 'referral_reward',
    sourceId: string,
    description: string,
    season?: Season,
    taskType?: string
  ): Promise<void> {
    try {
      const transactionData: Omit<PointsTransaction, 'id' | 'created_at'> = {
        user_id: userId,
        amount,
        source,
        source_id: sourceId,
        description,
        ...(season !== undefined && { season }),
        ...(taskType && { task_type: taskType })
      };

      await addDoc(collection(db, 'points_transactions'), {
        ...transactionData,
        created_at: serverTimestamp()
      });

      logger.info('Points transaction recorded', {
        userId,
        amount,
        source,
        sourceId,
        season,
        taskType
      }, 'PointsService');
    } catch (error) {
      logger.error('Failed to record points transaction', { error: error instanceof Error ? error.message : String(error) }, 'PointsService');
      // Don't throw - this is not critical for the points award
    }
  }

  /**
   * Get user's points history
   * @param userId - User ID
   * @param limit - Maximum number of transactions to return
   * @param seasonFilter - Optional season filter (1-5). If provided, only returns transactions from that season.
   */
  async getPointsHistory(userId: string, limit: number = 50, seasonFilter?: Season): Promise<PointsTransaction[]> {
    try {
      const { collection, query, where, orderBy, limit: limitQuery, getDocs } = await import('firebase/firestore');
      
      // Build query with optional season filter
      // Note: Firestore requires filters before orderBy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queryConstraints: any[] = [
        where('user_id', '==', userId)
      ];

      // Add season filter if provided (must come before orderBy)
      if (seasonFilter !== undefined) {
        queryConstraints.push(where('season', '==', seasonFilter));
      }

      // Add orderBy and limit
      queryConstraints.push(orderBy('created_at', 'desc'));
      queryConstraints.push(limitQuery(limit));

      const q = query(
        collection(db, 'points_transactions'),
        ...queryConstraints
      );

      const querySnapshot = await getDocs(q);
      const transactions: PointsTransaction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          user_id: data.user_id,
          amount: data.amount,
          source: data.source,
          source_id: data.source_id,
          description: data.description,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          season: data.season,
          task_type: data.task_type
        });
      });

      return transactions;
    } catch (error) {
      logger.error('Failed to get points history', { error: error instanceof Error ? error.message : String(error) }, 'PointsService');
      return [];
    }
  }
}

// Export singleton instance
export const pointsService = new PointsService();

