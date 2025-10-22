/**
 * Chain Configuration for WeSplit
 * 
 * This file was recreated after being removed in commit 5f29c63.
 * It provides chain-specific configuration for the application.
 */

export const CHAIN_CONFIG = {
  // Solana network configuration
  SOLANA: {
    MAINNET: 'https://api.mainnet-beta.solana.com',
    DEVNET: 'https://api.devnet.solana.com',
    TESTNET: 'https://api.testnet.solana.com',
  },
  
  // Default network
  DEFAULT_NETWORK: process.env.EXPO_PUBLIC_DEV_NETWORK === 'true' ? 'devnet' : 'mainnet',
  
  // Commitment levels
  COMMITMENT: process.env.SOLANA_COMMITMENT || 'confirmed',
  
  // RPC configuration
  RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  DEVNET_RPC_URL: process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
  TESTNET_RPC_URL: process.env.SOLANA_TESTNET_RPC_URL || 'https://api.testnet.solana.com',
  
  // API keys
  RPC_API_KEY: process.env.SOLANA_RPC_API_KEY,
  HELIUS_API_KEY: process.env.EXPO_PUBLIC_HELIUS_API_KEY,
};

export const getRpcUrl = (network: string = CHAIN_CONFIG.DEFAULT_NETWORK): string => {
  switch (network) {
    case 'mainnet':
      return CHAIN_CONFIG.RPC_URL;
    case 'devnet':
      return CHAIN_CONFIG.DEVNET_RPC_URL;
    case 'testnet':
      return CHAIN_CONFIG.TESTNET_RPC_URL;
    default:
      return CHAIN_CONFIG.RPC_URL;
  }
};

export const isMainnet = (): boolean => {
  return CHAIN_CONFIG.DEFAULT_NETWORK === 'mainnet';
};

export const isDevnet = (): boolean => {
  return CHAIN_CONFIG.DEFAULT_NETWORK === 'devnet';
};

// Export for backward compatibility
export const CURRENT_NETWORK = {
  network: CHAIN_CONFIG.DEFAULT_NETWORK,
  usdcMintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  rpcUrl: getRpcUrl(CHAIN_CONFIG.DEFAULT_NETWORK),
  wsUrl: getRpcUrl(CHAIN_CONFIG.DEFAULT_NETWORK).replace('https://', 'wss://'),
};

export default CHAIN_CONFIG;
