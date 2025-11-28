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

const getAssetPreviewUrl = (assetId: string): string | undefined => {
  return getAssetInfo(assetId)?.url || undefined;
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
    title: 'Early Bird Points',
    description: 'You\'re an early bird!',
    gift: {
      type: 'points',
      amount: 60
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
    title: 'Santa\'s Helper Points',
    description: 'You\'re helping spread the holiday cheer!',
    gift: {
      type: 'points',
      amount: 80
    }
  },
  
  // Day 7 - December 7th
  {
    day: 7,
    title: 'Festive Wallet Background',
    description: 'Decorate your wallet with a festive background',
    gift: {
      type: 'asset',
      assetId: 'wallet_biscuit_2024',
      assetType: 'wallet_background',
      assetUrl: getAssetPreviewUrl('wallet_biscuit_2024'),
      name: 'Biscuit Bliss',
      description: 'Festive gingerbread cookie background for your balance card'
    }
  },
  
  // Day 8 - December 8th
  {
    day: 8,
    title: 'Winter Solstice Background',
    description: 'Celebrate the longest night with a winter solstice theme',
    gift: {
      type: 'asset',
      assetId: 'wallet_solstice_2024',
      assetType: 'wallet_background',
      assetUrl: getAssetPreviewUrl('wallet_solstice_2024'),
      name: 'Winter Solstice',
      description: 'Celebrate the longest night'
    }
  },
  
  // Day 9 - December 9th
  {
    day: 9,
    title: 'Gingerbread Points',
    description: 'Sweet as a cookie!',
    gift: {
      type: 'points',
      amount: 90
    }
  },
  
  // Day 10 - December 10th
  {
    day: 10,
    title: 'North Pole Lights Background',
    description: 'Neon aurora gradient for your wallet card',
    gift: {
      type: 'asset',
      assetId: 'wallet_northpole_2024',
      assetType: 'wallet_background',
      assetUrl: getAssetPreviewUrl('wallet_northpole_2024'),
      name: 'North Pole Lights',
      description: 'Neon aurora gradient for your wallet card'
    }
  },
  
  // Day 11 - December 11th
  {
    day: 11,
    title: 'Festive Points',
    description: 'More holiday points to celebrate!',
    gift: {
      type: 'points',
      amount: 85
    }
  },
  
  // Day 12 - December 12th
  {
    day: 12,
    title: 'Winter Points',
    description: 'Cozy up with bonus winter points!',
    gift: {
      type: 'points',
      amount: 95
    }
  },
  
  // Day 13 - December 13th
  {
    day: 13,
    title: 'Elf Points',
    description: 'You\'re working hard like an elf!',
    gift: {
      type: 'points',
      amount: 110
    }
  },
  
  // Day 14 - December 14th
  {
    day: 14,
    title: 'Snowflake Wallet Background',
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
  
  // Day 15 - December 15th
  {
    day: 15,
    title: 'Festive Points',
    description: 'Points to help you celebrate the season!',
    gift: {
      type: 'points',
      amount: 130
    }
  },
  
  // Day 16 - December 16th
  {
    day: 16,
    title: 'Snowflake Points',
    description: 'Unique as a snowflake',
    gift: {
      type: 'points',
      amount: 120
    }
  },
  
  // Day 17 - December 17th
  {
    day: 17,
    title: 'Holiday Points',
    description: 'Extra festive points for the season!',
    gift: {
      type: 'points',
      amount: 125
    }
  },
  
  // Day 18 - December 18th
  {
    day: 18,
    title: 'Festive Bonus Points',
    description: 'Extra points to make your holiday brighter!',
    gift: {
      type: 'points',
      amount: 135
    }
  },
  
  // Day 19 - December 19th
  {
    day: 19,
    title: 'Winter Points',
    description: 'More points for your winter collection!',
    gift: {
      type: 'points',
      amount: 145
    }
  },
  
  // Day 20 - December 20th
  {
    day: 20,
    title: 'Holiday Champion Points',
    description: 'You\'re a true holiday champion!',
    gift: {
      type: 'points',
      amount: 150
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
    title: 'Aurora Spirit Points',
    description: 'Glow like the northern lights',
    gift: {
      type: 'points',
      amount: 200
    }
  },
  
  // Day 23 - December 23rd
  {
    day: 23,
    title: 'Christmas Eve Eve Points',
    description: 'The night before the night before!',
    gift: {
      type: 'points',
      amount: 250
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

