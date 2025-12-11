/**
 * Shared data utilities for consistent data handling across the app
 */

import { firebaseDataService } from '../data';
import { logger } from '../analytics/loggingService';
import { RequestDeduplicator } from '../split/utils/debounceUtils';

/**
 * Cache for user data to avoid repeated API calls
 */
const userCache = new Map<string, { name: string; avatar?: string; email?: string }>();

// Request deduplication to prevent multiple simultaneous calls for same user
const userDisplayNameDeduplicator = new RequestDeduplicator<(id: string) => Promise<string>>();
const userAvatarDeduplicator = new RequestDeduplicator<(id: string) => Promise<string | undefined>>();

/**
 * Get user display name by user ID with caching and deduplication
 */
export const getUserDisplayName = async (userId: string): Promise<string> => {
  // Use deduplication to prevent multiple simultaneous calls
  return userDisplayNameDeduplicator.execute(
    userId,
    async (id: string): Promise<string> => {
      try {
        // Check cache first
        if (userCache.has(id)) {
          const cached = userCache.get(id);
          return cached?.name || 'Unknown User';
        }

        // Fetch from database (this will use its own cache/deduplication)
        const user = await firebaseDataService.user.getCurrentUser(id);
        const displayName = user?.name || user?.email?.split('@')[0] || 'Unknown User';
        
        // Cache the result
        userCache.set(id, {
          name: displayName,
          avatar: user?.avatar,
          email: user?.email
        });

        return displayName;
      } catch (error) {
        logger.warn('Failed to get user display name', { userId: id, error }, 'DataUtils');
        return 'Unknown User';
      }
    },
    userId
  );
};

/**
 * Get user avatar by user ID with caching and deduplication
 */
export const getUserAvatar = async (userId: string): Promise<string | undefined> => {
  // Use deduplication to prevent multiple simultaneous calls
  return userAvatarDeduplicator.execute(
    userId,
    async (id: string): Promise<string | undefined> => {
      try {
        // Check cache first
        if (userCache.has(id)) {
          return userCache.get(id)?.avatar;
        }

        // Fetch from database (this will use its own cache/deduplication)
        const user = await firebaseDataService.user.getCurrentUser(id);
        const avatar = user?.avatar;
        
        // Cache the result
        userCache.set(id, {
          name: user?.name || user?.email?.split('@')[0] || 'Unknown User',
          avatar: user?.avatar,
          email: user?.email
        });

        return avatar;
      } catch (error) {
        logger.warn('Failed to get user avatar', { userId: id, error }, 'DataUtils');
        return undefined;
      }
    },
    userId
  );
};

/**
 * Clear user cache (useful for logout or when user data changes)
 */
export const clearUserCache = (): void => {
  userCache.clear();
};

/**
 * Preload user data for multiple user IDs
 * Silently handles missing users (common case for deleted/invalid user IDs)
 */
export const preloadUserData = async (userIds: string[]): Promise<void> => {
  try {
    const uniqueUserIds = [...new Set(userIds)];
    const uncachedIds = uniqueUserIds.filter(id => !userCache.has(id));
    
    if (uncachedIds.length === 0) {return;}

    // Fetch all uncached users in parallel
    const userPromises = uncachedIds.map(async (userId) => {
      try {
        const user = await firebaseDataService.user.getCurrentUser(userId);
        const displayName = user?.name || user?.email?.split('@')[0] || 'Unknown User';
        
        userCache.set(userId, {
          name: displayName,
          avatar: user?.avatar,
          email: user?.email
        });
      } catch (error) {
        // Silently handle "User not found" errors - this is expected for deleted/invalid users
        // Only log if it's a different type of error
        const isUserNotFound = error instanceof Error && error.message === 'User not found';
        if (!isUserNotFound) {
          logger.warn('Failed to preload user data', { userId, error }, 'DataUtils');
        }
        // Cache as unknown user to prevent repeated lookups
        userCache.set(userId, { name: 'Unknown User' });
      }
    });

    await Promise.all(userPromises);
  } catch (error) {
    // Only log unexpected errors
    logger.error('Failed to preload user data', { userIds, error }, 'DataUtils');
  }
};

/**
 * Remove undefined values from an object (Firebase doesn't allow undefined values)
 */
export const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item));
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
};