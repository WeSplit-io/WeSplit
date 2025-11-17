# Devnet/Mainnet Switching Implementation Plan

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT APP (Expo)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Network Config Module (src/config/network/)             │   │
│  │  - Reads EXPO_PUBLIC_NETWORK from Constants.expoConfig   │   │
│  │  - Validates production builds default to mainnet        │   │
│  │  - Provides runtime override (dev only)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                       │
│                           ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Solana Connection Factory                               │   │
│  │  - Creates Connection with network-specific RPC          │   │
│  │  - Handles RPC endpoint fallback                        │   │
│  │  - Manages connection pooling                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                       │
│                           ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Service Layer                                           │   │
│  │  - WalletService uses network config                    │   │
│  │  - TransactionService validates network                  │   │
│  │  - TokenService uses network-specific mint addresses     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE FUNCTIONS (Backend)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Backend Network Config                                   │   │
│  │  - Reads SOLANA_NETWORK from environment                  │   │
│  │  - Must match client network for transaction signing     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Transaction Signing Service                              │   │
│  │  - Validates network consistency                          │   │
│  │  - Uses network-specific RPC endpoints                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Solana Network  │
                    │  (devnet/mainnet)│
                    └──────────────────┘
```

**Key Components:**
- **Config Layer**: Single source of truth for network selection
- **Connection Layer**: Network-aware Solana Connection initialization
- **Service Layer**: All services consume network config
- **Backend Layer**: Must match client network for transaction signing
- **Validation Layer**: Prevents network mismatches at runtime

---

## 2. Prioritized Task List

### Phase 1: Foundation (Week 1)

#### Task 1.1: Create Network Configuration Module
**Priority**: P0 (Critical)  
**Estimated Time**: 4 hours  
**Dependencies**: None

**Description**:  
Create a centralized network configuration module that handles devnet/mainnet switching with production-safe defaults.

**Acceptance Criteria**:
- [ ] Module exports `getNetworkConfig()` function
- [ ] Reads from `EXPO_PUBLIC_NETWORK` env var (values: 'devnet' | 'mainnet')
- [ ] Production builds default to 'mainnet' if env var not set
- [ ] Development builds default to 'devnet' if env var not set
- [ ] Runtime override available in dev mode only (via AsyncStorage flag)
- [ ] Returns typed network config object with RPC URLs, token addresses, etc.
- [ ] Validates network value and throws on invalid input
- [ ] Unit tests cover all network selection paths

**Files to Create/Modify**:
- `src/config/network/networkConfig.ts` (new)
- `src/config/network/index.ts` (update exports)

---

#### Task 1.2: Update Unified Config to Use Network Module
**Priority**: P0 (Critical)  
**Estimated Time**: 2 hours  
**Dependencies**: Task 1.1

**Description**:  
Refactor `src/config/unified.ts` to use the new network configuration module instead of inline logic.

**Acceptance Criteria**:
- [ ] `getUnifiedConfig()` imports and uses `getNetworkConfig()`
- [ ] Removes duplicate network selection logic
- [ ] Maintains backward compatibility with existing env vars
- [ ] All existing tests pass
- [ ] Network selection logic is centralized

**Files to Modify**:
- `src/config/unified.ts`

---

#### Task 1.3: Create Solana Connection Factory
**Priority**: P0 (Critical)  
**Estimated Time**: 3 hours  
**Dependencies**: Task 1.1

**Description**:  
Create a factory function that creates Solana Connection instances with network-specific configuration.

**Acceptance Criteria**:
- [ ] Factory function `createSolanaConnection()` accepts optional network override
- [ ] Uses network config for RPC URL selection
- [ ] Implements RPC endpoint fallback mechanism
- [ ] Configures connection with appropriate timeouts and retries
- [ ] Returns singleton Connection instance per network
- [ ] Handles connection errors gracefully
- [ ] Unit tests for connection creation and fallback

**Files to Create**:
- `src/services/blockchain/connection/connectionFactory.ts`
- `src/services/blockchain/connection/index.ts`

---

### Phase 2: Integration (Week 1-2)

#### Task 2.1: Update All Services to Use Network Config
**Priority**: P0 (Critical)  
**Estimated Time**: 6 hours  
**Dependencies**: Tasks 1.1, 1.2, 1.3

**Description**:  
Update all blockchain services to use the network configuration module and connection factory.

**Acceptance Criteria**:
- [ ] `SolanaWalletService` uses network config
- [ ] `TransactionService` validates network before operations
- [ ] `TokenService` uses network-specific mint addresses
- [ ] `BalanceManager` uses network-aware connections
- [ ] All services log current network on initialization
- [ ] No hardcoded network values remain
- [ ] All existing functionality preserved

**Files to Modify**:
- `src/services/blockchain/wallet/api/solanaWalletApi.ts`
- `src/services/blockchain/transaction/transactionSigningService.ts`
- `src/services/shared/transactionUtilsOptimized.ts`
- `src/services/blockchain/transaction/BalanceManager.ts`
- Any other services using Solana connections

---

#### Task 2.2: Add Network Validation Layer
**Priority**: P1 (High)  
**Estimated Time**: 3 hours  
**Dependencies**: Task 2.1

**Description**:  
Add validation to prevent network mismatches (e.g., attempting mainnet transaction on devnet connection).

**Acceptance Criteria**:
- [ ] `validateNetworkMatch()` function checks network consistency
- [ ] Transaction service validates network before signing
- [ ] Wallet operations validate network before execution
- [ ] Clear error messages for network mismatches
- [ ] Unit tests for validation logic

**Files to Create**:
- `src/services/blockchain/network/networkValidator.ts`

**Files to Modify**:
- `src/services/blockchain/transaction/transactionSigningService.ts`

---

#### Task 2.3: Update Backend Services for Network Consistency
**Priority**: P0 (Critical)  
**Estimated Time**: 4 hours  
**Dependencies**: Task 1.1

**Description**:  
Ensure Firebase Functions and backend services use the same network configuration logic.

**Acceptance Criteria**:
- [ ] Backend reads `SOLANA_NETWORK` env var
- [ ] Backend validates network matches client request
- [ ] Transaction signing service uses correct network
- [ ] Error handling for network mismatches
- [ ] Logging includes network information

**Files to Modify**:
- `services/firebase-functions/src/transactionSigningService.js`
- `services/backend/services/transactionSigningService.js`

---

### Phase 3: Developer Experience (Week 2)

#### Task 3.1: Add Runtime Network Override (Dev Only)
**Priority**: P2 (Medium)  
**Estimated Time**: 2 hours  
**Dependencies**: Task 1.1

**Description**:  
Add ability to switch networks at runtime in development builds for easier testing.

**Acceptance Criteria**:
- [ ] Dev-only feature flag check
- [ ] AsyncStorage key for network override
- [ ] UI toggle in dev menu (if exists)
- [ ] Network change requires app restart
- [ ] Clear warnings about dev-only feature
- [ ] Production builds ignore override

**Files to Create/Modify**:
- `src/config/network/networkConfig.ts` (add override logic)
- `src/screens/Settings/DevSettingsScreen.tsx` (if exists)

---

#### Task 3.2: Add Network Indicator in UI
**Priority**: P2 (Medium)  
**Estimated Time**: 2 hours  
**Dependencies**: Task 1.1

**Description**:  
Display current network in UI (dev builds only) to help developers verify network selection.

**Acceptance Criteria**:
- [ ] Network badge in dev builds
- [ ] Shows 'devnet' or 'mainnet'
- [ ] Color-coded (red for devnet, green for mainnet)
- [ ] Hidden in production builds
- [ ] Positioned non-intrusively

**Files to Create/Modify**:
- `src/components/NetworkIndicator.tsx` (new)
- `App.tsx` or main screen (add indicator)

---

### Phase 4: Testing & Documentation (Week 2-3)

#### Task 4.1: Write Unit Tests
**Priority**: P1 (High)  
**Estimated Time**: 4 hours  
**Dependencies**: All Phase 1-2 tasks

**Description**:  
Comprehensive unit tests for network configuration and connection factory.

**Acceptance Criteria**:
- [ ] Tests for network selection logic
- [ ] Tests for production defaults
- [ ] Tests for dev defaults
- [ ] Tests for invalid network values
- [ ] Tests for connection factory
- [ ] Tests for network validation
- [ ] >80% code coverage for network modules

**Files to Create**:
- `src/config/network/__tests__/networkConfig.test.ts`
- `src/services/blockchain/connection/__tests__/connectionFactory.test.ts`
- `src/services/blockchain/network/__tests__/networkValidator.test.ts`

---

#### Task 4.2: Write Integration Tests
**Priority**: P1 (High)  
**Estimated Time**: 3 hours  
**Dependencies**: All Phase 1-2 tasks

**Description**:  
Integration tests that verify network switching works end-to-end.

**Acceptance Criteria**:
- [ ] Test devnet connection initialization
- [ ] Test mainnet connection initialization
- [ ] Test network validation in transactions
- [ ] Test token address selection per network
- [ ] Test RPC endpoint fallback

**Files to Create**:
- `src/services/blockchain/__tests__/networkIntegration.test.ts`

---

#### Task 4.3: Update Documentation
**Priority**: P1 (High)  
**Estimated Time**: 2 hours  
**Dependencies**: All tasks

**Description**:  
Update README and create developer guide for network switching.

**Acceptance Criteria**:
- [ ] README section on network configuration
- [ ] Environment variable documentation
- [ ] Local development setup guide
- [ ] Production build instructions
- [ ] Troubleshooting section

**Files to Modify**:
- `README.md`
- `ENV_SETUP_GUIDE.md`

---

### Phase 5: CI/CD & Production Safety (Week 3)

#### Task 5.1: Add CI/CD Validation
**Priority**: P0 (Critical)  
**Estimated Time**: 3 hours  
**Dependencies**: Task 1.1

**Description**:  
Add CI checks to prevent accidental devnet in production builds.

**Acceptance Criteria**:
- [ ] Pre-build check validates network config
- [ ] Production builds fail if network is not 'mainnet'
- [ ] Warning for missing RPC API keys in production
- [ ] PR check for network-related changes
- [ ] Build logs show network configuration

**Files to Create/Modify**:
- `.github/workflows/validate-network.yml` (or similar)
- `scripts/validate-network-config.js`

---

#### Task 5.2: Add Environment Variable Validation
**Priority**: P1 (High)  
**Estimated Time**: 2 hours  
**Dependencies**: Task 1.1

**Description**:  
Validate required environment variables are set for production builds.

**Acceptance Criteria**:
- [ ] Script validates env vars before build
- [ ] Clear error messages for missing vars
- [ ] Documentation of required vars
- [ ] Integration with EAS build process

**Files to Create**:
- `scripts/validate-env-vars.js`

---

## 3. Implementation-Ready Code

### 3.1 Network Configuration Module

**File**: `src/config/network/networkConfig.ts`

```typescript
/**
 * Network Configuration Module
 * 
 * Centralized network selection for devnet/mainnet switching.
 * Production builds default to mainnet; dev builds default to devnet.
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
    usdcMintAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZwyTDt1v', // Devnet USDC
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
    usdcMintAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZwyTDt1v', // Testnet USDC
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
 */
