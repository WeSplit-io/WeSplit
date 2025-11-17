// Token Configuration

import { PublicKey } from '@solana/web3.js';
import { getConfig } from '../unified';

export const USDC_DECIMALS = 6;
export const SOL_DECIMALS = 9;

// Known valid USDC mint addresses
const DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'; // Valid devnet USDC
const MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Valid mainnet USDC

// USDC Mint Address as PublicKey - Network-aware
export const getUSDC_MINT = (): PublicKey => {
  try {
  const config = getConfig();
    const mintAddress = config?.blockchain?.usdcMintAddress;
    
    // Validate mint address format
    if (!mintAddress || typeof mintAddress !== 'string' || mintAddress.length < 32) {
      // Fallback to devnet USDC if config not ready or invalid
      console.warn('[tokens] Network config not ready or invalid, using devnet USDC fallback', {
        mintAddress,
        hasConfig: !!config,
        hasBlockchain: !!config?.blockchain,
      });
      return new PublicKey(DEVNET_USDC_MINT);
    }
    
    try {
      return new PublicKey(mintAddress);
    } catch (pubkeyError) {
      // Invalid public key format - try to determine network and use appropriate fallback
      const network = config?.blockchain?.network || 'devnet';
      const fallbackMint = network === 'mainnet' ? MAINNET_USDC_MINT : DEVNET_USDC_MINT;
      console.warn('[tokens] Invalid USDC mint address format, using fallback', {
        mintAddress,
        network,
        fallbackMint,
        error: pubkeyError,
      });
      return new PublicKey(fallbackMint);
    }
  } catch (error) {
    // Fallback to devnet USDC if config fails
    console.warn('[tokens] Failed to get network config, using devnet USDC fallback', error);
    return new PublicKey(DEVNET_USDC_MINT);
  }
};

// Legacy export for backward compatibility - use getUSDC_MINT() instead
// Lazy initialization to avoid module load issues
let _USDC_MINT: PublicKey | null = null;
const getUSDC_MINT_Lazy = (): PublicKey => {
  if (!_USDC_MINT) {
    try {
      _USDC_MINT = getUSDC_MINT();
    } catch (error) {
      // Ultimate fallback if everything fails
      console.error('[tokens] Critical: Failed to initialize USDC_MINT, using hardcoded devnet fallback', error);
      _USDC_MINT = new PublicKey(DEVNET_USDC_MINT);
    }
  }
  return _USDC_MINT;
};

// Export as getter object to maintain backward compatibility
export const USDC_MINT = new Proxy({} as PublicKey, {
  get(target, prop) {
    const mint = getUSDC_MINT_Lazy();
    const value = (mint as any)[prop];
    return typeof value === 'function' ? value.bind(mint) : value;
  },
  getOwnPropertyDescriptor() {
    const mint = getUSDC_MINT_Lazy();
    return { enumerable: true, configurable: true, value: mint };
  },
  ownKeys() {
    const mint = getUSDC_MINT_Lazy();
    return Object.keys(mint);
  },
}) as PublicKey;
export const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112'); // Wrapped SOL

export const getTOKEN_CONFIG = () => {
  const config = getConfig();
  return {
    USDC: {
      decimals: USDC_DECIMALS,
      symbol: 'USDC',
      name: 'USD Coin',
      mintAddress: config.blockchain.usdcMintAddress
    },
    SOL: {
      decimals: SOL_DECIMALS,
      symbol: 'SOL',
      name: 'Solana',
      mintAddress: 'So11111111111111111111111111111111111111112' // Wrapped SOL
    }
  };
};

// Legacy export for backward compatibility - use getTOKEN_CONFIG() instead
export const TOKEN_CONFIG = getTOKEN_CONFIG();

export const MAINNET_TOKENS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  SRM: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'
};

export const DEVNET_TOKENS = {
  USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
};

export function getTokenConfig(network: 'mainnet' | 'devnet' | 'testnet' = 'mainnet') {
  return network === 'mainnet' ? MAINNET_TOKENS : DEVNET_TOKENS;
}

export function getTokenDecimals(symbol: string): number {
  switch (symbol.toUpperCase()) {
    case 'USDC':
    case 'USDT':
      return USDC_DECIMALS;
    case 'SOL':
      return SOL_DECIMALS;
    default:
      return 6; // Default to 6 decimals
  }
}