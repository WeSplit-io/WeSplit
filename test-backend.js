// Test script to verify backend connectivity
const fetch = require('node-fetch');

const POSSIBLE_BACKEND_URLS = [
  'http://10.0.2.2:4000', // Android emulator
  'http://localhost:4000', // Local development
  'http://127.0.0.1:4000', // Local development alternative
  'http://192.0.0.2:4000', // Current machine IP
  'http://192.168.1.75:4000', // Previous IP (fallback)
];

async function testBackendConnection(url) {
  try {
    console.log(`Testing: ${url}`);
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      timeout: 3000,
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ SUCCESS: ${url} - Status: ${data.status}`);
      return true;
    } else {
      console.log(`❌ FAILED: ${url} - HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${url} - ${error.message}`);
    return false;
  }
}

async function testAllBackends() {
  console.log('🔍 Testing backend connectivity...\n');
  
  for (const url of POSSIBLE_BACKEND_URLS) {
    await testBackendConnection(url);
    console.log(''); // Empty line for readability
  }
  
  console.log('🏁 Backend connectivity test completed!');
}

testAllBackends(); 