/**
 * Unified Authentication Service for WeSplit
 * Consolidates all authentication methods: Google OAuth, Twitter OAuth, Apple Sign-In, and Email
 * Replaces: consolidatedAuthService, unifiedSSOService, simpleGoogleAuth, firebaseGoogleAuth
 */

import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  User,
  OAuthProvider,
  TwitterAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../../config/firebase/firebase';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { logger } from '../analytics/loggingService';
import { getEnvVar, getPlatformGoogleClientId, getOAuthRedirectUri } from '../../utils/core';
import { firebaseDataService } from '../data/firebaseDataService';
import { walletService } from '../blockchain/wallet';
import { UserMigrationService } from '../core/UserMigrationService';
import Constants from 'expo-constants';

// Environment variable helper
const getEnvVarSafe = (key: string): string => {
  if (process.env[key]) {return process.env[key]!;}
  if (process.env[`EXPO_PUBLIC_${key}`]) {return process.env[`EXPO_PUBLIC_${key}`]!;}
  if (Constants.expoConfig?.extra?.[key]) {return Constants.expoConfig.extra[key];}
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) {return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];}
  if ((Constants.manifest as any)?.extra?.[key]) {return (Constants.manifest as any).extra[key];}
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) {return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];}
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

export interface UserData {
  id: string;
  name: string;
  email: string;
  wallet_address?: string;
  wallet_public_key?: string;
  avatar?: string;
  created_at?: string;
  emailVerified?: boolean;
  lastLoginAt?: string;
  hasCompletedOnboarding?: boolean;
}

export type AuthProvider = 'google' | 'twitter' | 'apple' | 'email';

class AuthService {
  private static instance: AuthService;
  private googleClientId: string;
  private twitterClientId: string;
  private appleClientId: string;

