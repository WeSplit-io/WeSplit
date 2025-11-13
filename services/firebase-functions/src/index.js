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
