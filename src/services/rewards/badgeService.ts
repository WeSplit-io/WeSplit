/**
 * Badge Service
 * Manages badge progress tracking and claims
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp, query, where, runTransaction, QueryDocumentSnapshot, limit } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import priceManagementService from '../core/priceManagementService';
import { BADGE_DEFINITIONS, BadgeInfo } from './badgeConfig';
import { pointsService } from './pointsService';
import { seasonService } from './seasonService';
import { resolveStorageUrl } from '../shared/storageUrlService';
import { checkAndUnlockBadgeAssets } from './badgeAssetUnlockService';

export interface BadgeProgress {
  badgeId: string;
  current: number;
  target: number;
  claimed: boolean;
  claimedAt?: string;
  imageUrl?: string; // NFT/image URL from database
  isEventBadge?: boolean; // True if this is an event badge
  redeemCode?: string; // Redeem code for event badges
  badgeInfo?: BadgeInfo; // Badge information from Firestore or config
}

export interface BadgeClaimResult {
  success: boolean;
  badgeId: string;
  error?: string;
}

/**
 * Internal interface for badge claim data
 */
interface BadgeClaimData {
  badgeId: string;
  imageUrl?: string;
  points?: number;
  title: string;
  description: string;
  redeemCode?: string;
}

type UserClaimedBadge = {
  badgeId: string;
  title: string;
  description: string;
  icon?: string; // Optional - not required if iconUrl is provided
  imageUrl?: string;
  claimedAt?: string;
  isCommunityBadge?: boolean;
  showNextToName?: boolean;
  category?: string;
  isEventBadge?: boolean;
  points?: number;
};

type CommunityBadge = {
  badgeId: string;
  title: string;
  icon?: string; // Optional - not required if iconUrl is provided
  imageUrl?: string;
};

type BadgeMetrics = {
  splitWithdrawals: number;
  transactionCount: number;
  transactionVolume: number;
};

class BadgeService {
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private badgeMetricsCache = new Map<string, { value: BadgeMetrics; expires: number }>();
  private claimedBadgeIdsCache = new Map<string, { value: string[]; expires: number }>();
  private userClaimedBadgesCache = new Map<string, { value: UserClaimedBadge[]; expires: number }>();
  private communityBadgesCache = new Map<string, { value: CommunityBadge[]; expires: number }>();
  private firestoreBadgesCache: { value: Map<string, BadgeInfo>; expires: number } | null = null;
  /**
   * Get user's badge progress for all badges
   * Includes badges from both Firestore and config
   */
  async getUserBadgeProgress(userId: string): Promise<BadgeProgress[]> {
    try {
      // Load badges from Firestore and config
      const firestoreBadges = await this.loadFirestoreBadges();
      const configBadges = Object.values(BADGE_DEFINITIONS);
      
      // Merge badges: Firestore badges override config badges with same ID
      const allBadgesMap = new Map<string, BadgeInfo>();
      
      // Add config badges first
      configBadges.forEach(badge => {
        allBadgesMap.set(badge.badgeId, badge);
      });
      
      // Override with Firestore badges (they take priority)
      firestoreBadges.forEach((badge, badgeId) => {
        allBadgesMap.set(badgeId, badge);
      });
      
      const allBadges = Array.from(allBadgesMap.values());
      
      // Get all achievement badges (splits withdrawn badges)
      const achievementBadges = allBadges.filter(
        badge => badge.category === 'achievement'
      );

      // Get all event badges (including community badges)
      const eventBadges = allBadges.filter(
        badge => badge.category === 'event' || badge.category === 'community' || badge.isEventBadge === true
      );

      // Load badge metrics and claimed badges concurrently
      const [badgeMetrics, claimedBadges] = await Promise.all([
        this.getUserBadgeMetrics(userId),
        this.getClaimedBadges(userId)
      ]);

      // Build progress array for achievement badges
      const achievementProgress: BadgeProgress[] = await Promise.all(
        achievementBadges.map(async (badge) => {
          const claimed = claimedBadges.includes(badge.badgeId);
          const claimedBadgeData = claimed ? await this.getClaimedBadgeData(userId, badge.badgeId) : null;

          // Get image URL - priority: claimed badge data > badge config > Firebase Storage
          const imageUrl = await this.getBadgeImageUrl(badge.badgeId, claimedBadgeData?.imageUrl || badge.iconUrl);

          const current = this.getProgressValueForBadge(badge, badgeMetrics);
          const target = badge.target || 0;
          
          logger.debug('Badge progress calculated', {
            badgeId: badge.badgeId,
            current,
            target,
            claimed,
            canClaim: current >= target && !claimed
          }, 'BadgeService');

          return {
            badgeId: badge.badgeId,
            current,
            target,
            claimed,
            claimedAt: claimedBadgeData?.claimedAt,
            imageUrl,
            isEventBadge: false,
            badgeInfo: badge // Include badge info in progress
          };
        })
      );
      
      // Sort by target ascending
      achievementProgress.sort((a, b) => (a.target || 0) - (b.target || 0));

      // Build progress array for event badges
      const eventProgress: BadgeProgress[] = await Promise.all(
        eventBadges.map(async (badge) => {
          const claimed = claimedBadges.includes(badge.badgeId);
          const claimedBadgeData = claimed ? await this.getClaimedBadgeData(userId, badge.badgeId) : null;

          // Get image URL - priority: claimed badge data > badge config > Firebase Storage
          const imageUrl = await this.getBadgeImageUrl(badge.badgeId, claimedBadgeData?.imageUrl || badge.iconUrl);

          return {
            badgeId: badge.badgeId,
            current: claimed ? 1 : 0, // Event badges are either claimed or not
            target: 1, // Event badges have target of 1 (claimable)
            claimed,
            claimedAt: claimedBadgeData?.claimedAt,
            imageUrl,
            isEventBadge: true,
            redeemCode: badge.redeemCode,
            badgeInfo: badge // Include badge info in progress
          };
        })
      );

      // Combine and return all badges
      return [...achievementProgress, ...eventProgress];
    } catch (error) {
      logger.error('Failed to get user badge progress', { error }, 'BadgeService');
      return [];
    }
  }

