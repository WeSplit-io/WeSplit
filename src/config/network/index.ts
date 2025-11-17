/**
 * Network Configuration
 * Centralized exports for all network-related configuration
 */

// iOS platform-specific network config (timeouts, retries)
export { getNetworkConfig as getIOSNetworkConfig } from './networkConfig';

// Solana blockchain network config (devnet/mainnet switching)
// Primary exports (recommended usage for Solana network)
export {
  getNetworkConfig,
  getNetworkConfigSync,
  clearNetworkConfigCache,
  setNetworkOverride,
  getCurrentNetwork,
  isMainnet,
  isDevnet,
  type SolanaNetwork,
  type NetworkConfig,
} from './solanaNetworkConfig';

// Aliases for backward compatibility
export {
  getNetworkConfig as getSolanaNetworkConfig,
  getNetworkConfigSync as getSolanaNetworkConfigSync,
} from './solanaNetworkConfig';

// Chain configuration constants
export { CHAIN_CONFIG } from './chain';

// API configuration
export { initializeBackendURL, getBackendURL, setBackendURL, apiRequest, POSSIBLE_BACKEND_URLS } from './api';
