#!/usr/bin/env node

/**
 * WeSplit APK Build Script
 * Handles environment variable validation and APK building for both Android and iOS
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
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n🔨 ${description}...`, 'yellow');
  log(`Running: ${command}`, 'cyan');
  
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    log(`✅ ${description} completed successfully`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed:`, 'red');
    log(error.message, 'red');
    return false;
  }
}

function validateEnvironment() {
  log('🔍 Validating build environment...', 'blue');
  
  // Check if EAS CLI is installed
  try {
    execSync('eas --version', { stdio: 'pipe' });
    log('✅ EAS CLI is installed', 'green');
  } catch (error) {
    log('❌ EAS CLI is not installed. Please install it:', 'red');
    log('npm install -g @expo/eas-cli', 'cyan');
    return false;
  }
  
  // Check if user is logged in to EAS
  try {
    execSync('eas whoami', { stdio: 'pipe' });
    log('✅ Logged in to EAS', 'green');
  } catch (error) {
    log('❌ Not logged in to EAS. Please log in:', 'red');
    log('eas login', 'cyan');
    return false;
  }
  
  // Check if project is configured
  const easJsonPath = path.join(process.cwd(), 'eas.json');
  if (!fs.existsSync(easJsonPath)) {
    log('❌ eas.json not found. Please run: eas build:configure', 'red');
    return false;
  }
  
  log('✅ Project is configured for EAS builds', 'green');
  return true;
}

function validateSecrets() {
  log('\n🔐 Validating EAS secrets...', 'blue');
  
  const requiredSecrets = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_HELIUS_API_KEY',
    'EXPO_PUBLIC_COMPANY_WALLET_ADDRESS'
  ];
  
  let allSecretsPresent = true;
  
  for (const secret of requiredSecrets) {
    try {
      execSync(`eas env:list --environment production | grep ${secret}`, { stdio: 'pipe' });
      log(`✅ ${secret}: Set`, 'green');
    } catch (error) {
      log(`❌ ${secret}: Not set`, 'red');
      allSecretsPresent = false;
    }
  }
  
  if (!allSecretsPresent) {
    log('\n⚠️  Some required secrets are missing. Please set them:', 'yellow');
    log('eas secret:create --scope project --name SECRET_NAME --value "your-secret-value"', 'cyan');
  }
  
  return allSecretsPresent;
}

function buildAPK(platform = 'android', profile = 'production') {
  log(`\n🚀 Building ${platform.toUpperCase()} APK/IPA...`, 'magenta');
  
  const command = `eas build --platform ${platform} --profile ${profile} --non-interactive`;
  
  if (runCommand(command, `${platform.toUpperCase()} build`)) {
    log(`\n✅ ${platform.toUpperCase()} build completed successfully!`, 'green');
    log('📱 Check your EAS dashboard for the download link:', 'cyan');
    log('https://expo.dev/accounts/[your-account]/projects/[your-project]/builds', 'cyan');
    return true;
  } else {
    log(`\n❌ ${platform.toUpperCase()} build failed!`, 'red');
    return false;
  }
}

function buildBothPlatforms() {
  log('\n🚀 Building for both platforms...', 'magenta');
  
  const androidSuccess = buildAPK('android', 'production');
  const iosSuccess = buildAPK('ios', 'production');
  
  if (androidSuccess && iosSuccess) {
    log('\n🎉 Both platform builds completed successfully!', 'green');
    return true;
  } else {
    log('\n⚠️  Some builds failed. Check the output above for details.', 'yellow');
    return false;
  }
}

function showBuildInstructions() {
  log('\n📋 Post-Build Instructions:', 'magenta');
  log('=' .repeat(50), 'cyan');
  
  log('\n1. Download your builds:', 'yellow');
  log('   - Visit your EAS dashboard', 'cyan');
  log('   - Find your latest builds', 'cyan');
  log('   - Download the APK/IPA files', 'cyan');
  
  log('\n2. Install on Android:', 'yellow');
  log('   - Transfer APK to your Android device', 'cyan');
  log('   - Enable "Unknown Sources" in Settings > Security', 'cyan');
  log('   - Tap the APK file to install', 'cyan');
  
  log('\n3. Install on iOS:', 'yellow');
  log('   - For TestFlight: Upload to App Store Connect', 'cyan');
  log('   - For direct install: Use Apple Configurator 2 or Xcode', 'cyan');
  
  log('\n4. Test the app:', 'yellow');
  log('   - Test user authentication', 'cyan');
  log('   - Test Firebase operations', 'cyan');
  log('   - Test Solana transactions', 'cyan');
  log('   - Test push notifications', 'cyan');
  
  log('\n5. Monitor for issues:', 'yellow');
  log('   - Check Firebase console for errors', 'cyan');
  log('   - Monitor EAS build logs', 'cyan');
  log('   - Test on different devices', 'cyan');
}

function main() {
  const args = process.argv.slice(2);
  const platform = args[0] || 'both';
  const profile = args[1] || 'production';
  
  log('🚀 WeSplit APK Build Script', 'bright');
  log('=' .repeat(50), 'cyan');
  
  // Validate environment
  if (!validateEnvironment()) {
    log('\n❌ Environment validation failed. Please fix the issues above.', 'red');
    process.exit(1);
  }
  
  // Validate secrets
  if (!validateSecrets()) {
    log('\n❌ Secret validation failed. Please set the missing secrets.', 'red');
    process.exit(1);
  }
  
  // Build based on platform
  let buildSuccess = false;
  
  switch (platform.toLowerCase()) {
    case 'android':
      buildSuccess = buildAPK('android', profile);
      break;
    case 'ios':
      buildSuccess = buildAPK('ios', profile);
      break;
    case 'both':
      buildSuccess = buildBothPlatforms();
      break;
    default:
      log(`❌ Unknown platform: ${platform}`, 'red');
      log('Valid options: android, ios, both', 'yellow');
      process.exit(1);
  }
  
  if (buildSuccess) {
    showBuildInstructions();
    log('\n🎉 Build process completed successfully!', 'green');
    process.exit(0);
  } else {
    log('\n❌ Build process failed. Please check the errors above.', 'red');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironment,
  validateSecrets,
  buildAPK,
  buildBothPlatforms,
  showBuildInstructions
};
