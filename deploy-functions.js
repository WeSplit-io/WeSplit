#!/usr/bin/env node

/**
 * Firebase Functions Deployment Script for WeSplit
 * This script helps deploy the Firebase Functions for email verification
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 WeSplit Firebase Functions Deployment Script');
console.log('==============================================\n');

// Check if Firebase CLI is installed
function checkFirebaseCLI() {
  try {
    execSync('firebase --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if we're in the right directory
function checkProjectStructure() {
  const requiredFiles = [
    'firebase.json',
    'firebase-functions/package.json',
    'firebase-functions/src/index.ts'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ Missing required file: ${file}`);
      return false;
    }
  }
  
  return true;
}

// Build the functions
function buildFunctions() {
  console.log('📦 Building Firebase Functions...');
  try {
    execSync('cd firebase-functions && npm run build', { stdio: 'inherit' });
    console.log('✅ Functions built successfully\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to build functions');
    return false;
  }
}

// Deploy functions
function deployFunctions() {
  console.log('🚀 Deploying Firebase Functions...');
  try {
    execSync('firebase deploy --only functions', { stdio: 'inherit' });
    console.log('✅ Functions deployed successfully\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to deploy functions');
    return false;
  }
}

// Set email configuration
function setEmailConfig() {
  console.log('📧 Email Configuration Setup');
  console.log('============================');
  console.log('You need to configure email credentials for sending verification emails.');
  console.log('');
  console.log('For Gmail:');
  console.log('1. Enable 2-Factor Authentication on your Gmail account');
  console.log('2. Generate an App Password:');
  console.log('   - Go to Google Account settings');
  console.log('   - Security → 2-Step Verification → App passwords');
  console.log('   - Generate a new app password for "Mail"');
  console.log('');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Enter your Gmail address (or press Enter to skip): ', (email) => {
      if (!email) {
        rl.close();
        resolve(false);
        return;
      }
      
      rl.question('Enter your Gmail app password: ', (password) => {
        rl.close();
        
        if (email && password) {
          try {
            execSync(`firebase functions:config:set email.user="${email}" email.password="${password}"`, { stdio: 'inherit' });
            console.log('✅ Email configuration set successfully\n');
            resolve(true);
          } catch (error) {
            console.error('❌ Failed to set email configuration');
            resolve(false);
          }
        } else {
          console.log('⚠️  Email configuration skipped\n');
          resolve(false);
        }
      });
    });
  });
}

// Main deployment process
async function main() {
  // Check prerequisites
  console.log('🔍 Checking prerequisites...');
  
  if (!checkFirebaseCLI()) {
    console.error('❌ Firebase CLI is not installed. Please install it first:');
    console.error('   npm install -g firebase-tools');
    process.exit(1);
  }
  
  if (!checkProjectStructure()) {
    console.error('❌ Project structure is invalid. Please run this script from the project root.');
    process.exit(1);
  }
  
  console.log('✅ Prerequisites check passed\n');
  
  // Ask for email configuration
  const emailConfigured = await setEmailConfig();
  
  // Build functions
  if (!buildFunctions()) {
    process.exit(1);
  }
  
  // Deploy functions
  if (!deployFunctions()) {
    process.exit(1);
  }
  
  // Success message
  console.log('🎉 Deployment completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Test the functions in Firebase Console');
  console.log('2. Check function logs for any errors');
  console.log('3. Test email sending with a real email address');
  console.log('');
  
  if (!emailConfigured) {
    console.log('⚠️  Email configuration not set. You can set it later with:');
    console.log('   firebase functions:config:set email.user="your-email@gmail.com" email.password="your-app-password"');
    console.log('');
  }
  
  console.log('📚 For more information, see: firebase-functions/DEPLOYMENT_GUIDE.md');
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
}

module.exports = { main }; 