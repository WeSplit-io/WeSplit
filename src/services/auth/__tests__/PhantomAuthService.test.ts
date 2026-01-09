/**
 * Unit Tests for PhantomAuthService
 *
 * Tests the Phantom authentication service functionality including:
 * - Singleton pattern
 * - User authentication processing
 * - Firebase integration
 * - Production blocking
 */

import { PhantomAuthService } from '../PhantomAuthService';

// Mock dependencies
jest.mock('../../analytics/loggingService', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../data/firebaseDataService', () => ({
  firebaseDataService: {
    user: {
      searchUsersByWallet: jest.fn().mockResolvedValue([]),
      getCurrentUser: jest.fn().mockResolvedValue(null),
      updateUser: jest.fn().mockResolvedValue(undefined),
      addContact: jest.fn().mockResolvedValue({ id: 'contact-123' })
    },
    wallet: {
      getWalletInfo: jest.fn().mockResolvedValue(null)
    }
  }
}));

jest.mock('../../blockchain/wallet/phantomConnectService', () => ({
  PhantomConnectService: {
    getInstance: jest.fn().mockReturnValue({
      configure: jest.fn(),
      connect: jest.fn().mockResolvedValue({ success: false, error: 'test' }),
      disconnect: jest.fn().mockResolvedValue(undefined)
    })
  }
}));

