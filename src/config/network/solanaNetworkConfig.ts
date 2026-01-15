/**
 * Solana Network Configuration Module
 * 
 * Centralized network selection for devnet/mainnet switching.
 * Production builds default to mainnet; dev builds default to devnet.
 * 
 * This module provides a single source of truth for Solana network configuration,
 * with production-safe defaults and backward compatibility with legacy env vars.
 */

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../services/analytics/loggingService';

export type SolanaNetwork = 'devnet' | 'mainnet' | 'testnet';

export interface NetworkConfig {
  network: SolanaNetwork;
  rpcUrl: string;
  rpcEndpoints: string[];
  usdcMintAddress: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
  timeout: number;
  retries: number;
  wsUrl?: string;
}

// Network-specific constants
const NETWORK_CONFIGS: Record<SolanaNetwork, Omit<NetworkConfig, 'network'>> = {
  mainnet: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    rpcEndpoints: [
      'https://rpc.ankr.com/solana',
      'https://api.mainnet-beta.solana.com',
    ],
    usdcMintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    commitment: 'confirmed',
    timeout: 25000,
    retries: 4,
    wsUrl: 'wss://api.mainnet-beta.solana.com',
  },
  devnet: {
    rpcUrl: 'https://api.devnet.solana.com',
    rpcEndpoints: [
      'https://api.devnet.solana.com',
      'https://devnet.helius-rpc.com',
    ],
    usdcMintAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
    commitment: 'confirmed',
    timeout: 20000,
    retries: 2,
    wsUrl: 'wss://api.devnet.solana.com',
  },
  testnet: {
    rpcUrl: 'https://api.testnet.solana.com',
    rpcEndpoints: [
      'https://api.testnet.solana.com',
    ],
    usdcMintAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Testnet USDC (same as devnet)
    commitment: 'confirmed',
    timeout: 20000,
    retries: 2,
    wsUrl: 'wss://api.testnet.solana.com',
  },
};

// Cache for network config
let cachedConfig: NetworkConfig | null = null;
let configInitialized = false;

/**
 * Get environment variable with fallback chain
 * Checks Constants.expoConfig.extra first, then process.env
 */
function getEnvVar(key: string): string | undefined {
  // Check Constants.expoConfig.extra first (Expo's way)
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key] as string;
  }
  // Fallback to process.env
  return process.env[key];
}

/**
 * Determine if this is a production build
 * ✅ CRITICAL: Multiple checks to ensure accurate production detection
 */
function isProductionBuild(): boolean {
  // ✅ LAYER 1: Check EAS build profile (most reliable)
  const buildProfile = getEnvVar('EAS_BUILD_PROFILE');
  if (buildProfile === 'production' || buildProfile === 'testflight' || buildProfile === 'mass-distribution') {
    return true;
  }
  
  // ✅ LAYER 2: Check APP_ENV
  const appEnv = getEnvVar('APP_ENV');
  if (appEnv === 'production') {
    return true;
  }
  
  // ✅ LAYER 3: Check NODE_ENV
  const nodeEnv = getEnvVar('NODE_ENV');
  if (nodeEnv === 'production') {
    return true;
  }
  
  // ✅ LAYER 4: Check if __DEV__ is false (production bundle)
  return !__DEV__;
}

/**
 * Get network from environment variables
 * Supports both new (EXPO_PUBLIC_NETWORK) and legacy (DEV_NETWORK, FORCE_MAINNET) env vars
 */
