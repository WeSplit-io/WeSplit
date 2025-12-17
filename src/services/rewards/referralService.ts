/**
 * Referral Service
 * Manages referral tracking and rewards
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp, runTransaction } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { pointsService } from './pointsService';
import { seasonService, Season } from './seasonService';
import { getSeasonReward, calculateRewardPoints } from './seasonRewardsConfig';
import { firebaseDataService } from '../data/firebaseDataService';
import { questService } from './questService';
import { normalizeReferralCode, referralCodeRateLimiter, REFERRAL_CODE_MIN_LENGTH } from '../shared/referralUtils';
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
   * Uses shorter userId prefix + timestamp + random suffix to reduce collision risk
   */
  generateReferralCode(userId: string): string {
    // Use first 6 chars of userId + timestamp + random suffix for better uniqueness
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const userIdPrefix = userId.substring(0, 6).toUpperCase();
    // Format: 6 chars userId + timestamp (varies) + 4 random chars = up to 12 chars
    return `${userIdPrefix}${timestamp}${randomSuffix}`.substring(0, 12);
  }

  /**
   * Ensure user has a referral code - generate and store if missing
   * This is the centralized method for referral code generation
   * Should be called when displaying the referral screen
   */
  async ensureUserHasReferralCode(userId: string): Promise<string> {
    try {
      // Get current user data
      const user = await firebaseDataService.user.getCurrentUser(userId);
      
      // If user already has a referral code, return it
      if (user.referral_code && user.referral_code.trim().length >= REFERRAL_CODE_MIN_LENGTH) {
        logger.info('User already has referral code', { 
          userId, 
          referralCode: user.referral_code 
        }, 'ReferralService');
        return user.referral_code;
      }

      // Generate new referral code
      const newCode = this.generateReferralCode(userId);
      
      // Verify code is unique (check if it already exists)
      const existingReferrer = await this.findReferrerByCode(newCode);
      if (existingReferrer) {
        // If code exists, generate a new one with additional randomness
        const timestamp = Date.now().toString(36);
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const uniqueCode = `${userId.substring(0, 6).toUpperCase()}${timestamp}${randomSuffix}`.substring(0, 12);
        
        // Store the unique code
        await firebaseDataService.user.updateUser(userId, {
          referral_code: uniqueCode
        });
        
        logger.info('Generated and stored unique referral code', { 
          userId, 
          referralCode: uniqueCode 
        }, 'ReferralService');
        return uniqueCode;
      }

      // Store the generated code
      await firebaseDataService.user.updateUser(userId, {
        referral_code: newCode
      });
      
      logger.info('Generated and stored referral code', { 
        userId, 
        referralCode: newCode 
      }, 'ReferralService');
      return newCode;
    } catch (error) {
      logger.error('Failed to ensure user has referral code', error, 'ReferralService');
      throw error;
    }
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
      // Normalize referral code input for safety (centralized helper)
      const normalizedCode = normalizeReferralCode(referralCode);

      // If referrerId is provided, use it directly
      if (referrerId) {
        // Prevent self-referral when referrerId is passed explicitly
        if (referrerId === referredUserId) {
          logger.warn('Self-referral attempt blocked (referrerId === referredUserId)', {
            userId: referredUserId,
          }, 'ReferralService');
          return { success: false, referrerId: undefined, error: 'Cannot use your own referral code' };
        }

        // Validate referrer account is active (security: prevent rewards to inactive accounts)
        try {
          const referrerUser = await firebaseDataService.user.getCurrentUser(referrerId);
          if (referrerUser.status === 'suspended' || referrerUser.status === 'deleted') {
            logger.warn('Referrer account is inactive', {
              referrerId,
              status: referrerUser.status
            }, 'ReferralService');
            return { success: false, error: 'This referral code is no longer valid' };
          }
        } catch (userError) {
          logger.error('Failed to validate referrer account status', userError, 'ReferralService');
          return { success: false, error: 'Unable to validate referral' };
        }

        // Use transaction for atomic referral creation + referred_by update
        // Transaction handles idempotency check internally via deterministic ID
        try {
          await this.createReferralRecordWithTransaction(referrerId, referredUserId);
        } catch (transactionError) {
          // If referral already exists (idempotency), that's okay
          if (transactionError instanceof Error && transactionError.message.includes('already exists')) {
            logger.info('Referral already exists between users (referrerId path), skipping duplicate creation', {
              referrerId,
              referredUserId
            }, 'ReferralService');

            // Ensure referred_by is set even if the referral record already existed
            await firebaseDataService.user.updateUser(referredUserId, {
              referred_by: referrerId
            });

            return { success: true, referrerId };
          }
          // Re-throw other transaction errors
          throw transactionError;
        }
        
        // Award points to referrer for friend creating account (non-blocking, can fail without breaking referral)
        try {
          await this.awardInviteFriendReward(referrerId, referredUserId);
        } catch (rewardError) {
          logger.error('Failed to award invite friend reward (non-blocking)', rewardError, 'ReferralService');
          // Continue - referral record is created, reward can be retried later
        }
        
        return { success: true, referrerId };
      }

      // If referral code is provided, find the referrer
      if (normalizedCode) {
        const referrer = await this.findReferrerByCode(normalizedCode);

        // No matching referrer found
        if (!referrer) {
          return { success: false, error: 'Referral code not found' };
        }

        // Validate referrer account is active (security: prevent rewards to inactive accounts)
        if (referrer.status === 'suspended' || referrer.status === 'deleted') {
          logger.warn('Referral code belongs to inactive account', {
            referralCode: normalizedCode,
            referrerId: referrer.id,
            status: referrer.status
          }, 'ReferralService');
          return { success: false, error: 'This referral code is no longer valid' };
        }

        // Prevent self-referral when using a referral code
        if (referrer.id === referredUserId) {
          logger.warn('Self-referral attempt blocked (referralCode belongs to referred user)', {
            userId: referredUserId,
            referralCode: normalizedCode,
          }, 'ReferralService');
          return { success: false, referrerId: undefined, error: 'Cannot use your own referral code' };
        }

        // Use transaction for atomic referral creation + referred_by update
        // Transaction handles idempotency check internally via deterministic ID
        try {
          await this.createReferralRecordWithTransaction(referrer.id, referredUserId);
        } catch (transactionError) {
          // If referral already exists (idempotency), that's okay
          if (transactionError instanceof Error && transactionError.message.includes('already exists')) {
            logger.info('Referral already exists between users, skipping duplicate creation', {
              referrerId: referrer.id,
              referredUserId
            }, 'ReferralService');

            // Ensure referred_by is set even if the referral record already existed
            await firebaseDataService.user.updateUser(referredUserId, {
              referred_by: referrer.id
            });

            return { success: true, referrerId: referrer.id };
          }
          // Re-throw other transaction errors
          throw transactionError;
        }
          
        // Award points to referrer for friend creating account (non-blocking, can fail without breaking referral)
        try {
          await this.awardInviteFriendReward(referrer.id, referredUserId);
        } catch (rewardError) {
          logger.error('Failed to award invite friend reward (non-blocking)', rewardError, 'ReferralService');
          // Continue - referral record is created, reward can be retried later
        }
        
        return { success: true, referrerId: referrer.id };
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
   * @deprecated Use createReferralRecordWithTransaction for atomic operations
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
   * Create a referral record atomically with referred_by field update using Firestore transaction
   * Ensures both operations succeed or both fail (atomicity)
   *
   * NOTE:
   * - Uses a deterministic composite ID per (referrerId, referredUserId) pair to avoid duplicates
   * - Avoids unsupported collection queries inside transactions (no getDocs/query)
   */
  private async createReferralRecordWithTransaction(referrerId: string, referredUserId: string): Promise<void> {
    try {
      // Deterministic ID per referrer/referred pair to enforce uniqueness at the document level
      const referralId = `ref_${referrerId}_${referredUserId}`;
      const referralRef = doc(db, 'referrals', referralId);
      const referredUserRef = doc(db, 'users', referredUserId);

      // Get referred user data first (outside transaction for efficiency / typing)
      const referredUser = await firebaseDataService.user.getCurrentUser(referredUserId);

      await runTransaction(db, async (transaction) => {
        // Check if referral already exists atomically via deterministic ID
        const existingReferralDoc = await transaction.get(referralRef);
        if (existingReferralDoc.exists()) {
          throw new Error('Referral already exists');
        }

        // Get referred user document within transaction to ensure it still exists
        const referredUserDoc = await transaction.get(referredUserRef);
        if (!referredUserDoc.exists()) {
          throw new Error('Referred user not found');
        }

        // Create referral record
        // NOTE: referredUserName removed for privacy - can be fetched when needed by authorized users
        transaction.set(referralRef, {
          id: referralId,
          referrerId,
          referredUserId,
          // referredUserName: referredUser.name, // Removed for privacy - fetch when needed
          createdAt: serverTimestamp(),
          status: 'active' as ReferralStatus,
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

        // Update referred user's referred_by field atomically
        transaction.update(referredUserRef, {
          referred_by: referrerId
        });
      });

      logger.info('Referral record created atomically with referred_by update', {
        referralId,
        referrerId,
        referredUserId,
        status: 'active'
      }, 'ReferralService');
    } catch (error) {
      logger.error('Failed to create referral record with transaction', error, 'ReferralService');
      // If transaction fails due to existing referral, that's okay (idempotency)
      if (error instanceof Error && error.message.includes('already exists')) {
        logger.info('Referral already exists (caught in transaction)', {
          referrerId,
          referredUserId
        }, 'ReferralService');
        return; // Silently succeed - referral already exists
      }
      throw error;
    }
  }

  /**
   * Validate that a referral code exists (public method for frontend validation)
   * Does NOT expose user ID to prevent enumeration attacks
   * Includes rate limiting to prevent abuse
   */
  async validateReferralCode(referralCode: string, userId?: string): Promise<{ exists: boolean; error?: string }> {
    try {
      // Rate limiting: use userId if provided, otherwise use a generic identifier
      const rateLimitId = userId || 'anonymous';
      const rateLimitCheck = referralCodeRateLimiter.checkRateLimit(rateLimitId);
      
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for referral code validation', {
          identifier: rateLimitId,
          referralCode: referralCode.substring(0, 4) + '...'
        }, 'ReferralService');
        return {
          exists: false,
          error: `Too many referral code lookups. Please wait ${Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000 / 60)} minutes.`
        };
      }

      // Periodic cleanup of expired rate limit records
      if (Math.random() < 0.01) { // ~1% chance per call
        referralCodeRateLimiter.cleanup();
      }

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('referral_code', '==', referralCode));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        // Check if referrer account is active (security: don't allow inactive accounts)
        const userStatus = userData.status;
        if (userStatus === 'suspended' || userStatus === 'deleted') {
          logger.warn('Referral code belongs to inactive account', {
            referralCode: referralCode.substring(0, 4) + '...',
            status: userStatus
          }, 'ReferralService');
          return {
            exists: false,
            error: 'This referral code is no longer valid.'
          };
        }
        
        return { exists: true };
      }
      
      return { exists: false };
    } catch (error) {
      logger.error('Failed to validate referral code', error, 'ReferralService');
      // Re-throw rate limit errors
      if (error instanceof Error && error.message.includes('Too many')) {
        return {
          exists: false,
          error: error.message
        };
      }
      return { exists: false, error: 'Unable to validate referral code' };
    }
  }

  /**
   * Find referrer by referral code (internal method - returns user ID)
   * Used internally for tracking referrals - NOT exposed to frontend
   * Includes rate limiting and account status validation
   */
  private async findReferrerByCode(referralCode: string, userId?: string): Promise<{ id: string; referral_code?: string; status?: string } | null> {
    try {
      // Rate limiting
      const rateLimitId = userId || 'anonymous';
      const rateLimitCheck = referralCodeRateLimiter.checkRateLimit(rateLimitId);
      
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for referral code lookup', {
          identifier: rateLimitId,
          referralCode: referralCode.substring(0, 4) + '...'
        }, 'ReferralService');
        throw new Error(`Too many referral code lookups. Please wait ${Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000 / 60)} minutes.`);
      }

      // Periodic cleanup
      if (Math.random() < 0.01) {
        referralCodeRateLimiter.cleanup();
      }

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('referral_code', '==', referralCode));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        return {
          id: userDoc.id,
          referral_code: userData.referral_code,
          status: userData.status
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to find referrer by code', error, 'ReferralService');
      if (error instanceof Error && error.message.includes('Too many')) {
        throw error;
      }
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
        // Note: referredUserName removed for privacy - fetch when needed by authorized users
        return {
          id: doc.id,
          referrerId: data.referrerId,
          referredUserId: data.referredUserId,
          referredUserName: data.referredUserName || undefined, // Optional - removed for privacy
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
   * Only allows users to view their own referrals (authorization check)
   */
  async getUserReferrals(userId: string, requestingUserId?: string): Promise<Referral[]> {
    try {
      // Authorization check: only allow users to view their own referrals
      if (requestingUserId && requestingUserId !== userId) {
        logger.warn('Unauthorized attempt to view referrals', {
          requestedUserId: userId,
          requestingUserId
        }, 'ReferralService');
        throw new Error('Unauthorized: Cannot view other users\' referrals');
      }

      const referralsRef = collection(db, 'referrals');
      const q = query(referralsRef, where('referrerId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const referrals: Referral[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Build enhanced referral with backward compatibility
        // Note: referredUserName removed for privacy - fetch when needed by authorized users
        referrals.push({
          id: doc.id,
          referrerId: data.referrerId,
          referredUserId: data.referredUserId,
          referredUserName: data.referredUserName || undefined, // Optional - removed for privacy
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

