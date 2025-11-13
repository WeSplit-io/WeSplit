/**
 * Referral Service
 * Manages referral tracking and rewards
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { pointsService } from './pointsService';
import { seasonService, Season } from './seasonService';
import { getSeasonReward, calculateRewardPoints } from './seasonRewardsConfig';
import { firebaseDataService } from '../data/firebaseDataService';
import { questService } from './questService';
import { 
  REFERRAL_REWARDS, 
  getReferralRewardConfig, 
  getReferralRewardsByTrigger,
  ReferralRewardConfig 
} from './referralConfig';

/**
 * Referral status types
 */
export type ReferralStatus = 
  | 'pending'      // Referral created, friend hasn't signed up
  | 'active'        // Friend signed up, working on milestones
  | 'completed'     // All rewards earned
  | 'expired';      // Referral expired (if expiration is implemented)

/**
 * Referral milestone tracking
 */
export interface ReferralMilestone {
  achieved: boolean;
  achievedAt?: string;
  amount?: number; // For split/transaction milestones
}

/**
 * Referral reward tracking
 */
export interface ReferralRewardTracking {
  awarded: boolean;
  awardedAt?: string;
  pointsAwarded?: number;
  season?: number;
}

/**
 * Enhanced Referral interface with comprehensive status tracking
 */
export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserName?: string;
  createdAt: string;
  expiresAt?: string; // Optional expiration date
  
  // Status tracking
  status: ReferralStatus;
  
  // Milestone tracking
  milestones: {
    accountCreated: ReferralMilestone;
    firstSplit: ReferralMilestone;
    firstTransaction?: ReferralMilestone; // Optional for future use
  };
  
  // Legacy fields (for backward compatibility)
  hasCreatedAccount: boolean;
  hasDoneFirstSplit: boolean;
  firstSplitAmount?: number;
  
  // Reward tracking (enhanced)
  rewardsAwarded: {
    accountCreated: boolean; // Legacy
    firstSplitOver10: boolean; // Legacy
    [rewardId: string]: boolean | ReferralRewardTracking; // Enhanced tracking
  };
  
  // Analytics
  totalPointsEarned?: number;
  lastActivityAt?: string;
}

class ReferralService {
  /**
   * Generate a unique referral code for a user
   */
  generateReferralCode(userId: string): string {
    // Use first 8 chars of userId + timestamp
    const timestamp = Date.now().toString(36);
    const userIdPrefix = userId.substring(0, 8).toUpperCase();
    return `${userIdPrefix}${timestamp}`.substring(0, 12);
  }

