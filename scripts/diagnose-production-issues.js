#!/usr/bin/env node

/**
 * Diagnose Production Authentication Issues
 * This script helps identify why authentication might still fail in production APK
 */

require('dotenv/config');
const fs = require('fs');
const path = require('path');

class ProductionIssueDiagnostics {
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
    this.log('\n🔍 PRODUCTION ISSUE DIAGNOSTICS', 'bright');
    this.log('Identifying why authentication might still fail in production APK...\n', 'info');

    await this.checkBuildInclusion();
    await this.checkEnvironmentVariables();
    await this.checkFirebaseConfiguration();
    await this.checkCodeChanges();
    await this.checkBuildConfiguration();
    await this.checkFirebaseFunctions();

    this.generateDiagnosticReport();
  }

  async checkBuildInclusion() {
    this.log('📦 Checking if fixes are included in build...', 'bright');
    
    // Check if our latest commits are in the build
    const authMethodsPath = path.join(this.projectRoot, 'src/screens/AuthMethods/AuthMethodsScreen.tsx');
    if (fs.existsSync(authMethodsPath)) {
      const content = fs.readFileSync(authMethodsPath, 'utf8');
      
      // Check for our specific fixes
      if (content.includes('authenticating directly without Firebase Auth')) {
        this.log('✅ Account duplication fix is in the code', 'success');
      } else {
        this.issues.push('Account duplication fix not found in AuthMethodsScreen');
      }

      if (content.includes('User not found in Firestore, proceeding with verification flow')) {
        this.log('✅ New user verification flow fix is in the code', 'success');
      } else {
        this.issues.push('New user verification flow fix not found');
      }
    }
  }

  async checkEnvironmentVariables() {
    this.log('\n🔧 Checking Environment Variables...', 'bright');
    
    const requiredVars = [
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID'
    ];

    let missingVars = [];
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length === 0) {
      this.log('✅ All required Firebase environment variables present locally', 'success');
    } else {
      this.issues.push(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
    }

    // Check if variables are properly configured in app.config.js
    const appConfigPath = path.join(this.projectRoot, 'app.config.js');
    if (fs.existsSync(appConfigPath)) {
      const content = fs.readFileSync(appConfigPath, 'utf8');
      
      if (content.includes('firebase:') && content.includes('apiKey:')) {
        this.log('✅ Firebase configuration object in app.config.js', 'success');
      } else {
        this.issues.push('Firebase configuration object missing from app.config.js');
      }
    }
  }

  async checkFirebaseConfiguration() {
    this.log('\n🔥 Checking Firebase Configuration...', 'bright');
    
    const firebaseConfigPath = path.join(this.projectRoot, 'src/config/firebase.ts');
    if (fs.existsSync(firebaseConfigPath)) {
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
        this.warnings.push('Firebase config missing validation for required variables');
      }
    }
  }

  async checkCodeChanges() {
    this.log('\n📝 Checking Code Changes...', 'bright');
    
    const authMethodsPath = path.join(this.projectRoot, 'src/screens/AuthMethods/AuthMethodsScreen.tsx');
    if (fs.existsSync(authMethodsPath)) {
      const content = fs.readFileSync(authMethodsPath, 'utf8');
      
      // Check for the problematic code that should be removed
      if (content.includes('firebaseAuth.createUserWithEmail(sanitizedEmail, temporaryPassword)')) {
        this.issues.push('Still contains problematic Firebase Auth user creation code');
      } else {
        this.log('✅ Problematic Firebase Auth user creation code removed', 'success');
      }

      // Check for proper existing user handling
      if (content.includes('authenticating directly without Firebase Auth')) {
        this.log('✅ Proper existing user authentication implemented', 'success');
      } else {
        this.issues.push('Proper existing user authentication not implemented');
      }
    }
  }

  async checkBuildConfiguration() {
    this.log('\n🏗️ Checking Build Configuration...', 'bright');
    
    // Check EAS configuration
    const easJsonPath = path.join(this.projectRoot, 'eas.json');
    if (fs.existsSync(easJsonPath)) {
      const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
      
      if (easConfig.build?.production?.prebuildCommand) {
        this.log('✅ Prebuild command configured for production', 'success');
      } else {
        this.issues.push('Prebuild command not configured for production');
      }

      if (easConfig.build?.production?.cache?.disabled) {
        this.log('✅ Cache disabled for production builds', 'success');
      } else {
        this.warnings.push('Cache not disabled for production builds');
      }
    }

    // Check .gitignore
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      
      if (gitignoreContent.includes('android/') && gitignoreContent.includes('ios/')) {
        this.log('✅ Native directories in .gitignore', 'success');
      } else {
        this.issues.push('Native directories not in .gitignore - will prevent prebuild');
      }
    }
  }

  async checkFirebaseFunctions() {
    this.log('\n⚡ Checking Firebase Functions...', 'bright');
    
    const functionsServicePath = path.join(this.projectRoot, 'src/services/firebaseFunctionsService.ts');
    if (fs.existsSync(functionsServicePath)) {
      const content = fs.readFileSync(functionsServicePath, 'utf8');
      
      // Check for proper environment variable loading
      if (content.includes('getEnvVar') && content.includes('Constants.expoConfig')) {
        this.log('✅ Firebase Functions service uses proper environment variable loading', 'success');
      } else {
        this.issues.push('Firebase Functions service not using proper environment variable loading');
      }

      // Check for timeout configuration
      if (content.includes('timeout: 60000')) {
        this.log('✅ Firebase Functions timeout configured (60s)', 'success');
      } else {
        this.warnings.push('Firebase Functions timeout not configured or too short');
      }
    }

    // Check if Firebase Functions are deployed
    const functionsPath = path.join(this.projectRoot, 'firebase-functions');
    if (fs.existsSync(functionsPath)) {
      this.log('✅ Firebase Functions directory exists', 'success');
    } else {
      this.issues.push('Firebase Functions directory not found');
    }
  }

  generateDiagnosticReport() {
    this.log('\n📊 PRODUCTION ISSUE DIAGNOSTIC REPORT', 'bright');
    this.log('=' * 60, 'bright');

    if (this.issues.length === 0) {
      this.log('\n🎉 CODE LOOKS GOOD!', 'success');
      this.log('All fixes are properly implemented in the codebase.', 'success');
    } else {
      this.log('\n❌ ISSUES FOUND IN CODE:', 'error');
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

    this.log('\n🔍 POSSIBLE CAUSES IF STILL FAILING:', 'bright');
    this.log('1. Build cache issues - EAS might be using cached code', 'info');
    this.log('2. Environment variables not loading in production APK', 'info');
    this.log('3. Firebase Functions not deployed or not working', 'info');
    this.log('4. Network connectivity issues in production', 'info');
    this.log('5. Firebase project configuration issues', 'info');
    this.log('6. OAuth provider configuration issues', 'info');

    this.log('\n🚀 TROUBLESHOOTING STEPS:', 'bright');
    this.log('1. Check if the build actually included our latest commits', 'info');
    this.log('2. Verify Firebase Functions are deployed and working', 'info');
    this.log('3. Test Firebase Functions endpoints directly', 'info');
    this.log('4. Check EAS environment variables are set correctly', 'info');
    this.log('5. Try a completely clean build with --clear-cache', 'info');
    this.log('6. Test authentication flow step by step', 'info');

    this.log('\n📱 IMMEDIATE ACTIONS:', 'bright');
    this.log('1. Wait for current build to complete and test it', 'info');
    this.log('2. If still failing, run: eas build --platform android --profile production --clear-cache', 'info');
    this.log('3. Check Firebase Functions deployment status', 'info');
    this.log('4. Verify EAS environment variables', 'info');

    this.log('\n' + '=' * 60, 'bright');
  }
}

// Run diagnostics
const diagnostics = new ProductionIssueDiagnostics();
diagnostics.runDiagnostics().catch(console.error);
