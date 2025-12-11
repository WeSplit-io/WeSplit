/**
 * Split Rewards Handler
 * Handles all rewards-related logic for splits
 * Extracted to prevent bundling during split creation
 */

import { logger } from '../../analytics/loggingService';

/**
 * Award rewards for split creation (non-blocking)
 * This is called asynchronously after split creation to prevent bundling issues
 */
export async function awardSplitCreationRewards(
  splitId: string,
  creatorId: string,
  splitType: string | undefined,
  totalAmount: number,
  participantsCount: number
): Promise<void> {
  // Use a small delay to ensure split creation completes first
  // This prevents the bundler from trying to bundle rewards services during split creation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    // Sync first split quest completion
    const { userActionSyncService } = await import('../../rewards/userActionSyncService');
    await userActionSyncService.syncFirstSplit(creatorId);
  } catch (syncError) {
    logger.error('Failed to sync first split quest', { 
      userId: creatorId, 
      splitId,
      syncError 
    }, 'SplitRewardsHandler');
  }

  try {
    const { splitRewardsService } = await import('../../rewards/splitRewardsService');
    const { userActionSyncService } = await import('../../rewards/userActionSyncService');
    
    // Award owner bonus for creating split
    if (splitType === 'fair') {
      await splitRewardsService.awardFairSplitParticipation({
        userId: creatorId,
        splitId: splitId,
        splitType: 'fair',
        splitAmount: totalAmount,
        isOwner: true
      });
    }
    
    // Check for first split with friends (multiple participants)
    if (participantsCount > 1) {
      await userActionSyncService.syncFirstSplitWithFriends(
        creatorId,
        splitId,
        participantsCount
      );
    }
  } catch (rewardError) {
    logger.error('Failed to award split creation rewards', { 
      userId: creatorId, 
      splitId,
      rewardError 
    }, 'SplitRewardsHandler');
  }
}
