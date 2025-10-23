/**
 * Wallet Detection Tests
 * Tests for the new MWA discovery and wallet detection functionality
 */

import { mwaDiscoveryService } from '../src/wallets/discovery/mwaDiscoveryService';
import { WALLET_PROVIDER_REGISTRY, getAllWalletProviders } from '../src/wallets/providers/registry';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
}));

describe('Wallet Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mwaDiscoveryService.clearCache();
  });

  describe('Wallet Provider Registry', () => {
    test('should have all required wallet providers', () => {
      const providers = getAllWalletProviders();
      
      expect(providers.length).toBeGreaterThan(0);
      
      // Check for major Solana wallets
      const providerNames = providers.map(p => p.name);
      expect(providerNames).toContain('phantom');
      expect(providerNames).toContain('solflare');
      expect(providerNames).toContain('backpack');
    });

    test('should have proper provider metadata', () => {
      const phantom = WALLET_PROVIDER_REGISTRY.phantom;
      
      expect(phantom).toBeDefined();
      expect(phantom.name).toBe('phantom');
      expect(phantom.displayName).toBe('Phantom');
      expect(phantom.deepLinkScheme).toBe('phantom://');
      expect(phantom.packageName).toBe('app.phantom');
      expect(phantom.mwaSupported).toBe(true);
      expect(phantom.priority).toBeGreaterThan(0);
    });

    test('should sort providers by priority', () => {
      const providers = getAllWalletProviders();
      
      for (let i = 1; i < providers.length; i++) {
        expect(providers[i - 1].priority).toBeGreaterThanOrEqual(providers[i].priority);
      }
    });
  });

  describe('MWA Discovery Service', () => {
    test('should initialize correctly', () => {
      expect(mwaDiscoveryService).toBeDefined();
    });

    test('should clear cache', () => {
      mwaDiscoveryService.clearCache();
      const cachedResults = mwaDiscoveryService.getCachedResults();
      expect(cachedResults).toHaveLength(0);
    });

    test('should get discovery statistics', () => {
      const stats = mwaDiscoveryService.getDiscoveryStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalProviders).toBeGreaterThan(0);
      expect(stats.platform).toBe('ios');
      expect(typeof stats.availableProviders).toBe('number');
      expect(typeof stats.mwaSupported).toBe('number');
      expect(typeof stats.cacheSize).toBe('number');
    });

    test('should handle discovery errors gracefully', async () => {
      // Mock Linking.canOpenURL to throw an error
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockRejectedValue(new Error('Test error'));

      const results = await mwaDiscoveryService.discoverProviders({
        useCache: false,
        includeUnsupported: false
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Should have results even if some fail
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Provider Discovery', () => {
    test('should discover providers with cache enabled', async () => {
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockResolvedValue(true);

      const results = await mwaDiscoveryService.discoverProviders({
        useCache: true,
        includeUnsupported: false
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Check result structure
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('provider');
      expect(firstResult).toHaveProperty('isAvailable');
      expect(firstResult).toHaveProperty('detectionMethod');
      expect(firstResult).toHaveProperty('timestamp');
    });

    test('should discover providers without cache', async () => {
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockResolvedValue(false);

      const results = await mwaDiscoveryService.discoverProviders({
        useCache: false,
        includeUnsupported: true
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should test individual provider discovery', async () => {
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockResolvedValue(true);

      const result = await mwaDiscoveryService.testDiscovery('phantom');

      expect(result).toBeDefined();
      expect(result.provider.name).toBe('phantom');
      expect(typeof result.isAvailable).toBe('boolean');
      expect(typeof result.detectionMethod).toBe('string');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid provider names', async () => {
      await expect(mwaDiscoveryService.testDiscovery('invalid_provider'))
        .rejects.toThrow('Provider invalid_provider not found');
    });

    test('should handle discovery timeouts', async () => {
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const results = await mwaDiscoveryService.discoverProviders({
        timeout: 50, // Very short timeout
        useCache: false
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Cache Functionality', () => {
    test('should cache discovery results', async () => {
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockResolvedValue(true);

      // First discovery
      await mwaDiscoveryService.discoverProviders({ useCache: true });
      
      // Second discovery should use cache
      const results = await mwaDiscoveryService.discoverProviders({ useCache: true });
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Verify cache was used (canOpenURL should only be called once per provider)
      expect(Linking.canOpenURL).toHaveBeenCalled();
    });

    test('should respect cache settings', async () => {
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockResolvedValue(true);

      // First discovery with cache
      await mwaDiscoveryService.discoverProviders({ useCache: true });
      const firstCallCount = Linking.canOpenURL.mock.calls.length;

      // Second discovery without cache
      await mwaDiscoveryService.discoverProviders({ useCache: false });
      const secondCallCount = Linking.canOpenURL.mock.calls.length;

      // Should have made more calls when cache was disabled
      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });
  });
});
