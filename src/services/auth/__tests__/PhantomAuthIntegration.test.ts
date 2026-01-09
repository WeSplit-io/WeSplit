/**
 * Integration Tests for Phantom Auth Flow
 *
 * Tests the complete authentication flow from SDK connection
 * through to Firebase user creation and app state management.
 */

import { PhantomAuthService, PhantomUser } from '../PhantomAuthService';
import { PhantomConnectService } from '../../blockchain/wallet/phantomConnectService';

// Mock dependencies
jest.mock('../../analytics/loggingService', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock Firebase
const mockSetDoc = jest.fn().mockResolvedValue(undefined);
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../config/firebase/firebase', () => ({
  db: {},
  auth: { currentUser: null },
  app: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'doc-id' })),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args)
}));

jest.mock('firebase/auth', () => ({
  signInWithCustomToken: jest.fn().mockResolvedValue({
    user: { uid: 'firebase-user-123' }
  }),
  auth: { currentUser: null }
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn().mockReturnValue({}),
  httpsCallable: jest.fn().mockReturnValue(
    jest.fn().mockResolvedValue({
      data: { success: true, token: 'custom-token', userId: 'firebase-user-123' }
    })
  )
}));

jest.mock('../../data/firebaseDataService', () => ({
  firebaseDataService: {
    user: {
      searchUsersByWallet: jest.fn().mockResolvedValue([]),
      getCurrentUser: jest.fn().mockResolvedValue(null),
      updateUser: jest.fn().mockResolvedValue(undefined)
    },
    wallet: {
      getWalletInfo: jest.fn().mockResolvedValue({
        address: 'existing-wallet-address'
      })
    }
  }
}));

jest.mock('../../core/UserMigrationService', () => ({
  UserMigrationService: {
    ensureUserConsistency: jest.fn().mockResolvedValue({
      id: 'firebase-user-123',
      email: 'test@example.com'
    })
  }
}));

