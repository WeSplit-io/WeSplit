/**
 * Network Integration Tests
 * 
 * Tests the integration between network config, connection factory, and services
 */

import { getNetworkConfig } from '../../../config/network/solanaNetworkConfig';
import { createSolanaConnection, testConnectionHealth } from '../../connection/connectionFactory';
import { NetworkValidator } from '../network/networkValidator';

// Mock dependencies
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation((url, options) => ({
    getBlockHeight: jest.fn().mockResolvedValue(1000),
    rpcEndpoint: url,
    commitment: options?.commitment || 'confirmed',
  })),
}));

jest.mock('../../../config/network/solanaNetworkConfig', () => ({
  getNetworkConfig: jest.fn(),
  getCurrentNetwork: jest.fn(),
  isMainnet: jest.fn(),
}));

jest.mock('../../analytics/loggingService', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Network Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create connection for devnet', async () => {
    (getNetworkConfig as jest.Mock).mockResolvedValue({
      network: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        rpcEndpoints: ['https://api.devnet.solana.com'],
      commitment: 'confirmed',
        timeout: 20000,
        retries: 2,
    });
    
    const connection = await createSolanaConnection();
    const isHealthy = await testConnectionHealth(connection);

    expect(isHealthy).toBe(true);
    });

  it('should use correct RPC endpoint per network', async () => {
    // Test devnet
    (getNetworkConfig as jest.Mock).mockResolvedValue({
      network: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        rpcEndpoints: ['https://api.devnet.solana.com'],
      commitment: 'confirmed',
        timeout: 20000,
        retries: 2,
    });
    const devnetConfig = await getNetworkConfig();
    expect(devnetConfig.rpcUrl).toContain('devnet');

    // Test mainnet
    (getNetworkConfig as jest.Mock).mockResolvedValue({
      network: 'mainnet',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        rpcEndpoints: ['https://api.mainnet-beta.solana.com'],
      commitment: 'confirmed',
        timeout: 25000,
        retries: 4,
    });
    const mainnetConfig = await getNetworkConfig();
    expect(mainnetConfig.rpcUrl).toContain('mainnet');
  });

  it('should validate network before operations', () => {
    const { getCurrentNetwork } = require('../../../config/network/solanaNetworkConfig');
    getCurrentNetwork.mockReturnValue('mainnet');
    
    expect(() => {
      NetworkValidator.validateTransactionNetwork('mainnet', 'test');
    }).not.toThrow();
    
    getCurrentNetwork.mockReturnValue('devnet');
    
    expect(() => {
      NetworkValidator.validateTransactionNetwork('mainnet', 'test');
    }).toThrow();
  });
});
