/**
 * User Image Service
 * Handles fetching and managing user profile images
 */

import { firebaseUserService } from './firebaseDataService';
import { logger } from './loggingService';

export interface UserImageResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface UserImageInfo {
  userId: string;
  imageUrl?: string;
  hasImage: boolean;
  fallbackInitials: string;
}

export class UserImageService {
  /**
   * Get user profile image URL
   */
  static async getUserImage(userId: string): Promise<UserImageResult> {
    try {
      console.log('🔍 UserImageService: Fetching user image for:', userId);
      
      const user = await firebaseUserService.getCurrentUser(userId);
      
      if (user) {
        
        if (user.avatar && user.avatar.trim() !== '') {
          console.log('🔍 UserImageService: Found user avatar:', user.avatar);
          return {
            success: true,
            imageUrl: user.avatar,
          };
        } else {
          console.log('🔍 UserImageService: No avatar found for user');
          return {
            success: true,
            imageUrl: undefined,
          };
        }
      } else {
        console.log('🔍 UserImageService: User not found');
        return {
          success: false,
          error: 'User not found',
        };
      }
    } catch (error) {
      console.error('🔍 UserImageService: Error fetching user image:', error);
      logger.error('Failed to fetch user image', error, 'UserImageService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get user image info with fallback initials
   */
  static async getUserImageInfo(userId: string, userName?: string): Promise<UserImageInfo> {
    try {
      const imageResult = await this.getUserImage(userId);
      
      const fallbackInitials = this.generateInitials(userName || 'User');
      
      return {
        userId,
        imageUrl: imageResult.success ? imageResult.imageUrl : undefined,
        hasImage: !!(imageResult.success && imageResult.imageUrl),
        fallbackInitials,
      };
    } catch (error) {
      console.error('🔍 UserImageService: Error getting user image info:', error);
      return {
        userId,
        imageUrl: undefined,
        hasImage: false,
        fallbackInitials: this.generateInitials(userName || 'User'),
      };
    }
  }

  /**
   * Generate initials from user name
   */
  static generateInitials(name: string): string {
    if (!name || name.trim() === '') {
      return 'U';
    }

    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
  }

  /**
   * Get multiple user images in batch
   */
  static async getMultipleUserImages(userIds: string[]): Promise<Map<string, UserImageInfo>> {
    const imageMap = new Map<string, UserImageInfo>();
    
    try {
      console.log('🔍 UserImageService: Fetching images for multiple users:', userIds.length);
      
      // Fetch all users in parallel
      const userPromises = userIds.map(async (userId) => {
        try {
          const user = await firebaseUserService.getCurrentUser(userId);
          if (user) {
            const fallbackInitials = this.generateInitials(user.name);
            
            return {
              userId,
              imageInfo: {
                userId,
                imageUrl: user.avatar && user.avatar.trim() !== '' ? user.avatar : undefined,
                hasImage: !!(user.avatar && user.avatar.trim() !== ''),
                fallbackInitials,
              },
            };
          }
        } catch (error) {
          console.error('🔍 UserImageService: Error fetching user:', userId, error);
        }
        
        return {
          userId,
          imageInfo: {
            userId,
            imageUrl: undefined,
            hasImage: false,
            fallbackInitials: 'U',
          },
        };
      });

      const results = await Promise.all(userPromises);
      
      results.forEach(({ userId, imageInfo }) => {
        imageMap.set(userId, imageInfo);
      });
      
      console.log('🔍 UserImageService: Successfully fetched images for', imageMap.size, 'users');
      
    } catch (error) {
      console.error('🔍 UserImageService: Error fetching multiple user images:', error);
      logger.error('Failed to fetch multiple user images', error, 'UserImageService');
    }
    
    return imageMap;
  }

  /**
   * Get user image info from user object (if already available)
   */
  static getUserImageInfoFromUser(user: any): UserImageInfo {
    const fallbackInitials = this.generateInitials(user.name || 'User');
    
    return {
      userId: user.id.toString(),
      imageUrl: user.avatar && user.avatar.trim() !== '' ? user.avatar : undefined,
      hasImage: !!(user.avatar && user.avatar.trim() !== ''),
      fallbackInitials,
    };
  }
}