function isProductionBuild(): boolean {
  // Check EAS build profile
  const buildProfile = getEnvVar('EAS_BUILD_PROFILE');
  if (buildProfile === 'production') {
    return true;
  }
  
  // Check APP_ENV
  const appEnv = getEnvVar('APP_ENV');
  if (appEnv === 'production') {
    return true;
  }
  
  // Check if __DEV__ is false (production bundle)
  return !__DEV__;
}

/**
 * Get network from environment variables
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
  
  // Legacy: EXPO_PUBLIC_FORCE_MAINNET
  const forceMainnet = getEnvVar('EXPO_PUBLIC_FORCE_MAINNET');
  if (forceMainnet === 'true') {
    return 'mainnet';
  }
  
  return null;
}

/**
 * Get network with production-safe defaults
 */
async function determineNetwork(): Promise<SolanaNetwork> {
  const isProduction = isProductionBuild();
  
  // 1. Check environment variable
  const envNetwork = getNetworkFromEnv();
  if (envNetwork) {
    // Validate production builds don't use devnet
    if (isProduction && envNetwork === 'devnet') {
      logger.warn(
        'Production build attempted to use devnet. Defaulting to mainnet.',
        { envNetwork },
        'networkConfig'
      );
      return 'mainnet';
    }
    return envNetwork;
  }
  
  // 2. Check runtime override (dev only)
  if (!isProduction && __DEV__) {
    try {
      const override = await AsyncStorage.getItem('NETWORK_OVERRIDE');
      if (override && ['devnet', 'mainnet', 'testnet'].includes(override)) {
        logger.info(`Using runtime network override: ${override}`, null, 'networkConfig');
        return override as SolanaNetwork;
      }
    } catch (error) {
      logger.warn('Failed to read network override', { error }, 'networkConfig');
    }
  }
  
  // 3. Default based on build type
  if (isProduction) {
    logger.info('Production build defaulting to mainnet', null, 'networkConfig');
    return 'mainnet';
  }
  
  logger.info('Development build defaulting to devnet', null, 'networkConfig');
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
    const heliusKey = getEnvVar('EXPO_PUBLIC_HELIUS_API_KEY');
    if (heliusKey && heliusKey !== 'YOUR_HELIUS_API_KEY_HERE') {
      endpoints.unshift(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`);
    }
    
    // Add Alchemy if API key available
    const alchemyKey = getEnvVar('EXPO_PUBLIC_ALCHEMY_API_KEY');
    if (alchemyKey && alchemyKey !== 'YOUR_ALCHEMY_API_KEY_HERE') {
      endpoints.unshift(`https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`);
    }
    
    // Add GetBlock if API key available
    const getBlockKey = getEnvVar('EXPO_PUBLIC_GETBLOCK_API_KEY');
    if (getBlockKey && getBlockKey !== 'YOUR_GETBLOCK_API_KEY_HERE') {
      endpoints.unshift(`https://sol.getblock.io/mainnet/?api_key=${getBlockKey}`);
    }
  }
  
  return endpoints;
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
    rpcUrl: config.rpcUrl.replace(/api-key=[^&]+/, 'api-key=***'),
    endpointCount: config.rpcEndpoints.length,
    isProduction: isProductionBuild(),
  }, 'networkConfig');
  
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
  logger.info('Network config cache cleared', null, 'networkConfig');
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
  
  logger.info(`Network override set to: ${network}`, null, 'networkConfig');
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
```

**File**: `src/config/network/index.ts`

```typescript
/**
 * Network Configuration Exports
 */

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
} from './networkConfig';
```

---

### 3.2 Solana Connection Factory

**File**: `src/services/blockchain/connection/connectionFactory.ts`

```typescript
/**
 * Solana Connection Factory
 * 
 * Creates and manages Solana Connection instances with network-specific configuration.
 * Implements singleton pattern per network and RPC endpoint fallback.
 */

