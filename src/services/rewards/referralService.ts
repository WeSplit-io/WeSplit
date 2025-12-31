/**
 * Referral Service
 * Manages referral tracking and rewards
 */

import { db, auth, app } from '../../config/firebase/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp, runTransaction } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { logger } from '../analytics/loggingService';
import { pointsService } from './pointsService';
import { seasonService, Season } from './seasonService';
import { getSeasonReward, calculateRewardPoints } from './seasonRewardsConfig';
import { firebaseDataService } from '../data/firebaseDataService';
import { questService } from './questService';
import { normalizeReferralCode, referralCodeRateLimiter, REFERRAL_CODE_MIN_LENGTH, REFERRAL_CODE_MAX_LENGTH } from '../shared/referralUtils';
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
      
      // If user already has a referral code, normalize it and update if needed
      if (user.referral_code && user.referral_code.trim().length >= REFERRAL_CODE_MIN_LENGTH) {
        const normalizedExistingCode = normalizeReferralCode(user.referral_code);
        
        // If the stored code is not normalized, update it to ensure consistency
        if (user.referral_code !== normalizedExistingCode) {
          logger.info('Normalizing existing referral code', { 
            userId, 
            oldCode: user.referral_code,
            newCode: normalizedExistingCode
          }, 'ReferralService');
          
          await firebaseDataService.user.updateUser(userId, {
            referral_code: normalizedExistingCode
          });
        }
        
        logger.info('User already has referral code', { 
          userId, 
          referralCode: normalizedExistingCode 
        }, 'ReferralService');
        return normalizedExistingCode;
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
        
        // Normalize and store the unique code (ensure consistency)
        const normalizedUniqueCode = normalizeReferralCode(uniqueCode);
        await firebaseDataService.user.updateUser(userId, {
          referral_code: normalizedUniqueCode
        });
        
        logger.info('Generated and stored unique referral code', { 
          userId, 
          referralCode: normalizedUniqueCode 
        }, 'ReferralService');
        return normalizedUniqueCode;
      }

      // Normalize and store the generated code (ensure consistency)
      const normalizedNewCode = normalizeReferralCode(newCode);
      await firebaseDataService.user.updateUser(userId, {
        referral_code: normalizedNewCode
      });
      
      logger.info('Generated and stored referral code', { 
        userId, 
        referralCode: normalizedNewCode 
      }, 'ReferralService');
      return normalizedNewCode;
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
      // Pass original code to findReferrerByCode so it can try case variations
      if (normalizedCode || referralCode) {
        const referrer = await this.findReferrerByCode(referralCode || normalizedCode, referredUserId);

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
      const referrerUserRef = doc(db, 'users', referrerId);

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

        // Get referrer user document to update counter
        const referrerUserDoc = await transaction.get(referrerUserRef);
        if (!referrerUserDoc.exists()) {
          throw new Error('Referrer user not found');
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

        // Update referrer's referral counter atomically
        const currentCount = referrerUserDoc.data().referral_count || 0;
        transaction.update(referrerUserRef, {
          referral_count: currentCount + 1,
          referral_code_last_used_at: serverTimestamp()
        });
      });

      logger.info('Referral record created atomically with referred_by update and counter increment', {
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
      // Store original code before normalization for fallback queries
      const originalInputCode = referralCode;
      
      // Normalize referral code before validation (critical for matching)
      const normalizedCode = normalizeReferralCode(referralCode);
      
      // Validate minimum length after normalization
      if (!normalizedCode || normalizedCode.length < REFERRAL_CODE_MIN_LENGTH) {
        return {
          exists: false,
          error: `Referral code must be at least ${REFERRAL_CODE_MIN_LENGTH} characters`
        };
      }

      // Validate maximum length
      if (normalizedCode.length > REFERRAL_CODE_MAX_LENGTH) {
        return {
          exists: false,
          error: `Referral code must be no more than ${REFERRAL_CODE_MAX_LENGTH} characters`
        };
      }

      // Validate format (alphanumeric only after normalization)
      if (!/^[A-Z0-9]+$/.test(normalizedCode)) {
        return {
          exists: false,
          error: 'Referral code contains invalid characters. Only letters and numbers are allowed.'
        };
      }

      // Rate limiting: use userId if provided, otherwise use a generic identifier
      const rateLimitId = userId || 'anonymous';
      const rateLimitCheck = referralCodeRateLimiter.checkRateLimit(rateLimitId);
      
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for referral code validation', {
          identifier: rateLimitId,
          referralCode: normalizedCode.substring(0, 4) + '...'
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

      logger.info('Validating referral code', {
        originalCode: referralCode,
        normalizedCode,
        codeLength: normalizedCode.length,
        userId: userId || 'anonymous'
      }, 'ReferralService');

      // Verify we have a database reference and it's connected to the same app as auth
      if (!db) {
        logger.error('Firestore database not initialized', null, 'ReferralService');
        return {
          exists: false,
          error: 'Database connection error. Please try again.'
        };
      }
      
      // Verify auth and db are from the same Firebase app
      if (app && auth && db) {
        const authApp = (auth as any).app;
        const dbApp = (db as any).app;
        if (authApp && dbApp && authApp.name !== dbApp.name) {
          logger.error('Firebase Auth and Firestore are from different apps', {
            authAppName: authApp.name,
            dbAppName: dbApp.name
          }, 'ReferralService');
          return {
            exists: false,
            error: 'Firebase configuration error. Please restart the app.'
          };
        }
        
        // Log app connection for debugging
        logger.debug('Firebase app connection verified', {
          authAppName: authApp?.name || 'unknown',
          dbAppName: dbApp?.name || 'unknown',
          appsMatch: authApp?.name === dbApp?.name
        }, 'ReferralService');
      } else {
        logger.warn('Firebase app/auth/db instances not all available', {
          hasApp: !!app,
          hasAuth: !!auth,
          hasDb: !!db
        }, 'ReferralService');
      }

      // CRITICAL: Ensure user is authenticated before querying Firestore
      // Firestore security rules require request.auth != null to read user documents
      let isAuthenticated = !!auth?.currentUser;
      
      if (!isAuthenticated) {
        logger.debug('User not authenticated, waiting for auth state', {
          hasAuth: !!auth,
          userId: userId || 'anonymous'
        }, 'ReferralService');
        
        // Wait up to 5 seconds for auth state to be ready (increased timeout for account creation flow)
        const authReady = await new Promise<boolean>((resolve) => {
          if (!auth) {
            resolve(false);
            return;
          }
          
          if (auth.currentUser) {
            // Verify token is not expired
            auth.currentUser.getIdTokenResult().then((tokenResult) => {
              if (tokenResult.expirationTime && new Date(tokenResult.expirationTime) > new Date()) {
                resolve(true);
              } else {
                logger.warn('Auth token expired, waiting for refresh', null, 'ReferralService');
                resolve(false);
              }
            }).catch(() => {
              // If we can't get token, assume not ready
              resolve(false);
            });
            return;
          }
          
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
              // Verify token is valid
              try {
                const tokenResult = await user.getIdTokenResult();
                if (tokenResult.expirationTime && new Date(tokenResult.expirationTime) > new Date()) {
                  unsubscribe();
                  resolve(true);
                } else {
                  logger.warn('Auth token expired, waiting for refresh', null, 'ReferralService');
                  resolve(false);
                }
              } catch (tokenError) {
                logger.warn('Failed to get auth token', tokenError, 'ReferralService');
                unsubscribe();
                resolve(false);
              }
            } else {
              unsubscribe();
              resolve(false);
            }
          });
          
          setTimeout(() => {
            unsubscribe();
            if (auth.currentUser) {
              // Last check - verify token
              auth.currentUser.getIdTokenResult().then((tokenResult) => {
                resolve(tokenResult.expirationTime && new Date(tokenResult.expirationTime) > new Date());
              }).catch(() => resolve(false));
            } else {
              resolve(false);
            }
          }, 5000);
        });
        
        if (!authReady) {
          logger.error('User not authenticated after waiting, cannot query Firestore', {
            userId: userId || 'anonymous',
            hasAuth: !!auth,
            hasCurrentUser: !!auth?.currentUser
          }, 'ReferralService');
          return {
            exists: false,
            error: 'Please ensure you are signed in to validate referral codes. If you just created your account, please wait a moment and try again.'
          };
        }
        
        logger.info('Auth state ready, proceeding with referral code validation', {
          userId: auth.currentUser?.uid || userId || 'anonymous',
          tokenValid: true
        }, 'ReferralService');
      } else {
        // Even if authenticated, verify token is valid
        try {
          const tokenResult = await auth.currentUser.getIdTokenResult();
          if (tokenResult.expirationTime && new Date(tokenResult.expirationTime) <= new Date()) {
            logger.warn('Auth token expired, refreshing', null, 'ReferralService');
            await auth.currentUser.getIdToken(true); // Force refresh
          }
        } catch (tokenError) {
          logger.warn('Failed to verify/refresh auth token', tokenError, 'ReferralService');
          // Continue anyway - token might still be valid
        }
      }

      const usersRef = collection(db, 'users');
      
      // Try normalized query first (most common case for new codes)
      let q = query(usersRef, where('referral_code', '==', normalizedCode));
      
      logger.debug('Executing Firestore query for referral code', {
        normalizedCode,
        originalCode: referralCode,
        queryField: 'referral_code',
        queryValue: normalizedCode,
        collection: 'users'
      }, 'ReferralService');
      
      let querySnapshot;
      try {
        // CRITICAL: Ensure auth token is valid and ready before querying
        // This is especially important after custom token sign-in
        if (!auth?.currentUser) {
          logger.error('Cannot query Firestore: no authenticated user', {
            hasAuth: !!auth,
            queryUserId: userId || 'anonymous'
          }, 'ReferralService');
          return {
            exists: false,
            error: 'Please ensure you are signed in to validate referral codes.'
          };
        }
        
        // CRITICAL: Get and verify auth token before querying
        // This ensures the token is valid and will be sent with the Firestore request
        let authToken: string | null = null;
        try {
          authToken = await auth.currentUser.getIdToken(true); // Force refresh
          logger.debug('Auth token obtained and refreshed', {
            userId: auth.currentUser.uid,
            hasToken: !!authToken,
            tokenLength: authToken?.length || 0
          }, 'ReferralService');
        } catch (tokenError) {
          logger.error('Failed to get auth token - cannot query Firestore', {
            error: tokenError instanceof Error ? tokenError.message : String(tokenError),
            userId: auth.currentUser.uid
          }, 'ReferralService');
          return {
            exists: false,
            error: 'Authentication token is invalid. Please sign in again.'
          };
        }
        
        if (!authToken) {
          logger.error('Auth token is null after refresh', {
            userId: auth.currentUser.uid
          }, 'ReferralService');
          return {
            exists: false,
            error: 'Authentication failed. Please sign in again.'
          };
        }
        
        // Log authentication state before query
        logger.debug('About to execute Firestore query', {
          isAuthenticated: true,
          currentUserId: auth.currentUser.uid,
          queryUserId: userId || 'anonymous',
          normalizedCode: normalizedCode.substring(0, 4) + '...',
          hasToken: !!authToken,
          dbAppName: (db as any)?.app?.name,
          authAppName: (auth as any)?.app?.name
        }, 'ReferralService');
        
        // CRITICAL: Test query to verify permissions work
        // Try to read the current user's document first to verify auth is working
        try {
          const currentUserRef = doc(db, 'users', auth.currentUser.uid);
          const currentUserDoc = await getDoc(currentUserRef);
          logger.info('✅ Test query successful - Firestore permissions are working', {
            userId: auth.currentUser.uid,
            docExists: currentUserDoc.exists(),
            hasToken: !!authToken
          }, 'ReferralService');
        } catch (testError) {
          const testErrorCode = (testError as any)?.code;
          const testErrorMessage = testError instanceof Error ? testError.message : String(testError);
          logger.error('❌ Test query failed - Firestore permissions are NOT working', {
            error: testErrorMessage,
            errorCode: testErrorCode,
            userId: auth.currentUser.uid,
            hasToken: !!authToken,
            authAppName: (auth as any)?.app?.name,
            dbAppName: (db as any)?.app?.name
          }, 'ReferralService');
          
          // If test query fails, the referral query will also fail
          // This indicates a fundamental auth/permissions issue
          return {
            exists: false,
            error: 'Unable to access database. Authentication may not be fully ready. Please wait a moment and try again.'
          };
        }
        
        // Execute query - Firestore SDK will automatically attach the auth token
        querySnapshot = await getDocs(q);
        
        logger.info('Firestore query executed successfully', {
          resultCount: querySnapshot.size,
          isEmpty: querySnapshot.empty,
          normalizedCode: normalizedCode.substring(0, 4) + '...'
        }, 'ReferralService');
        
        // If normalized query fails, try original input code (case-sensitive)
        // This handles legacy codes that weren't normalized when stored
        // Also handles cases where user enters uppercase but DB has mixed case
        if (querySnapshot.empty && originalInputCode !== normalizedCode) {
          logger.debug('Normalized query returned no results, trying original input code', {
            normalizedCode,
            originalInputCode
          }, 'ReferralService');
          
          const originalQuery = query(usersRef, where('referral_code', '==', originalInputCode));
          const originalSnapshot = await getDocs(originalQuery);
          
          if (!originalSnapshot.empty) {
            logger.info('✅ Found referral code with original input case', {
              originalInputCode,
              normalizedCode
            }, 'ReferralService');
            querySnapshot = originalSnapshot;
          }
        }
        
        // If still empty, try common case variations (handles mixed case in DB)
        // This is a fallback for codes stored with inconsistent casing
        // We try multiple patterns to handle any possible case variation
        if (querySnapshot.empty) {
          logger.debug('Trying case variations for referral code', {
            normalizedCode,
            originalInputCode,
            codeLength: normalizedCode.length
          }, 'ReferralService');
          
          // Generate all possible case variations to try
          const variationsToTry: string[] = [];
          
          // 1. Lowercase version
          const lowerCode = normalizedCode.toLowerCase();
          if (lowerCode !== normalizedCode) {
            variationsToTry.push(lowerCode);
          }
          
          // 2. Title case: first letter uppercase, rest lowercase
          if (normalizedCode.length > 0) {
            const titleCase = normalizedCode.charAt(0).toUpperCase() + normalizedCode.slice(1).toLowerCase();
            if (titleCase !== normalizedCode && titleCase !== lowerCode) {
              variationsToTry.push(titleCase);
            }
          }
          
          // 3. Try various split patterns (first N uppercase, rest lowercase)
          // This handles codes like "SFXKKFHZmhxr" (8 uppercase + 4 lowercase)
          // We try multiple split points to cover different patterns
          const codeLength = normalizedCode.length;
          for (let splitPoint = Math.floor(codeLength / 2); splitPoint < codeLength; splitPoint++) {
            if (splitPoint > 0 && splitPoint < codeLength) {
              const halfUpper = normalizedCode.substring(0, splitPoint).toUpperCase() + 
                               normalizedCode.substring(splitPoint).toLowerCase();
              if (halfUpper !== normalizedCode && halfUpper !== lowerCode && !variationsToTry.includes(halfUpper)) {
                variationsToTry.push(halfUpper);
              }
            }
          }
          
          // 4. Try reverse: first N lowercase, rest uppercase
          for (let splitPoint = 1; splitPoint <= Math.floor(codeLength / 2); splitPoint++) {
            if (splitPoint < codeLength) {
              const halfLower = normalizedCode.substring(0, splitPoint).toLowerCase() + 
                               normalizedCode.substring(splitPoint).toUpperCase();
              if (halfLower !== normalizedCode && halfLower !== lowerCode && !variationsToTry.includes(halfLower)) {
                variationsToTry.push(halfLower);
              }
            }
          }
          
          // 5. Try alternating case patterns (common in some systems)
          if (codeLength >= 4) {
            // Every other character uppercase
            let alternating1 = '';
            for (let i = 0; i < codeLength; i++) {
              alternating1 += i % 2 === 0 ? normalizedCode[i].toUpperCase() : normalizedCode[i].toLowerCase();
            }
            if (alternating1 !== normalizedCode && alternating1 !== lowerCode && !variationsToTry.includes(alternating1)) {
              variationsToTry.push(alternating1);
            }
            
            // Opposite alternating
            let alternating2 = '';
            for (let i = 0; i < codeLength; i++) {
              alternating2 += i % 2 === 0 ? normalizedCode[i].toLowerCase() : normalizedCode[i].toUpperCase();
            }
            if (alternating2 !== normalizedCode && alternating2 !== lowerCode && !variationsToTry.includes(alternating2)) {
              variationsToTry.push(alternating2);
            }
          }
          
          // Try each variation (limit to prevent too many queries)
          const maxVariations = 10; // Limit to prevent excessive queries
          for (let i = 0; i < Math.min(variationsToTry.length, maxVariations) && querySnapshot.empty; i++) {
            const variation = variationsToTry[i];
            try {
              const variationQuery = query(usersRef, where('referral_code', '==', variation));
              const variationSnapshot = await getDocs(variationQuery);
              if (!variationSnapshot.empty) {
                logger.info('✅ Found referral code with case variation', {
                  foundCode: variation,
                  searchedCode: normalizedCode,
                  variationIndex: i,
                  totalVariations: variationsToTry.length
                }, 'ReferralService');
                querySnapshot = variationSnapshot;
                break;
              }
            } catch (variationError) {
              logger.warn('Error trying case variation', {
                variation,
                error: variationError instanceof Error ? variationError.message : String(variationError)
              }, 'ReferralService');
              // Continue to next variation
            }
          }
        }
      } catch (queryError) {
        const errorCode = (queryError as any)?.code;
        const errorMessage = queryError instanceof Error ? queryError.message : String(queryError);
        const errorDetails = (queryError as any)?.toString?.() || String(queryError);
        
        logger.error('Firestore query failed', {
          error: errorMessage,
          errorCode,
          errorDetails,
          normalizedCode: normalizedCode.substring(0, 4) + '...',
          isAuthenticated: !!auth?.currentUser,
          currentUserId: auth?.currentUser?.uid,
          hasToken: !!auth?.currentUser
        }, 'ReferralService');
        
        // Check for permission errors specifically
        if (errorCode === 'permission-denied' || 
            errorCode === 'permissions-denied' ||
            errorMessage.includes('permission') || 
            errorMessage.includes('Permission') ||
            errorMessage.includes('Missing or insufficient permissions')) {
          
          // Log detailed auth state for debugging
          let tokenInfo = null;
          if (auth?.currentUser) {
            try {
              const tokenResult = await auth.currentUser.getIdTokenResult();
              tokenInfo = {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                emailVerified: auth.currentUser.emailVerified,
                tokenExpiration: tokenResult.expirationTime,
                tokenClaims: Object.keys(tokenResult.claims || {})
              };
            } catch (tokenError) {
              tokenInfo = { error: 'Failed to get token info' };
            }
          }
          
          logger.error('Permission denied - detailed auth state', {
            isAuthenticated: !!auth?.currentUser,
            currentUserId: auth?.currentUser?.uid,
            queryUserId: userId || 'anonymous',
            tokenInfo,
            errorCode,
            errorMessage
          }, 'ReferralService');
          
          return {
            exists: false,
            error: 'Unable to validate referral code due to permission error. Please ensure you are signed in and try again. If the problem persists, please contact support.'
          };
        }
        
        // Re-throw other errors to be caught by outer catch
        throw queryError;
      }
      
      logger.info('Referral code query result', {
        normalizedCode: normalizedCode.substring(0, 4) + '...',
        resultCount: querySnapshot.size,
        isEmpty: querySnapshot.empty
      }, 'ReferralService');
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const storedCode = userData.referral_code;
        
        logger.debug('Found user with matching referral code', {
          userId: userDoc.id,
          storedCode,
          normalizedCode,
          status: userData.status
        }, 'ReferralService');
        
        // If stored code is not normalized, normalize it in the database
        // This gradually migrates all codes to normalized format
        if (storedCode && storedCode !== normalizedCode) {
          const codeToStore = normalizeReferralCode(storedCode);
          if (codeToStore === normalizedCode) {
            logger.info('Normalizing referral code in database', {
              userId: userDoc.id,
              oldCode: storedCode,
              newCode: normalizedCode
            }, 'ReferralService');
            
            // Update the code to normalized version (non-blocking)
            try {
              await setDoc(userDoc.ref, { referral_code: normalizedCode }, { merge: true });
              logger.info('Successfully normalized referral code in database', {
                userId: userDoc.id,
                normalizedCode
              }, 'ReferralService');
            } catch (updateError) {
              logger.warn('Failed to normalize referral code in database (non-critical)', {
                userId: userDoc.id,
                error: updateError instanceof Error ? updateError.message : String(updateError)
              }, 'ReferralService');
              // Continue anyway - validation still succeeds
            }
          }
        }
        
        // Check if referrer account is active (security: don't allow inactive accounts)
        const userStatus = userData.status;
        if (userStatus === 'suspended' || userStatus === 'deleted') {
          logger.warn('Referral code belongs to inactive account', {
            referralCode: normalizedCode.substring(0, 4) + '...',
            status: userStatus
          }, 'ReferralService');
          return {
            exists: false,
            error: 'This referral code is no longer valid.'
          };
        }
        
        logger.info('Referral code validation successful', {
          normalizedCode: normalizedCode.substring(0, 4) + '...',
          referrerId: userDoc.id
        }, 'ReferralService');
        
        return { exists: true };
      }
      
      logger.warn('Referral code not found in database', {
        normalizedCode,
        originalCode: referralCode,
        codeLength: normalizedCode.length
      }, 'ReferralService');
      
      return { 
        exists: false,
        error: 'Referral code not found. Please check the code and try again, or contact support if you believe this is an error.'
      };
    } catch (error) {
      logger.error('Failed to validate referral code', error, 'ReferralService');
      // Re-throw rate limit errors
      if (error instanceof Error && error.message.includes('Too many')) {
        return {
          exists: false,
          error: error.message
        };
      }
      // Provide more specific error messages for common issues
      if (error instanceof Error) {
        // Check for Firestore permission errors
        if (error.message.includes('permission') || error.message.includes('Permission')) {
          logger.error('Firestore permission error during referral validation', {
            error: error.message,
            userId: userId || 'anonymous'
          }, 'ReferralService');
          return {
            exists: false,
            error: 'Unable to validate referral code. Please ensure you are signed in.'
          };
        }
        // Check for network errors
        if (error.message.includes('network') || error.message.includes('Network') || error.message.includes('fetch')) {
          logger.error('Network error during referral validation', {
            error: error.message
          }, 'ReferralService');
          return {
            exists: false,
            error: 'Network error. Please check your connection and try again.'
          };
        }
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
      // Store original code before normalization for fallback queries
      const originalInputCode = referralCode;
      
      // Normalize referral code before lookup (critical for matching)
      const normalizedCode = normalizeReferralCode(referralCode);
      
      // Validate minimum length after normalization
      if (!normalizedCode || normalizedCode.length < REFERRAL_CODE_MIN_LENGTH) {
        return null;
      }

      // Rate limiting
      const rateLimitId = userId || 'anonymous';
      const rateLimitCheck = referralCodeRateLimiter.checkRateLimit(rateLimitId);
      
      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for referral code lookup', {
          identifier: rateLimitId,
          referralCode: normalizedCode.substring(0, 4) + '...'
        }, 'ReferralService');
        throw new Error(`Too many referral code lookups. Please wait ${Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000 / 60)} minutes.`);
      }

      // Periodic cleanup
      if (Math.random() < 0.01) {
        referralCodeRateLimiter.cleanup();
      }

      const usersRef = collection(db, 'users');
      
      // Try normalized code first
      let q = query(usersRef, where('referral_code', '==', normalizedCode));
      let querySnapshot = await getDocs(q);
      
      // If normalized query fails, try original input code (case-sensitive)
      if (querySnapshot.empty && originalInputCode !== normalizedCode) {
        logger.debug('Normalized query returned no results in findReferrerByCode, trying original input code', {
          normalizedCode,
          originalInputCode
        }, 'ReferralService');
        
        const originalQuery = query(usersRef, where('referral_code', '==', originalInputCode));
        querySnapshot = await getDocs(originalQuery);
      }
      
      // If still empty, try comprehensive case variations (handles any mixed case in DB)
      // Uses the same logic as validateReferralCode to ensure consistency
      if (querySnapshot.empty) {
        logger.debug('Trying case variations in findReferrerByCode', {
          normalizedCode,
          originalInputCode,
          codeLength: normalizedCode.length
        }, 'ReferralService');
        
        // Generate all possible case variations to try
        const variationsToTry: string[] = [];
        
        // 1. Lowercase version
        const lowerCode = normalizedCode.toLowerCase();
        if (lowerCode !== normalizedCode) {
          variationsToTry.push(lowerCode);
        }
        
        // 2. Title case: first letter uppercase, rest lowercase
        if (normalizedCode.length > 0) {
          const titleCase = normalizedCode.charAt(0).toUpperCase() + normalizedCode.slice(1).toLowerCase();
          if (titleCase !== normalizedCode && titleCase !== lowerCode) {
            variationsToTry.push(titleCase);
          }
        }
        
        // 3. Try various split patterns (first N uppercase, rest lowercase)
        // This handles codes with any split point, not just 8+4
        const codeLength = normalizedCode.length;
        for (let splitPoint = Math.floor(codeLength / 2); splitPoint < codeLength; splitPoint++) {
          if (splitPoint > 0 && splitPoint < codeLength) {
            const halfUpper = normalizedCode.substring(0, splitPoint).toUpperCase() + 
                             normalizedCode.substring(splitPoint).toLowerCase();
            if (halfUpper !== normalizedCode && halfUpper !== lowerCode && !variationsToTry.includes(halfUpper)) {
              variationsToTry.push(halfUpper);
            }
          }
        }
        
        // 4. Try reverse: first N lowercase, rest uppercase
        for (let splitPoint = 1; splitPoint <= Math.floor(codeLength / 2); splitPoint++) {
          if (splitPoint < codeLength) {
            const halfLower = normalizedCode.substring(0, splitPoint).toLowerCase() + 
                             normalizedCode.substring(splitPoint).toUpperCase();
            if (halfLower !== normalizedCode && halfLower !== lowerCode && !variationsToTry.includes(halfLower)) {
              variationsToTry.push(halfLower);
            }
          }
        }
        
        // 5. Try alternating case patterns (common in some systems)
        if (codeLength >= 4) {
          // Every other character uppercase
          let alternating1 = '';
          for (let i = 0; i < codeLength; i++) {
            alternating1 += i % 2 === 0 ? normalizedCode[i].toUpperCase() : normalizedCode[i].toLowerCase();
          }
          if (alternating1 !== normalizedCode && alternating1 !== lowerCode && !variationsToTry.includes(alternating1)) {
            variationsToTry.push(alternating1);
          }
          
          // Opposite alternating
          let alternating2 = '';
          for (let i = 0; i < codeLength; i++) {
            alternating2 += i % 2 === 0 ? normalizedCode[i].toLowerCase() : normalizedCode[i].toUpperCase();
          }
          if (alternating2 !== normalizedCode && alternating2 !== lowerCode && !variationsToTry.includes(alternating2)) {
            variationsToTry.push(alternating2);
          }
        }
        
        // Try each variation (limit to prevent too many queries)
        const maxVariations = 10; // Limit to prevent excessive queries
        for (let i = 0; i < Math.min(variationsToTry.length, maxVariations) && querySnapshot.empty; i++) {
          const variation = variationsToTry[i];
          try {
            const variationQuery = query(usersRef, where('referral_code', '==', variation));
            const variationSnapshot = await getDocs(variationQuery);
            if (!variationSnapshot.empty) {
              logger.info('✅ Found referrer with case variation', {
                foundCode: variation,
                searchedCode: normalizedCode,
                variationIndex: i,
                totalVariations: variationsToTry.length
              }, 'ReferralService');
              querySnapshot = variationSnapshot;
              break;
            }
          } catch (variationError) {
            logger.warn('Error trying case variation in findReferrerByCode', {
              variation,
              error: variationError instanceof Error ? variationError.message : String(variationError)
            }, 'ReferralService');
            // Continue to next variation
          }
        }
      }
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const storedCode = userData.referral_code;
        
        // If stored code is not normalized, update it to normalized format
        // This ensures future lookups work correctly
        if (storedCode && storedCode !== normalizedCode) {
          const codeToStore = normalizeReferralCode(storedCode);
          if (codeToStore === normalizedCode) {
            logger.info('Normalizing referral code in database (found via findReferrerByCode)', {
              userId: userDoc.id,
              oldCode: storedCode,
              newCode: normalizedCode
            }, 'ReferralService');
            
            // Update the code to normalized version (non-blocking)
            try {
              await setDoc(userDoc.ref, { referral_code: normalizedCode }, { merge: true });
              logger.info('Successfully normalized referral code in database', {
                userId: userDoc.id,
                normalizedCode
              }, 'ReferralService');
            } catch (updateError) {
              logger.warn('Failed to normalize referral code in database (non-critical)', {
                userId: userDoc.id,
                error: updateError instanceof Error ? updateError.message : String(updateError)
              }, 'ReferralService');
              // Continue anyway - lookup still succeeds
            }
          }
        }
        
        return {
          id: userDoc.id,
          referral_code: normalizedCode, // Return normalized code for consistency
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
        
        logger.debug('Referral status updated', {
          referrerId,
          referredUserId,
          oldStatus: referral.status,
          newStatus: status
        }, 'ReferralService');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      logger.error('Failed to update referral status', {
        error: errorMessage,
        errorCode,
        referrerId,
        referredUserId
      }, 'ReferralService');
      // Don't throw - status update is non-critical, referral record still exists
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
      
      logger.debug('Referral milestone updated', {
        referrerId,
        referredUserId,
        milestoneType,
        achieved: milestone.achieved
      }, 'ReferralService');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      logger.error('Failed to update referral milestone', {
        error: errorMessage,
        errorCode,
        referrerId,
        referredUserId,
        milestoneType
      }, 'ReferralService');
      // Don't throw - milestone update is non-critical, referral record still exists
    }
  }

  /**
   * Normalize all referral codes in the database (one-time migration utility)
   * This ensures all codes are stored in normalized format for consistent querying
   * Should be run once to clean up legacy codes with inconsistent casing
   * 
   * NOTE: This is a utility function that can be called manually if needed.
   * The system automatically normalizes codes on-the-fly when found with different casing.
   */
  async normalizeAllReferralCodes(): Promise<{ normalized: number; errors: number }> {
    try {
      logger.info('Starting referral code normalization for all users', null, 'ReferralService');
      
      const usersRef = collection(db, 'users');
      const allUsersSnapshot = await getDocs(usersRef);
      
      let normalized = 0;
      let errors = 0;
      
      for (const userDoc of allUsersSnapshot.docs) {
        try {
          const userData = userDoc.data();
          const currentCode = userData.referral_code;
          
          if (!currentCode || typeof currentCode !== 'string') {
            continue; // Skip users without codes
          }
          
          const normalizedCode = normalizeReferralCode(currentCode);
          
          // Only update if code needs normalization
          if (currentCode !== normalizedCode) {
            await setDoc(userDoc.ref, { referral_code: normalizedCode }, { merge: true });
            normalized++;
            
            if (normalized % 100 === 0) {
              logger.info('Normalization progress', {
                normalized,
                currentUserId: userDoc.id
              }, 'ReferralService');
            }
          }
        } catch (userError) {
          errors++;
          logger.warn('Failed to normalize code for user', {
            userId: userDoc.id,
            error: userError instanceof Error ? userError.message : String(userError)
          }, 'ReferralService');
        }
      }
      
      logger.info('Referral code normalization completed', {
        normalized,
        errors,
        total: allUsersSnapshot.size
      }, 'ReferralService');
      
      return { normalized, errors };
    } catch (error) {
      logger.error('Failed to normalize all referral codes', error, 'ReferralService');
      throw error;
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

