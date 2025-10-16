require('dotenv/config');

console.log('🔍 Testing Environment Variable Loading...\n');

const requiredVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID'
];

console.log('📋 Environment Variables Status:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
  }
});

console.log('\n🔧 Testing app.config.js loading...');
try {
  const appConfig = require('../app.config.js');
  console.log('✅ app.config.js loaded successfully');
  
  const firebaseConfig = appConfig.expo.extra.firebase;
  console.log('\n🔥 Firebase Config in app.config.js:');
  Object.keys(firebaseConfig).forEach(key => {
    const value = firebaseConfig[key];
    if (value) {
      console.log(`✅ ${key}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${key}: MISSING`);
    }
  });
} catch (error) {
  console.log(`❌ Error loading app.config.js: ${error.message}`);
}
