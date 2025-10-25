/**
 * Test Firebase Avatar Upload
 * Test the improved AvatarUploadService with real Firebase upload
 */

import { AvatarUploadService } from '../services/core/avatarUploadService';
import { logger } from '../services/analytics/loggingService';

export const testFirebaseAvatarUpload = async () => {
  console.log('🧪 Testing Firebase Avatar Upload...');
  
  try {
    const testUserId = 'test-user-firebase-123';
    
    // Test 1: Test with a mock local URI (simulate what we get from ImagePicker)
    const mockLocalUri = 'file:///Users/pmilaalonso/Library/Developer/CoreSimulator/Device/test/image.jpg';
    
    console.log('📤 Testing Firebase upload with local URI...');
    
    // This should now fail gracefully and show the proper error
    const uploadResult = await AvatarUploadService.uploadAvatar(testUserId, mockLocalUri);
    
    console.log('Upload result:', uploadResult);
    
    if (uploadResult.success) {
      console.log('✅ Firebase upload test passed');
      console.log('Firebase URL:', uploadResult.avatarUrl);
      
      // Verify it's a Firebase URL
      if (uploadResult.avatarUrl?.includes('firebasestorage.googleapis.com')) {
        console.log('✅ URL is correctly pointing to Firebase Storage');
      } else {
        console.log('❌ URL is not pointing to Firebase Storage:', uploadResult.avatarUrl);
      }
    } else {
      console.log('❌ Firebase upload test failed:', uploadResult.error);
    }
    
    // Test 2: Test getting avatar URL
    console.log('🔍 Testing get avatar URL...');
    const avatarUrl = await AvatarUploadService.getAvatarUrl(testUserId);
    console.log('Avatar URL result:', avatarUrl);
    
    // Test 3: Test delete avatar
    console.log('🗑️ Testing delete avatar...');
    const deleteResult = await AvatarUploadService.deleteAvatar(testUserId);
    console.log('Delete result:', deleteResult);
    
    console.log('✅ Firebase Avatar Upload test completed');
    
    return {
      success: true,
      uploadResult,
      avatarUrl,
      deleteResult
    };
    
  } catch (error) {
    console.error('❌ Firebase Avatar Upload test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default testFirebaseAvatarUpload;
