/**
 * Wallet Linking Tests
 * Tests for signature-based wallet linking functionality
 */

import { signatureLinkService } from '../src/wallets/linking/signatureLinkService';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock wallet service (secure storage functionality moved here)
jest.mock('../src/services/WalletService', () => ({
  walletService: {
    storeWalletSecurelyPublic: jest.fn(),
    getUserWallet: jest.fn(),
    removeLinkedWallet: jest.fn(),
  },
}));

describe('Wallet Linking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Signature Link Service', () => {
    test('should initialize correctly', () => {
      expect(signatureLinkService).toBeDefined();
    });

    test('should generate valid signature challenges', async () => {
      const userId = 'test-user-123';
      
      // Mock the linking process
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockResolvedValue(true);
      Linking.openURL.mockResolvedValue(undefined);

      const result = await signatureLinkService.linkExternalWallet({
        userId,
        provider: 'phantom',
        label: 'Test Phantom Wallet',
        timeout: 5000
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.provider).toBe('string');
    });

    test('should handle linking errors gracefully', async () => {
      const userId = 'test-user-123';
      
      // Mock Linking.canOpenURL to return false (wallet not available)
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockResolvedValue(false);

      const result = await signatureLinkService.linkExternalWallet({
        userId,
        provider: 'phantom',
        timeout: 5000
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid provider names', async () => {
      const userId = 'test-user-123';

      const result = await signatureLinkService.linkExternalWallet({
        userId,
        provider: 'invalid_provider',
        timeout: 5000
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported wallet provider');
    });

    test('should handle missing user ID', async () => {
      const result = await signatureLinkService.linkExternalWallet({
        userId: '',
        provider: 'phantom',
        timeout: 5000
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Linked Wallet Management', () => {
    test('should get linked wallets', async () => {
      const { walletService } = require('../src/services/WalletService');
      walletService.getUserWallet.mockResolvedValue([]);

      const wallets = await signatureLinkService.getLinkedWallets('test-user-123');

      expect(wallets).toBeDefined();
      expect(Array.isArray(wallets)).toBe(true);
      expect(walletService.getUserWallet).toHaveBeenCalledWith('test-user-123');
    });

    test('should remove linked wallets', async () => {
      const { walletService } = require('../src/services/WalletService');
      walletService.removeLinkedWallet.mockResolvedValue(undefined);

      const result = await signatureLinkService.removeLinkedWallet('test-user-123', 'wallet-456');

      expect(result).toBe(true);
      expect(walletService.removeLinkedWallet).toHaveBeenCalledWith('test-user-123', 'wallet-456');
    });

    test('should handle removal errors', async () => {
      const { walletService } = require('../src/services/WalletService');
      walletService.removeLinkedWallet.mockRejectedValue(new Error('Storage error'));

      const result = await signatureLinkService.removeLinkedWallet('test-user-123', 'wallet-456');

      expect(result).toBe(false);
    });
  });

  describe('Test Signature Linking', () => {
    test('should test signature linking', async () => {
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockResolvedValue(true);
      Linking.openURL.mockResolvedValue(undefined);

      const result = await signatureLinkService.testSignatureLinking('phantom', 'test-user-123');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.provider).toBe('phantom');
    });

    test('should handle test linking errors', async () => {
      const { Linking } = require('react-native');
      Linking.canOpenURL.mockRejectedValue(new Error('Network error'));

      const result = await signatureLinkService.testSignatureLinking('phantom', 'test-user-123');

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Challenge Generation', () => {
    test('should generate unique nonces', () => {
      // Access private method through reflection for testing
      const service = signatureLinkService as any;
      
      const nonce1 = service.generateNonce();
      const nonce2 = service.generateNonce();
      
      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toBe(nonce2);
      expect(typeof nonce1).toBe('string');
      expect(typeof nonce2).toBe('string');
    });

    test('should generate unique app instance IDs', () => {
      const service = signatureLinkService as any;
      
      const id1 = service.generateAppInstanceId();
      const id2 = service.generateAppInstanceId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toContain('wesplit_');
      expect(id2).toContain('wesplit_');
    });

    test('should generate unique wallet IDs', () => {
      const service = signatureLinkService as any;
      
      const id1 = service.generateWalletId();
      const id2 = service.generateWalletId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toContain('wallet_');
      expect(id2).toContain('wallet_');
    });
  });

  describe('Challenge Validation', () => {
    test('should validate valid challenges', () => {
      const service = signatureLinkService as any;
      
      const challenge = {
        nonce: 'test-nonce',
        message: 'test message',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 300000, // 5 minutes from now
        userId: 'test-user',
        appInstanceId: 'test-instance'
      };

      const isValid = service.validateChallenge(challenge);
      expect(isValid).toBe(true);
    });

    test('should reject expired challenges', () => {
      const service = signatureLinkService as any;
      
      const challenge = {
        nonce: 'test-nonce',
        message: 'test message',
        issuedAt: Date.now() - 600000, // 10 minutes ago
        expiresAt: Date.now() - 300000, // 5 minutes ago (expired)
        userId: 'test-user',
        appInstanceId: 'test-instance'
      };

      const isValid = service.validateChallenge(challenge);
      expect(isValid).toBe(false);
    });

    test('should reject challenges with missing fields', () => {
      const service = signatureLinkService as any;
      
      const challenge = {
        nonce: '',
        message: 'test message',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 300000,
        userId: 'test-user',
        appInstanceId: 'test-instance'
      };

      const isValid = service.validateChallenge(challenge);
      expect(isValid).toBe(false);
    });

    test('should reject challenges that are too old', () => {
      const service = signatureLinkService as any;
      
      const challenge = {
        nonce: 'test-nonce',
        message: 'test message',
        issuedAt: Date.now() - 7200000, // 2 hours ago (too old)
        expiresAt: Date.now() + 300000,
        userId: 'test-user',
        appInstanceId: 'test-instance'
      };

      const isValid = service.validateChallenge(challenge);
      expect(isValid).toBe(false);
    });
  });

  describe('Message Creation', () => {
    test('should create proper challenge messages', () => {
      const service = signatureLinkService as any;
      
      const nonce = 'test-nonce-123';
      const issuedAt = 1234567890000;
      const userId = 'test-user-456';
      
      const message = service.createChallengeMessage(nonce, issuedAt, userId);
      
      expect(message).toContain('WeSplit Wallet Linking Challenge');
      expect(message).toContain(nonce);
      expect(message).toContain(userId);
      expect(message).toContain(new Date(issuedAt).toISOString());
    });
  });
});