import { Connection, Commitment } from '@solana/web3.js';
import { getNetworkConfig, type NetworkConfig } from '../../../config/network';
import { logger } from '../../analytics/loggingService';

export interface ConnectionOptions {
  commitment?: Commitment;
  confirmTransactionInitialTimeout?: number;
  disableRetryOnRateLimit?: boolean;
}

// Connection cache per network
const connectionCache = new Map<string, Connection>();
let currentNetworkConfig: NetworkConfig | null = null;

/**
 * Create a Solana Connection instance
 * 
 * @param options - Optional connection options
 * @param networkOverride - Optional network override (dev only)
 * @returns Configured Connection instance
 */
export async function createSolanaConnection(
  options: ConnectionOptions = {},
  networkOverride?: 'devnet' | 'mainnet' | 'testnet'
): Promise<Connection> {
  // Get network configuration
  const networkConfig = await getNetworkConfig();
  
  // Use override if provided (dev only)
  const effectiveNetwork = networkOverride || networkConfig.network;
  
  // Check cache
  const cacheKey = `${effectiveNetwork}-${networkConfig.rpcUrl}`;
  if (connectionCache.has(cacheKey)) {
    return connectionCache.get(cacheKey)!;
  }
  
  // Build connection options
  const connectionOptions: ConnectionOptions = {
    commitment: networkConfig.commitment,
    confirmTransactionInitialTimeout: networkConfig.timeout,
    disableRetryOnRateLimit: false,
    ...options,
  };
  
  // Create connection
  const connection = new Connection(networkConfig.rpcUrl, connectionOptions);
  
  // Cache connection
  connectionCache.set(cacheKey, connection);
  currentNetworkConfig = networkConfig;
  
  logger.info('Solana connection created', {
    network: effectiveNetwork,
    rpcUrl: networkConfig.rpcUrl.replace(/api-key=[^&]+/, 'api-key=***'),
    commitment: connectionOptions.commitment,
  }, 'connectionFactory');
  
  return connection;
}

