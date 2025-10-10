/**
 * Test network connection to AI service
 * Run this in your browser console or Node.js to test connectivity
 */

const testConnection = async () => {
  console.log('🧪 Testing network connection to AI service...\n');
  
  const baseUrl = 'http://192.168.1.75:4000';
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    
    if (healthData.status === 'healthy') {
      console.log('✅ Health check passed');
      console.log(`   - AI Agent Ready: ${healthData.ai_agent_ready}`);
      console.log(`   - API Key Configured: ${healthData.api_key_configured}`);
    } else {
      console.log('❌ Health check failed');
      return false;
    }
    
    // Test with sample image
    console.log('\n2. Testing with sample image...');
    const testResponse = await fetch(`${baseUrl}/test`);
    const testData = await testResponse.json();
    
    if (testData.success) {
      console.log('✅ Sample image test passed');
      console.log(`   - Processing Time: ${testData.processing_time}s`);
      console.log(`   - Merchant: ${testData.data?.merchant?.name || 'N/A'}`);
      console.log(`   - Total: ${testData.data?.totals?.total || 'N/A'} ${testData.data?.transaction?.currency || ''}`);
    } else {
      console.log('❌ Sample image test failed:', testData.error);
      return false;
    }
    
    console.log('\n🎉 Network connection test successful!');
    console.log('Your React Native app should now be able to connect to the AI service.');
    
    return true;
    
  } catch (error) {
    console.log('❌ Network test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the AI server is running: py api_server.py');
    console.log('2. Check that your IP address is correct: 192.168.1.75');
    console.log('3. Make sure both devices are on the same network');
    console.log('4. Check firewall settings');
    return false;
  }
};

// Run the test
testConnection();
