/**
 * Test script to verify AI integration with WeSplit
 * Run this to test the AI service before using in the app
 */

// Test the AI service endpoints
const testAIService = async () => {
  console.log('🧪 Testing AI Service Integration...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:4000/health');
    const healthData = await healthResponse.json();
    
    if (healthData.status === 'healthy' && healthData.ai_agent_ready) {
      console.log('✅ Health check passed');
      console.log(`   - AI Agent Ready: ${healthData.ai_agent_ready}`);
      console.log(`   - API Key Configured: ${healthData.api_key_configured}`);
    } else {
      console.log('❌ Health check failed');
      return false;
    }
    
    // Test with sample image
    console.log('\n2. Testing with sample image...');
    const testResponse = await fetch('http://localhost:4000/test');
    const testData = await testResponse.json();
    
    if (testData.success) {
      console.log('✅ Sample image test passed');
      console.log(`   - Processing Time: ${testData.processing_time}s`);
      console.log(`   - Merchant: ${testData.data?.merchant?.name || 'N/A'}`);
      console.log(`   - Total: ${testData.data?.totals?.total || 'N/A'} ${testData.data?.transaction?.currency || ''}`);
      console.log(`   - Items Count: ${testData.data?.items?.length || 0}`);
    } else {
      console.log('❌ Sample image test failed:', testData.error);
      return false;
    }
    
    console.log('\n🎉 All tests passed! AI service is ready for integration.');
    console.log('\n📱 Next steps:');
    console.log('1. Start your WeSplit app');
    console.log('2. Take a photo of a receipt');
    console.log('3. The app will now use AI analysis instead of mock data');
    
    return true;
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the AI server is running: py api_server.py');
    console.log('2. Check that port 4000 is not blocked');
    console.log('3. Verify your OpenRouter API key is set in .env file');
    return false;
  }
};

// Run the test
testAIService();
