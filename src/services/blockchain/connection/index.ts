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
