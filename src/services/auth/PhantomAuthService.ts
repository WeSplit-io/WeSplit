/**
 * Phantom Authentication Service
 *
 * Uses official Phantom React SDK for app-level authentication
 * Integrates with existing Firebase user management while providing Phantom wallet access
 * This service should be called from React components that have access to Phantom SDK hooks
 */

import { logger } from '../analytics/loggingService';
import { firebaseDataService } from '../data/firebaseDataService';
import { PHANTOM_CONFIG } from '../../config/env';

export interface PhantomAuthResult {
  success: boolean;
  user?: PhantomUser;
  wallet?: {
    address: string;
    publicKey: string;
  };
  error?: string;
  requiresSocialAuth?: boolean;
  authUrl?: string;
}

export interface PhantomUser {
  id: string; // Phantom user ID
  name: string;
  email: string;
  avatar?: string;
  socialProvider: 'google' | 'apple';
  phantomWalletAddress: string;
  createdAt: number;
  lastLoginAt: number;
  // Link to existing Firebase user if they migrate
  firebaseUserId?: string;
}

class PhantomAuthService {
  private static instance: PhantomAuthService;
  private currentUser: PhantomUser | null = null;

  public static getInstance(): PhantomAuthService {
    if (!PhantomAuthService.instance) {
      PhantomAuthService.instance = new PhantomAuthService();
    }
    return PhantomAuthService.instance;
  }

  /**
   * Initialize Phantom Auth for the app
   */
  public async initialize(): Promise<void> {
    const phantomConnect = PhantomConnectService.getInstance();

    // Configure for app authentication (not just splits)
    phantomConnect.configure({
      enableSocialLogin: true,
      enableEmbeddedWallets: true,
      spendingLimits: {
        maxAmount: 1000, // Higher limits for app-wide auth
        maxDaily: 5000,
        allowedTokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']
      }
    });

    logger.info('Phantom Auth Service initialized', null, 'PhantomAuthService');

    // Try to restore existing session
    await this.restoreSession();
  }

