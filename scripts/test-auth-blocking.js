#!/usr/bin/env node

/**
 * Test Authentication Blocking Points
 * This script tests each step of the authentication flow to identify where it fails
 */

require('dotenv/config');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, getDocs, query, where } = require('firebase/firestore');

class AuthBlockingTest {
  constructor() {
    this.projectRoot = process.cwd();
    this.testResults = [];
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

  async runTests() {
    this.log('\n🧪 Authentication Blocking Tests', 'bright');
    this.log('Testing each step of the authentication flow...\n', 'info');

    await this.testFirebaseInitialization();
    await this.testFirebaseAuth();
    await this.testFirestoreConnection();
    await this.testEmailVerification();
    await this.testOAuthConfiguration();

    this.generateTestReport();
  }

  async testFirebaseInitialization() {
    this.log('🔥 Testing Firebase Initialization...', 'bright');
    
    try {
      const firebaseConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      };

      // Check if all required config values are present
      const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
      
      if (missingKeys.length > 0) {
        this.testResults.push({
          test: 'Firebase Initialization',
          status: 'FAILED',
          error: `Missing Firebase config keys: ${missingKeys.join(', ')}`
        });
        return;
      }

      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      this.log('✅ Firebase initialized successfully', 'success');
      
      this.testResults.push({
        test: 'Firebase Initialization',
        status: 'PASSED',
        details: 'Firebase app initialized with all required configuration'
      });

    } catch (error) {
      this.testResults.push({
        test: 'Firebase Initialization',
        status: 'FAILED',
        error: error.message
      });
      this.log(`❌ Firebase initialization failed: ${error.message}`, 'error');
    }
  }

  async testFirebaseAuth() {
    this.log('\n🔐 Testing Firebase Authentication...', 'bright');
    
    try {
      const firebaseConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      };

      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);

      // Test auth object creation
      if (!auth) {
        throw new Error('Failed to create Firebase Auth instance');
      }

      this.log('✅ Firebase Auth instance created successfully', 'success');
      
