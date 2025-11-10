/**
 * Split Rewards Service
 * Manages rewards for Fair Split and Degen Split participation
 */

import { logger } from '../analytics/loggingService';
import { pointsService } from './pointsService';
import { seasonService, Season } from './seasonService';
import { getSeasonReward, calculateRewardPoints } from './seasonRewardsConfig';
import { firebaseDataService } from '../data/firebaseDataService';
import { referralService } from './referralService';

export interface SplitRewardParams {
  userId: string;
  splitId: string;
  splitType: 'fair' | 'degen';
  splitAmount: number;
  isOwner: boolean;
  isWinner?: boolean; // For degen splits
}

class SplitRewardsService {
  /**
   * Award points for participating in a Fair Split
   */
  async awardFairSplitParticipation(params: SplitRewardParams): Promise<{
    success: boolean;
    pointsAwarded: number;
    error?: string;
  }> {
    try {
      const { userId, splitId, splitAmount, isOwner } = params;

      // Get user to check partnership status
      const user = await firebaseDataService.user.getCurrentUser(userId);
      const isPartnership = user.is_partnership || false;
      
      // Get current season
      const season = seasonService.getCurrentSeason();
      
      let pointsAwarded = 0;
      let taskType: string;

      if (isOwner) {
        // Owner bonus
        const reward = getSeasonReward('create_fair_split_owner_bonus', season, isPartnership);
        pointsAwarded = calculateRewardPoints(reward, splitAmount);
        taskType = 'create_fair_split_owner_bonus';
      } else {
        // Participant reward
        const reward = getSeasonReward('participate_fair_split', season, isPartnership);
        pointsAwarded = calculateRewardPoints(reward, splitAmount);
        taskType = 'participate_fair_split';
      }

      if (pointsAwarded > 0) {
        const result = await pointsService.awardSeasonPoints(
          userId,
          pointsAwarded,
          'season_reward',
          splitId,
          `${isOwner ? 'Fair Split Owner' : 'Fair Split Participant'} reward (Season ${season})`,
          season,
          taskType
        );

        if (result.success) {
          logger.info('Fair split participation reward awarded', {
            userId,
            splitId,
            splitAmount,
            isOwner,
            pointsAwarded,
            season,
            isPartnership
          }, 'SplitRewardsService');

          // Check if this is user's first split with friends for referral tracking
          if (user.referred_by) {
            await referralService.awardFriendFirstSplitReward(
              user.referred_by,
              userId,
              splitAmount
            );
          }

          return {
            success: true,
            pointsAwarded
          };
        }
      }

      return {
        success: false,
        pointsAwarded: 0,
        error: 'Failed to award points'
      };
    } catch (error) {
      logger.error('Failed to award fair split participation reward', error, 'SplitRewardsService');
      return {
        success: false,
        pointsAwarded: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Award points for Degen Split participation (win or lose)
   */
  async awardDegenSplitParticipation(params: SplitRewardParams): Promise<{
    success: boolean;
    pointsAwarded: number;
    error?: string;
  }> {
    try {
      const { userId, splitId, splitAmount, isWinner } = params;

      if (isWinner === undefined) {
        return {
          success: false,
          pointsAwarded: 0,
          error: 'isWinner must be specified for degen splits'
        };
      }

      // Get user to check partnership status
      const user = await firebaseDataService.user.getCurrentUser(userId);
      const isPartnership = user.is_partnership || false;
      
      // Get current season
      const season = seasonService.getCurrentSeason();
      
      let pointsAwarded = 0;
      let taskType: string;

      if (isWinner) {
        // Winner reward
        const reward = getSeasonReward('degen_split_win', season, isPartnership);
        pointsAwarded = calculateRewardPoints(reward, splitAmount);
        taskType = 'degen_split_win';
      } else {
        // Loser reward
        const reward = getSeasonReward('degen_split_lose', season, isPartnership);
        pointsAwarded = calculateRewardPoints(reward, splitAmount);
        taskType = 'degen_split_lose';
      }

      if (pointsAwarded > 0) {
        const result = await pointsService.awardSeasonPoints(
          userId,
          pointsAwarded,
          'season_reward',
          splitId,
          `Degen Split ${isWinner ? 'Win' : 'Lose'} reward (Season ${season})`,
          season,
          taskType
        );

        if (result.success) {
          logger.info('Degen split participation reward awarded', {
            userId,
            splitId,
            splitAmount,
            isWinner,
            pointsAwarded,
            season,
            isPartnership
          }, 'SplitRewardsService');

          // Check if this is user's first split with friends for referral tracking
          if (user.referred_by) {
            await referralService.awardFriendFirstSplitReward(
              user.referred_by,
              userId,
              splitAmount
            );
          }

          return {
            success: true,
            pointsAwarded
          };
        }
      }

      return {
        success: false,
        pointsAwarded: 0,
        error: 'Failed to award points'
      };
    } catch (error) {
      logger.error('Failed to award degen split participation reward', error, 'SplitRewardsService');
      return {
        success: false,
        pointsAwarded: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Award points for split participation (handles both Fair and Degen splits)
   */
  async awardSplitParticipation(params: SplitRewardParams): Promise<{
    success: boolean;
    pointsAwarded: number;
    error?: string;
  }> {
    if (params.splitType === 'fair') {
      return this.awardFairSplitParticipation(params);
    } else if (params.splitType === 'degen') {
      return this.awardDegenSplitParticipation(params);
    } else {
      return {
        success: false,
        pointsAwarded: 0,
        error: 'Invalid split type'
      };
    }
  }
}

// Export singleton instance
export const splitRewardsService = new SplitRewardsService();

