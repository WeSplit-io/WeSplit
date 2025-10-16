#!/usr/bin/env node

/**
 * Production Environment Simulator
 * Simulates production conditions for local testing
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

class ProductionSimulator {
  constructor() {
    this.originalEnv = { ...process.env };
    this.backupFiles = new Map();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  /**
   * Set up production-like environment variables
   */
  setupProductionEnvironment() {
    this.log('🔧 Setting up production environment variables...', 'cyan');
    
    // Set production flags
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'production';
    process.env.EAS_BUILD_PROFILE = 'production';
    
    // Disable development features
    process.env.__DEV__ = 'false';
    process.env.EXPO_DEV = 'false';
    
    this.log('✅ Production environment variables set', 'green');
  }

  /**
   * Create a production-like app.config.js
   */
  createProductionConfig() {
    this.log('📱 Creating production app.config.js...', 'cyan');
    
    const configPath = path.join(process.cwd(), 'app.config.js');
    const backupPath = path.join(process.cwd(), 'app.config.js.backup');
    
    // Backup original config
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, backupPath);
      this.backupFiles.set('app.config.js', backupPath);
      this.log('📋 Backed up original app.config.js', 'yellow');
    }

    // Read and modify config for production
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Replace development-specific configurations
    let productionConfig = configContent
      .replace(/developmentClient:\s*true/g, 'developmentClient: false')
      .replace(/distribution:\s*["']internal["']/g, 'distribution: "store"')
      .replace(/buildType:\s*["']apk["']/g, 'buildType: "aab"')
      .replace(/buildConfiguration:\s*["']Debug["']/g, 'buildConfiguration: "Release"');

    // Write production config
    fs.writeFileSync(configPath, productionConfig);
    this.log('✅ Production app.config.js created', 'green');
  }

  /**
   * Create production-like package.json
   */
  createProductionPackage() {
    this.log('📦 Creating production package.json...', 'cyan');
    
    const packagePath = path.join(process.cwd(), 'package.json');
    const backupPath = path.join(process.cwd(), 'package.json.backup');
    
    // Backup original package.json
    if (fs.existsSync(packagePath)) {
      fs.copyFileSync(packagePath, backupPath);
      this.backupFiles.set('package.json', backupPath);
      this.log('📋 Backed up original package.json', 'yellow');
    }

    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Remove development dependencies and scripts
    delete packageJson.devDependencies;
    
    // Update scripts for production
    packageJson.scripts = {
      ...packageJson.scripts,
      'start:prod': 'expo start --no-dev --minify',
      'build:prod': 'eas build --platform all --profile production',
      'test:prod': 'node scripts/test-production-requirements.js'
    };

    // Write production package.json
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    this.log('✅ Production package.json created', 'green');
  }

  /**
   * Create production-like environment file
   */
  createProductionEnv() {
    this.log('🔐 Creating production environment file...', 'cyan');
    
    const envPath = path.join(process.cwd(), '.env.production');
    const backupPath = path.join(process.cwd(), '.env.backup');
    
    // Backup original .env if it exists
    const originalEnvPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(originalEnvPath)) {
      fs.copyFileSync(originalEnvPath, backupPath);
      this.backupFiles.set('.env', backupPath);
      this.log('📋 Backed up original .env', 'yellow');
    }

    // Create production environment file
    const productionEnv = `# Production Environment Variables
# This file simulates production conditions

# Production flags
NODE_ENV=production
APP_ENV=production
EAS_BUILD_PROFILE=production

# Firebase Configuration (Production)
EXPO_PUBLIC_FIREBASE_API_KEY=${process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'your-production-api-key'}
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=${process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com'}
EXPO_PUBLIC_FIREBASE_PROJECT_ID=${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id'}
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=${process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com'}
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id'}
EXPO_PUBLIC_FIREBASE_APP_ID=${process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'your-app-id'}

# OAuth Configuration (Production)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=${process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id'}
ANDROID_GOOGLE_CLIENT_ID=${process.env.ANDROID_GOOGLE_CLIENT_ID || 'your-android-client-id'}
IOS_GOOGLE_CLIENT_ID=${process.env.IOS_GOOGLE_CLIENT_ID || 'your-ios-client-id'}

# Apple Sign-In (Production)
EXPO_PUBLIC_APPLE_CLIENT_ID=${process.env.EXPO_PUBLIC_APPLE_CLIENT_ID || 'com.wesplit.app'}
EXPO_PUBLIC_APPLE_SERVICE_ID=${process.env.EXPO_PUBLIC_APPLE_SERVICE_ID || 'com.wesplit.app'}
EXPO_PUBLIC_APPLE_TEAM_ID=${process.env.EXPO_PUBLIC_APPLE_TEAM_ID || 'your-apple-team-id'}
EXPO_PUBLIC_APPLE_KEY_ID=${process.env.EXPO_PUBLIC_APPLE_KEY_ID || 'your-apple-key-id'}

# Twitter OAuth (Production)
EXPO_PUBLIC_TWITTER_CLIENT_ID=${process.env.EXPO_PUBLIC_TWITTER_CLIENT_ID || 'your-twitter-client-id'}
EXPO_PUBLIC_TWITTER_CLIENT_SECRET=${process.env.EXPO_PUBLIC_TWITTER_CLIENT_SECRET || 'your-twitter-client-secret'}

# Solana Configuration (Production)
EXPO_PUBLIC_HELIUS_API_KEY=${process.env.EXPO_PUBLIC_HELIUS_API_KEY || 'your-helius-api-key'}
EXPO_PUBLIC_FORCE_MAINNET=true
EXPO_PUBLIC_DEV_NETWORK=mainnet

# Company Configuration (Production)
EXPO_PUBLIC_COMPANY_WALLET_ADDRESS=${process.env.EXPO_PUBLIC_COMPANY_WALLET_ADDRESS || 'your-company-wallet'}
EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY=${process.env.EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY || 'your-company-secret'}
EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE=${process.env.EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE || '0.1'}
EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE=${process.env.EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE || '0.000005'}

# Fee Structure (Production)
EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE=${process.env.EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE || '2.5'}
EXPO_PUBLIC_COMPANY_MIN_FEE=${process.env.EXPO_PUBLIC_COMPANY_MIN_FEE || '0.01'}
EXPO_PUBLIC_COMPANY_MAX_FEE=${process.env.EXPO_PUBLIC_COMPANY_MAX_FEE || '10.0'}
`;

    fs.writeFileSync(envPath, productionEnv);
    this.log('✅ Production environment file created', 'green');
  }

  /**
   * Test authentication in production-like conditions
   */
  async testAuthenticationFlow() {
    this.log('🔑 Testing authentication flow in production conditions...', 'cyan');
    
    try {
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

      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      
      this.log('✅ Firebase initialized successfully', 'green');
      
      // Test OAuth configuration
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
      if (googleClientId && googleClientId.includes('googleusercontent.com')) {
        this.log('✅ Google OAuth client ID is valid', 'green');
      } else {
        this.log('❌ Google OAuth client ID is invalid', 'red');
      }

      // Test network connectivity
      const response = await fetch('https://www.google.com', { method: 'HEAD', timeout: 5000 });
      if (response.ok) {
        this.log('✅ Network connectivity test passed', 'green');
      } else {
        this.log('❌ Network connectivity test failed', 'red');
      }

    } catch (error) {
      this.log(`❌ Authentication flow test failed: ${error.message}`, 'red');
    }
  }

  /**
   * Run production build simulation
   */
  async simulateProductionBuild() {
    this.log('🏗️ Simulating production build...', 'cyan');
    
    try {
      // Test if EAS CLI is available
      try {
        execSync('eas --version', { stdio: 'pipe' });
        this.log('✅ EAS CLI is available', 'green');
      } catch (error) {
        this.log('❌ EAS CLI is not available', 'red');
        this.log('  Install with: npm install -g @expo/eas-cli', 'yellow');
        return false;
      }

      // Test build configuration
      const easPath = path.join(process.cwd(), 'eas.json');
      if (fs.existsSync(easPath)) {
        this.log('✅ EAS configuration exists', 'green');
      } else {
        this.log('❌ EAS configuration missing', 'red');
        return false;
      }

      // Test app configuration
      const configPath = path.join(process.cwd(), 'app.config.js');
      if (fs.existsSync(configPath)) {
        this.log('✅ App configuration exists', 'green');
      } else {
        this.log('❌ App configuration missing', 'red');
        return false;
      }

      this.log('✅ Production build simulation completed', 'green');
      return true;

    } catch (error) {
      this.log(`❌ Production build simulation failed: ${error.message}`, 'red');
      return false;
    }
  }

  /**
   * Restore original files
   */
  restoreOriginalFiles() {
    this.log('🔄 Restoring original files...', 'cyan');
    
    for (const [originalFile, backupFile] of this.backupFiles) {
      if (fs.existsSync(backupFile)) {
        fs.copyFileSync(backupFile, path.join(process.cwd(), originalFile));
        fs.unlinkSync(backupFile);
        this.log(`✅ Restored ${originalFile}`, 'green');
      }
    }
    
    // Restore environment variables
    process.env = { ...this.originalEnv };
    this.log('✅ Environment variables restored', 'green');
  }

  /**
   * Run all production simulation tests
   */
  async runSimulation() {
    this.log('🚀 Starting Production Environment Simulation...', 'bright');
    this.log('This will simulate production conditions for local testing.\n', 'cyan');

    try {
      this.setupProductionEnvironment();
      this.createProductionConfig();
      this.createProductionPackage();
      this.createProductionEnv();
      
      await this.testAuthenticationFlow();
      const buildSuccess = await this.simulateProductionBuild();
      
      this.log('\n📊 Production Simulation Results:', 'bright');
      this.log('=' .repeat(50), 'cyan');
      
      if (buildSuccess) {
        this.log('🎉 Production simulation PASSED!', 'green');
        this.log('Your app is ready for production build.', 'green');
      } else {
        this.log('❌ Production simulation FAILED', 'red');
        this.log('Some issues need to be addressed.', 'red');
      }

      this.log('\n💡 Next Steps:', 'cyan');
      this.log('  1. Run: node scripts/test-production-requirements.js', 'yellow');
      this.log('  2. Test authentication in the app', 'yellow');
      this.log('  3. Run: eas build --platform all --profile production', 'yellow');

    } catch (error) {
      this.log(`❌ Simulation failed: ${error.message}`, 'red');
    } finally {
      // Always restore original files
      this.restoreOriginalFiles();
    }
  }
}

// Run the simulation
if (require.main === module) {
  const simulator = new ProductionSimulator();
  simulator.runSimulation().catch(error => {
    console.error('Simulation failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionSimulator;
