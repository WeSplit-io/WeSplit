/**
 * User Image Service
 * Handles fetching and managing user profile images
 */

import { firebaseUserService } from './firebaseDataService';
import { logger } from './loggingService';
import { AvatarUploadService } from './avatarUploadService';

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
      logger.info('Fetching user image for', { userId }, 'userImageService');
      
      const user = await firebaseUserService.getCurrentUser(userId);
      
      if (user) {
        // First check if user has avatar URL in Firestore
        if (user.avatar && user.avatar.trim() !== '') {
          logger.info('Found user avatar in Firestore', { avatar: user.avatar }, 'userImageService');
          return {
            success: true,
            imageUrl: user.avatar,
          };
        }
        
        // If no avatar in Firestore, check Firebase Storage
        logger.info('No avatar in Firestore, checking Firebase Storage', null, 'userImageService');
        const storageAvatarUrl = await AvatarUploadService.getAvatarUrl(userId);
        
        if (storageAvatarUrl) {
          logger.info('Found avatar in Firebase Storage', { storageAvatarUrl }, 'userImageService');
          
          // Update Firestore with the storage URL for future use
          try {
            await firebaseUserService.updateUser(userId, { avatar: storageAvatarUrl });
            logger.info('Updated Firestore with storage URL', null, 'userImageService');
          } catch (updateError) {
            console.warn('🔍 UserImageService: Failed to update Firestore with storage URL:', updateError);
          }
          
          return {
            success: true,
            imageUrl: storageAvatarUrl,
          };
        }
        
        logger.info('No avatar found anywhere', null, 'userImageService');
        return {
          success: true,
          imageUrl: undefined,
        };
      } else {
        logger.warn('User not found', null, 'userImageService');
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
      logger.info('Fetching images for multiple users', { count: userIds.length }, 'userImageService');
      
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
      
      logger.info('Successfully fetched images for users', { count: imageMap.size }, 'userImageService');
      
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

  /**
   * Upload user avatar
   */
  static async uploadUserAvatar(
    userId: string, 
    imageUri: string, 
    onProgress?: (progress: number) => void
  ): Promise<UserImageResult> {
    try {
      logger.info('Starting avatar upload for user', { userId }, 'userImageService');
      
      // Upload to Firebase Storage
      const uploadResult = await AvatarUploadService.uploadAvatar(userId, imageUri, onProgress);
      
      if (!uploadResult.success || !uploadResult.avatarUrl) {
        return {
          success: false,
          error: uploadResult.error || 'Failed to upload avatar',
        };
      }
      
      // Update user document in Firestore with the new avatar URL
      await firebaseUserService.updateUser(userId, { avatar: uploadResult.avatarUrl });
      
      logger.info('Avatar uploaded and user updated successfully', null, 'userImageService');
      
      return {
        success: true,
        imageUrl: uploadResult.avatarUrl,
      };
    } catch (error) {
      console.error('📸 UserImageService: Error uploading user avatar:', error);
      logger.error('Failed to upload user avatar', error, 'UserImageService');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Delete user avatar
   */
  static async deleteUserAvatar(userId: string): Promise<UserImageResult> {
    try {
      logger.info('Starting avatar deletion for user', { userId }, 'userImageService');
      
      // Delete from Firebase Storage
      const deleteResult = await AvatarUploadService.deleteAvatar(userId);
      
      if (!deleteResult.success) {
        return {
          success: false,
          error: deleteResult.error || 'Failed to delete avatar',
        };
      }
      
      // Update user document in Firestore to remove avatar URL
      await firebaseUserService.updateUser(userId, { avatar: '' });
      
      logger.info('Avatar deleted and user updated successfully', null, 'userImageService');
      
      return {
        success: true,
        imageUrl: undefined,
      };
    } catch (error) {
      console.error('🗑️ UserImageService: Error deleting user avatar:', error);
      logger.error('Failed to delete user avatar', error, 'UserImageService');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