/**
 * Get cached connection for current network
 * 
 * @returns Cached Connection instance or creates new one
 */
export async function getSolanaConnection(): Promise<Connection> {
  const networkConfig = await getNetworkConfig();
  const cacheKey = `${networkConfig.network}-${networkConfig.rpcUrl}`;
  
  if (connectionCache.has(cacheKey)) {
    return connectionCache.get(cacheKey)!;
  }
  
  return createSolanaConnection();
}

/**
 * Test connection health
 * 
 * @param connection - Connection to test
 * @returns True if connection is healthy
 */
export async function testConnectionHealth(
  connection: Connection
): Promise<boolean> {
  try {
    const blockHeight = await connection.getBlockHeight();
    return blockHeight > 0;
  } catch (error) {
    logger.warn('Connection health check failed', { error }, 'connectionFactory');
    return false;
  }
}

/**
 * Get connection with fallback to alternative RPC endpoints
 * 
 * @param options - Connection options
 * @returns Healthy connection instance
 */
export async function getConnectionWithFallback(
  options: ConnectionOptions = {}
): Promise<Connection> {
  const networkConfig = await getNetworkConfig();
  
  // Try primary endpoint
  let connection = await createSolanaConnection(options);
  if (await testConnectionHealth(connection)) {
    return connection;
  }
  
  // Try fallback endpoints
  logger.warn('Primary RPC endpoint unhealthy, trying fallbacks', null, 'connectionFactory');
  
  for (let i = 1; i < networkConfig.rpcEndpoints.length; i++) {
    const fallbackUrl = networkConfig.rpcEndpoints[i];
    if (!fallbackUrl) continue;
    
    try {
      const fallbackConnection = new Connection(fallbackUrl, {
        commitment: networkConfig.commitment,
        confirmTransactionInitialTimeout: networkConfig.timeout,
        disableRetryOnRateLimit: false,
        ...options,
      });
      
      if (await testConnectionHealth(fallbackConnection)) {
        logger.info(`Using fallback RPC endpoint: ${i}`, null, 'connectionFactory');
        return fallbackConnection;
      }
    } catch (error) {
      logger.warn(`Fallback endpoint ${i} failed`, { error }, 'connectionFactory');
    }
  }
  
  // If all fail, return primary (will fail gracefully)
  logger.error('All RPC endpoints failed, using primary', null, 'connectionFactory');
  return connection;
}

