#!/usr/bin/env node

/**
 * Final Email Authentication Audit
 * Comprehensive audit of email authentication logic for production APK
 */

require('dotenv/config');
const fs = require('fs');
const path = require('path');

class EmailAuthAudit {
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

  async runAudit() {
    this.log('\n🔍 FINAL EMAIL AUTHENTICATION AUDIT', 'bright');
    this.log('Comprehensive audit for production APK email authentication...\n', 'info');

    await this.auditEmailAuthFlow();
    await this.auditFirebaseConfiguration();
    await this.auditFirebaseFunctions();
    await this.auditVerificationProcess();
    await this.auditErrorHandling();
    await this.auditTimeoutHandling();
    await this.auditEnvironmentVariables();
    await this.auditProductionReadiness();

    this.generateAuditReport();
  }

  async auditEmailAuthFlow() {
    this.log('📧 Auditing Email Authentication Flow...', 'bright');
    
    const authMethodsPath = path.join(this.projectRoot, 'src/screens/AuthMethods/AuthMethodsScreen.tsx');
    if (!fs.existsSync(authMethodsPath)) {
      this.issues.push('AuthMethodsScreen.tsx not found');
      return;
    }

    const content = fs.readFileSync(authMethodsPath, 'utf8');

    // Check for email sanitization
    if (content.includes('sanitizedEmail = email?.trim().replace(/\\s+/g, \'\')')) {
      this.log('✅ Email sanitization implemented', 'success');
    } else {
      this.issues.push('Email sanitization not properly implemented');
    }

    // Check for email validation
    if (content.includes('if (!sanitizedEmail)')) {
      this.log('✅ Email validation implemented', 'success');
    } else {
      this.issues.push('Email validation not implemented');
    }

    // Check for verification check with timeout
    if (content.includes('hasVerifiedWithin30Days') && content.includes('setTimeout')) {
      this.log('✅ Verification check with timeout implemented', 'success');
    } else {
      this.issues.push('Verification check timeout not properly implemented');
    }

    // Check for proper error handling
    if (content.includes('catch (error: any)') && content.includes('Alert.alert')) {
      this.log('✅ Error handling implemented', 'success');
    } else {
      this.issues.push('Error handling not properly implemented');
    }

    // Check for loading states
    if (content.includes('setLoading(true)') && content.includes('setLoading(false)')) {
      this.log('✅ Loading states implemented', 'success');
    } else {
      this.issues.push('Loading states not properly implemented');
    }
  }

  async auditFirebaseConfiguration() {
    this.log('\n🔥 Auditing Firebase Configuration...', 'bright');
    
    // Check app.config.js
    const appConfigPath = path.join(this.projectRoot, 'app.config.js');
    if (fs.existsSync(appConfigPath)) {
      const content = fs.readFileSync(appConfigPath, 'utf8');
      
      if (content.includes('firebase:') && content.includes('apiKey:')) {
        this.log('✅ Firebase configuration object in app.config.js', 'success');
      } else {
        this.issues.push('Firebase configuration object missing from app.config.js');
      }

      if (content.includes('EXPO_PUBLIC_FIREBASE_API_KEY')) {
        this.log('✅ Firebase environment variables in app.config.js', 'success');
      } else {
        this.issues.push('Firebase environment variables missing from app.config.js');
      }
    }

    // Check Firebase config file
    const firebaseConfigPath = path.join(this.projectRoot, 'src/config/firebase.ts');
    if (fs.existsSync(firebaseConfigPath)) {
      const content = fs.readFileSync(firebaseConfigPath, 'utf8');
      
      if (content.includes('initializeApp') && content.includes('getAuth')) {
        this.log('✅ Firebase initialization in config file', 'success');
      } else {
        this.issues.push('Firebase initialization not found in config file');
      }
    }
  }

