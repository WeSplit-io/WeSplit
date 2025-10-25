/**
 * Avatar Service
 * Centralized service for managing user avatars
 * Handles fetching from Firebase Storage and local cache
 */

import { logger } from '../analytics/loggingService';
import { firebaseDataService } from '../data/firebaseDataService';
import { AvatarUploadService } from './avatarUploadService';

interface AvatarCacheEntry {
  url: string | null;
  timestamp: number;
  isLocal: boolean;
}

class AvatarService {
  private static instance: AvatarService;
  private cache: Map<string, AvatarCacheEntry> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  private constructor() {}

  public static getInstance(): AvatarService {
    if (!AvatarService.instance) {
      AvatarService.instance = new AvatarService();
    }
    return AvatarService.instance;
  }

  /**
   * Get avatar URL for a user
   * Handles both local file URLs and Firebase Storage URLs
   */
  public async getAvatarUrl(userId: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = this.getCachedAvatar(userId);
      if (cached) {
        logger.debug('Avatar found in cache', { userId }, 'AvatarService');
        return cached;
      }

      logger.debug('Fetching avatar from database', { userId }, 'AvatarService');

      // Get user data from Firebase
      const user = await firebaseDataService.user.getCurrentUser(userId);
      
      if (!user) {
        logger.warn('User not found', { userId }, 'AvatarService');
        this.setCachedAvatar(userId, null, false);
        return null;
      }

      const avatarUrl = user.avatar;
      
      if (!avatarUrl) {
        logger.debug('No avatar URL in user data', { userId }, 'AvatarService');
        this.setCachedAvatar(userId, null, false);
        return null;
      }

      // Check if it's a local file URL
      if (avatarUrl.startsWith('file://')) {
        logger.debug('Avatar is local file URL', { userId, avatarUrl }, 'AvatarService');
        
        // Try to upload to Firebase Storage if not already done
        try {
          const uploadResult = await AvatarUploadService.uploadAvatar(userId, avatarUrl);
          
          if (uploadResult.success && uploadResult.avatarUrl) {
            // Update user record with new Firebase URL
            await firebaseDataService.user.updateUser(userId, {
              avatar: uploadResult.avatarUrl
            });
            
            logger.info('Avatar uploaded to Firebase Storage', { userId, newUrl: uploadResult.avatarUrl }, 'AvatarService');
            this.setCachedAvatar(userId, uploadResult.avatarUrl, false);
            return uploadResult.avatarUrl;
          } else {
            logger.warn('Failed to upload avatar to Firebase', { userId, error: uploadResult.error }, 'AvatarService');
            // For now, return null to trigger fallback to default avatar
            // This prevents showing broken local URLs
            this.setCachedAvatar(userId, null, false);
            return null;
          }
        } catch (uploadError) {
          logger.error('Error uploading avatar', { userId, error: uploadError }, 'AvatarService');
          // For now, return null to trigger fallback to default avatar
          this.setCachedAvatar(userId, null, false);
          return null;
        }
      }

      // Check if it's a Firebase Storage URL
      if (avatarUrl.startsWith('https://firebasestorage.googleapis.com/')) {
        logger.debug('Avatar is Firebase Storage URL', { userId }, 'AvatarService');
        
        // Verify the URL is still valid
        try {
          const response = await fetch(avatarUrl, { method: 'HEAD' });
          if (response.ok) {
            this.setCachedAvatar(userId, avatarUrl, false);
            return avatarUrl;
          } else {
            logger.warn('Firebase Storage URL is invalid', { userId, status: response.status }, 'AvatarService');
            this.setCachedAvatar(userId, null, false);
            return null;
          }
        } catch (fetchError) {
          logger.warn('Failed to verify Firebase Storage URL', { userId, error: fetchError }, 'AvatarService');
          this.setCachedAvatar(userId, null, false);
          return null;
        }
      }

      // Check if it's a Firebase Storage reference path
      if (avatarUrl.startsWith('avatars/')) {
        logger.debug('Avatar is Firebase Storage reference', { userId, avatarUrl }, 'AvatarService');
        
        try {
          const downloadUrl = await AvatarUploadService.getAvatarUrl(userId);
          if (downloadUrl) {
            this.setCachedAvatar(userId, downloadUrl, false);
            return downloadUrl;
          } else {
            logger.warn('Firebase Storage reference not found', { userId }, 'AvatarService');
            this.setCachedAvatar(userId, null, false);
            return null;
          }
        } catch (storageError) {
          logger.error('Error getting Firebase Storage URL', { userId, error: storageError }, 'AvatarService');
          this.setCachedAvatar(userId, null, false);
          return null;
        }
      }

      // Unknown URL format
      logger.warn('Unknown avatar URL format', { userId, avatarUrl }, 'AvatarService');
      this.setCachedAvatar(userId, null, false);
      return null;

    } catch (error) {
      logger.error('Failed to get avatar URL', { userId, error }, 'AvatarService');
      this.setCachedAvatar(userId, null, false);
      return null;
    }
  }

  /**
   * Get cached avatar URL
   */
  private getCachedAvatar(userId: string): string | null {
    const entry = this.cache.get(userId);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(userId);
      return null;
    }

    return entry.url;
  }

  /**
   * Set cached avatar URL
   */
  private setCachedAvatar(userId: string, url: string | null, isLocal: boolean): void {
    // Clean up cache if it's getting too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(userId, {
      url,
      timestamp: Date.now(),
      isLocal
    });
  }

  /**
   * Clear avatar cache for a specific user
   */
  public clearUserCache(userId: string): void {
    this.cache.delete(userId);
    logger.debug('Cleared avatar cache for user', { userId }, 'AvatarService');
  }

  /**
   * Clear all avatar cache
   */
  public clearAllCache(): void {
    this.cache.clear();
    logger.debug('Cleared all avatar cache', null, 'AvatarService');
  }

  /**
   * Preload avatars for multiple users
   */
  public async preloadAvatars(userIds: string[]): Promise<void> {
    logger.debug('Preloading avatars', { count: userIds.length }, 'AvatarService');
    
    const promises = userIds.map(userId => this.getAvatarUrl(userId));
    await Promise.allSettled(promises);
    
    logger.debug('Avatar preloading completed', null, 'AvatarService');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; entries: Array<{ userId: string; isLocal: boolean; age: number }> } {
    const entries = Array.from(this.cache.entries()).map(([userId, entry]) => ({
      userId,
      isLocal: entry.isLocal,
      age: Date.now() - entry.timestamp
    }));

    return {
      size: this.cache.size,
      entries
    };
  }
}

export { AvatarService };
export default AvatarService.getInstance();