      this.testResults.push({
        test: 'Firebase Authentication',
        status: 'PASSED',
        details: 'Firebase Auth instance created successfully'
      });

    } catch (error) {
      this.testResults.push({
        test: 'Firebase Authentication',
        status: 'FAILED',
        error: error.message
      });
      this.log(`❌ Firebase Auth test failed: ${error.message}`, 'error');
    }
  }

  async testFirestoreConnection() {
    this.log('\n🗄️ Testing Firestore Connection...', 'bright');
    
    try {
      const firebaseConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      };

      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);

      // Test Firestore connection by trying to read from a collection
      const testCollection = collection(db, 'test');
      const testQuery = query(testCollection, where('__name__', '==', 'non-existent-doc'));
      
      // This should not throw an error even if the document doesn't exist
      await getDocs(testQuery);
      
      this.log('✅ Firestore connection successful', 'success');
      
      this.testResults.push({
        test: 'Firestore Connection',
        status: 'PASSED',
        details: 'Successfully connected to Firestore'
      });

    } catch (error) {
      this.testResults.push({
        test: 'Firestore Connection',
        status: 'FAILED',
        error: error.message
      });
      this.log(`❌ Firestore connection failed: ${error.message}`, 'error');
    }
  }

  async testEmailVerification() {
    this.log('\n📧 Testing Email Verification Setup...', 'bright');
    
    try {
      // Check if Firebase Functions are accessible
      const functionsUrl = 'https://us-central1-wesplit-35186.cloudfunctions.net';
      
      // Test if the functions endpoint is reachable
      const { execSync } = require('child_process');
      try {
        execSync(`curl -s --connect-timeout 10 ${functionsUrl} > /dev/null`, { stdio: 'pipe' });
        this.log('✅ Firebase Functions endpoint is reachable', 'success');
        
        this.testResults.push({
          test: 'Email Verification',
          status: 'PASSED',
          details: 'Firebase Functions endpoint is reachable'
        });
      } catch (curlError) {
        this.testResults.push({
          test: 'Email Verification',
          status: 'FAILED',
          error: 'Firebase Functions endpoint not reachable'
        });
        this.log('❌ Firebase Functions endpoint not reachable', 'error');
      }

    } catch (error) {
      this.testResults.push({
        test: 'Email Verification',
        status: 'FAILED',
        error: error.message
      });
      this.log(`❌ Email verification test failed: ${error.message}`, 'error');
    }
  }

  async testOAuthConfiguration() {
    this.log('\n🔗 Testing OAuth Configuration...', 'bright');
    
    const oauthProviders = [
      { name: 'Google', clientId: 'EXPO_PUBLIC_GOOGLE_CLIENT_ID' },
      { name: 'Apple', clientId: 'EXPO_PUBLIC_APPLE_CLIENT_ID' },
      { name: 'Twitter', clientId: 'EXPO_PUBLIC_TWITTER_CLIENT_ID' }
    ];

    let allOAuthPassed = true;

    oauthProviders.forEach(provider => {
      const clientId = process.env[provider.clientId];
      if (!clientId) {
        this.testResults.push({
          test: `${provider.name} OAuth`,
          status: 'FAILED',
          error: `Missing ${provider.name} client ID`
        });
        this.log(`❌ ${provider.name} OAuth configuration missing`, 'error');
        allOAuthPassed = false;
      } else {
        this.log(`✅ ${provider.name} OAuth client ID present`, 'success');
      }
    });

    if (allOAuthPassed) {
      this.testResults.push({
        test: 'OAuth Configuration',
        status: 'PASSED',
        details: 'All OAuth providers configured correctly'
      });
    }
  }

  generateTestReport() {
    this.log('\n📊 AUTHENTICATION TEST REPORT', 'bright');
    this.log('=' * 50, 'bright');

    const passedTests = this.testResults.filter(result => result.status === 'PASSED');
    const failedTests = this.testResults.filter(result => result.status === 'FAILED');

    this.log(`\n✅ Passed Tests: ${passedTests.length}`, 'success');
    this.log(`❌ Failed Tests: ${failedTests.length}`, failedTests.length > 0 ? 'error' : 'success');

    if (failedTests.length > 0) {
      this.log('\n❌ FAILED TESTS:', 'error');
      failedTests.forEach((test, index) => {
        this.log(`${index + 1}. ${test.test}: ${test.error}`, 'error');
      });

      this.log('\n🔧 BLOCKING ISSUES IDENTIFIED:', 'bright');
      
      if (failedTests.some(test => test.test.includes('Firebase'))) {
        this.log('• Firebase configuration or connection issues', 'warning');
        this.log('  - Check Firebase project settings', 'info');
        this.log('  - Verify environment variables are set correctly', 'info');
        this.log('  - Ensure Firebase project is active', 'info');
      }
      
      if (failedTests.some(test => test.test.includes('OAuth'))) {
        this.log('• OAuth configuration issues', 'warning');
        this.log('  - Check OAuth client IDs in environment variables', 'info');
        this.log('  - Verify OAuth providers are configured in Firebase', 'info');
      }
      
      if (failedTests.some(test => test.test.includes('Email'))) {
        this.log('• Email verification issues', 'warning');
        this.log('  - Check Firebase Functions deployment', 'info');
        this.log('  - Verify email service configuration', 'info');
      }

      this.log('\n🚀 IMMEDIATE ACTIONS:', 'bright');
      this.log('1. Fix all failed tests listed above', 'info');
      this.log('2. Verify Firebase project is properly configured', 'info');
      this.log('3. Check EAS environment variables', 'info');
      this.log('4. Test authentication flow locally', 'info');
    } else {
      this.log('\n🎉 All authentication tests passed!', 'success');
      this.log('The authentication blocking issue may be:', 'info');
      this.log('• Runtime environment differences between development and production', 'info');
      this.log('• Network connectivity issues in production APK', 'info');
      this.log('• Timing issues with Firebase initialization', 'info');
      this.log('• Missing error handling in the authentication flow', 'info');
    }

    this.log('\n' + '=' * 50, 'bright');
  }
}

// Run tests
const authTest = new AuthBlockingTest();
authTest.runTests().catch(console.error);
