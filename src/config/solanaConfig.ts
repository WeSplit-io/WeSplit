/**
 * Solana Network Configuration for Production
 * Centralized configuration for all Solana-related services
 */

export interface SolanaNetworkConfig {
  name: string;
  rpcUrl: string;
  usdcMintAddress: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
  isProduction: boolean;
}

// Helius RPC Configuration
const HELIUS_API_KEY = process.env.EXPO_PUBLIC_HELIUS_API_KEY || process.env.HELIUS_API_KEY;

// Network configurations
export const SOLANA_NETWORKS: Record<string, SolanaNetworkConfig> = {
  devnet: {
    name: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    usdcMintAddress: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    commitment: 'confirmed',
    isProduction: false,
  },
  testnet: {
    name: 'testnet',
    rpcUrl: 'https://api.testnet.solana.com',
    usdcMintAddress: 'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp',
    commitment: 'confirmed',
    isProduction: false,
  },
  mainnet: {
    name: 'mainnet',
    rpcUrl: HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com',
    usdcMintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    commitment: 'confirmed',
    isProduction: true,
  },
};

// Current network selection
export const getCurrentNetwork = (): SolanaNetworkConfig => {
  const environment = process.env.NODE_ENV;
  const forceMainnet = process.env.EXPO_PUBLIC_FORCE_MAINNET === 'true';
  
  // Force mainnet for production or when explicitly requested
  if (environment === 'production' || forceMainnet) {
    return SOLANA_NETWORKS.mainnet;
  }
  
  // Default to mainnet for real USDC transactions
  return SOLANA_NETWORKS.mainnet;
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
  // Priority fees (in micro-lamports)
  priorityFees: {
    low: 1000,
    medium: 5000,
    high: 10000,
  },
  // Retry configuration
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
  },
  // Timeout configuration
  timeout: {
    connection: 10000,
    transaction: 30000,
  },
};

// Wallet configuration
export const WALLET_CONFIG = {
  // Supported wallet schemes
  schemes: {
    phantom: ['phantom://', 'app.phantom://'],
    solflare: ['solflare://', 'app.solflare://'],
    backpack: ['backpack://', 'app.backpack://'],
  },
  // Connection timeout
  connectionTimeout: 10000,
  // Auto-connect on app start
  autoConnect: true,
};

// Production validation
export const validateProductionConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (CURRENT_NETWORK.isProduction) {
    // Validate Helius API key for production
    if (!HELIUS_API_KEY && CURRENT_NETWORK.rpcUrl.includes('helius-rpc.com')) {
      errors.push('Helius API key is required for production mainnet');
    }
    
    // Validate USDC mint address
    if (CURRENT_NETWORK.usdcMintAddress !== SOLANA_NETWORKS.mainnet.usdcMintAddress) {
      errors.push('Invalid USDC mint address for mainnet');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Log current configuration
if (__DEV__) {
  console.log('🌐 Solana Configuration:', {
    network: CURRENT_NETWORK.name,
    rpcUrl: CURRENT_NETWORK.rpcUrl.replace(HELIUS_API_KEY || '', '[API_KEY]'),
    usdcMint: CURRENT_NETWORK.usdcMintAddress,
    isProduction: CURRENT_NETWORK.isProduction,
    hasHeliusKey: !!HELIUS_API_KEY,
  });
}