// Mock Firebase imports
jest.mock('../../../config/firebase/firebase', () => ({
  db: {},
  auth: { currentUser: null }
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
  updateDoc: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('firebase/auth', () => ({
  signInWithCustomToken: jest.fn().mockResolvedValue({ user: { uid: 'firebase-123' } }),
  auth: { currentUser: null }
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn().mockReturnValue({}),
  httpsCallable: jest.fn().mockReturnValue(jest.fn().mockResolvedValue({
    data: { success: true, token: 'test-token', userId: 'firebase-123' }
  }))
}));

describe('PhantomAuthService', () => {
  let service: PhantomAuthService;

  // Save original __DEV__
  const originalDev = (global as any).__DEV__;

  beforeEach(() => {
    // Reset singleton by accessing private constructor through getInstance
    (PhantomAuthService as any).instance = undefined;
    service = PhantomAuthService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = PhantomAuthService.getInstance();
      const instance2 = PhantomAuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialize', () => {
    it('should initialize in development mode', async () => {
      (global as any).__DEV__ = true;

      await service.initialize();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should skip initialization in production', async () => {
      (global as any).__DEV__ = false;

      await service.initialize();

      // Service should remain in initial state
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('Process Authenticated User', () => {
    beforeEach(() => {
      (global as any).__DEV__ = true;
    });

    it('should block processing in production', async () => {
      (global as any).__DEV__ = false;

      const result = await service.processAuthenticatedUser(
        { walletId: 'wallet-123', addresses: [] },
        'google'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should fail without phantom user data', async () => {
      const result = await service.processAuthenticatedUser(null, 'google');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No Phantom user data');
    });

    it('should fail without wallet ID', async () => {
      const result = await service.processAuthenticatedUser(
        { name: 'Test User' },
        'google'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No wallet ID');
    });

    it('should process valid user with addresses array', async () => {
      const phantomUser = {
        walletId: 'wallet-123',
        authUserId: 'auth-user-456',
        addresses: [
          { address: 'SolanaAddress789', type: 'solana' }
        ],
        email: 'test@example.com',
        name: 'Test User'
      };

      const result = await service.processAuthenticatedUser(phantomUser, 'google');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.phantomWalletAddress).toBe('SolanaAddress789');
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.name).toBe('Test User');
    });

    it('should extract Solana address from mixed addresses', async () => {
      const phantomUser = {
        walletId: 'wallet-123',
        addresses: [
          { address: 'EthAddress', type: 'ethereum' },
          { address: 'SolanaAddr', type: 'solana' }
        ]
      };

      const result = await service.processAuthenticatedUser(phantomUser, 'apple');

      expect(result.success).toBe(true);
      expect(result.wallet?.address).toBe('SolanaAddr');
    });

    it('should use first address if no Solana type found', async () => {
      const phantomUser = {
        walletId: 'wallet-123',
        addresses: [
          { address: 'FirstAddress', type: 'unknown' }
        ]
      };

      const result = await service.processAuthenticatedUser(phantomUser, 'google');

      expect(result.success).toBe(true);
      expect(result.wallet?.address).toBe('FirstAddress');
    });

    it('should require email for Google auth', async () => {
      const phantomUser = {
        walletId: 'wallet-123',
        addresses: [{ address: 'TestAddr', type: 'solana' }],
        name: 'Test User'
        // No email provided
      };

      const result = await service.processAuthenticatedUser(phantomUser, 'google');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email is required');
    });

    it('should allow Apple auth without email', async () => {
      const phantomUser = {
        walletId: 'wallet-123',
        authUserId: 'apple-user-123',
        addresses: [{ address: 'TestAddr', type: 'solana' }],
        name: 'Apple User'
        // No email - Apple can hide it
      };

      const result = await service.processAuthenticatedUser(phantomUser, 'apple');

      expect(result.success).toBe(true);
      expect(result.user?.email).toContain('@apple.phantom.app');
    });
  });

  describe('Sign Out', () => {
    beforeEach(() => {
      (global as any).__DEV__ = true;
    });

    it('should clear current user on sign out', async () => {
      // First, set a user
      const phantomUser = {
        walletId: 'wallet-123',
        authUserId: 'auth-456',
        addresses: [{ address: 'TestAddr', type: 'solana' }],
        email: 'test@example.com'
      };

      await service.processAuthenticatedUser(phantomUser, 'google');
      expect(service.isAuthenticated()).toBe(true);

      // Now sign out
      await service.signOut();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('Authentication State', () => {
    beforeEach(() => {
      (global as any).__DEV__ = true;
    });

    it('should start unauthenticated', () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should be authenticated after processing user', async () => {
      const phantomUser = {
        walletId: 'wallet-123',
        authUserId: 'auth-456',
        addresses: [{ address: 'TestAddr', type: 'solana' }],
        email: 'test@example.com'
      };

      await service.processAuthenticatedUser(phantomUser, 'google');

      expect(service.isAuthenticated()).toBe(true);
      expect(service.getCurrentUser()).not.toBeNull();
    });
  });

  describe('Handle Social Auth Callback', () => {
    beforeEach(() => {
      (global as any).__DEV__ = true;
    });

    it('should parse state and call PhantomConnectService', async () => {
      const state = btoa(JSON.stringify({ provider: 'google', action: 'app_auth' }));

      const result = await service.handleSocialAuthCallback('auth-code-123', state);

      // The connect service is mocked to return error, so this should fail
      expect(result.success).toBe(false);
    });

    it('should handle invalid state gracefully', async () => {
      const result = await service.handleSocialAuthCallback('auth-code', 'invalid-base64');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('User Data Extraction', () => {
    beforeEach(() => {
      (global as any).__DEV__ = true;
    });

    it('should extract user info from userInfo object', async () => {
      const phantomUser = {
        walletId: 'wallet-123',
        addresses: [{ address: 'TestAddr', type: 'solana' }],
        userInfo: {
          name: 'Info Name',
          email: 'info@example.com',
          avatar: 'https://avatar.url'
        }
      };

      const result = await service.processAuthenticatedUser(phantomUser, 'google');

      expect(result.success).toBe(true);
      expect(result.user?.name).toBe('Info Name');
      expect(result.user?.email).toBe('info@example.com');
      expect(result.user?.avatar).toBe('https://avatar.url');
    });

    it('should prefer top-level properties over userInfo', async () => {
      const phantomUser = {
        walletId: 'wallet-123',
        addresses: [{ address: 'TestAddr', type: 'solana' }],
        name: 'Top Level Name',
        email: 'top@example.com',
        userInfo: {
          name: 'Info Name',
          email: 'info@example.com'
        }
      };

      const result = await service.processAuthenticatedUser(phantomUser, 'google');

      expect(result.success).toBe(true);
      expect(result.user?.name).toBe('Top Level Name');
      expect(result.user?.email).toBe('top@example.com');
    });
  });
});
