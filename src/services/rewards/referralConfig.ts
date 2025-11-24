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

/**
 * Validate referral configuration
 * Ensures all referral rewards have valid required fields and consistent data
 * 
 * @returns Array of validation errors (empty if valid)
 */
export function validateReferralConfig(): string[] {
  const errors: string[] = [];
  const validTriggers: ReferralTrigger[] = ['account_created', 'first_split', 'first_transaction', 'milestone_reached', 'custom'];
  const rewardIds = new Set<string>();
  
  REFERRAL_REWARDS.forEach((reward, index) => {
    // Required fields
    if (!reward.rewardId || reward.rewardId.trim() === '') {
      errors.push(`Referral reward at index ${index} has empty or missing rewardId`);
    } else {
      // Check for duplicate reward IDs
      if (rewardIds.has(reward.rewardId)) {
        errors.push(`Duplicate referral rewardId: '${reward.rewardId}'`);
      }
      rewardIds.add(reward.rewardId);
    }
    
    if (!reward.taskType || reward.taskType.trim() === '') {
      errors.push(`Referral reward '${reward.rewardId}' has empty or missing taskType`);
    }
    
    if (!reward.trigger) {
      errors.push(`Referral reward '${reward.rewardId}' has missing trigger`);
    } else if (!validTriggers.includes(reward.trigger)) {
      errors.push(`Referral reward '${reward.rewardId}' has invalid trigger: '${reward.trigger}'`);
    }
    
    if (!reward.description || reward.description.trim() === '') {
      errors.push(`Referral reward '${reward.rewardId}' has empty or missing description`);
    }
    
    if (typeof reward.enabled !== 'boolean') {
      errors.push(`Referral reward '${reward.rewardId}' has invalid enabled value: ${reward.enabled}`);
    }
    
    // Priority validation
    if (reward.priority !== undefined) {
      if (typeof reward.priority !== 'number' || reward.priority < 0) {
        errors.push(`Referral reward '${reward.rewardId}' has invalid priority: ${reward.priority}`);
      }
    }
    
    // Condition validation
    if (reward.condition) {
      if (reward.condition.minSplitAmount !== undefined) {
        if (typeof reward.condition.minSplitAmount !== 'number' || reward.condition.minSplitAmount < 0) {
          errors.push(`Referral reward '${reward.rewardId}' has invalid minSplitAmount: ${reward.condition.minSplitAmount}`);
        }
      }
      if (reward.condition.minTransactionAmount !== undefined) {
        if (typeof reward.condition.minTransactionAmount !== 'number' || reward.condition.minTransactionAmount < 0) {
          errors.push(`Referral reward '${reward.rewardId}' has invalid minTransactionAmount: ${reward.condition.minTransactionAmount}`);
        }
      }
      if (reward.condition.minPointsEarned !== undefined) {
        if (typeof reward.condition.minPointsEarned !== 'number' || reward.condition.minPointsEarned < 0) {
          errors.push(`Referral reward '${reward.rewardId}' has invalid minPointsEarned: ${reward.condition.minPointsEarned}`);
        }
      }
    }
    
    // Trigger-specific validation
    if (reward.trigger === 'first_split' && reward.condition?.minSplitAmount === undefined) {
      errors.push(`Referral reward '${reward.rewardId}' with trigger 'first_split' should have minSplitAmount condition`);
    }
    if (reward.trigger === 'first_transaction' && reward.condition?.minTransactionAmount === undefined) {
      errors.push(`Referral reward '${reward.rewardId}' with trigger 'first_transaction' should have minTransactionAmount condition`);
    }
  });
  
  return errors;
}

