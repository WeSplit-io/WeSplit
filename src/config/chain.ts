/**
 * Hardened Chain Configuration for Production
 * Centralized configuration with mainnet enforcement
 */

import Constants from 'expo-constants';

export interface ChainConfig {
  name: string;
  rpcUrl: string;
  wsUrl?: string;
  rpcEndpoints: string[]; // Multiple RPC endpoints for failover
  usdcMintAddress: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
  isProduction: boolean;
  timeout: number;
  retries: number;
}

// Get environment variables from Expo Constants
const getEnvVar = (key: string): string => {
  return Constants.expoConfig?.extra?.[key] || process.env[key] || '';
};

// Environment validation
const APP_ENV = process.env.NODE_ENV || 'development';
const FORCE_MAINNET = getEnvVar('EXPO_PUBLIC_FORCE_MAINNET') === 'true';
const HELIUS_API_KEY = getEnvVar('EXPO_PUBLIC_HELIUS_API_KEY') || process.env.HELIUS_API_KEY;

// Production enforcement - only true if explicitly in production mode
const IS_PRODUCTION = APP_ENV === 'production';

// Validate production environment
if (IS_PRODUCTION && !HELIUS_API_KEY) {
  throw new Error('EXPO_PUBLIC_HELIUS_API_KEY is required for production builds');
}

// Network configurations
export const CHAIN_NETWORKS: Record<string, ChainConfig> = {
  mainnet: {
    name: 'mainnet',
    rpcUrl: HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com',
    wsUrl: HELIUS_API_KEY 
      ? `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
      : 'wss://api.mainnet-beta.solana.com',
    rpcEndpoints: HELIUS_API_KEY 
      ? [
          `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
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
    commitment: 'confirmed',
    isProduction: IS_PRODUCTION,
    timeout: 15000, // Reduced from 30s to 15s for better UX
    retries: 3,
  },
  // Development networks (only available in development)
  ...(IS_PRODUCTION ? {} : {
    devnet: {
      name: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
      wsUrl: 'wss://api.devnet.solana.com',
      rpcEndpoints: [
        'https://api.devnet.solana.com',
        'https://devnet.helius-rpc.com'
      ],
      usdcMintAddress: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
      commitment: 'confirmed',
      isProduction: false,
      timeout: 15000,
      retries: 3,
    },
    testnet: {
      name: 'testnet',
      rpcUrl: 'https://api.testnet.solana.com',
      wsUrl: 'wss://api.testnet.solana.com',
      rpcEndpoints: [
        'https://api.testnet.solana.com',
        'https://testnet.helius-rpc.com'
      ],
      usdcMintAddress: 'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp',
      commitment: 'confirmed',
      isProduction: false,
      timeout: 15000,
      retries: 3,
    },
  }),
};

// Get current network - mainnet only in production
export const getCurrentNetwork = (): ChainConfig => {
  if (IS_PRODUCTION) {
    return CHAIN_NETWORKS.mainnet;
  }
  
  // In development, default to mainnet for real USDC transactions
  // but allow devnet for testing
  const devNetwork = process.env.EXPO_PUBLIC_DEV_NETWORK;
  if (devNetwork && CHAIN_NETWORKS[devNetwork]) {
    console.warn(`⚠️ Using ${devNetwork} in development mode`);
    return CHAIN_NETWORKS[devNetwork];
  }
  
  return CHAIN_NETWORKS.mainnet;
};

// Export current configuration
export const CURRENT_NETWORK = getCurrentNetwork();

// Transaction configuration
export const TRANSACTION_CONFIG = {
  // Compute unit limits for different transaction types
  computeUnits: {
    simpleTransfer: 200000,
    tokenTransfer: 300000,
    multiSigTransfer: 500000,
  },
  // Priority fees (in micro-lamports) - Increased for faster processing
  priorityFees: {
    low: 5000,    // Increased from 1000
    medium: 15000, // Increased from 5000
    high: 50000,   // Increased from 10000
  },
  // Retry configuration
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
  },
  // Timeout configuration - Optimized for speed
  timeout: {
    connection: 5000,    // Reduced from 10s
    transaction: 15000,  // Reduced from 30s
    confirmation: 30000, // Reduced from 60s
  },
  // Commitment levels
  commitment: {
    default: 'confirmed' as const,
    final: 'finalized' as const,
  },
};

