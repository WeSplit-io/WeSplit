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
  
  // Community Badges - Represent communities, displayed next to user name
  // These badges can only be claimed via redeem codes
  'community_wesplit': {
    badgeId: 'community_wesplit',
    title: 'WeSplit Community',
    description: 'WeSplit community member',
    icon: '👥',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/communauté/wesplit-badge.png',
    category: 'community',
    rarity: 'common',
    points: 0, // Community badges typically don't award points
    isEventBadge: true,
    isCommunityBadge: true,
    showNextToName: true, // Display next to user name
    redeemCode: 'WS24X9K'
  },
  'community_superteamfrance': {
    badgeId: 'community_superteamfrance',
    title: 'Superteam France',
    description: 'Superteam France community member',
    icon: '🇫🇷',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/communauté/superteamfrance-badge.png',
    category: 'community',
    rarity: 'rare',
    points: 0,
    isEventBadge: true,
    isCommunityBadge: true,
    showNextToName: true,
    redeemCode: 'STF24M8P'
  },
  'community_monkedao': {
    badgeId: 'community_monkedao',
    title: 'MonkeDAO',
    description: 'MonkeDAO community member',
    icon: '🐵',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/communauté/monkedao-badge.png',
    category: 'community',
    rarity: 'rare',
    points: 0,
    isEventBadge: true,
    isCommunityBadge: true,
    showNextToName: true,
    redeemCode: 'MKD24N2Q'
  },
  'community_diggers': {
    badgeId: 'community_diggers',
    title: 'Diggers',
    description: 'Diggers community member',
    icon: '⛏️',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/communauté/diggers-badge.png',
    category: 'community',
    rarity: 'rare',
    points: 0,
    isEventBadge: true,
    isCommunityBadge: true,
    showNextToName: true,
    redeemCode: 'DGR24K7R'
  },
  'event_solana_breakpoint_2025': {
    badgeId: 'event_solana_breakpoint_2025',
    title: 'Solana Breakpoint 2025',
    description: 'Solana Breakpoint 2025 attendee',
    icon: '🎯',
    iconUrl: 'gs://wesplit-35186.firebasestorage.app/badges/communauté/BP2025-badge.png',
    category: 'event',
    rarity: 'epic',
    points: 500,
    isEventBadge: true,
    isCommunityBadge: false,
    showNextToName: false,
    redeemCode: 'BP25X9K'
  },
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

/**
 * Validate badge configuration
 * Ensures all badges have valid required fields and consistent data
 * 
 * @returns Array of validation errors (empty if valid)
 */
export function validateBadgeConfig(): string[] {
  const errors: string[] = [];
  const validRarities: Array<BadgeInfo['rarity']> = ['common', 'rare', 'epic', 'legendary'];
  const validProgressMetrics: BadgeProgressMetric[] = ['split_withdrawals', 'transaction_count', 'transaction_volume'];
  
  Object.entries(BADGE_DEFINITIONS).forEach(([badgeId, badge]) => {
    // Required fields
    if (!badge.badgeId || badge.badgeId.trim() === '') {
      errors.push(`Badge '${badgeId}' has empty or missing badgeId`);
    }
    if (badge.badgeId !== badgeId) {
      errors.push(`Badge '${badgeId}' has mismatched badgeId: '${badge.badgeId}'`);
    }
    if (!badge.title || badge.title.trim() === '') {
      errors.push(`Badge '${badgeId}' has empty or missing title`);
    }
    if (!badge.description || badge.description.trim() === '') {
      errors.push(`Badge '${badgeId}' has empty or missing description`);
    }
    if (!badge.icon || badge.icon.trim() === '') {
      errors.push(`Badge '${badgeId}' has empty or missing icon`);
    }
    
    // Rarity validation
    if (badge.rarity && !validRarities.includes(badge.rarity)) {
      errors.push(`Badge '${badgeId}' has invalid rarity: '${badge.rarity}'`);
    }
    
    // Points validation
    if (badge.points !== undefined) {
      if (typeof badge.points !== 'number' || badge.points < 0) {
        errors.push(`Badge '${badgeId}' has invalid points value: ${badge.points}`);
      }
    }
    
    // Target validation (for achievement badges)
    if (badge.target !== undefined) {
      if (typeof badge.target !== 'number' || badge.target <= 0) {
        errors.push(`Badge '${badgeId}' has invalid target value: ${badge.target}`);
      }
    }
    
    // Progress metric validation
    if (badge.progressMetric && !validProgressMetrics.includes(badge.progressMetric)) {
      errors.push(`Badge '${badgeId}' has invalid progressMetric: '${badge.progressMetric}'`);
    }
    
    // Achievement badges must have target and progressMetric
    if (badge.category === 'achievement') {
      if (!badge.target || badge.target <= 0) {
        errors.push(`Achievement badge '${badgeId}' must have a valid target value`);
      }
      if (!badge.progressMetric) {
        errors.push(`Achievement badge '${badgeId}' must have a progressMetric`);
      }
    }
    
    // Event badges must have redeemCode
    if (badge.isEventBadge || badge.category === 'event' || badge.category === 'community') {
      if (!badge.redeemCode || badge.redeemCode.trim() === '') {
        errors.push(`Event/community badge '${badgeId}' must have a redeemCode`);
      }
    }
    
    // Community badges must have showNextToName
    if (badge.isCommunityBadge || badge.category === 'community') {
      if (badge.showNextToName !== true) {
        errors.push(`Community badge '${badgeId}' should have showNextToName set to true`);
      }
    }
  });
  
  return errors;
}

