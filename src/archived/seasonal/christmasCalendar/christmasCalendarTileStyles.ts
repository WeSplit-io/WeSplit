/**
 * Christmas Calendar Tile Styles Configuration
 * 
 * This file defines the background styles (colors and/or images) for each day tile
 * in the Christmas calendar. Each day can have:
 * - A background color
 * - A background image (with positioning options)
 * - Or both (image will overlay the color)
 * 
 * Image positioning options:
 * - resizeMode: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
 * - position: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
 */

import { colors } from "../../../theme";

export type ImageResizeMode = 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
export type ImagePosition = 
  | 'center' 
  | 'top' 
  | 'bottom' 
  | 'left' 
  | 'right' 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right';

export interface TileBackgroundImage {
  /** URL (string) or local image (number from require()) */
  url: string | number;
  /** How the image should be resized to fit the container */
  resizeMode?: ImageResizeMode;
  /** Position of the image within the container */
  position?: ImagePosition;
  /** Opacity of the image (0-1) */
  opacity?: number;
}

export interface TileBackgroundStyle {
  /** Background color (hex, rgb, or named color) */
  backgroundColor?: string;
  /** Background image configuration */
  backgroundImage?: TileBackgroundImage;
}

/**
 * Background styles for each day (1-25)
 * 
 * To customize a day's appearance:
 * 1. Set backgroundColor for a solid color (hex, rgb, or named color)
 * 2. Set backgroundImage.url for an image (local path, HTTP/HTTPS URL, or Firebase Storage gs:// URL)
 * 3. Optionally set backgroundImage.resizeMode ('cover', 'contain', 'stretch', 'repeat', 'center')
 * 4. Optionally set backgroundImage.position ('center', 'top', 'bottom', 'left', 'right', etc.)
 * 5. Optionally set backgroundImage.opacity (0-1) for transparency
 * 6. You can combine both (image overlays color)
 * 
 * Firebase Storage URLs:
 * - Firebase Storage URLs (gs://) are automatically resolved to HTTPS URLs
 * - Use gs://bucket-name/path/to/image.jpg format
 * - The component will automatically convert them to download URLs
 * 
 * Examples:
 * 
 * // Simple color background:
 * 1: {
 *   backgroundColor: colors.christmasGreenDark,
 * },
 * 
 * // Color with Firebase Storage image overlay:
 * 1: {
 *   backgroundColor: colors.christmasGreenDark,
 *   backgroundImage: {
 *     url: 'gs://your-bucket/christmas/day1-bg.jpg', // Firebase Storage URL (auto-resolved)
 *     resizeMode: 'cover',
 *     position: 'center',
 *     opacity: 0.8,
 *   },
 * },
 * 
 * // Image only with Firebase Storage:
 * 1: {
 *   backgroundImage: {
 *     url: 'gs://your-bucket/christmas/day1-bg.jpg', // Firebase Storage URL
 *     resizeMode: 'contain',
 *     position: 'top-left',
 *   },
 * },
 * 
 * // Local image (require):
 * 1: {
 *   backgroundImage: {
 *     url: require('../../assets/day1-bg.png'), // Local image
 *     resizeMode: 'cover',
 *   },
 * },
 * 
 * // HTTP/HTTPS URL:
 * 1: {
 *   backgroundImage: {
 *     url: 'https://example.com/day1-bg.jpg', // Remote URL
 *     resizeMode: 'cover',
 *   },
 * },
 */
