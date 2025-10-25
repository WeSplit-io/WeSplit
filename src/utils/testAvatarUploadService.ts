/**
 * Avatar Upload Service Test
 * Test the AvatarUploadService functionality
 */

import { AvatarUploadService } from '../services/core/avatarUploadService';
import { logger } from '../services/analytics/loggingService';

export const testAvatarUploadService = async () => {
  console.log('🧪 Testing AvatarUploadService...');
  
  try {
    // Test 1: Test upload with a mock local URI
    const testUserId = 'test-user-123';
    const mockLocalUri = 'file:///var/mobile/Containers/Data/Application/test/image.jpg';
    
    console.log('📤 Testing avatar upload...');
    const uploadResult = await AvatarUploadService.uploadAvatar(testUserId, mockLocalUri);
    
    console.log('Upload result:', uploadResult);
    
    if (uploadResult.success) {
      console.log('✅ Avatar upload test passed');
      console.log('Avatar URL:', uploadResult.avatarUrl);
    } else {
      console.log('❌ Avatar upload test failed:', uploadResult.error);
    }
    
    // Test 2: Test getting avatar URL
    console.log('🔍 Testing get avatar URL...');
    const avatarUrl = await AvatarUploadService.getAvatarUrl(testUserId);
    console.log('Avatar URL result:', avatarUrl);
    
    // Test 3: Test delete avatar
    console.log('🗑️ Testing delete avatar...');
    const deleteResult = await AvatarUploadService.deleteAvatar(testUserId);
    console.log('Delete result:', deleteResult);
    
    console.log('✅ AvatarUploadService test completed');
    
    return {
      success: true,
      uploadResult,
      avatarUrl,
      deleteResult
    };
    
  } catch (error) {
    console.error('❌ AvatarUploadService test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default testAvatarUploadService;
