/**
 * Shared Wallet Constants
 * Centralized constants to eliminate duplication across wallet services
 */

// Import centralized configuration
import { getConfig } from '../../config/unified';
import { logger } from '../loggingService';

// RPC Configuration
export const RPC_CONFIG = {
  endpoint: getConfig().blockchain.rpcUrl,
  commitment: getConfig().blockchain.commitment,
  network: getConfig().blockchain.network,
  isProduction: getConfig().blockchain.isProduction,
};

// USDC Configuration
export const USDC_CONFIG = {
  mintAddress: getConfig().blockchain.usdcMintAddress,
  decimals: 6,
  symbol: 'USDC',
};

// Phantom Deep Link Schemes
export const PHANTOM_SCHEMES = [
  'phantom://',
  'app.phantom://',
  'phantom://browse',
  'app.phantom://browse',
  'phantom://connect',
  'app.phantom://connect',
  'phantom://v1/connect',
  'app.phantom://v1/connect'
];

// Common Wallet Deep Link Schemes
export const WALLET_SCHEMES = {
  PHANTOM: 'phantom://',
  SOLFLARE: 'solflare://',
  BACKPACK: 'backpack://',
  SLOPE: 'slope://',
  GLOW: 'glow://',
  EXODUS: 'exodus://',
  COINBASE: 'coinbase://',
  OKX: 'okx://',
  TRUST: 'trust://',
  SAFEPAL: 'safepal://',
  BITGET: 'bitget://',
  BYBIT: 'bybit://',
  GATE: 'gate://',
  HUOBI: 'huobi://',
  KRAKEN: 'kraken://',
  BINANCE: 'binance://',
  MATH: 'math://',
  TOKENPOCKET: 'tpt://',
  ONTO: 'onto://',
  IMTOKEN: 'imtokenv2://',
  COIN98: 'coin98://',
  BLOCTO: 'blocto://',
  NIGHTLY: 'nightly://',
  CLOVER: 'clover://',
  RAINBOW: 'rainbow://',
  ARGENT: 'argent://',
  BRAVOS: 'bravos://',
  MYRIA: 'myria://'
};

// App Configuration
export const APP_CONFIG = {
  name: 'WeSplit',
  icon: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fphantom-logo.png?alt=media&token=18cd1c78-d879-4b94-abbe-a2011149837a',
  url: 'https://wesplit.app',
  redirectLink: 'wesplit://wallet/connect',
  redirectSign: 'wesplit://wallet/sign'
};

// Transaction Configuration
export const TRANSACTION_CONSTANTS = {
  // Compute unit limits
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

// Company Fee Configuration - DEPRECATED: Use centralized feeConfig.ts instead
// This is kept for backward compatibility but should be removed in future versions
export const COMPANY_FEE_CONFIG = {
  percentage: parseFloat(process.env.EXPO_PUBLIC_COMPANY_FEE_PERCENTAGE || '3.0'),
  minimumFee: parseFloat(process.env.EXPO_PUBLIC_COMPANY_MIN_FEE || '0.001'), // Updated to match centralized config
  maximumFee: parseFloat(process.env.EXPO_PUBLIC_COMPANY_MAX_FEE || '10.00'),
  currency: 'USDC'
};

// Wallet Configuration
export const WALLET_CONFIG = {
  // Connection timeout
  connectionTimeout: 10000,
  // Auto-connect on app start
  autoConnect: true,
  // Balance call debounce - increased to prevent excessive calls
  balanceCallDebounce: 10000, // 10 seconds
};

// Logging configuration
if (__DEV__) {
  logger.info('Wallet Constants initialized', {
    rpcEndpoint: RPC_CONFIG.endpoint,
    usdcMint: USDC_CONFIG.mintAddress,
    network: RPC_CONFIG.network,
    isProduction: RPC_CONFIG.isProduction,
    companyFeePercentage: COMPANY_FEE_CONFIG.percentage,
  });
}
