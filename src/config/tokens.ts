/**
 * USDC Token Configuration for Solana Mainnet
 * Hard-coded configuration for production USDC-only flows
 */

import { PublicKey } from '@solana/web3.js';
import { logger } from '../services/loggingService';

// Solana mainnet configuration - hard-enforced in production
export const SOLANA_CLUSTER = 'mainnet-beta';
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const TOKEN_DECIMALS = 6; // USDC has 6 decimals

// Token metadata
export const USDC_TOKEN_INFO = {
  mint: USDC_MINT,
  decimals: TOKEN_DECIMALS,
  symbol: 'USDC',
  name: 'USD Coin',
  logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  tags: ['stablecoin', 'usd'],
  extensions: {
    coingeckoId: 'usd-coin',
  },
};

// Production validation
export const validateUsdcConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate USDC mint address
  if (USDC_MINT.toString() !== 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
    errors.push('Invalid USDC mint address - must use mainnet USDC');
  }
  
  // Validate decimals
  if (TOKEN_DECIMALS !== 6) {
    errors.push('USDC must have 6 decimals');
  }
  
  // Validate cluster
  if (SOLANA_CLUSTER !== 'mainnet-beta') {
    errors.push('Production must use mainnet-beta cluster');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Log configuration
if (__DEV__) {
  logger.info('USDC Token Configuration', {
    mint: USDC_MINT.toString(),
    decimals: TOKEN_DECIMALS,
    symbol: USDC_TOKEN_INFO.symbol,
    cluster: SOLANA_CLUSTER,
  });
}

// Validate on import
const validation = validateUsdcConfig();
if (!validation.isValid) {
  console.error('❌ USDC Configuration Validation Failed:', validation.errors);
  throw new Error(`USDC configuration validation failed: ${validation.errors.join(', ')}`);
}
