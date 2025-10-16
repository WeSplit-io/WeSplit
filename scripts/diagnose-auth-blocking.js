#!/usr/bin/env node

/**
 * Comprehensive Authentication Blocking Diagnostics
 * This script identifies exactly what's preventing login in production APK
 */

require('dotenv/config');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class AuthBlockingDiagnostics {
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
    this.log('\n🔍 Authentication Blocking Diagnostics', 'bright');
    this.log('Identifying what prevents login in production APK...\n', 'info');

    await this.checkEnvironmentVariables();
    await this.checkFirebaseConfiguration();
    await this.checkOAuthConfiguration();
    await this.checkFirebaseFunctions();
    await this.checkNetworkConnectivity();
    await this.checkAuthenticationFlow();
    await this.checkProductionSpecificIssues();

    this.generateReport();
  }

  async checkEnvironmentVariables() {
    this.log('🔧 Checking Environment Variables...', 'bright');
    
    const requiredVars = [
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID',
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
      'EXPO_PUBLIC_APPLE_CLIENT_ID',
      'EXPO_PUBLIC_TWITTER_CLIENT_ID'
    ];

    let missingVars = [];
    let emptyVars = [];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        missingVars.push(varName);
      } else if (value.trim() === '') {
        emptyVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      this.issues.push(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    if (emptyVars.length > 0) {
      this.issues.push(`Empty environment variables: ${emptyVars.join(', ')}`);
    }

    if (missingVars.length === 0 && emptyVars.length === 0) {
      this.log('✅ All required environment variables are present', 'success');
    }
  }

  async checkFirebaseConfiguration() {
    this.log('\n🔥 Checking Firebase Configuration...', 'bright');
    
    try {
      // Check if Firebase config is properly loaded
      const appConfigPath = path.join(this.projectRoot, 'app.config.js');
      
      // Read the file content to check for Firebase configuration
      const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
      
      if (!appConfigContent.includes('firebase:') || !appConfigContent.includes('apiKey:')) {
        this.issues.push('Firebase configuration missing from app.config.js extra section');
      } else {
        this.log('✅ Firebase configuration found in app.config.js', 'success');
      }

      // Check Firebase Functions configuration
      const firebaseFunctionsPath = path.join(this.projectRoot, 'src/services/firebaseFunctionsService.ts');
      if (fs.existsSync(firebaseFunctionsPath)) {
        const content = fs.readFileSync(firebaseFunctionsPath, 'utf8');
        
        if (!content.includes('getEnvVar')) {
          this.issues.push('Firebase Functions service not using proper environment variable loading');
        }
        
        if (!content.includes('us-central1')) {
          this.warnings.push('Firebase Functions region not specified (should be us-central1)');
        }
        
        this.log('✅ Firebase Functions service configuration looks good', 'success');
      }

    } catch (error) {
      this.issues.push(`Firebase configuration check failed: ${error.message}`);
    }
  }

  async checkOAuthConfiguration() {
    this.log('\n🔐 Checking OAuth Configuration...', 'bright');
    
    const oauthProviders = [
      { name: 'Google', clientId: 'EXPO_PUBLIC_GOOGLE_CLIENT_ID', androidId: 'ANDROID_GOOGLE_CLIENT_ID' },
      { name: 'Apple', clientId: 'EXPO_PUBLIC_APPLE_CLIENT_ID', serviceId: 'EXPO_PUBLIC_APPLE_SERVICE_ID' },
      { name: 'Twitter', clientId: 'EXPO_PUBLIC_TWITTER_CLIENT_ID' }
    ];

    oauthProviders.forEach(provider => {
      const clientId = process.env[provider.clientId];
      if (!clientId) {
        this.issues.push(`${provider.name} OAuth client ID missing`);
      } else {
        this.log(`✅ ${provider.name} OAuth client ID present`, 'success');
      }

      if (provider.androidId && !process.env[provider.androidId]) {
        this.issues.push(`${provider.name} Android client ID missing`);
      }

      if (provider.serviceId && !process.env[provider.serviceId]) {
        this.issues.push(`${provider.name} service ID missing`);
      }
    });
  }

  async checkFirebaseFunctions() {
    this.log('\n⚡ Checking Firebase Functions...', 'bright');
    
    try {
      // Check if Firebase Functions are deployed
      const functionsPath = path.join(this.projectRoot, 'firebase-functions');
      if (!fs.existsSync(functionsPath)) {
        this.issues.push('Firebase Functions directory not found');
        return;
      }

      // Check Firebase Functions configuration
      const packageJsonPath = path.join(functionsPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        this.log('✅ Firebase Functions package.json found', 'success');
      }

      // Check if functions are properly configured
      const srcPath = path.join(functionsPath, 'src');
      if (fs.existsSync(srcPath)) {
        const files = fs.readdirSync(srcPath);
        if (files.includes('index.js')) {
          this.log('✅ Firebase Functions source files found', 'success');
        } else {
          this.issues.push('Firebase Functions index.js not found');
        }
      }

    } catch (error) {
      this.issues.push(`Firebase Functions check failed: ${error.message}`);
    }
  }

  async checkNetworkConnectivity() {
    this.log('\n🌐 Checking Network Connectivity...', 'bright');
    
    const endpoints = [
      'https://firebase.googleapis.com',
      'https://identitytoolkit.googleapis.com',
      'https://us-central1-wesplit-35186.cloudfunctions.net'
    ];

    for (const endpoint of endpoints) {
      try {
        // Simple connectivity check
        const { execSync } = require('child_process');
        execSync(`curl -s --connect-timeout 5 ${endpoint} > /dev/null`, { stdio: 'pipe' });
        this.log(`✅ ${endpoint} is reachable`, 'success');
      } catch (error) {
        this.warnings.push(`Network connectivity issue with ${endpoint}`);
      }
    }
  }

  async checkAuthenticationFlow() {
    this.log('\n🔑 Checking Authentication Flow...', 'bright');
    
    // Check AuthMethodsScreen
    const authMethodsPath = path.join(this.projectRoot, 'src/screens/AuthMethods/AuthMethodsScreen.tsx');
    if (fs.existsSync(authMethodsPath)) {
      const content = fs.readFileSync(authMethodsPath, 'utf8');
      
      // Check for timeout handling
      if (content.includes('setTimeout') && content.includes('reject')) {
        this.log('✅ Timeout handling found in authentication flow', 'success');
      } else {
        this.warnings.push('No timeout handling found in authentication flow');
      }

      // Check for error handling
      if (content.includes('catch') && content.includes('error')) {
        this.log('✅ Error handling found in authentication flow', 'success');
      } else {
        this.issues.push('Insufficient error handling in authentication flow');
      }

      // Check for loading states
      if (content.includes('setLoading')) {
        this.log('✅ Loading states found in authentication flow', 'success');
      } else {
        this.warnings.push('No loading states found in authentication flow');
      }
    }
  }

  async checkProductionSpecificIssues() {
    this.log('\n🏭 Checking Production-Specific Issues...', 'bright');
    
    // Check if prebuild is properly configured
    const easJsonPath = path.join(this.projectRoot, 'eas.json');
    if (fs.existsSync(easJsonPath)) {
      const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
      
      if (easConfig.build?.production?.prebuildCommand) {
        this.log('✅ Prebuild command configured in EAS', 'success');
      } else {
        this.issues.push('No prebuild command configured in EAS production profile');
      }

      if (easConfig.build?.production?.cache?.disabled) {
        this.log('✅ Cache disabled in EAS production profile', 'success');
      } else {
        this.warnings.push('Cache not disabled in EAS production profile');
      }
    }

    // Check if android/ios directories are in .gitignore
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      
      if (gitignoreContent.includes('android/') && gitignoreContent.includes('ios/')) {
        this.log('✅ android/ and ios/ directories are in .gitignore', 'success');
      } else {
        this.issues.push('android/ and ios/ directories not in .gitignore - this prevents prebuild from running');
      }
    }
  }

  generateReport() {
    this.log('\n📊 DIAGNOSTIC REPORT', 'bright');
    this.log('=' * 50, 'bright');

    if (this.issues.length === 0) {
      this.log('\n🎉 No critical issues found!', 'success');
    } else {
      this.log('\n❌ CRITICAL ISSUES FOUND:', 'error');
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

    if (this.issues.length > 0 || this.warnings.length > 0) {
      this.log('\n🔧 RECOMMENDATIONS:', 'bright');
      
      if (this.issues.some(issue => issue.includes('environment variables'))) {
        this.log('• Verify all environment variables are set in EAS', 'info');
        this.log('• Run: eas env:list --environment production', 'info');
      }
      
      if (this.issues.some(issue => issue.includes('prebuild'))) {
        this.log('• Ensure prebuild runs in EAS by adding prebuildCommand', 'info');
        this.log('• Add android/ and ios/ to .gitignore', 'info');
      }
      
      if (this.issues.some(issue => issue.includes('Firebase'))) {
        this.log('• Verify Firebase Functions are deployed', 'info');
        this.log('• Check Firebase project configuration', 'info');
      }
      
      this.log('\n🚀 Next Steps:', 'bright');
      this.log('1. Fix all critical issues listed above', 'info');
      this.log('2. Test authentication locally with production environment', 'info');
      this.log('3. Build and test the APK', 'info');
    }

    this.log('\n' + '=' * 50, 'bright');
  }
}

// Run diagnostics
const diagnostics = new AuthBlockingDiagnostics();
diagnostics.runDiagnostics().catch(console.error);
