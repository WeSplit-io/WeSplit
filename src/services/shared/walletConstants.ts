/**
 * Shared Wallet Constants
 * Centralized constants to eliminate duplication across wallet services
 */

// Import centralized configuration
import { getConfig } from '../../config/unified';
import { logger } from '../analytics/loggingService';
import { isProduction } from '../../config/env';

// USDC Mint Addresses
const MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

// RPC Configuration
export const RPC_CONFIG = {
  endpoint: getConfig().blockchain.rpcUrl,
  commitment: getConfig().blockchain.commitment,
  network: getConfig().blockchain.network,
  isProduction: getConfig().blockchain.isProduction,
};

// USDC Configuration - Lazy getter to avoid module load issues
let _USDC_CONFIG: { mintAddress: string; decimals: number; symbol: string } | null = null;

export const getUSDC_CONFIG = () => {
  if (!_USDC_CONFIG) {
    try {
      const config = getConfig();
      const mintAddress = config?.blockchain?.usdcMintAddress;
      
      // Validate mint address
      if (!mintAddress || typeof mintAddress !== 'string' || mintAddress.length < 32) {
        // ✅ FIX: Use production detection to choose correct fallback
        const fallbackMint = isProduction ? MAINNET_USDC_MINT : DEVNET_USDC_MINT;
        console.warn('[walletConstants] Invalid USDC mint address, using fallback', { 
          mintAddress,
          fallbackMint,
          isProduction,
          network: config?.blockchain?.network
        });
        _USDC_CONFIG = {
          mintAddress: fallbackMint,
          decimals: 6,
          symbol: 'USDC',
        };
      } else {
        _USDC_CONFIG = {
          mintAddress,
          decimals: 6,
          symbol: 'USDC',
        };
      }
    } catch (error) {
      // ✅ FIX: Ultimate fallback - use production detection
      const fallbackMint = isProduction ? MAINNET_USDC_MINT : DEVNET_USDC_MINT;
      console.error('[walletConstants] Failed to get USDC config, using fallback', {
        error,
        fallbackMint,
        isProduction
      });
      _USDC_CONFIG = {
        mintAddress: fallbackMint,
        decimals: 6,
        symbol: 'USDC',
      };
    }
  }
  return _USDC_CONFIG;
};

// Legacy export for backward compatibility
export const USDC_CONFIG = new Proxy({} as { mintAddress: string; decimals: number; symbol: string }, {
  get(target, prop) {
    const config = getUSDC_CONFIG();
    return (config as any)[prop];
  },
});

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

// Wallet constants initialized
