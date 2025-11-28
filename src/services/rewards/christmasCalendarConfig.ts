/**
 * Christmas Calendar Configuration
 * Centralized configuration for the advent calendar gift system (December 1-24)
 * 
 * This file defines all gifts for the Christmas calendar.
 * Gifts can be easily edited here by the design team.
 * 
 * Gift Types:
 * - points: Awards points to the user
 * - badge: Awards a badge/title for the user profile
 * - asset: Awards an asset (profile image or wallet background)
 */

import { ChristmasCalendarGift } from '../../types/rewards';
import { getAssetInfo } from './assetConfig';
import { getBadgeInfo } from './badgeConfig';

const getAssetPreviewUrl = (assetId: string): string | undefined => {
  return getAssetInfo(assetId)?.url || undefined;
};

const getBadgeIconUrl = (badgeId: string): string | undefined => {
  return getBadgeInfo(badgeId)?.iconUrl || undefined;
};

/**
 * Christmas Calendar Gift Definitions for 2024
 * Each day (1-24) has a gift that users can claim
 * 
 * To edit gifts, simply modify the gift object for each day below.
 * The structure supports:
 * - Points: { type: 'points', amount: number }
 * - Badges: { type: 'badge', badgeId: string, title: string, description: string, icon?: string }
 * - Assets: { type: 'asset', assetId: string, assetType: 'profile_image' | 'wallet_background' | 'profile_border', assetUrl: string, name: string }
 */
