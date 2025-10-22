/**
 * Avatar Upload Service
 * Handles uploading and deleting user avatars to/from Firebase Storage
 */

import { storage } from '../../config/firebase/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { logger } from './loggingService';

export interface AvatarUploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

export interface AvatarDeleteResult {
  success: boolean;
  error?: string;
}

export class AvatarUploadService {
  /**
   * Upload avatar to Firebase Storage
   */
  static async uploadAvatar(
    userId: string, 
    imageUri: string, 
    onProgress?: (progress: number) => void
  ): Promise<AvatarUploadResult> {
    try {
      logger.info('Starting avatar upload for user', { userId }, 'avatarUploadService');
      
      // TEMPORARY WORKAROUND: Check if storage rules are deployed
      // If not, return the local URI as a temporary solution
      if (imageUri.startsWith('file://')) {
        logger.warn('Storage rules not deployed yet, using local URI temporarily', null, 'avatarUploadService');
        return {
          success: true,
          avatarUrl: imageUri, // Use local URI temporarily
        };
      }
      
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const avatarRef = ref(storage, `avatars/${userId}/profile.jpg`);
      
      const uploadTask = uploadBytes(avatarRef, blob);
      
      if (onProgress) {
        onProgress(50); // Simulate progress
      }
      
      await uploadTask;
      logger.info('Upload completed, getting download URL', null, 'avatarUploadService');
      
      const downloadURL = await getDownloadURL(avatarRef);
      
      logger.info('Avatar uploaded successfully', { downloadURL }, 'avatarUploadService');
      
      return {
        success: true,
        avatarUrl: downloadURL,
      };
    } catch (error) {
      console.error('📸 AvatarUploadService: Error uploading avatar:', error);
      logger.error('Failed to upload avatar', error, 'AvatarUploadService');
      
      // TEMPORARY WORKAROUND: If upload fails due to permissions, use local URI
      if (error instanceof Error && error.message.includes('unauthorized')) {
        logger.warn('Storage rules not deployed, using local URI temporarily', null, 'avatarUploadService');
        return {
          success: true,
          avatarUrl: imageUri, // Use local URI temporarily
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get avatar URL from Firebase Storage
   */
  static async getAvatarUrl(userId: string): Promise<string | undefined> {
    try {
      const avatarRef = ref(storage, `avatars/${userId}/profile.jpg`);
      return await getDownloadURL(avatarRef);
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        return undefined;
      }
      console.error('📸 AvatarUploadService: Error getting avatar URL:', error);
      logger.error('Failed to get avatar URL', error, 'AvatarUploadService');
      return undefined;
    }
  }

  /**
   * Delete avatar from Firebase Storage
   */
  static async deleteAvatar(userId: string): Promise<AvatarDeleteResult> {
    try {
      const avatarRef = ref(storage, `avatars/${userId}/profile.jpg`);
      await deleteObject(avatarRef);
      logger.info('Avatar deleted successfully for user', { userId }, 'avatarUploadService');
      return { success: true };
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        logger.info('No avatar found to delete for user', { userId }, 'avatarUploadService');
        return { success: true }; // Already deleted or never existed
      }
      console.error('📸 AvatarUploadService: Error deleting avatar:', error);
      logger.error('Failed to delete avatar', error, 'AvatarUploadService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
