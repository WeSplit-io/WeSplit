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
  
  // Default network - use unified config if available, otherwise fallback to devnet
  DEFAULT_NETWORK: (() => {
    try {
      const { getConfig } = require('../unified');
      return getConfig().blockchain.network;
    } catch {
      // Fallback to environment variable or devnet
      return process.env.EXPO_PUBLIC_DEV_NETWORK === 'true' || process.env.EXPO_PUBLIC_DEV_NETWORK === 'devnet' 
        ? 'devnet' 
        : (process.env.EXPO_PUBLIC_DEV_NETWORK || 'devnet');
    }
  })(),
  
  // Commitment levels
  COMMITMENT: process.env.SOLANA_COMMITMENT || 'confirmed',
  
  // RPC configuration - use unified config if available
  RPC_URL: (() => {
    try {
      const { getConfig } = require('../unified');
      return getConfig().blockchain.rpcUrl;
    } catch {
      // Fallback to environment variable or devnet
      return process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    }
  })(),
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

// Export for backward compatibility - use unified config if available
export const CURRENT_NETWORK = (() => {
  try {
    const { getConfig } = require('../unified');
    const config = getConfig();
    return {
      network: config.blockchain.network,
      usdcMintAddress: config.blockchain.usdcMintAddress,
      rpcUrl: config.blockchain.rpcUrl,
      wsUrl: config.blockchain.rpcUrl.replace('https://', 'wss://'),
    };
  } catch {
    // Fallback to chain config
    return {
      network: CHAIN_CONFIG.DEFAULT_NETWORK,
      usdcMintAddress: CHAIN_CONFIG.DEFAULT_NETWORK === 'mainnet' 
        ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        : '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
      rpcUrl: getRpcUrl(CHAIN_CONFIG.DEFAULT_NETWORK),
      wsUrl: getRpcUrl(CHAIN_CONFIG.DEFAULT_NETWORK).replace('https://', 'wss://'),
    };
  }
})();

export default CHAIN_CONFIG;
