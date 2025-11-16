/**
 * Application Constants
 * Centralized place for app-wide constants
 */

// Default avatar URL for users without profile images
export const DEFAULT_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f';

// App version and build info
export const APP_VERSION = '1.1.2';

// Default values
export const DEFAULT_VALUES = {
  AVATAR_URL: DEFAULT_AVATAR_URL,
  USER_INITIALS: 'U',
} as const;
