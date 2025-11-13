/**
 * Unified Configuration System
 * Consolidates all configuration into a single source of truth
 * Replaces multiple conflicting config systems
 */

import Constants from 'expo-constants';
import { logger } from '../services/analytics/loggingService';

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
  if (process.env[key]) {return process.env[key]!;}
  if (process.env[`EXPO_PUBLIC_${key}`]) {return process.env[`EXPO_PUBLIC_${key}`]!;}
  if (Constants.expoConfig?.extra?.[key]) {return Constants.expoConfig.extra[key];}
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) {return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];}
  if ((Constants.manifest as any)?.extra?.[key]) {return (Constants.manifest as any).extra[key];}
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) {return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];}
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
  
  // Helper function to extract API key from URL or return as-is
  const extractApiKey = (value: string, baseUrl: string): string => {
    if (!value) return '';
    // If it's already a full URL, extract the key part
    if (value.startsWith('http')) {
      // Extract the last part after the last slash
      const parts = value.split('/');
      return parts[parts.length - 1] || value;
    }
    // If it contains the base URL, extract just the key
    if (value.includes(baseUrl)) {
      return value.replace(baseUrl, '').replace(/^\//, '').replace(/\/$/, '');
    }
    // Otherwise, return as-is (should be just the key)
    return value;
  };

  // Helper function to extract GetBlock API key (format: https://go.getblock.io/API_KEY)
  const extractGetBlockKey = (value: string): string => {
    if (!value) return '';
    if (value.startsWith('http')) {
      // Extract the API key from URL like https://go.getblock.io/API_KEY
      const match = value.match(/go\.getblock\.io\/([^\/\s]+)/);
      return match ? match[1] : value.split('/').pop() || value;
    }
    return value;
  };

  const heliusApiKey = extractApiKey(getEnvVar('HELIUS_API_KEY'), 'mainnet.helius-rpc.com');
  const alchemyApiKey = extractApiKey(getEnvVar('ALCHEMY_API_KEY'), 'solana-mainnet.g.alchemy.com/v2');
  const getBlockApiKey = extractGetBlockKey(getEnvVar('GETBLOCK_API_KEY'));
  const quickNodeEndpoint = getEnvVar('QUICKNODE_ENDPOINT');
  const chainstackEndpoint = getEnvVar('CHAINSTACK_ENDPOINT');
  
  // Use environment network setting - check both DEV_NETWORK and FORCE_MAINNET
  // FORCE_MAINNET takes precedence if set to 'true'
  const devNetwork = getEnvVar('DEV_NETWORK');
  const forceMainnet = getEnvVar('FORCE_MAINNET') === 'true' || getEnvVar('EXPO_PUBLIC_FORCE_MAINNET') === 'true';
  let network: 'devnet' | 'testnet' | 'mainnet' = 'devnet';
  
  if (forceMainnet) {
    network = 'mainnet';
  } else if (devNetwork) {
    // Normalize the network value
    const normalized = devNetwork.toLowerCase().trim();
    if (normalized === 'mainnet' || normalized === 'mainnet-beta') {
      network = 'mainnet';
    } else if (normalized === 'testnet') {
      network = 'testnet';
    } else {
      network = 'devnet';
    }
  }
  
  logger.info('Network configuration', { 
    network, 
    devNetwork, 
    forceMainnet,
    note: 'Network determined from DEV_NETWORK and FORCE_MAINNET environment variables'
  }, 'unified');
  
  // Configuration loaded
  
  // Validate production environment - recommend at least one RPC provider with API key
  if (isProduction && network === 'mainnet') {
    const hasRpcProvider = heliusApiKey || alchemyApiKey || getBlockApiKey || quickNodeEndpoint || chainstackEndpoint;
    if (!hasRpcProvider) {
      logger.warn('No RPC provider API keys configured for mainnet production. Performance may be degraded due to rate limits.', {
        note: 'Consider adding ALCHEMY_API_KEY, GETBLOCK_API_KEY, QUICKNODE_ENDPOINT, CHAINSTACK_ENDPOINT, or HELIUS_API_KEY'
      }, 'unified');
    }
  }
  
  // Network-specific configuration
  const getNetworkConfig = () => {
    switch (network) {
      case 'mainnet':
        // Build optimized RPC endpoint list prioritizing fast, reliable providers
        const mainnetEndpoints: string[] = [];
        
        // Tier 1: Fast free providers with API keys (prioritize by speed/reliability)
        // Alchemy - Best free tier (30M CU/month), sub-50ms latency
        if (alchemyApiKey && alchemyApiKey !== 'YOUR_ALCHEMY_API_KEY_HERE') {
          mainnetEndpoints.push(`https://solana-mainnet.g.alchemy.com/v2/${alchemyApiKey}`);
        }
        
        // GetBlock - Fastest (16-21ms latency)
        // GetBlock format: https://sol.getblock.io/mainnet/?api_key=YOUR_API_KEY
        if (getBlockApiKey && getBlockApiKey !== 'YOUR_GETBLOCK_API_KEY_HERE') {
          mainnetEndpoints.push(`https://sol.getblock.io/mainnet/?api_key=${getBlockApiKey}`);
        }
        
        // QuickNode - Most reliable (99.99% uptime, 72ms latency)
        if (quickNodeEndpoint && quickNodeEndpoint !== 'YOUR_QUICKNODE_ENDPOINT_HERE') {
          mainnetEndpoints.push(quickNodeEndpoint);
        }
        
        // Chainstack - Good balance (low latency, enterprise-grade)
        if (chainstackEndpoint && chainstackEndpoint !== 'YOUR_CHAINSTACK_ENDPOINT_HERE') {
          mainnetEndpoints.push(chainstackEndpoint);
        }
        
        // Tier 2: Helius (already configured, good performance with API key)
        if (heliusApiKey && heliusApiKey !== 'YOUR_HELIUS_API_KEY_HERE') {
          mainnetEndpoints.push(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`);
        }
        
        // Tier 3: Free providers without API keys (fallback, ordered by reliability)
        mainnetEndpoints.push('https://rpc.ankr.com/solana'); // Most reliable free option
        mainnetEndpoints.push('https://api.mainnet-beta.solana.com'); // Official, but rate limited
        
        // Tier 4: Last resort options
        // Project Serum - Keep as backup but lower priority (less reliable)
        mainnetEndpoints.push('https://solana-api.projectserum.com');
        
        // Alchemy demo - Very limited, last resort
        if (!alchemyApiKey || alchemyApiKey === 'YOUR_ALCHEMY_API_KEY_HERE') {
          mainnetEndpoints.push('https://solana-mainnet.g.alchemy.com/v2/demo');
        }
        
        // Determine primary RPC URL (use best available)
        const primaryRpcUrl = mainnetEndpoints[0] || 'https://api.mainnet-beta.solana.com';
        
        return {
          rpcUrl: primaryRpcUrl,
          rpcEndpoints: mainnetEndpoints,
          usdcMintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          commitment: 'confirmed' as const,
          timeout: isProduction ? 25000 : 15000, // Longer timeout for production builds
          retries: isProduction ? 4 : 3, // More retries for production builds
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
      // SECURITY: secretKey removed - must be handled by backend services only
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

// Clear configuration cache to force reload
export function clearConfigCache(): void {
  configInstance = null;
  logger.info('Configuration cache cleared', null, 'unified');
}

// Convenience exports
export const config = getConfig();
export default config;
