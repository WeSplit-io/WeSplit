/**
 * Configuration file for Split Wallet Cleanup Scripts
 * 
 * Copy this file and rename it to cleanup-config.local.js
 * Then fill in your actual configuration values.
 */

module.exports = {
  // Firebase Configuration
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || "your-api-key-here",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.FIREBASE_APP_ID || "your-app-id"
  },

  // Solana Configuration
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    usdcMintAddress: process.env.USDC_MINT_ADDRESS || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  },

  // Cleanup Configuration
  cleanup: {
    minBalanceThreshold: 0.001, // Consider wallets with less than this amount as empty
    defaultBatchSize: 50,       // Number of wallets to process in each batch
    defaultMinAgeDays: 7,       // Only delete wallets older than this many days
    rpcDelayMs: 100            // Delay between RPC calls to avoid rate limiting
  }
};
