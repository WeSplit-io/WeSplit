/**
 * Environment Configuration
 * Centralized environment variable management
 */

import Constants from 'expo-constants';

/**
 * Environment types
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Environment configuration
 */
export interface EnvConfig {
  NODE_ENV: Environment;
  APP_ENV: Environment;
  IS_PRODUCTION: boolean;
  IS_DEVELOPMENT: boolean;
  IS_STAGING: boolean;
  
  // API Configuration
  API_BASE_URL: string;
  API_TIMEOUT: number;
  
  // Blockchain Configuration
  SOLANA_RPC_URL: string;
  SOLANA_DEVNET_RPC_URL: string;
  SOLANA_TESTNET_RPC_URL: string;
  SOLANA_MAINNET_RPC_URL: string;
  HELIUS_API_KEY?: string;
  FORCE_MAINNET: boolean;
  DEV_NETWORK: 'devnet' | 'testnet' | 'mainnet';
  
  // Firebase Configuration
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID?: string;
  
  // MoonPay Configuration
  MOONPAY_API_KEY?: string;
  MOONPAY_SECRET_KEY?: string;
  MOONPAY_BASE_URL: string;
  MOONPAY_WIDGET_URL: string;
  
  // Security Configuration
  ENCRYPTION_KEY: string;
  JWT_SECRET?: string;
  
  // Feature Flags
  ENABLE_ANALYTICS: boolean;
  ENABLE_CRASH_REPORTING: boolean;
  ENABLE_DEBUG_LOGGING: boolean;
  ENABLE_MOCK_DATA: boolean;
  
  // App Configuration
  APP_NAME: string;
  APP_VERSION: string;
  BUILD_NUMBER: string;
  BUNDLE_IDENTIFIER: string;
}

/**
 * Get environment configuration
 */
export function getEnvConfig(): EnvConfig {
  const extra = Constants.expoConfig?.extra || {};
  
  return {
    // Environment
    NODE_ENV: (process.env.NODE_ENV as Environment) || 'development',
    APP_ENV: (extra.APP_ENV as Environment) || 'development',
    IS_PRODUCTION: extra.APP_ENV === 'production',
    IS_DEVELOPMENT: extra.APP_ENV === 'development' || !extra.APP_ENV,
    IS_STAGING: extra.APP_ENV === 'staging',
    
    // API Configuration
    API_BASE_URL: extra.API_BASE_URL || 'https://api.wesplit.com',
    API_TIMEOUT: parseInt(extra.API_TIMEOUT || '30000'),
    
    // Blockchain Configuration
    SOLANA_RPC_URL: extra.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    SOLANA_DEVNET_RPC_URL: extra.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
    SOLANA_TESTNET_RPC_URL: extra.SOLANA_TESTNET_RPC_URL || 'https://api.testnet.solana.com',
    SOLANA_MAINNET_RPC_URL: extra.SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
    HELIUS_API_KEY: extra.HELIUS_API_KEY,
    FORCE_MAINNET: extra.FORCE_MAINNET === 'true',
    DEV_NETWORK: (extra.DEV_NETWORK as 'devnet' | 'testnet' | 'mainnet') || 'devnet',
    
    // Firebase Configuration
    FIREBASE_API_KEY: extra.FIREBASE_API_KEY || '',
    FIREBASE_AUTH_DOMAIN: extra.FIREBASE_AUTH_DOMAIN || '',
    FIREBASE_PROJECT_ID: extra.FIREBASE_PROJECT_ID || '',
    FIREBASE_STORAGE_BUCKET: extra.FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: extra.FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID: extra.FIREBASE_APP_ID || '',
    FIREBASE_MEASUREMENT_ID: extra.FIREBASE_MEASUREMENT_ID,
    
    // MoonPay Configuration
    MOONPAY_API_KEY: extra.MOONPAY_API_KEY,
    MOONPAY_SECRET_KEY: extra.MOONPAY_SECRET_KEY,
    MOONPAY_BASE_URL: extra.MOONPAY_BASE_URL || 'https://buy-sandbox.moonpay.com',
    MOONPAY_WIDGET_URL: extra.MOONPAY_WIDGET_URL || 'https://buy-sandbox.moonpay.com',
    
    // Security Configuration
    ENCRYPTION_KEY: extra.ENCRYPTION_KEY || 'WeSplit_Secure_Storage_Key_2024',
    JWT_SECRET: extra.JWT_SECRET,
    
    // Feature Flags
    ENABLE_ANALYTICS: extra.ENABLE_ANALYTICS === 'true',
    ENABLE_CRASH_REPORTING: extra.ENABLE_CRASH_REPORTING === 'true',
    ENABLE_DEBUG_LOGGING: extra.ENABLE_DEBUG_LOGGING === 'true' || extra.APP_ENV === 'development',
    ENABLE_MOCK_DATA: extra.ENABLE_MOCK_DATA === 'true' || extra.APP_ENV === 'development',
    
    // App Configuration
    APP_NAME: Constants.expoConfig?.name || 'WeSplit',
    APP_VERSION: Constants.expoConfig?.version || '1.0.0',
    BUILD_NUMBER: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
    BUNDLE_IDENTIFIER: Constants.expoConfig?.ios?.bundleIdentifier || Constants.expoConfig?.android?.package || 'com.wesplit.app'
  };
}

/**
 * Validate environment configuration
 */
export function validateEnvConfig(config: EnvConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  const requiredFields: (keyof EnvConfig)[] = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID'
  ];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      errors.push(`Missing required environment variable: ${field}`);
    }
  }
  
  // Production-specific validations
  if (config.IS_PRODUCTION) {
    if (!config.HELIUS_API_KEY) {
      errors.push('HELIUS_API_KEY is required in production');
    }
    
    if (!config.FORCE_MAINNET) {
      errors.push('FORCE_MAINNET must be true in production');
    }
    
    if (config.MOONPAY_BASE_URL.includes('sandbox')) {
      errors.push('MoonPay sandbox URL not allowed in production');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get current environment configuration
 */
export const ENV_CONFIG = getEnvConfig();

/**
 * Validate current configuration
 */
export const ENV_VALIDATION = validateEnvConfig(ENV_CONFIG);

/**
 * Log configuration status
 */
if (ENV_CONFIG.ENABLE_DEBUG_LOGGING) {
  console.log('🔧 Environment Configuration:', {
    environment: ENV_CONFIG.APP_ENV,
    isProduction: ENV_CONFIG.IS_PRODUCTION,
    validationErrors: ENV_VALIDATION.errors
  });
  
  if (!ENV_VALIDATION.isValid) {
    console.warn('⚠️ Environment configuration validation failed:', ENV_VALIDATION.errors);
  }
}
