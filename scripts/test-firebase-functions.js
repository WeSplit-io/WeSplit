#!/usr/bin/env node

/**
 * Firebase Functions Configuration Test
 * Tests Firebase Functions configuration in production-like conditions
 */

// Load environment variables first
require('dotenv/config');

const fs = require('fs');
const path = require('path');

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

class FirebaseFunctionsTest {
  constructor() {
    this.results = {
      environmentVariables: [],
      firebaseConfig: [],
      functionsConfig: [],
      errors: []
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  testEnvironmentVariables() {
    this.log('\n🔧 Testing Environment Variables...', 'cyan');
    
    const requiredVars = [
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID'
    ];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (value && value !== 'undefined' && value.trim() !== '') {
        this.log(`  ✅ ${varName}: Configured`, 'green');
        this.results.environmentVariables.push({ name: varName, status: 'configured', value: value.substring(0, 20) + '...' });
      } else {
        this.log(`  ❌ ${varName}: Missing`, 'red');
        this.results.environmentVariables.push({ name: varName, status: 'missing' });
        this.results.errors.push(`Missing environment variable: ${varName}`);
      }
    });
  }

  testFirebaseConfig() {
    this.log('\n🔥 Testing Firebase Configuration...', 'cyan');
    
    try {
      // Simulate the getEnvVar function from the service
      const getEnvVar = (key) => {
        if (process.env[key]) return process.env[key];
        if (process.env[`EXPO_PUBLIC_${key}`]) return process.env[`EXPO_PUBLIC_${key}`];
        return '';
      };

      const apiKey = getEnvVar('FIREBASE_API_KEY');
      const authDomain = getEnvVar('FIREBASE_AUTH_DOMAIN') || "wesplit-35186.firebaseapp.com";
      const projectId = getEnvVar('FIREBASE_PROJECT_ID') || "wesplit-35186";
      const storageBucket = getEnvVar('FIREBASE_STORAGE_BUCKET') || "wesplit-35186.appspot.com";
      const messagingSenderId = getEnvVar('FIREBASE_MESSAGING_SENDER_ID');
      const appId = getEnvVar('FIREBASE_APP_ID');

      const firebaseConfig = {
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        messagingSenderId,
        appId
      };

      // Validate configuration
      if (!apiKey) {
        this.log('  ❌ Firebase API Key: Missing', 'red');
        this.results.errors.push('Firebase API Key is missing');
      } else {
        this.log('  ✅ Firebase API Key: Configured', 'green');
      }

      if (!messagingSenderId) {
        this.log('  ❌ Firebase Messaging Sender ID: Missing', 'red');
        this.results.errors.push('Firebase Messaging Sender ID is missing');
      } else {
        this.log('  ✅ Firebase Messaging Sender ID: Configured', 'green');
      }

      if (!appId) {
        this.log('  ❌ Firebase App ID: Missing', 'red');
        this.results.errors.push('Firebase App ID is missing');
      } else {
        this.log('  ✅ Firebase App ID: Configured', 'green');
      }

      this.log(`  📋 Project ID: ${projectId}`, 'blue');
      this.log(`  📋 Auth Domain: ${authDomain}`, 'blue');
      this.log(`  📋 Storage Bucket: ${storageBucket}`, 'blue');

      this.results.firebaseConfig = firebaseConfig;

    } catch (error) {
      this.log(`  ❌ Firebase Configuration Error: ${error.message}`, 'red');
      this.results.errors.push(`Firebase configuration error: ${error.message}`);
    }
  }

  testFunctionsConfiguration() {
    this.log('\n⚡ Testing Firebase Functions Configuration...', 'cyan');
    
    try {
      // Check if Firebase Functions service file exists and is properly configured
      const functionsServicePath = path.join(__dirname, '..', 'src', 'services', 'firebaseFunctionsService.ts');
      
      if (fs.existsSync(functionsServicePath)) {
        this.log('  ✅ Firebase Functions Service: Exists', 'green');
        
        const content = fs.readFileSync(functionsServicePath, 'utf8');
        
        // Check for proper environment variable loading
        if (content.includes('EXPO_PUBLIC_')) {
          this.log('  ✅ Environment Variable Loading: Configured', 'green');
        } else {
          this.log('  ❌ Environment Variable Loading: Missing EXPO_PUBLIC_ prefix', 'red');
          this.results.errors.push('Firebase Functions service missing EXPO_PUBLIC_ prefix for environment variables');
        }

        // Check for proper Firebase Functions initialization
        if (content.includes('getFunctions') && content.includes('httpsCallable')) {
          this.log('  ✅ Firebase Functions Initialization: Configured', 'green');
        } else {
          this.log('  ❌ Firebase Functions Initialization: Missing', 'red');
          this.results.errors.push('Firebase Functions service missing proper initialization');
        }

        // Check for timeout configuration
        if (content.includes('timeout: 60000')) {
          this.log('  ✅ Timeout Configuration: Configured (60s)', 'green');
        } else {
          this.log('  ⚠️ Timeout Configuration: Not configured', 'yellow');
        }

        // Check for region configuration
        if (content.includes('us-central1')) {
          this.log('  ✅ Region Configuration: us-central1', 'green');
        } else {
          this.log('  ⚠️ Region Configuration: Default region', 'yellow');
        }

      } else {
        this.log('  ❌ Firebase Functions Service: Missing', 'red');
        this.results.errors.push('Firebase Functions service file not found');
      }

    } catch (error) {
      this.log(`  ❌ Functions Configuration Error: ${error.message}`, 'red');
      this.results.errors.push(`Functions configuration error: ${error.message}`);
    }
  }

