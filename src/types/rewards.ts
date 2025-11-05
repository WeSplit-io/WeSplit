/**
 * Reward System Types
 * Defines types for points, quests, and leaderboard functionality
 */

export interface Quest {
  id: string;
  type: 'profile_image' | 'first_transaction' | 'refer_friend' | 'complete_onboarding' | 'add_first_contact' | 'create_first_split';
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
  source: 'transaction_reward' | 'quest_completion' | 'admin_adjustment';
  source_id?: string; // transaction_id or quest_id
  description: string;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar?: string;
  points: number;
  rank: number;
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

