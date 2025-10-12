/**
 * Unified Configuration System
 * Consolidates all configuration into a single source of truth
 * Replaces multiple conflicting config systems
 */

import Constants from 'expo-constants';

// ============================================================================
// ENVIRONMENT TYPES
// ============================================================================

export type Environment = 'development' | 'staging' | 'production';

export interface UnifiedConfig {
  // Environment
  environment: Environment;
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
  
  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
  };
  
  // Blockchain Configuration
  blockchain: {
    network: 'devnet' | 'testnet' | 'mainnet';
    rpcUrl: string;
    rpcEndpoints: string[];
    usdcMintAddress: string;
    commitment: 'processed' | 'confirmed' | 'finalized';
    timeout: number;
    retries: number;
    heliusApiKey?: string;
  };
  
  // Firebase Configuration
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  
  // MoonPay Configuration
  moonpay: {
    apiKey?: string;
    secretKey?: string;
    baseUrl: string;
    widgetUrl: string;
  };
  
  // Security Configuration
  security: {
    encryptionKey: string;
    jwtSecret?: string;
  };
  
  // Feature Flags
  features: {
    enableAnalytics: boolean;
    enableCrashReporting: boolean;
    enableDebugLogging: boolean;
    enableMockData: boolean;
  };
  
  // App Configuration
  app: {
    version: string;
    buildNumber: string;
    bundleIdentifier: string;
  };
}

// ============================================================================
// CONFIGURATION GETTER
// ============================================================================

/**
 * Get environment variable with fallback chain
 */
const getEnvVar = (key: string): string => {
  if (process.env[key]) return process.env[key]!;
  if (process.env[`EXPO_PUBLIC_${key}`]) return process.env[`EXPO_PUBLIC_${key}`]!;
  if (Constants.expoConfig?.extra?.[key]) return Constants.expoConfig.extra[key];
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];
  if ((Constants.manifest as any)?.extra?.[key]) return (Constants.manifest as any).extra[key];
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];
  return '';
};

/**
 * Get unified configuration
 */
export function getUnifiedConfig(): UnifiedConfig {
  const extra = Constants.expoConfig?.extra || {};
  const environment = (extra.APP_ENV as Environment) || 'development';
  const isProduction = environment === 'production';
  const isDevelopment = environment === 'development';
  const isStaging = environment === 'staging';
  
  const heliusApiKey = getEnvVar('HELIUS_API_KEY');
  const network = (extra.DEV_NETWORK as 'devnet' | 'testnet' | 'mainnet') || 'devnet';
  
  // Validate production environment
  if (isProduction && !heliusApiKey) {
    throw new Error('HELIUS_API_KEY is required for production builds');
  }
  
  // Network-specific configuration
  const getNetworkConfig = () => {
    switch (network) {
      case 'mainnet':
        return {
          rpcUrl: heliusApiKey 
            ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
            : 'https://api.mainnet-beta.solana.com',
          rpcEndpoints: heliusApiKey 
            ? [
                `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`,
                'https://api.mainnet-beta.solana.com',
                'https://solana-api.projectserum.com',
                'https://rpc.ankr.com/solana'
              ]
            : [
                'https://api.mainnet-beta.solana.com',
                'https://solana-api.projectserum.com',
                'https://rpc.ankr.com/solana',
                'https://mainnet.helius-rpc.com'
              ],
          usdcMintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          commitment: 'confirmed' as const,
          timeout: 15000,
          retries: 3,
        };
      case 'testnet':
        return {
          rpcUrl: 'https://api.testnet.solana.com',
          rpcEndpoints: [
            'https://api.testnet.solana.com',
            'https://testnet.helius-rpc.com'
          ],
          usdcMintAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Testnet USDC
          commitment: 'confirmed' as const,
          timeout: 20000,
          retries: 2,
        };
      default: // devnet
        return {
          rpcUrl: 'https://api.devnet.solana.com',
          rpcEndpoints: [
            'https://api.devnet.solana.com',
            'https://devnet.helius-rpc.com'
          ],
          usdcMintAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
          commitment: 'confirmed' as const,
          timeout: 20000,
          retries: 2,
        };
    }
  };
  
  const networkConfig = getNetworkConfig();
  
  return {
    environment,
    isProduction,
    isDevelopment,
    isStaging,
    
    api: {
      baseUrl: extra.API_BASE_URL || 'https://api.wesplit.com',
      timeout: parseInt(extra.API_TIMEOUT || '30000'),
    },
    
    blockchain: {
      network,
      rpcUrl: networkConfig.rpcUrl,
      rpcEndpoints: networkConfig.rpcEndpoints,
      usdcMintAddress: networkConfig.usdcMintAddress,
      commitment: networkConfig.commitment,
      timeout: networkConfig.timeout,
      retries: networkConfig.retries,
      heliusApiKey,
    },
    
    firebase: {
      apiKey: getEnvVar('FIREBASE_API_KEY'),
      authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
      projectId: getEnvVar('FIREBASE_PROJECT_ID'),
      storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnvVar('FIREBASE_APP_ID'),
      measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID'),
    },
    
    moonpay: {
      apiKey: getEnvVar('MOONPAY_API_KEY'),
      secretKey: getEnvVar('MOONPAY_SECRET_KEY'),
      baseUrl: extra.MOONPAY_BASE_URL || 'https://buy-sandbox.moonpay.com',
      widgetUrl: extra.MOONPAY_WIDGET_URL || 'https://buy-sandbox.moonpay.com',
    },
    
    security: {
      encryptionKey: getEnvVar('ENCRYPTION_KEY'),
      jwtSecret: getEnvVar('JWT_SECRET'),
    },
    
    features: {
      enableAnalytics: extra.ENABLE_ANALYTICS === 'true',
      enableCrashReporting: extra.ENABLE_CRASH_REPORTING === 'true',
      enableDebugLogging: extra.ENABLE_DEBUG_LOGGING === 'true' || isDevelopment,
      enableMockData: extra.ENABLE_MOCK_DATA === 'true' || isDevelopment,
    },
    
    app: {
      version: extra.APP_VERSION || '1.0.0',
      buildNumber: extra.BUILD_NUMBER || '1',
      bundleIdentifier: extra.BUNDLE_IDENTIFIER || 'com.wesplit.app',
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Singleton instance
let configInstance: UnifiedConfig | null = null;

export function getConfig(): UnifiedConfig {
  if (!configInstance) {
    configInstance = getUnifiedConfig();
  }
  return configInstance;
}

// Convenience exports
export const config = getConfig();
export default config;
