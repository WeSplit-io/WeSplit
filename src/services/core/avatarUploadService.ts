/**
 * Avatar Upload Service
 * Handles uploading and deleting user avatars to/from Firebase Storage
 */

import { storage } from '../../config/firebase/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { logger } from '../analytics/loggingService';
import * as FileSystem from 'expo-file-system';

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
      
      // Convert local file URI to blob for upload
      let blob: Blob;
      
      if (imageUri.startsWith('file://')) {
        // For local files, try multiple approaches
        logger.debug('Processing local file URI', { imageUri }, 'avatarUploadService');
        
        try {
          // Method 1: Try fetch first (works in some cases)
          const response = await fetch(imageUri);
          blob = await response.blob();
          logger.debug('Successfully read file with fetch', { size: blob.size }, 'avatarUploadService');
        } catch (fetchError) {
          logger.debug('Fetch failed, trying FileSystem approach', { error: fetchError }, 'avatarUploadService');
          
          try {
            // Method 2: Try expo-file-system
            const base64 = await FileSystem.readAsStringAsync(imageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Convert base64 to blob
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: 'image/jpeg' });
            
            logger.debug('Successfully converted file with FileSystem', { size: blob.size }, 'avatarUploadService');
          } catch (fileSystemError) {
            logger.error('Both fetch and FileSystem failed', { 
              fetchError: fetchError.message, 
              fileSystemError: fileSystemError.message 
            }, 'avatarUploadService');
            
            // Method 3: Try with different file system approach
            try {
              // For React Native, sometimes we need to use a different approach
              const fileInfo = await FileSystem.getInfoAsync(imageUri);
              if (fileInfo.exists) {
                logger.debug('File exists, trying alternative read method', { fileInfo }, 'avatarUploadService');
                
                // Try reading as base64 with different encoding
                const base64 = await FileSystem.readAsStringAsync(imageUri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], { type: 'image/jpeg' });
                
                logger.debug('Successfully read file with alternative method', { size: blob.size }, 'avatarUploadService');
              } else {
                throw new Error('File does not exist');
              }
            } catch (alternativeError) {
              logger.error('All file reading methods failed', { 
                fetchError: fetchError.message,
                fileSystemError: fileSystemError.message,
                alternativeError: alternativeError.message
              }, 'avatarUploadService');
              
              throw new Error('Unable to read local file. Please try selecting the image again or restart the app.');
            }
          }
        }
      } else {
        // For remote URLs
        const response = await fetch(imageUri);
        blob = await response.blob();
      }
      
      // Create Firebase Storage reference
      const avatarRef = ref(storage, `avatars/${userId}/profile.jpg`);
      
      // Upload the blob
      logger.debug('Uploading blob to Firebase Storage', { size: blob.size }, 'avatarUploadService');
      
      if (onProgress) {
        onProgress(50); // Simulate progress
      }
      
      await uploadBytes(avatarRef, blob);
      logger.info('Upload completed, getting download URL', null, 'avatarUploadService');
      
      // Get the download URL
      const downloadURL = await getDownloadURL(avatarRef);
      
      logger.info('Avatar uploaded successfully', { downloadURL }, 'avatarUploadService');
      
      return {
        success: true,
        avatarUrl: downloadURL,
      };
    } catch (error) {
      console.error('📸 AvatarUploadService: Error uploading avatar:', error);
      logger.error('Failed to upload avatar', error, 'AvatarUploadService');
      
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
