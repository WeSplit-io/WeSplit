#!/usr/bin/env node

/**
 * Clear Prebuild Cache Script
 * Ensures clean builds by clearing all prebuild artifacts
 */

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

class PrebuildCacheCleaner {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  removeDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        this.log(`  ✅ Removed: ${path.basename(dirPath)}`, 'green');
        return true;
      }
      return false;
    } catch (error) {
      this.log(`  ❌ Failed to remove: ${path.basename(dirPath)} - ${error.message}`, 'red');
      return false;
    }
  }

  removeFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.log(`  ✅ Removed: ${path.basename(filePath)}`, 'green');
        return true;
      }
      return false;
    } catch (error) {
      this.log(`  ❌ Failed to remove: ${path.basename(filePath)} - ${error.message}`, 'red');
      return false;
    }
  }

  clearPrebuildArtifacts() {
    this.log('\n🧹 Clearing Prebuild Artifacts...', 'cyan');
    
    const artifacts = [
      // Native directories
      path.join(this.projectRoot, 'android'),
      path.join(this.projectRoot, 'ios'),
      
      // Build artifacts
      path.join(this.projectRoot, 'dist'),
      path.join(this.projectRoot, 'build'),
      path.join(this.projectRoot, '.expo'),
      
      // Cache directories
      path.join(this.projectRoot, 'node_modules', '.cache'),
      path.join(this.projectRoot, '.metro-cache'),
      path.join(this.projectRoot, '.expo-shared'),
      
      // Temporary files
      path.join(this.projectRoot, 'expo-env.d.ts'),
      path.join(this.projectRoot, 'metro.config.js.bak'),
    ];

    let removedCount = 0;
    artifacts.forEach(artifact => {
      if (this.removeDirectory(artifact) || this.removeFile(artifact)) {
        removedCount++;
      }
    });

    this.log(`\n📊 Removed ${removedCount} artifacts`, removedCount > 0 ? 'green' : 'yellow');
  }

  clearNpmCache() {
    this.log('\n📦 Clearing NPM Cache...', 'cyan');
    
    try {
      execSync('npm cache clean --force', { 
        stdio: 'inherit',
        cwd: this.projectRoot 
      });
      this.log('  ✅ NPM cache cleared', 'green');
    } catch (error) {
      this.log(`  ❌ Failed to clear NPM cache: ${error.message}`, 'red');
    }
  }

  clearExpoCache() {
    this.log('\n🚀 Clearing Expo Cache...', 'cyan');
    
    try {
      execSync('npx expo install --fix', { 
        stdio: 'inherit',
        cwd: this.projectRoot 
      });
      this.log('  ✅ Expo dependencies fixed', 'green');
    } catch (error) {
      this.log(`  ❌ Failed to fix Expo dependencies: ${error.message}`, 'red');
    }
  }

  runPrebuildClean() {
    this.log('\n🔨 Running Clean Prebuild...', 'cyan');
    
    try {
      execSync('npx expo prebuild --clean --platform android', { 
        stdio: 'inherit',
        cwd: this.projectRoot 
      });
      this.log('  ✅ Clean prebuild completed for Android', 'green');
    } catch (error) {
      this.log(`  ❌ Clean prebuild failed: ${error.message}`, 'red');
    }
  }

  generateReport() {
    this.log('\n📊 Prebuild Cache Cleanup Report', 'cyan');
    this.log('==================================================', 'cyan');
    
    this.log('\n✅ Cleanup completed!', 'green');
    this.log('\n💡 Next Steps:', 'yellow');
    this.log('  1. Run: eas build --platform android --profile production', 'blue');
    this.log('  2. The build will now use fresh prebuild artifacts', 'blue');
    this.log('  3. Environment variables will be properly loaded', 'blue');
    this.log('  4. Authentication should work correctly in production', 'blue');
    
    this.log('\n🔧 Manual Commands (if needed):', 'cyan');
    this.log('  • Clear cache: npm run clear:prebuild', 'blue');
    this.log('  • Clean prebuild: npx expo prebuild --clean', 'blue');
    this.log('  • Reset Metro: npx expo start --clear', 'blue');
  }

  async run() {
    this.log('🚀 Prebuild Cache Cleaner', 'bright');
    this.log('This will clear all prebuild artifacts for clean builds.\n', 'cyan');

    this.clearPrebuildArtifacts();
    this.clearNpmCache();
    this.clearExpoCache();
    this.runPrebuildClean();
    this.generateReport();
  }
}

// Run the cleaner
if (require.main === module) {
  const cleaner = new PrebuildCacheCleaner();
  cleaner.run().catch(error => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
}

module.exports = PrebuildCacheCleaner;
