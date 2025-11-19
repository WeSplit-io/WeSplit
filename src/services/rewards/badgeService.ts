/**
 * Badge Service
 * Manages badge progress tracking and claims
 */

import { db } from '../../config/firebase/firebase';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp, query, where, runTransaction } from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { BADGE_DEFINITIONS } from './badgeConfig';

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

class BadgeService {
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

      // Get user's split withdrawal count
      const withdrawalCount = await this.getUserSplitWithdrawalCount(userId);

      // Get claimed badges from database
      const claimedBadges = await this.getClaimedBadges(userId);

      // Build progress array for achievement badges
      const achievementProgress: BadgeProgress[] = await Promise.all(
        achievementBadges.map(async (badge) => {
          const claimed = claimedBadges.includes(badge.badgeId);
          const claimedBadgeData = claimed ? await this.getClaimedBadgeData(userId, badge.badgeId) : null;

          // Get image URL - priority: claimed badge data > badge config > Firebase Storage
          const imageUrl = await this.getBadgeImageUrl(badge.badgeId, claimedBadgeData?.imageUrl || badge.iconUrl);

          return {
            badgeId: badge.badgeId,
            current: withdrawalCount,
            target: badge.target || 0,
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
   * Get user's split withdrawal count
   * Counts transactions with transactionType 'split_wallet_withdrawal'
   */
  private async getUserSplitWithdrawalCount(userId: string): Promise<number> {
    try {
      // Query transactions collection for split withdrawals
      // Split withdrawals are saved with transactionType: 'split_wallet_withdrawal'
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('from_user', '==', userId),
        where('status', '==', 'completed')
      );
      
      const snapshot = await getDocs(transactionsQuery);
      
      let withdrawalCount = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Primary check: transactionType field
        if (data.transactionType === 'split_wallet_withdrawal') {
          withdrawalCount++;
          return;
        }
        
        // Fallback: Check note for split withdrawal indicators (for legacy transactions)
        const note = (data.note || '').toLowerCase();
        if (
          note.includes('split') && 
          (note.includes('withdrawal') || note.includes('withdraw') || note.includes('extract') || note.includes('extraction'))
        ) {
          withdrawalCount++;
        }
      });

      return withdrawalCount;
    } catch (error) {
      logger.error('Failed to get split withdrawal count', { error }, 'BadgeService');
      return 0;
    }
  }

  /**
   * Get list of claimed badge IDs for a user
   */
  private async getClaimedBadges(userId: string): Promise<string[]> {
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
  }

  /**
   * Get badge image URL from Firebase Storage or badge configuration
   * Priority: 1. Provided URL, 2. Firebase Storage badge images collection, 3. Badge config iconUrl
   */
  private async getBadgeImageUrl(badgeId: string, fallbackUrl?: string): Promise<string | undefined> {
    try {
      // If a URL is already provided (from claimed badge or config), use it
      if (fallbackUrl && fallbackUrl.startsWith('http')) {
        return fallbackUrl;
      }

      // Try to get image URL from Firebase Storage badge images collection
      try {
        const badgeImageRef = doc(db, 'badge_images', badgeId);
        const badgeImageDoc = await getDoc(badgeImageRef);
        
        if (badgeImageDoc.exists()) {
          const data = badgeImageDoc.data();
          if (data.imageUrl && data.imageUrl.startsWith('http')) {
            return data.imageUrl;
          }
        }
      } catch (storageError) {
        // If badge_images collection doesn't exist or badge not found, continue to fallback
        logger.debug('Badge image not found in badge_images collection', { badgeId }, 'BadgeService');
      }

      // Return fallback URL if provided
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
  async getUserClaimedBadges(userId: string): Promise<Array<{
    badgeId: string;
    title: string;
    description: string;
    icon: string;
    imageUrl?: string;
    claimedAt?: string;
    isCommunityBadge?: boolean;
    showNextToName?: boolean;
  }>> {
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

      return claimedBadges.filter((badge): badge is NonNullable<typeof badge> => badge !== null);
    } catch (error) {
      logger.error('Failed to get user claimed badges', { error }, 'BadgeService');
      return [];
    }
  }

  /**
   * Get user's community badges (badges that should be displayed next to name)
   */
  async getUserCommunityBadges(userId: string): Promise<Array<{
    badgeId: string;
    title: string;
    icon: string;
    imageUrl?: string;
  }>> {
    try {
      const claimedBadges = await this.getUserClaimedBadges(userId);
      return claimedBadges
        .filter(badge => badge.isCommunityBadge && badge.showNextToName)
        .map(badge => ({
          badgeId: badge.badgeId,
          title: badge.title,
          icon: badge.icon,
          imageUrl: badge.imageUrl
        }));
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
}

// Export singleton instance
export const badgeService = new BadgeService();

