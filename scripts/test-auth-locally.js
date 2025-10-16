#!/usr/bin/env node

/**
 * Local Authentication Testing Script
 * Tests authentication flow locally with production-like conditions
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

class LocalAuthTester {
  constructor() {
    this.results = {
      firebase: { passed: 0, failed: 0, tests: [] },
      oauth: { passed: 0, failed: 0, tests: [] },
      network: { passed: 0, failed: 0, tests: [] },
      components: { passed: 0, failed: 0, tests: [] },
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

  /**
   * Test Firebase configuration and initialization
   */
  async testFirebaseConfiguration() {
    this.log('\n🔥 Testing Firebase Configuration...', 'cyan');
    
    try {
      // Test Firebase config file exists
      const firebaseConfigPath = path.join(process.cwd(), 'src/config/firebase.ts');
      const configExists = fs.existsSync(firebaseConfigPath);
      this.logTest('Firebase config file exists', configExists);
      this.results.firebase.tests.push({ name: 'Config file exists', passed: configExists });
      if (configExists) this.results.firebase.passed++;
      else this.results.firebase.failed++;

      if (configExists) {
        const configContent = fs.readFileSync(firebaseConfigPath, 'utf8');
        
        // Test Firebase imports
        const hasFirebaseImports = configContent.includes('import { initializeApp }') && 
                                 configContent.includes('import { getAuth }');
        this.logTest('Firebase imports present', hasFirebaseImports);
        this.results.firebase.tests.push({ name: 'Firebase imports', passed: hasFirebaseImports });
        if (hasFirebaseImports) this.results.firebase.passed++;
        else this.results.firebase.failed++;

        // Test Firebase initialization
        const hasFirebaseInit = configContent.includes('initializeApp') && 
                              configContent.includes('getAuth');
        this.logTest('Firebase initialization present', hasFirebaseInit);
        this.results.firebase.tests.push({ name: 'Firebase initialization', passed: hasFirebaseInit });
        if (hasFirebaseInit) this.results.firebase.passed++;
        else this.results.firebase.failed++;

        // Test environment variable usage
        const hasEnvVars = configContent.includes('EXPO_PUBLIC_FIREBASE');
        this.logTest('Environment variables used', hasEnvVars);
        this.results.firebase.tests.push({ name: 'Environment variables', passed: hasEnvVars });
        if (hasEnvVars) this.results.firebase.passed++;
        else this.results.firebase.failed++;
      }

      // Test Firebase connectivity
      const firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
      if (firebaseProjectId) {
        try {
          const response = await fetch(`https://${firebaseProjectId}.firebaseapp.com`, {
            method: 'HEAD',
            timeout: 5000
          });
          const accessible = response.ok;
          this.logTest('Firebase project accessible', accessible);
          this.results.firebase.tests.push({ name: 'Project accessibility', passed: accessible });
          if (accessible) this.results.firebase.passed++;
          else this.results.firebase.failed++;
        } catch (error) {
          this.logTest('Firebase project accessible', false, error.message);
          this.results.firebase.tests.push({ name: 'Project accessibility', passed: false });
          this.results.firebase.failed++;
        }
      }

    } catch (error) {
      this.logTest('Firebase configuration test', false, error.message);
      this.results.firebase.tests.push({ name: 'Configuration test', passed: false });
      this.results.firebase.failed++;
    }
  }

  /**
   * Test OAuth configuration
   */
  async testOAuthConfiguration() {
    this.log('\n🔐 Testing OAuth Configuration...', 'cyan');
    
    // Test Google OAuth client IDs
    const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    const androidClientId = process.env.ANDROID_GOOGLE_CLIENT_ID;
    const iosClientId = process.env.IOS_GOOGLE_CLIENT_ID;

    if (googleClientId) {
      const validFormat = googleClientId.includes('googleusercontent.com');
      this.logTest('Google OAuth client ID format', validFormat);
      this.results.oauth.tests.push({ name: 'Google client ID format', passed: validFormat });
      if (validFormat) this.results.oauth.passed++;
      else this.results.oauth.failed++;
    }

    if (androidClientId) {
      const validFormat = androidClientId.includes('googleusercontent.com');
      this.logTest('Android OAuth client ID format', validFormat);
      this.results.oauth.tests.push({ name: 'Android client ID format', passed: validFormat });
      if (validFormat) this.results.oauth.passed++;
      else this.results.oauth.failed++;
    }

    if (iosClientId) {
      const validFormat = iosClientId.includes('googleusercontent.com');
      this.logTest('iOS OAuth client ID format', validFormat);
      this.results.oauth.tests.push({ name: 'iOS client ID format', passed: validFormat });
      if (validFormat) this.results.oauth.passed++;
      else this.results.oauth.failed++;
    }

    // Test OAuth service files
    const authServicePath = path.join(process.cwd(), 'src/services/AuthService.ts');
    const authServiceExists = fs.existsSync(authServicePath);
    this.logTest('AuthService exists', authServiceExists);
    this.results.oauth.tests.push({ name: 'AuthService exists', passed: authServiceExists });
    if (authServiceExists) this.results.oauth.passed++;
    else this.results.oauth.failed++;

    if (authServiceExists) {
      const authServiceContent = fs.readFileSync(authServicePath, 'utf8');
      
      // Test OAuth imports
      const hasOAuthImports = authServiceContent.includes('GoogleAuthProvider') && 
                            authServiceContent.includes('OAuthProvider');
      this.logTest('OAuth imports present', hasOAuthImports);
      this.results.oauth.tests.push({ name: 'OAuth imports', passed: hasOAuthImports });
      if (hasOAuthImports) this.results.oauth.passed++;
      else this.results.oauth.failed++;

      // Test OAuth methods
      const hasOAuthMethods = authServiceContent.includes('signInWithGoogle') && 
                            authServiceContent.includes('signInWithApple');
      this.logTest('OAuth methods present', hasOAuthMethods);
      this.results.oauth.tests.push({ name: 'OAuth methods', passed: hasOAuthMethods });
      if (hasOAuthMethods) this.results.oauth.passed++;
      else this.results.oauth.failed++;
    }
  }

  /**
   * Test network connectivity
   */
  async testNetworkConnectivity() {
    this.log('\n🌐 Testing Network Connectivity...', 'cyan');
    
    const testUrls = [
      { url: 'https://www.google.com', name: 'Google' },
      { url: 'https://firebase.googleapis.com', name: 'Firebase' },
      { url: 'https://accounts.google.com', name: 'Google Accounts' },
      { url: 'https://appleid.apple.com', name: 'Apple ID' },
    ];

    for (const test of testUrls) {
      try {
        const response = await fetch(test.url, { method: 'HEAD', timeout: 5000 });
        const accessible = response.ok;
        this.logTest(`Network: ${test.name}`, accessible);
        this.results.network.tests.push({ name: test.name, passed: accessible });
        if (accessible) this.results.network.passed++;
        else this.results.network.failed++;
      } catch (error) {
        this.logTest(`Network: ${test.name}`, false, error.message);
        this.results.network.tests.push({ name: test.name, passed: false });
        this.results.network.failed++;
      }
    }
  }

  /**
   * Test authentication components
   */
  async testAuthenticationComponents() {
    this.log('\n🧩 Testing Authentication Components...', 'cyan');
    
    const components = [
      { path: 'src/screens/AuthMethods/AuthMethodsScreen.tsx', name: 'AuthMethodsScreen' },
      { path: 'src/screens/Debug/AuthDebugScreen.tsx', name: 'AuthDebugScreen' },
      { path: 'src/services/ProductionAuthService.ts', name: 'ProductionAuthService' },
      { path: 'src/utils/authErrorHandler.ts', name: 'AuthErrorHandler' },
      { path: 'src/context/AppContext.tsx', name: 'AppContext' },
    ];

    for (const component of components) {
      const componentPath = path.join(process.cwd(), component.path);
      const exists = fs.existsSync(componentPath);
      this.logTest(`Component: ${component.name}`, exists);
      this.results.components.tests.push({ name: component.name, passed: exists });
      if (exists) this.results.components.passed++;
      else this.results.components.failed++;

      if (exists) {
        const content = fs.readFileSync(componentPath, 'utf8');
        
        // Test for authentication-related imports
        const hasAuthImports = content.includes('firebase/auth') || 
                             content.includes('AuthService') || 
                             content.includes('auth');
        this.logTest(`  ${component.name} has auth imports`, hasAuthImports);
        this.results.components.tests.push({ name: `${component.name} imports`, passed: hasAuthImports });
        if (hasAuthImports) this.results.components.passed++;
        else this.results.components.failed++;
      }
    }
  }

  /**
   * Test authentication flow simulation
   */
  async testAuthenticationFlow() {
    this.log('\n🔄 Testing Authentication Flow...', 'cyan');
    
    try {
      // Test if we can import Firebase (simulating production conditions)
      process.env.NODE_ENV = 'production';
      process.env.APP_ENV = 'production';
      
      // Test Firebase initialization
      const { initializeApp } = require('firebase/app');
      const { getAuth } = require('firebase/auth');
      
      const firebaseConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      };

      // Check if all required config is present
      const hasAllConfig = Object.values(firebaseConfig).every(value => 
        value && value !== 'undefined' && value.trim() !== ''
      );
      
      this.logTest('Firebase config completeness', hasAllConfig);
      this.results.firebase.tests.push({ name: 'Config completeness', passed: hasAllConfig });
      if (hasAllConfig) this.results.firebase.passed++;
      else this.results.firebase.failed++;

      if (hasAllConfig) {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        
        this.logTest('Firebase initialization', !!auth);
        this.results.firebase.tests.push({ name: 'Firebase initialization', passed: !!auth });
        if (auth) this.results.firebase.passed++;
        else this.results.firebase.failed++;
      }

    } catch (error) {
      this.logTest('Authentication flow test', false, error.message);
      this.results.firebase.tests.push({ name: 'Auth flow test', passed: false });
      this.results.firebase.failed++;
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    this.log('\n📊 Local Authentication Test Report', 'bright');
    this.log('=' .repeat(50), 'cyan');

    const categories = ['firebase', 'oauth', 'network', 'components'];
    const categoryNames = {
      firebase: 'Firebase Configuration',
      oauth: 'OAuth Configuration',
      network: 'Network Connectivity',
      components: 'Authentication Components'
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
      this.log('\n🎉 Local authentication test PASSED!', 'green');
      this.log('Your authentication setup is ready for production.', 'green');
    } else if (overallPercentage >= 60) {
      this.log('\n⚠️ Local authentication test PARTIALLY PASSED', 'yellow');
      this.log('Some issues need to be addressed before production.', 'yellow');
    } else {
      this.log('\n❌ Local authentication test FAILED', 'red');
      this.log('Multiple issues need to be resolved before production.', 'red');
    }

    // Generate recommendations
    this.log('\n💡 Recommendations:', 'cyan');
    
    if (this.results.firebase.failed > 0) {
      this.log('  • Check Firebase configuration and environment variables', 'yellow');
    }
    
    if (this.results.oauth.failed > 0) {
      this.log('  • Verify OAuth client ID configuration', 'yellow');
    }
    
    if (this.results.network.failed > 0) {
      this.log('  • Check your internet connection', 'yellow');
    }
    
    if (this.results.components.failed > 0) {
      this.log('  • Ensure all authentication components are present', 'yellow');
    }

    this.log('\n🚀 Next Steps:', 'cyan');
    this.log('  1. Fix any failed tests above', 'yellow');
    this.log('  2. Run: node scripts/simulate-production.js', 'yellow');
    this.log('  3. Test authentication in the app', 'yellow');
    this.log('  4. Build production APK: eas build --platform android --profile production', 'yellow');

    return overallPercentage >= 80;
  }

  /**
   * Run all authentication tests
   */
  async runAllTests() {
    this.log('🚀 Starting Local Authentication Testing...', 'bright');
    this.log('This will test authentication setup locally.\n', 'cyan');

    await this.testFirebaseConfiguration();
    await this.testOAuthConfiguration();
    await this.testNetworkConnectivity();
    await this.testAuthenticationComponents();
    await this.testAuthenticationFlow();

    const passed = this.generateReport();
    process.exit(passed ? 0 : 1);
  }
}

// Run the tests
if (require.main === module) {
  const tester = new LocalAuthTester();
  tester.runAllTests().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = LocalAuthTester;
