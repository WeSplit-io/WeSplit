#!/usr/bin/env node

/**
 * Diagnose Firebase Functions APK Issues
 * This script identifies why Firebase Functions work locally but not in APK
 */

require('dotenv/config');
const fs = require('fs');
const path = require('path');

class FirebaseFunctionsAPKDiagnostics {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = [];
    this.warnings = [];
    this.recommendations = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      bright: '\x1b[1m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async runDiagnostics() {
    this.log('\n🔍 FIREBASE FUNCTIONS APK DIAGNOSTICS', 'bright');
    this.log('Identifying why Firebase Functions work locally but not in APK...\n', 'info');

    await this.checkEnvironmentVariableLoading();
    await this.checkFirebaseFunctionsService();
    await this.checkAppConfig();
    await this.checkEASConfiguration();
    await this.checkFirebaseInitialization();

    this.generateDiagnosticReport();
  }

  async checkEnvironmentVariableLoading() {
    this.log('🔧 Checking Environment Variable Loading...', 'bright');
    
    const firebaseFunctionsPath = path.join(this.projectRoot, 'src/services/firebaseFunctionsService.ts');
    if (!fs.existsSync(firebaseFunctionsPath)) {
      this.issues.push('Firebase Functions service not found');
      return;
    }

    const content = fs.readFileSync(firebaseFunctionsPath, 'utf8');

    // Check for proper environment variable loading
    if (content.includes('getEnvVar') && content.includes('Constants.expoConfig')) {
      this.log('✅ Firebase Functions service uses getEnvVar function', 'success');
    } else {
      this.issues.push('Firebase Functions service not using getEnvVar function');
    }

    // Check for proper Firebase config loading
    if (content.includes('getEnvVar(\'FIREBASE_API_KEY\')')) {
      this.log('✅ Firebase API key loaded via getEnvVar', 'success');
    } else {
      this.issues.push('Firebase API key not loaded via getEnvVar');
    }

    // Check for validation
    if (content.includes('if (!apiKey)') && content.includes('throw new Error')) {
      this.log('✅ Firebase config validation implemented', 'success');
    } else {
      this.warnings.push('Firebase config validation not implemented');
    }

    // Check for all required Firebase config variables
    const requiredConfigVars = [
      'FIREBASE_API_KEY',
      'FIREBASE_AUTH_DOMAIN',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET',
      'FIREBASE_MESSAGING_SENDER_ID',
      'FIREBASE_APP_ID'
    ];

    let missingConfigVars = [];
    requiredConfigVars.forEach(varName => {
      if (!content.includes(`getEnvVar('${varName}')`)) {
        missingConfigVars.push(varName);
      }
    });

    if (missingConfigVars.length === 0) {
      this.log('✅ All required Firebase config variables loaded via getEnvVar', 'success');
    } else {
      this.issues.push(`Missing Firebase config variables: ${missingConfigVars.join(', ')}`);
    }
  }

  async checkFirebaseFunctionsService() {
    this.log('\n⚡ Checking Firebase Functions Service...', 'bright');
    
    const firebaseFunctionsPath = path.join(this.projectRoot, 'src/services/firebaseFunctionsService.ts');
    const content = fs.readFileSync(firebaseFunctionsPath, 'utf8');

    // Check for proper Firebase Functions initialization
    if (content.includes('getFunctions(app, \'us-central1\')')) {
      this.log('✅ Firebase Functions initialized with correct region (us-central1)', 'success');
    } else {
      this.issues.push('Firebase Functions not initialized with correct region');
    }

    // Check for timeout configuration
    if (content.includes('timeout: 60000')) {
      this.log('✅ Firebase Functions timeout configured (60s)', 'success');
    } else {
      this.warnings.push('Firebase Functions timeout not configured or too short');
    }

    // Check for proper function calls
    if (content.includes('sendVerificationEmailFunction') && content.includes('verifyCodeFunction')) {
      this.log('✅ Firebase Functions callable functions configured', 'success');
    } else {
      this.issues.push('Firebase Functions callable functions not configured');
    }

    // Check for error handling
    if (content.includes('functions/resource-exhausted') && content.includes('functions/invalid-argument')) {
      this.log('✅ Firebase Functions error handling implemented', 'success');
    } else {
      this.warnings.push('Firebase Functions error handling not implemented');
    }
  }

  async checkAppConfig() {
    this.log('\n📱 Checking App Configuration...', 'bright');
    
    const appConfigPath = path.join(this.projectRoot, 'app.config.js');
    if (!fs.existsSync(appConfigPath)) {
      this.issues.push('app.config.js not found');
      return;
    }

    const content = fs.readFileSync(appConfigPath, 'utf8');

    // Check for Firebase configuration in extra section
    if (content.includes('firebase:') && content.includes('apiKey:')) {
      this.log('✅ Firebase configuration object in app.config.js extra section', 'success');
    } else {
      this.issues.push('Firebase configuration object missing from app.config.js extra section');
    }

    // Check for environment variable references
    if (content.includes('process.env.EXPO_PUBLIC_FIREBASE_API_KEY')) {
      this.log('✅ Environment variables referenced in app.config.js', 'success');
    } else {
      this.issues.push('Environment variables not referenced in app.config.js');
    }

    // Check for all required Firebase environment variables
    const requiredEnvVars = [
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID'
    ];

    let missingEnvVars = [];
    requiredEnvVars.forEach(varName => {
      if (!content.includes(`process.env.${varName}`)) {
        missingEnvVars.push(varName);
      }
    });

    if (missingEnvVars.length === 0) {
      this.log('✅ All required Firebase environment variables in app.config.js', 'success');
    } else {
      this.issues.push(`Missing Firebase environment variables in app.config.js: ${missingEnvVars.join(', ')}`);
    }
  }

  async checkEASConfiguration() {
    this.log('\n🏗️ Checking EAS Configuration...', 'bright');
    
    const easJsonPath = path.join(this.projectRoot, 'eas.json');
    if (!fs.existsSync(easJsonPath)) {
      this.issues.push('eas.json not found');
      return;
    }

    const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));

    // Check for Firebase environment variables in EAS config
    if (easConfig.build?.production?.env) {
      const envConfig = easConfig.build.production.env;
      
      const requiredEASVars = [
        'EXPO_PUBLIC_FIREBASE_API_KEY',
        'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
        'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'EXPO_PUBLIC_FIREBASE_APP_ID'
      ];

      let missingEASVars = [];
      requiredEASVars.forEach(varName => {
        if (!envConfig[varName]) {
          missingEASVars.push(varName);
        }
      });

      if (missingEASVars.length === 0) {
        this.log('✅ All required Firebase environment variables in EAS config', 'success');
      } else {
        this.issues.push(`Missing Firebase environment variables in EAS config: ${missingEASVars.join(', ')}`);
      }
    } else {
      this.issues.push('No environment variables configured in EAS production profile');
    }

    // Check for prebuild command
    if (easConfig.build?.production?.prebuildCommand) {
      this.log('✅ Prebuild command configured for production', 'success');
    } else {
      this.issues.push('Prebuild command not configured for production');
    }

    // Check for cache disabled
    if (easConfig.build?.production?.cache?.disabled) {
      this.log('✅ Cache disabled for production builds', 'success');
    } else {
      this.warnings.push('Cache not disabled for production builds');
    }
  }

  async checkFirebaseInitialization() {
    this.log('\n🔥 Checking Firebase Initialization...', 'bright');
    
    const firebaseConfigPath = path.join(this.projectRoot, 'src/config/firebase.ts');
    if (!fs.existsSync(firebaseConfigPath)) {
      this.issues.push('Firebase config file not found');
      return;
    }

    const content = fs.readFileSync(firebaseConfigPath, 'utf8');

    // Check for proper environment variable loading
    if (content.includes('getEnvVar') && content.includes('Constants.expoConfig')) {
      this.log('✅ Firebase config uses proper environment variable loading', 'success');
    } else {
      this.issues.push('Firebase config not using proper environment variable loading');
    }

    // Check for validation
    if (content.includes('if (!apiKey)') && content.includes('throw new Error')) {
      this.log('✅ Firebase config has proper validation', 'success');
    } else {
      this.warnings.push('Firebase config missing validation');
    }

    // Check for proper Firebase app initialization
    if (content.includes('initializeApp(firebaseConfig)')) {
      this.log('✅ Firebase app initialization implemented', 'success');
    } else {
      this.issues.push('Firebase app initialization not implemented');
    }
  }

  generateDiagnosticReport() {
    this.log('\n📊 FIREBASE FUNCTIONS APK DIAGNOSTIC REPORT', 'bright');
    this.log('=' * 60, 'bright');

    if (this.issues.length === 0) {
      this.log('\n🎉 FIREBASE FUNCTIONS CONFIGURATION LOOKS GOOD!', 'success');
      this.log('The issue is likely with environment variable loading in production.', 'success');
    } else {
      this.log('\n❌ ISSUES FOUND:', 'error');
      this.issues.forEach((issue, index) => {
        this.log(`${index + 1}. ${issue}`, 'error');
      });
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️ WARNINGS:', 'warning');
      this.warnings.forEach((warning, index) => {
        this.log(`${index + 1}. ${warning}`, 'warning');
      });
    }

    this.log('\n🔍 WHY FIREBASE FUNCTIONS WORK LOCALLY BUT NOT IN APK:', 'bright');
    this.log('1. Environment variables loaded from .env file locally ✅', 'info');
    this.log('2. Environment variables NOT loaded properly in production APK ❌', 'error');
    this.log('3. Firebase Functions can\'t initialize without proper config ❌', 'error');
    this.log('4. This causes authentication to fail in production ❌', 'error');

    this.log('\n🚀 SOLUTIONS:', 'bright');
    this.log('1. Verify EAS environment variables are set correctly', 'info');
    this.log('2. Check if environment variables are being loaded in production', 'info');
    this.log('3. Add debug logging to see what config values are loaded', 'info');
    this.log('4. Ensure prebuild is running to generate proper config', 'info');

    this.log('\n📱 IMMEDIATE ACTIONS:', 'bright');
    this.log('1. Check EAS environment variables: eas env:list --environment production', 'info');
    this.log('2. Verify Firebase config is being loaded in production', 'info');
    this.log('3. Add debug logging to Firebase Functions service', 'info');
    this.log('4. Test with a clean build: eas build --platform android --profile production --clear-cache', 'info');

    this.log('\n🔧 DEBUGGING STEPS:', 'bright');
    this.log('1. Add console.log to see what config values are loaded in production', 'info');
    this.log('2. Check if Constants.expoConfig.extra is populated in production', 'info');
    this.log('3. Verify Firebase Functions endpoints are reachable from production', 'info');
    this.log('4. Test Firebase Functions directly with production config', 'info');

    this.log('\n' + '=' * 60, 'bright');
  }
}

// Run diagnostics
const diagnostics = new FirebaseFunctionsAPKDiagnostics();
diagnostics.runDiagnostics().catch(console.error);
