/**
 * Christmas Calendar Service
 * Manages the advent calendar gift system (December 1-24)
 * Handles gift claiming, validation, and distribution
 */

import { db } from '../../config/firebase/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { logger } from '../analytics/loggingService';
import { pointsService } from './pointsService';
import { seasonService } from './seasonService';
import { firebaseDataService } from '../data/firebaseDataService';
import {
  ChristmasCalendarDay,
  ChristmasCalendarStatus,
  ChristmasCalendarClaim,
  Gift,
  PointsGift,
  BadgeGift,
  AssetGift
} from '../../types/rewards';
import { 
  CHRISTMAS_CALENDAR_2024, 
  getGiftForDay, 
  CHRISTMAS_CALENDAR_CONFIG 
} from './christmasCalendarConfig';
import { resolveStorageUrl } from '../shared/storageUrlService';

interface ClaimGiftResult {
  success: boolean;
  day: number;
  gift: Gift;
  error?: string;
  totalPoints?: number; // If points were awarded
}

class ChristmasCalendarService {
  private readonly YEAR = 2024;
  private readonly START_DATE: Date;
  private readonly END_DATE: Date;
  
  // Development bypass mode - allows access to calendar outside December 1-24
  // Set to true to enable development/testing access
  private bypassMode: boolean = false;

  constructor() {
    this.START_DATE = CHRISTMAS_CALENDAR_CONFIG.startDate;
    this.END_DATE = CHRISTMAS_CALENDAR_CONFIG.endDate;
  }

  /**
   * Enable/disable development bypass mode
   * When enabled, allows calendar access and claiming outside December 1-24
   */
  setBypassMode(enabled: boolean): void {
    this.bypassMode = enabled;
    logger.info('Christmas calendar bypass mode', { enabled }, 'ChristmasCalendarService');
  }

  /**
   * Check if bypass mode is enabled
   */
  isBypassModeEnabled(): boolean {
    return this.bypassMode;
  }

  /**
   * Get the current day in the user's local timezone
   * Returns 1-24 if within calendar period, null otherwise
   * In bypass mode, returns day 1 for testing purposes
   */
  getCurrentDay(userTimezone?: string): number | null {
    // If bypass mode is enabled, return day 1 for testing
    if (this.bypassMode) {
      return 1;
    }

    const now = new Date();
    
    // Convert to user's timezone if provided
    let localDate: Date;
    if (userTimezone) {
      try {
        // Create date string in user's timezone
        const dateStr = now.toLocaleString('en-US', { timeZone: userTimezone });
        localDate = new Date(dateStr);
      } catch (error) {
        logger.warn('Invalid timezone, using device timezone', { timezone: userTimezone }, 'ChristmasCalendarService');
        localDate = now;
      }
    } else {
      localDate = now;
    }

    const year = localDate.getFullYear();
    const month = localDate.getMonth(); // 0-indexed (November = 10, December = 11)
    const day = localDate.getDate();

    // Check if we're in December 2024
    if (year !== this.YEAR || month !== 11) { // 11 = December (0-indexed)
      return null;
    }

    // Check if day is between 1 and 24
    if (day < 1 || day > 24) {
      return null;
    }

    return day;
  }

  /**
   * Check if a specific day can be claimed
   * Users can claim:
   * - Today's gift (if it's Dec 1-24)
   * - Past days they haven't claimed yet (catch-up)
   * - Cannot claim future days
   * In bypass mode, any day (1-24) can be claimed
   */
  canClaimDay(day: number, userTimezone?: string): { canClaim: boolean; reason?: string } {
    if (day < 1 || day > 24) {
      return { canClaim: false, reason: 'Invalid day. Must be between 1 and 24.' };
    }

    // In bypass mode, allow claiming any day
    if (this.bypassMode) {
      return { canClaim: true };
    }

    const currentDay = this.getCurrentDay(userTimezone);
    
    // If we're outside the calendar period
    if (currentDay === null) {
      return { canClaim: false, reason: 'Christmas calendar is only available December 1-24.' };
    }

    // Can claim today or any past day (catch-up)
    if (day <= currentDay) {
      return { canClaim: true };
    }

    // Cannot claim future days
    return { canClaim: false, reason: 'You can only claim today\'s gift or past gifts you missed.' };
  }

