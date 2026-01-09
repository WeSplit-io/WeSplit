/**
 * Christmas Calendar Service
 * Manages the advent calendar gift system (December 1-25)
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
  private readonly YEAR = 2025;
  private readonly START_DATE: Date;
  private readonly END_DATE: Date;

  constructor() {
    this.START_DATE = CHRISTMAS_CALENDAR_CONFIG.startDate;
    this.END_DATE = CHRISTMAS_CALENDAR_CONFIG.endDate;
  }


  /**
   * Get the current day in the user's local timezone
   * Returns 1-25 if within calendar period, null otherwise
   */
  getCurrentDay(userTimezone?: string): number | null {
    const now = new Date();

    // For React Native compatibility, avoid timezone conversion which can cause date parsing errors
    // Use device local time instead of converting to specific timezones
    // This prevents "Date value out of bounds" errors in React Native
    const localDate = now;

    const year = localDate.getFullYear();
    const month = localDate.getMonth(); // 0-indexed (November = 10, December = 11)
    const day = localDate.getDate();

    // Check if we're in December 2025
    if (year !== this.YEAR || month !== 11) { // 11 = December (0-indexed)
      logger.debug('Calendar not active - date check failed', {
        year, month, day, expectedYear: this.YEAR
      }, 'ChristmasCalendarService');
      return null;
    }

    // Check if day is between 1 and 25
    if (day < 1 || day > 25) {
      logger.debug('Calendar not active - day out of range', { day }, 'ChristmasCalendarService');
      return null;
    }

    logger.debug('Calendar active - returning day', { day }, 'ChristmasCalendarService');
    return day;
  }

  /**
   * Check if a specific day can be claimed
   * Users can claim:
   * - Today's gift (if it's Dec 1-25)
   * - Past days they haven't claimed yet (catch-up)
   * - Cannot claim future days
   */
  canClaimDay(day: number, userTimezone?: string): { canClaim: boolean; reason?: string } {
    if (day < 1 || day > 25) {
      return { canClaim: false, reason: 'Invalid day. Must be between 1 and 25.' };
    }

    const currentDay = this.getCurrentDay(userTimezone);
    
    // If we're outside the calendar period
    if (currentDay === null) {
      return { canClaim: false, reason: 'Christmas calendar is only available December 1-25.' };
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
      // Initialize all 25 days as unclaimed
      const days: ChristmasCalendarDay[] = Array.from({ length: 25 }, (_, i) => ({
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
        if (day >= 1 && day <= 25) {
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
      if (day < 1 || day > 25) {
        return {
          success: false,
          day,
          gift: { type: 'points', amount: 0 },
          error: 'Invalid day. Must be between 1 and 25.'
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

      // Check for community badge bonus BEFORE transaction (can't use async in transaction)
      let pointsMultiplier = 1;
      let hasActiveCommunityBadge = false;
      if (normalizedGift.type === 'points') {
        try {
          const { checkActiveCommunityBadge } = await import('./communityBadgeBonusService');
          const badgeCheck = await checkActiveCommunityBadge(userId);
          hasActiveCommunityBadge = badgeCheck.hasActiveCommunityBadge;
          if (hasActiveCommunityBadge) {
            pointsMultiplier = 2; // Double points
          }
        } catch (bonusError) {
          logger.warn('Failed to check community badge for calendar gift', {
            userId,
            day,
            error: bonusError
          }, 'ChristmasCalendarService');
          // Continue with base multiplier if check fails
        }
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
          
          // Apply community badge bonus (multiplier calculated before transaction)
          const finalPointsAmount = pointsGift.amount * pointsMultiplier;
          
          const newPoints = (userData.points || 0) + finalPointsAmount;
          const newTotalEarned = (userData.total_points_earned || 0) + finalPointsAmount;

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
            console.log('🎄 Adding wallet background asset:', {
              assetId: assetGift.assetId,
              currentWalletBackgrounds: walletBackgrounds,
              alreadyOwned: walletBackgrounds.includes(assetGift.assetId)
            });

            if (!walletBackgrounds.includes(assetGift.assetId)) {
              const newWalletBackgrounds = [...walletBackgrounds, assetGift.assetId];
              console.log('✅ Adding asset to wallet_backgrounds:', {
                assetId: assetGift.assetId,
                newWalletBackgrounds,
                currentActive: userData.active_wallet_background
              });

              transaction.update(userRef, {
                wallet_backgrounds: newWalletBackgrounds,
                // Set as active if user doesn't have one
                active_wallet_background: userData.active_wallet_background || assetGift.assetId
              });
            } else {
              console.log('⚠️ Asset already owned, skipping addition:', assetGift.assetId);
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
      // Points were already added in the Firestore transaction above
      if (result.success && normalizedGift.type === 'points') {
        const pointsGift = normalizedGift as PointsGift;
        try {
          // Final amount with bonus (multiplier was calculated before transaction)
          const finalAmount = pointsGift.amount * pointsMultiplier;
          
          // Only record the transaction, don't award points again (they're already added)
          // Use current season for tracking
          const currentSeason = seasonService.getCurrentSeason();
          const description = hasActiveCommunityBadge
            ? `Christmas Calendar Day ${day} - ${giftConfig.title} - Community Badge Bonus: ${pointsMultiplier}x`
            : `Christmas Calendar Day ${day} - ${giftConfig.title}`;
          
          if (hasActiveCommunityBadge) {
            logger.info('Community badge bonus applied to Christmas calendar gift', {
              userId,
              day,
              baseAmount: pointsGift.amount,
              finalAmount,
              multiplier: pointsMultiplier
            }, 'ChristmasCalendarService');
          }
          
          await pointsService.recordPointsTransaction(
            userId,
            finalAmount,
            'quest_completion',
            `christmas_calendar_${this.YEAR}_day_${day}`,
            description,
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
   * Returns true only during December 1-25
   */
  isCalendarActive(userTimezone?: string): boolean {
    return this.getCurrentDay(userTimezone) !== null;
  }
}

// Export singleton instance
export const christmasCalendarService = new ChristmasCalendarService();