  /**
   * Get aggregate metrics required for badge progress calculations
   */
  private async getUserBadgeMetrics(userId: string): Promise<BadgeMetrics> {
    const cached = this.getCachedValue(this.badgeMetricsCache, userId);
    if (cached) {
      logger.debug('Using cached badge metrics', { userId, metrics: cached }, 'BadgeService');
      return cached;
    }

    const serverMetrics = await this.getServerBadgeMetrics(userId);
    if (serverMetrics) {
      logger.debug('Using server badge metrics', { userId, metrics: serverMetrics }, 'BadgeService');
      // Only use server metrics if they have non-zero values, otherwise recompute
      if (serverMetrics.splitWithdrawals > 0 || serverMetrics.transactionCount > 0 || serverMetrics.transactionVolume > 0) {
      this.setCachedValue(this.badgeMetricsCache, userId, serverMetrics);
      return serverMetrics;
      } else {
        logger.debug('Server metrics are all zero, recomputing from transactions', { userId }, 'BadgeService');
      }
    }

    const computedMetrics = await this.computeBadgeMetricsFromTransactions(userId);
    this.setCachedValue(this.badgeMetricsCache, userId, computedMetrics);
    await this.saveServerBadgeMetrics(userId, computedMetrics);
    return computedMetrics;
  }

  /**
   * Compute badge metrics by scanning user transactions and normalizing volumes
   * Also counts completed splits from the splits collection
   */
  private async computeBadgeMetricsFromTransactions(userId: string): Promise<BadgeMetrics> {
    try {
      logger.debug('Starting badge metrics computation', { userId }, 'BadgeService');
      
      const transactionsRef = collection(db, 'transactions');
      const sentQuery = query(
        transactionsRef,
        where('from_user', '==', userId),
        where('status', '==', 'completed')
      );
      const receivedQuery = query(
        transactionsRef,
        where('to_user', '==', userId),
        where('status', '==', 'completed')
      );

      // Also query completed splits where user is creator or participant
      // Note: Firestore doesn't support array-contains on nested objects, so we query all and filter
      const splitsRef = collection(db, 'splits');
      const creatorSplitsQuery = query(
        splitsRef,
        where('creatorId', '==', userId),
        where('status', '==', 'completed')
      );
      // For participant splits, we need to query all completed splits and filter client-side
      // Limit to 1000 to avoid performance issues (should be enough for badge counting)
      const allCompletedSplitsQuery = query(
        splitsRef,
        where('status', '==', 'completed'),
        limit(1000)
      );

      const [sentSnapshot, receivedSnapshot, creatorSplitsSnapshot, allCompletedSplitsSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery),
        getDocs(creatorSplitsQuery),
        getDocs(allCompletedSplitsQuery)
      ]);

      logger.debug('Transaction and split queries completed', {
        userId,
        sentCount: sentSnapshot.size,
        receivedCount: receivedSnapshot.size,
        creatorSplitsCount: creatorSplitsSnapshot.size,
        allCompletedSplitsCount: allCompletedSplitsSnapshot.size
      }, 'BadgeService');

      const transactionDocs = new Map<string, QueryDocumentSnapshot>();
      sentSnapshot.forEach((docSnap) => transactionDocs.set(docSnap.id, docSnap));
      receivedSnapshot.forEach((docSnap) => transactionDocs.set(docSnap.id, docSnap));

      // Count completed splits (deduplicated)
      const completedSplitIds = new Set<string>();
      
      // Add creator splits
      creatorSplitsSnapshot.forEach((docSnap) => {
        completedSplitIds.add(docSnap.id);
      });
      
      // Filter participant splits from all completed splits
      allCompletedSplitsSnapshot.forEach((docSnap) => {
        const splitData = docSnap.data();
        const participants = splitData.participants || [];
        const isParticipant = participants.some((p: any) => p.userId === userId);
        // Only count if user is participant AND not already counted as creator
        if (isParticipant && !completedSplitIds.has(docSnap.id)) {
          completedSplitIds.add(docSnap.id);
        }
      });

      const metrics: BadgeMetrics = {
        splitWithdrawals: 0,
        transactionCount: 0,
        transactionVolume: 0
      };

      // Log sample transactions for debugging
      if (transactionDocs.size > 0) {
        const sampleTransaction = Array.from(transactionDocs.values())[0];
        if (sampleTransaction) {
        const sampleData = sampleTransaction.data();
        logger.debug('Sample transaction data', {
          userId,
          transactionId: sampleTransaction.id,
          fields: Object.keys(sampleData),
          from_user: sampleData.from_user,
          to_user: sampleData.to_user,
          status: sampleData.status,
          transactionType: sampleData.transactionType,
          note: sampleData.note
        }, 'BadgeService');
        }
      }

      for (const docSnap of transactionDocs.values()) {
        const data = docSnap.data() as Record<string, unknown>;
        metrics.transactionCount += 1;
        metrics.transactionVolume += await this.getUsdAmountForTransaction(data);

        const isSplit = this.isSplitWithdrawal(data, userId);
        if (isSplit) {
          metrics.splitWithdrawals += 1;
          logger.debug('Found split withdrawal transaction', {
            userId,
            transactionId: docSnap.id,
            transactionType: data.transactionType,
            note: data.note
          }, 'BadgeService');
        }
      }

