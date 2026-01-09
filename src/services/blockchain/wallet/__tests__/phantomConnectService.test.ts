/**
 * Unit Tests for PhantomConnectService
 *
 * Tests the Phantom Connect service functionality including:
 * - Singleton pattern
 * - Configuration
 * - Connection flows
 * - Spending validation
 */

import PhantomConnectService from '../phantomConnectService';

// Mock the logger
jest.mock('../../../analytics/loggingService', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('PhantomConnectService', () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    PhantomConnectService.resetInstance();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple getInstance calls', () => {
      const instance1 = PhantomConnectService.getInstance();
      const instance2 = PhantomConnectService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after reset', () => {
      const instance1 = PhantomConnectService.getInstance();
      PhantomConnectService.resetInstance();
      const instance2 = PhantomConnectService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const service = PhantomConnectService.getInstance();
      const config = service.getConfig();

      expect(config.enableSocialLogin).toBe(true);
      expect(config.enableEmbeddedWallets).toBe(true);
      expect(config.spendingLimits).toBeDefined();
      expect(config.spendingLimits?.maxAmount).toBe(100);
      expect(config.spendingLimits?.maxDaily).toBe(500);
    });

    it('should update configuration with configure()', () => {
      const service = PhantomConnectService.getInstance();

      service.configure({
        enableSocialLogin: false,
        spendingLimits: {
          maxAmount: 200,
          maxDaily: 1000
        }
      });

      const config = service.getConfig();
      expect(config.enableSocialLogin).toBe(false);
      expect(config.enableEmbeddedWallets).toBe(true); // Should retain default
      expect(config.spendingLimits?.maxAmount).toBe(200);
      expect(config.spendingLimits?.maxDaily).toBe(1000);
    });

    it('should merge spending limits configuration', () => {
      const service = PhantomConnectService.getInstance();

      // First configure with maxAmount
      service.configure({
        spendingLimits: {
          maxAmount: 300
        }
      });

      // Then configure with maxDaily
      service.configure({
        spendingLimits: {
          maxDaily: 1500
        }
      });

      const config = service.getConfig();
      expect(config.spendingLimits?.maxAmount).toBe(300);
      expect(config.spendingLimits?.maxDaily).toBe(1500);
    });
  });

  describe('Connection', () => {
    // Save original __DEV__ and restore after tests
    const originalDev = global.__DEV__;

    afterEach(() => {
      (global as any).__DEV__ = originalDev;
    });

    it('should block connection in production', async () => {
      (global as any).__DEV__ = false;

      const service = PhantomConnectService.getInstance();
      const result = await service.connect({ preferredMethod: 'social', socialProvider: 'google' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled in production');
    });

    it('should return social_auth_required for social login in dev', async () => {
      (global as any).__DEV__ = true;

      const service = PhantomConnectService.getInstance();
      service.configure({ enableSocialLogin: true });

      const result = await service.connect({
        preferredMethod: 'social',
        socialProvider: 'google'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('social_auth_required');
    });

    it('should handle auth code callback in dev', async () => {
      (global as any).__DEV__ = true;

      const service = PhantomConnectService.getInstance();
      const result = await service.connect({
        authCode: 'test-auth-code',
        socialProvider: 'apple'
      });

      // Auth callback handling is delegated to SDK
      expect(result.success).toBe(false);
      expect(result.error).toContain('managed by Phantom SDK');
    });

    it('should process SDK connection result successfully', () => {
      const service = PhantomConnectService.getInstance();

      const sdkResult = {
        walletId: 'wallet-123',
        authUserId: 'auth-user-456',
        addresses: [
          { address: 'SoLaNaAdDrEsS123456789', type: 'solana' }
        ],
        userInfo: {
          name: 'Test User',
          email: 'test@example.com'
        }
      };

      const result = service.processConnectionResult(sdkResult);

      expect(result.success).toBe(true);
      expect(result.address).toBe('SoLaNaAdDrEsS123456789');
      expect(result.publicKey).toBe('SoLaNaAdDrEsS123456789');
      expect(result.walletId).toBe('wallet-123');
      expect(result.authUserId).toBe('auth-user-456');
      expect(result.userInfo?.name).toBe('Test User');
      expect(result.userInfo?.email).toBe('test@example.com');
    });

    it('should fail processing SDK result without wallet data', () => {
      const service = PhantomConnectService.getInstance();

      const sdkResult = {
        userInfo: { name: 'Test User' }
      };

      const result = service.processConnectionResult(sdkResult);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No wallet data');
    });

    it('should fail processing SDK result without addresses', () => {
      const service = PhantomConnectService.getInstance();

      const sdkResult = {
        walletId: 'wallet-123',
        addresses: []
      };

      const result = service.processConnectionResult(sdkResult);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No Solana address');
    });

    it('should prefer Solana address type when processing multiple addresses', () => {
      const service = PhantomConnectService.getInstance();

      const sdkResult = {
        walletId: 'wallet-123',
        addresses: [
          { address: 'EthereumAddress123', type: 'ethereum' },
          { address: 'SolanaAddress456', type: 'solana' },
          { address: 'AnotherAddress789', type: 'other' }
        ]
      };

      const result = service.processConnectionResult(sdkResult);

      expect(result.success).toBe(true);
      expect(result.address).toBe('SolanaAddress456');
    });
  });

  describe('Disconnect', () => {
    it('should disconnect successfully', async () => {
      const service = PhantomConnectService.getInstance();

      // First, simulate a connection
      service.processConnectionResult({
        walletId: 'wallet-123',
        addresses: [{ address: 'TestAddress', type: 'solana' }]
      });

      expect(service.getIsConnected()).toBe(true);

      // Then disconnect
      await service.disconnect();

      expect(service.getIsConnected()).toBe(false);
      expect(service.getCurrentAddress()).toBeNull();
      expect(service.getCurrentPublicKey()).toBeNull();
    });
  });

  describe('Spending Validation', () => {
    it('should validate spending within limits', () => {
      const service = PhantomConnectService.getInstance();
      service.configure({
        spendingLimits: {
          maxAmount: 100,
          allowedTokens: ['USDC-MINT-ADDRESS']
        }
      });

      const result = service.validateSpending(50, 'USDC-MINT-ADDRESS');
      expect(result.valid).toBe(true);
    });

    it('should reject spending over max amount', () => {
      const service = PhantomConnectService.getInstance();
      service.configure({
        spendingLimits: {
          maxAmount: 100
        }
      });

      const result = service.validateSpending(150);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('exceeds maximum');
    });

    it('should reject spending with disallowed token', () => {
      const service = PhantomConnectService.getInstance();
      service.configure({
        spendingLimits: {
          allowedTokens: ['USDC-MINT-ADDRESS']
        }
      });

      const result = service.validateSpending(50, 'OTHER-TOKEN');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not in the allowed tokens');
    });

    it('should allow any spending when no limits configured', () => {
      const service = PhantomConnectService.getInstance();
      service.configure({
        spendingLimits: undefined
      });

      const result = service.validateSpending(10000, 'ANY-TOKEN');
      expect(result.valid).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should update internal state on successful connection', () => {
      const service = PhantomConnectService.getInstance();

      expect(service.getIsConnected()).toBe(false);
      expect(service.getCurrentAddress()).toBeNull();

      service.processConnectionResult({
        walletId: 'wallet-123',
        addresses: [{ address: 'TestWalletAddress', type: 'solana' }]
      });

      expect(service.getIsConnected()).toBe(true);
      expect(service.getCurrentAddress()).toBe('TestWalletAddress');
      expect(service.getCurrentPublicKey()).toBe('TestWalletAddress');
    });
  });
});
