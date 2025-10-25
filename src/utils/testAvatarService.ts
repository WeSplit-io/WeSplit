/**
 * Avatar Service Test
 * Simple test to verify AvatarService functionality
 */

import { AvatarService } from '../services/core/avatarService';
import { logger } from '../services/core';

export const testAvatarService = async () => {
  console.log('🧪 Testing AvatarService...');
  
  try {
    const avatarService = AvatarService.getInstance();
    
    // Test 1: Get cache stats (should be empty initially)
    console.log('📊 Initial cache stats:', avatarService.getCacheStats());
    
    // Test 2: Try to get avatar for a non-existent user
    console.log('👤 Testing non-existent user...');
    const nonExistentAvatar = await avatarService.getAvatarUrl('non-existent-user-id');
    console.log('Result:', nonExistentAvatar);
    
    // Test 3: Test cache functionality
    console.log('📊 Cache stats after first call:', avatarService.getCacheStats());
    
    // Test 4: Clear cache
    avatarService.clearAllCache();
    console.log('📊 Cache stats after clear:', avatarService.getCacheStats());
    
    console.log('✅ AvatarService test completed successfully');
    
  } catch (error) {
    console.error('❌ AvatarService test failed:', error);
  }
};

// Export for manual testing
export default testAvatarService;