      // Use completed splits count if it's higher than transaction-based count
      // This handles cases where splits are completed but withdrawal transactions aren't saved
      const completedSplitsCount = completedSplitIds.size;
      if (completedSplitsCount > metrics.splitWithdrawals) {
        logger.debug('Using completed splits count (higher than transaction count)', {
          userId,
          completedSplitsCount,
          transactionBasedCount: metrics.splitWithdrawals
        }, 'BadgeService');
        metrics.splitWithdrawals = completedSplitsCount;
      }

      logger.debug('Computed badge metrics from transactions and splits', { 
        userId, 
        splitWithdrawals: metrics.splitWithdrawals,
        transactionCount: metrics.transactionCount,
        transactionVolume: metrics.transactionVolume,
        totalTransactions: transactionDocs.size,
        completedSplitsCount
      }, 'BadgeService');

      return metrics;
    } catch (error) {
      logger.error('Failed to compute badge metrics from transactions', { error, userId }, 'BadgeService');
      return { splitWithdrawals: 0, transactionCount: 0, transactionVolume: 0 };
    }
  }

  private getBadgeMetricsDocRef(userId: string) {
    return doc(db, 'users', userId, 'metadata', 'badge_metrics');
  }

  private async getServerBadgeMetrics(userId: string): Promise<BadgeMetrics | null> {
    try {
      const metricsDoc = await getDoc(this.getBadgeMetricsDocRef(userId));
      if (!metricsDoc.exists()) {
        return null;
      }

      const data = metricsDoc.data() as Record<string, unknown>;
      const splitWithdrawals = this.normalizeTransactionAmount(data.splitWithdrawals);
      const transactionCount = this.normalizeTransactionAmount(data.transactionCount);
      const transactionVolume = this.normalizeTransactionAmount(data.transactionVolume);

      return {
        splitWithdrawals,
        transactionCount,
        transactionVolume
      };
    } catch (error) {
      logger.error('Failed to load server badge metrics', { userId, error }, 'BadgeService');
      return null;
    }
  }

  private async saveServerBadgeMetrics(userId: string, metrics: BadgeMetrics): Promise<void> {
    try {
      await setDoc(
        this.getBadgeMetricsDocRef(userId),
        {
          ...metrics,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      logger.error('Failed to persist badge metrics', { userId, error }, 'BadgeService');
    }
  }

  /**
   * Get list of claimed badge IDs for a user
   */
  private async getClaimedBadges(userId: string): Promise<string[]> {
    const cached = this.getCachedValue(this.claimedBadgeIdsCache, userId);
    if (cached) {
      return cached;
    }

    try {
      const badgesRef = collection(db, 'users', userId, 'badges');
      const snapshot = await getDocs(badgesRef);
      
      const claimedBadgeIds: string[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.claimed === true && data.badgeId) {
          claimedBadgeIds.push(data.badgeId);
        }
      });

      this.setCachedValue(this.claimedBadgeIdsCache, userId, claimedBadgeIds);
      return claimedBadgeIds;
    } catch (error) {
      logger.error('Failed to get claimed badges', { error }, 'BadgeService');
      return [];
    }
  }

  /**
   * Get claimed badge data (image URL, claim date, etc.)
   */
  private async getClaimedBadgeData(userId: string, badgeId: string): Promise<{ claimedAt?: string; imageUrl?: string } | null> {
    try {
      const badgeRef = doc(db, 'users', userId, 'badges', badgeId);
      const badgeDoc = await getDoc(badgeRef);
      
      if (badgeDoc.exists()) {
        const data = badgeDoc.data();
        return {
          claimedAt: data.claimedAt?.toDate?.()?.toISOString() || data.claimedAt,
          imageUrl: data.imageUrl
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to get claimed badge data', { error, badgeId }, 'BadgeService');
      return null;
    }
  }

  /**
   * Save badge claim to database (shared method for both achievement and event badges)
   * Uses Firestore transaction to ensure atomicity and prevent race conditions
   */
  private async saveBadgeClaim(userId: string, badgeData: BadgeClaimData): Promise<void> {
    await runTransaction(db, async (transaction) => {
      // Check if badge is already claimed (within transaction for atomicity)
      const badgeRef = doc(db, 'users', userId, 'badges', badgeData.badgeId);
      const badgeDoc = await transaction.get(badgeRef);
      
      if (badgeDoc.exists() && badgeDoc.data().claimed === true) {
        throw new Error('Badge already claimed');
      }

      // Get user document
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const badges = userData.badges || [];

      // Check if badge is already in user's badges array
      if (badges.includes(badgeData.badgeId)) {
        throw new Error('Badge already in user badges array');
      }

      // Save badge claim document
      transaction.set(badgeRef, {
        badgeId: badgeData.badgeId,
        claimed: true,
        claimedAt: serverTimestamp(),
        imageUrl: badgeData.imageUrl,
        points: badgeData.points || 0,
        title: badgeData.title,
        description: badgeData.description,
        ...(badgeData.redeemCode && { redeemCode: badgeData.redeemCode })
      }, { merge: true });

      // Add to user's badges array
      transaction.update(userRef, {
        badges: [...badges, badgeData.badgeId]
      });
    });

    this.invalidateUserBadgeCaches(userId);
  }

  /**
   * Load badges from Firestore badges collection
   * This allows adding badges dynamically without app updates
   */
  private async loadFirestoreBadges(): Promise<Map<string, BadgeInfo>> {
    const now = Date.now();
    
    // Check cache first
    if (this.firestoreBadgesCache && now < this.firestoreBadgesCache.expires) {
      logger.debug('Using cached Firestore badges', { count: this.firestoreBadgesCache.value.size }, 'BadgeService');
      return this.firestoreBadgesCache.value;
    }

    try {
      const badgesRef = collection(db, 'badges');
      const badgesSnapshot = await getDocs(badgesRef);
      
      const badgesMap = new Map<string, BadgeInfo>();
      
      badgesSnapshot.forEach((doc) => {
        const data = doc.data();
        const badgeId = doc.id;
        
        // Convert Firestore badge to BadgeInfo format
        const badgeInfo: BadgeInfo = {
          badgeId: badgeId,
          title: data.title || badgeId,
          description: data.description || '',
          icon: data.icon || undefined, // Optional - not required if iconUrl is provided
          iconUrl: data.iconUrl || data.imageUrl,
          category: data.category,
          rarity: data.rarity,
          points: data.points,
          target: data.target,
          isEventBadge: data.isEventBadge !== false, // Default to true for Firestore badges
          redeemCode: data.redeemCode,
          isCommunityBadge: data.isCommunityBadge || false,
          showNextToName: data.showNextToName || false,
          progressMetric: data.progressMetric,
          progressLabel: data.progressLabel
        };
        
        badgesMap.set(badgeId, badgeInfo);
      });
      
      // Cache the result
      this.firestoreBadgesCache = {
        value: badgesMap,
        expires: now + BadgeService.CACHE_TTL_MS
      };
      
      logger.info('Loaded badges from Firestore', { count: badgesMap.size }, 'BadgeService');
      return badgesMap;
    } catch (error) {
      logger.warn('Failed to load badges from Firestore, using config only', { error }, 'BadgeService');
      // Return empty map on error - will fall back to config badges
      return new Map();
    }
  }

  /**
   * Get badge info from either Firestore or config
   * Priority: Firestore badges > Config badges
   * 
   * For event/community badges: Firestore is primary source
   * For achievement badges: Config is primary source (can be migrated later)
   */
  private async getBadgeInfo(badgeId: string): Promise<BadgeInfo | null> {
    // First check Firestore badges (primary source for event/community badges)
    const firestoreBadges = await this.loadFirestoreBadges();
    const firestoreBadge = firestoreBadges.get(badgeId);
    if (firestoreBadge) {
      return firestoreBadge;
    }
    
    // Fall back to config badges (for achievement badges or if Firestore fails)
    return BADGE_DEFINITIONS[badgeId] || null;
  }

  /**
   * Public method to get badge info (for use in components)
   * Uses database first, then falls back to config
   */
  async getBadgeInfoPublic(badgeId: string): Promise<BadgeInfo | null> {
    return this.getBadgeInfo(badgeId);
  }

  /**
   * Get all badges from both Firestore and config
   * Firestore badges override config badges with same ID
   */
  async getAllBadges(): Promise<BadgeInfo[]> {
    const firestoreBadges = await this.loadFirestoreBadges();
    const configBadges = Object.values(BADGE_DEFINITIONS);
    
    // Merge: Firestore badges override config badges
    const allBadgesMap = new Map<string, BadgeInfo>();
    
    // Add config badges first
    configBadges.forEach(badge => {
      allBadgesMap.set(badge.badgeId, badge);
    });
    
    // Override with Firestore badges (they take priority)
    firestoreBadges.forEach((badge, badgeId) => {
      allBadgesMap.set(badgeId, badge);
    });
    
    return Array.from(allBadgesMap.values());
  }

  /**
   * Get badge info by redeem code from Firestore
   * Event/community badges are now managed entirely in Firestore
   */
  private async getBadgeInfoByRedeemCode(redeemCode: string): Promise<BadgeInfo | null> {
    const normalizedCode = redeemCode.toUpperCase();
    
    // Check Firestore badges (all event/community badges are in database)
    const firestoreBadges = await this.loadFirestoreBadges();
    for (const badge of firestoreBadges.values()) {
      if (badge.redeemCode && badge.redeemCode.toUpperCase() === normalizedCode) {
        return badge;
      }
    }

    return null;
  }

  /**
   * Get badge image URL from Firebase Storage or badge configuration
   * Priority: 1. Provided URL (converted if gs://), 2. Firebase Storage badge images collection, 3. Badge config iconUrl
   */
  private async getBadgeImageUrl(badgeId: string, fallbackUrl?: string): Promise<string | undefined> {
    try {
      logger.debug('Getting badge image URL', { badgeId, fallbackUrl }, 'BadgeService');
      
      // If a URL is already provided (from claimed badge or config), check its format
      if (fallbackUrl) {
        // If it's already an HTTPS URL, use it directly
        if (fallbackUrl.startsWith('http')) {
          logger.debug('Using HTTPS URL directly', { badgeId, url: fallbackUrl }, 'BadgeService');
        return fallbackUrl;
        }
        
        // If it's a gs:// URL, convert it to download URL
        if (fallbackUrl.startsWith('gs://')) {
          logger.debug('Converting gs:// URL', { badgeId, gsUrl: fallbackUrl }, 'BadgeService');
          const downloadUrl = await resolveStorageUrl(fallbackUrl, { badgeId, source: 'badgeConfig' });
          if (downloadUrl) {
            logger.debug('Successfully converted gs:// URL', { badgeId, downloadUrl }, 'BadgeService');
            return downloadUrl;
          } else {
            logger.warn('Failed to convert gs:// URL, will try badge_images collection', { badgeId, gsUrl: fallbackUrl }, 'BadgeService');
          }
        }
      }

      // Try to get image URL from Firebase Storage badge images collection
      try {
        const badgeImageRef = doc(db, 'badge_images', badgeId);
        const badgeImageDoc = await getDoc(badgeImageRef);
        
        if (badgeImageDoc.exists()) {
          const data = badgeImageDoc.data();
          if (data.imageUrl) {
            // Check if it's a gs:// URL and convert it
            if (data.imageUrl.startsWith('gs://')) {
              logger.debug('Found gs:// URL in badge_images collection', { badgeId, gsUrl: data.imageUrl }, 'BadgeService');
              const downloadUrl = await resolveStorageUrl(data.imageUrl, { badgeId, source: 'badge_images' });
              if (downloadUrl) {
                return downloadUrl;
              }
            } else if (data.imageUrl.startsWith('http')) {
            return data.imageUrl;
            }
          }
        }
      } catch (storageError) {
        // If badge_images collection doesn't exist or badge not found, continue to fallback
        logger.debug('Badge image not found in badge_images collection', { badgeId, error: storageError }, 'BadgeService');
      }

      // Never return a gs:// URL - React Native Image component doesn't support it
      // If fallback is a gs:// URL and conversion failed, return undefined instead
      if (fallbackUrl && fallbackUrl.startsWith('gs://')) {
        logger.warn('Cannot use gs:// URL as fallback - conversion failed', { badgeId, gsUrl: fallbackUrl }, 'BadgeService');
        return undefined;
      }

      // Return fallback URL only if it's a valid HTTPS URL
      return fallbackUrl && fallbackUrl.startsWith('http') ? fallbackUrl : undefined;
    } catch (error) {
      logger.error('Failed to get badge image URL', { error, badgeId }, 'BadgeService');
      return fallbackUrl;
    }
  }

  /**
   * Claim a badge (for achievement badges)
   */
  async claimBadge(userId: string, badgeId: string, imageUrl?: string): Promise<BadgeClaimResult> {
    try {
      // Check if badge exists (check both Firestore and config)
      const badgeInfo = await this.getBadgeInfo(badgeId);
      if (!badgeInfo) {
        return {
          success: false,
          badgeId,
          error: `Badge '${badgeId}' not found`
        };
      }

      // Check if already claimed
      const claimedBadges = await this.getClaimedBadges(userId);
      if (claimedBadges.includes(badgeId)) {
        return {
          success: false,
          badgeId,
          error: 'Badge already claimed'
        };
      }

      // For event badges, they can be claimed directly (no progress check)
      if (badgeInfo.isEventBadge || badgeInfo.category === 'event') {
        // Event badges can be claimed via redeem code - handled separately
        return {
          success: false,
          badgeId,
          error: 'Event badges must be claimed via redeem code'
        };
      }

      // Check if user has met the requirements for achievement badges
      const progress = await this.getUserBadgeProgress(userId);
      const badgeProgress = progress.find(p => p.badgeId === badgeId);
      
      if (!badgeProgress || badgeProgress.current < badgeProgress.target) {
        return {
          success: false,
          badgeId,
          error: 'Badge requirements not met'
        };
      }

      // Get badge image URL from Firebase Storage or config
      const badgeImageUrl = await this.getBadgeImageUrl(badgeId, imageUrl || badgeInfo.iconUrl);

      // Save badge claim using shared method
      await this.saveBadgeClaim(userId, {
        badgeId,
        imageUrl: badgeImageUrl,
        points: badgeInfo.points || 0,
        title: badgeInfo.title,
        description: badgeInfo.description
      });

      // Award points if badge has points
      if (badgeInfo.points && badgeInfo.points > 0) {
        try {
          const currentSeason = seasonService.getCurrentSeason();
          const pointsResult = await pointsService.awardSeasonPoints(
            userId,
            badgeInfo.points,
            'quest_completion',
            badgeId,
            `Points for claiming badge: ${badgeInfo.title}`,
            currentSeason,
            'badge_claim'
          );

          if (pointsResult.success) {
            logger.info('Points awarded for badge claim', {
              userId,
              badgeId,
              pointsAwarded: pointsResult.pointsAwarded,
              totalPoints: pointsResult.totalPoints
            }, 'BadgeService');
          } else {
            logger.warn('Failed to award points for badge claim', {
              userId,
              badgeId,
              points: badgeInfo.points,
              error: pointsResult.error
            }, 'BadgeService');
          }
        } catch (pointsError) {
          logger.error('Error awarding points for badge claim', {
            error: pointsError,
            userId,
            badgeId,
            points: badgeInfo.points
          }, 'BadgeService');
          // Don't fail the badge claim if points award fails
        }
      }

      logger.info('Badge claimed successfully', {
        userId,
        badgeId,
        points: badgeInfo.points
      }, 'BadgeService');

      // Check and unlock any assets associated with this badge
      try {
        const assetUnlockResult = await checkAndUnlockBadgeAssets(userId);
        if (assetUnlockResult.newlyUnlocked.length > 0) {
          logger.info('Assets unlocked via badge claim', {
            userId,
            badgeId,
            unlockedAssets: assetUnlockResult.newlyUnlocked
          }, 'BadgeService');
        }
      } catch (assetError) {
        // Don't fail badge claim if asset unlock fails
        logger.error('Failed to check/unlock badge assets', { userId, badgeId, error: assetError }, 'BadgeService');
      }

      return {
        success: true,
        badgeId
      };
    } catch (error) {
      logger.error('Failed to claim badge', { error, badgeId }, 'BadgeService');
      return {
        success: false,
        badgeId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get badge progress for a specific badge
   */
  async getBadgeProgress(userId: string, badgeId: string): Promise<BadgeProgress | null> {
    try {
      const progress = await this.getUserBadgeProgress(userId);
      return progress.find(p => p.badgeId === badgeId) || null;
    } catch (error) {
      logger.error('Failed to get badge progress', { error, badgeId }, 'BadgeService');
      return null;
    }
  }

  /**
   * Get user's claimed badges only (for profile display)
   * Returns badges with their image URLs and metadata
   */
  async getUserClaimedBadges(userId: string): Promise<UserClaimedBadge[]> {
    const cached = this.getCachedValue(this.userClaimedBadgesCache, userId);
    if (cached) {
      return cached;
    }

    try {
      const claimedBadgeIds = await this.getClaimedBadges(userId);
      
      const claimedBadges = await Promise.all(
        claimedBadgeIds.map(async (badgeId) => {
          const badgeInfo = await this.getBadgeInfo(badgeId);
          if (!badgeInfo) return null;

          const claimedBadgeData = await this.getClaimedBadgeData(userId, badgeId);
          const imageUrl = await this.getBadgeImageUrl(badgeId, claimedBadgeData?.imageUrl || badgeInfo.iconUrl);

          return {
            badgeId,
            title: badgeInfo.title,
            description: badgeInfo.description,
            icon: badgeInfo.icon || undefined, // Optional - icon not required
            imageUrl,
            claimedAt: claimedBadgeData?.claimedAt,
            isCommunityBadge: badgeInfo.isCommunityBadge || false,
            showNextToName: badgeInfo.showNextToName || false,
            category: badgeInfo.category,
            isEventBadge: badgeInfo.isEventBadge || false,
            points: badgeInfo.points
          };
        })
      );

      const filteredBadges = claimedBadges.filter((badge): badge is NonNullable<typeof badge> => badge !== null);
      this.setCachedValue(this.userClaimedBadgesCache, userId, filteredBadges);
      return filteredBadges;
    } catch (error) {
      logger.error('Failed to get user claimed badges', { error }, 'BadgeService');
      return [];
    }
  }

  /**
   * Get user's community badges (badges that should be displayed next to name)
   */
  async getUserCommunityBadges(userId: string): Promise<CommunityBadge[]> {
    const cached = this.getCachedValue(this.communityBadgesCache, userId);
    if (cached) {
      return cached;
    }

    try {
      const claimedBadges = await this.getUserClaimedBadges(userId);
      const communityBadges = claimedBadges
        .filter(badge => badge.isCommunityBadge && badge.showNextToName)
        .map(badge => ({
          badgeId: badge.badgeId,
          title: badge.title,
          imageUrl: badge.imageUrl
        }));

      this.setCachedValue(this.communityBadgesCache, userId, communityBadges);
      return communityBadges;
    } catch (error) {
      logger.error('Failed to get user community badges', { error }, 'BadgeService');
      return [];
    }
  }

  /**
   * Claim an event badge via redeem code
   */
  async claimEventBadge(userId: string, redeemCode: string): Promise<BadgeClaimResult> {
    try {
      // Stricter validation: trim whitespace and validate format
      const trimmedCode = redeemCode.trim();
      
      // Validate code format: minimum length, no empty strings
      if (!trimmedCode || trimmedCode.length < 4) {
        return {
          success: false,
          badgeId: '',
          error: 'Invalid redeem code format'
        };
      }

      // Case-insensitive match for better user experience
      // Convert to uppercase for comparison (all redeem codes are stored in uppercase)
      const normalizedCode = trimmedCode.toUpperCase();
      
      // Find badge in Firestore (all event/community badges are now in database)
      const badgeInfo = await this.getBadgeInfoByRedeemCode(normalizedCode);

      if (!badgeInfo) {
        return {
          success: false,
          badgeId: '',
          error: 'Invalid redeem code'
        };
      }

      // Check if already claimed
      const claimedBadges = await this.getClaimedBadges(userId);
      if (claimedBadges.includes(badgeInfo.badgeId)) {
        return {
          success: false,
          badgeId: badgeInfo.badgeId,
          error: 'Badge already claimed'
        };
      }

      // Get badge image URL from Firebase Storage or config
      const badgeImageUrl = await this.getBadgeImageUrl(badgeInfo.badgeId, badgeInfo.iconUrl);

      // Save badge claim using shared method
      await this.saveBadgeClaim(userId, {
        badgeId: badgeInfo.badgeId,
        imageUrl: badgeImageUrl,
        points: badgeInfo.points || 0,
        title: badgeInfo.title,
        description: badgeInfo.description,
        redeemCode: normalizedCode
      });

      // Award points if badge has points
      if (badgeInfo.points && badgeInfo.points > 0) {
        try {
          const currentSeason = seasonService.getCurrentSeason();
          const pointsResult = await pointsService.awardSeasonPoints(
            userId,
            badgeInfo.points,
            'quest_completion',
            badgeInfo.badgeId,
            `Points for claiming badge: ${badgeInfo.title}`,
            currentSeason,
            'badge_claim'
          );

          if (pointsResult.success) {
            logger.info('Points awarded for event badge claim', {
              userId,
              badgeId: badgeInfo.badgeId,
              redeemCode,
              pointsAwarded: pointsResult.pointsAwarded,
              totalPoints: pointsResult.totalPoints
            }, 'BadgeService');
          } else {
            logger.warn('Failed to award points for event badge claim', {
              userId,
              badgeId: badgeInfo.badgeId,
              redeemCode,
              points: badgeInfo.points,
              error: pointsResult.error
            }, 'BadgeService');
          }
        } catch (pointsError) {
          logger.error('Error awarding points for event badge claim', {
            error: pointsError,
            userId,
            badgeId: badgeInfo.badgeId,
            redeemCode,
            points: badgeInfo.points
          }, 'BadgeService');
          // Don't fail the badge claim if points award fails
        }
      }

      logger.info('Event badge claimed successfully', {
        userId,
        badgeId: badgeInfo.badgeId,
        redeemCode,
        points: badgeInfo.points
      }, 'BadgeService');

      // Check and unlock any assets associated with this badge
      try {
        const assetUnlockResult = await checkAndUnlockBadgeAssets(userId);
        if (assetUnlockResult.newlyUnlocked.length > 0) {
          logger.info('Assets unlocked via badge claim', {
            userId,
            badgeId: badgeInfo.badgeId,
            unlockedAssets: assetUnlockResult.newlyUnlocked
          }, 'BadgeService');
        }
      } catch (assetError) {
        // Don't fail badge claim if asset unlock fails
        logger.error('Failed to check/unlock badge assets', { userId, badgeId: badgeInfo.badgeId, error: assetError }, 'BadgeService');
      }

      return {
        success: true,
        badgeId: badgeInfo.badgeId
      };
    } catch (error) {
      logger.error('Failed to claim event badge', { error, redeemCode }, 'BadgeService');
      return {
        success: false,
        badgeId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Resolve progress value based on badge configuration
   */
  private getProgressValueForBadge(badge: BadgeInfo, metrics: {
    splitWithdrawals: number;
    transactionCount: number;
    transactionVolume: number;
  }): number {
    let progressValue: number;
    switch (badge.progressMetric) {
      case 'transaction_count':
        progressValue = metrics.transactionCount;
        break;
      case 'transaction_volume':
        progressValue = metrics.transactionVolume;
        break;
      case 'split_withdrawals':
      default:
        progressValue = metrics.splitWithdrawals;
        break;
    }
    
    logger.debug('Calculated badge progress', {
      badgeId: badge.badgeId,
      progressMetric: badge.progressMetric,
      progressValue,
      target: badge.target,
      metrics
    }, 'BadgeService');
    
    return progressValue;
  }

  /**
   * Normalize transaction amount to a positive numeric value
   */
  private normalizeTransactionAmount(amount: unknown): number {
    let numericAmount: number;
    if (typeof amount === 'number') {
      numericAmount = amount;
    } else if (typeof amount === 'string') {
      numericAmount = parseFloat(amount);
    } else {
      numericAmount = 0;
    }

    if (!Number.isFinite(numericAmount)) {
      return 0;
    }

    return Math.abs(numericAmount);
  }

  /**
   * Convert transaction amount to USD-equivalent for consistent comparisons
   */
  private async getUsdAmountForTransaction(data: Record<string, unknown>): Promise<number> {
    const amount = this.normalizeTransactionAmount(data.amount);
    if (amount === 0) {
      return 0;
    }

    const currencyRaw = typeof data.currency === 'string' ? data.currency.toUpperCase() : 'USD';
    if (currencyRaw === 'USD' || currencyRaw === 'USDC') {
      return amount;
    }

    try {
      const conversion = await priceManagementService.convertCurrency(currencyRaw, 'USD', amount);
      if (conversion?.toAmount) {
        return conversion.toAmount;
      }
    } catch (error) {
      logger.warn('Currency conversion failed for badge metrics', { currency: currencyRaw, amount, error }, 'BadgeService');
    }

    return amount;
  }

  /**
   * Determine if a transaction is a split withdrawal (supports legacy data)
   */
  private isSplitWithdrawal(data: Record<string, unknown>, userId: string): boolean {
    const senderId = typeof data.from_user === 'string' ? data.from_user : undefined;
    if (senderId !== userId) {
      return false;
    }

    if ((data.transactionType as string | undefined) === 'split_wallet_withdrawal') {
      return true;
    }

    const note = (data.note as string | undefined)?.toLowerCase() || '';
    return (
      note.includes('split') &&
      (note.includes('withdrawal') ||
        note.includes('withdraw') ||
        note.includes('extract') ||
        note.includes('extraction'))
    );
  }

  private getCachedValue<T>(cache: Map<string, { value: T; expires: number }>, userId: string): T | null {
    const cached = cache.get(userId);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    cache.delete(userId);
    return null;
  }

  private setCachedValue<T>(cache: Map<string, { value: T; expires: number }>, userId: string, value: T): void {
    cache.set(userId, { value, expires: Date.now() + BadgeService.CACHE_TTL_MS });
  }

  private invalidateUserBadgeCaches(userId: string): void {
    this.badgeMetricsCache.delete(userId);
    this.claimedBadgeIdsCache.delete(userId);
    this.userClaimedBadgesCache.delete(userId);
    this.communityBadgesCache.delete(userId);
  }

  /**
   * Invalidate Firestore badges cache
   * Call this when badges are added/updated in Firestore
   */
  invalidateFirestoreBadgesCache(): void {
    this.firestoreBadgesCache = null;
    logger.debug('Firestore badges cache invalidated', null, 'BadgeService');
  }

  /**
   * Test connection to Firestore badges collection
   * Useful for debugging and verification
   */
  async testBadgeConnection(): Promise<{ success: boolean; badgeCount: number; error?: string }> {
    try {
      const badgesRef = collection(db, 'badges');
      const snapshot = await getDocs(badgesRef);
      
      logger.info('Badge connection test successful', { 
        badgeCount: snapshot.size,
        collection: 'badges'
      }, 'BadgeService');
      
      return {
        success: true,
        badgeCount: snapshot.size
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Badge connection test failed', { error: errorMessage }, 'BadgeService');
      
      return {
        success: false,
        badgeCount: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Migrate badges from config to Firestore
   * This can be called from the app to populate Firestore with existing badges
   */
  async migrateBadgesToFirestore(overwrite: boolean = false): Promise<{
    success: number;
    skipped: number;
    errors: Array<{ badgeId: string; error: string }>;
  }> {
    const result = {
      success: 0,
      skipped: 0,
      errors: [] as Array<{ badgeId: string; error: string }>
    };

    try {
      // Get all event/community badges from config
      const badgesToMigrate = Object.values(BADGE_DEFINITIONS).filter(
        badge => badge.isEventBadge || 
                 badge.category === 'event' || 
                 badge.category === 'community' ||
                 badge.redeemCode
      );

      logger.info('Starting badge migration to Firestore', { 
        badgeCount: badgesToMigrate.length,
        overwrite 
      }, 'BadgeService');

      for (const badge of badgesToMigrate) {
        try {
          // Check if badge already exists
          const badgeRef = doc(db, 'badges', badge.badgeId);
          const existingDoc = await getDoc(badgeRef);

          if (existingDoc.exists() && !overwrite) {
            logger.debug('Badge already exists, skipping', { badgeId: badge.badgeId }, 'BadgeService');
            result.skipped++;
            continue;
          }

          // Prepare badge data for Firestore
          const badgeData: any = {
            badgeId: badge.badgeId,
            title: badge.title,
            description: badge.description,
          };

          // Add optional fields
          if (badge.iconUrl) badgeData.iconUrl = badge.iconUrl;
          if (badge.category) badgeData.category = badge.category;
          if (badge.rarity) badgeData.rarity = badge.rarity;
          if (badge.points !== undefined) badgeData.points = badge.points;
          if (badge.target !== undefined) badgeData.target = badge.target;
          if (badge.isEventBadge !== undefined) badgeData.isEventBadge = badge.isEventBadge;
          if (badge.redeemCode) badgeData.redeemCode = badge.redeemCode.toUpperCase();
          if (badge.isCommunityBadge !== undefined) badgeData.isCommunityBadge = badge.isCommunityBadge;
          if (badge.showNextToName !== undefined) badgeData.showNextToName = badge.showNextToName;
          if (badge.progressMetric) badgeData.progressMetric = badge.progressMetric;
          if (badge.progressLabel) badgeData.progressLabel = badge.progressLabel;

          // Write to Firestore
          await setDoc(badgeRef, badgeData, { merge: true });

          logger.info('Badge migrated to Firestore', { badgeId: badge.badgeId }, 'BadgeService');
          result.success++;

          // Invalidate cache to ensure fresh data
          this.invalidateFirestoreBadgesCache();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Failed to migrate badge', { badgeId: badge.badgeId, error: errorMessage }, 'BadgeService');
          result.errors.push({
            badgeId: badge.badgeId,
            error: errorMessage
          });
        }
      }

      logger.info('Badge migration completed', {
        success: result.success,
        skipped: result.skipped,
        errors: result.errors.length
      }, 'BadgeService');

      return result;
    } catch (error) {
      logger.error('Badge migration failed', { error }, 'BadgeService');
      throw error;
    }
  }

  /**
   * Backfill points for badges that were claimed before points awarding was implemented
   * Checks all claimed badges and awards points if they haven't been awarded yet
   */
  async backfillBadgePoints(userId: string): Promise<{
    pointsAwarded: number;
    badgesProcessed: number;
    errors: string[];
  }> {
    const result = {
      pointsAwarded: 0,
      badgesProcessed: 0,
      errors: [] as string[]
    };

    try {
      // Get all claimed badges for the user
      const claimedBadgeIds = await this.getClaimedBadges(userId);
      
      if (claimedBadgeIds.length === 0) {
        logger.debug('No claimed badges to backfill', { userId }, 'BadgeService');
        return result;
      }

      // Check which badges already have points awarded
      const pointsTransactionsQuery = query(
        collection(db, 'points_transactions'),
        where('user_id', '==', userId),
        where('source', '==', 'quest_completion'),
        where('task_type', '==', 'badge_claim')
      );
      const pointsTransactionsSnapshot = await getDocs(pointsTransactionsQuery);
      const badgesWithPointsAwarded = new Set<string>();
      
      pointsTransactionsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.source_id) {
          badgesWithPointsAwarded.add(data.source_id);
        }
      });

      logger.info('Checking badges for backfill', {
        userId,
        totalClaimedBadges: claimedBadgeIds.length,
        badgesWithPointsAwarded: badgesWithPointsAwarded.size
      }, 'BadgeService');

      // Process each claimed badge
      for (const badgeId of claimedBadgeIds) {
        try {
          // Skip if points were already awarded
          if (badgesWithPointsAwarded.has(badgeId)) {
            logger.debug('Badge already has points awarded', { userId, badgeId }, 'BadgeService');
            result.badgesProcessed++;
            continue;
          }

          // Get badge info
          const badgeInfo = await this.getBadgeInfo(badgeId);
          if (!badgeInfo) {
            logger.warn('Badge definition not found', { userId, badgeId }, 'BadgeService');
            result.errors.push(`Badge definition not found: ${badgeId}`);
            continue;
          }

          // Only award points if badge has points
          if (!badgeInfo.points || badgeInfo.points <= 0) {
            logger.debug('Badge has no points to award', { userId, badgeId }, 'BadgeService');
            result.badgesProcessed++;
            continue;
          }

          // Award points for this badge
          const currentSeason = seasonService.getCurrentSeason();
          const pointsResult = await pointsService.awardSeasonPoints(
            userId,
            badgeInfo.points,
            'quest_completion',
            badgeId,
            `Retroactive points for claiming badge: ${badgeInfo.title}`,
            currentSeason,
            'badge_claim'
          );

          if (pointsResult.success) {
            result.pointsAwarded += pointsResult.pointsAwarded;
            result.badgesProcessed++;
            logger.info('Points backfilled for badge', {
              userId,
              badgeId,
              badgeTitle: badgeInfo.title,
              pointsAwarded: pointsResult.pointsAwarded,
              totalPoints: pointsResult.totalPoints
            }, 'BadgeService');
          } else {
            const errorMsg = `Failed to award points for badge ${badgeId}: ${pointsResult.error}`;
            result.errors.push(errorMsg);
            logger.error('Failed to backfill points for badge', {
              userId,
              badgeId,
              error: pointsResult.error
            }, 'BadgeService');
          }
        } catch (error) {
          const errorMsg = `Error processing badge ${badgeId}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          logger.error('Error processing badge for backfill', {
            userId,
            badgeId,
            error
          }, 'BadgeService');
        }
      }

      logger.info('Badge points backfill completed', {
        userId,
        pointsAwarded: result.pointsAwarded,
        badgesProcessed: result.badgesProcessed,
        errors: result.errors.length
      }, 'BadgeService');

      return result;
    } catch (error) {
      logger.error('Failed to backfill badge points', { userId, error }, 'BadgeService');
      result.errors.push(`Backfill failed: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }
}

// Export singleton instance
export const badgeService = new BadgeService();

