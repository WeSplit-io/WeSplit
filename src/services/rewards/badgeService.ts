/**
 * Badge Service
 * Manages badge progress tracking and claims
 */

import { db, storage } from '../../config/firebase/firebase';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp, query, where, runTransaction, QueryDocumentSnapshot } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { logger } from '../analytics/loggingService';
import priceManagementService from '../core/priceManagementService';
import { BADGE_DEFINITIONS, BadgeInfo } from './badgeConfig';

export interface BadgeProgress {
  badgeId: string;
  current: number;
  target: number;
  claimed: boolean;
  claimedAt?: string;
  imageUrl?: string; // NFT/image URL from database
  isEventBadge?: boolean; // True if this is an event badge
  redeemCode?: string; // Redeem code for event badges
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
  icon: string;
  imageUrl?: string;
  claimedAt?: string;
  isCommunityBadge?: boolean;
  showNextToName?: boolean;
};

type CommunityBadge = {
  badgeId: string;
  title: string;
  icon: string;
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
  /**
   * Get user's badge progress for all badges
   */
  async getUserBadgeProgress(userId: string): Promise<BadgeProgress[]> {
    try {
      // Get all achievement badges (splits withdrawn badges)
      const achievementBadges = Object.values(BADGE_DEFINITIONS).filter(
        badge => badge.category === 'achievement'
      );

      // Get all event badges
      const eventBadges = Object.values(BADGE_DEFINITIONS).filter(
        badge => badge.category === 'event' || badge.isEventBadge === true
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
            isEventBadge: false
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
            redeemCode: badge.redeemCode
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

      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
      ]);

      logger.debug('Transaction queries completed', {
        userId,
        sentCount: sentSnapshot.size,
        receivedCount: receivedSnapshot.size
      }, 'BadgeService');

      const transactionDocs = new Map<string, QueryDocumentSnapshot>();
      sentSnapshot.forEach((docSnap) => transactionDocs.set(docSnap.id, docSnap));
      receivedSnapshot.forEach((docSnap) => transactionDocs.set(docSnap.id, docSnap));

      const metrics: BadgeMetrics = {
        splitWithdrawals: 0,
        transactionCount: 0,
        transactionVolume: 0
      };

      // Log sample transactions for debugging
      if (transactionDocs.size > 0) {
        const sampleTransaction = Array.from(transactionDocs.values())[0];
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

      for (const docSnap of transactionDocs.values()) {
        const data = docSnap.data() as Record<string, unknown>;
        metrics.transactionCount += 1;
        metrics.transactionVolume += await this.getUsdAmountForTransaction(data);

        const isSplit = this.isSplitWithdrawal(data, userId);
        if (isSplit) {
          metrics.splitWithdrawals += 1;
          logger.debug('Found split withdrawal', {
            userId,
            transactionId: docSnap.id,
            transactionType: data.transactionType,
            note: data.note
          }, 'BadgeService');
        }
      }

      logger.debug('Computed badge metrics from transactions', { 
        userId, 
        splitWithdrawals: metrics.splitWithdrawals,
        transactionCount: metrics.transactionCount,
        transactionVolume: metrics.transactionVolume,
        totalTransactions: transactionDocs.size
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
   * Convert gs:// URL to Firebase Storage download URL
   */
  private async convertGsUrlToDownloadUrl(gsUrl: string): Promise<string | undefined> {
    try {
      // Extract path from gs:// URL
      // Format: gs://bucket/path/to/file.png or gs://bucket.firebasestorage.app/path/to/file.png
      // We need to extract: path/to/file.png
      
      // Try different patterns to handle various gs:// URL formats
      let storagePath: string | null = null;
      
      // Pattern 1: gs://bucket/path/to/file.png
      let urlMatch = gsUrl.match(/^gs:\/\/[^/]+\/(.+)$/);
      if (urlMatch && urlMatch[1]) {
        storagePath = urlMatch[1];
      } else {
        // Pattern 2: gs://bucket.firebasestorage.app/path/to/file.png
        // Extract everything after the domain
        urlMatch = gsUrl.match(/^gs:\/\/[^/]+\.firebasestorage\.app\/(.+)$/);
        if (urlMatch && urlMatch[1]) {
          storagePath = urlMatch[1];
        }
      }
      
      if (!storagePath) {
        logger.warn('Invalid gs:// URL format - could not extract path', { gsUrl }, 'BadgeService');
        return undefined;
      }

      logger.debug('Converting gs:// URL to download URL', { gsUrl, storagePath }, 'BadgeService');
      
      const storageRef = ref(storage, storagePath);
      const downloadUrl = await getDownloadURL(storageRef);
      
      logger.debug('Successfully converted gs:// URL', { gsUrl, downloadUrl }, 'BadgeService');
      return downloadUrl;
    } catch (error: any) {
      // Handle specific Firebase Storage errors
      if (error?.code === 'storage/object-not-found') {
        logger.warn('Badge image not found in Firebase Storage', { gsUrl, error: error.message }, 'BadgeService');
      } else if (error?.code === 'storage/unauthorized') {
        logger.warn('Unauthorized access to badge image', { gsUrl, error: error.message }, 'BadgeService');
      } else {
        logger.error('Failed to convert gs:// URL to download URL', { error, gsUrl, errorCode: error?.code, errorMessage: error?.message }, 'BadgeService');
      }
      return undefined;
    }
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
          const downloadUrl = await this.convertGsUrlToDownloadUrl(fallbackUrl);
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
              const downloadUrl = await this.convertGsUrlToDownloadUrl(data.imageUrl);
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

      // Return fallback URL if provided (even if conversion failed, might still be useful)
      return fallbackUrl;
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
      // Check if badge exists
      const badgeInfo = BADGE_DEFINITIONS[badgeId];
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

      logger.info('Badge claimed successfully', {
        userId,
        badgeId,
        points: badgeInfo.points
      }, 'BadgeService');

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
          const badgeInfo = BADGE_DEFINITIONS[badgeId];
          if (!badgeInfo) return null;

          const claimedBadgeData = await this.getClaimedBadgeData(userId, badgeId);
          const imageUrl = await this.getBadgeImageUrl(badgeId, claimedBadgeData?.imageUrl || badgeInfo.iconUrl);

          return {
            badgeId,
            title: badgeInfo.title,
            description: badgeInfo.description,
            icon: badgeInfo.icon,
            imageUrl,
            claimedAt: claimedBadgeData?.claimedAt,
            isCommunityBadge: badgeInfo.isCommunityBadge || false,
            showNextToName: badgeInfo.showNextToName || false
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
          icon: badge.icon,
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
      // Find badge by redeem code
      const badgeInfo = Object.values(BADGE_DEFINITIONS).find(
        badge => badge.redeemCode?.toUpperCase() === redeemCode.toUpperCase() && 
                 (badge.isEventBadge || badge.category === 'event')
      );

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
        redeemCode: redeemCode.toUpperCase()
      });

      logger.info('Event badge claimed successfully', {
        userId,
        badgeId: badgeInfo.badgeId,
        redeemCode,
        points: badgeInfo.points
      }, 'BadgeService');

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
}

// Export singleton instance
export const badgeService = new BadgeService();

