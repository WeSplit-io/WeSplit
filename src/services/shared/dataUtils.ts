/**
 * Shared data utilities for consistent data handling across the app
 */

import { firebaseDataService } from '../data';
import { logger } from '../analytics/loggingService';

/**
 * Cache for user data to avoid repeated API calls
 */
const userCache = new Map<string, { name: string; avatar?: string; email?: string }>();

/**
 * Get user display name by user ID with caching
 */
export const getUserDisplayName = async (userId: string): Promise<string> => {
  try {
    // Check cache first
    if (userCache.has(userId)) {
      const cached = userCache.get(userId);
      return cached?.name || 'Unknown User';
    }

    // Fetch from database
    const user = await firebaseDataService.user.getCurrentUser(userId);
    const displayName = user?.name || user?.email?.split('@')[0] || 'Unknown User';
    
    // Cache the result
    userCache.set(userId, {
      name: displayName,
      avatar: user?.avatar,
      email: user?.email
    });

    return displayName;
  } catch (error) {
    logger.warn('Failed to get user display name', { userId, error }, 'DataUtils');
    return 'Unknown User';
  }
};

/**
 * Get user avatar by user ID with caching
 */
export const getUserAvatar = async (userId: string): Promise<string | undefined> => {
  try {
    // Check cache first
    if (userCache.has(userId)) {
      return userCache.get(userId)?.avatar;
    }

    // Fetch from database
    const user = await firebaseDataService.user.getCurrentUser(userId);
    const avatar = user?.avatar;
    
    // Cache the result
    userCache.set(userId, {
      name: user?.name || user?.email?.split('@')[0] || 'Unknown User',
      avatar: user?.avatar,
      email: user?.email
    });

    return avatar;
  } catch (error) {
    logger.warn('Failed to get user avatar', { userId, error }, 'DataUtils');
    return undefined;
  }
};

/**
 * Clear user cache (useful for logout or when user data changes)
 */
export const clearUserCache = (): void => {
  userCache.clear();
};

/**
 * Preload user data for multiple user IDs
 */
export const preloadUserData = async (userIds: string[]): Promise<void> => {
  try {
    const uniqueUserIds = [...new Set(userIds)];
    const uncachedIds = uniqueUserIds.filter(id => !userCache.has(id));
    
    if (uncachedIds.length === 0) return;

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
        logger.warn('Failed to preload user data', { userId, error }, 'DataUtils');
        userCache.set(userId, { name: 'Unknown User' });
      }
    });

    await Promise.all(userPromises);
  } catch (error) {
    logger.error('Failed to preload user data', { userIds, error }, 'DataUtils');
  }
};