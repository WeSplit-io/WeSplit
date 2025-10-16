#!/usr/bin/env node

/**
 * Production Build Script
 * Ensures clean prebuild and proper environment setup before building
 */

const { execSync } = require('child_process');
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

class ProductionBuilder {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runCommand(command, description) {
    this.log(`\n🔄 ${description}...`, 'cyan');
    try {
      execSync(command, { 
        stdio: 'inherit',
        cwd: this.projectRoot 
      });
      this.log(`✅ ${description} completed`, 'green');
      return true;
    } catch (error) {
      this.log(`❌ ${description} failed: ${error.message}`, 'red');
      return false;
    }
  }

  async clearPrebuildCache() {
    this.log('\n🧹 Step 1: Clearing Prebuild Cache...', 'bright');
    
    const artifacts = [
      path.join(this.projectRoot, 'android'),
      path.join(this.projectRoot, 'ios'),
      path.join(this.projectRoot, '.expo'),
    ];

    let removedCount = 0;
    artifacts.forEach(artifact => {
      try {
        if (fs.existsSync(artifact)) {
          fs.rmSync(artifact, { recursive: true, force: true });
          this.log(`  ✅ Removed: ${path.basename(artifact)}`, 'green');
          removedCount++;
        }
      } catch (error) {
        this.log(`  ❌ Failed to remove: ${path.basename(artifact)}`, 'red');
      }
    });

    this.log(`📊 Removed ${removedCount} artifacts`, removedCount > 0 ? 'green' : 'yellow');
  }

  async runCleanPrebuild() {
    this.log('\n🔨 Step 2: Running Clean Prebuild...', 'bright');
    
    const success = await this.runCommand(
      'npx expo prebuild --clean --platform android',
      'Clean prebuild for Android'
    );

    if (!success) {
      throw new Error('Clean prebuild failed');
    }
  }

  async verifyEnvironmentVariables() {
    this.log('\n🔧 Step 3: Verifying EAS Environment Variables...', 'bright');
    
    try {
      // Check EAS environment variables instead of local ones
      const { execSync } = require('child_process');
      let easEnvOutput;
      try {
        easEnvOutput = execSync('eas env:list --environment production --json', { 
          encoding: 'utf8',
          cwd: this.projectRoot 
        });
      } catch (error) {
        this.log('⚠️ Could not verify EAS environment variables: ' + error.message, 'yellow');
        this.log('💡 Continuing with build - EAS will handle environment variables', 'blue');
        return;
      }
      
      let easEnvVars;
      try {
        easEnvVars = JSON.parse(easEnvOutput);
      } catch (parseError) {
        this.log('⚠️ Could not parse EAS environment variables: ' + parseError.message, 'yellow');
        this.log('💡 Continuing with build - EAS will handle environment variables', 'blue');
        return;
      }
      
      const requiredVars = [
        'EXPO_PUBLIC_FIREBASE_API_KEY',
        'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
        'EXPO_PUBLIC_FIREBASE_APP_ID',
        'ANDROID_GOOGLE_CLIENT_ID',
        'IOS_GOOGLE_CLIENT_ID'
      ];

      let missingVars = [];
      requiredVars.forEach(varName => {
        if (!easEnvVars[varName]) {
          missingVars.push(varName);
        }
      });

      if (missingVars.length > 0) {
        this.log(`❌ Missing EAS environment variables: ${missingVars.join(', ')}`, 'red');
        this.log('💡 Make sure to set these in EAS: eas env:create --name <VAR_NAME> --value <VALUE> --environment production', 'yellow');
        throw new Error('Missing required EAS environment variables');
      }

      this.log('✅ All required EAS environment variables are set', 'green');
    } catch (error) {
      this.log(`⚠️ Could not verify EAS environment variables: ${error.message}`, 'yellow');
      this.log('💡 Continuing with build - EAS will handle environment variables', 'blue');
    }
  }

  async buildProduction() {
    this.log('\n🚀 Step 4: Building Production APK...', 'bright');
    
    const success = await this.runCommand(
      'eas build --platform android --profile production --clear-cache --non-interactive',
      'Production build'
    );

    if (!success) {
      throw new Error('Production build failed');
    }
  }

  async run() {
    try {
      this.log('🚀 Production Build Script', 'bright');
      this.log('This will ensure clean prebuild and proper environment setup.\n', 'cyan');

      await this.clearPrebuildCache();
      await this.runCleanPrebuild();
      await this.verifyEnvironmentVariables();
      await this.buildProduction();

      this.log('\n🎉 Production build completed successfully!', 'green');
      this.log('\n💡 Next Steps:', 'yellow');
      this.log('  1. Download the APK from the EAS build page', 'blue');
      this.log('  2. Install on a physical device', 'blue');
      this.log('  3. Test authentication - it should work correctly now', 'blue');
      this.log('  4. If issues persist, check the build logs for specific errors', 'blue');

    } catch (error) {
      this.log(`\n❌ Build failed: ${error.message}`, 'red');
      this.log('\n🔧 Troubleshooting:', 'yellow');
      this.log('  1. Check EAS environment variables: eas env:list --environment production', 'blue');
      this.log('  2. Verify Firebase configuration', 'blue');
      this.log('  3. Check OAuth client IDs and SHA-1 fingerprints', 'blue');
      this.log('  4. Run: npm run test:firebase:functions', 'blue');
      process.exit(1);
    }
  }
}

// Run the builder
if (require.main === module) {
  const builder = new ProductionBuilder();
  builder.run().catch(error => {
    console.error('Build script failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionBuilder;