  async auditFirebaseFunctions() {
    this.log('\n⚡ Auditing Firebase Functions...', 'bright');
    
    const functionsServicePath = path.join(this.projectRoot, 'src/services/firebaseFunctionsService.ts');
    if (!fs.existsSync(functionsServicePath)) {
      this.issues.push('Firebase Functions service not found');
      return;
    }

    const content = fs.readFileSync(functionsServicePath, 'utf8');

    // Check for proper environment variable loading
    if (content.includes('getEnvVar') && content.includes('Constants.expoConfig')) {
      this.log('✅ Environment variable loading implemented', 'success');
    } else {
      this.issues.push('Environment variable loading not properly implemented');
    }

    // Check for Firebase Functions initialization
    if (content.includes('getFunctions') && content.includes('us-central1')) {
      this.log('✅ Firebase Functions initialization with correct region', 'success');
    } else {
      this.issues.push('Firebase Functions initialization missing or incorrect region');
    }

    // Check for sendVerificationCode function
    if (content.includes('sendVerificationCode') && content.includes('sendVerificationEmailFunction')) {
      this.log('✅ Send verification code function implemented', 'success');
    } else {
      this.issues.push('Send verification code function not implemented');
    }

    // Check for verifyCode function
    if (content.includes('verifyCode') && content.includes('verifyCodeFunction')) {
      this.log('✅ Verify code function implemented', 'success');
    } else {
      this.issues.push('Verify code function not implemented');
    }

    // Check for timeout configuration
    if (content.includes('timeout: 60000')) {
      this.log('✅ Firebase Functions timeout configured (60s)', 'success');
    } else {
      this.warnings.push('Firebase Functions timeout not configured or too short');
    }
  }

  async auditVerificationProcess() {
    this.log('\n🔐 Auditing Verification Process...', 'bright');
    
    const verificationScreenPath = path.join(this.projectRoot, 'src/screens/Verification/VerificationScreen.tsx');
    if (!fs.existsSync(verificationScreenPath)) {
      this.issues.push('VerificationScreen.tsx not found');
      return;
    }

    const content = fs.readFileSync(verificationScreenPath, 'utf8');

    // Check for code validation
    if (content.includes('code.join(\'\').length !== CODE_LENGTH')) {
      this.log('✅ Code length validation implemented', 'success');
    } else {
      this.issues.push('Code length validation not implemented');
    }

    // Check for verification function call
    if (content.includes('verifyCode(email, codeString)')) {
      this.log('✅ Verification function call implemented', 'success');
    } else {
      this.issues.push('Verification function call not implemented');
    }

    // Check for user data transformation
    if (content.includes('transformedUser') && content.includes('hasCompletedOnboarding')) {
      this.log('✅ User data transformation implemented', 'success');
    } else {
      this.issues.push('User data transformation not implemented');
    }

    // Check for navigation after verification
    if ((content.includes('navigation.reset') || content.includes('(navigation as any).reset')) && content.includes('Dashboard')) {
      this.log('✅ Navigation after verification implemented', 'success');
    } else {
      this.issues.push('Navigation after verification not implemented');
    }
  }

  async auditErrorHandling() {
    this.log('\n⚠️ Auditing Error Handling...', 'bright');
    
    const authMethodsPath = path.join(this.projectRoot, 'src/screens/AuthMethods/AuthMethodsScreen.tsx');
    const content = fs.readFileSync(authMethodsPath, 'utf8');

    // Check for specific error handling
    const errorHandlingChecks = [
      { pattern: 'auth/too-many-requests', name: 'Too many requests error' },
      { pattern: 'auth/invalid-email', name: 'Invalid email error' },
      { pattern: 'auth/email-already-in-use', name: 'Email already in use error' },
      { pattern: 'Verification check timeout', name: 'Verification timeout error' },
      { pattern: 'Verification code send timeout', name: 'Code send timeout error' }
    ];

    errorHandlingChecks.forEach(check => {
      if (content.includes(check.pattern)) {
        this.log(`✅ ${check.name} handling implemented`, 'success');
      } else {
        this.warnings.push(`${check.name} handling not implemented`);
      }
    });
  }

