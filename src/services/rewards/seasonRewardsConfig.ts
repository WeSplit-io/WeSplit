/**
 * Season-Based Rewards Configuration
 * 
 * ⚠️ IMPORTANT: This is the SINGLE SOURCE OF TRUTH for all reward values
 * 
 * To modify reward amounts or percentages:
 * 1. Edit the values in SEASON_REWARDS or PARTNERSHIP_REWARDS below
 * 2. All changes will automatically apply across the entire codebase
 * 3. No need to search for hardcoded values elsewhere
 * 
 * Reward Types:
 * - 'fixed': Award a fixed number of points (e.g., 100 points)
 * - 'percentage': Award a percentage of the transaction/split amount (e.g., 8% of $100 = 8 points)
 * 
 * Structure:
 * - Each task has rewards for all 5 seasons
 * - Partnership users get enhanced rewards from PARTNERSHIP_REWARDS
 * - Regular users get standard rewards from SEASON_REWARDS
 * 
 * Example: To change Season 1 transaction reward from 8% to 10%:
 *   transaction_1_1_request: {
 *     1: { type: 'percentage', value: 10 }, // Changed from 8 to 10
 *     ...
 *   }
 */

import { Season } from './seasonService';
import { logger } from '../analytics/loggingService';

export type RewardType = 'fixed' | 'percentage';

export interface SeasonReward {
  type: RewardType;
  value: number; // Fixed points or percentage (0-100)
}

export type TaskCategory = 'get_started' | 'referral' | 'all' | 'partnership';

export type GetStartedTask = 
  | 'export_seed_phrase'
  | 'setup_account_pp'
  | 'first_split_with_friends'
  | 'first_external_wallet_linked';

export type ReferralTask = 
  | 'invite_friends_create_account'
  | 'friend_do_first_split_over_10';

export type AllTask = 
  | 'transaction_1_1_request'
  | 'participate_fair_split'
  | 'create_fair_split_owner_bonus'
  | 'degen_split_win'
  | 'degen_split_lose';

export type PartnershipTask = 
  | 'transaction_1_1_request'
  | 'participate_fair_split'
  | 'create_fair_split_owner_bonus'
  | 'degen_split_win'
  | 'degen_split_lose';

export type RewardTask = GetStartedTask | ReferralTask | AllTask | PartnershipTask;

/**
 * Season-based rewards configuration
 * Maps each task to its reward for each season
 */
export const SEASON_REWARDS: Record<RewardTask, Record<Season, SeasonReward>> = {
  // Get Started Tasks
  export_seed_phrase: {
    1: { type: 'fixed', value: 100 },
    2: { type: 'fixed', value: 100 },
    3: { type: 'fixed', value: 100 },
    4: { type: 'fixed', value: 50 },
    5: { type: 'fixed', value: 50 }
  },
  setup_account_pp: {
    1: { type: 'fixed', value: 100 },
    2: { type: 'fixed', value: 100 },
    3: { type: 'fixed', value: 100 },
    4: { type: 'fixed', value: 50 },
    5: { type: 'fixed', value: 50 }
  },
  first_split_with_friends: {
    1: { type: 'fixed', value: 500 },
    2: { type: 'fixed', value: 500 },
    3: { type: 'fixed', value: 500 },
    4: { type: 'fixed', value: 100 },
    5: { type: 'fixed', value: 100 }
  },
  first_external_wallet_linked: {
    1: { type: 'fixed', value: 100 },
    2: { type: 'fixed', value: 100 },
    3: { type: 'fixed', value: 100 },
    4: { type: 'fixed', value: 50 },
    5: { type: 'fixed', value: 50 }
  },

  // Referral Tasks
  invite_friends_create_account: {
    1: { type: 'fixed', value: 500 },
    2: { type: 'fixed', value: 500 },
    3: { type: 'fixed', value: 500 },
    4: { type: 'fixed', value: 100 },
    5: { type: 'fixed', value: 100 }
  },
  friend_do_first_split_over_10: {
    1: { type: 'fixed', value: 1000 },
    2: { type: 'fixed', value: 1000 },
    3: { type: 'fixed', value: 1000 },
    4: { type: 'fixed', value: 500 },
    5: { type: 'fixed', value: 500 }
  },

  // All Tasks (Regular Users)
  transaction_1_1_request: {
    1: { type: 'percentage', value: 8 },
    2: { type: 'percentage', value: 7 },
    3: { type: 'percentage', value: 6 },
    4: { type: 'percentage', value: 5 },
    5: { type: 'percentage', value: 4 }
  },
  participate_fair_split: {
    1: { type: 'percentage', value: 8 },
    2: { type: 'percentage', value: 7 },
    3: { type: 'percentage', value: 6 },
    4: { type: 'percentage', value: 5 },
    5: { type: 'percentage', value: 4 }
  },
  create_fair_split_owner_bonus: {
    1: { type: 'percentage', value: 10 },
    2: { type: 'fixed', value: 50 },
    3: { type: 'fixed', value: 50 },
    4: { type: 'fixed', value: 50 },
    5: { type: 'fixed', value: 50 }
  },
  degen_split_win: {
    1: { type: 'percentage', value: 8 },
    2: { type: 'percentage', value: 7 },
    3: { type: 'percentage', value: 6 },
    4: { type: 'percentage', value: 5 },
    5: { type: 'percentage', value: 4 }
  },
  degen_split_lose: {
    1: { type: 'percentage', value: 10 },
    2: { type: 'fixed', value: 50 },
    3: { type: 'fixed', value: 50 },
    4: { type: 'fixed', value: 50 },
    5: { type: 'fixed', value: 50 }
  }
};