  private constructor() {
    this.googleClientId = getPlatformGoogleClientId();
    this.twitterClientId = getEnvVarSafe('EXPO_PUBLIC_TWITTER_CLIENT_ID');
    this.appleClientId = getEnvVarSafe('EXPO_PUBLIC_APPLE_CLIENT_ID');
    
    if (__DEV__) {
      logger.info('AuthService initialized', {
        hasGoogleClientId: !!this.googleClientId,
        hasTwitterClientId: !!this.twitterClientId,
        hasAppleClientId: !!this.appleClientId,
        platform: Platform.OS
      }, 'AuthService');
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<AuthResult> {
    try {
      if (!this.googleClientId) {
        return { success: false, error: 'Google Client ID not configured' };
      }

      logger.info('🔄 Starting Google Sign-In', {
        platform: Platform.OS,
        clientId: this.googleClientId.substring(0, 20) + '...'
      }, 'AuthService');

      const redirectUri = getOAuthRedirectUri();
      const request = new AuthSession.AuthRequest({
        clientId: this.googleClientId,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {},
        prompt: AuthSession.Prompt.SelectAccount,
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      if (result.type === 'success') {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: this.googleClientId,
            code: result.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier || '',
            },
          },
          {
            tokenEndpoint: 'https://oauth2.googleapis.com/token',
          }
        );

        const credential = GoogleAuthProvider.credential(tokenResponse.idToken);
        const userCredential = await signInWithCredential(auth, credential);
        
        // Check if user exists in our database
        const isNewUser = await this.checkIfUserIsNew(userCredential.user.uid);
        
        // Create or update user data
        await this.createOrUpdateUserData(userCredential.user, isNewUser);

        logger.info('✅ Google Sign-In successful', {
          userId: userCredential.user.uid,
          isNewUser
        }, 'AuthService');

        return {
          success: true,
          user: userCredential.user,
          isNewUser
        };
      } else {
        return { success: false, error: 'Google authentication was cancelled' };
      }
    } catch (error) {
      logger.error('❌ Google Sign-In failed', error, 'AuthService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Google authentication failed' 
      };
    }
  }

  /**
   * Sign in with Twitter OAuth
   */
  async signInWithTwitter(): Promise<AuthResult> {
    try {
      if (!this.twitterClientId) {
        return { success: false, error: 'Twitter Client ID not configured' };
      }

      logger.info('🔄 Starting Twitter Sign-In', {
        platform: Platform.OS
      }, 'AuthService');

      const redirectUri = getOAuthRedirectUri();
      const request = new AuthSession.AuthRequest({
        clientId: this.twitterClientId,
        scopes: ['tweet.read', 'users.read'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {},
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
      });

      if (result.type === 'success') {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: this.twitterClientId,
            code: result.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier || '',
            },
          },
          {
            tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
          }
        );

        const credential = TwitterAuthProvider.credential(tokenResponse.accessToken, '');
        const userCredential = await signInWithCredential(auth, credential);
        
        // Check if user exists in our database
        const isNewUser = await this.checkIfUserIsNew(userCredential.user.uid);
        
        // Create or update user data
        await this.createOrUpdateUserData(userCredential.user, isNewUser);

        logger.info('✅ Twitter Sign-In successful', {
          userId: userCredential.user.uid,
          isNewUser
        }, 'AuthService');

        return {
          success: true,
          user: userCredential.user,
          isNewUser
        };
      } else {
        return { success: false, error: 'Twitter authentication was cancelled' };
      }
    } catch (error) {
      logger.error('❌ Twitter Sign-In failed', error, 'AuthService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Twitter authentication failed' 
      };
    }
  }

  /**
   * Sign in with Apple ID
   */
  async signInWithApple(): Promise<AuthResult> {
    try {
      if (!this.appleClientId) {
        return { success: false, error: 'Apple Client ID not configured' };
      }

      logger.info('🔄 Starting Apple Sign-In', {
        platform: Platform.OS
      }, 'AuthService');

      const redirectUri = getOAuthRedirectUri();
      const request = new AuthSession.AuthRequest({
        clientId: this.appleClientId,
        scopes: ['name', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {},
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
      });

      if (result.type === 'success') {
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: this.appleClientId,
            code: result.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier || '',
            },
          },
          {
            tokenEndpoint: 'https://appleid.apple.com/auth/token',
          }
        );

        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: tokenResponse.idToken!,
          rawNonce: 'apple-signin-nonce', // Apple Sign-In nonce
        });
        
        const userCredential = await signInWithCredential(auth, credential);
        
        // Check if user exists in our database
        const isNewUser = await this.checkIfUserIsNew(userCredential.user.uid);
        
        // Create or update user data
        await this.createOrUpdateUserData(userCredential.user, isNewUser);

        logger.info('✅ Apple Sign-In successful', {
          userId: userCredential.user.uid,
          isNewUser
        }, 'AuthService');

        return {
          success: true,
          user: userCredential.user,
          isNewUser
        };
      } else {
        return { success: false, error: 'Apple authentication was cancelled' };
      }
    } catch (error) {
      logger.error('❌ Apple Sign-In failed', error, 'AuthService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Apple authentication failed' 
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      logger.info('🔄 Starting Email Sign-In', {
        email: email.substring(0, 5) + '...'
      }, 'AuthService');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user exists in our database
      const isNewUser = await this.checkIfUserIsNew(userCredential.user.uid);
      
      // Create or update user data (this handles wallet recovery)
      await this.createOrUpdateUserData(userCredential.user, isNewUser);
      
      // Update last login time
      await this.updateLastLoginTime(userCredential.user.uid);

      logger.info('✅ Email Sign-In successful', {
        userId: userCredential.user.uid,
        isNewUser
      }, 'AuthService');

      return {
        success: true,
        user: userCredential.user,
        isNewUser
      };
    } catch (error) {
      logger.error('❌ Email Sign-In failed', error, 'AuthService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Email authentication failed' 
      };
    }
  }

  /**
   * Create account with email and password
   */
  async createAccountWithEmail(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      logger.info('🔄 Starting Email Account Creation', {
        email: email.substring(0, 5) + '...'
      }, 'AuthService');

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      await updateProfile(userCredential.user, { displayName: name });
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      // Create user data
      await this.createOrUpdateUserData(userCredential.user, true);

      logger.info('✅ Email Account Creation successful', {
        userId: userCredential.user.uid
      }, 'AuthService');

      return {
        success: true,
        user: userCredential.user,
        isNewUser: true
      };
    } catch (error) {
      logger.error('❌ Email Account Creation failed', error, 'AuthService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Email account creation failed' 
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await sendPasswordResetEmail(auth, email);
      logger.info('✅ Password reset email sent', { email: email.substring(0, 5) + '...' }, 'AuthService');
      return { success: true };
    } catch (error) {
      logger.error('❌ Password reset email failed', error, 'AuthService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send password reset email' 
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      await firebaseSignOut(auth);
      logger.info('✅ User signed out successfully', {}, 'AuthService');
      return { success: true };
    } catch (error) {
      logger.error('❌ Sign out failed', error, 'AuthService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  /**
   * Authenticate with any SSO provider
   */
  async authenticateWithSSO(provider: AuthProvider): Promise<AuthResult> {
    switch (provider) {
      case 'google':
        return this.signInWithGoogle();
      case 'twitter':
        return this.signInWithTwitter();
      case 'apple':
        return this.signInWithApple();
      case 'email':
        throw new Error('Email authentication requires email and password parameters');
      default:
        return { success: false, error: `Unsupported provider: ${provider}` };
    }
  }

  /**
   * Check if user is new by looking up their data in Firestore and device storage
   */
  private async checkIfUserIsNew(userId: string): Promise<boolean> {
    try {
      // Check if user exists in Firebase database
      const existingUser = await firebaseDataService.user.getCurrentUser(userId);
      
      // Check if wallet exists on device (in secure storage)
      const hasWalletOnDevice = await walletService.hasWalletOnDevice(userId);
      
      // User is new if they don't exist in database AND don't have wallet on device
      const isNewUser = !existingUser && !hasWalletOnDevice;
      
      logger.info('User existence check', {
        userId,
        existsInDatabase: !!existingUser,
        hasWalletOnDevice,
        isNewUser
      }, 'AuthService');
      
      return isNewUser;
    } catch (error) {
      logger.error('❌ Failed to check if user is new', error, 'AuthService');
      return true; // Default to new user if check fails
    }
  }

  /**
   * Create or update user data in Firestore using email-based identification
   */
  private async createOrUpdateUserData(user: User, isNewUser: boolean): Promise<void> {
    try {
      // Use UserMigrationService to ensure consistent user identification
      const consistentUser = await UserMigrationService.ensureUserConsistency(user);
      
      logger.info('✅ User consistency ensured', {
        userId: consistentUser.id,
        email: consistentUser.email.substring(0, 5) + '...',
        isNewUser
      }, 'AuthService');
      
      if (isNewUser) {
        // Create wallet for new user
        const walletResult = await walletService.createWallet(consistentUser.id);
        if (walletResult.success && walletResult.wallet) {
          await firebaseDataService.user.updateUser(consistentUser.id, {
            wallet_address: walletResult.wallet.address,
            wallet_public_key: walletResult.wallet.publicKey,
            wallet_status: 'healthy',
            wallet_created_at: new Date().toISOString(),
            wallet_has_private_key: true,
            wallet_type: 'app-generated'
          });
          
          logger.info('✅ New user wallet created', {
            userId: consistentUser.id,
            walletAddress: walletResult.wallet.address
          }, 'AuthService');
        }
      } else {
        // Handle existing user - check if they have wallet on device
        const hasWalletOnDevice = await walletService.hasWalletOnDevice(consistentUser.id);
        
        if (hasWalletOnDevice) {
          // User has wallet on device - normal case
          logger.info('✅ Existing user with wallet on device', {
            userId: consistentUser.id,
            existingWalletAddress: consistentUser.wallet_address
          }, 'AuthService');
        } else if (consistentUser.wallet_address) {
          // User exists in database but no wallet on device (app reinstalled)
          logger.warn('⚠️ User exists in database but no wallet on device - attempting wallet recovery', { 
            userId: consistentUser.id,
            databaseWalletAddress: consistentUser.wallet_address 
          }, 'AuthService');
          
          // Try to recover wallet using existing wallet address from database
          const walletResult = await walletService.recoverWalletFromAddress(consistentUser.id, consistentUser.wallet_address);
          if (walletResult.success) {
            logger.info('✅ Wallet recovered successfully', { userId: consistentUser.id }, 'AuthService');
          } else {
            logger.error('❌ Failed to recover wallet, user will need to restore from seed phrase', { 
              userId: consistentUser.id,
              error: walletResult.error 
            }, 'AuthService');
          }
        } else {
          // User has no wallet - create one
          logger.info('Creating wallet for existing user without wallet', { userId: consistentUser.id }, 'AuthService');
          const walletResult = await walletService.createWallet(consistentUser.id);
          if (walletResult.success && walletResult.wallet) {
            await firebaseDataService.user.updateUser(consistentUser.id, {
              wallet_address: walletResult.wallet.address,
              wallet_public_key: walletResult.wallet.publicKey,
              wallet_status: 'healthy',
              wallet_created_at: new Date().toISOString(),
              wallet_has_private_key: true,
              wallet_type: 'app-generated'
            });
          }
        }
      }
    } catch (error) {
      logger.error('❌ Failed to create/update user data', error, 'AuthService');
      // Don't throw error - authentication should still succeed
    }
  }

  /**
   * Update last login time
   */
  private async updateLastLoginTime(userId: string): Promise<void> {
    try {
      // Note: lastLoginAt is not part of the User type, so we skip this update
      logger.info('✅ Last login time update skipped (not in User type)', { userId }, 'AuthService');
    } catch (error) {
      logger.error('❌ Failed to update last login time', error, 'AuthService');
      // Don't throw error - this is not critical
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default authService;