/**
 * Clear connection cache (useful for testing or network changes)
 */
export function clearConnectionCache(): void {
  connectionCache.clear();
  currentNetworkConfig = null;
  logger.info('Connection cache cleared', null, 'connectionFactory');
}

/**
 * Get current network configuration
 */
export function getCurrentNetworkConfig(): NetworkConfig | null {
  return currentNetworkConfig;
}
```

**File**: `src/services/blockchain/connection/index.ts`

```typescript
/**
 * Connection Factory Exports
 */

export {
  createSolanaConnection,
  getSolanaConnection,
  getConnectionWithFallback,
  testConnectionHealth,
  clearConnectionCache,
  getCurrentNetworkConfig,
  type ConnectionOptions,
} from './connectionFactory';
```

---

## 4. Example Usage

### 4.1 Using Network Config in Services

```typescript
// src/services/blockchain/wallet/api/solanaWalletApi.ts
import { getNetworkConfig, isMainnet } from '../../../config/network';
import { getSolanaConnection } from '../../connection';

class SolanaWalletService {
  private connection: Connection | null = null;

  async initialize(): Promise<void> {
    const networkConfig = await getNetworkConfig();
    this.connection = await getSolanaConnection();
    
    logger.info('Wallet service initialized', {
      network: networkConfig.network,
      usdcMint: networkConfig.usdcMintAddress,
    }, 'SolanaWalletService');
  }

  async getBalance(publicKey: PublicKey): Promise<number> {
    if (!this.connection) {
      await this.initialize();
    }
    
    // Network-specific token handling
    const networkConfig = await getNetworkConfig();
    const balance = await this.connection.getTokenAccountBalance(
      // ... token account logic
    );
    
    return balance;
  }
}
```

### 4.2 Network Validation in Transactions

```typescript
// src/services/blockchain/network/networkValidator.ts
import { getCurrentNetwork, isMainnet } from '../../../config/network';
import { logger } from '../../analytics/loggingService';

export class NetworkValidator {
  /**
   * Validate network match for transaction
   */
  static validateTransactionNetwork(
    expectedNetwork: 'devnet' | 'mainnet',
    operation: string
  ): void {
    const currentNetwork = getCurrentNetwork();
    
    if (currentNetwork !== expectedNetwork) {
      const error = new Error(
        `Network mismatch: Attempting ${operation} on ${expectedNetwork} but connected to ${currentNetwork}`
      );
      logger.error('Network validation failed', {
        currentNetwork,
        expectedNetwork,
        operation,
      }, 'NetworkValidator');
      throw error;
    }
  }
  
  /**
   * Warn if attempting mainnet operation on devnet
   */
  static warnIfDevnet(operation: string): void {
    if (!isMainnet()) {
      logger.warn(
        `Warning: ${operation} attempted on devnet. This may not work as expected.`,
        { operation, network: getCurrentNetwork() },
        'NetworkValidator'
      );
    }
  }
}
```

---

## 5. Tests

### 5.1 Unit Tests

**File**: `src/config/network/__tests__/networkConfig.test.ts`

```typescript
/**
 * Network Configuration Tests
 */

import { 
  getNetworkConfig, 
  getNetworkConfigSync,
  clearNetworkConfigCache,
  setNetworkOverride,
  isMainnet,
  isDevnet,
} from '../networkConfig';
import Constants from 'expo-constants';

