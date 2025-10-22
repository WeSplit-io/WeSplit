// Token Configuration

import { PublicKey } from '@solana/web3.js';

export const USDC_DECIMALS = 6;
export const SOL_DECIMALS = 9;

// USDC Mint Address as PublicKey
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // Mainnet USDC
export const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112'); // Wrapped SOL

export const TOKEN_CONFIG = {
  USDC: {
    decimals: USDC_DECIMALS,
    symbol: 'USDC',
    name: 'USD Coin',
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Mainnet USDC
  },
  SOL: {
    decimals: SOL_DECIMALS,
    symbol: 'SOL',
    name: 'Solana',
    mintAddress: 'So11111111111111111111111111111111111111112' // Wrapped SOL
  }
};

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