  testProductionCompatibility() {
    this.log('\n🏭 Testing Production Compatibility...', 'cyan');
    
    try {
      // Check if EAS environment variables are properly configured
      const easJsonPath = path.join(__dirname, '..', 'eas.json');
      
      if (fs.existsSync(easJsonPath)) {
        const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
        
        if (easConfig.build && easConfig.build.production && easConfig.build.production.env) {
          this.log('  ✅ EAS Environment Variables: Configured', 'green');
          
          const envVars = easConfig.build.production.env;
          const requiredEasVars = [
            'EXPO_PUBLIC_FIREBASE_API_KEY',
            'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
            'EXPO_PUBLIC_FIREBASE_APP_ID'
          ];

          requiredEasVars.forEach(varName => {
            if (envVars[varName]) {
              this.log(`    ✅ ${varName}: Configured in EAS`, 'green');
            } else {
              this.log(`    ❌ ${varName}: Missing in EAS`, 'red');
              this.results.errors.push(`Missing EAS environment variable: ${varName}`);
            }
          });
        } else {
          this.log('  ❌ EAS Environment Variables: Not configured', 'red');
          this.results.errors.push('EAS environment variables not configured for production');
        }
      } else {
        this.log('  ❌ EAS Configuration: Missing', 'red');
        this.results.errors.push('EAS configuration file not found');
      }

    } catch (error) {
      this.log(`  ❌ Production Compatibility Error: ${error.message}`, 'red');
      this.results.errors.push(`Production compatibility error: ${error.message}`);
    }
  }

  generateReport() {
    this.log('\n📊 Firebase Functions Test Report', 'cyan');
    this.log('==================================================', 'cyan');
    
    const totalTests = this.results.environmentVariables.length + 3; // +3 for other test categories
    const passedTests = this.results.environmentVariables.filter(v => v.status === 'configured').length + 
                       (this.results.errors.length === 0 ? 3 : 0);
    
    this.log(`\nOverall: ${passedTests}/${totalTests} (${Math.round((passedTests/totalTests) * 100)}%)`, 
             passedTests === totalTests ? 'green' : 'yellow');
    
    if (this.results.errors.length > 0) {
      this.log('\n❌ Issues Found:', 'red');
      this.results.errors.forEach((error, index) => {
        this.log(`  ${index + 1}. ${error}`, 'red');
      });
    } else {
      this.log('\n✅ All tests passed!', 'green');
    }

    this.log('\n💡 Recommendations:', 'yellow');
    if (this.results.errors.length > 0) {
      this.log('  1. Fix the issues listed above', 'yellow');
      this.log('  2. Ensure all environment variables are set in EAS', 'yellow');
      this.log('  3. Test Firebase Functions in development first', 'yellow');
      this.log('  4. Build production APK and test authentication', 'yellow');
    } else {
      this.log('  1. Build production APK: eas build --platform android --profile production', 'green');
      this.log('  2. Test authentication in the production build', 'green');
      this.log('  3. Monitor Firebase Functions logs for any issues', 'green');
    }
  }

  async run() {
    this.log('🚀 Firebase Functions Configuration Test', 'bright');
    this.log('This will test Firebase Functions configuration for production builds.\n', 'cyan');

    this.testEnvironmentVariables();
    this.testFirebaseConfig();
    this.testFunctionsConfiguration();
    this.testProductionCompatibility();
    this.generateReport();
  }
}

// Run the test
if (require.main === module) {
  const test = new FirebaseFunctionsTest();
  test.run().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = FirebaseFunctionsTest;
