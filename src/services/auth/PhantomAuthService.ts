/**
 * Phantom Authentication Service
 *
 * Uses official Phantom React SDK for app-level authentication
 * Integrates with existing Firebase user management while providing Phantom wallet access
 * This service should be called from React components that have access to Phantom SDK hooks
 */

import { logger } from '../analytics/loggingService';
import { firebaseDataService } from '../data/firebaseDataService';
import { PhantomConnectService } from '../blockchain/wallet/phantomConnectService';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken, getAuth } from 'firebase/auth';
import { app as firebaseApp, auth as firebaseAuth } from '../../config/firebase/firebase';

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
  private disconnectCallback: (() => Promise<void>) | null = null; // Callback to disconnect from Phantom SDK
  private isLoggedOut: boolean = false; // Flag to prevent auto-connect after logout

  public static getInstance(): PhantomAuthService {
    if (!PhantomAuthService.instance) {
      PhantomAuthService.instance = new PhantomAuthService();
    }
    return PhantomAuthService.instance;
  }

  /**
   * Check if user has logged out (prevents auto-connect after logout)
   */
  public getIsLoggedOut(): boolean {
    return this.isLoggedOut;
  }

  /**
   * Set logout flag immediately (called before async operations during logout)
   * This prevents race conditions where auto-connect might trigger before signOut completes
   */
  public setLogoutFlag(): void {
    this.isLoggedOut = true;
    logger.info('Phantom logout flag set immediately', null, 'PhantomAuthService');
  }

  /**
   * Reset logout flag (called when user explicitly authenticates)
   */
  public resetLogoutFlag(): void {
    this.isLoggedOut = false;
    logger.debug('Phantom logout flag reset', null, 'PhantomAuthService');
  }

  /**
   * Register a disconnect callback from React components that have access to Phantom SDK hooks
   * This allows the service to disconnect from Phantom SDK when logging out
   */
  public registerDisconnectCallback(callback: () => Promise<void>): void {
    this.disconnectCallback = callback;
    logger.debug('Phantom disconnect callback registered', null, 'PhantomAuthService');
  }

  /**
   * Unregister the disconnect callback
   */
  public unregisterDisconnectCallback(): void {
    this.disconnectCallback = null;
    logger.debug('Phantom disconnect callback unregistered', null, 'PhantomAuthService');
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
    // TODO: Implement persistent session restoration using AsyncStorage
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
      // Note: This may fail due to permissions if user isn't authenticated yet
      // That's okay - we'll proceed to create a new user
      let existingUser: PhantomUser | null = null;
      try {
        existingUser = await this.getPhantomUserByAuthId(authUserId);
      } catch (error: any) {
        // If permission error, user likely doesn't exist yet or we're not authenticated
        // This is expected for new users - proceed to create
        if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
          logger.debug('Cannot check for existing Phantom user (not authenticated yet) - proceeding to create new user', {
            authUserId
          }, 'PhantomAuthService');
        } else {
          // Log other errors but don't block
          logger.warn('Failed to check for existing Phantom user, proceeding anyway', {
            authUserId,
            error: error instanceof Error ? error.message : String(error)
          }, 'PhantomAuthService');
        }
      }

      // Extract user information that we'll need for both existing and new users
      // Phantom SDK may provide email in different locations, check all possibilities
      const userEmail = phantomUser.email || 
                        phantomUser.userInfo?.email || 
                        (phantomUser as any).user?.email ||
                        (phantomUser as any).profile?.email ||
                        (phantomUser as any).emailAddress;
      
      // Extract username/display name - check multiple possible locations
      // Phantom Portal may provide username in different fields
      const userName = phantomUser.name || 
                       phantomUser.label || 
                       phantomUser.displayName ||
                       phantomUser.username ||
                       phantomUser.userInfo?.name ||
                       phantomUser.userInfo?.displayName ||
                       phantomUser.userInfo?.username ||
                       (phantomUser as any).user?.name ||
                       (phantomUser as any).user?.displayName ||
                       (phantomUser as any).user?.username ||
                       (phantomUser as any).profile?.name ||
                       (phantomUser as any).profile?.displayName ||
                       (phantomUser as any).profile?.username ||
                       (phantomUser as any).profileData?.name ||
                       (phantomUser as any).profileData?.displayName ||
                       (phantomUser as any).profileData?.username;
      
      const userAvatar = phantomUser.avatar || 
                         phantomUser.icon || 
                         phantomUser.photoURL ||
                         phantomUser.userInfo?.avatar ||
                         phantomUser.userInfo?.photoURL ||
                         (phantomUser as any).user?.avatar ||
                         (phantomUser as any).user?.photoURL ||
                         (phantomUser as any).profile?.avatar ||
                         (phantomUser as any).profile?.photoURL ||
                         (phantomUser as any).profileData?.avatar ||
                         (phantomUser as any).profileData?.photoURL;
      
      // Log extracted user info for debugging
      logger.info('Extracted Phantom user information', {
        hasEmail: !!userEmail,
        hasName: !!userName,
        hasAvatar: !!userAvatar,
        emailSource: userEmail ? (phantomUser.email ? 'email' : 
                                 phantomUser.userInfo?.email ? 'userInfo.email' :
                                 (phantomUser as any).user?.email ? 'user.email' :
                                 (phantomUser as any).profile?.email ? 'profile.email' : 'other') : 'none',
        nameSource: userName ? (phantomUser.name ? 'name' :
                               phantomUser.displayName ? 'displayName' :
                               phantomUser.username ? 'username' :
                               phantomUser.userInfo?.name ? 'userInfo.name' :
                               (phantomUser as any).user?.name ? 'user.name' :
                               (phantomUser as any).profile?.name ? 'profile.name' : 'other') : 'none',
        phantomUserKeys: Object.keys(phantomUser)
      }, 'PhantomAuthService');

      if (existingUser) {
        // Update existing user with latest data
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

        // For existing users, ensure Firebase Auth user exists for both Google and Apple
        if ((provider === 'google' || provider === 'apple') && userEmail && !existingUser.firebaseUserId) {
          await this.ensureFirebaseAuthUserForPhantom(existingUser, userEmail);
        }

        // Ensure wallet exists for existing user (in service layer)
        const walletInfo = await this.ensureWalletForPhantomUser(existingUser);

        // Reset logout flag when user successfully authenticates
        this.isLoggedOut = false;

        return {
          success: true,
          user: existingUser,
          wallet: walletInfo ? { 
            address: walletInfo.walletAddress, 
            publicKey: walletInfo.walletPublicKey 
          } : { 
            address: walletAddress, 
            publicKey: walletAddress 
          }
        };
      } else {
        // Create new Phantom user
        // Handle email gracefully - Phantom SDK may not provide email immediately
        let finalEmail: string;
        let finalName: string;

        if (provider === 'google') {
          // For Google auth, try to get email from Phantom SDK
          // If not available, use placeholder that can be updated later from Firebase Auth token
          if (!userEmail) {
            logger.warn('Google authentication: email not provided by Phantom SDK, using placeholder', { 
              phantomUser,
              authUserId,
              note: 'Email will be updated from Firebase Auth token if available'
            }, 'PhantomAuthService');
            
            // Use placeholder email that can be updated later
            // Format allows identification as placeholder
            finalEmail = `${authUserId}@google.phantom.app`;
            finalName = userName || 'Google User';
            
            logger.info('Using placeholder email for Google auth - will attempt to update from Firebase Auth', {
              placeholderEmail: finalEmail,
              authUserId
            }, 'PhantomAuthService');
          } else {
            finalEmail = userEmail;
            finalName = userName || userEmail.split('@')[0]; // Use email username as fallback
          }
        } else {
          // For Apple or other providers, use available data or create meaningful placeholder
          finalEmail = userEmail || `${authUserId}@${provider}.phantom.app`;
          finalName = userName || `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`;
        }

        // Create new Phantom user
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

        // For both Google and Apple providers, create Firebase Auth user and Firestore user record
        // Note: finalEmail may be a placeholder if Phantom SDK didn't provide email
        // This is acceptable - email can be updated later from Firebase Auth token
        if ((provider === 'google' || provider === 'apple') && finalEmail) {
          const isPlaceholderEmail = finalEmail.includes('@google.phantom.app') || finalEmail.includes('@apple.phantom.app');
          
          logger.info('Creating Firebase Auth user for Phantom auth', {
            phantomUserId: newUser.id,
            email: isPlaceholderEmail ? finalEmail + ' (placeholder)' : finalEmail.substring(0, 5) + '...',
            isPlaceholder: isPlaceholderEmail,
            provider
          }, 'PhantomAuthService');

          const firebaseResult = await this.createFirebaseAuthUserForPhantom(newUser, finalEmail);
          if (!firebaseResult.success) {
            logger.error('Failed to create Firebase Auth user for Phantom auth', {
              error: firebaseResult.error,
              phantomUserId: newUser.id,
              email: finalEmail,
              provider
            }, 'PhantomAuthService');
            return {
              success: false,
              error: firebaseResult.error || 'Failed to create Firebase user account'
            };
          }

          // Update Phantom user with Firebase user ID
          newUser.firebaseUserId = firebaseResult.firebaseUserId;
          logger.info('Successfully linked Phantom user to Firebase Auth user', {
            phantomUserId: newUser.id,
            firebaseUserId: firebaseResult.firebaseUserId,
            email: isPlaceholderEmail ? finalEmail + ' (placeholder)' : finalEmail.substring(0, 5) + '...',
            isPlaceholder: isPlaceholderEmail,
            provider
          }, 'PhantomAuthService');
          
          // If using placeholder email, log note that it can be updated later
          if (isPlaceholderEmail) {
            logger.info('Phantom user created with placeholder email - can be updated from Firebase Auth token later', {
              phantomUserId: newUser.id,
              firebaseUserId: firebaseResult.firebaseUserId
            }, 'PhantomAuthService');
          }
        }

        await this.createPhantomUser(newUser);
        this.currentUser = newUser;
        logger.info('New Phantom user created', { userId: newUser.id, hasFirebaseLink: !!newUser.firebaseUserId }, 'PhantomAuthService');

        // Ensure wallet exists for new user (in service layer)
        const walletInfo = await this.ensureWalletForPhantomUser(newUser);

        // Reset logout flag when user successfully authenticates
        this.isLoggedOut = false;

        return {
          success: true,
          user: newUser,
          wallet: walletInfo ? { 
            address: walletInfo.walletAddress, 
            publicKey: walletInfo.walletPublicKey 
          } : { 
            address: walletAddress, 
            publicKey: walletAddress 
          }
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
   * Create Firebase Auth user for Phantom authentication (Google or Apple)
   */
  public async createFirebaseAuthUserForPhantom(phantomUser: PhantomUser, email: string): Promise<{ success: boolean; firebaseUserId?: string; error?: string }> {
    try {
      // Get the Firebase app - use imported app or try getApp()
      let app = firebaseApp;
      if (!app) {
        try {
          app = getApp();
        } catch (error) {
          logger.error('Firebase app not initialized - cannot create Firebase Auth user', {
            phantomUserId: phantomUser.id,
            email: email.substring(0, 5) + '...',
            error: error instanceof Error ? error.message : 'getApp() failed'
          }, 'PhantomAuthService');
          return {
            success: false,
            error: 'Firebase app is not initialized. Please ensure Firebase is properly configured.'
          };
        }
      }
      
      const functions = getFunctions(app, 'us-central1');

      const getCustomToken = httpsCallable(functions, 'getCustomTokenForUser');
      const result = await getCustomToken({ email, userId: phantomUser.id });

      if (result.data && typeof result.data === 'object' && 'token' in result.data && 'userId' in result.data) {
        const { token, userId: firebaseUserId } = result.data as { token: string; userId: string };

        // Sign in with the custom token - use imported auth or getAuth()
        const { getAuth } = await import('firebase/auth');
        const authInstance = firebaseAuth || getAuth(app);
        await signInWithCustomToken(authInstance, token);

        logger.info('Successfully created and signed in Firebase Auth user for Phantom', {
          phantomUserId: phantomUser.id,
          firebaseUserId,
          email: email.substring(0, 5) + '...'
        }, 'PhantomAuthService');

        // Wait for auth state to settle before creating Firestore record
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Now create the Firestore user record using AuthService logic
        // Pass the auth instance we just used to sign in
        await this.createFirestoreUserRecord(firebaseUserId, phantomUser, authInstance);

        return { success: true, firebaseUserId };
      } else {
        logger.error('Invalid response from getCustomTokenForUser', { result: result.data }, 'PhantomAuthService');
        return { success: false, error: 'Invalid response from authentication service' };
      }
    } catch (error) {
      logger.error('Failed to create Firebase Auth user for Phantom', error, 'PhantomAuthService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Firebase user account'
      };
    }
  }

  /**
   * Ensure Firebase Auth user exists for existing Phantom user
   */
  public async ensureFirebaseAuthUserForPhantom(phantomUser: PhantomUser, email: string): Promise<{ success: boolean; firebaseUserId?: string; error?: string }> {
    try {
      if (!email) {
        logger.warn('Cannot ensure Firebase Auth user - no email provided', { phantomUserId: phantomUser.id }, 'PhantomAuthService');
        return { success: false, error: 'Email is required' };
      }

      const result = await this.createFirebaseAuthUserForPhantom(phantomUser, email);
      if (result.success && result.firebaseUserId) {
        phantomUser.firebaseUserId = result.firebaseUserId;
        await this.updatePhantomUser(phantomUser);
        return { success: true, firebaseUserId: result.firebaseUserId };
      }
      return result;
    } catch (error) {
      logger.error('Failed to ensure Firebase Auth user for existing Phantom user', error, 'PhantomAuthService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ensure Firebase Auth user'
      };
    }
  }

  /**
   * Ensure wallet exists for Phantom user (in service layer)
   */
  private async ensureWalletForPhantomUser(phantomUser: PhantomUser): Promise<{ walletAddress: string; walletPublicKey: string } | null> {
    try {
      const { authService } = await import('./AuthService');
      
      // Use Firebase UID if available, otherwise use Phantom ID
      const userId = phantomUser.firebaseUserId || phantomUser.id;
      const walletResult = await authService.ensureUserWallet(userId);
      
      if (walletResult) {
        logger.info('Wallet ensured for Phantom user', {
          phantomUserId: phantomUser.id,
          firebaseUserId: phantomUser.firebaseUserId,
          walletAddress: walletResult.walletAddress
        }, 'PhantomAuthService');
        return {
          walletAddress: walletResult.walletAddress,
          walletPublicKey: walletResult.walletPublicKey
        };
      }
      
      logger.warn('Failed to ensure wallet for Phantom user', { userId }, 'PhantomAuthService');
      return null;
    } catch (error) {
      logger.error('Failed to ensure wallet for Phantom user', error, 'PhantomAuthService');
      return null;
    }
  }

  /**
   * Create Firestore user record using AuthService logic
   */
  private async createFirestoreUserRecord(firebaseUserId: string, phantomUser: PhantomUser, authInstance?: any): Promise<void> {
    try {
      // Use provided auth instance, or try to get it
      let auth = authInstance;
      
      if (!auth) {
        const { getAuth } = await import('firebase/auth');
        auth = firebaseAuth || (firebaseApp ? getAuth(firebaseApp) : null);
      }
      
      if (!auth) {
        logger.error('Firebase Auth instance not available for creating Firestore user record', {
          firebaseUserId,
          hasFirebaseApp: !!firebaseApp,
          hasFirebaseAuth: !!firebaseAuth,
          hasProvidedAuth: !!authInstance
        }, 'PhantomAuthService');
        throw new Error('Firebase Auth instance not available');
      }
      
      // Wait a bit for auth state to settle after signInWithCustomToken
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let currentUser = auth.currentUser;

      if (!currentUser || currentUser.uid !== firebaseUserId) {
        // Try one more time after a longer wait
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentUser = auth.currentUser;
        
        if (!currentUser || currentUser.uid !== firebaseUserId) {
          logger.error('Firebase Auth user not properly signed in after custom token sign-in', {
            firebaseUserId,
            currentUserId: currentUser?.uid,
            hasCurrentUser: !!currentUser
          }, 'PhantomAuthService');
          throw new Error('Firebase Auth user not properly signed in after custom token sign-in');
        }
      }

      // Use AuthService's createOrUpdateUserData logic
      const { UserMigrationService } = await import('../core/UserMigrationService');
      const { firebaseDataService } = await import('../data/firebaseDataService');

      // Create the user data object
      const userData = {
        id: firebaseUserId,
        name: phantomUser.name,
        email: phantomUser.email,
        avatar: phantomUser.avatar,
        wallet_address: phantomUser.phantomWalletAddress,
        wallet_public_key: phantomUser.phantomWalletAddress,
        created_at: new Date(phantomUser.createdAt).toISOString(),
        emailVerified: true, // Since user authenticated via Google through Phantom
        lastLoginAt: new Date(phantomUser.lastLoginAt).toISOString(),
        hasCompletedOnboarding: true
      };

      // Use UserMigrationService to ensure consistency
      const consistentUser = await UserMigrationService.ensureUserConsistency(currentUser);

      // Update with Phantom-specific data
      // CRITICAL: Set wallet_type to 'external' so ensureUserWallet knows not to create a new wallet
      await firebaseDataService.user.updateUser(consistentUser.id, {
        ...userData,
        name: phantomUser.name,
        email: phantomUser.email,
        avatar: phantomUser.avatar,
        wallet_address: phantomUser.phantomWalletAddress,
        wallet_public_key: phantomUser.phantomWalletAddress,
        wallet_type: 'external', // Mark as external wallet (Phantom) - prevents app-generated wallet creation
        wallet_status: 'healthy',
        emailVerified: true,
        hasCompletedOnboarding: true
      });

      logger.info('Created Firestore user record for Phantom auth', {
        firebaseUserId,
        phantomUserId: phantomUser.id,
        email: phantomUser.email.substring(0, 5) + '...'
      }, 'PhantomAuthService');

    } catch (error) {
      logger.error('Failed to create Firestore user record', error, 'PhantomAuthService');
      throw error;
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
   * Store Phantom user in database
   */
  private async storePhantomUser(user: PhantomUser): Promise<void> {
    try {
      const { db } = await import('../../config/firebase/firebase');
      const { doc, setDoc } = await import('firebase/firestore');

      if (!db) {
        throw new Error('Firestore not initialized');
      }

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

      if (!db) {
        logger.warn('Firestore not initialized, skipping Phantom user lookup', { authUserId }, 'PhantomAuthService');
        return null;
      }

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
      redirect_uri: 'wesplit://phantom-callback',
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
      // ✅ CRITICAL: Set logout flag FIRST to prevent any auto-connect during logout
      // This must happen before any async operations to prevent race conditions
      this.isLoggedOut = true;
      logger.info('Logout flag set - blocking auto-connect', null, 'PhantomAuthService');
      
      // First, disconnect from Phantom SDK if callback is registered
      if (this.disconnectCallback) {
        try {
          logger.info('Disconnecting from Phantom SDK via registered callback', null, 'PhantomAuthService');
          await this.disconnectCallback();
          logger.info('Successfully disconnected from Phantom SDK', null, 'PhantomAuthService');
        } catch (disconnectError) {
          logger.warn('Failed to disconnect from Phantom SDK via callback (non-critical)', {
            error: disconnectError instanceof Error ? disconnectError.message : String(disconnectError)
          }, 'PhantomAuthService');
          // Continue with logout even if SDK disconnect fails
        }
      } else {
        logger.debug('No Phantom SDK disconnect callback registered, skipping SDK disconnect', null, 'PhantomAuthService');
      }

      // Clear Phantom Connect Service state
      const phantomConnect = PhantomConnectService.getInstance();
      await phantomConnect.disconnect();
      
      // Clear local session
      this.currentUser = null;
      
      // Ensure logout flag is still set (in case it was reset somehow)
      this.isLoggedOut = true;

      logger.info('Phantom user signed out successfully', null, 'PhantomAuthService');

    } catch (error) {
      logger.error('Failed to sign out from Phantom', error, 'PhantomAuthService');
      // Still clear local state even if disconnect fails
      this.currentUser = null;
      this.isLoggedOut = true; // Set flag even on error
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
   * TODO: Implement persistent session restoration using AsyncStorage
   * - Store session tokens/user data when authenticating
   * - Load and validate on app start
   * - Auto-refresh if needed
   */
  private async restoreSession(): Promise<void> {
    try {
      // TODO: Implement session restoration with AsyncStorage
      // For now, users will need to re-authenticate
      logger.debug('Session restoration not yet implemented - user will need to re-authenticate', null, 'PhantomAuthService');

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
