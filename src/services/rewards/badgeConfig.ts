/**
 * Badge Configuration Service
 * Centralized configuration for all user badges
 * 
 * This file defines all badges available in the app.
 * Badges can be easily edited here by the design team.
 * 
 * Badge Structure:
 * - badgeId: Unique identifier for the badge
 * - title: Display name for the badge
 * - description: Description of what the badge represents
 * - icon: Emoji or icon identifier for the badge
 * - category: Category of the badge (e.g., 'christmas', 'achievement', 'special')
 * - rarity: Rarity level (e.g., 'common', 'rare', 'epic', 'legendary')
 */

export type BadgeProgressMetric = 'split_withdrawals' | 'transaction_count' | 'transaction_volume';

export interface BadgeInfo {
  badgeId: string;
  title: string;
  description: string;
  icon: string; // Emoji or icon identifier
  iconUrl?: string; // Optional image URL for badge icon
  category?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  points?: number; // Points awarded when badge is claimed
  target?: number; // Target value for progress-based badges
  isEventBadge?: boolean; // True if badge is claimable via redeem code/event
  redeemCode?: string; // Optional redeem code for event badges
  isCommunityBadge?: boolean; // True if this is a community badge (displayed next to name)
  showNextToName?: boolean; // True if badge should be displayed next to user name/profile picture
  progressMetric?: BadgeProgressMetric; // Metric used to compute progress
  progressLabel?: string; // Optional label for progress visualization
}

/**
 * Badge Definitions
 * All badges available in the app
 */
