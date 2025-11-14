/**
 * Firebase Cloud Functions - Main Entry Point
 * 
 * This file serves as the main entry point that exports all Firebase Functions.
 * Functions are organized into separate modules for better maintainability:
 * - emailFunctions.js: Email verification functions
 * - transactionFunctions.js: Transaction signing and submission functions
 * - moonpay.js: MoonPay integration functions
 * - aiService.js: AI service functions
 */

// Load environment variables from root .env file (for local emulator development)
// In production, Firebase Secrets are automatically available as process.env variables
// Priority: 1) Root .env, 2) Local .env (for backward compatibility), 3) Firebase Secrets
if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production') {
  try {
    const path = require('path');
    const rootEnvPath = path.join(__dirname, '../../../.env');
    const localEnvPath = path.join(__dirname, '../.env');
    
    // Try root .env first (centralized location)
    try {
      require('dotenv').config({ path: rootEnvPath });
      console.log('✅ Loaded environment variables from root .env file');
    } catch (rootError) {
      // Fallback to local .env if root doesn't exist
      try {
        require('dotenv').config({ path: localEnvPath });
        console.log('✅ Loaded environment variables from local .env file (firebase-functions/.env)');
      } catch (localError) {
        console.log('ℹ️  No .env file found, using environment variables from shell/Firebase Secrets');
      }
    }
  } catch (error) {
    // dotenv is optional - if it fails, we'll use environment variables from shell or Firebase Secrets
    console.log('ℹ️  dotenv not available, using environment variables from shell/Firebase Secrets');
  }
}

const admin = require('firebase-admin');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import and export email functions
const emailFunctions = require('./emailFunctions');
exports.sendVerificationEmail = emailFunctions.sendVerificationEmail;
exports.verifyCode = emailFunctions.verifyCode;

// Import and export MoonPay functions
const moonpayFunctions = require('./moonpay.js');
exports.createMoonPayURL = moonpayFunctions.createMoonPayURL;
exports.moonpayWebhook = moonpayFunctions.moonpayWebhook;
exports.getMoonPayTransactionStatus = moonpayFunctions.getMoonPayTransactionStatus;
exports.getUserMoonPayTransactions = moonpayFunctions.getUserMoonPayTransactions;

// Import and export AI functions
const aiService = require('./aiService');
exports.aiHealthCheck = aiService.aiHealthCheck;
exports.analyzeBill = aiService.analyzeBill;
exports.testAI = aiService.testAI;

// Import and export transaction functions
const transactionFunctions = require('./transactionFunctions');
exports.signTransaction = transactionFunctions.signTransaction;
exports.submitTransaction = transactionFunctions.submitTransaction;
exports.processUsdcTransfer = transactionFunctions.processUsdcTransfer;
exports.validateTransaction = transactionFunctions.validateTransaction;
exports.getTransactionFeeEstimate = transactionFunctions.getTransactionFeeEstimate;
exports.getCompanyWalletBalance = transactionFunctions.getCompanyWalletBalance;
