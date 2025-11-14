/**
 * Points Service
 * Manages user points for transactions and quests
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { PointsAwardResult, PointsTransaction } from '../../types/rewards';
import { firebaseDataService } from '../data/firebaseDataService';
import { MIN_TRANSACTION_AMOUNT_FOR_POINTS } from './rewardsConfig';
import { seasonService, Season } from './seasonService';
import { getSeasonReward, calculateRewardPoints, RewardTask } from './seasonRewardsConfig';

class PointsService {
  /**
   * Award points for a wallet-to-wallet transaction
   * Uses season-based percentage rewards (All or Partnership)
   * Only awards points for internal wallet-to-wallet transfers (not external)
   * Only awards points for 'send' transactions (sender gets points)
   */
  async awardTransactionPoints(
    userId: string,
    transactionAmount: number,
    transactionId: string,
    transactionType: 'send' | 'receive'
  ): Promise<PointsAwardResult> {
    try {
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
      const pointsAwarded = calculateRewardPoints(reward, transactionAmount);

      if (pointsAwarded <= 0) {
        logger.warn('Calculated points are zero or negative', {
          userId,
          transactionAmount,
          pointsAwarded,
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
        pointsAwarded,
        transactionId,
        season,
        isPartnership,
        rewardType: reward.type,
        rewardValue: reward.value
      }, 'PointsService');

      // Award points to user with season info
      const result = await this.awardSeasonPoints(
        userId,
        pointsAwarded,
        'transaction_reward',
        transactionId,
        `Points for ${transactionAmount} USDC transaction (Season ${season})`,
        season,
        'transaction_1_1_request'
      );

      return result;
    } catch (error) {
      logger.error('Failed to award transaction points', error, 'PointsService');
      return {
        success: false,
        pointsAwarded: 0,
        totalPoints: await this.getUserPoints(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Award season-based points to a user
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

      const newPoints = (userDoc.data().points || 0) + amount;
      const totalEarned = (userDoc.data().total_points_earned || 0) + amount;

      // Update user points atomically
      await updateDoc(userRef, {
        points: newPoints,
        total_points_earned: totalEarned,
        points_last_updated: serverTimestamp()
      });

      // Record points transaction with season info
      await this.recordPointsTransaction(
        userId,
        amount,
        source,
        sourceId || '',
        description || `Awarded ${amount} points`,
        season,
        taskType
      );

      logger.info('Season points awarded successfully', {
        userId,
        amount,
        currentPoints,
        newPoints,
        source,
        season,
        taskType
      }, 'PointsService');

      return {
        success: true,
        pointsAwarded: amount,
        totalPoints: newPoints
      };
    } catch (error) {
      logger.error('Failed to award season points', error, 'PointsService');
      return {
        success: false,
        pointsAwarded: 0,
        totalPoints: await this.getUserPoints(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Award points to a user (legacy method, now uses season-based)
   */
  async awardPoints(
    userId: string,
    amount: number,
    source: 'transaction_reward' | 'quest_completion' | 'admin_adjustment' | 'season_reward' | 'referral_reward',
    sourceId?: string,
    description?: string
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

      const newPoints = (userDoc.data().points || 0) + amount;
      const totalEarned = (userDoc.data().total_points_earned || 0) + amount;

      // Update user points atomically
      await updateDoc(userRef, {
        points: newPoints,
        total_points_earned: totalEarned,
        points_last_updated: serverTimestamp()
      });

      // Record points transaction (without season info for legacy compatibility)
      await this.recordPointsTransaction(
        userId,
        amount,
        source,
        sourceId || '',
        description || `Awarded ${amount} points`
      );

      logger.info('Points awarded successfully', {
        userId,
        amount,
        currentPoints,
        newPoints,
        source
      }, 'PointsService');

      return {
        success: true,
        pointsAwarded: amount,
        totalPoints: newPoints
      };
    } catch (error) {
      logger.error('Failed to award points', error, 'PointsService');
      return {
        success: false,
        pointsAwarded: 0,
        totalPoints: await this.getUserPoints(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's current points
   */
  async getUserPoints(userId: string): Promise<number> {
    try {
      const user = await firebaseDataService.user.getCurrentUser(userId);
      return user.points || 0;
    } catch (error) {
      logger.error('Failed to get user points', error, 'PointsService');
      return 0;
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
      logger.error('Failed to record points transaction', error, 'PointsService');
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
      logger.error('Failed to get points history', error, 'PointsService');
      return [];
    }
  }
}

// Export singleton instance
export const pointsService = new PointsService();

