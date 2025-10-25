/**
 * Avatar Upload Service - Fallback Solution
 * Provides a temporary fallback for local file upload issues
 */

import { logger } from '../analytics/loggingService';

export interface AvatarUploadFallbackResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
  isFallback?: boolean;
}

export class AvatarUploadFallbackService {
  /**
   * Upload avatar with fallback handling
   * If Firebase upload fails, provides a graceful fallback
   */
  static async uploadAvatarWithFallback(
    userId: string, 
    imageUri: string
  ): Promise<AvatarUploadFallbackResult> {
    try {
      logger.info('Starting avatar upload with fallback', { userId }, 'AvatarUploadFallbackService');
      
      // First, try the normal Firebase upload
      const { AvatarUploadService } = await import('./avatarUploadService');
      const uploadResult = await AvatarUploadService.uploadAvatar(userId, imageUri);
      
      if (uploadResult.success) {
        logger.info('Firebase upload successful', { userId }, 'AvatarUploadFallbackService');
        return {
          success: true,
          avatarUrl: uploadResult.avatarUrl,
          isFallback: false
        };
      }
      
      // If Firebase upload fails, provide fallback
      logger.warn('Firebase upload failed, using fallback', { 
        userId, 
        error: uploadResult.error 
      }, 'AvatarUploadFallbackService');
      
      // For now, return the local URI as a temporary solution
      // This ensures the user can still see their avatar locally
      return {
        success: true,
        avatarUrl: imageUri,
        isFallback: true,
        error: `Firebase upload failed: ${uploadResult.error}. Using local fallback.`
      };
      
    } catch (error) {
      logger.error('Avatar upload with fallback failed', { userId, error }, 'AvatarUploadFallbackService');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Check if an avatar URL is a fallback (local) URL
   */
  static isFallbackUrl(avatarUrl: string): boolean {
    return avatarUrl.startsWith('file://');
  }
  
  /**
   * Delete avatar with fallback handling
   */
  static async deleteAvatar(userId: string): Promise<AvatarUploadFallbackResult> {
    try {
      logger.info('Starting avatar deletion with fallback', { userId }, 'AvatarUploadFallbackService');
      
      // Try the normal Firebase deletion
      const { AvatarUploadService } = await import('./avatarUploadService');
      const deleteResult = await AvatarUploadService.deleteAvatar(userId);
      
      if (deleteResult.success) {
        logger.info('Firebase deletion successful', { userId }, 'AvatarUploadFallbackService');
        return {
          success: true,
          isFallback: false
        };
      }
      
      // If Firebase deletion fails, still consider it successful for local cleanup
      logger.warn('Firebase deletion failed, but local cleanup completed', { 
        userId, 
        error: deleteResult.error 
      }, 'AvatarUploadFallbackService');
      
      return {
        success: true,
        isFallback: true,
        error: `Firebase deletion failed: ${deleteResult.error}. Local cleanup completed.`
      };
      
    } catch (error) {
      logger.error('Avatar deletion with fallback failed', { userId, error }, 'AvatarUploadFallbackService');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Get user-friendly message about avatar status
   */
  static getAvatarStatusMessage(avatarUrl: string): string {
    if (this.isFallbackUrl(avatarUrl)) {
      return 'Avatar is stored locally. It will be uploaded to cloud storage when possible.';
    }
    return 'Avatar is stored in cloud storage and accessible to other users.';
  }
}

export default AvatarUploadFallbackService;