describe('Phantom Auth Integration', () => {
  let authService: PhantomAuthService;
  let connectService: PhantomConnectService;
  const originalDev = (global as any).__DEV__;

  beforeEach(() => {
    (global as any).__DEV__ = true;

    // Reset singletons
    (PhantomAuthService as any).instance = undefined;
    PhantomConnectService.resetInstance();

    authService = PhantomAuthService.getInstance();
    connectService = PhantomConnectService.getInstance();

    jest.clearAllMocks();

    // Default: user doesn't exist
    mockGetDoc.mockResolvedValue({ exists: () => false });
  });

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
  });

  describe('Full Google Auth Flow', () => {
    it('should complete Google auth flow for new user', async () => {
      // 1. Initialize services
      await authService.initialize();
      expect(authService.isAuthenticated()).toBe(false);

      // 2. Simulate SDK returning connected user
      const sdkUser = {
        walletId: 'phantom-wallet-123',
        authUserId: 'phantom-auth-456',
        authProvider: 'google',
        addresses: [
          { address: 'SolanaWalletAddress789', type: 'solana' }
        ],
        email: 'newuser@google.com',
        name: 'New Google User',
        avatar: 'https://avatar.example.com/user.jpg'
      };

      // 3. Process the authenticated user
      const result = await authService.processAuthenticatedUser(sdkUser, 'google');

      // 4. Verify success
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('newuser@google.com');
      expect(result.user?.name).toBe('New Google User');
      expect(result.user?.phantomWalletAddress).toBe('SolanaWalletAddress789');
      expect(result.user?.socialProvider).toBe('google');

      // 5. Verify authentication state
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.getCurrentUser()?.id).toBe('phantom-auth-456');

      // 6. Verify wallet info returned
      expect(result.wallet?.address).toBe('SolanaWalletAddress789');
      expect(result.wallet?.publicKey).toBe('SolanaWalletAddress789');
    });

    it('should handle existing Google user login', async () => {
      // Simulate existing user in database
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'phantom-auth-456',
          name: 'Existing User',
          email: 'existing@google.com',
          socialProvider: 'google',
          phantomWalletAddress: 'ExistingWallet',
          createdAt: Date.now() - 86400000, // 1 day ago
          lastLoginAt: Date.now() - 3600000 // 1 hour ago
        })
      });

      const sdkUser = {
        walletId: 'phantom-wallet-123',
        authUserId: 'phantom-auth-456',
        authProvider: 'google',
        addresses: [{ address: 'ExistingWallet', type: 'solana' }],
        email: 'existing@google.com',
        name: 'Existing User'
      };

      const result = await authService.processAuthenticatedUser(sdkUser, 'google');

      expect(result.success).toBe(true);
      expect(result.user?.name).toBe('Existing User');

      // Verify lastLoginAt was updated (updateDoc called)
      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe('Full Apple Auth Flow', () => {
    it('should complete Apple auth flow without email', async () => {
      const sdkUser = {
        walletId: 'phantom-wallet-apple',
        authUserId: 'apple-user-123',
        authProvider: 'apple',
        addresses: [
          { address: 'AppleWalletAddress', type: 'solana' }
        ],
        // Apple hides email
        name: 'Apple User'
      };

      const result = await authService.processAuthenticatedUser(sdkUser, 'apple');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      // Should generate placeholder email for Apple
      expect(result.user?.email).toContain('@apple.phantom.app');
      expect(result.user?.socialProvider).toBe('apple');
    });

    it('should use Apple email when provided', async () => {
      const sdkUser = {
        walletId: 'phantom-wallet-apple',
        authUserId: 'apple-user-456',
        authProvider: 'apple',
        addresses: [{ address: 'AppleWallet2', type: 'solana' }],
        email: 'realuser@icloud.com',
        name: 'Real Apple User'
      };

      const result = await authService.processAuthenticatedUser(sdkUser, 'apple');

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('realuser@icloud.com');
    });
  });

  describe('PhantomConnectService Integration', () => {
    it('should configure connect service on auth service init', async () => {
      await authService.initialize();

      const config = connectService.getConfig();
      expect(config.enableSocialLogin).toBe(true);
      expect(config.enableEmbeddedWallets).toBe(true);
      expect(config.spendingLimits?.maxAmount).toBe(1000);
    });

    it('should process SDK connection result through connect service', () => {
      const sdkResult = {
        walletId: 'wallet-123',
        authUserId: 'auth-456',
        addresses: [
          { address: 'ProcessedAddress', type: 'solana' }
        ],
        userInfo: {
          name: 'SDK User',
          email: 'sdk@example.com'
        }
      };

      const result = connectService.processConnectionResult(sdkResult);

      expect(result.success).toBe(true);
      expect(result.address).toBe('ProcessedAddress');
      expect(result.userInfo?.name).toBe('SDK User');
    });

    it('should validate spending limits', () => {
      connectService.configure({
        spendingLimits: {
          maxAmount: 100,
          allowedTokens: ['USDC-MINT']
        }
      });

      // Within limits
      expect(connectService.validateSpending(50, 'USDC-MINT').valid).toBe(true);

      // Exceeds amount
      expect(connectService.validateSpending(150, 'USDC-MINT').valid).toBe(false);

      // Wrong token
      expect(connectService.validateSpending(50, 'OTHER-TOKEN').valid).toBe(false);
    });
  });

  describe('User Migration Flow', () => {
    it('should migrate existing Firebase user to Phantom', async () => {
      // Mock existing Firebase user data
      const { firebaseDataService } = require('../../data/firebaseDataService');
      firebaseDataService.user.getCurrentUser.mockResolvedValue({
        id: 'firebase-user-123',
        name: 'Firebase User',
        email: 'firebase@example.com',
        avatar: 'https://avatar.example.com'
      });
      firebaseDataService.wallet.getWalletInfo.mockResolvedValue({
        address: 'FirebaseWalletAddress'
      });

      const result = await authService.migrateFirebaseUserToPhantom('firebase-user-123');

      expect(result).toBe(true);
      // Verify Phantom user was stored
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should fail migration without wallet', async () => {
      const { firebaseDataService } = require('../../data/firebaseDataService');
      firebaseDataService.user.getCurrentUser.mockResolvedValue({
        id: 'firebase-user-123',
        name: 'User Without Wallet'
      });
      firebaseDataService.wallet.getWalletInfo.mockResolvedValue(null);

      const result = await authService.migrateFirebaseUserToPhantom('firebase-user-123');

      expect(result).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    it('should handle Firebase function errors gracefully', async () => {
      // Mock Firebase function to fail
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockReturnValue(
        jest.fn().mockRejectedValue(new Error('Firebase function error'))
      );

      const sdkUser = {
        walletId: 'wallet-123',
        authUserId: 'auth-456',
        addresses: [{ address: 'TestWallet', type: 'solana' }],
        email: 'test@example.com'
      };

      const result = await authService.processAuthenticatedUser(sdkUser, 'google');

      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors during auth', async () => {
      mockSetDoc.mockRejectedValue(new Error('Network error'));

      const sdkUser = {
        walletId: 'wallet-123',
        authUserId: 'auth-456',
        addresses: [{ address: 'TestWallet', type: 'solana' }],
        email: 'test@example.com'
      };

      const result = await authService.processAuthenticatedUser(sdkUser, 'google');

      expect(result.success).toBe(false);
    });
  });

  describe('Sign Out Flow', () => {
    it('should clear all auth state on sign out', async () => {
      // First authenticate
      const sdkUser = {
        walletId: 'wallet-123',
        authUserId: 'auth-456',
        addresses: [{ address: 'TestWallet', type: 'solana' }],
        email: 'test@example.com'
      };

      await authService.processAuthenticatedUser(sdkUser, 'google');
      expect(authService.isAuthenticated()).toBe(true);

      // Then sign out
      await authService.signOut();

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
      expect(connectService.getIsConnected()).toBe(false);
    });
  });

  describe('Concurrent Authentication', () => {
    it('should handle concurrent auth attempts', async () => {
      const sdkUser1 = {
        walletId: 'wallet-1',
        authUserId: 'auth-1',
        addresses: [{ address: 'Wallet1', type: 'solana' }],
        email: 'user1@example.com'
      };

      const sdkUser2 = {
        walletId: 'wallet-2',
        authUserId: 'auth-2',
        addresses: [{ address: 'Wallet2', type: 'solana' }],
        email: 'user2@example.com'
      };

      // Start both auth attempts concurrently
      const [result1, result2] = await Promise.all([
        authService.processAuthenticatedUser(sdkUser1, 'google'),
        authService.processAuthenticatedUser(sdkUser2, 'google')
      ]);

      // Both should succeed
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // The last one to complete will be the current user
      expect(authService.isAuthenticated()).toBe(true);
    });
  });
});