/**
 * Partnership rewards (same tasks but different values)
 */
export const PARTNERSHIP_REWARDS: Record<PartnershipTask, Record<Season, SeasonReward>> = {
  transaction_1_1_request: {
    1: { type: 'percentage', value: 15 },
    2: { type: 'percentage', value: 14 },
    3: { type: 'percentage', value: 12 },
    4: { type: 'percentage', value: 10 },
    5: { type: 'percentage', value: 8 }
  },
  participate_fair_split: {
    1: { type: 'percentage', value: 15 },
    2: { type: 'percentage', value: 14 },
    3: { type: 'percentage', value: 12 },
    4: { type: 'percentage', value: 10 },
    5: { type: 'percentage', value: 8 }
  },
  create_fair_split_owner_bonus: {
    1: { type: 'percentage', value: 20 },
    2: { type: 'fixed', value: 100 },
    3: { type: 'fixed', value: 100 },
    4: { type: 'fixed', value: 50 },
    5: { type: 'fixed', value: 50 }
  },
  degen_split_win: {
    1: { type: 'percentage', value: 15 },
    2: { type: 'percentage', value: 14 },
    3: { type: 'percentage', value: 12 },
    4: { type: 'percentage', value: 10 },
    5: { type: 'percentage', value: 8 }
  },
  degen_split_lose: {
    1: { type: 'percentage', value: 20 },
    2: { type: 'fixed', value: 100 },
    3: { type: 'fixed', value: 100 },
    4: { type: 'fixed', value: 50 },
    5: { type: 'fixed', value: 50 }
  }
};

/**
 * Get reward for a task in a specific season
 * 
 * This is the ONLY function that should be used to get reward values.
 * All reward lookups should go through this function to ensure consistency.
 * 
 * @param task - The task type (e.g., 'transaction_1_1_request')
 * @param season - The season number (1-5)
 * @param isPartnership - Whether the user has partnership status
 * @returns The reward configuration for the task/season
 */
export function getSeasonReward(
  task: RewardTask,
  season: Season,
  isPartnership: boolean = false
): SeasonReward {
  // Validate season
  if (season < 1 || season > 5) {
    logger.warn('Invalid season, defaulting to season 1', { season }, 'SeasonRewardsConfig');
    season = 1;
  }

  // Check if task supports partnership rewards
  const partnershipTasks: PartnershipTask[] = [
    'transaction_1_1_request',
    'participate_fair_split',
    'create_fair_split_owner_bonus',
    'degen_split_win',
    'degen_split_lose'
  ];

  if (isPartnership && partnershipTasks.includes(task as PartnershipTask)) {
    return PARTNERSHIP_REWARDS[task as PartnershipTask][season];
  }
  
  // Validate task exists
  if (!SEASON_REWARDS[task]) {
    logger.error('Invalid task type', { task }, 'SeasonRewardsConfig');
    throw new Error(`Invalid task type: ${task}`);
  }
  
  return SEASON_REWARDS[task][season];
}