// Company fee structure
export const COMPANY_FEE_CONFIG = {
  percentage: parseFloat(getEnvVar('EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE') || '3.0'),
  minFee: parseFloat(getEnvVar('EXPO_PUBLIC_COMPANY_MIN_FEE') || '0.001'), // Updated to match centralized config
  maxFee: parseFloat(getEnvVar('EXPO_PUBLIC_COMPANY_MAX_FEE') || '10.00'),
  currency: 'USDC',
};

// Company wallet configuration
const companyWalletAddress = getEnvVar('EXPO_PUBLIC_COMPANY_WALLET_ADDRESS');
const companyWalletSecretKey = getEnvVar('EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY');

// Debug environment variables
console.log('🔧 Environment Variables Debug:', {
  EXPO_PUBLIC_COMPANY_WALLET_ADDRESS: getEnvVar('EXPO_PUBLIC_COMPANY_WALLET_ADDRESS'),
  EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY: companyWalletSecretKey ? '***HIDDEN***' : 'NOT_SET',
  companyWalletAddress,
  hasSecretKey: !!companyWalletSecretKey,
  expoConfigExtra: !!Constants.expoConfig?.extra
});

export const COMPANY_WALLET_CONFIG = {
  address: companyWalletAddress,
  secretKey: companyWalletSecretKey,
  minSolReserve: parseFloat(getEnvVar('EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE') || '1.0'),
  gasFeeEstimate: parseFloat(getEnvVar('EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE') || '0.001'),
  // Company wallet should always pay SOL fees - no fallback to user wallet
  useUserWalletForFees: false,
};

// Production validation
export const validateProductionConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (IS_PRODUCTION) {
    // Validate Helius API key for production
    if (!HELIUS_API_KEY && CURRENT_NETWORK.rpcUrl.includes('helius-rpc.com')) {
      errors.push('EXPO_PUBLIC_HELIUS_API_KEY is required for production mainnet');
    }
    
    // Validate USDC mint address
    if (CURRENT_NETWORK.usdcMintAddress !== CHAIN_NETWORKS.mainnet.usdcMintAddress) {
      errors.push('Invalid USDC mint address for mainnet');
    }
    
    // Validate company wallet configuration (always required for SOL fee coverage)
    if (!COMPANY_WALLET_CONFIG.address) {
      errors.push('EXPO_PUBLIC_COMPANY_WALLET_ADDRESS is required for production - company wallet must pay SOL fees');
    }
    
    // Check for any devnet/testnet references
    const networkName = CURRENT_NETWORK.name;
    if (networkName !== 'mainnet') {
      errors.push(`Production build is using ${networkName} instead of mainnet`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Log current configuration
if (__DEV__) {
  console.log('🌐 Chain Configuration:', {
    network: CURRENT_NETWORK.name,
    rpcUrl: HELIUS_API_KEY 
      ? CURRENT_NETWORK.rpcUrl.replace(HELIUS_API_KEY, '[API_KEY]')
      : CURRENT_NETWORK.rpcUrl,
    usdcMint: CURRENT_NETWORK.usdcMintAddress,
    isProduction: CURRENT_NETWORK.isProduction,
    hasHeliusKey: !!HELIUS_API_KEY,
    appEnv: APP_ENV,
    forceMainnet: FORCE_MAINNET,
    companyWalletConfigured: !!companyWalletAddress,
    companyWalletRequired: true,
  });
}

// Validate configuration on import
const validation = validateProductionConfig();
if (!validation.isValid) {
  console.error('❌ Chain Configuration Validation Failed:', validation.errors);
  if (IS_PRODUCTION) {
    throw new Error(`Production configuration validation failed: ${validation.errors.join(', ')}`);
  }
}

// Export validation function for runtime checks
export { validateProductionConfig as validateConfig };
