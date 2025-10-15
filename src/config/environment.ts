/**
 * Centralized Environment Configuration
 * Single source of truth for all environment variables and configuration
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '../services/loggingService';

// ============================================================================
// TYPES
// ============================================================================

export type Environment = 'development' | 'staging' | 'production';
export type Network = 'devnet' | 'testnet' | 'mainnet';

export interface EnvironmentConfig {
  // Environment
  environment: Environment;
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
  
  // Firebase
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  
  // Blockchain
  blockchain: {
    network: Network;
    rpcUrl: string;
    heliusApiKey?: string;
    forceMainnet: boolean;
  };
  
  // OAuth
  oauth: {
    google: {
      webClientId: string;
      androidClientId: string;
      iosClientId: string;
      clientSecret: string;
    };
    apple: {
      clientId: string;
      serviceId: string;
      teamId: string;
      keyId: string;
    };
    twitter: {
      clientId: string;
      clientSecret: string;
    };
  };
  
  // App Info
  app: {
    version: string;
    buildNumber: string;
    bundleId: string;
  };
  
  // Features
  features: {
    enableAnalytics: boolean;
    enableCrashReporting: boolean;
    enableDebugLogging: boolean;
  };
}

// ============================================================================
// ENVIRONMENT VARIABLE GETTER
// ============================================================================

/**
 * Get environment variable with comprehensive fallback chain
 * This is the ONLY place where environment variables should be accessed
 */
