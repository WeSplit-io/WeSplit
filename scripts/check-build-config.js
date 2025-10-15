#!/usr/bin/env node

/**
 * Build Configuration Checker
 * Validates that all required configurations are set for production builds
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Build Configuration...');
console.log('===================================\n');

// Check environment variables
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  process.exit(1);
}

require('dotenv').config();

// Required environment variables for production
const requiredVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
  'ANDROID_GOOGLE_CLIENT_ID',
  'IOS_GOOGLE_CLIENT_ID'
];

let missingVars = [];
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  process.exit(1);
}

// Check app.config.js
const appConfigPath = path.join(__dirname, '..', 'app.config.js');
if (!fs.existsSync(appConfigPath)) {
  console.error('❌ app.config.js not found!');
  process.exit(1);
}

// Check eas.json
const easConfigPath = path.join(__dirname, '..', 'eas.json');
if (!fs.existsSync(easConfigPath)) {
  console.error('❌ eas.json not found!');
  process.exit(1);
}

const easConfig = JSON.parse(fs.readFileSync(easConfigPath, 'utf8'));
if (!easConfig.build?.production?.env) {
  console.error('❌ Production build environment variables not configured in eas.json!');
  process.exit(1);
}

console.log('✅ All build configurations are valid!');
console.log('\n🚀 Ready to build:');
console.log('  iOS: eas build --platform ios --profile production');
console.log('  Android: eas build --platform android --profile production');
console.log('  Both: eas build --platform all --profile production');
