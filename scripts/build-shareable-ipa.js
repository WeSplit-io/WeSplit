#!/usr/bin/env node

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

function execCommand(command, description) {
  log(`\n${colors.cyan}🔄 ${description}...${colors.reset}`);
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    log(`${colors.green}✅ ${description} completed successfully${colors.reset}`);
    return output;
  } catch (error) {
    log(`${colors.red}❌ ${description} failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

function checkPrerequisites() {
  log(`${colors.blue}🔍 Checking prerequisites...${colors.reset}`);
  
  // Check if EAS CLI is installed
  try {
    execSync('eas --version', { stdio: 'pipe' });
    log(`${colors.green}✅ EAS CLI is installed${colors.reset}`);
  } catch (error) {
    log(`${colors.red}❌ EAS CLI is not installed. Please install it with: npm install -g @expo/eas-cli${colors.reset}`);
    process.exit(1);
  }

  // Check if logged in to EAS
  try {
    execSync('eas whoami', { stdio: 'pipe' });
    log(`${colors.green}✅ Logged in to EAS${colors.reset}`);
  } catch (error) {
    log(`${colors.red}❌ Not logged in to EAS. Please run: eas login${colors.reset}`);
    process.exit(1);
  }

  // Check if .env file exists
  if (!fs.existsSync('.env')) {
    log(`${colors.yellow}⚠️  .env file not found. Make sure your environment variables are set${colors.reset}`);
  } else {
    log(`${colors.green}✅ .env file found${colors.reset}`);
  }
}

function showBuildOptions() {
  log(`\n${colors.bright}📱 Available build profiles for shareable IPA:${colors.reset}`);
  log(`${colors.cyan}1. internal-testing${colors.reset} - For internal testing (Ad Hoc distribution)`);
  log(`${colors.cyan}2. testflight${colors.reset} - For TestFlight distribution`);
  log(`${colors.cyan}3. preview${colors.reset} - For preview builds`);
  
  log(`\n${colors.yellow}💡 Recommendations:${colors.reset}`);
  log(`• Use ${colors.green}internal-testing${colors.reset} for sharing with specific testers via direct IPA installation`);
  log(`• Use ${colors.green}testflight${colors.reset} for broader testing through Apple's TestFlight platform`);
  log(`• Use ${colors.green}preview${colors.reset} for quick testing builds`);
}

function buildIPA(profile) {
  log(`\n${colors.bright}🚀 Building IPA with profile: ${profile}${colors.reset}`);
  
  const buildCommand = `eas build --platform ios --profile ${profile} --non-interactive`;
  
  execCommand(buildCommand, `Building IPA with ${profile} profile`);
  
  log(`\n${colors.green}🎉 IPA build completed!${colors.reset}`);
  log(`${colors.blue}📋 Next steps:${colors.reset}`);
  
  if (profile === 'internal-testing') {
    log(`1. Download the IPA from the EAS build page`);
    log(`2. Share the IPA file with testers`);
    log(`3. Testers need to install it via Xcode, Apple Configurator, or TestFlight`);
    log(`4. Make sure testers' device UDIDs are registered in your Apple Developer account`);
  } else if (profile === 'testflight') {
    log(`1. The build will be automatically uploaded to TestFlight`);
    log(`2. Go to App Store Connect to manage testers`);
    log(`3. Add testers and send them TestFlight invitations`);
    log(`4. Testers can install via TestFlight app`);
  } else {
    log(`1. Download the IPA from the EAS build page`);
    log(`2. Share with testers for installation`);
  }
}

function main() {
  log(`${colors.bright}${colors.magenta}🎯 WeSplit - Shareable IPA Builder${colors.reset}`);
  log(`${colors.blue}This script helps you build a shareable IPA for testers${colors.reset}\n`);

  checkPrerequisites();
  showBuildOptions();

  const args = process.argv.slice(2);
  let profile = args[0];

  if (!profile) {
    log(`\n${colors.yellow}Usage: node scripts/build-shareable-ipa.js <profile>${colors.reset}`);
    log(`${colors.cyan}Example: node scripts/build-shareable-ipa.js internal-testing${colors.reset}`);
    process.exit(1);
  }

  const validProfiles = ['internal-testing', 'testflight', 'preview'];
  if (!validProfiles.includes(profile)) {
    log(`${colors.red}❌ Invalid profile: ${profile}${colors.reset}`);
    log(`${colors.yellow}Valid profiles: ${validProfiles.join(', ')}${colors.reset}`);
    process.exit(1);
  }

  buildIPA(profile);
}

if (require.main === module) {
  main();
}

module.exports = { buildIPA, checkPrerequisites };
