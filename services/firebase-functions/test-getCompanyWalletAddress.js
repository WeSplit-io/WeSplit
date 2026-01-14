/**
 * Test script for getCompanyWalletAddress function
 * Tests the function directly to verify it's working
 */

const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');

// Firebase config (use your project config)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyC...", // Replace with your API key
  authDomain: "wesplit-35186.firebaseapp.com",
  projectId: "wesplit-35186",
  storageBucket: "wesplit-35186.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

async function testGetCompanyWalletAddress() {
  try {
    console.log('🧪 Testing getCompanyWalletAddress function...\n');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const functions = getFunctions(app, 'us-central1');
    
    // Connect to production (not emulator)
    console.log('📡 Connecting to production Firebase Functions...');
    
    // Create callable function
    const getCompanyWalletAddress = httpsCallable(functions, 'getCompanyWalletAddress', {
      timeout: 10000
    });
    
    console.log('📞 Calling getCompanyWalletAddress function...\n');
    
    // Call the function
    const result = await getCompanyWalletAddress({});
    
    console.log('✅ Function call successful!');
    console.log('📋 Response:', JSON.stringify(result.data, null, 2));
    
    if (result.data && result.data.success && result.data.address) {
      const address = result.data.address;
      const expectedAddress = process.env.COMPANY_WALLET_ADDRESS;
      
      console.log('\n✅ SUCCESS!');
      console.log(`   Address: ${address}`);
      console.log(`   Length: ${address.length} characters`);
      
      if (expectedAddress) {
        console.log(`   Expected: ${expectedAddress}`);
        if (address === expectedAddress) {
          console.log('   ✅ Address matches expected value!');
        } else {
          console.log('   ⚠️  Address does not match expected value');
        }
      } else {
        console.log('   ℹ️  Set COMPANY_WALLET_ADDRESS env var to verify address matches');
      }
    } else {
      console.log('\n❌ ERROR: Invalid response format');
      console.log('   Response:', result.data);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
    
    if (error.code === 'functions/not-found') {
      console.error('\n💡 Function not found. Make sure it\'s deployed:');
      console.error('   firebase deploy --only functions:getCompanyWalletAddress');
    } else if (error.code === 'functions/permission-denied' || error.code === 'permission-denied') {
      console.error('\n💡 Permission denied. Make sure you set IAM permissions:');
      console.error('   - Go to Firebase Console → Functions → getCompanyWalletAddress');
      console.error('   - Click Permissions tab');
      console.error('   - Add "allUsers" with role "Cloud Functions Invoker"');
    } else if (error.code === 'unauthenticated') {
      console.error('\n💡 Unauthenticated. Make sure permissions allow unauthenticated access.');
    }
    
    process.exit(1);
  }
}

// Run test
testGetCompanyWalletAddress();