/**
 * Calculate points for a reward
 * 
 * This function handles both fixed and percentage-based rewards.
 * 
 * @param reward The reward configuration (from getSeasonReward)
 * @param amount The transaction/split amount (required for percentage-based rewards)
 * @returns The calculated points (always >= 0)
 * 
 * @example
 * // Fixed reward
 * calculateRewardPoints({ type: 'fixed', value: 100 }, 0) // Returns 100
 * 
 * // Percentage reward
 * calculateRewardPoints({ type: 'percentage', value: 8 }, 100) // Returns 8 (8% of 100)
 * calculateRewardPoints({ type: 'percentage', value: 8 }, 50) // Returns 4 (8% of 50)
 */
export function calculateRewardPoints(reward: SeasonReward, amount: number = 0): number {
  if (reward.type === 'fixed') {
    // Fixed rewards don't depend on amount
    return Math.max(0, reward.value);
  } else if (reward.type === 'percentage') {
    // Percentage-based: calculate percentage of amount
    if (amount < 0) {
      logger.warn('Negative amount provided for percentage reward', { amount, reward }, 'SeasonRewardsConfig');
      return 0;
    }
    const points = Math.round(amount * (reward.value / 100));
    return Math.max(0, points); // Ensure non-negative
  } else {
    logger.error('Invalid reward type', { reward }, 'SeasonRewardsConfig');
    return 0;
  }
}

/**
 * Get all rewards for a specific season
 * Useful for displaying season rewards in UI or admin panels
 * 
 * @param season The season number (1-5)
 * @param isPartnership Whether to include partnership rewards
 * @returns Object with all task rewards for the season
 */
export function getAllSeasonRewards(season: Season, isPartnership: boolean = false): Record<string, SeasonReward> {
  const rewards: Record<string, SeasonReward> = {};
  
  // Get all regular rewards
  Object.keys(SEASON_REWARDS).forEach(task => {
    rewards[task] = SEASON_REWARDS[task as RewardTask][season];
  });
  
  // Override with partnership rewards if applicable
  if (isPartnership) {
    Object.keys(PARTNERSHIP_REWARDS).forEach(task => {
      rewards[task] = PARTNERSHIP_REWARDS[task as PartnershipTask][season];
    });
  }
  
  return rewards;
}

/**
 * Validate reward configuration
 * Ensures all seasons have valid rewards for all tasks
 * 
 * @returns Array of validation errors (empty if valid)
 */
export function validateRewardConfig(): string[] {
  const errors: string[] = [];
  const seasons: Season[] = [1, 2, 3, 4, 5];
  
  // Validate SEASON_REWARDS
  Object.keys(SEASON_REWARDS).forEach(task => {
    seasons.forEach(season => {
      const reward = SEASON_REWARDS[task as RewardTask][season];
      if (!reward) {
        errors.push(`Missing reward for task '${task}' in season ${season}`);
      } else if (reward.type !== 'fixed' && reward.type !== 'percentage') {
        errors.push(`Invalid reward type for task '${task}' in season ${season}: ${reward.type}`);
      } else if (reward.value < 0) {
        errors.push(`Negative reward value for task '${task}' in season ${season}: ${reward.value}`);
      } else if (reward.type === 'percentage' && reward.value > 100) {
        errors.push(`Percentage reward > 100% for task '${task}' in season ${season}: ${reward.value}%`);
      }
    });
  });
  
  // Validate PARTNERSHIP_REWARDS
  Object.keys(PARTNERSHIP_REWARDS).forEach(task => {
    seasons.forEach(season => {
      const reward = PARTNERSHIP_REWARDS[task as PartnershipTask][season];
      if (!reward) {
        errors.push(`Missing partnership reward for task '${task}' in season ${season}`);
      } else if (reward.type !== 'fixed' && reward.type !== 'percentage') {
        errors.push(`Invalid partnership reward type for task '${task}' in season ${season}: ${reward.type}`);
      } else if (reward.value < 0) {
        errors.push(`Negative partnership reward value for task '${task}' in season ${season}: ${reward.value}`);
      } else if (reward.type === 'percentage' && reward.value > 100) {
        errors.push(`Partnership percentage reward > 100% for task '${task}' in season ${season}: ${reward.value}%`);
      }
    });
  });
  
  return errors;
}

