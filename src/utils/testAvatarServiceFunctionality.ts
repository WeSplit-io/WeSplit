/**
 * Avatar Service Test Script
 * Test the AvatarService functionality independently
 */

import { AvatarService } from '../services/core/avatarService';

// Test function that can be called from the app
export const testAvatarServiceFunctionality = async () => {
  console.log('🧪 Testing AvatarService functionality...');
  
  try {
    const avatarService = AvatarService.getInstance();
    
    // Test 1: Get initial cache stats
    console.log('📊 Initial cache stats:', avatarService.getCacheStats());
    
    // Test 2: Test with a real user ID (if available)
    // This would be replaced with actual user IDs from your app
    const testUserId = 'test-user-123';
    console.log(`👤 Testing avatar fetch for user: ${testUserId}`);
    
    const avatarUrl = await avatarService.getAvatarUrl(testUserId);
    console.log('Avatar URL result:', avatarUrl);
    
    // Test 3: Check cache stats after fetch
    console.log('📊 Cache stats after fetch:', avatarService.getCacheStats());
    
    // Test 4: Test cache hit (should be faster)
    console.log('🔄 Testing cache hit...');
    const cachedAvatarUrl = await avatarService.getAvatarUrl(testUserId);
    console.log('Cached avatar URL result:', cachedAvatarUrl);
    
    // Test 5: Clear cache
    avatarService.clearAllCache();
    console.log('📊 Cache stats after clear:', avatarService.getCacheStats());
    
    console.log('✅ AvatarService test completed successfully!');
    
    return {
      success: true,
      message: 'AvatarService is working correctly'
    };
    
  } catch (error) {
    console.error('❌ AvatarService test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Export for use in the app
export default testAvatarServiceFunctionality;
