/**
 * Avatar Service
 * Centralized service for managing user avatars
 * Handles fetching from Firebase Storage and local cache
 */

import { logger } from '../analytics/loggingService';
import { firebaseDataService } from '../data/firebaseDataService';
import { AvatarUploadService } from './avatarUploadService';
import { getAssetInfo, BorderScaleConfig } from '../rewards/assetConfig';
import { resolveStorageUrl } from '../shared/storageUrlService';
import { getCanonicalAssetId } from '../rewards/assetIdMapping';
import { User } from '../../types';

interface AvatarCacheEntry {
  url: string | null;
  timestamp: number;
  isLocal: boolean;
}

interface UserCacheEntry {
  user: User | null;
  timestamp: number;
}

interface ProfileBorderCacheEntry {
  url: string | null;
  assetId?: string | null;
  scale?: number;
  scaleConfig?: BorderScaleConfig;
  timestamp: number;
}

interface ProfileBorderDetails {
  url: string | null;
  scale?: number;
  assetId?: string | null;
  scaleConfig?: BorderScaleConfig;
}

class AvatarService {
  private static instance: AvatarService;
  private cache: Map<string, AvatarCacheEntry> = new Map();
  private userCache: Map<string, UserCacheEntry> = new Map();
  private borderCache: Map<string, ProfileBorderCacheEntry> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;
  // Track refresh timestamps per user to force component updates
  private borderRefreshTimestamps: Map<string, number> = new Map();

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

      // Get user data from Firebase (with caching)
      const user = await this.getUserData(userId);
      
      if (!user) {
        // Silently handle missing users - this is expected for deleted/invalid users
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
            this.setCachedUserData(userId, {
              ...user,
              avatar: uploadResult.avatarUrl
            });
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
   * Get resolved profile border URL for a user (if any)
   */
  public async getProfileBorderUrl(userId: string): Promise<string | null> {
    const details = await this.getProfileBorderDetails(userId);
    return details?.url ?? null;
  }

  public async getProfileBorderDetails(userId: string): Promise<ProfileBorderDetails> {
    const cached = this.getCachedBorder(userId);
    if (cached) {
      return cached;
    }

    try {
      const user = await this.getUserData(userId);
      if (!user?.active_profile_border) {
        this.setCachedBorder(userId, null);
        return { url: null };
      }

      const canonicalAssetId = getCanonicalAssetId(user.active_profile_border) || user.active_profile_border;
      if (!canonicalAssetId) {
        this.setCachedBorder(userId, null);
        return { url: null };
      }

      const assetInfo = getAssetInfo(canonicalAssetId);
      if (!assetInfo?.url) {
        logger.debug('Profile border asset missing URL', { userId, assetId: canonicalAssetId }, 'AvatarService');
        this.setCachedBorder(userId, null, canonicalAssetId, assetInfo?.borderScale, assetInfo?.borderScaleConfig);
        return { url: null, assetId: canonicalAssetId, scale: assetInfo?.borderScale, scaleConfig: assetInfo?.borderScaleConfig };
      }

      const resolvedUrl = await resolveStorageUrl(assetInfo.url, {
        assetId: canonicalAssetId,
        userId,
        source: 'AvatarService.getProfileBorderUrl'
      });

    const payload: ProfileBorderDetails = {
      url: resolvedUrl ?? null,
      assetId: canonicalAssetId,
      scale: assetInfo?.borderScale,
      scaleConfig: assetInfo?.borderScaleConfig
    };

      this.setCachedBorder(userId, payload.url, payload.assetId, payload.scale, payload.scaleConfig);
      return payload;
    } catch (error) {
      logger.warn('Failed to resolve profile border URL', { userId, error }, 'AvatarService');
      this.setCachedBorder(userId, null);
      return { url: null };
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
    this.trimCache(this.cache);
    this.cache.set(userId, {
      url,
      timestamp: Date.now(),
      isLocal
    });
  }

  private getCachedUserData(userId: string): User | null | undefined {
    const entry = this.userCache.get(userId);
    if (!entry) {
      return undefined;
    }

    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.userCache.delete(userId);
      return undefined;
    }

    return entry.user;
  }

  private setCachedUserData(userId: string, user: User | null): void {
    this.trimCache(this.userCache);
    this.userCache.set(userId, {
      user,
      timestamp: Date.now()
    });
  }

  private async getUserData(userId: string): Promise<User | null> {
    const cached = this.getCachedUserData(userId);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const user = await firebaseDataService.user.getCurrentUser(userId);
      this.setCachedUserData(userId, user ?? null);
      return user ?? null;
    } catch (error) {
      // Silently handle "User not found" errors - this is expected for deleted/invalid users
      const isUserNotFound = error instanceof Error && error.message === 'User not found';
      if (!isUserNotFound) {
        logger.error('Failed to fetch user data', { userId, error }, 'AvatarService');
      }
      this.setCachedUserData(userId, null);
      return null;
    }
  }

  private getCachedBorder(userId: string): ProfileBorderCacheEntry | undefined {
    const entry = this.borderCache.get(userId);
    if (!entry) {
      return undefined;
    }

    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.borderCache.delete(userId);
      return undefined;
    }

    return entry;
  }

  private setCachedBorder(userId: string, url: string | null, assetId?: string | null, scale?: number, scaleConfig?: BorderScaleConfig): void {
    this.trimCache(this.borderCache);
    this.borderCache.set(userId, {
      url,
      scale,
      scaleConfig,
      assetId,
      timestamp: Date.now()
    });
  }

  private trimCache<T>(cache: Map<string, T>): void {
    if (cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
  }

  /**
   * Clear avatar cache for a specific user
   */
  public clearUserCache(userId: string): void {
    this.cache.delete(userId);
    this.borderCache.delete(userId);
    this.userCache.delete(userId);
    // Update refresh timestamp to force components to reload
    this.borderRefreshTimestamps.set(userId, Date.now());
    logger.debug('Cleared avatar cache for user', { userId }, 'AvatarService');
  }

  /**
   * Get the refresh timestamp for a user's border (used to force component updates)
   */
  public getBorderRefreshTimestamp(userId: string): number {
    return this.borderRefreshTimestamps.get(userId) || 0;
  }

  /**
   * Clear all avatar cache
   */
  public clearAllCache(): void {
    this.cache.clear();
    this.borderCache.clear();
    this.userCache.clear();
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