function getNetworkFromEnv(): SolanaNetwork | null {
  // Primary: EXPO_PUBLIC_NETWORK (recommended)
  const networkEnv = getEnvVar('EXPO_PUBLIC_NETWORK');
  if (networkEnv) {
    const normalized = networkEnv.toLowerCase().trim();
    if (normalized === 'mainnet' || normalized === 'mainnet-beta') {
      return 'mainnet';
    }
    if (normalized === 'devnet') {
      return 'devnet';
    }
    if (normalized === 'testnet') {
      return 'testnet';
    }
  }
  
  // Legacy: EXPO_PUBLIC_DEV_NETWORK (backward compatibility)
  const devNetwork = getEnvVar('EXPO_PUBLIC_DEV_NETWORK');
  if (devNetwork) {
    const normalized = devNetwork.toLowerCase().trim();
    if (normalized === 'mainnet' || normalized === 'mainnet-beta') {
      return 'mainnet';
    }
    if (normalized === 'devnet') {
      return 'devnet';
    }
  }
  
  // Legacy: DEV_NETWORK (backward compatibility)
  const devNetworkLegacy = getEnvVar('DEV_NETWORK');
  if (devNetworkLegacy) {
    const normalized = devNetworkLegacy.toLowerCase().trim();
    if (normalized === 'mainnet' || normalized === 'mainnet-beta') {
      return 'mainnet';
    }
    if (normalized === 'devnet') {
      return 'devnet';
    }
    }
  
  // Legacy: EXPO_PUBLIC_FORCE_MAINNET (backward compatibility)
  const forceMainnet = getEnvVar('EXPO_PUBLIC_FORCE_MAINNET');
  if (forceMainnet === 'true') {
    return 'mainnet';
  }
  
  // Legacy: FORCE_MAINNET (backward compatibility)
  const forceMainnetLegacy = getEnvVar('FORCE_MAINNET');
  if (forceMainnetLegacy === 'true') {
    return 'mainnet';
  }
  
  return null;
}

/**
 * Get network with production-safe defaults
 * 
 * CRITICAL: Production builds ALWAYS use mainnet (obligatory)
 * Dev builds use devnet by default
 */
async function determineNetwork(): Promise<SolanaNetwork> {
  const isProduction = isProductionBuild();
  
  // ✅ CRITICAL: Production builds MUST use mainnet (obligatory)
  // ✅ MULTIPLE LAYERS OF PROTECTION: No exceptions, no overrides
  if (isProduction) {
    // ✅ LAYER 1: Check if environment variable tries to set devnet (SECURITY RISK)
    const envNetwork = getNetworkFromEnv();
    if (envNetwork === 'devnet') {
      logger.error(
        '🚨 SECURITY CRITICAL: Production build attempted to use devnet. FORCING mainnet.',
        { 
          envNetwork, 
          overridden: 'mainnet',
          buildProfile: getEnvVar('EAS_BUILD_PROFILE'),
          appEnv: getEnvVar('APP_ENV'),
          nodeEnv: getEnvVar('NODE_ENV'),
          note: 'This is a security violation. Production builds MUST use mainnet.'
        },
        'solanaNetworkConfig'
      );
      // ✅ FORCE mainnet - no exceptions
      return 'mainnet';
    }
    
    // ✅ LAYER 2: If env var sets mainnet, use it (but we'd use mainnet anyway)
    if (envNetwork === 'mainnet' || envNetwork === 'mainnet-beta') {
      logger.info('Production build using mainnet (from env)', null, 'solanaNetworkConfig');
      return 'mainnet';
    }
    
    // ✅ LAYER 3: Production ALWAYS defaults to mainnet regardless of any env vars
    // This is the final safety net - even if all checks fail, production = mainnet
    logger.info('Production build defaulting to mainnet (obligatory)', {
      buildProfile: getEnvVar('EAS_BUILD_PROFILE'),
      appEnv: getEnvVar('APP_ENV'),
      nodeEnv: getEnvVar('NODE_ENV'),
      note: 'Production builds ALWAYS use mainnet - no exceptions'
    }, 'solanaNetworkConfig');
    return 'mainnet';
  }
  
  // ✅ Development builds: Check environment variable first
  // ✅ NOTE: Dev builds can use mainnet for testing, but devnet is the default
  const envNetwork = getNetworkFromEnv();
  if (envNetwork) {
    // ✅ SAFETY CHECK: Even in dev builds, log if someone tries to use devnet in production-like environment
    if (envNetwork === 'devnet') {
      logger.info(`Development build using devnet (from env)`, null, 'solanaNetworkConfig');
    } else {
      logger.info(`Development build using network from env: ${envNetwork}`, null, 'solanaNetworkConfig');
    }
    return envNetwork;
  }
  
  // Check runtime override (dev only)
  if (__DEV__) {
    try {
      const override = await AsyncStorage.getItem('NETWORK_OVERRIDE');
      if (override && ['devnet', 'mainnet', 'testnet'].includes(override)) {
        logger.info(`Using runtime network override: ${override}`, null, 'solanaNetworkConfig');
        return override as SolanaNetwork;
      }
    } catch (error) {
      logger.warn('Failed to read network override', { error }, 'solanaNetworkConfig');
    }
  }
  
  // Development defaults to devnet
  logger.info('Development build defaulting to devnet', null, 'solanaNetworkConfig');
  return 'devnet';
}

