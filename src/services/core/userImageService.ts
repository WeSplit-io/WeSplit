/**
 * User Image Service
 * Handles user profile image upload and management
 */

import { logger } from '../analytics/loggingService';

export interface ImageUploadResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  format: string;
}

export interface UserImageInfo {
  userId: string;
  imageUrl?: string;
  hasImage: boolean;
  fallbackInitials: string;
}

class UserImageService {
  private static instance: UserImageService;

  private constructor() {}

  public static getInstance(): UserImageService {
    if (!UserImageService.instance) {
      UserImageService.instance = new UserImageService();
    }
    return UserImageService.instance;
  }

  public async uploadUserImage(userId: string, imageUri: string): Promise<ImageUploadResult> {
    try {
      logger.info('Starting image upload', { userId }, 'UserImageService');
      
      // Mock implementation
      const result: ImageUploadResult = {
        success: true,
        imageUrl: `https://example.com/images/${userId}/profile.jpg`
      };

      logger.info('Image upload completed', { userId, imageUrl: result.imageUrl }, 'UserImageService');
      return result;
    } catch (error) {
      logger.error('Image upload failed', { userId, error }, 'UserImageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Image upload failed'
      };
    }
  }

  public async deleteUserImage(userId: string): Promise<boolean> {
    try {
      logger.info('Deleting user image', { userId }, 'UserImageService');
      // Mock implementation
      return true;
    } catch (error) {
      logger.error('Image deletion failed', { userId, error }, 'UserImageService');
      return false;
    }
  }

  public async getImageMetadata(imageUri: string): Promise<ImageMetadata | null> {
    // Mock implementation
    return {
      width: 200,
      height: 200,
      size: 1024,
      format: 'jpeg'
    };
  }

  /**
   * Generate initials from a name
   */
  public static generateInitials(name: string): string {
    if (!name || typeof name !== 'string') {
      return 'U';
    }
    
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Get user image info
   */
  public async getUserImageInfo(userId: string, userName?: string): Promise<UserImageInfo> {
    try {
      // Mock implementation - in real app, this would fetch from storage/database
      return {
        userId,
        imageUrl: undefined,
        hasImage: false,
        fallbackInitials: UserImageService.generateInitials(userName || 'User')
      };
    } catch (error) {
      logger.error('Failed to get user image info', { userId, error }, 'UserImageService');
      return {
        userId,
        imageUrl: undefined,
        hasImage: false,
        fallbackInitials: UserImageService.generateInitials(userName || 'User')
      };
    }
  }
}

export const userImageService = UserImageService.getInstance();
export { UserImageService };
export default userImageService;