export const BADGE_DEFINITIONS: Record<string, BadgeInfo> = {
  // Christmas Calendar 2024 Badges
  'early_bird_2024': {
    badgeId: 'early_bird_2024',
    title: 'Early Bird',
    description: 'Started the Christmas calendar early',
    icon: '🐦',
    category: 'christmas',
    rarity: 'common'
  },
  'santas_helper_2024': {
    badgeId: 'santas_helper_2024',
    title: "Santa's Helper",
    description: 'Active participant in the Christmas calendar',
    icon: '🎅',
    category: 'christmas',
    rarity: 'common'
  },
  'gingerbread_2024': {
    badgeId: 'gingerbread_2024',
    title: 'Gingerbread',
    description: 'Sweet holiday spirit',
    icon: '🍪',
    category: 'christmas',
    rarity: 'common'
  },
  'elf_2024': {
    badgeId: 'elf_2024',
    title: 'Elf',
    description: 'Hardworking holiday helper',
    icon: '🧝',
    category: 'christmas',
    rarity: 'rare'
  },
  'snowflake_2024': {
    badgeId: 'snowflake_2024',
    title: 'Snowflake',
    description: 'One of a kind',
    icon: '❄️',
    category: 'christmas',
    rarity: 'rare'
  },
  'champion_2024': {
    badgeId: 'champion_2024',
    title: 'Holiday Champion',
    description: 'Dedicated calendar participant',
    icon: '🏆',
    category: 'christmas',
    rarity: 'epic'
  },
  'eve_eve_2024': {
    badgeId: 'eve_eve_2024',
    title: 'Christmas Eve Eve',
    description: 'Almost there!',
    icon: '🎁',
    category: 'christmas',
    rarity: 'rare'
  },
  // Achievement Badges - Splits Withdrawn (Bronze, Silver, Gold, Emerald)
  'splits_withdrawn_50': {
    badgeId: 'splits_withdrawn_50',
    title: 'Bronze Split Badge',
    description: 'Complete 50 total splits',
    icon: '50',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/split-bronze.png',
    category: 'achievement',
    rarity: 'common',
    points: 50,
    target: 50,
    progressMetric: 'split_withdrawals',
    progressLabel: 'TOTAL SPLITS'
  },
  'splits_withdrawn_500': {
    badgeId: 'splits_withdrawn_500',
    title: 'Silver Split Badge',
    description: 'Complete 500 total splits',
    icon: '500',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/split-silver.png',
    category: 'achievement',
    rarity: 'rare',
    points: 500,
    target: 500,
    progressMetric: 'split_withdrawals',
    progressLabel: 'TOTAL SPLITS'
  },
  'splits_withdrawn_2500': {
    badgeId: 'splits_withdrawn_2500',
    title: 'Gold Split Badge',
    description: 'Complete 2,500 total splits',
    icon: '2500',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/split-gold.png',
    category: 'achievement',
    rarity: 'epic',
    points: 2500,
    target: 2500,
    progressMetric: 'split_withdrawals',
    progressLabel: 'TOTAL SPLITS'
  },
  'splits_withdrawn_10000': {
    badgeId: 'splits_withdrawn_10000',
    title: 'Emerald Split Badge',
    description: 'Complete 10,000 total splits',
    icon: '10000',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/split-emerald.png',
    category: 'achievement',
    rarity: 'legendary',
    points: 10000,
    target: 10000,
    progressMetric: 'split_withdrawals',
    progressLabel: 'TOTAL SPLITS'
  },

  // Transaction Count Badges (Bronze, Silver, Gold, Emerald)
  'transactions_completed_50': {
    badgeId: 'transactions_completed_50',
    title: 'Bronze Transaction Badge',
    description: 'Complete 50 total transactions',
    icon: '50',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/transaction-bronze.png',
    category: 'achievement',
    rarity: 'common',
    points: 50,
    target: 50,
    progressMetric: 'transaction_count',
    progressLabel: 'TOTAL TRANSACTIONS'
  },
  'transactions_completed_500': {
    badgeId: 'transactions_completed_500',
    title: 'Silver Transaction Badge',
    description: 'Complete 500 total transactions',
    icon: '500',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/transaction-silver.png',
    category: 'achievement',
    rarity: 'rare',
    points: 500,
    target: 500,
    progressMetric: 'transaction_count',
    progressLabel: 'TOTAL TRANSACTIONS'
  },
  'transactions_completed_2500': {
    badgeId: 'transactions_completed_2500',
    title: 'Gold Transaction Badge',
    description: 'Complete 2,500 total transactions',
    icon: '2500',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/transaction-gold.png',
    category: 'achievement',
    rarity: 'epic',
    points: 2500,
    target: 2500,
    progressMetric: 'transaction_count',
    progressLabel: 'TOTAL TRANSACTIONS'
  },
  'transactions_completed_10000': {
    badgeId: 'transactions_completed_10000',
    title: 'Emerald Transaction Badge',
    description: 'Complete 10,000 total transactions',
    icon: '10000',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/transaction-emerald.png',
    category: 'achievement',
    rarity: 'legendary',
    points: 10000,
    target: 10000,
    progressMetric: 'transaction_count',
    progressLabel: 'TOTAL TRANSACTIONS'
  },

  // Transaction Volume Badges (Bronze, Silver, Gold, Emerald)
  'transaction_volume_50': {
    badgeId: 'transaction_volume_50',
    title: 'Bronze Volume Badge',
    description: 'Move $50 through WeSplit',
    icon: '50',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/volume-bronze.png',
    category: 'achievement',
    rarity: 'common',
    points: 50,
    target: 50,
    progressMetric: 'transaction_volume',
    progressLabel: 'TOTAL VOLUME ($)'
  },
  'transaction_volume_500': {
    badgeId: 'transaction_volume_500',
    title: 'Silver Volume Badge',
    description: 'Move $500 through WeSplit',
    icon: '500',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/volume-silver.png',
    category: 'achievement',
    rarity: 'rare',
    points: 500,
    target: 500,
    progressMetric: 'transaction_volume',
    progressLabel: 'TOTAL VOLUME ($)'
  },
  'transaction_volume_2500': {
    badgeId: 'transaction_volume_2500',
    title: 'Gold Volume Badge',
    description: 'Move $2,500 through WeSplit',
    icon: '2500',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/volume-gold.png',
    category: 'achievement',
    rarity: 'epic',
    points: 2500,
    target: 2500,
    progressMetric: 'transaction_volume',
    progressLabel: 'TOTAL VOLUME ($)'
  },
  'transaction_volume_10000': {
    badgeId: 'transaction_volume_10000',
    title: 'Emerald Volume Badge',
    description: 'Move $10,000 through WeSplit',
    icon: '10000',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/volume-emerald.png',
    category: 'achievement',
    rarity: 'legendary',
    points: 10000,
    target: 10000,
    progressMetric: 'transaction_volume',
    progressLabel: 'TOTAL VOLUME ($)'
  },

  // Event Badges - Can be claimed via redeem codes
  // Add event badges here as needed
  // Example:
  // 'event_summer_2024': {
  //   badgeId: 'event_summer_2024',
  //   title: 'Summer Event 2024',
  //   description: 'Participated in Summer Event',
  //   icon: '☀️',
  //   category: 'event',
  //   rarity: 'rare',
  //   points: 200,
  //   isEventBadge: true,
  //   redeemCode: 'SUMMER2024'
  // },
  
  // Community Badges - Represent communities, displayed next to user name
  // These badges can only be claimed via redeem codes
  // Example community badges:
  // 'community_solana_breakpoint_2025': {
  //   badgeId: 'community_solana_breakpoint_2025',
  //   title: 'Solana Breakpoint 2025',
  //   description: 'Solana Breakpoint 2025 Abu Dhabi',
  //   icon: '🕌',
  //   iconUrl: 'https://example.com/breakpoint-badge.png',
  //   category: 'community',
  //   rarity: 'rare',
  //   points: 0, // Community badges typically don't award points
  //   isEventBadge: true,
  //   isCommunityBadge: true,
  //   showNextToName: true, // Display next to user name
  //   redeemCode: 'BREAKPOINT2025'
  // },
};

/**
 * Get badge information by badge ID
 * @param badgeId Badge identifier
 * @returns Badge information or null if not found
 */
export function getBadgeInfo(badgeId: string): BadgeInfo | null {
  return BADGE_DEFINITIONS[badgeId] || null;
}

/**
 * Get all badges
 * @returns Array of all badge definitions
 */
export function getAllBadges(): BadgeInfo[] {
  return Object.values(BADGE_DEFINITIONS);
}

/**
 * Get badges by category
 * @param category Badge category
 * @returns Array of badges in the category
 */
export function getBadgesByCategory(category: string): BadgeInfo[] {
  return Object.values(BADGE_DEFINITIONS).filter(
    badge => badge.category === category
  );
}

/**
 * Get badges by rarity
 * @param rarity Badge rarity level
 * @returns Array of badges with the rarity
 */
export function getBadgesByRarity(rarity: BadgeInfo['rarity']): BadgeInfo[] {
  return Object.values(BADGE_DEFINITIONS).filter(
    badge => badge.rarity === rarity
  );
}

/**
 * Check if a badge exists
 * @param badgeId Badge identifier
 * @returns True if badge exists, false otherwise
 */
export function badgeExists(badgeId: string): boolean {
  return badgeId in BADGE_DEFINITIONS;
}

