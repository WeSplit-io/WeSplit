/**
 * Connection Factory Tests
 */

import {
  createSolanaConnection,
  getSolanaConnection,
  clearConnectionCache,
  testConnectionHealth,
} from '../connectionFactory';
import { Connection } from '@solana/web3.js';

// Mock dependencies
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation((url, options) => ({
    getBlockHeight: jest.fn().mockResolvedValue(1000),
    rpcEndpoint: url,
    commitment: options?.commitment || 'confirmed',
  })),
}));

jest.mock('../../../config/network/solanaNetworkConfig', () => ({
  getNetworkConfig: jest.fn().mockResolvedValue({
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    rpcEndpoints: ['https://api.devnet.solana.com'],
    commitment: 'confirmed',
    timeout: 20000,
    retries: 2,
  }),
}));

jest.mock('../../analytics/loggingService', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Connection Factory', () => {
  beforeEach(() => {
    clearConnectionCache();
    jest.clearAllMocks();
  });

  describe('createSolanaConnection', () => {
    it('should create a connection with network config', async () => {
      const connection = await createSolanaConnection();

      expect(Connection).toHaveBeenCalled();
      expect(connection).toBeDefined();
    });

    it('should cache connections per network', async () => {
      const connection1 = await createSolanaConnection();
      const connection2 = await createSolanaConnection();

      // Should return same cached connection
      expect(connection1).toBe(connection2);
    });

    it('should accept custom connection options', async () => {
      const connection = await createSolanaConnection({
        commitment: 'finalized',
        confirmTransactionInitialTimeout: 30000,
      });
      
      expect(connection).toBeDefined();
    });
  });

  describe('getSolanaConnection', () => {
    it('should return cached connection', async () => {
      const connection1 = await getSolanaConnection();
      const connection2 = await getSolanaConnection();

      expect(connection1).toBe(connection2);
    });
  });

  describe('testConnectionHealth', () => {
    it('should return true for healthy connection', async () => {
      const connection = await createSolanaConnection();
      const isHealthy = await testConnectionHealth(connection);

      expect(isHealthy).toBe(true);
    });

    it('should return false for unhealthy connection', async () => {
      const connection = await createSolanaConnection();
      // Mock getBlockHeight to throw error
      (connection.getBlockHeight as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await testConnectionHealth(connection);

      expect(isHealthy).toBe(false);
    });
  });

  describe('clearConnectionCache', () => {
    it('should clear connection cache', async () => {
      await createSolanaConnection();
      clearConnectionCache();
      
      // Next call should create new connection
      const connection = await createSolanaConnection();
      expect(connection).toBeDefined();
    });
  });
});