  /**
   * Get user's calendar status
   * Returns which days have been claimed and current status
   */
  async getUserCalendarStatus(userId: string, userTimezone?: string): Promise<ChristmasCalendarStatus> {
    try {
      // Initialize all 24 days as unclaimed
      const days: ChristmasCalendarDay[] = Array.from({ length: 24 }, (_, i) => ({
        day: i + 1,
        claimed: false
      }));

      // Fetch user's claims from Firestore
      const claimsRef = collection(db, 'users', userId, 'christmas_calendar');
      const claimsSnapshot = await getDocs(claimsRef);

      // Mark claimed days
      claimsSnapshot.forEach((doc) => {
        const data = doc.data();
        const day = data.day as number;
        if (day >= 1 && day <= 24) {
          days[day - 1] = {
            day,
            claimed: true,
            claimed_at: data.claimed_at?.toDate?.()?.toISOString() || data.claimed_at,
            gift_id: data.gift_id,
            gift_data: data.gift_data
          };
        }
      });

      const totalClaimed = days.filter(d => d.claimed).length;
      const currentDay = this.getCurrentDay(userTimezone);
      const canClaimToday = currentDay !== null && !days[currentDay - 1].claimed;

      return {
        year: this.YEAR,
        days,
        totalClaimed,
        canClaimToday,
        todayDay: currentDay || undefined
      };
    } catch (error) {
      logger.error('Failed to get user calendar status', error, 'ChristmasCalendarService');
      throw error;
    }
  }

  /**
   * Check if a specific day has been claimed
   */
  async isDayClaimed(userId: string, day: number): Promise<boolean> {
    try {
      const dayRef = doc(db, 'users', userId, 'christmas_calendar', day.toString());
      const dayDoc = await getDoc(dayRef);
      
      if (!dayDoc.exists()) {
        return false;
      }

      return dayDoc.data().claimed === true;
    } catch (error) {
      logger.error('Failed to check if day is claimed', error, 'ChristmasCalendarService');
      return false;
    }
  }

