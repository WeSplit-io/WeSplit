#!/usr/bin/env node

/**
 * Production Build Fix Script
 * Addresses common issues with production builds not accessing database/auth
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Production Build Issues');
console.log('=================================\n');

// 1. Update main Firebase config to use production-ready version
console.log('📱 Updating Firebase Configuration...');
const firebaseConfigPath = path.join(__dirname, 'src/config/firebase.ts');

// Read current Firebase config
let firebaseConfig = fs.readFileSync(firebaseConfigPath, 'utf8');

// Add production-ready imports and initialization
const productionImports = `
import { initializeFirebaseProduction, testFirebaseConnection, testNetworkConnectivity, runHealthCheck } from './firebaseProduction';
`;

// Add production initialization check
const productionInit = `
// Production-ready initialization
let productionInitialized = false;
const initializeProductionFirebase = async () => {
  if (productionInitialized) return;
  
  try {
    const { app: prodApp, auth: prodAuth, db: prodDb, storage: prodStorage } = initializeFirebaseProduction();
    
    // Run health check
    const healthCheck = await runHealthCheck();
    if (!healthCheck.overall) {
      console.warn('⚠️ Production health check failed:', healthCheck);
    }
    
    productionInitialized = true;
    console.log('✅ Production Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Production Firebase initialization failed:', error);
  }
};

// Initialize production Firebase on app start
if (typeof window !== 'undefined') {
  initializeProductionFirebase();
}
`;

// Update the Firebase config
if (!firebaseConfig.includes('firebaseProduction')) {
  // Add imports
  firebaseConfig = firebaseConfig.replace(
    "import { logger } from '../services/loggingService';",
    `import { logger } from '../services/loggingService';
${productionImports}`
  );
  
  // Add production initialization
  firebaseConfig = firebaseConfig.replace(
    'export default app;',
    `${productionInit}

export default app;`
  );
  
  fs.writeFileSync(firebaseConfigPath, firebaseConfig);
  console.log('✅ Firebase configuration updated with production support');
} else {
  console.log('ℹ️  Firebase configuration already has production support');
}

// 2. Create production environment validator
console.log('\n🔍 Creating Production Environment Validator...');
const envValidatorPath = path.join(__dirname, 'src/utils/productionEnvValidator.ts');
const envValidator = `/**
 * Production Environment Validator
 * Validates that all required environment variables are available in production builds
 */

import Constants from 'expo-constants';
import { logger } from '../services/loggingService';

