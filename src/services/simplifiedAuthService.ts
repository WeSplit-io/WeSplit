/**
 * Simplified Authentication Service for WeSplit
 * Clean, unified authentication flow with automatic wallet creation
 * Uses app's built-in wallet for processing send transactions
 */

import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  User,
  OAuthProvider,
  TwitterAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { logger } from './loggingService';
import Constants from 'expo-constants';
import { unifiedUserService } from './unifiedUserService';
import { userWalletService } from './userWalletService';

// Environment variable helper
const getEnvVar = (key: string): string => {
  if (process.env[key]) return process.env[key]!;
  if (process.env[`EXPO_PUBLIC_${key}`]) return process.env[`EXPO_PUBLIC_${key}`]!;
  if (Constants.expoConfig?.extra?.[key]) return Constants.expoConfig.extra[key];
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];
  if ((Constants.manifest as any)?.extra?.[key]) return (Constants.manifest as any).extra[key];
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];
  return '';
};

// Types
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  isNewUser?: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  wallet_address: string;
  wallet_public_key: string;
  avatar: string;
  created_at: string;
  emailVerified: boolean;
  lastLoginAt: string;
  hasCompletedOnboarding: boolean;
}

class SimplifiedAuthService {
  private static instance: SimplifiedAuthService;
  private googleClientId: string;

  private constructor() {
    this.googleClientId = this.getGoogleClientId();

    logger.info('SimplifiedAuthService initialized', {
      hasGoogleClientId: !!this.googleClientId,
      platform: Platform.OS
    }, 'SimplifiedAuth');
  }

  public static getInstance(): SimplifiedAuthService {
    if (!SimplifiedAuthService.instance) {
      SimplifiedAuthService.instance = new SimplifiedAuthService();
    }
    return SimplifiedAuthService.instance;
  }

  /**
   * Get Google Client ID for current platform
   */
  private getGoogleClientId(): string {
    if (__DEV__) {
      return getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
    }
    
    switch (Platform.OS) {
      case 'android':
        return getEnvVar('ANDROID_GOOGLE_CLIENT_ID') || getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
      case 'ios':
        return getEnvVar('IOS_GOOGLE_CLIENT_ID') || getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
      case 'web':
        return getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
      default:
        return getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
    }
  }

  /**
   * Get the appropriate redirect URI based on platform and environment
   */
  private getRedirectUri(): string {
    if (__DEV__) {
      return 'https://auth.expo.io/@devadmindappzy/WeSplit';
    }
    
    return 'wesplit://auth';
  }