/**
 * Enhance RPC endpoints with API keys if available
 */
function enhanceRpcEndpoints(
  network: SolanaNetwork,
  baseEndpoints: string[]
): string[] {
  const endpoints = [...baseEndpoints];
  
  if (network === 'mainnet') {
    // Add Helius if API key available
    const heliusKeyRaw = getEnvVar('EXPO_PUBLIC_HELIUS_API_KEY');
    const heliusKey = extractApiKey(heliusKeyRaw || '', 'mainnet.helius-rpc.com');
    if (heliusKey && heliusKey !== 'YOUR_HELIUS_API_KEY_HERE' && !heliusKey.startsWith('http')) {
      endpoints.unshift(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`);
    }
    
    // Add Alchemy if API key available
    const alchemyKeyRaw = getEnvVar('EXPO_PUBLIC_ALCHEMY_API_KEY');
    const alchemyKey = extractApiKey(alchemyKeyRaw || '', 'solana-mainnet.g.alchemy.com/v2');
    if (alchemyKey && alchemyKey !== 'YOUR_ALCHEMY_API_KEY_HERE' && !alchemyKey.startsWith('http')) {
      endpoints.unshift(`https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`);
    }
    
    // Add GetBlock if API key available
    const getBlockKeyRaw = getEnvVar('EXPO_PUBLIC_GETBLOCK_API_KEY');
    const getBlockKey = extractGetBlockKey(getBlockKeyRaw || '');
    if (getBlockKey && getBlockKey !== 'YOUR_GETBLOCK_API_KEY_HERE' && !getBlockKey.startsWith('http')) {
      endpoints.unshift(`https://sol.getblock.io/mainnet/?api_key=${getBlockKey}`);
    }
    
    // Add QuickNode if endpoint available
    const quickNodeEndpoint = getEnvVar('EXPO_PUBLIC_QUICKNODE_ENDPOINT');
    if (quickNodeEndpoint && quickNodeEndpoint !== 'YOUR_QUICKNODE_ENDPOINT_HERE') {
      endpoints.unshift(quickNodeEndpoint);
    }
    
    // Add Chainstack if endpoint available
    const chainstackEndpoint = getEnvVar('EXPO_PUBLIC_CHAINSTACK_ENDPOINT');
    if (chainstackEndpoint && chainstackEndpoint !== 'YOUR_CHAINSTACK_ENDPOINT_HERE') {
      endpoints.unshift(chainstackEndpoint);
    }
  }
  
  return endpoints;
}

// Helper functions to extract API keys from URLs if provided as full URLs
function extractApiKey(value: string, baseUrl: string): string {
  if (!value) return '';
  // If it's already a full URL, extract the key part
  if (value.startsWith('http')) {
    // For Alchemy: https://solana-mainnet.g.alchemy.com/v2/KEY
    if (value.includes('alchemy.com')) {
      const parts = value.split('/');
      return parts[parts.length - 1] || value;
    }
    // For Helius: https://mainnet.helius-rpc.com/?api-key=KEY
    if (value.includes('helius-rpc.com')) {
      const match = value.match(/helius-rpc\.com\/\?api-key=([^&\s]+)/);
      return match ? match[1] : value;
    }
    // For other URLs, extract the last part after the last slash
    const parts = value.split('/');
    return parts[parts.length - 1] || value;
  }
  // Otherwise, return as-is (should be just the key)
  return value;
}

function extractGetBlockKey(value: string): string {
  if (!value) return '';
  if (value.startsWith('http')) {
    // Extract the API key from URL like https://go.getblock.io/API_KEY
    const match = value.match(/go\.getblock\.io\/([^\/\s]+)/);
    return match ? match[1] : (value.split('/').pop() || '');
  }
  return value;
}

/**
 * Get network configuration
 * 
 * This is the main entry point for network configuration.
 * Returns a cached config for performance.
 */
export async function getNetworkConfig(): Promise<NetworkConfig> {
  // Return cached config if available
  if (cachedConfig && configInitialized) {
    return cachedConfig;
  }
  
  const network = await determineNetwork();
  const baseConfig = NETWORK_CONFIGS[network];
  
  // Enhance RPC endpoints with API keys
  const rpcEndpoints = enhanceRpcEndpoints(network, baseConfig.rpcEndpoints);
  
  const config: NetworkConfig = {
    network,
    ...baseConfig,
    rpcUrl: rpcEndpoints[0] || baseConfig.rpcUrl,
    rpcEndpoints,
  };
  
  // Cache the config
  cachedConfig = config;
  configInitialized = true;
  
  logger.info('Network configuration loaded', {
    network: config.network,
    rpcUrl: config.rpcUrl.replace(/api-key=[^&]+/, 'api-key=***').replace(/\/v2\/[^\/]+/, '/v2/***'),
    endpointCount: config.rpcEndpoints.length,
    isProduction: isProductionBuild(),
  }, 'solanaNetworkConfig');
  
  return config;
}

/**
 * Get network configuration synchronously (uses cached value)
 * 
 * WARNING: Only use this after getNetworkConfig() has been called at least once.
 * For first-time access, use the async version.
 */
export function getNetworkConfigSync(): NetworkConfig {
  if (!cachedConfig) {
    throw new Error(
      'Network config not initialized. Call getNetworkConfig() first.'
    );
  }
  return cachedConfig;
}

/**
 * Clear network config cache (useful for testing or runtime changes)
 */
export function clearNetworkConfigCache(): void {
  cachedConfig = null;
  configInitialized = false;
  logger.info('Network config cache cleared', null, 'solanaNetworkConfig');
}

/**
 * Set runtime network override (dev only)
 * 
 * WARNING: This requires app restart to take effect.
 */
export async function setNetworkOverride(network: SolanaNetwork): Promise<void> {
  if (isProductionBuild()) {
    throw new Error('Network override not allowed in production builds');
  }
  
  if (!['devnet', 'mainnet', 'testnet'].includes(network)) {
    throw new Error(`Invalid network: ${network}`);
  }
  
  await AsyncStorage.setItem('NETWORK_OVERRIDE', network);
  clearNetworkConfigCache();
  
  logger.info(`Network override set to: ${network}`, null, 'solanaNetworkConfig');
}

/**
 * Get current network (synchronous, uses cache)
 */
export function getCurrentNetwork(): SolanaNetwork {
  return getNetworkConfigSync().network;
}

/**
 * Check if currently on mainnet
 */
export function isMainnet(): boolean {
  return getCurrentNetwork() === 'mainnet';
}

/**
 * Check if currently on devnet
 */
export function isDevnet(): boolean {
  return getCurrentNetwork() === 'devnet';
}
