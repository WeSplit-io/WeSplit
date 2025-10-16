#!/usr/bin/env node

// Prebuild hook to ensure environment variables are properly loaded
require('dotenv/config');

console.log('🔧 Prebuild Hook: Verifying Environment Variables...');

const requiredVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID'
];

let missingVars = [];
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('💡 Make sure all Firebase environment variables are set in EAS');
  process.exit(1);
}

console.log('✅ All required environment variables are present');
console.log('🚀 Proceeding with prebuild...');