export const CHRISTMAS_CALENDAR_2024: ChristmasCalendarGift[] = [
  // Day 1 - December 1st
  {
    day: 1,
    title: 'Welcome to Christmas! 🎄',
    description: 'Start your journey with some bonus points',
    gift: {
      type: 'points',
      amount: 50
    }
  },
  
  // Day 2 - December 2nd
  {
    day: 2,
    title: 'Early Bird Badge',
    description: 'You\'re an early bird!',
    gift: {
      type: 'badge',
      badgeId: 'early_bird_2024',
      title: 'Early Bird',
      description: 'Started the Christmas calendar early',
      icon: '🐦',
      iconUrl: getBadgeIconUrl('early_bird_2024')
    }
  },
  
  // Day 3 - December 3rd
  {
    day: 3,
    title: 'Holiday Points',
    description: 'More points to boost your score',
    gift: {
      type: 'points',
      amount: 75
    }
  },
  
  // Day 4 - December 4th
  {
    day: 4,
    title: 'Festive Profile Image',
    description: 'A special profile image for the holidays',
    gift: {
      type: 'asset',
      assetId: 'profile_snowflake_2024',
      assetType: 'profile_image',
      assetUrl: getAssetPreviewUrl('profile_snowflake_2024'),
      name: 'Snowflake Profile',
      description: 'A festive snowflake profile image'
    }
  },
  
  // Day 5 - December 5th
  {
    day: 5,
    title: 'Points Bonus',
    description: 'Keep the momentum going!',
    gift: {
      type: 'points',
      amount: 100
    }
  },
  
  // Day 6 - December 6th
  {
    day: 6,
    title: 'Santa\'s Helper Badge',
    description: 'You\'re helping spread the holiday cheer!',
    gift: {
      type: 'badge',
      badgeId: 'santas_helper_2024',
      title: 'Santa\'s Helper',
      description: 'Active participant in the Christmas calendar',
      icon: '🎅',
      iconUrl: getBadgeIconUrl('santas_helper_2024')
    }
  },
  
  // Day 7 - December 7th
  {
    day: 7,
    title: 'Holiday Wallet Background',
    description: 'Decorate your wallet with a festive background',
    gift: {
      type: 'asset',
      assetId: 'wallet_winter_2024',
      assetType: 'wallet_background',
      assetUrl: getAssetPreviewUrl('wallet_winter_2024'),
      name: 'Winter Wonderland',
      description: 'A beautiful winter scene for your wallet'
    }
  },
  
  // Day 8 - December 8th
  {
    day: 8,
    title: 'Ice Crystal Border',
    description: 'A sparkling ice crystal frame for your avatar',
    gift: {
      type: 'asset',
      assetId: 'profile_border_ice_crystal_2024',
      assetType: 'profile_border',
      assetUrl: getAssetPreviewUrl('profile_border_ice_crystal_2024'),
      name: 'Ice Crystal Border',
      description: 'Sparkling ice crystal border for a frosty look'
    }
  },
  
  // Day 9 - December 9th
  {
    day: 9,
    title: 'Gingerbread Badge',
    description: 'Sweet as a cookie!',
    gift: {
      type: 'badge',
      badgeId: 'gingerbread_2024',
      title: 'Gingerbread',
      description: 'Sweet holiday spirit',
      icon: '🍪',
      iconUrl: getBadgeIconUrl('gingerbread_2024')
    }
  },
  
  // Day 10 - December 10th
  {
    day: 10,
    title: 'Biscuit Bliss Background',
    description: 'A festive gingerbread treat for your balance card',
    gift: {
      type: 'asset',
      assetId: 'wallet_biscuit_2024',
      assetType: 'wallet_background',
      assetUrl: getAssetPreviewUrl('wallet_biscuit_2024'),
      name: 'Biscuit Bliss',
      description: 'Festive gingerbread cookie background for your balance card'
    }
  },
  
  // Day 11 - December 11th
  {
    day: 11,
    title: 'Festive Profile Image',
    description: 'Another holiday profile option',
    gift: {
      type: 'asset',
      assetId: 'profile_reindeer_2024',
      assetType: 'profile_image',
      assetUrl: getAssetPreviewUrl('profile_reindeer_2024'),
      name: 'Reindeer Profile',
      description: 'A cute reindeer profile image'
    }
  },
  
  // Day 12 - December 12th
  {
    day: 12,
    title: 'Midnight Frost Border',
    description: 'Unlock a frosted midnight profile frame',
    gift: {
      type: 'asset',
      assetId: 'profile_border_midnight_2024',
      assetType: 'profile_border',
      assetUrl: getAssetPreviewUrl('profile_border_midnight_2024'),
      name: 'Midnight Frost Border',
      description: 'Icy accents for the perfect midnight look'
    }
  },
  
  // Day 13 - December 13th
  {
    day: 13,
    title: 'Elf Badge',
    description: 'You\'re working hard like an elf!',
    gift: {
      type: 'badge',
      badgeId: 'elf_2024',
      title: 'Elf',
      description: 'Hardworking holiday helper',
      icon: '🧝',
      iconUrl: getBadgeIconUrl('elf_2024')
    }
  },
  
  // Day 14 - December 14th
  {
    day: 14,
    title: 'Holiday Wallet Background',
    description: 'Another beautiful background',
    gift: {
      type: 'asset',
      assetId: 'wallet_christmas_2024',
      assetType: 'wallet_background',
      assetUrl: getAssetPreviewUrl('wallet_christmas_2024'),
      name: 'Christmas Magic',
      description: 'A magical Christmas scene'
    }
  },
  
  // Day 15 - December 15th
  {
    day: 15,
    title: 'Aurora Profile Border',
    description: 'Glow with a premium aurora frame',
    gift: {
      type: 'asset',
      assetId: 'profile_border_aurora_2024',
      assetType: 'profile_border',
      assetUrl: getAssetPreviewUrl('profile_border_aurora_2024'),
      name: 'Aurora Border',
      description: 'A glowing aurora halo for your profile picture'
    }
  },
  
  // Day 16 - December 16th
  {
    day: 16,
    title: 'Snowflake Badge',
    description: 'Unique as a snowflake',
    gift: {
      type: 'badge',
      badgeId: 'snowflake_2024',
      title: 'Snowflake',
      description: 'One of a kind',
      icon: '❄️',
      iconUrl: getBadgeIconUrl('snowflake_2024')
    }
  },
  
  // Day 17 - December 17th
  {
    day: 17,
    title: 'Candy Cane Border',
    description: 'Wrap your avatar in holiday stripes',
    gift: {
      type: 'asset',
      assetId: 'profile_border_candycane_2024',
      assetType: 'profile_border',
      assetUrl: getAssetPreviewUrl('profile_border_candycane_2024'),
      name: 'Candy Cane Border',
      description: 'Striped candy cane ring for your avatar'
    }
  },
  
  // Day 18 - December 18th
  {
    day: 18,
    title: 'Holiday Profile Image',
    description: 'A special profile image',
    gift: {
      type: 'asset',
      assetId: 'profile_ornament_2024',
      assetType: 'profile_image',
      assetUrl: getAssetPreviewUrl('profile_ornament_2024'),
      name: 'Ornament Profile',
      description: 'A festive ornament profile image'
    }
  },
  
  // Day 19 - December 19th
  {
    day: 19,
    title: 'Snowflake Dance Background',
    description: 'Delicate snowflakes dancing across your balance card',
    gift: {
      type: 'asset',
      assetId: 'wallet_snowflakes_2024',
      assetType: 'wallet_background',
      assetUrl: getAssetPreviewUrl('wallet_snowflakes_2024'),
      name: 'Snowflake Dance',
      description: 'Delicate snowflakes floating across your balance card'
    }
  },
  
  // Day 20 - December 20th
  {
    day: 20,
    title: 'Holiday Champion Badge',
    description: 'You\'re a true holiday champion!',
    gift: {
      type: 'badge',
      badgeId: 'champion_2024',
      title: 'Holiday Champion',
      description: 'Dedicated calendar participant',
      icon: '🏆',
      iconUrl: getBadgeIconUrl('champion_2024')
    }
  },
  
  // Day 21 - December 21st
  {
    day: 21,
    title: 'Snow Land Background',
    description: 'A magical winter landscape for your balance card',
    gift: {
      type: 'asset',
      assetId: 'wallet_snowland_2024',
      assetType: 'wallet_background',
      assetUrl: getAssetPreviewUrl('wallet_snowland_2024'),
      name: 'Snow Land',
      description: 'A magical winter landscape with penguin for your balance card'
    }
  },
  
  // Day 22 - December 22nd
  {
    day: 22,
    title: 'Aurora Spirit Badge',
    description: 'Glow like the northern lights',
    gift: {
      type: 'badge',
      badgeId: 'aurora_spirit_2024',
      title: 'Aurora Spirit',
      description: 'Unlocked the aurora profile border',
      icon: '🌌',
      iconUrl: getBadgeIconUrl('aurora_spirit_2024')
    }
  },
  
  // Day 23 - December 23rd
  {
    day: 23,
    title: 'Christmas Eve Eve Badge',
    description: 'The night before the night before!',
    gift: {
      type: 'badge',
      badgeId: 'eve_eve_2024',
      title: 'Christmas Eve Eve',
      description: 'Almost there!',
      icon: '🎁',
      iconUrl: getBadgeIconUrl('eve_eve_2024')
    }
  },
  
  // Day 24 - December 24th (Christmas Eve) - Special Grand Prize
  {
    day: 24,
    title: 'Christmas Wreath Border 🎄',
    description: 'The ultimate festive crown for completing the calendar!',
    gift: {
      type: 'asset',
      assetId: 'profile_border_christmas_wreath_2024',
      assetType: 'profile_border',
      assetUrl: getAssetPreviewUrl('profile_border_christmas_wreath_2024'),
      name: 'Christmas Wreath',
      description: 'A festive wreath border with holly and berries - exclusive grand prize!'
    }
  }
];

/**
 * Get gift configuration for a specific day
 * @param day Day number (1-24)
 * @returns Gift configuration or null if day is invalid
 */
export function getGiftForDay(day: number): ChristmasCalendarGift | null {
  if (day < 1 || day > 24) {
    return null;
  }
  return CHRISTMAS_CALENDAR_2024.find(gift => gift.day === day) || null;
}

/**
 * Get all gifts for the calendar
 * @returns Array of all gift configurations
 */
export function getAllGifts(): ChristmasCalendarGift[] {
  return CHRISTMAS_CALENDAR_2024;
}

/**
 * Calendar configuration
 */
export const CHRISTMAS_CALENDAR_CONFIG = {
  year: 2024,
  startDate: new Date(2024, 11, 1), // December 1, 2024 (month is 0-indexed)
  endDate: new Date(2024, 11, 24), // December 24, 2024
  totalDays: 24
};