  /**
   * Main authentication method - handles all auth types and ensures wallet creation
   */
  async authenticateUser(firebaseUser: User, authMethod: 'google' | 'apple' | 'twitter' | 'email'): Promise<AppUser> {
    try {
      logger.info('Authenticating user', { 
        uid: firebaseUser.uid, 
        email: firebaseUser.email,
        authMethod 
      }, 'SimplifiedAuth');

      // Step 1: Create or get user using unified service
      const userResult = await unifiedUserService.createOrGetUser({
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || '',
        avatar: firebaseUser.photoURL || '',
        walletAddress: '', // Will be created by ensureUserWallet
        walletPublicKey: ''
      });

      if (!userResult.success || !userResult.user) {
        throw new Error(userResult.error || 'Failed to create/get user');
      }


      // Step 2: Ensure user has a wallet (this is the key part)
      const walletResult = await userWalletService.ensureUserWallet(userResult.user.id.toString());

      if (!walletResult.success) {
        logger.warn('Failed to ensure user wallet, continuing without wallet', { 
          userId: userResult.user.id,
          error: walletResult.error 
        }, 'SimplifiedAuth');
      }

      // Step 3: Return the app user with wallet info
      const appUser: AppUser = {
        id: userResult.user.id.toString(),
        name: userResult.user.name,
        email: userResult.user.email,
        wallet_address: walletResult.success ? walletResult.wallet!.address : userResult.user.wallet_address || '',
        wallet_public_key: walletResult.success ? walletResult.wallet!.publicKey : userResult.user.wallet_public_key || '',
        avatar: userResult.user.avatar,
        created_at: userResult.user.created_at,
        emailVerified: firebaseUser.emailVerified,
        lastLoginAt: new Date().toISOString(),
        hasCompletedOnboarding: userResult.user.hasCompletedOnboarding || false
      };

      logger.info('User authentication completed successfully', {
        userId: appUser.id,
        email: appUser.email,
        hasWallet: !!appUser.wallet_address,
        walletAddress: appUser.wallet_address,
        isNewUser: userResult.isNewUser
      }, 'SimplifiedAuth');

      return appUser;

    } catch (error) {
      logger.error('Authentication failed', error, 'SimplifiedAuth');
      throw error;
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<AuthResult> {
    try {
      const clientId = this.googleClientId;
      const redirectUri = this.getRedirectUri();

      logger.info('Starting Google Sign-In', {
        platform: Platform.OS,
        clientId: clientId ? `${clientId.substring(0, 20)}...` : 'NOT_SET',
        redirectUri,
        isDevelopment: __DEV__
      }, 'SimplifiedAuth');

      if (!clientId) {
        const error = 'Google Client ID not configured for this platform';
        logger.error('Configuration error', { error, platform: Platform.OS }, 'SimplifiedAuth');
        return { success: false, error };
      }

      // Create OAuth request
      const request = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
          access_type: 'offline',
          prompt: 'select_account'
        },
        usePKCE: true,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256
      });

      // Prompt user for Google sign-in
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth'
      });

      // Handle user cancellation
      if (result.type === 'cancel') {
        logger.info('User cancelled Google sign-in', null, 'SimplifiedAuth');
        return { success: false, error: 'User cancelled sign-in' };
      }

      // Handle errors
      if (result.type === 'error') {
        const error = result.error?.message || 'Unknown error occurred';
        logger.error('Google sign-in error', { error }, 'SimplifiedAuth');
        return { success: false, error };
      }

      // Handle success
      if (result.type === 'success' && 'params' in result) {
        const { code, error } = result.params;

        if (error) {
          logger.error('Google OAuth error', { error }, 'SimplifiedAuth');
          return { success: false, error: `OAuth error: ${error}` };
        }

        if (!code) {
          logger.error('No authorization code received', null, 'SimplifiedAuth');
          return { success: false, error: 'No authorization code received' };
        }

        // Exchange code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync({
          clientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        });

        if (tokenResponse.accessToken && tokenResponse.idToken) {
          try {
            // Sign in to Firebase with Google credential
            const credential = GoogleAuthProvider.credential(tokenResponse.idToken, tokenResponse.accessToken);
            const firebaseResult = await signInWithCredential(auth, credential);

            logger.info('Google OAuth successful', { 
              uid: firebaseResult.user.uid,
              email: firebaseResult.user.email,
              displayName: firebaseResult.user.displayName,
              platform: Platform.OS
            }, 'SimplifiedAuth');

            return {
              success: true,
              user: firebaseResult.user,
              isNewUser: firebaseResult.additionalUserInfo?.isNewUser || false
            };
          } catch (firebaseError: any) {
            logger.error('Firebase sign-in failed', {
              error: firebaseError.message,
              code: firebaseError.code,
              platform: Platform.OS
            }, 'SimplifiedAuth');
            
            // Handle specific Firebase auth errors
            if (firebaseError.code === 'auth/account-exists-with-different-credential') {
              return { success: false, error: 'An account already exists with the same email address but different sign-in credentials' };
            } else if (firebaseError.code === 'auth/email-already-in-use') {
              return { success: false, error: 'An account already exists with this email address' };
            } else if (firebaseError.code === 'auth/operation-not-allowed') {
              return { success: false, error: 'Google Sign-In is not enabled in Firebase Console' };
            } else {
              return { success: false, error: `Firebase authentication failed: ${firebaseError.message}` };
            }
          }
        } else {
          logger.error('Failed to exchange code for tokens', {
            hasAccessToken: !!tokenResponse.accessToken,
            hasIdToken: !!tokenResponse.idToken,
            platform: Platform.OS
          }, 'SimplifiedAuth');
          return { success: false, error: 'Failed to exchange authorization code for tokens' };
        }
      }

      return { success: false, error: 'Unexpected result from Google sign-in' };

    } catch (error: any) {
      logger.error('Google sign-in failed', {
        error: error.message,
        stack: error.stack,
        platform: Platform.OS
      }, 'SimplifiedAuth');
      
      return { 
        success: false, 
        error: error.message || 'Google sign-in failed' 
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      logger.info('Starting Email Sign-In', { email }, 'SimplifiedAuth');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      logger.info('Email sign-in successful', { 
        uid: userCredential.user.uid,
        email: userCredential.user.email
      }, 'SimplifiedAuth');

      return {
        success: true,
        user: userCredential.user,
        isNewUser: userCredential.additionalUserInfo?.isNewUser || false
      };

    } catch (error: any) {
      logger.error('Email sign-in failed', {
        error: error.message,
        code: error.code
      }, 'SimplifiedAuth');
      
      return { 
        success: false, 
        error: error.message || 'Email sign-in failed' 
      };
    }
  }

  /**
   * Create account with email and password
   */
  async createAccountWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      logger.info('Creating Email Account', { email }, 'SimplifiedAuth');

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      logger.info('Email account created successfully', { 
        uid: userCredential.user.uid,
        email: userCredential.user.email
      }, 'SimplifiedAuth');

      return {
        success: true,
        user: userCredential.user,
        isNewUser: true
      };

    } catch (error: any) {
      logger.error('Email account creation failed', {
        error: error.message,
        code: error.code
      }, 'SimplifiedAuth');
      
      return { 
        success: false, 
        error: error.message || 'Account creation failed' 
      };
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await auth.signOut();
      logger.info('User signed out successfully', null, 'SimplifiedAuth');
    } catch (error: any) {
      logger.error('Sign out failed', { error: error.message }, 'SimplifiedAuth');
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  /**
   * Get authentication state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void) {
    return auth.onAuthStateChanged(callback);
  }
}

// Export singleton instance
export const simplifiedAuthService = SimplifiedAuthService.getInstance();
