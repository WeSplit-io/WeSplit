#!/usr/bin/env node

/**
 * Production Build Test Script
 * Tests production build configuration and connectivity
 */

require('dotenv').config();

console.log('🧪 Testing Production Build Configuration');
console.log('=========================================\n');

// Test environment variables
console.log('📋 Environment Variables Test:');
const requiredVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
  'ANDROID_GOOGLE_CLIENT_ID',
  'IOS_GOOGLE_CLIENT_ID'
];

let allVarsPresent = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value ? `${value.substring(0, 20)}...` : 'MISSING';
  console.log(`  ${status} ${varName}: ${displayValue}`);
  if (!value) allVarsPresent = false;
});

// Test Firebase configuration
console.log('\n🔥 Firebase Configuration Test:');
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

let firebaseValid = true;
Object.entries(firebaseConfig).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  const displayValue = value ? `${value.substring(0, 20)}...` : 'MISSING';
  console.log(`  ${status} ${key}: ${displayValue}`);
  if (!value) firebaseValid = false;
});

// Test OAuth configuration
console.log('\n🔐 OAuth Configuration Test:');
const oauthConfig = {
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  androidClientId: process.env.ANDROID_GOOGLE_CLIENT_ID,
  iosClientId: process.env.IOS_GOOGLE_CLIENT_ID
};

let oauthValid = true;
Object.entries(oauthConfig).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  const displayValue = value ? `${value.substring(0, 20)}...` : 'MISSING';
  console.log(`  ${status} ${key}: ${displayValue}`);
  if (!value) oauthValid = false;
});

// Summary
console.log('\n📊 Test Results:');
console.log(`  Environment Variables: ${allVarsPresent ? '✅' : '❌'}`);
console.log(`  Firebase Configuration: ${firebaseValid ? '✅' : '❌'}`);
console.log(`  OAuth Configuration: ${oauthValid ? '✅' : '❌'}`);

const overallValid = allVarsPresent && firebaseValid && oauthValid;
console.log(`  Overall: ${overallValid ? '✅' : '❌'}`);

if (overallValid) {
  console.log('\n🎉 Production build configuration is ready!');
  console.log('\n🚀 Next steps:');
  console.log('1. Build for production: npx eas-cli build --platform all --profile production');
  console.log('2. Test on physical devices');
  console.log('3. Monitor authentication flow');
} else {
  console.log('\n❌ Production build configuration has issues');
  console.log('\n🔧 Fix the issues above before building');
}
