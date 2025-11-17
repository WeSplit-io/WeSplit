/**
 * Solana Connection Factory
 * 
 * Creates and manages Solana Connection instances with network-specific configuration.
 * Implements singleton pattern per network and RPC endpoint fallback.
 */

import { Connection, Commitment } from '@solana/web3.js';
import { getNetworkConfig, type NetworkConfig } from '../../../config/network/solanaNetworkConfig';
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
    rpcUrl: networkConfig.rpcUrl.replace(/api-key=[^&]+/, 'api-key=***').replace(/\/v2\/[^\/]+/, '/v2/***'),
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
