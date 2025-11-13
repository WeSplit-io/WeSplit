/**
 * Referral System Configuration
 * 
 * ⚠️ IMPORTANT: This is the SINGLE SOURCE OF TRUTH for all referral rewards
 * 
 * To add or modify referral rewards:
 * 1. Edit the REFERRAL_REWARDS array below
 * 2. Add new reward types to seasonRewardsConfig.ts if needed
 * 3. Update referralService.ts to handle new triggers
 * 
 * This configuration makes it easy to:
 * - Add new referral reward types
 * - Enable/disable specific rewards
 * - Configure reward conditions
 * - Track referral milestones
 */

import { RewardTask } from './seasonRewardsConfig';

/**
 * Referral reward trigger types
 */
export type ReferralTrigger = 
  | 'account_created'      // Friend creates account
  | 'first_split'          // Friend does first split
  | 'first_transaction'    // Friend does first transaction
  | 'milestone_reached'    // Friend reaches milestone
  | 'custom';              // Custom trigger

/**
 * Referral reward condition
 */
export interface ReferralRewardCondition {
  minSplitAmount?: number;        // Minimum split amount (e.g., 10 for $10+)
  minTransactionAmount?: number;  // Minimum transaction amount
  minPointsEarned?: number;       // Minimum points friend must earn
  // Add more conditions as needed
}

/**
 * Referral reward configuration
 */
export interface ReferralRewardConfig {
  /** Unique reward identifier */
  rewardId: string;
  
  /** Task type from seasonRewardsConfig.ts */
  taskType: RewardTask;
  
  /** Trigger that activates this reward */
  trigger: ReferralTrigger;
  
  /** Conditions that must be met (optional) */
  condition?: ReferralRewardCondition;
  
  /** Human-readable description */
  description: string;
  
  /** Whether this reward is currently enabled */
  enabled: boolean;
  
  /** Priority (lower = higher priority, for multiple rewards) */
  priority?: number;
}

/**
 * Referral Rewards Configuration
 * 
 * All referral rewards are defined here for easy maintenance.
 * To add a new referral reward:
 * 1. Add the reward task to seasonRewardsConfig.ts (if new)
 * 2. Add the reward config here
 * 3. Update referralService.ts to handle the new trigger
 */
export const REFERRAL_REWARDS: ReferralRewardConfig[] = [
  {
    rewardId: 'invite_friend_account',
    taskType: 'invite_friends_create_account',
    trigger: 'account_created',
    description: 'Friend creates account',
    enabled: true,
    priority: 1
  },
  {
    rewardId: 'friend_first_split',
    taskType: 'friend_do_first_split_over_10',
    trigger: 'first_split',
    condition: {
      minSplitAmount: 10
    },
    description: 'Friend does first split > $10',
    enabled: true,
    priority: 2
  }
  // Add more referral rewards here as needed
  // Example:
  // {
  //   rewardId: 'friend_first_transaction',
  //   taskType: 'friend_first_transaction', // Add to seasonRewardsConfig.ts first
  //   trigger: 'first_transaction',
  //   condition: {
  //     minTransactionAmount: 5
  //   },
  //   description: 'Friend does first transaction > $5',
  //   enabled: true,
  //   priority: 3
  // }
];

/**
 * Get referral reward configuration by reward ID
 * @param rewardId Reward identifier
 * @returns Reward configuration or null if not found
 */
export function getReferralRewardConfig(rewardId: string): ReferralRewardConfig | null {
  return REFERRAL_REWARDS.find(r => r.rewardId === rewardId && r.enabled) || null;
}

/**
 * Get referral reward configuration by trigger
 * @param trigger Trigger type
 * @returns Array of reward configurations for the trigger
 */
export function getReferralRewardsByTrigger(trigger: ReferralTrigger): ReferralRewardConfig[] {
  return REFERRAL_REWARDS
    .filter(r => r.trigger === trigger && r.enabled)
    .sort((a, b) => (a.priority || 999) - (b.priority || 999));
}

/**
 * Get all enabled referral rewards
 * @returns Array of all enabled referral reward configurations
 */
export function getAllReferralRewards(): ReferralRewardConfig[] {
  return REFERRAL_REWARDS.filter(r => r.enabled);
}

/**
 * Check if a referral reward exists and is enabled
 * @param rewardId Reward identifier
 * @returns True if reward exists and is enabled
 */
export function referralRewardExists(rewardId: string): boolean {
  return REFERRAL_REWARDS.some(r => r.rewardId === rewardId && r.enabled);
}