export const getEnvVar = (key: string): string => {
  // Try all possible sources in order of preference
  const sources = [
    process.env[key],
    process.env[`EXPO_PUBLIC_${key}`],
    Constants.expoConfig?.extra?.[key],
    Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`],
    (Constants.manifest as any)?.extra?.[key],
    (Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]
  ];
  
  for (const source of sources) {
    if (source && typeof source === 'string' && source.trim() !== '') {
      return source.trim();
    }
  }
  
  return '';
};

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
}

/**
 * Validate environment configuration
 */
export const validateEnvironment = (): ValidationResult => {
  const missingVars: string[] = [];
  const warnings: string[] = [];
  
  // Required Firebase variables
  const requiredFirebaseVars = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID'
  ];
  
  requiredFirebaseVars.forEach(varName => {
    if (!getEnvVar(varName)) {
      missingVars.push(varName);
    }
  });
  
  // Production-specific validation
  const environment = getEnvVar('NODE_ENV') || getEnvVar('APP_ENV') || 'development';
  if (environment === 'production') {
    if (!getEnvVar('EXPO_PUBLIC_HELIUS_API_KEY')) {
      warnings.push('EXPO_PUBLIC_HELIUS_API_KEY is missing in production');
    }
    
    if (getEnvVar('EXPO_PUBLIC_FORCE_MAINNET') !== 'true') {
      warnings.push('EXPO_PUBLIC_FORCE_MAINNET should be true in production');
    }
  }
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
    warnings
  };
};

// ============================================================================
// CONFIGURATION GETTER
// ============================================================================

/**
 * Get complete environment configuration
 * This is the ONLY function that should be used to access configuration
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const environment = (getEnvVar('NODE_ENV') || getEnvVar('APP_ENV') || 'development') as Environment;
  const isProduction = environment === 'production';
  const isDevelopment = environment === 'development';
  const isStaging = environment === 'staging';
  
  // Validate configuration
  const validation = validateEnvironment();
  if (!validation.isValid) {
    const errorMessage = `Missing required environment variables: ${validation.missingVars.join(', ')}`;
    logger.error('Environment validation failed', { missingVars: validation.missingVars }, 'environment');
    throw new Error(errorMessage);
  }
  
  // Log warnings
  if (validation.warnings.length > 0) {
    logger.warn('Environment warnings', { warnings: validation.warnings }, 'environment');
  }
  
  // Determine network configuration
  const forceMainnet = getEnvVar('EXPO_PUBLIC_FORCE_MAINNET') === 'true';
  const network: Network = forceMainnet ? 'mainnet' : (getEnvVar('EXPO_PUBLIC_DEV_NETWORK') as Network) || 'devnet';
  
  // Get RPC URL based on network
  const getRpcUrl = (): string => {
    const heliusApiKey = getEnvVar('EXPO_PUBLIC_HELIUS_API_KEY');
    if (heliusApiKey) {
      return `https://rpc.helius.xyz/?api-key=${heliusApiKey}`;
    }
    
    // Fallback to public RPCs
    switch (network) {
      case 'mainnet':
        return 'https://api.mainnet-beta.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'devnet':
      default:
        return 'https://api.devnet.solana.com';
    }
  };
  
  const config: EnvironmentConfig = {
    environment,
    isProduction,
    isDevelopment,
    isStaging,
    
    firebase: {
      apiKey: getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY'),
      authDomain: getEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
      projectId: getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
      storageBucket: getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID'),
      measurementId: getEnvVar('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID')
    },
    
    blockchain: {
      network,
      rpcUrl: getRpcUrl(),
      heliusApiKey: getEnvVar('EXPO_PUBLIC_HELIUS_API_KEY'),
      forceMainnet
    },
    
    oauth: {
      google: {
        webClientId: getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
        androidClientId: getEnvVar('ANDROID_GOOGLE_CLIENT_ID'),
        iosClientId: getEnvVar('IOS_GOOGLE_CLIENT_ID'),
        clientSecret: getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_SECRET')
      },
      apple: {
        clientId: getEnvVar('EXPO_PUBLIC_APPLE_CLIENT_ID'),
        serviceId: getEnvVar('EXPO_PUBLIC_APPLE_SERVICE_ID'),
        teamId: getEnvVar('EXPO_PUBLIC_APPLE_TEAM_ID'),
        keyId: getEnvVar('EXPO_PUBLIC_APPLE_KEY_ID')
      },
      twitter: {
        clientId: getEnvVar('EXPO_PUBLIC_TWITTER_CLIENT_ID'),
        clientSecret: getEnvVar('EXPO_PUBLIC_TWITTER_CLIENT_SECRET')
      }
    },
    
    app: {
      version: Constants.expoConfig?.version || '1.0.0',
      buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
      bundleId: Constants.expoConfig?.ios?.bundleIdentifier || Constants.expoConfig?.android?.package || 'com.wesplit.app'
    },
    
    features: {
      enableAnalytics: getEnvVar('ANALYTICS_ENABLED') === 'true',
      enableCrashReporting: getEnvVar('SENTRY_DSN') ? true : false,
      enableDebugLogging: isDevelopment || getEnvVar('LOG_LEVEL') === 'debug'
    }
  };
  
  // Log configuration (without sensitive data)
  logger.info('Environment configuration loaded', {
    environment: config.environment,
    network: config.blockchain.network,
    hasHeliusKey: !!config.blockchain.heliusApiKey,
    firebaseProjectId: config.firebase.projectId,
    appVersion: config.app.version
  }, 'environment');
  
  return config;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get platform-specific Google Client ID
 */
export const getPlatformGoogleClientId = (): string => {
  const config = getEnvironmentConfig();
  
  switch (Platform.OS) {
    case 'android':
      return config.oauth.google.androidClientId;
    case 'ios':
      return config.oauth.google.iosClientId;
    default:
      return config.oauth.google.webClientId;
  }
};

/**
 * Get OAuth redirect URI
 */
export const getOAuthRedirectUri = (): string => {
  return 'wesplit://auth';
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return getEnvironmentConfig().isProduction;
};

/**
 * Check if debug logging is enabled
 */
export const isDebugLoggingEnabled = (): boolean => {
  return getEnvironmentConfig().features.enableDebugLogging;
};

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let configInstance: EnvironmentConfig | null = null;

/**
 * Get cached configuration instance
 */
export const getConfig = (): EnvironmentConfig => {
  if (!configInstance) {
    configInstance = getEnvironmentConfig();
  }
  return configInstance;
};

/**
 * Clear cached configuration (useful for testing)
 */
export const clearConfigCache = (): void => {
  configInstance = null;
};

export default getConfig;
