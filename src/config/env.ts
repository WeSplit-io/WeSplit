/**
 * Environment Configuration for WeSplit
 * 
 * This file was recreated after being removed in commit 5f29c63.
 * It provides environment-specific configuration for the application.
 */

// Environment detection
export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;

// Firebase configuration
export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Solana configuration - use unified config if available
export const SOLANA_CONFIG = (() => {
  try {
    const { getConfig } = require('./unified');
    const config = getConfig();
    return {
      rpcUrl: config.blockchain.rpcUrl,
      devnetRpcUrl: config.blockchain.network === 'devnet' ? config.blockchain.rpcUrl : 'https://api.devnet.solana.com',
      testnetRpcUrl: config.blockchain.network === 'testnet' ? config.blockchain.rpcUrl : 'https://api.testnet.solana.com',
      commitment: config.blockchain.commitment,
      isDevNetwork: config.blockchain.network === 'devnet',
      heliusApiKey: config.blockchain.heliusApiKey,
    };
  } catch {
    // Fallback to environment variables with devnet as default
    const network = process.env.EXPO_PUBLIC_DEV_NETWORK || 'devnet';
    return {
      rpcUrl: process.env.SOLANA_RPC_URL || (network === 'mainnet' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com'),
      devnetRpcUrl: process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
      testnetRpcUrl: process.env.SOLANA_TESTNET_RPC_URL || 'https://api.testnet.solana.com',
      commitment: process.env.SOLANA_COMMITMENT || 'confirmed',
      isDevNetwork: network === 'devnet',
      heliusApiKey: process.env.EXPO_PUBLIC_HELIUS_API_KEY,
    };
  }
})();

// MoonPay configuration
export const MOONPAY_CONFIG = {
  apiKey: process.env.MOONPAY_API_KEY,
  secretKey: process.env.MOONPAY_SECRET_KEY,
  webhookSecret: process.env.MOONPAY_WEBHOOK_SECRET,
  publicApiKey: process.env.EXPO_PUBLIC_MOONPAY_API_KEY,
};

// Company wallet configuration
export const COMPANY_WALLET_CONFIG = {
  address: process.env.EXPO_PUBLIC_COMPANY_WALLET_ADDRESS,
  secretKey: process.env.EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY,
  minSolReserve: parseFloat(process.env.EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE || '0.1'),
  gasFeeEstimate: parseFloat(process.env.EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE || '0.00025'),
  feePercentage: parseFloat(process.env.EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE || '0.025'),
  minFee: parseFloat(process.env.EXPO_PUBLIC_COMPANY_MIN_FEE || '0.01'),
  maxFee: parseFloat(process.env.EXPO_PUBLIC_COMPANY_MAX_FEE || '10.0'),
};

// OAuth configuration
export const OAUTH_CONFIG = {
  google: {
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    clientSecret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET,
    androidClientId: process.env.ANDROID_GOOGLE_CLIENT_ID,
    iosClientId: process.env.IOS_GOOGLE_CLIENT_ID,
  },
  apple: {
    clientId: process.env.EXPO_PUBLIC_APPLE_CLIENT_ID,
    serviceId: process.env.EXPO_PUBLIC_APPLE_SERVICE_ID,
    teamId: process.env.EXPO_PUBLIC_APPLE_TEAM_ID,
    keyId: process.env.EXPO_PUBLIC_APPLE_KEY_ID,
  },
  twitter: {
    clientId: process.env.EXPO_PUBLIC_TWITTER_CLIENT_ID,
    clientSecret: process.env.EXPO_PUBLIC_TWITTER_CLIENT_SECRET,
  },
};

// JWT configuration
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'default-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
};

// Email configuration
export const EMAIL_CONFIG = {
  service: process.env.EMAIL_SERVICE,
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  from: process.env.EMAIL_FROM,
};

// Security configuration
export const SECURITY_CONFIG = {
  corsOrigin: process.env.CORS_ORIGIN || '*',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'),
    strictMax: parseInt(process.env.RATE_LIMIT_STRICT_MAX || '10'),
  },
};

// Monitoring configuration
export const MONITORING_CONFIG = {
  sentryDsn: process.env.SENTRY_DSN,
  sentryTracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  logLevel: process.env.LOG_LEVEL || 'info',
  logFormat: process.env.LOG_FORMAT || 'json',
  analyticsEnabled: process.env.ANALYTICS_ENABLED === 'true',
};

// File upload configuration
export const UPLOAD_CONFIG = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif'],
  maxFiles: parseInt(process.env.MAX_FILES || '5'),
};

// Cache configuration
export const CACHE_CONFIG = {
  ttl: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour
  maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100'),
  checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '600'), // 10 minutes
};

// Push notifications configuration
export const PUSH_CONFIG = {
  firebaseServerKey: process.env.FIREBASE_SERVER_KEY,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  enabled: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true',
};

// SSL configuration
export const SSL_CONFIG = {
  enabled: process.env.SSL_ENABLED === 'true',
  certPath: process.env.SSL_CERT_PATH,
  keyPath: process.env.SSL_KEY_PATH,
};

// Health check configuration
export const HEALTH_CONFIG = {
  interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'), // 5 seconds
};

// Business logic configuration
export const BUSINESS_CONFIG = {
  maxTransactionAmount: parseFloat(process.env.MAX_TRANSACTION_AMOUNT || '10000'),
  maxGroupMembers: parseInt(process.env.MAX_GROUP_MEMBERS || '50'),
  maxExpensesPerGroup: parseInt(process.env.MAX_EXPENSES_PER_GROUP || '1000'),
  verificationCodeExpiry: parseInt(process.env.VERIFICATION_CODE_EXPIRY || '300000'), // 5 minutes
  verificationCodeLength: parseInt(process.env.VERIFICATION_CODE_LENGTH || '6'),
};

// Privy configuration
export const PRIVY_CONFIG = {
  appId: process.env.EXPO_PUBLIC_PRIVY_APP_ID,
  authProvider: process.env.AUTH_PROVIDER || 'privy',
};

// Force mainnet flag
export const FORCE_MAINNET = process.env.EXPO_PUBLIC_FORCE_MAINNET === 'true';

export default {
  isDevelopment,
  isProduction,
  FIREBASE_CONFIG,
  SOLANA_CONFIG,
  MOONPAY_CONFIG,
  COMPANY_WALLET_CONFIG,
  OAUTH_CONFIG,
  JWT_CONFIG,
  EMAIL_CONFIG,
  SECURITY_CONFIG,
  MONITORING_CONFIG,
  UPLOAD_CONFIG,
  CACHE_CONFIG,
  PUSH_CONFIG,
  SSL_CONFIG,
  HEALTH_CONFIG,
  BUSINESS_CONFIG,
  PRIVY_CONFIG,
  FORCE_MAINNET,
};
