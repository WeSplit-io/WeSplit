/**
 * Reward System Types
 * Defines types for points, quests, and leaderboard functionality
 */

export interface Quest {
  id: string;
  type: 'profile_image' | 'first_transaction' | 'refer_friend' | 'complete_onboarding' | 'add_first_contact' | 'create_first_split' 
    | 'export_seed_phrase' | 'setup_account_pp' | 'first_split_with_friends' | 'first_external_wallet_linked'
    | 'invite_friends_create_account' | 'friend_do_first_split_over_10';
  title: string;
  description: string;
  points: number;
  completed: boolean;
  completed_at?: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  amount: number;
  source: 'transaction_reward' | 'quest_completion' | 'admin_adjustment' | 'season_reward' | 'referral_reward';
  source_id?: string; // transaction_id or quest_id
  description: string;
  created_at: string;
  season?: number; // Season when points were awarded
  task_type?: string; // Task type that triggered the reward
}

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar?: string;
  points: number;
  rank: number;
  badges?: string[];
  active_badge?: string;
  profile_assets?: string[];
  active_profile_asset?: string;
}

export interface PointsAwardResult {
  success: boolean;
  pointsAwarded: number;
  totalPoints: number;
  error?: string;
}

export interface QuestCompletionResult {
  success: boolean;
  questId: string;
  pointsAwarded: number;
  totalPoints: number;
  error?: string;
}

/**
 * Christmas Calendar Types
 * Types for the advent calendar reward system (Dec 1-24)
 */

export type GiftType = 'points' | 'badge' | 'asset';

export interface PointsGift {
  type: 'points';
  amount: number;
}

export interface BadgeGift {
  type: 'badge';
  badgeId: string;
  title: string;
  description: string;
  icon?: string; // URL or icon identifier
}

export interface AssetGift {
  type: 'asset';
  assetId: string;
  assetType: 'profile_image' | 'wallet_background';
  assetUrl: string;
  name: string;
  description?: string;
}

export type Gift = PointsGift | BadgeGift | AssetGift;

export interface ChristmasCalendarGift {
  day: number; // 1-24
  gift: Gift;
  title: string; // Display title for the gift
  description?: string; // Optional description
}

export interface ChristmasCalendarDay {
  day: number; // 1-24
  claimed: boolean;
  claimed_at?: string; // ISO timestamp
  gift_id?: string; // Reference to gift config
  gift_data?: Gift; // Snapshot of gift at claim time
}

export interface ChristmasCalendarClaim {
  id: string;
  user_id: string;
  year: number;
  day: number;
  gift: Gift;
  claimed_at: string; // ISO timestamp
  timezone?: string; // User's timezone at claim time
}

export interface ChristmasCalendarStatus {
  year: number;
  days: ChristmasCalendarDay[]; // Array of 24 days
  totalClaimed: number;
  canClaimToday: boolean;
  todayDay?: number; // Current day (1-24) or null if outside calendar period
}

