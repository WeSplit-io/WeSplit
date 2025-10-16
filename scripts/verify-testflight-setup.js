#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

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

function checkCommand(command, description) {
  try {
    execSync(command, { stdio: 'pipe' });
    log(`${colors.green}✅ ${description}${colors.reset}`);
    return true;
  } catch (error) {
    log(`${colors.red}❌ ${description}${colors.reset}`);
    return false;
  }
}

function main() {
  log(`${colors.bright}${colors.magenta}🍎 TestFlight Setup Verification${colors.reset}`);
  log(`${colors.blue}Checking your TestFlight readiness...${colors.reset}\n`);

  let allGood = true;

  // Check EAS CLI
  if (!checkCommand('eas --version', 'EAS CLI installed')) {
    allGood = false;
  }

  // Check EAS login
  if (!checkCommand('eas whoami', 'Logged in to EAS')) {
    allGood = false;
  }

  // Check project info
  if (!checkCommand('eas project:info', 'Project configured in EAS')) {
    allGood = false;
  }

  // Check .env file
  if (fs.existsSync('.env')) {
    log(`${colors.green}✅ Environment variables configured${colors.reset}`);
  } else {
    log(`${colors.red}❌ .env file not found${colors.reset}`);
    allGood = false;
  }

  // Check app.config.js
  if (fs.existsSync('app.config.js')) {
    log(`${colors.green}✅ App configuration found${colors.reset}`);
  } else {
    log(`${colors.red}❌ app.config.js not found${colors.reset}`);
    allGood = false;
  }

  // Check EAS build configuration
  if (fs.existsSync('eas.json')) {
    log(`${colors.green}✅ EAS build configuration found${colors.reset}`);
  } else {
    log(`${colors.red}❌ eas.json not found${colors.reset}`);
    allGood = false;
  }

  log(`\n${colors.bright}📋 Next Steps:${colors.reset}`);
  
  if (allGood) {
    log(`${colors.green}🎉 All checks passed! You're ready for TestFlight.${colors.reset}`);
    log(`\n${colors.cyan}1. Go to App Store Connect: https://appstoreconnect.apple.com/${colors.reset}`);
    log(`${colors.cyan}2. Verify your app "WeSplit" exists${colors.reset}`);
    log(`${colors.cyan}3. Run: npm run build:ipa:mass${colors.reset}`);
    log(`${colors.cyan}4. Add testers in TestFlight section${colors.reset}`);
  } else {
    log(`${colors.red}❌ Some issues found. Please fix them before proceeding.${colors.reset}`);
    log(`\n${colors.yellow}Common fixes:${colors.reset}`);
    log(`• Run: eas login (if not logged in)`);
    log(`• Create .env file with your environment variables`);
    log(`• Ensure eas.json is properly configured`);
  }

  log(`\n${colors.blue}📖 For detailed setup instructions, see: TESTFLIGHT_SETUP_GUIDE.md${colors.reset}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
