/**
 * Community Badge Bonus Service
 * Handles bonuses for users with active community badges
 */

import { firebaseDataService } from '../data/firebaseDataService';
import { badgeService } from './badgeService';
import { logger } from '../analytics/loggingService';

/**
 * Check if user has an active community badge
 * @param userId User ID
 * @returns Object with hasActiveCommunityBadge flag and badgeId if active
 */
export async function checkActiveCommunityBadge(userId: string): Promise<{
  hasActiveCommunityBadge: boolean;
  activeBadgeId?: string;
}> {
  try {
    const user = await firebaseDataService.user.getCurrentUser(userId);
    
    if (!user.active_badge) {
      return { hasActiveCommunityBadge: false };
    }

    const badgeInfo = await badgeService.getBadgeInfoPublic(user.active_badge);
    const isCommunityBadge = badgeInfo?.isCommunityBadge === true;

    return {
      hasActiveCommunityBadge: isCommunityBadge,
      activeBadgeId: isCommunityBadge ? user.active_badge : undefined
    };
  } catch (error) {
    logger.warn('Failed to check active community badge', { userId, error }, 'CommunityBadgeBonusService');
    return { hasActiveCommunityBadge: false };
  }
}

/**
 * Apply community badge bonus multiplier to points
 * Currently: 2x (double points) for active community badges
 * @param basePoints Base points amount
 * @param userId User ID to check for active community badge
 * @returns Object with final points and bonus info
 */
export async function applyCommunityBadgeBonus(
  basePoints: number,
  userId: string
): Promise<{
  finalPoints: number;
  multiplier: number;
  hasActiveCommunityBadge: boolean;
  activeBadgeId?: string;
}> {
  const badgeCheck = await checkActiveCommunityBadge(userId);
  
  if (badgeCheck.hasActiveCommunityBadge) {
    const multiplier = 2; // Double points
    const finalPoints = basePoints * multiplier;
    
    logger.info('Community badge bonus applied', {
      userId,
      activeBadgeId: badgeCheck.activeBadgeId,
      basePoints,
      multiplier,
      finalPoints
    }, 'CommunityBadgeBonusService');
    
    return {
      finalPoints,
      multiplier,
      hasActiveCommunityBadge: true,
      activeBadgeId: badgeCheck.activeBadgeId
    };
  }

  return {
    finalPoints: basePoints,
    multiplier: 1,
    hasActiveCommunityBadge: false
  };
}