  /**
   * Sign in with Phantom social login
   */
  /**
   * Process user after successful Phantom SDK authentication
   * This should be called from a React component that has access to usePhantom hook
   */
  public async processAuthenticatedUser(
    phantomUser: any,
    provider: 'google' | 'apple'
  ): Promise<PhantomAuthResult> {
    try {
      logger.info('Processing authenticated Phantom user', {
        userKeys: phantomUser ? Object.keys(phantomUser) : 'undefined',
        phantomUser,
        provider
      }, 'PhantomAuthService');

      // Defensive checks for undefined/null values
      if (!phantomUser) {
        return {
          success: false,
          error: 'No Phantom user data provided'
        };
      }

      // Extract data safely - handle ConnectResult from Phantom SDK
      const walletId = phantomUser.walletId || phantomUser.wallet_id;
      const authUserId = phantomUser.authUserId || phantomUser.authUser_id || walletId;

      logger.info('Phantom user data received', {
        keys: Object.keys(phantomUser),
        phantomUser: JSON.stringify(phantomUser, null, 2)
      }, 'PhantomAuthService');

      if (!walletId) {
        logger.error('No walletId found in Phantom user data', { phantomUser }, 'PhantomAuthService');
        return {
          success: false,
          error: 'No wallet ID found in authentication data'
        };
      }

      // Extract real wallet address from Phantom user data
      let walletAddress: string;

      if (phantomUser.addresses && phantomUser.addresses.length > 0) {
        // Use the first Solana address from the addresses array
        const solanaAddress = phantomUser.addresses.find((addr: any) =>
          addr.type === 'solana' || addr.blockchain === 'solana'
        );
        walletAddress = solanaAddress?.address || phantomUser.addresses[0]?.address;

        if (!walletAddress) {
          logger.error('No valid Solana address found in Phantom user addresses', { addresses: phantomUser.addresses }, 'PhantomAuthService');
          return {
            success: false,
            error: 'No valid wallet address found in authentication data'
          };
        }
      } else {
        // Fallback: generate deterministic address for development (should not happen in production)
        logger.warn('No addresses provided by Phantom SDK, using fallback generation', { walletId }, 'PhantomAuthService');
        walletAddress = this.generateWalletAddressFromId(walletId);
      }

      logger.info('Extracted Phantom user data', {
        walletId,
        authUserId,
        walletAddress,
        provider
      }, 'PhantomAuthService');

      // Check if user already exists
      let existingUser = await this.getPhantomUserByAuthId(authUserId);

      if (existingUser) {
        // Update existing user with latest data
        const userEmail = phantomUser.email || phantomUser.userInfo?.email;
        const userName = phantomUser.name || phantomUser.label || phantomUser.userInfo?.name;
        const userAvatar = phantomUser.avatar || phantomUser.icon || phantomUser.userInfo?.avatar;

        // Update with real data if available
        if (userEmail && userEmail !== existingUser.email) {
          existingUser.email = userEmail;
        }
        if (userName && userName !== existingUser.name) {
          existingUser.name = userName;
        }
        if (userAvatar && userAvatar !== existingUser.avatar) {
          existingUser.avatar = userAvatar;
        }

        existingUser.lastLoginAt = Date.now();
        existingUser.phantomWalletAddress = walletAddress; // Update if changed
        await this.updatePhantomUser(existingUser);
        this.currentUser = existingUser;
        logger.info('Existing Phantom user updated', { userId: existingUser.id }, 'PhantomAuthService');
        return {
          success: true,
          user: existingUser,
          wallet: { address: walletAddress, publicKey: walletAddress }
        };
      } else {
        // Extract real user information from Phantom SDK
        // Note: Currently Phantom SDK may not provide detailed Google/Apple account info
        // This needs to be enhanced to properly fetch user profile data
        const userEmail = phantomUser.email || phantomUser.userInfo?.email;
        const userName = phantomUser.name || phantomUser.label || phantomUser.userInfo?.name;
        const userAvatar = phantomUser.avatar || phantomUser.icon || phantomUser.userInfo?.avatar;

        // TODO: Implement proper OAuth flow to get real Google/Apple account data
        // For now, use available data or create meaningful placeholder
        const finalEmail = userEmail || `${authUserId}@${provider}.phantom.app`;
        const finalName = userName || `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`;

        // Create new user with real data
        const newUser: PhantomUser = {
          id: authUserId,
          name: finalName,
          email: finalEmail,
          avatar: userAvatar || '',
          socialProvider: provider,
          phantomWalletAddress: walletAddress,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        };

        await this.createPhantomUser(newUser);
        this.currentUser = newUser;
        logger.info('New Phantom user created', { userId: newUser.id }, 'PhantomAuthService');
        return {
          success: true,
          user: newUser,
          wallet: { address: walletAddress, publicKey: walletAddress }
        };
      }

    } catch (error) {
      logger.error('Phantom authentication failed', error, 'PhantomAuthService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Handle social authentication callback
   */
  public async handleSocialAuthCallback(
    authCode: string,
    state: string
  ): Promise<PhantomAuthResult> {
    try {
      const stateData = JSON.parse(atob(state));
      const { provider } = stateData;

      const phantomConnect = PhantomConnectService.getInstance();
      const connectResult = await phantomConnect.connect({
        authCode,
        preferredMethod: 'social',
        socialProvider: provider
      });

      if (!connectResult.success) {
        return {
          success: false,
          error: connectResult.error || 'Social authentication callback failed'
        };
      }

      const user = await this.createOrUpdatePhantomUser(
        connectResult.address!,
        provider,
        connectResult
      );

      this.currentUser = user;

      return {
        success: true,
        user,
        wallet: {
          address: connectResult.address!,
          publicKey: connectResult.publicKey!
        }
      };

    } catch (error) {
      logger.error('Social auth callback failed', error, 'PhantomAuthService');
      return {
        success: false,
        error: 'Authentication callback failed'
      };
    }
  }

  /**
   * Create or update Phantom user profile
   */
  private async createOrUpdatePhantomUser(
    walletAddress: string,
    provider: 'google' | 'apple',
    connectResult: any
  ): Promise<PhantomUser> {
    try {
      // Check if user already exists
      let existingUser = await this.getPhantomUserByWallet(walletAddress);

      if (existingUser) {
        // Update last login
        existingUser.lastLoginAt = Date.now();
        await this.updatePhantomUser(existingUser);
        return existingUser;
      }

      // Create new user
      const newUser: PhantomUser = {
        id: walletAddress, // Use wallet address as primary ID
        name: `Phantom User ${walletAddress.slice(0, 8)}`, // Default name
        email: `${walletAddress.slice(0, 8)}@phantom.app`, // Placeholder email
        socialProvider: provider,
        phantomWalletAddress: walletAddress,
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      };

      // Try to get real user info from social provider
      const enrichedUser = await this.enrichUserWithSocialData(newUser, connectResult);
      await this.storePhantomUser(enrichedUser);

      // Check if this wallet is linked to an existing Firebase user
      await this.linkToExistingFirebaseUser(enrichedUser);

      return enrichedUser;

    } catch (error) {
      logger.error('Failed to create/update Phantom user', error, 'PhantomAuthService');
      throw error;
    }
  }

  /**
   * Enrich user data with social provider information
   */
  private async enrichUserWithSocialData(
    user: PhantomUser,
    connectResult: any
  ): Promise<PhantomUser> {
    try {
      // Phantom Connect provides basic user info
      // In a full implementation, you'd get more details from the social provider
      if (connectResult.userInfo) {
        return {
          ...user,
          name: connectResult.userInfo.name || user.name,
          email: connectResult.userInfo.email || user.email,
          avatar: connectResult.userInfo.avatar
        };
      }

      return user;

    } catch (error) {
      logger.error('Failed to enrich user data', error, 'PhantomAuthService');
      return user;
    }
  }

  /**
   * Check if Phantom wallet is linked to existing Firebase user
   */
  private async linkToExistingFirebaseUser(phantomUser: PhantomUser): Promise<void> {
    try {
      // Look for existing Firebase users with this wallet address
      const existingUsers = await firebaseDataService.user.searchUsersByWallet(phantomUser.phantomWalletAddress);

      if (existingUsers.length > 0) {
        const firebaseUser = existingUsers[0];
        phantomUser.firebaseUserId = firebaseUser.id;

        // Update the Phantom user record
        await this.updatePhantomUser(phantomUser);

        logger.info('Linked Phantom user to existing Firebase user', {
          phantomUserId: phantomUser.id,
          firebaseUserId: firebaseUser.id
        }, 'PhantomAuthService');
      }

    } catch (error) {
      logger.error('Failed to link to existing Firebase user', error, 'PhantomAuthService');
    }
  }

  /**
   * Check if Phantom wallet is linked to existing Firebase user
   */
  private async linkToExistingFirebaseUser(phantomUser: PhantomUser): Promise<void> {
    try {
      // Look for existing Firebase users with this wallet address
      const existingUsers = await firebaseDataService.user.searchUsersByWallet(phantomUser.phantomWalletAddress);

      if (existingUsers.length > 0) {
        const firebaseUser = existingUsers[0];
        phantomUser.firebaseUserId = firebaseUser.id;

        // Update the Phantom user record
        await this.updatePhantomUser(phantomUser);

        logger.info('Linked Phantom user to existing Firebase user', {
          phantomUserId: phantomUser.id,
          firebaseUserId: firebaseUser.id
        }, 'PhantomAuthService');
      }

    } catch (error) {
      logger.error('Failed to link to existing Firebase user', error, 'PhantomAuthService');
    }
  }

  /**
   * Store Phantom user in database
   */
  private async storePhantomUser(user: PhantomUser): Promise<void> {
    try {
      const { db } = await import('../../config/firebase/firebase');
      const { doc, setDoc } = await import('firebase/firestore');

      await setDoc(doc(db, 'phantom_users', user.id), user);

      logger.info('Phantom user stored', { userId: user.id }, 'PhantomAuthService');

    } catch (error) {
      logger.error('Failed to store Phantom user', error, 'PhantomAuthService');
      throw error;
    }
  }

  /**
   * Update existing Phantom user
   */
  private async updatePhantomUser(user: PhantomUser): Promise<void> {
    try {
      const { db } = await import('../../config/firebase/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');

      await updateDoc(doc(db, 'phantom_users', user.id), user);

    } catch (error) {
      logger.error('Failed to update Phantom user', error, 'PhantomAuthService');
      throw error;
    }
  }

  /**
   * Generate a deterministic Solana address from wallet ID
   * This is a temporary solution for testing - in production you'd fetch real addresses
   */
  private generateWalletAddressFromId(walletId: string): string {
    // Create a deterministic Solana-like address from walletId
    // This is just for testing - real implementation would fetch from Phantom SDK
    const hash = this.simpleHash(walletId);
    const baseAddress = '11111111111111111111111111111112'; // System program as base

    // Modify some characters based on hash to create variation
    const chars = baseAddress.split('');
    for (let i = 0; i < Math.min(8, hash.length); i++) {
      const charIndex = hash.charCodeAt(i) % chars.length;
      chars[charIndex] = String.fromCharCode(65 + (hash.charCodeAt(i) % 26)); // A-Z
    }

    return chars.join('');
  }

  /**
   * Simple hash function for deterministic address generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  /**
   * Get Phantom user by auth ID
   */
  private async getPhantomUserByAuthId(authUserId: string): Promise<PhantomUser | null> {
    try {
      const { db } = await import('../../config/firebase/firebase');
      const { doc, getDoc } = await import('firebase/firestore');

      const docSnap = await getDoc(doc(db, 'phantom_users', authUserId));

      if (docSnap.exists()) {
        return docSnap.data() as PhantomUser;
      }

      return null;

    } catch (error) {
      logger.error('Failed to get Phantom user by auth ID', error, 'PhantomAuthService');
      return null;
    }
  }

  /**
   * Create new Phantom user
   */
  private async createPhantomUser(user: PhantomUser): Promise<void> {
    try {
      await this.storePhantomUser(user);
      logger.info('Phantom user created', { userId: user.id }, 'PhantomAuthService');
    } catch (error) {
      logger.error('Failed to create Phantom user', error, 'PhantomAuthService');
      throw error;
    }
  }

  /**
   * Get Phantom user by wallet address
   */
  private async getPhantomUserByWallet(walletAddress: string): Promise<PhantomUser | null> {
    try {
      const { db } = await import('../../config/firebase/firebase');
      const { doc, getDoc } = await import('firebase/firestore');

      const docSnap = await getDoc(doc(db, 'phantom_users', walletAddress));

      if (docSnap.exists()) {
        return docSnap.data() as PhantomUser;
      }

      return null;

    } catch (error) {
      logger.error('Failed to get Phantom user', error, 'PhantomAuthService');
      return null;
    }
  }

  /**
   * Generate social authentication URL for app login
   */
  private generateSocialAuthUrl(provider: 'google' | 'apple'): string {
    const state = btoa(JSON.stringify({
      action: 'app_auth',
      provider,
      timestamp: Date.now()
    }));

    const baseUrl = 'https://phantom.app/ul/v1/social';

    const params = new URLSearchParams({
      provider,
      state,
      redirect_uri: 'wesplit://auth/phantom-callback',
      scope: 'wallet:create user:read',
      response_type: 'code'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Sign out from Phantom
   */
  public async signOut(): Promise<void> {
    try {
      const phantomConnect = PhantomConnectService.getInstance();
      // Note: Phantom Connect doesn't have explicit sign out
      // We'll clear local session
      this.currentUser = null;

      logger.info('Phantom user signed out', null, 'PhantomAuthService');

    } catch (error) {
      logger.error('Failed to sign out', error, 'PhantomAuthService');
    }
  }

  /**
   * Get current authenticated user
   */
  public getCurrentUser(): PhantomUser | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Restore session on app start
   */
  private async restoreSession(): Promise<void> {
    try {
      // In a full implementation, you'd check for stored session tokens
      // For now, users will need to re-authenticate
      logger.debug('Session restoration not implemented yet', null, 'PhantomAuthService');

    } catch (error) {
      logger.error('Failed to restore session', error, 'PhantomAuthService');
    }
  }

  /**
   * Migrate existing Firebase user to Phantom auth
   */
  public async migrateFirebaseUserToPhantom(firebaseUserId: string): Promise<boolean> {
    try {
      // Get Firebase user data
      const firebaseUser = await firebaseDataService.user.getCurrentUser(firebaseUserId);
      if (!firebaseUser) {
        return false;
      }

      // Check if they have a wallet
      const walletInfo = await firebaseDataService.wallet.getWalletInfo(firebaseUserId);
      if (!walletInfo) {
        return false;
      }

      // Create Phantom user record linked to Firebase
      const phantomUser: PhantomUser = {
        id: walletInfo.address, // Use existing wallet as Phantom ID
        name: firebaseUser.name || firebaseUser.email.split('@')[0],
        email: firebaseUser.email,
        avatar: firebaseUser.avatar,
        socialProvider: 'google', // Default, could be determined from Firebase
        phantomWalletAddress: walletInfo.address,
        firebaseUserId: firebaseUser.id,
        createdAt: Date.parse(firebaseUser.created_at) || Date.now(),
        lastLoginAt: Date.now()
      };

      await this.storePhantomUser(phantomUser);

      logger.info('Migrated Firebase user to Phantom auth', {
        firebaseUserId,
        phantomUserId: phantomUser.id
      }, 'PhantomAuthService');

      return true;

    } catch (error) {
      logger.error('Failed to migrate Firebase user', error, 'PhantomAuthService');
      return false;
    }
  }
}

export default PhantomAuthService;
export { PhantomAuthService };