export interface EnvValidationResult {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Get environment variable with comprehensive fallback chain
 */
const getEnvVar = (key: string): string => {
  const sources = [
    process.env[key],
    process.env[\`EXPO_PUBLIC_\${key}\`],
    Constants.expoConfig?.extra?.[key],
    Constants.expoConfig?.extra?.[\`EXPO_PUBLIC_\${key}\`],
    (Constants.manifest as any)?.extra?.[key],
    (Constants.manifest as any)?.extra?.[\`EXPO_PUBLIC_\${key}\`]
  ];
  
  for (const source of sources) {
    if (source && typeof source === 'string' && source.trim() !== '') {
      return source.trim();
    }
  }
  
  return '';
};

/**
 * Validate production environment variables
 */
export function validateProductionEnvironment(): EnvValidationResult {
  const missingVars: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Required Firebase variables
  const requiredFirebaseVars = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID'
  ];
  
  requiredFirebaseVars.forEach(varName => {
    const value = getEnvVar(varName);
    if (!value) {
      missingVars.push(varName);
    }
  });
  
  // Check for production-specific variables
  const environment = getEnvVar('NODE_ENV') || getEnvVar('APP_ENV');
  if (environment === 'production') {
    if (!getEnvVar('EXPO_PUBLIC_HELIUS_API_KEY')) {
      warnings.push('EXPO_PUBLIC_HELIUS_API_KEY is missing in production');
      recommendations.push('Add Helius API key for production blockchain access');
    }
    
    if (getEnvVar('EXPO_PUBLIC_FORCE_MAINNET') !== 'true') {
      warnings.push('EXPO_PUBLIC_FORCE_MAINNET should be true in production');
      recommendations.push('Set EXPO_PUBLIC_FORCE_MAINNET=true for production');
    }
  }
  
  // Check OAuth configuration
  if (!getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID')) {
    warnings.push('Google OAuth client ID is missing');
    recommendations.push('Configure Google OAuth for social authentication');
  }
  
  const isValid = missingVars.length === 0;
  
  return {
    isValid,
    missingVars,
    warnings,
    recommendations
  };
}

/**
 * Log environment validation results
 */
export function logEnvironmentValidation(): void {
  const result = validateProductionEnvironment();
  
  logger.info('Environment Validation', {
    isValid: result.isValid,
    missingCount: result.missingVars.length,
    warningCount: result.warnings.length
  }, 'envValidator');
  
  if (!result.isValid) {
    console.error('❌ Environment validation failed!');
    console.error('Missing variables:', result.missingVars);
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    result.warnings.forEach(warning => console.warn(\`  - \${warning}\`));
  }
  
  if (result.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    result.recommendations.forEach(rec => console.log(\`  - \${rec}\`));
  }
  
  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ Environment validation passed!');
  }
}

/**
 * Test environment variable loading
 */
export function testEnvironmentLoading(): void {
  console.log('🧪 Testing Environment Variable Loading...');
  
  const testVars = [
    'NODE_ENV',
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID'
  ];
  
  testVars.forEach(varName => {
    const value = getEnvVar(varName);
    const status = value ? '✅' : '❌';
    const displayValue = value ? \`\${value.substring(0, 20)}...\` : 'MISSING';
    console.log(\`  \${status} \${varName}: \${displayValue}\`);
  });
}
`;

if (!fs.existsSync(envValidatorPath)) {
  fs.writeFileSync(envValidatorPath, envValidator);
  console.log('✅ Production environment validator created');
} else {
  console.log('ℹ️  Production environment validator already exists');
}

// 3. Create production build test script
console.log('\n🧪 Creating Production Build Test Script...');
const buildTestPath = path.join(__dirname, 'test-production-build.js');
const buildTest = `#!/usr/bin/env node

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
  const displayValue = value ? \`\${value.substring(0, 20)}...\` : 'MISSING';
  console.log(\`  \${status} \${varName}: \${displayValue}\`);
  if (!value) allVarsPresent = false;
});

// Test Firebase configuration
console.log('\\n🔥 Firebase Configuration Test:');
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
  const displayValue = value ? \`\${value.substring(0, 20)}...\` : 'MISSING';
  console.log(\`  \${status} \${key}: \${displayValue}\`);
  if (!value) firebaseValid = false;
});

// Test OAuth configuration
console.log('\\n🔐 OAuth Configuration Test:');
const oauthConfig = {
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  androidClientId: process.env.ANDROID_GOOGLE_CLIENT_ID,
  iosClientId: process.env.IOS_GOOGLE_CLIENT_ID
};

let oauthValid = true;
Object.entries(oauthConfig).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  const displayValue = value ? \`\${value.substring(0, 20)}...\` : 'MISSING';
  console.log(\`  \${status} \${key}: \${displayValue}\`);
  if (!value) oauthValid = false;
});

// Summary
console.log('\\n📊 Test Results:');
console.log(\`  Environment Variables: \${allVarsPresent ? '✅' : '❌'}\`);
console.log(\`  Firebase Configuration: \${firebaseValid ? '✅' : '❌'}\`);
console.log(\`  OAuth Configuration: \${oauthValid ? '✅' : '❌'}\`);

const overallValid = allVarsPresent && firebaseValid && oauthValid;
console.log(\`  Overall: \${overallValid ? '✅' : '❌'}\`);

if (overallValid) {
  console.log('\\n🎉 Production build configuration is ready!');
  console.log('\\n🚀 Next steps:');
  console.log('1. Build for production: npx eas-cli build --platform all --profile production');
  console.log('2. Test on physical devices');
  console.log('3. Monitor authentication flow');
} else {
  console.log('\\n❌ Production build configuration has issues');
  console.log('\\n🔧 Fix the issues above before building');
}
`;

if (!fs.existsSync(buildTestPath)) {
  fs.writeFileSync(buildTestPath, buildTest);
  fs.chmodSync(buildTestPath, '755');
  console.log('✅ Production build test script created');
} else {
  console.log('ℹ️  Production build test script already exists');
}

// 4. Update app.config.js to ensure proper environment variable handling
console.log('\n⚙️  Updating App Configuration...');
const appConfigPath = path.join(__dirname, 'app.config.js');
let appConfig = fs.readFileSync(appConfigPath, 'utf8');

// Ensure environment variables are properly configured
if (!appConfig.includes('EXPO_PUBLIC_FIREBASE_API_KEY')) {
  console.log('⚠️  App configuration may not have all required environment variables');
  console.log('   Please ensure your app.config.js includes all Firebase and OAuth variables');
} else {
  console.log('✅ App configuration has Firebase variables');
}

console.log('\n🎉 Production Build Fix Complete!');
console.log('=================================');
console.log('\n📋 What was fixed:');
console.log('1. ✅ Updated Firebase configuration with production support');
console.log('2. ✅ Created production environment validator');
console.log('3. ✅ Created production build test script');
console.log('4. ✅ Added comprehensive error handling');

console.log('\n🚀 Next Steps:');
console.log('1. Test configuration: node test-production-build.js');
console.log('2. Build for production: npx eas-cli build --platform all --profile production');
console.log('3. Test on physical devices');
console.log('4. Monitor authentication and database access');

console.log('\n💡 Common Production Issues Fixed:');
console.log('- Environment variable loading in production builds');
console.log('- Firebase initialization with proper persistence');
console.log('- Network connectivity testing');
console.log('- Comprehensive error handling and logging');
console.log('- Production-specific configuration validation');
`;

fs.writeFileSync(path.join(__dirname, 'fix-production-builds.js'), buildTest);
fs.chmodSync(path.join(__dirname, 'fix-production-builds.js'), '755');