export const TILE_BACKGROUND_STYLES: Record<number, TileBackgroundStyle> = {
  // Day 1 - December 1st
  1: {
    backgroundColor: colors.christmasGreenDark,
    // Uncomment and set image URL to add background image:
    // backgroundImage: {
    //   url: 'https://example.com/day1-bg.jpg',
    //   resizeMode: 'cover',
    //   position: 'center',
    //   opacity: 1,
    // },
  },
  
  // Day 2 - December 2nd
  2: {
    backgroundColor: colors.christmasRed,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday2-bg.png?alt=media&token=969de1d4-4ab4-4f6c-9fd3-42a1efb266c9',
      resizeMode: 'cover',
      position: 'bottom-right',
    },
  },
  
  // Day 3 - December 3rd
  3: {
    backgroundColor: colors.christmasGreenLight,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fgreen-lines-bg.png?alt=media&token=3aef517f-1e2b-4b3f-bbf3-107ab57a6849',
      resizeMode: 'cover',
      position: 'center',
    },
  },
  
  // Day 4 - December 4th
  4: {
    backgroundColor: colors.christmasYellow,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday4-bg.png?alt=media&token=fe86641d-1550-42bc-b7f0-146f342893b8',
      resizeMode: 'cover',
      position: 'bottom',
    },
  },
  
  // Day 5 - December 5th
  5: {
    backgroundColor: colors.christmasGreenDark,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday5-bg.png?alt=media&token=c26b5e84-5754-443a-a742-ad032959c96f',
      resizeMode: 'cover',
      position: 'center',
    },
  },
  
  // Day 6 - December 6th
  6: {
    backgroundColor: colors.christmasYellow,
  },
  
  // Day 7 - December 7th
  7: {
    backgroundColor: colors.christmasRed,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday7-bg.png?alt=media&token=76c24ed2-3bae-449f-9124-010f24116a2b',
      resizeMode: 'cover',
      position: 'center',
    },
  },
  
  // Day 8 - December 8th
  8: {
    backgroundColor: colors.christmasGreenLight,
  },
  
  // Day 9 - December 9th
  9: {
    backgroundColor: colors.christmasGreenDark,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday9-bg.png?alt=media&token=749df3a1-977b-4a91-a9b4-78eb7c49e1d0',
      resizeMode: 'cover',
      position: 'bottom-right',
    },
  },
  
  // Day 10 - December 10th
  10: {
    backgroundColor: colors.christmasGreenDark,
  },
  
  // Day 11 - December 11th
  11: {
    backgroundColor: colors.christmasGreenLight,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fgreen-lines-bg.png?alt=media&token=3aef517f-1e2b-4b3f-bbf3-107ab57a6849',
      resizeMode: 'cover',
      position: 'center',
    },
  },
  
  // Day 12 - December 12th
  12: {
    backgroundColor: colors.christmasRed,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday12-bg.png?alt=media&token=27d7bf8b-7edf-48be-94f2-3952de891e55',
      resizeMode: 'cover',
      position: 'bottom-right',
    },
  },
  
  // Day 13 - December 13th
  13: {
    backgroundColor: colors.christmasYellow,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fyellow-dots-bg.png?alt=media&token=fc89d44f-7dd7-4666-9932-2b21dbb4e62d',
      resizeMode: 'cover',
      position: 'center',
    },
  },
  
  // Day 14 - December 14th
  14: {
    backgroundColor: colors.christmasGreenLight,
  },
  
  // Day 15 - December 15th
  15: {
    backgroundColor: colors.christmasGreenDark,
  },
  
  // Day 16 - December 16th
  16: {
    backgroundColor: colors.christmasGreenLight,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday16-bg.png?alt=media&token=e84594be-fc8c-4e43-b39e-214090b339a3',
      resizeMode: 'cover',
      position: 'bottom-left',
    },
  },
  
  // Day 17 - December 17th
  17: {
    backgroundColor: colors.christmasYellow,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fyellow-dots-bg.png?alt=media&token=fc89d44f-7dd7-4666-9932-2b21dbb4e62d',
      resizeMode: 'cover',
      position: 'center',
    },
  },
  
  // Day 18 - December 18th
  18: {
    backgroundColor: colors.christmasRed,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday18-bg.png?alt=media&token=39dde865-8bcf-4107-8b89-a79245b1f8a3',
      resizeMode: 'cover',
      position: 'bottom',
    },
  },
  
  // Day 19 - December 19th
  19: {
    backgroundColor: colors.christmasGreenDark,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday19-bg.png?alt=media&token=184784b9-cbad-4710-9c63-23c1643773e9',
      resizeMode: 'cover',
      position: 'center',
    },
  },
  
  // Day 20 - December 20th
  20: {
    backgroundColor: colors.christmasRed,
  },
  
  // Day 21 - December 21st
  21: {
    backgroundColor: colors.christmasGreenDark,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday21-bg.png?alt=media&token=8291c3ba-a3c4-4f65-8d7e-82e5f7157086',
      resizeMode: 'cover',
      position: 'top-right',
    },
  },
  
  // Day 22 - December 22nd
  22: {
    backgroundColor: colors.christmasGreenLight,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fgreen-lines-bg.png?alt=media&token=3aef517f-1e2b-4b3f-bbf3-107ab57a6849',
      resizeMode: 'cover',
      position: 'center',
    },
  },
  
  // Day 23 - December 23rd
  23: {
    backgroundColor: colors.christmasGreenLight,
  },
  
  // Day 24 - December 24th (Christmas Eve) - Special
  24: {
    backgroundColor: colors.christmasYellow,
    backgroundImage: {
      url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday24-bg.png?alt=media&token=d2db23d7-8183-41cb-94e0-da5d8b75e486',
      resizeMode: 'cover',
      position: 'bottom',
    },
  },
    // Day 25 - December 25th
    25: {
        backgroundColor: colors.christmasRed,
        backgroundImage: {
          url: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchristmas%2Fday25-bg.png?alt=media&token=ba011d96-2595-422b-96d6-602798d52794',
          resizeMode: 'cover',
          position: 'center',
        },
      },
};

/**
 * Get background style for a specific day
 * @param day Day number (1-25)
 * @returns Background style configuration or null if day is invalid
 */
export function getTileBackgroundStyle(day: number): TileBackgroundStyle | null {
  if (day < 1 || day > 25) {
    return null;
  }
  return TILE_BACKGROUND_STYLES[day] || null;
}

/**
 * Get default background style (fallback)
 */
export function getDefaultTileBackgroundStyle(): TileBackgroundStyle {
  return {
    backgroundColor: '#1C2B23',
  };
}

