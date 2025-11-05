/**
 * Points Service
 * Manages user points for transactions and quests
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { PointsAwardResult, PointsTransaction } from '../../types/rewards';
import { firebaseDataService } from '../data/firebaseDataService';
import { calculateTransactionPoints, MIN_TRANSACTION_AMOUNT_FOR_POINTS } from './rewardsConfig';

class PointsService {
  /**
   * Award points for a wallet-to-wallet transaction
   * Awards 10% of the transaction amount as points (see TRANSACTION_POINTS_PERCENTAGE in rewardsConfig.ts)
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

      // Calculate points: 10% of transaction amount (rounded, minimum 1 point for transactions >= $1)
      // Example: $1 transfer = 1 point, $10 transfer = 1 point, $100 transfer = 10 points
      const pointsAwarded = calculateTransactionPoints(transactionAmount);

      if (pointsAwarded <= 0) {
        logger.warn('Calculated points are zero or negative', {
          userId,
          transactionAmount,
          pointsAwarded,
          transactionId,
          calculatedPercentage: transactionAmount * 0.10
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
        transactionId
      }, 'PointsService');

      // Award points to user
      const result = await this.awardPoints(
        userId,
        pointsAwarded,
        'transaction_reward',
        transactionId,
        `Points for ${transactionAmount} USDC transaction`
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
   * Award points to a user
   */
  async awardPoints(
    userId: string,
    amount: number,
    source: 'transaction_reward' | 'quest_completion' | 'admin_adjustment',
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

      // Record points transaction
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
    source: 'transaction_reward' | 'quest_completion' | 'admin_adjustment',
    sourceId: string,
    description: string
  ): Promise<void> {
    try {
      const transactionData: Omit<PointsTransaction, 'id' | 'created_at'> = {
        user_id: userId,
        amount,
        source,
        source_id: sourceId,
        description
      };

      await addDoc(collection(db, 'points_transactions'), {
        ...transactionData,
        created_at: serverTimestamp()
      });

      logger.info('Points transaction recorded', {
        userId,
        amount,
        source,
        sourceId
      }, 'PointsService');
    } catch (error) {
      logger.error('Failed to record points transaction', error, 'PointsService');
      // Don't throw - this is not critical for the points award
    }
  }

  /**
   * Get user's points history
   */
  async getPointsHistory(userId: string, limit: number = 50): Promise<PointsTransaction[]> {
    try {
      const { collection, query, where, orderBy, limit: limitQuery, getDocs } = await import('firebase/firestore');
      const q = query(
        collection(db, 'points_transactions'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
        limitQuery(limit)
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
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString()
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