  /**
   * Claim a gift for a specific day
   * Validates the claim, distributes the gift, and records it
   */
  async claimGift(
    userId: string, 
    day: number, 
    userTimezone?: string
  ): Promise<ClaimGiftResult> {
    try {
      // Validate day
      if (day < 1 || day > 24) {
        return {
          success: false,
          day,
          gift: { type: 'points', amount: 0 },
          error: 'Invalid day. Must be between 1 and 24.'
        };
      }

      // Check if day can be claimed
      const canClaim = this.canClaimDay(day, userTimezone);
      if (!canClaim.canClaim) {
        return {
          success: false,
          day,
          gift: { type: 'points', amount: 0 },
          error: canClaim.reason || 'Cannot claim this day.'
        };
      }

      // Check if already claimed
      const alreadyClaimed = await this.isDayClaimed(userId, day);
      if (alreadyClaimed) {
        return {
          success: false,
          day,
          gift: { type: 'points', amount: 0 },
          error: 'This gift has already been claimed.'
        };
      }

      // Get gift configuration
      const giftConfig = getGiftForDay(day);
      if (!giftConfig) {
        return {
          success: false,
          day,
          gift: { type: 'points', amount: 0 },
          error: 'Gift configuration not found for this day.'
        };
      }

      const giftDefinition = giftConfig.gift;

      // Resolve asset URLs ahead of the transaction to avoid non-Firestore calls inside
      let normalizedGift: Gift = giftDefinition;
      if (giftDefinition.type === 'asset') {
        const assetGift = giftDefinition as AssetGift;
        const resolvedUrl = await resolveStorageUrl(assetGift.assetUrl, {
          userId,
          day,
          source: 'christmasCalendar'
        });
        normalizedGift = {
          ...assetGift,
          assetUrl: resolvedUrl ?? assetGift.assetUrl ?? undefined
        };
      }

      // Use transaction to ensure atomicity
      const result = await runTransaction(db, async (transaction) => {
        // Double-check claim status within transaction
        const dayRef = doc(db, 'users', userId, 'christmas_calendar', day.toString());
        const dayDoc = await transaction.get(dayRef);

        if (dayDoc.exists() && dayDoc.data().claimed === true) {
          throw new Error('Gift already claimed');
        }

        // Get user document for updates
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const now = serverTimestamp();
        const nowISO = new Date().toISOString();

        // Record the claim
        transaction.set(dayRef, {
          day,
          claimed: true,
          claimed_at: now,
          gift_id: `${this.YEAR}_day_${day}`,
          gift_data: normalizedGift,
          year: this.YEAR
        }, { merge: true });

        // Create detailed claim record for tracking
        const claimRef = doc(collection(db, 'users', userId, 'christmas_calendar_claims'));
        transaction.set(claimRef, {
          user_id: userId,
          year: this.YEAR,
          day,
          gift: giftConfig.gift,
          claimed_at: now,
          timezone: userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        });

        // Distribute the gift based on type
        let totalPoints = userData.points || 0;

        if (normalizedGift.type === 'points') {
          const pointsGift = normalizedGift as PointsGift;
          const newPoints = (userData.points || 0) + pointsGift.amount;
          const newTotalEarned = (userData.total_points_earned || 0) + pointsGift.amount;

          transaction.update(userRef, {
            points: newPoints,
            total_points_earned: newTotalEarned,
            points_last_updated: now
          });

          totalPoints = newPoints;

          // Note: Points transaction will be recorded after transaction completes
          // We'll handle this outside the transaction to avoid nested operations
        } else if (normalizedGift.type === 'badge') {
          const badgeGift = normalizedGift as BadgeGift;
          const badges = userData.badges || [];
          
          // Add badge if not already present
          if (!badges.includes(badgeGift.badgeId)) {
            transaction.update(userRef, {
              badges: [...badges, badgeGift.badgeId],
              // Set as active badge if user doesn't have one
              active_badge: userData.active_badge || badgeGift.badgeId
            });
          }
        } else if (normalizedGift.type === 'asset') {
          const assetGift = normalizedGift as AssetGift;
          
          // Store asset metadata in subcollection for easy retrieval
          const assetRef = doc(db, 'users', userId, 'assets', assetGift.assetId);
          transaction.set(assetRef, {
            assetId: assetGift.assetId,
            assetType: assetGift.assetType,
            name: assetGift.name,
            description: assetGift.description || '',
            assetUrl: assetGift.assetUrl || null,
            nftMetadata: assetGift.nftMetadata || null,
            claimed_at: now,
            claimed_from: `christmas_calendar_${this.YEAR}_day_${day}`
          }, { merge: true });
          
          if (assetGift.assetType === 'profile_image') {
            const profileAssets = userData.profile_assets || [];
            if (!profileAssets.includes(assetGift.assetId)) {
              transaction.update(userRef, {
                profile_assets: [...profileAssets, assetGift.assetId],
                // Set as active if user doesn't have one
                active_profile_asset: userData.active_profile_asset || assetGift.assetId
              });
            }
          } else if (assetGift.assetType === 'wallet_background') {
            const walletBackgrounds = userData.wallet_backgrounds || [];
            if (!walletBackgrounds.includes(assetGift.assetId)) {
              transaction.update(userRef, {
                wallet_backgrounds: [...walletBackgrounds, assetGift.assetId],
                // Set as active if user doesn't have one
                active_wallet_background: userData.active_wallet_background || assetGift.assetId
              });
            }
          } else if (assetGift.assetType === 'profile_border') {
            const profileBorders = userData.profile_borders || [];
            if (!profileBorders.includes(assetGift.assetId)) {
              transaction.update(userRef, {
                profile_borders: [...profileBorders, assetGift.assetId],
                active_profile_border: userData.active_profile_border || assetGift.assetId
              });
            }
          }
        }

        return {
          success: true,
          day,
          gift: normalizedGift,
          totalPoints: normalizedGift.type === 'points' ? totalPoints : undefined
        };
      });

      // Record points transaction if points were awarded (outside transaction)
      // NOTE: We only record the transaction here, NOT award points again
      // Points were already added in the Firestore transaction above (line 323-330)
      if (result.success && normalizedGift.type === 'points') {
        const pointsGift = normalizedGift as PointsGift;
        try {
          // Only record the transaction, don't award points again (they're already added)
          // Use current season for tracking
          const currentSeason = seasonService.getCurrentSeason();
          await pointsService.recordPointsTransaction(
            userId,
            pointsGift.amount,
            'quest_completion',
            `christmas_calendar_${this.YEAR}_day_${day}`,
            `Christmas Calendar Day ${day} - ${giftConfig.title}`,
            currentSeason,
            'christmas_calendar'
          );
        } catch (pointsError) {
          // Log error but don't fail the claim since points were already added
          logger.error('Failed to record points transaction', pointsError, 'ChristmasCalendarService');
        }
      }

      logger.info('Gift claimed successfully', {
        userId,
        day,
        giftType: normalizedGift.type,
        year: this.YEAR
      }, 'ChristmasCalendarService');

      return result;
    } catch (error) {
      logger.error('Failed to claim gift', error, 'ChristmasCalendarService');
      return {
        success: false,
        day,
        gift: { type: 'points', amount: 0 },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all claims for a user (for tracking/analytics)
   */
  async getUserClaims(userId: string): Promise<ChristmasCalendarClaim[]> {
    try {
      const claimsRef = collection(db, 'users', userId, 'christmas_calendar_claims');
      const claimsSnapshot = await getDocs(claimsRef);

      const claims: ChristmasCalendarClaim[] = [];
      claimsSnapshot.forEach((doc) => {
        const data = doc.data();
        claims.push({
          id: doc.id,
          user_id: data.user_id,
          year: data.year,
          day: data.day,
          gift: data.gift,
          claimed_at: data.claimed_at?.toDate?.()?.toISOString() || data.claimed_at,
          timezone: data.timezone
        });
      });

      return claims.sort((a, b) => a.day - b.day);
    } catch (error) {
      logger.error('Failed to get user claims', error, 'ChristmasCalendarService');
      return [];
    }
  }

  /**
   * Get user's timezone from device
   */
  getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Check if calendar is currently active
   * In bypass mode, always returns true
   */
  isCalendarActive(userTimezone?: string): boolean {
    if (this.bypassMode) {
      return true;
    }
    return this.getCurrentDay(userTimezone) !== null;
  }
}

// Export singleton instance
export const christmasCalendarService = new ChristmasCalendarService();