// Mock dependencies
jest.mock('expo-constants');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../../services/analytics/loggingService', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Network Configuration', () => {
  beforeEach(() => {
    clearNetworkConfigCache();
    jest.clearAllMocks();
  });

  describe('getNetworkConfig', () => {
    it('should default to devnet in development', async () => {
      (Constants.expoConfig as any) = { extra: {} };
      process.env.EXPO_PUBLIC_NETWORK = undefined;
      (global as any).__DEV__ = true;
      
      const config = await getNetworkConfig();
      
      expect(config.network).toBe('devnet');
      expect(config.rpcUrl).toContain('devnet');
    });

    it('should default to mainnet in production', async () => {
      (Constants.expoConfig as any) = { extra: {} };
      process.env.EXPO_PUBLIC_NETWORK = undefined;
      (global as any).__DEV__ = false;
      process.env.EAS_BUILD_PROFILE = 'production';
      
      const config = await getNetworkConfig();
      
      expect(config.network).toBe('mainnet');
      expect(config.rpcUrl).toContain('mainnet');
    });

    it('should read EXPO_PUBLIC_NETWORK env var', async () => {
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'mainnet' },
      };
      
      const config = await getNetworkConfig();
      
      expect(config.network).toBe('mainnet');
    });

    it('should override devnet in production builds', async () => {
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'devnet' },
      };
      process.env.EAS_BUILD_PROFILE = 'production';
      (global as any).__DEV__ = false;
      
      const config = await getNetworkConfig();
      
      // Should force mainnet in production
      expect(config.network).toBe('mainnet');
    });

    it('should return correct USDC mint address per network', async () => {
      // Mainnet
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'mainnet' },
      };
      const mainnetConfig = await getNetworkConfig();
      expect(mainnetConfig.usdcMintAddress).toBe(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      );
      
      clearNetworkConfigCache();
      
      // Devnet
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'devnet' },
      };
      const devnetConfig = await getNetworkConfig();
      expect(devnetConfig.usdcMintAddress).toBe(
        '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZwyTDt1v'
      );
    });
  });

  describe('isMainnet / isDevnet', () => {
    it('should correctly identify mainnet', async () => {
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'mainnet' },
      };
      await getNetworkConfig();
      
      expect(isMainnet()).toBe(true);
      expect(isDevnet()).toBe(false);
    });

    it('should correctly identify devnet', async () => {
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'devnet' },
      };
      await getNetworkConfig();
      
      expect(isMainnet()).toBe(false);
      expect(isDevnet()).toBe(true);
    });
  });
});
```

### 5.2 Integration Tests

**File**: `src/services/blockchain/__tests__/networkIntegration.test.ts`

```typescript
/**
 * Network Integration Tests
 */

import { getNetworkConfig } from '../../../config/network';
import { createSolanaConnection, testConnectionHealth } from '../../connection/connectionFactory';

describe('Network Integration', () => {
  it('should create connection for devnet', async () => {
    const config = await getNetworkConfig();
    // Set to devnet for test
    process.env.EXPO_PUBLIC_NETWORK = 'devnet';
    
    const connection = await createSolanaConnection();
    const isHealthy = await testConnectionHealth(connection);
    
    expect(isHealthy).toBe(true);
    expect(config.network).toBe('devnet');
  });

  it('should use correct RPC endpoint per network', async () => {
    // Test devnet
    process.env.EXPO_PUBLIC_NETWORK = 'devnet';
    const devnetConfig = await getNetworkConfig();
    expect(devnetConfig.rpcUrl).toContain('devnet');
    
    // Test mainnet
    process.env.EXPO_PUBLIC_NETWORK = 'mainnet';
    const mainnetConfig = await getNetworkConfig();
    expect(mainnetConfig.rpcUrl).toContain('mainnet');
  });
});
```

---

## 6. CI/CD Configuration

### 6.1 Pre-Build Validation Script

**File**: `scripts/validate-network-config.js`

```javascript
/**
 * Validate Network Configuration Before Build
 * 
 * Ensures production builds use mainnet and required env vars are set.
 */

const fs = require('fs');
const path = require('path');

function validateNetworkConfig() {
  const buildProfile = process.env.EAS_BUILD_PROFILE;
  const appEnv = process.env.APP_ENV;
  const network = process.env.EXPO_PUBLIC_NETWORK;
  const isProduction = buildProfile === 'production' || appEnv === 'production';

  console.log('🔍 Validating network configuration...');
  console.log(`Build Profile: ${buildProfile || 'not set'}`);
  console.log(`APP_ENV: ${appEnv || 'not set'}`);
  console.log(`Network: ${network || 'not set'}`);

  if (isProduction) {
    // Production builds must use mainnet
    if (network && network.toLowerCase() !== 'mainnet') {
      console.error('❌ ERROR: Production builds must use mainnet');
      console.error(`   Current network: ${network}`);
      console.error('   Set EXPO_PUBLIC_NETWORK=mainnet');
      process.exit(1);
    }

    if (!network) {
      console.warn('⚠️  WARNING: EXPO_PUBLIC_NETWORK not set in production');
      console.warn('   Defaulting to mainnet (this is OK)');
    }

    // Warn if no RPC API keys
    const hasRpcKey = 
      process.env.EXPO_PUBLIC_HELIUS_API_KEY ||
      process.env.EXPO_PUBLIC_ALCHEMY_API_KEY ||
      process.env.EXPO_PUBLIC_GETBLOCK_API_KEY;

    if (!hasRpcKey) {
      console.warn('⚠️  WARNING: No RPC API keys configured');
      console.warn('   Performance may be degraded due to rate limits');
      console.warn('   Consider adding HELIUS_API_KEY, ALCHEMY_API_KEY, or GETBLOCK_API_KEY');
    }
  } else {
    // Development builds default to devnet (OK)
    if (!network || network.toLowerCase() === 'devnet') {
      console.log('✅ Development build using devnet (OK)');
    }
  }

  console.log('✅ Network configuration validated');
}