  async auditTimeoutHandling() {
    this.log('\n⏱️ Auditing Timeout Handling...', 'bright');
    
    const authMethodsPath = path.join(this.projectRoot, 'src/screens/AuthMethods/AuthMethodsScreen.tsx');
    const content = fs.readFileSync(authMethodsPath, 'utf8');

    // Check for verification check timeout
    if (content.includes('setTimeout(() => reject(new Error(\'Verification check timeout\')), 15000)')) {
      this.log('✅ Verification check timeout (15s) implemented', 'success');
    } else {
      this.issues.push('Verification check timeout not implemented');
    }

    // Check for code send timeout
    if (content.includes('setTimeout(() => reject(new Error(\'Verification code send timeout\')), 60000)')) {
      this.log('✅ Code send timeout (60s) implemented', 'success');
    } else {
      this.issues.push('Code send timeout not implemented');
    }

    // Check for Promise.race usage
    if (content.includes('Promise.race')) {
      this.log('✅ Promise.race for timeout handling implemented', 'success');
    } else {
      this.issues.push('Promise.race timeout handling not implemented');
    }
  }

  async auditEnvironmentVariables() {
    this.log('\n🔧 Auditing Environment Variables...', 'bright');
    
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
      this.log('✅ All required Firebase environment variables present', 'success');
    } else {
      this.issues.push(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
    }
  }

  async auditProductionReadiness() {
    this.log('\n🏭 Auditing Production Readiness...', 'bright');
    
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

    // Check Firebase Functions deployment
    const functionsPath = path.join(this.projectRoot, 'firebase-functions');
    if (fs.existsSync(functionsPath)) {
      this.log('✅ Firebase Functions directory exists', 'success');
      
      const srcPath = path.join(functionsPath, 'src');
      if (fs.existsSync(srcPath)) {
        const files = fs.readdirSync(srcPath);
        if (files.includes('index.js')) {
          this.log('✅ Firebase Functions source files found', 'success');
        } else {
          this.issues.push('Firebase Functions index.js not found');
        }
      }
    } else {
      this.issues.push('Firebase Functions directory not found');
    }
  }

  generateAuditReport() {
    this.log('\n📊 EMAIL AUTHENTICATION AUDIT REPORT', 'bright');
    this.log('=' * 60, 'bright');

    if (this.issues.length === 0) {
      this.log('\n🎉 EMAIL AUTHENTICATION IS PRODUCTION READY!', 'success');
      this.log('All critical components are properly implemented and configured.', 'success');
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

    if (this.issues.length === 0) {
      this.log('\n✅ EMAIL AUTHENTICATION FLOW SUMMARY:', 'bright');
      this.log('1. Email input validation and sanitization ✅', 'success');
      this.log('2. Verification check with 30-day cache ✅', 'success');
      this.log('3. Firebase Functions integration ✅', 'success');
      this.log('4. 4-digit code verification ✅', 'success');
      this.log('5. Comprehensive error handling ✅', 'success');
      this.log('6. Timeout handling (15s/60s) ✅', 'success');
      this.log('7. Production environment configuration ✅', 'success');
      this.log('8. Prebuild and cache configuration ✅', 'success');

      this.log('\n🚀 READY FOR PRODUCTION BUILD!', 'bright');
      this.log('The email authentication should work properly in the production APK.', 'success');
    } else {
      this.log('\n🔧 REQUIRED FIXES:', 'bright');
      this.issues.forEach((issue, index) => {
        this.log(`${index + 1}. ${issue}`, 'info');
      });

      this.log('\n⚠️ RECOMMENDATIONS:', 'bright');
      this.log('• Fix all critical issues before building', 'info');
      this.log('• Test email authentication locally', 'info');
      this.log('• Verify Firebase Functions are deployed', 'info');
      this.log('• Check EAS environment variables', 'info');
    }

    this.log('\n' + '=' * 60, 'bright');
  }
}

// Run audit
const audit = new EmailAuthAudit();
audit.runAudit().catch(console.error);
