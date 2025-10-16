#!/usr/bin/env node

/**
 * Deep Authentication Audit for Production Issues
 * Comprehensive analysis of all potential authentication failure points
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

class DeepAuthAudit {
  constructor() {
    this.results = {
      environmentVariables: [],
      firebaseConfig: [],
      oauthConfig: [],
      networkConfig: [],
      persistenceConfig: [],
      apiConfig: [],
      buildConfig: [],
      errors: [],
      warnings: [],
      recommendations: []
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  // Test 1: Environment Variables Deep Analysis
  testEnvironmentVariables() {
    this.log('\n🔧 Deep Environment Variables Analysis...', 'cyan');
    
    const requiredVars = [
      // Firebase Core
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID',
      'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
      
      // OAuth Configuration
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
      'EXPO_PUBLIC_GOOGLE_CLIENT_SECRET',
      'ANDROID_GOOGLE_CLIENT_ID',
      'IOS_GOOGLE_CLIENT_ID',
      'EXPO_PUBLIC_APPLE_CLIENT_ID',
      'EXPO_PUBLIC_APPLE_SERVICE_ID',
      'EXPO_PUBLIC_APPLE_TEAM_ID',
      'EXPO_PUBLIC_APPLE_KEY_ID',
      'EXPO_PUBLIC_TWITTER_CLIENT_ID',
      'EXPO_PUBLIC_TWITTER_CLIENT_SECRET',
      
      // Solana Configuration
      'EXPO_PUBLIC_HELIUS_API_KEY',
      'EXPO_PUBLIC_FORCE_MAINNET',
      'EXPO_PUBLIC_DEV_NETWORK',
      
      // Company Configuration
      'EXPO_PUBLIC_COMPANY_WALLET_ADDRESS',
      'EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY',
      'EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE',
      'EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE',
      'EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE',
      'EXPO_PUBLIC_COMPANY_MIN_FEE',
      'EXPO_PUBLIC_COMPANY_MAX_FEE'
    ];

    let configuredCount = 0;
    let missingCount = 0;

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (value && value !== 'undefined' && value.trim() !== '') {
        this.log(`  ✅ ${varName}: Configured`, 'green');
        this.results.environmentVariables.push({ 
          name: varName, 
          status: 'configured', 
          value: value.substring(0, 20) + '...',
          length: value.length
        });
        configuredCount++;
      } else {
        this.log(`  ❌ ${varName}: Missing`, 'red');
        this.results.environmentVariables.push({ 
          name: varName, 
          status: 'missing' 
        });
        this.results.errors.push(`Missing environment variable: ${varName}`);
        missingCount++;
      }
    });

    this.log(`\n  📊 Environment Variables: ${configuredCount}/${requiredVars.length} configured`, 
             missingCount === 0 ? 'green' : 'yellow');
  }

  // Test 2: Firebase Configuration Analysis
  testFirebaseConfiguration() {
    this.log('\n🔥 Firebase Configuration Deep Analysis...', 'cyan');
    
    try {
      // Check Firebase config file
      const firebaseConfigPath = path.join(__dirname, '..', 'src', 'config', 'firebase.ts');
      if (fs.existsSync(firebaseConfigPath)) {
        this.log('  ✅ Firebase config file: Exists', 'green');
        
        const content = fs.readFileSync(firebaseConfigPath, 'utf8');
        
        // Check for proper environment variable loading
        if (content.includes('getEnvVar') && content.includes('EXPO_PUBLIC_')) {
          this.log('  ✅ Environment variable loading: Configured', 'green');
        } else {
          this.log('  ❌ Environment variable loading: Missing EXPO_PUBLIC_ prefix', 'red');
          this.results.errors.push('Firebase config missing proper environment variable loading');
        }

        // Check for Firebase initialization
        if (content.includes('initializeApp') && content.includes('getAuth')) {
          this.log('  ✅ Firebase initialization: Configured', 'green');
        } else {
          this.log('  ❌ Firebase initialization: Missing', 'red');
          this.results.errors.push('Firebase config missing proper initialization');
        }

        // Check for persistence configuration
        if (content.includes('AsyncStorage') && content.includes('persistence')) {
          this.log('  ✅ Firebase persistence: Configured', 'green');
        } else {
          this.log('  ⚠️ Firebase persistence: Not configured', 'yellow');
          this.results.warnings.push('Firebase persistence not configured - may cause auth state issues');
        }

      } else {
        this.log('  ❌ Firebase config file: Missing', 'red');
        this.results.errors.push('Firebase configuration file not found');
      }

      // Check Firebase Functions service
      const functionsServicePath = path.join(__dirname, '..', 'src', 'services', 'firebaseFunctionsService.ts');
      if (fs.existsSync(functionsServicePath)) {
        this.log('  ✅ Firebase Functions service: Exists', 'green');
        
        const content = fs.readFileSync(functionsServicePath, 'utf8');
        
        // Check for proper timeout configuration
        if (content.includes('timeout: 60000')) {
          this.log('  ✅ Functions timeout: Configured (60s)', 'green');
        } else {
          this.log('  ⚠️ Functions timeout: Not configured', 'yellow');
          this.results.warnings.push('Firebase Functions timeout not configured');
        }

        // Check for region configuration
        if (content.includes('us-central1')) {
          this.log('  ✅ Functions region: us-central1', 'green');
        } else {
          this.log('  ⚠️ Functions region: Default', 'yellow');
          this.results.warnings.push('Firebase Functions region not explicitly set');
        }

      } else {
        this.log('  ❌ Firebase Functions service: Missing', 'red');
        this.results.errors.push('Firebase Functions service not found');
      }

    } catch (error) {
      this.log(`  ❌ Firebase configuration error: ${error.message}`, 'red');
      this.results.errors.push(`Firebase configuration error: ${error.message}`);
    }
  }

  // Test 3: OAuth Configuration Analysis
  testOAuthConfiguration() {
    this.log('\n🔐 OAuth Configuration Deep Analysis...', 'cyan');
    
    try {
      // Check OAuth test utilities
      const oauthTestPath = path.join(__dirname, '..', 'src', 'utils', 'oauthTest.ts');
      if (fs.existsSync(oauthTestPath)) {
        this.log('  ✅ OAuth test utilities: Exists', 'green');
        
        const content = fs.readFileSync(oauthTestPath, 'utf8');
        
        // Check for proper client ID validation
        if (content.includes('.googleusercontent.com')) {
          this.log('  ✅ Google Client ID validation: Configured', 'green');
        } else {
          this.log('  ⚠️ Google Client ID validation: Not configured', 'yellow');
          this.results.warnings.push('Google Client ID format validation not configured');
        }

        // Check for platform-specific validation
        if (content.includes('Platform.OS') && content.includes('android') && content.includes('ios')) {
          this.log('  ✅ Platform-specific validation: Configured', 'green');
        } else {
          this.log('  ⚠️ Platform-specific validation: Not configured', 'yellow');
          this.results.warnings.push('Platform-specific OAuth validation not configured');
        }

      } else {
        this.log('  ❌ OAuth test utilities: Missing', 'red');
        this.results.errors.push('OAuth test utilities not found');
      }

      // Check OAuth configuration
      const oauthConfigPath = path.join(__dirname, '..', 'src', 'config', 'env.ts');
      if (fs.existsSync(oauthConfigPath)) {
        this.log('  ✅ OAuth config file: Exists', 'green');
        
        const content = fs.readFileSync(oauthConfigPath, 'utf8');
        
        // Check for all OAuth providers
        const providers = ['google', 'apple', 'twitter'];
        providers.forEach(provider => {
          if (content.includes(provider)) {
            this.log(`    ✅ ${provider} OAuth: Configured`, 'green');
          } else {
            this.log(`    ❌ ${provider} OAuth: Missing`, 'red');
            this.results.errors.push(`${provider} OAuth configuration missing`);
          }
        });

      } else {
        this.log('  ❌ OAuth config file: Missing', 'red');
        this.results.errors.push('OAuth configuration file not found');
      }

    } catch (error) {
      this.log(`  ❌ OAuth configuration error: ${error.message}`, 'red');
      this.results.errors.push(`OAuth configuration error: ${error.message}`);
    }
  }

  // Test 4: Network Configuration Analysis
  testNetworkConfiguration() {
    this.log('\n🌐 Network Configuration Deep Analysis...', 'cyan');
    
    try {
      // Check API configuration
      const apiConfigPath = path.join(__dirname, '..', 'src', 'config', 'api.ts');
      if (fs.existsSync(apiConfigPath)) {
        this.log('  ✅ API config file: Exists', 'green');
        
        const content = fs.readFileSync(apiConfigPath, 'utf8');
        
        // Check for timeout configuration
        if (content.includes('timeout') && content.includes('10000')) {
          this.log('  ✅ API timeout: Configured (10s)', 'green');
        } else {
          this.log('  ⚠️ API timeout: Not configured', 'yellow');
          this.results.warnings.push('API timeout not configured');
        }

        // Check for retry logic
        if (content.includes('retries') && content.includes('3')) {
          this.log('  ✅ API retry logic: Configured', 'green');
        } else {
          this.log('  ⚠️ API retry logic: Not configured', 'yellow');
          this.results.warnings.push('API retry logic not configured');
        }

        // Check for rate limiting handling
        if (content.includes('429') && content.includes('Rate limit')) {
          this.log('  ✅ Rate limiting handling: Configured', 'green');
        } else {
          this.log('  ⚠️ Rate limiting handling: Not configured', 'yellow');
          this.results.warnings.push('Rate limiting handling not configured');
        }

        // Check for backend URL fallback
        if (content.includes('POSSIBLE_BACKEND_URLS') && content.includes('localhost')) {
          this.log('  ✅ Backend URL fallback: Configured', 'green');
        } else {
          this.log('  ⚠️ Backend URL fallback: Not configured', 'yellow');
          this.results.warnings.push('Backend URL fallback not configured');
        }

      } else {
        this.log('  ❌ API config file: Missing', 'red');
        this.results.errors.push('API configuration file not found');
      }

    } catch (error) {
      this.log(`  ❌ Network configuration error: ${error.message}`, 'red');
      this.results.errors.push(`Network configuration error: ${error.message}`);
    }
  }

  // Test 5: Persistence Configuration Analysis
  testPersistenceConfiguration() {
    this.log('\n💾 Persistence Configuration Deep Analysis...', 'cyan');
    
    try {
      // Check Firebase persistence
      const persistencePath = path.join(__dirname, '..', 'src', 'config', 'firebasePersistence.ts');
      if (fs.existsSync(persistencePath)) {
        this.log('  ✅ Firebase persistence config: Exists', 'green');
        
        const content = fs.readFileSync(persistencePath, 'utf8');
        
        // Check for AsyncStorage integration
        if (content.includes('AsyncStorage') && content.includes('getReactNativePersistence')) {
          this.log('  ✅ AsyncStorage integration: Configured', 'green');
        } else {
          this.log('  ❌ AsyncStorage integration: Missing', 'red');
          this.results.errors.push('AsyncStorage integration not configured');
        }

        // Check for error handling
        if (content.includes('try') && content.includes('catch') && content.includes('getAuth')) {
          this.log('  ✅ Persistence error handling: Configured', 'green');
        } else {
          this.log('  ⚠️ Persistence error handling: Not configured', 'yellow');
          this.results.warnings.push('Persistence error handling not configured');
        }

      } else {
        this.log('  ❌ Firebase persistence config: Missing', 'red');
        this.results.errors.push('Firebase persistence configuration not found');
      }

      // Check production Firebase config
      const productionPath = path.join(__dirname, '..', 'src', 'config', 'firebaseProduction.ts');
      if (fs.existsSync(productionPath)) {
        this.log('  ✅ Production Firebase config: Exists', 'green');
        
        const content = fs.readFileSync(productionPath, 'utf8');
        
        // Check for comprehensive environment variable loading
        if (content.includes('getEnvVar') && content.includes('EXPO_PUBLIC_')) {
          this.log('  ✅ Production env var loading: Configured', 'green');
        } else {
          this.log('  ❌ Production env var loading: Missing', 'red');
          this.results.errors.push('Production environment variable loading not configured');
        }

        // Check for singleton pattern
        if (content.includes('firebaseApp') && content.includes('firebaseAuth')) {
          this.log('  ✅ Singleton pattern: Configured', 'green');
        } else {
          this.log('  ⚠️ Singleton pattern: Not configured', 'yellow');
          this.results.warnings.push('Firebase singleton pattern not configured');
        }

      } else {
        this.log('  ❌ Production Firebase config: Missing', 'red');
        this.results.errors.push('Production Firebase configuration not found');
      }

    } catch (error) {
      this.log(`  ❌ Persistence configuration error: ${error.message}`, 'red');
      this.results.errors.push(`Persistence configuration error: ${error.message}`);
    }
  }

  // Test 6: Build Configuration Analysis
  testBuildConfiguration() {
    this.log('\n🏗️ Build Configuration Deep Analysis...', 'cyan');
    
    try {
      // Check EAS configuration
      const easJsonPath = path.join(__dirname, '..', 'eas.json');
      if (fs.existsSync(easJsonPath)) {
        this.log('  ✅ EAS configuration: Exists', 'green');
        
        const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
        
        // Check for production build configuration
        if (easConfig.build && easConfig.build.production) {
          this.log('  ✅ Production build config: Exists', 'green');
          
          // Check for environment variables
          if (easConfig.build.production.env) {
            this.log('  ✅ Production env vars: Configured', 'green');
            
            const envVars = Object.keys(easConfig.build.production.env);
            this.log(`    📋 Environment variables: ${envVars.length} configured`, 'blue');
            
            // Check for critical variables
            const criticalVars = [
              'EXPO_PUBLIC_FIREBASE_API_KEY',
              'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
              'EXPO_PUBLIC_FIREBASE_APP_ID'
            ];
            
            criticalVars.forEach(varName => {
              if (easConfig.build.production.env[varName]) {
                this.log(`    ✅ ${varName}: Configured in EAS`, 'green');
              } else {
                this.log(`    ❌ ${varName}: Missing in EAS`, 'red');
                this.results.errors.push(`Missing EAS environment variable: ${varName}`);
              }
            });
          } else {
            this.log('  ❌ Production env vars: Not configured', 'red');
            this.results.errors.push('Production environment variables not configured in EAS');
          }
        } else {
          this.log('  ❌ Production build config: Missing', 'red');
          this.results.errors.push('Production build configuration missing in EAS');
        }
      } else {
        this.log('  ❌ EAS configuration: Missing', 'red');
        this.results.errors.push('EAS configuration file not found');
      }

      // Check app configuration
      const appConfigPath = path.join(__dirname, '..', 'app.config.js');
      if (fs.existsSync(appConfigPath)) {
        this.log('  ✅ App configuration: Exists', 'green');
        
        const content = fs.readFileSync(appConfigPath, 'utf8');
        
        // Check for environment variable usage
        if (content.includes('process.env') && content.includes('EXPO_PUBLIC_')) {
          this.log('  ✅ App env var usage: Configured', 'green');
        } else {
          this.log('  ⚠️ App env var usage: Not configured', 'yellow');
          this.results.warnings.push('App configuration not using environment variables');
        }

        // Check for proper icon configuration
        if (content.includes('android-app-icon-no-alpha.png')) {
          this.log('  ✅ App icon configuration: Consistent', 'green');
        } else {
          this.log('  ⚠️ App icon configuration: Inconsistent', 'yellow');
          this.results.warnings.push('App icon configuration may be inconsistent');
        }

      } else {
        this.log('  ❌ App configuration: Missing', 'red');
        this.results.errors.push('App configuration file not found');
      }

    } catch (error) {
      this.log(`  ❌ Build configuration error: ${error.message}`, 'red');
      this.results.errors.push(`Build configuration error: ${error.message}`);
    }
  }

  // Test 7: Authentication Flow Analysis
  testAuthenticationFlow() {
    this.log('\n🔐 Authentication Flow Deep Analysis...', 'cyan');
    
    try {
      // Check AuthService
      const authServicePath = path.join(__dirname, '..', 'src', 'services', 'AuthService.ts');
      if (fs.existsSync(authServicePath)) {
        this.log('  ✅ AuthService: Exists', 'green');
        
        const content = fs.readFileSync(authServicePath, 'utf8');
        
        // Check for all authentication methods
        const authMethods = ['signInWithGoogle', 'signInWithApple', 'signInWithTwitter', 'signInWithEmail'];
        authMethods.forEach(method => {
          if (content.includes(method)) {
            this.log(`    ✅ ${method}: Implemented`, 'green');
          } else {
            this.log(`    ❌ ${method}: Missing`, 'red');
            this.results.errors.push(`Authentication method missing: ${method}`);
          }
        });

        // Check for error handling
        if (content.includes('try') && content.includes('catch') && content.includes('logger.error')) {
          this.log('  ✅ Error handling: Configured', 'green');
        } else {
          this.log('  ⚠️ Error handling: Not configured', 'yellow');
          this.results.warnings.push('Authentication error handling not configured');
        }

        // Check for environment variable usage
        if (content.includes('getEnvVarSafe') && content.includes('EXPO_PUBLIC_')) {
          this.log('  ✅ Environment variable usage: Configured', 'green');
        } else {
          this.log('  ⚠️ Environment variable usage: Not configured', 'yellow');
          this.results.warnings.push('AuthService not using proper environment variables');
        }

      } else {
        this.log('  ❌ AuthService: Missing', 'red');
        this.results.errors.push('AuthService not found');
      }

      // Check AuthMethodsScreen
      const authMethodsPath = path.join(__dirname, '..', 'src', 'screens', 'AuthMethods', 'AuthMethodsScreen.tsx');
      if (fs.existsSync(authMethodsPath)) {
        this.log('  ✅ AuthMethodsScreen: Exists', 'green');
        
        const content = fs.readFileSync(authMethodsPath, 'utf8');
        
        // Check for timeout handling
        if (content.includes('timeout') && content.includes('60000')) {
          this.log('  ✅ Timeout handling: Configured', 'green');
        } else {
          this.log('  ⚠️ Timeout handling: Not configured', 'yellow');
          this.results.warnings.push('Authentication timeout handling not configured');
        }

        // Check for loading states
        if (content.includes('loading') && content.includes('ActivityIndicator')) {
          this.log('  ✅ Loading states: Configured', 'green');
        } else {
          this.log('  ⚠️ Loading states: Not configured', 'yellow');
          this.results.warnings.push('Authentication loading states not configured');
        }

      } else {
        this.log('  ❌ AuthMethodsScreen: Missing', 'red');
        this.results.errors.push('AuthMethodsScreen not found');
      }

    } catch (error) {
      this.log(`  ❌ Authentication flow error: ${error.message}`, 'red');
      this.results.errors.push(`Authentication flow error: ${error.message}`);
    }
  }

  // Generate comprehensive report
  generateReport() {
    this.log('\n📊 Deep Authentication Audit Report', 'cyan');
    this.log('============================================================', 'cyan');
    
    const totalTests = 7;
    const errorCount = this.results.errors.length;
    const warningCount = this.results.warnings.length;
    
    this.log(`\nOverall Status: ${errorCount === 0 ? 'PASS' : 'FAIL'}`, 
             errorCount === 0 ? 'green' : 'red');
    
    this.log(`Errors: ${errorCount}`, errorCount === 0 ? 'green' : 'red');
    this.log(`Warnings: ${warningCount}`, warningCount === 0 ? 'green' : 'yellow');
    
    if (this.results.errors.length > 0) {
      this.log('\n❌ Critical Issues Found:', 'red');
      this.results.errors.forEach((error, index) => {
        this.log(`  ${index + 1}. ${error}`, 'red');
      });
    }
    
    if (this.results.warnings.length > 0) {
      this.log('\n⚠️ Warnings:', 'yellow');
      this.results.warnings.forEach((warning, index) => {
        this.log(`  ${index + 1}. ${warning}`, 'yellow');
      });
    }

    this.log('\n💡 Production Recommendations:', 'cyan');
    
    if (errorCount > 0) {
      this.log('  1. Fix all critical issues listed above', 'yellow');
      this.log('  2. Ensure all environment variables are set in EAS', 'yellow');
      this.log('  3. Test authentication in development first', 'yellow');
      this.log('  4. Build production APK and test thoroughly', 'yellow');
    } else if (warningCount > 0) {
      this.log('  1. Address warnings for better production stability', 'yellow');
      this.log('  2. Test authentication thoroughly in production', 'yellow');
      this.log('  3. Monitor authentication logs in production', 'yellow');
    } else {
      this.log('  1. ✅ All tests passed - ready for production!', 'green');
      this.log('  2. Build production APK: eas build --platform android --profile production', 'green');
      this.log('  3. Test authentication in production build', 'green');
    }

    this.log('\n🔧 Quick Fixes:', 'cyan');
    this.log('  • Run: npm run test:firebase:functions', 'blue');
    this.log('  • Run: npm run test:production:all', 'blue');
    this.log('  • Check EAS environment variables: eas env:list --environment production', 'blue');
    this.log('  • Add SHA-1 fingerprint to Google OAuth client', 'blue');
  }

  async run() {
    this.log('🚀 Deep Authentication Audit for Production Issues', 'bright');
    this.log('This will perform a comprehensive analysis of all authentication components.\n', 'cyan');

    this.testEnvironmentVariables();
    this.testFirebaseConfiguration();
    this.testOAuthConfiguration();
    this.testNetworkConfiguration();
    this.testPersistenceConfiguration();
    this.testBuildConfiguration();
    this.testAuthenticationFlow();
    this.generateReport();
  }
}

// Run the audit
if (require.main === module) {
  const audit = new DeepAuthAudit();
  audit.run().catch(error => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
}

module.exports = DeepAuthAudit;
