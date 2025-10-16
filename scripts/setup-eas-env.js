#!/usr/bin/env node

/**
 * EAS Environment Variables Setup Script
 * Helps set up environment variables for production builds
 */

// Load environment variables first
require('dotenv/config');

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class EASEnvironmentSetup {
  constructor() {
    this.envVars = this.getEnvironmentVariables();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  getEnvironmentVariables() {
    return {
      // Firebase Configuration
      'EXPO_PUBLIC_FIREBASE_API_KEY': process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN': process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID': process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET': process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      'EXPO_PUBLIC_FIREBASE_APP_ID': process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID': process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,

      // OAuth Configuration
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID': process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      'EXPO_PUBLIC_GOOGLE_CLIENT_SECRET': process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET,
      'ANDROID_GOOGLE_CLIENT_ID': process.env.ANDROID_GOOGLE_CLIENT_ID,
      'IOS_GOOGLE_CLIENT_ID': process.env.IOS_GOOGLE_CLIENT_ID,

      // Apple Sign-In
      'EXPO_PUBLIC_APPLE_CLIENT_ID': process.env.EXPO_PUBLIC_APPLE_CLIENT_ID,
      'EXPO_PUBLIC_APPLE_SERVICE_ID': process.env.EXPO_PUBLIC_APPLE_SERVICE_ID,
      'EXPO_PUBLIC_APPLE_TEAM_ID': process.env.EXPO_PUBLIC_APPLE_TEAM_ID,
      'EXPO_PUBLIC_APPLE_KEY_ID': process.env.EXPO_PUBLIC_APPLE_KEY_ID,

      // Twitter OAuth
      'EXPO_PUBLIC_TWITTER_CLIENT_ID': process.env.EXPO_PUBLIC_TWITTER_CLIENT_ID,
      'EXPO_PUBLIC_TWITTER_CLIENT_SECRET': process.env.EXPO_PUBLIC_TWITTER_CLIENT_SECRET,

      // Solana Configuration
      'EXPO_PUBLIC_HELIUS_API_KEY': process.env.EXPO_PUBLIC_HELIUS_API_KEY,
      'EXPO_PUBLIC_FORCE_MAINNET': process.env.EXPO_PUBLIC_FORCE_MAINNET,
      'EXPO_PUBLIC_DEV_NETWORK': process.env.EXPO_PUBLIC_DEV_NETWORK,

      // Company Configuration
      'EXPO_PUBLIC_COMPANY_WALLET_ADDRESS': process.env.EXPO_PUBLIC_COMPANY_WALLET_ADDRESS,
      'EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY': process.env.EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY,
      'EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE': process.env.EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE,
      'EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE': process.env.EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE,
      'EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE': process.env.EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE,
      'EXPO_PUBLIC_COMPANY_MIN_FEE': process.env.EXPO_PUBLIC_COMPANY_MIN_FEE,
      'EXPO_PUBLIC_COMPANY_MAX_FEE': process.env.EXPO_PUBLIC_COMPANY_MAX_FEE,
    };
  }

  generateEASCommands() {
    this.log('\n🔧 EAS Environment Variables Setup Commands', 'cyan');
    this.log('Copy and run these commands to set up your EAS environment variables:\n', 'yellow');

    const commands = [];
    
    for (const [key, value] of Object.entries(this.envVars)) {
      if (value && value !== 'undefined' && value.trim() !== '') {
        const command = `eas env:create --name ${key} --value "${value}" --environment production`;
        commands.push(command);
        this.log(command, 'green');
      } else {
        this.log(`# Missing: ${key}`, 'red');
      }
    }

    return commands;
  }

  generateEASJSON() {
    this.log('\n📄 Alternative: Update eas.json with environment variables', 'cyan');
    
    const envConfig = {};
    for (const [key, value] of Object.entries(this.envVars)) {
      if (value && value !== 'undefined' && value.trim() !== '') {
        envConfig[key] = `\${${key}}`;
      }
    }

    const easJsonUpdate = {
      "build": {
        "production": {
          "env": envConfig
        }
      }
    };

    this.log('Add this to your eas.json build.production section:', 'yellow');
    this.log(JSON.stringify(easJsonUpdate, null, 2), 'green');
  }

  generateAndroidSHA1Instructions() {
    this.log('\n🔐 Android OAuth Setup Instructions', 'cyan');
    this.log('For Google OAuth to work in production Android builds, you need to add SHA-1 fingerprints:', 'yellow');
    
    this.log('\n1. Get your debug SHA-1 fingerprint:', 'green');
    this.log('   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android', 'blue');
    
    this.log('\n2. Get your release SHA-1 fingerprint:', 'green');
    this.log('   keytool -list -v -keystore android/app/release.keystore -alias release -storepass YOUR_STORE_PASSWORD -keypass YOUR_KEY_PASSWORD', 'blue');
    
    this.log('\n3. Add these fingerprints to your Google OAuth client:', 'green');
    this.log('   - Go to Google Cloud Console', 'blue');
    this.log('   - Navigate to APIs & Services > Credentials', 'blue');
    this.log('   - Edit your Android OAuth client', 'blue');
    this.log('   - Add the SHA-1 fingerprints', 'blue');
  }

  generateTroubleshootingGuide() {
    this.log('\n🔍 Production Authentication Troubleshooting Guide', 'cyan');
    
    this.log('\nCommon Production Issues:', 'yellow');
    this.log('1. Environment variables not loading', 'red');
    this.log('   Solution: Set EAS environment variables', 'green');
    
    this.log('2. OAuth not working on Android', 'red');
    this.log('   Solution: Add SHA-1 fingerprints to Google OAuth client', 'green');
    
    this.log('3. Firebase connection issues', 'red');
    this.log('   Solution: Verify Firebase project configuration', 'green');
    
    this.log('4. Network connectivity issues', 'red');
    this.log('   Solution: Check device network and firewall settings', 'green');
    
    this.log('\nTesting Steps:', 'yellow');
    this.log('1. Build production APK with environment variables', 'green');
    this.log('2. Install on physical device', 'green');
    this.log('3. Use AuthDebug screen to diagnose issues', 'green');
    this.log('4. Check logs for specific error messages', 'green');
  }

  async run() {
    this.log('🚀 EAS Environment Variables Setup', 'bright');
    this.log('This will help you set up environment variables for production builds.\n', 'cyan');

    // Check if EAS CLI is available
    try {
      execSync('npx eas-cli --version', { stdio: 'pipe' });
      this.log('✅ EAS CLI is available', 'green');
    } catch (error) {
      this.log('❌ EAS CLI is not available', 'red');
      this.log('Install with: npm install -g eas-cli', 'yellow');
      return;
    }

    // Generate setup commands
    this.generateEASCommands();
    this.generateEASJSON();
    this.generateAndroidSHA1Instructions();
    this.generateTroubleshootingGuide();

    this.log('\n🎯 Next Steps:', 'cyan');
    this.log('1. Run the EAS environment variable commands above', 'yellow');
    this.log('2. Add SHA-1 fingerprints to Google OAuth client', 'yellow');
    this.log('3. Build production APK: eas build --platform android --profile production', 'yellow');
    this.log('4. Test authentication in the production build', 'yellow');
    this.log('5. Use AuthDebug screen to troubleshoot any remaining issues', 'yellow');
  }
}

// Run the setup
if (require.main === module) {
  const setup = new EASEnvironmentSetup();
  setup.run().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = EASEnvironmentSetup;