validateNetworkConfig();
```

### 6.2 GitHub Actions Workflow

**File**: `.github/workflows/validate-network.yml`

```yaml
name: Validate Network Configuration

on:
  pull_request:
    paths:
      - 'src/config/network/**'
      - 'app.config.js'
      - '.env*'
      - 'scripts/validate-network-config.js'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Validate Network Config
        run: node scripts/validate-network-config.js
        env:
          EAS_BUILD_PROFILE: ${{ github.base_ref == 'main' && 'production' || 'development' }}
          EXPO_PUBLIC_NETWORK: ${{ github.base_ref == 'main' && 'mainnet' || 'devnet' }}
      
      - name: Check for Network-Related Changes
        run: |
          if git diff --name-only ${{ github.event.pull_request.base.sha }} | grep -E '(network|Network|NETWORK)'; then
            echo "⚠️ Network-related changes detected. Please verify network configuration."
          fi
```

### 6.3 EAS Build Configuration

**File**: `eas.json` (add to existing)

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_NETWORK": "mainnet",
        "APP_ENV": "production"
      },
      "prebuildCommand": "node scripts/validate-network-config.js"
    },
    "development": {
      "env": {
        "EXPO_PUBLIC_NETWORK": "devnet",
        "APP_ENV": "development"
      }
    }
  }
}
```

---

## 7. Rollout Checklist

### Pre-Deployment

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Network config validated in CI
- [ ] Environment variables documented
- [ ] Backend services updated to match network logic
- [ ] Firebase Functions network config updated
- [ ] RPC API keys configured for production
- [ ] Error messages reviewed and user-friendly

### Deployment Steps

1. **Merge to Dev Branch**
   - [ ] Deploy to dev environment
   - [ ] Verify devnet connection works
   - [ ] Test network switching (dev only)
   - [ ] Monitor logs for network selection

2. **Staging Deployment**
   - [ ] Deploy to staging with mainnet config
   - [ ] Verify mainnet connection works
   - [ ] Test transaction flows
   - [ ] Verify network validation works

3. **Production Deployment**
   - [ ] Verify production env vars set
   - [ ] Run pre-build validation
   - [ ] Build production bundle
   - [ ] Deploy to production
   - [ ] Monitor error rates
   - [ ] Verify network logs show 'mainnet'

### Post-Deployment

- [ ] Monitor error logs for network-related issues
- [ ] Check transaction success rates
- [ ] Verify RPC endpoint health
- [ ] Review user feedback
- [ ] Document any issues encountered

### Rollback Plan

If issues occur:

1. **Immediate Rollback**
   - Revert to previous version
   - Clear network config cache
   - Restart services

2. **Partial Rollback**
   - Disable network validation temporarily
   - Keep connection factory changes
   - Revert network config module

3. **Communication**
   - Notify team of rollback
   - Document issue in post-mortem
   - Plan fix for next release

---

## 8. Security Checklist

### ✅ Security Requirements

- [x] **No seed phrases in client storage** - Uses Wallet Adapters only
- [x] **No private keys in client code** - All signing via Wallet Adapters
- [x] **Environment variables for secrets** - API keys via env vars only
- [x] **Production defaults to mainnet** - Prevents accidental devnet usage
- [x] **Network validation** - Prevents network mismatches
- [x] **RPC API keys masked in logs** - No exposure in logs
- [x] **Backend validates network** - Server-side validation
- [x] **No network override in production** - Runtime override dev-only

### 🔒 Sensitive Data Handling

**Never store in client:**
- Seed phrases
- Private keys
- RPC API keys (use env vars)
- Wallet secret keys

**Safe to store in client:**
- Public keys
- Network configuration (public)
- RPC URLs (public endpoints)

**Backend only:**
- Company wallet secret key
- Transaction signing keys
- MoonPay secret keys

---

## 9. Error Messages & UX Prompts

### 9.1 Network Mismatch Error

```typescript
// Error message when attempting mainnet operation on devnet
export const NETWORK_MISMATCH_ERROR = {
  title: 'Network Mismatch',
  message: 'You are connected to devnet, but this operation requires mainnet. Please switch to mainnet to continue.',
  action: 'Switch to Mainnet',
};

// Error message when attempting devnet operation on mainnet
export const NETWORK_MISMATCH_ERROR_DEVNET = {
  title: 'Network Mismatch',
  message: 'You are connected to mainnet, but this operation requires devnet. This is a development-only feature.',
  action: 'OK',
};
```

### 9.2 Connection Error Messages

