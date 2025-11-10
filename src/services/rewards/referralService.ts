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

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserName?: string;
  createdAt: string;
  hasCreatedAccount: boolean;
  hasDoneFirstSplit: boolean;
  firstSplitAmount?: number;
  rewardsAwarded: {
    accountCreated: boolean;
    firstSplitOver10: boolean;
  };
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
   * Create a referral record
   */
  private async createReferralRecord(referrerId: string, referredUserId: string): Promise<void> {
    try {
      const referralId = `ref_${referrerId}_${referredUserId}_${Date.now()}`;
      const referralRef = doc(db, 'referrals', referralId);
      
      const referredUser = await firebaseDataService.user.getCurrentUser(referredUserId);
      
      await setDoc(referralRef, {
        id: referralId,
        referrerId,
        referredUserId,
        referredUserName: referredUser.name,
        createdAt: serverTimestamp(),
        hasCreatedAccount: true,
        hasDoneFirstSplit: false,
        rewardsAwarded: {
          accountCreated: false,
          firstSplitOver10: false
        }
      });

      logger.info('Referral record created', {
        referralId,
        referrerId,
        referredUserId
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
   */
  async awardInviteFriendReward(referrerId: string, referredUserId: string): Promise<void> {
    try {
      // Check if reward already awarded
      const referral = await this.getReferral(referrerId, referredUserId);
      if (referral && referral.rewardsAwarded.accountCreated) {
        logger.info('Invite friend reward already awarded', {
          referrerId,
          referredUserId
        }, 'ReferralService');
        return;
      }

      const season = seasonService.getCurrentSeason();
      const reward = getSeasonReward('invite_friends_create_account', season, false);
      const pointsAwarded = calculateRewardPoints(reward, 0);

      // Award points
      const result = await pointsService.awardSeasonPoints(
        referrerId,
        pointsAwarded,
        'referral_reward',
        `ref_${referredUserId}`,
        `Friend created account reward (Season ${season})`,
        season,
        'invite_friends_create_account'
      );

      if (result.success) {
        // Mark quest as completed
        await questService.completeQuest(referrerId, 'invite_friends_create_account');
        
        // Update referral record
        await this.updateReferralReward(referrerId, referredUserId, 'accountCreated', true);
        
        logger.info('Invite friend reward awarded', {
          referrerId,
          referredUserId,
          pointsAwarded,
          season
        }, 'ReferralService');
      }
    } catch (error) {
      logger.error('Failed to award invite friend reward', error, 'ReferralService');
    }
  }

  /**
   * Award points to referrer when friend does first split > $10
   */
  async awardFriendFirstSplitReward(referrerId: string, referredUserId: string, splitAmount: number): Promise<void> {
    try {
      // Only award if split amount > $10
      if (splitAmount <= 10) {
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

      const season = seasonService.getCurrentSeason();
      const reward = getSeasonReward('friend_do_first_split_over_10', season, false);
      const pointsAwarded = calculateRewardPoints(reward, 0);

      // Award points
      const result = await pointsService.awardSeasonPoints(
        referrerId,
        pointsAwarded,
        'referral_reward',
        `ref_split_${referredUserId}`,
        `Friend did first split > $10 reward (Season ${season})`,
        season,
        'friend_do_first_split_over_10'
      );

      if (result.success) {
        // Update referral record
        await this.updateReferralReward(referrerId, referredUserId, 'firstSplitOver10', true);
        await this.updateReferralSplitInfo(referrerId, referredUserId, splitAmount);
        
        logger.info('Friend first split reward awarded', {
          referrerId,
          referredUserId,
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
   * Get referral record
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
        return {
          id: doc.id,
          referrerId: data.referrerId,
          referredUserId: data.referredUserId,
          referredUserName: data.referredUserName,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          hasCreatedAccount: data.hasCreatedAccount || false,
          hasDoneFirstSplit: data.hasDoneFirstSplit || false,
          firstSplitAmount: data.firstSplitAmount,
          rewardsAwarded: {
            accountCreated: data.rewardsAwarded?.accountCreated || false,
            firstSplitOver10: data.rewardsAwarded?.firstSplitOver10 || false
          }
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
   * Get all referrals for a user
   */
  async getUserReferrals(userId: string): Promise<Referral[]> {
    try {
      const referralsRef = collection(db, 'referrals');
      const q = query(referralsRef, where('referrerId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const referrals: Referral[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        referrals.push({
          id: doc.id,
          referrerId: data.referrerId,
          referredUserId: data.referredUserId,
          referredUserName: data.referredUserName,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          hasCreatedAccount: data.hasCreatedAccount || false,
          hasDoneFirstSplit: data.hasDoneFirstSplit || false,
          firstSplitAmount: data.firstSplitAmount,
          rewardsAwarded: {
            accountCreated: data.rewardsAwarded?.accountCreated || false,
            firstSplitOver10: data.rewardsAwarded?.firstSplitOver10 || false
          }
        });
      });
      
      return referrals;
    } catch (error) {
      logger.error('Failed to get user referrals', error, 'ReferralService');
      return [];
    }
  }
}

// Export singleton instance
export const referralService = new ReferralService();

