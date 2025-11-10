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

export interface BadgeInfo {
  badgeId: string;
  title: string;
  description: string;
  icon: string;
  category?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
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
  // Add more badges here as they are created
  // Example:
  // 'first_transaction': {
  //   badgeId: 'first_transaction',
  //   title: 'First Transaction',
  //   description: 'Completed your first transaction',
  //   icon: '💸',
  //   category: 'achievement',
  //   rarity: 'common'
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