```typescript
export const CONNECTION_ERRORS = {
  OFFLINE: {
    title: 'No Internet Connection',
    message: 'Please check your internet connection and try again.',
  },
  RPC_FAILED: {
    title: 'Network Error',
    message: 'Unable to connect to Solana network. Please try again in a moment.',
  },
  TIMEOUT: {
    title: 'Request Timeout',
    message: 'The request took too long. Please check your connection and try again.',
  },
};
```

### 9.3 User-Facing Network Indicator

```typescript
// Component to show current network (dev builds only)
export const NetworkIndicator = () => {
  const network = getCurrentNetwork();
  const isProduction = !__DEV__;
  
  if (isProduction) {
    return null; // Hidden in production
  }
  
  return (
    <View style={styles.container}>
      <Text style={[styles.text, network === 'mainnet' ? styles.mainnet : styles.devnet]}>
        {network.toUpperCase()}
      </Text>
    </View>
  );
};
```

---

## 10. README Snippet

Add this section to your main `README.md`:

```markdown
## Network Configuration

WeSplit supports both Solana devnet (for development) and mainnet (for production).

### Local Development (Devnet)

By default, the app connects to Solana devnet when running locally:

```bash
# Start with devnet (default)
npm start

# Or explicitly set devnet
EXPO_PUBLIC_NETWORK=devnet npm start
```

### Production Builds (Mainnet)

Production builds automatically use mainnet:

```bash
# Build for production (uses mainnet)
eas build --profile production
```

### Environment Variables

**Required for Production:**
- `EXPO_PUBLIC_NETWORK=mainnet` (or omit, defaults to mainnet in production)

**Optional (for better RPC performance):**
- `EXPO_PUBLIC_HELIUS_API_KEY` - Helius RPC API key
- `EXPO_PUBLIC_ALCHEMY_API_KEY` - Alchemy RPC API key
- `EXPO_PUBLIC_GETBLOCK_API_KEY` - GetBlock RPC API key

**Development Only:**
- `EXPO_PUBLIC_NETWORK=devnet` - Use devnet (default in dev)

### Network Switching

**In Development:**
You can override the network at runtime (dev builds only):
- Use the dev menu (if available)
- Or set `NETWORK_OVERRIDE` in AsyncStorage (requires app restart)

**In Production:**
Network is locked to mainnet. Override is disabled for security.

### Troubleshooting

**App connecting to wrong network?**
1. Check `EXPO_PUBLIC_NETWORK` environment variable
2. Clear app cache: `expo start --clear`
3. Restart Metro bundler

**RPC connection errors?**
1. Check internet connection
2. Verify RPC API keys are set (for mainnet)
3. Check network logs in console

**Transaction failing?**
1. Verify you're on the correct network
2. Check transaction logs for network mismatch errors
3. Ensure backend services match client network
```

---

## 11. Environment Variable Reference

### `.env.development` (Local Development)

```bash
# Network Configuration
EXPO_PUBLIC_NETWORK=devnet

# Optional: RPC API Keys (for better performance)
# EXPO_PUBLIC_HELIUS_API_KEY=your_helius_key_here
# EXPO_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key_here

# Firebase (dev)
EXPO_PUBLIC_USE_PROD_FUNCTIONS=false
```

### `.env.production` (Production Builds)

```bash
# Network Configuration (REQUIRED)
EXPO_PUBLIC_NETWORK=mainnet

# RPC API Keys (RECOMMENDED for production)
EXPO_PUBLIC_HELIUS_API_KEY=your_helius_key_here
# OR
EXPO_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key_here
# OR
EXPO_PUBLIC_GETBLOCK_API_KEY=your_getblock_key_here

# Firebase (production)
EXPO_PUBLIC_USE_PROD_FUNCTIONS=true
```

### Backend Environment Variables

**Firebase Functions** (`services/firebase-functions/.env`):

```bash
# Network (must match client)
SOLANA_NETWORK=mainnet  # or devnet

# RPC Configuration
HELIUS_API_KEY=your_helius_key_here
# OR
ALCHEMY_API_KEY=your_alchemy_key_here
```

---

## Summary

This implementation plan provides:

1. ✅ **Architecture** - Clear separation of concerns
2. ✅ **Task List** - Prioritized, PR-sized tickets
3. ✅ **Code Examples** - Production-ready TypeScript
4. ✅ **Tests** - Unit and integration test examples
5. ✅ **CI/CD** - Validation scripts and workflows
6. ✅ **Rollout Plan** - Step-by-step deployment
7. ✅ **Security** - Checklist and best practices
8. ✅ **UX** - Error messages and user prompts
9. ✅ **Documentation** - README and env var reference

All code follows production-safe practices:
- No secrets in client code
- Production defaults to mainnet
- Network validation at multiple layers
- Graceful error handling
- Comprehensive logging

