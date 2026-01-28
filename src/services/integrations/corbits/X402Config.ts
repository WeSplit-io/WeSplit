/**
 * x402 Configuration
 * Configuration for Corbits x402 payment protocol integration
 */

import Constants from 'expo-constants';

// Get environment variables from Expo Constants
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return Constants.expoConfig?.extra?.[key] || process.env[key] || defaultValue;
};

/**
 * x402 Configuration Interface
 */
export interface X402Config {
  facilitatorURL: string; // Facilitator URL (e.g., "https://facilitator.corbits.dev")
  network: 'mainnet-beta' | 'devnet';
  asset: 'USDC';
  enabled: boolean; // Feature flag
  merchantWallet?: string; // For paywalled features
}

/**
 * x402 Configuration
 * Loaded from environment variables with defaults
 */
export const X402_CONFIG: X402Config = {
  facilitatorURL: getEnvVar('EXPO_PUBLIC_X402_FACILITATOR_URL', 'https://facilitator.corbits.dev'),
  network: (getEnvVar('EXPO_PUBLIC_X402_NETWORK', 'mainnet-beta') as 'mainnet-beta' | 'devnet') || 'mainnet-beta',
  asset: 'USDC',
  enabled: getEnvVar('EXPO_PUBLIC_X402_ENABLED', 'false').toLowerCase() === 'true',
  merchantWallet: getEnvVar('EXPO_PUBLIC_X402_MERCHANT_WALLET', ''),
};

/**
 * Check if x402 is enabled
 */
export function isX402Enabled(): boolean {
  return X402_CONFIG.enabled;
}
