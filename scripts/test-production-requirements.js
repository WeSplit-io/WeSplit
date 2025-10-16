#!/usr/bin/env node

/**
 * Production Requirements Testing Script
 * Tests all production requirements locally before building
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

class ProductionTester {
  constructor() {
    this.results = {
      environment: { passed: 0, failed: 0, tests: [] },
      firebase: { passed: 0, failed: 0, tests: [] },
      oauth: { passed: 0, failed: 0, tests: [] },
      network: { passed: 0, failed: 0, tests: [] },
      build: { passed: 0, failed: 0, tests: [] },
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logTest(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    this.log(`  ${status} ${testName}`, color);
    if (details) {
      this.log(`    ${details}`, 'yellow');
    }
  }

  async testEnvironmentVariables() {
    this.log('\n🔧 Testing Environment Variables...', 'cyan');
    
    const requiredVars = [
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID',
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
      'ANDROID_GOOGLE_CLIENT_ID',
      'IOS_GOOGLE_CLIENT_ID',
    ];

    const optionalVars = [
      'EXPO_PUBLIC_APPLE_CLIENT_ID',
      'EXPO_PUBLIC_APPLE_SERVICE_ID',
      'EXPO_PUBLIC_APPLE_TEAM_ID',
      'EXPO_PUBLIC_APPLE_KEY_ID',
      'EXPO_PUBLIC_TWITTER_CLIENT_ID',
      'EXPO_PUBLIC_TWITTER_CLIENT_SECRET',
    ];

    // Test required variables
    for (const varName of requiredVars) {
      const value = process.env[varName];
      const passed = value && value !== 'undefined' && value.trim() !== '';
      this.logTest(`Required: ${varName}`, passed, passed ? 'Configured' : 'Missing or empty');
      
      this.results.environment.tests.push({ name: varName, passed, required: true });
      if (passed) this.results.environment.passed++;
      else this.results.environment.failed++;
    }

    // Test optional variables
    for (const varName of optionalVars) {
      const value = process.env[varName];
      const passed = value && value !== 'undefined' && value.trim() !== '';
      this.logTest(`Optional: ${varName}`, passed, passed ? 'Configured' : 'Not configured');
      
      this.results.environment.tests.push({ name: varName, passed, required: false });
      if (passed) this.results.environment.passed++;
      else this.results.environment.failed++;
    }
  }

  async testFirebaseConfiguration() {
    this.log('\n🔥 Testing Firebase Configuration...', 'cyan');
    
    try {
      const firebaseConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      };

      // Test Firebase config completeness
      const hasAllRequired = Object.values(firebaseConfig).every(value => 
        value && value !== 'undefined' && value.trim() !== ''
      );
      this.logTest('Firebase config completeness', hasAllRequired);
      this.results.firebase.tests.push({ name: 'Config completeness', passed: hasAllRequired });
      if (hasAllRequired) this.results.firebase.passed++;
      else this.results.firebase.failed++;

      // Test Firebase project accessibility
      if (firebaseConfig.projectId) {
        try {
          const response = await fetch(`https://${firebaseConfig.projectId}.firebaseapp.com`, {
            method: 'HEAD',
            timeout: 5000
          });
          const accessible = response.ok;
          this.logTest('Firebase project accessibility', accessible);
          this.results.firebase.tests.push({ name: 'Project accessibility', passed: accessible });
          if (accessible) this.results.firebase.passed++;
          else this.results.firebase.failed++;
        } catch (error) {
          this.logTest('Firebase project accessibility', false, error.message);
          this.results.firebase.tests.push({ name: 'Project accessibility', passed: false });
          this.results.firebase.failed++;
        }
      }

      // Test Firebase API key format
      if (firebaseConfig.apiKey) {
        const validFormat = firebaseConfig.apiKey.startsWith('AIza') && firebaseConfig.apiKey.length > 30;
        this.logTest('Firebase API key format', validFormat);
        this.results.firebase.tests.push({ name: 'API key format', passed: validFormat });
        if (validFormat) this.results.firebase.passed++;
        else this.results.firebase.failed++;
      }

    } catch (error) {
      this.logTest('Firebase configuration test', false, error.message);
      this.results.firebase.tests.push({ name: 'Configuration test', passed: false });
      this.results.firebase.failed++;
    }
  }

  async testOAuthConfiguration() {
    this.log('\n🔐 Testing OAuth Configuration...', 'cyan');
    
    const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    const androidClientId = process.env.ANDROID_GOOGLE_CLIENT_ID;
    const iosClientId = process.env.IOS_GOOGLE_CLIENT_ID;

    // Test Google OAuth client ID format
    if (googleClientId) {
      const validFormat = googleClientId.includes('googleusercontent.com');
      this.logTest('Google OAuth client ID format', validFormat);
      this.results.oauth.tests.push({ name: 'Google client ID format', passed: validFormat });
      if (validFormat) this.results.oauth.passed++;
      else this.results.oauth.failed++;
    }

    // Test Android OAuth client ID
    if (androidClientId) {
      const validFormat = androidClientId.includes('googleusercontent.com');
      this.logTest('Android OAuth client ID format', validFormat);
      this.results.oauth.tests.push({ name: 'Android client ID format', passed: validFormat });
      if (validFormat) this.results.oauth.passed++;
      else this.results.oauth.failed++;
    }

    // Test iOS OAuth client ID
    if (iosClientId) {
      const validFormat = iosClientId.includes('googleusercontent.com');
      this.logTest('iOS OAuth client ID format', validFormat);
      this.results.oauth.tests.push({ name: 'iOS client ID format', passed: validFormat });
      if (validFormat) this.results.oauth.passed++;
      else this.results.oauth.failed++;
    }

    // Test OAuth client ID consistency
    if (googleClientId && androidClientId && iosClientId) {
      const consistent = googleClientId.includes('e1tenddn1ihlrp5r3jfo8gj0lfvvpoii') &&
                        androidClientId.includes('q8ucda9vb3q8qplc1537ci4qk1roivdl') &&
                        iosClientId.includes('ldm3rb2soog5lpor5jfo8gj0lfvvpoii');
      this.logTest('OAuth client ID consistency', consistent);
      this.results.oauth.tests.push({ name: 'Client ID consistency', passed: consistent });
      if (consistent) this.results.oauth.passed++;
      else this.results.oauth.failed++;
    }
  }

  async testNetworkConnectivity() {
    this.log('\n🌐 Testing Network Connectivity...', 'cyan');
    
    const testUrls = [
      'https://www.google.com',
      'https://firebase.googleapis.com',
      'https://accounts.google.com',
    ];

    for (const url of testUrls) {
      try {
        const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
        const accessible = response.ok;
        this.logTest(`Network: ${url}`, accessible);
        this.results.network.tests.push({ name: url, passed: accessible });
        if (accessible) this.results.network.passed++;
        else this.results.network.failed++;
      } catch (error) {
        this.logTest(`Network: ${url}`, false, error.message);
        this.results.network.tests.push({ name: url, passed: false });
        this.results.network.failed++;
      }
    }
  }

  async testBuildConfiguration() {
    this.log('\n🏗️ Testing Build Configuration...', 'cyan');
    
    // Test app.config.js exists and is valid
    const configPath = path.join(process.cwd(), 'app.config.js');
    const configExists = fs.existsSync(configPath);
    this.logTest('app.config.js exists', configExists);
    this.results.build.tests.push({ name: 'Config file exists', passed: configExists });
    if (configExists) this.results.build.passed++;
    else this.results.build.failed++;

    if (configExists) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const hasIcon = configContent.includes('android-app-icon-no-alpha.png');
        this.logTest('App icon configured', hasIcon);
        this.results.build.tests.push({ name: 'App icon configured', passed: hasIcon });
        if (hasIcon) this.results.build.passed++;
        else this.results.build.failed++;

        const hasFirebaseConfig = configContent.includes('EXPO_PUBLIC_FIREBASE');
        this.logTest('Firebase config in app.config.js', hasFirebaseConfig);
        this.results.build.tests.push({ name: 'Firebase config in app.config.js', passed: hasFirebaseConfig });
        if (hasFirebaseConfig) this.results.build.passed++;
        else this.results.build.failed++;

      } catch (error) {
        this.logTest('app.config.js validation', false, error.message);
        this.results.build.tests.push({ name: 'Config validation', passed: false });
        this.results.build.failed++;
      }
    }

    // Test EAS configuration
    const easPath = path.join(process.cwd(), 'eas.json');
    const easExists = fs.existsSync(easPath);
    this.logTest('eas.json exists', easExists);
    this.results.build.tests.push({ name: 'EAS config exists', passed: easExists });
    if (easExists) this.results.build.passed++;
    else this.results.build.failed++;

    // Test package.json
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageExists = fs.existsSync(packagePath);
    this.logTest('package.json exists', packageExists);
    this.results.build.tests.push({ name: 'Package.json exists', passed: packageExists });
    if (packageExists) this.results.build.passed++;
    else this.results.build.failed++;
  }

  async testAuthenticationFlow() {
    this.log('\n🔑 Testing Authentication Flow...', 'cyan');
    
    try {
      // Test if AuthService exists
      const authServicePath = path.join(process.cwd(), 'src/services/AuthService.ts');
      const authServiceExists = fs.existsSync(authServicePath);
      this.logTest('AuthService exists', authServiceExists);
      this.results.build.tests.push({ name: 'AuthService exists', passed: authServiceExists });
      if (authServiceExists) this.results.build.passed++;
      else this.results.build.failed++;

      // Test if ProductionAuthService exists
      const prodAuthServicePath = path.join(process.cwd(), 'src/services/ProductionAuthService.ts');
      const prodAuthServiceExists = fs.existsSync(prodAuthServicePath);
      this.logTest('ProductionAuthService exists', prodAuthServiceExists);
      this.results.build.tests.push({ name: 'ProductionAuthService exists', passed: prodAuthServiceExists });
      if (prodAuthServiceExists) this.results.build.passed++;
      else this.results.build.failed++;

      // Test if AuthDebugScreen exists
      const authDebugPath = path.join(process.cwd(), 'src/screens/Debug/AuthDebugScreen.tsx');
      const authDebugExists = fs.existsSync(authDebugPath);
      this.logTest('AuthDebugScreen exists', authDebugExists);
      this.results.build.tests.push({ name: 'AuthDebugScreen exists', passed: authDebugExists });
      if (authDebugExists) this.results.build.passed++;
      else this.results.build.failed++;

    } catch (error) {
      this.logTest('Authentication flow test', false, error.message);
      this.results.build.tests.push({ name: 'Auth flow test', passed: false });
      this.results.build.failed++;
    }
  }

  generateReport() {
    this.log('\n📊 Production Requirements Test Report', 'bright');
    this.log('=' .repeat(50), 'cyan');

    const categories = ['environment', 'firebase', 'oauth', 'network', 'build'];
    const categoryNames = {
      environment: 'Environment Variables',
      firebase: 'Firebase Configuration',
      oauth: 'OAuth Configuration',
      network: 'Network Connectivity',
      build: 'Build Configuration'
    };

    let totalPassed = 0;
    let totalFailed = 0;

    for (const category of categories) {
      const result = this.results[category];
      const total = result.passed + result.failed;
      const percentage = total > 0 ? Math.round((result.passed / total) * 100) : 0;
      
      this.log(`\n${categoryNames[category]}:`, 'yellow');
      this.log(`  Passed: ${result.passed}/${total} (${percentage}%)`, 
               percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red');
      
      totalPassed += result.passed;
      totalFailed += result.failed;
    }

    const overallTotal = totalPassed + totalFailed;
    const overallPercentage = overallTotal > 0 ? Math.round((totalPassed / overallTotal) * 100) : 0;

    this.log('\n' + '=' .repeat(50), 'cyan');
    this.log(`Overall: ${totalPassed}/${overallTotal} (${overallPercentage}%)`, 
             overallPercentage >= 80 ? 'green' : overallPercentage >= 60 ? 'yellow' : 'red');

    if (overallPercentage >= 80) {
      this.log('\n🎉 Production requirements test PASSED!', 'green');
      this.log('Your app is ready for production build.', 'green');
    } else if (overallPercentage >= 60) {
      this.log('\n⚠️ Production requirements test PARTIALLY PASSED', 'yellow');
      this.log('Some issues need to be addressed before production build.', 'yellow');
    } else {
      this.log('\n❌ Production requirements test FAILED', 'red');
      this.log('Multiple issues need to be resolved before production build.', 'red');
    }

    // Generate recommendations
    this.log('\n💡 Recommendations:', 'cyan');
    
    if (this.results.environment.failed > 0) {
      this.log('  • Set missing environment variables in your .env file', 'yellow');
    }
    
    if (this.results.firebase.failed > 0) {
      this.log('  • Verify Firebase project configuration', 'yellow');
    }
    
    if (this.results.oauth.failed > 0) {
      this.log('  • Check OAuth client ID configuration', 'yellow');
    }
    
    if (this.results.network.failed > 0) {
      this.log('  • Check your internet connection', 'yellow');
    }
    
    if (this.results.build.failed > 0) {
      this.log('  • Verify build configuration files', 'yellow');
    }

    return overallPercentage >= 80;
  }

  async runAllTests() {
    this.log('🚀 Starting Production Requirements Test...', 'bright');
    this.log('This will test all production requirements locally.\n', 'cyan');

    await this.testEnvironmentVariables();
    await this.testFirebaseConfiguration();
    await this.testOAuthConfiguration();
    await this.testNetworkConnectivity();
    await this.testBuildConfiguration();
    await this.testAuthenticationFlow();

    const passed = this.generateReport();
    process.exit(passed ? 0 : 1);
  }
}

// Run the tests
if (require.main === module) {
  const tester = new ProductionTester();
  tester.runAllTests().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionTester;