  /**
   * Track a referral when a new user signs up
   */
  async trackReferral(referredUserId: string, referralCode?: string, referrerId?: string): Promise<{
    success: boolean;
    referrerId?: string;
    error?: string;
  }> {
    try {
      // If referrerId is provided, use it directly
      if (referrerId) {
        await this.createReferralRecord(referrerId, referredUserId);
        
        // Award points to referrer for friend creating account
        await this.awardInviteFriendReward(referrerId, referredUserId);
        
        return { success: true, referrerId };
      }

      // If referral code is provided, find the referrer
      if (referralCode) {
        const referrer = await this.findReferrerByCode(referralCode);
        if (referrer) {
          await this.createReferralRecord(referrer.id, referredUserId);
          
          // Award points to referrer for friend creating account
          await this.awardInviteFriendReward(referrer.id, referredUserId);
          
          // Update referred user's referred_by field
          await firebaseDataService.user.updateUser(referredUserId, {
            referred_by: referrer.id
          });
          
          return { success: true, referrerId: referrer.id };
        }
      }

      return { success: false, error: 'No valid referral found' };
    } catch (error) {
      logger.error('Failed to track referral', error, 'ReferralService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a referral record with enhanced status tracking
   */
  private async createReferralRecord(referrerId: string, referredUserId: string): Promise<void> {
    try {
      const referralId = `ref_${referrerId}_${referredUserId}_${Date.now()}`;
      const referralRef = doc(db, 'referrals', referralId);
      
      const referredUser = await firebaseDataService.user.getCurrentUser(referredUserId);
      
      // Initialize enhanced referral record
      await setDoc(referralRef, {
        id: referralId,
        referrerId,
        referredUserId,
        referredUserName: referredUser.name,
        createdAt: serverTimestamp(),
        status: 'active' as ReferralStatus, // Friend has signed up, so status is active
        milestones: {
          accountCreated: {
            achieved: true,
            achievedAt: new Date().toISOString()
          },
          firstSplit: {
            achieved: false
          }
        },
        // Legacy fields (for backward compatibility)
        hasCreatedAccount: true,
        hasDoneFirstSplit: false,
        rewardsAwarded: {
          accountCreated: false,
          firstSplitOver10: false
        },
        totalPointsEarned: 0,
        lastActivityAt: serverTimestamp()
      });

      logger.info('Referral record created', {
        referralId,
        referrerId,
        referredUserId,
        status: 'active'
      }, 'ReferralService');
    } catch (error) {
      logger.error('Failed to create referral record', error, 'ReferralService');
      throw error;
    }
  }

  /**
   * Find referrer by referral code
   */
  private async findReferrerByCode(referralCode: string): Promise<{ id: string; referral_code?: string } | null> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('referral_code', '==', referralCode));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return {
          id: userDoc.id,
          referral_code: userDoc.data().referral_code
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to find referrer by code', error, 'ReferralService');
      return null;
    }
  }

  /**
   * Award points to referrer when friend creates account
   * Uses referral configuration for maintainability
   */
  async awardInviteFriendReward(referrerId: string, referredUserId: string): Promise<void> {
    try {
      // Get referral reward configuration
      const rewardConfig = getReferralRewardConfig('invite_friend_account');
      if (!rewardConfig || !rewardConfig.enabled) {
        logger.warn('Invite friend reward not configured or disabled', {
          referrerId,
          referredUserId
        }, 'ReferralService');
        return;
      }

      // Check if reward already awarded
      const referral = await this.getReferral(referrerId, referredUserId);
      if (referral && referral.rewardsAwarded.accountCreated) {
        logger.info('Invite friend reward already awarded', {
          referrerId,
          referredUserId
        }, 'ReferralService');
        return;
      }

      // Award reward using quest service (handles season-based rewards)
      const questResult = await questService.completeQuest(referrerId, rewardConfig.taskType);
      
      if (questResult.success) {
        // Update referral record with enhanced tracking
        await this.updateReferralRewardEnhanced(
          referrerId, 
          referredUserId, 
          rewardConfig.rewardId,
          {
            awarded: true,
            awardedAt: new Date().toISOString(),
            pointsAwarded: questResult.pointsAwarded,
            season: seasonService.getCurrentSeason()
          }
        );
        
        // Update legacy field for backward compatibility
        await this.updateReferralReward(referrerId, referredUserId, 'accountCreated', true);
        
        // Update referral status
        await this.updateReferralStatus(referrerId, referredUserId);
        
        logger.info('Invite friend reward awarded', {
          referrerId,
          referredUserId,
          rewardId: rewardConfig.rewardId,
          pointsAwarded: questResult.pointsAwarded
        }, 'ReferralService');
      }
    } catch (error) {
      logger.error('Failed to award invite friend reward', error, 'ReferralService');
    }
  }

  /**
   * Award points to referrer when friend does first split > $10
   * Uses referral configuration for maintainability
   */
  async awardFriendFirstSplitReward(referrerId: string, referredUserId: string, splitAmount: number): Promise<void> {
    try {
      // Get referral reward configuration
      const rewardConfig = getReferralRewardConfig('friend_first_split');
      if (!rewardConfig || !rewardConfig.enabled) {
        logger.warn('Friend first split reward not configured or disabled', {
          referrerId,
          referredUserId
        }, 'ReferralService');
        return;
      }

      // Check condition (min split amount)
      if (rewardConfig.condition?.minSplitAmount && splitAmount < rewardConfig.condition.minSplitAmount) {
        logger.info('Split amount does not meet minimum requirement', {
          referrerId,
          referredUserId,
          splitAmount,
          minAmount: rewardConfig.condition.minSplitAmount
        }, 'ReferralService');
        return;
      }

      // Check if reward already awarded
      const referral = await this.getReferral(referrerId, referredUserId);
      if (referral && referral.rewardsAwarded.firstSplitOver10) {
        logger.info('Friend first split reward already awarded', {
          referrerId,
          referredUserId
        }, 'ReferralService');
        return;
      }

      // Get season and calculate reward
      const season = seasonService.getCurrentSeason();
      const reward = getSeasonReward(rewardConfig.taskType, season, false);
      const pointsAwarded = calculateRewardPoints(reward, 0);

      // Award points
      const result = await pointsService.awardSeasonPoints(
        referrerId,
        pointsAwarded,
        'referral_reward',
        `ref_split_${referredUserId}`,
        `${rewardConfig.description} (Season ${season})`,
        season,
        rewardConfig.taskType
      );

      if (result.success) {
        // Update referral record with enhanced tracking
        await this.updateReferralRewardEnhanced(
          referrerId,
          referredUserId,
          rewardConfig.rewardId,
          {
            awarded: true,
            awardedAt: new Date().toISOString(),
            pointsAwarded,
            season
          }
        );
        
        // Update milestone
        await this.updateReferralMilestone(referrerId, referredUserId, 'firstSplit', {
          achieved: true,
          achievedAt: new Date().toISOString(),
          amount: splitAmount
        });
        
        // Update legacy fields for backward compatibility
        await this.updateReferralReward(referrerId, referredUserId, 'firstSplitOver10', true);
        await this.updateReferralSplitInfo(referrerId, referredUserId, splitAmount);
        
        // Update referral status
        await this.updateReferralStatus(referrerId, referredUserId);
        
        logger.info('Friend first split reward awarded', {
          referrerId,
          referredUserId,
          rewardId: rewardConfig.rewardId,
          splitAmount,
          pointsAwarded,
          season
        }, 'ReferralService');
      }
    } catch (error) {
      logger.error('Failed to award friend first split reward', error, 'ReferralService');
    }
  }

  /**
   * Get referral record with enhanced status tracking
   */
  private async getReferral(referrerId: string, referredUserId: string): Promise<Referral | null> {
    try {
      const referralsRef = collection(db, 'referrals');
      const q = query(
        referralsRef,
        where('referrerId', '==', referrerId),
        where('referredUserId', '==', referredUserId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        // Build enhanced referral object with backward compatibility
        return {
          id: doc.id,
          referrerId: data.referrerId,
          referredUserId: data.referredUserId,
          referredUserName: data.referredUserName,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          expiresAt: data.expiresAt?.toDate?.()?.toISOString(),
          status: data.status || (data.hasCreatedAccount ? 'active' : 'pending') as ReferralStatus,
          milestones: {
            accountCreated: data.milestones?.accountCreated || {
              achieved: data.hasCreatedAccount || false,
              achievedAt: data.milestones?.accountCreated?.achievedAt
            },
            firstSplit: data.milestones?.firstSplit || {
              achieved: data.hasDoneFirstSplit || false,
              achievedAt: data.milestones?.firstSplit?.achievedAt,
              amount: data.firstSplitAmount
            },
            firstTransaction: data.milestones?.firstTransaction
          },
          // Legacy fields (for backward compatibility)
          hasCreatedAccount: data.hasCreatedAccount || data.milestones?.accountCreated?.achieved || false,
          hasDoneFirstSplit: data.hasDoneFirstSplit || data.milestones?.firstSplit?.achieved || false,
          firstSplitAmount: data.firstSplitAmount || data.milestones?.firstSplit?.amount,
          rewardsAwarded: {
            accountCreated: data.rewardsAwarded?.accountCreated || false,
            firstSplitOver10: data.rewardsAwarded?.firstSplitOver10 || false,
            // Enhanced tracking (merge with legacy)
            ...(data.rewardsAwarded || {})
          },
          totalPointsEarned: data.totalPointsEarned || 0,
          lastActivityAt: data.lastActivityAt?.toDate?.()?.toISOString()
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get referral', error, 'ReferralService');
      return null;
    }
  }

  /**
   * Update referral reward status
   */
  private async updateReferralReward(
    referrerId: string,
    referredUserId: string,
    rewardType: 'accountCreated' | 'firstSplitOver10',
    awarded: boolean
  ): Promise<void> {
    try {
      const referral = await this.getReferral(referrerId, referredUserId);
      if (!referral) {
        return;
      }

      const referralRef = doc(db, 'referrals', referral.id);
      await setDoc(referralRef, {
        rewardsAwarded: {
          ...referral.rewardsAwarded,
          [rewardType]: awarded
        }
      }, { merge: true });
    } catch (error) {
      logger.error('Failed to update referral reward', error, 'ReferralService');
    }
  }

  /**
   * Update referral split info
   */
  private async updateReferralSplitInfo(
    referrerId: string,
    referredUserId: string,
    splitAmount: number
  ): Promise<void> {
    try {
      const referral = await this.getReferral(referrerId, referredUserId);
      if (!referral) {
        return;
      }

      const referralRef = doc(db, 'referrals', referral.id);
      await setDoc(referralRef, {
        hasDoneFirstSplit: true,
        firstSplitAmount: splitAmount
      }, { merge: true });
    } catch (error) {
      logger.error('Failed to update referral split info', error, 'ReferralService');
    }
  }

  /**
   * Update referral status based on milestones and rewards
   */
  private async updateReferralStatus(referrerId: string, referredUserId: string): Promise<void> {
    try {
      const referral = await this.getReferral(referrerId, referredUserId);
      if (!referral) {
        return;
      }

      // Calculate status based on milestones and rewards
      let status: ReferralStatus = 'pending';
      
      if (referral.milestones.accountCreated.achieved) {
        status = 'active';
      }
      
      // Check if all enabled rewards have been awarded
      const enabledRewards = REFERRAL_REWARDS.filter(r => r.enabled);
      const allRewardsAwarded = enabledRewards.every(reward => {
        const rewardTracking = referral.rewardsAwarded[reward.rewardId];
        if (typeof rewardTracking === 'object' && rewardTracking !== null) {
          return (rewardTracking as ReferralRewardTracking).awarded === true;
        }
        // Legacy check
        if (reward.rewardId === 'invite_friend_account') {
          return referral.rewardsAwarded.accountCreated === true;
        }
        if (reward.rewardId === 'friend_first_split') {
          return referral.rewardsAwarded.firstSplitOver10 === true;
        }
        return false;
      });
      
      if (allRewardsAwarded && referral.milestones.accountCreated.achieved) {
        status = 'completed';
      }

      // Update status if changed
      if (status !== referral.status) {
        const referralRef = doc(db, 'referrals', referral.id);
        await setDoc(referralRef, {
          status,
          lastActivityAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (error) {
      logger.error('Failed to update referral status', error, 'ReferralService');
    }
  }

  /**
   * Update referral reward with enhanced tracking
   */
  private async updateReferralRewardEnhanced(
    referrerId: string,
    referredUserId: string,
    rewardId: string,
    tracking: ReferralRewardTracking
  ): Promise<void> {
    try {
      const referral = await this.getReferral(referrerId, referredUserId);
      if (!referral) {
        return;
      }

      const referralRef = doc(db, 'referrals', referral.id);
      
      // Update enhanced reward tracking
      const updatedRewardsAwarded = {
        ...referral.rewardsAwarded,
        [rewardId]: tracking
      };
      
      // Calculate total points earned
      const totalPointsEarned = Object.values(updatedRewardsAwarded)
        .filter((r): r is ReferralRewardTracking => typeof r === 'object' && r !== null && 'pointsAwarded' in r)
        .reduce((sum, r) => sum + (r.pointsAwarded || 0), 0);
      
      await setDoc(referralRef, {
        rewardsAwarded: updatedRewardsAwarded,
        totalPointsEarned,
        lastActivityAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      logger.error('Failed to update referral reward enhanced', error, 'ReferralService');
    }
  }

  /**
   * Update referral milestone
   */
  private async updateReferralMilestone(
    referrerId: string,
    referredUserId: string,
    milestoneType: 'accountCreated' | 'firstSplit' | 'firstTransaction',
    milestone: ReferralMilestone
  ): Promise<void> {
    try {
      const referral = await this.getReferral(referrerId, referredUserId);
      if (!referral) {
        return;
      }

      const referralRef = doc(db, 'referrals', referral.id);
      await setDoc(referralRef, {
        milestones: {
          ...referral.milestones,
          [milestoneType]: milestone
        },
        lastActivityAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      logger.error('Failed to update referral milestone', error, 'ReferralService');
    }
  }

  /**
   * Get all referrals for a user with enhanced status tracking
   */
  async getUserReferrals(userId: string): Promise<Referral[]> {
    try {
      const referralsRef = collection(db, 'referrals');
      const q = query(referralsRef, where('referrerId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const referrals: Referral[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Build enhanced referral with backward compatibility
        referrals.push({
          id: doc.id,
          referrerId: data.referrerId,
          referredUserId: data.referredUserId,
          referredUserName: data.referredUserName,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          expiresAt: data.expiresAt?.toDate?.()?.toISOString(),
          status: data.status || (data.hasCreatedAccount ? 'active' : 'pending') as ReferralStatus,
          milestones: {
            accountCreated: data.milestones?.accountCreated || {
              achieved: data.hasCreatedAccount || false,
              achievedAt: data.milestones?.accountCreated?.achievedAt
            },
            firstSplit: data.milestones?.firstSplit || {
              achieved: data.hasDoneFirstSplit || false,
              achievedAt: data.milestones?.firstSplit?.achievedAt,
              amount: data.firstSplitAmount
            },
            firstTransaction: data.milestones?.firstTransaction
          },
          // Legacy fields
          hasCreatedAccount: data.hasCreatedAccount || data.milestones?.accountCreated?.achieved || false,
          hasDoneFirstSplit: data.hasDoneFirstSplit || data.milestones?.firstSplit?.achieved || false,
          firstSplitAmount: data.firstSplitAmount || data.milestones?.firstSplit?.amount,
          rewardsAwarded: {
            accountCreated: data.rewardsAwarded?.accountCreated || false,
            firstSplitOver10: data.rewardsAwarded?.firstSplitOver10 || false,
            ...(data.rewardsAwarded || {})
          },
          totalPointsEarned: data.totalPointsEarned || 0,
          lastActivityAt: data.lastActivityAt?.toDate?.()?.toISOString()
        });
      });
      
      return referrals;
    } catch (error) {
      logger.error('Failed to get user referrals', error, 'ReferralService');
      return [];
    }
  }

  /**
   * Get referral reward configuration (helper method)
   */
  getReferralRewardConfig(rewardId: string): ReferralRewardConfig | null {
    return getReferralRewardConfig(rewardId);
  }

  /**
   * Get all enabled referral rewards (helper method)
   */
  getAllReferralRewards(): ReferralRewardConfig[] {
    return REFERRAL_REWARDS.filter(r => r.enabled);
  }
}

// Export singleton instance
export const referralService = new ReferralService();

