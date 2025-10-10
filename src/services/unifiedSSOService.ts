/**
 * Unified SSO Service for WeSplit
 * Consolidates all SSO authentication logic into a single, clean service
 * Replaces: consolidatedAuthService, userDataService, unifiedUserService
 */

import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  User,
  OAuthProvider,
  TwitterAuthProvider
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { logger } from './loggingService';
import { getEnvVar, getPlatformGoogleClientId, getOAuthRedirectUri } from '../utils/environmentUtils';
import { firestoreService } from '../config/firebase';
import { userWalletService } from './userWalletService';

// Types
export interface SSOResult {
  success: boolean;
  user?: AppUser;
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
  created_at: string;
  avatar?: string;
  provider: 'google' | 'apple' | 'twitter';
  emailVerified: boolean;
  lastLoginAt: string;
  hasCompletedOnboarding: boolean;
}

class UnifiedSSOService {
  private static instance: UnifiedSSOService;
  private googleClientId: string;
  private twitterClientId: string;
  private appleClientId: string;

  private constructor() {
    // Try using web client ID instead of platform-specific for debugging
    const webClientId = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
    const platformClientId = getPlatformGoogleClientId();
    
    // For debugging, let's try the web client ID first
    this.googleClientId = webClientId || platformClientId;
    
    this.twitterClientId = getEnvVar('EXPO_PUBLIC_TWITTER_CLIENT_ID');
    this.appleClientId = getEnvVar('EXPO_PUBLIC_APPLE_CLIENT_ID');

    // Debug environment variables
    console.log('🔧 UnifiedSSOService Environment Debug:');
    console.log('  Platform:', Platform.OS);
    console.log('  Web Client ID:', webClientId ? `${webClientId.substring(0, 20)}...` : 'NOT_FOUND');
    console.log('  Platform Client ID:', platformClientId ? `${platformClientId.substring(0, 20)}...` : 'NOT_FOUND');
    console.log('  Using Client ID:', this.googleClientId ? `${this.googleClientId.substring(0, 20)}...` : 'NOT_FOUND');
    console.log('  Twitter Client ID:', this.twitterClientId ? `${this.twitterClientId.substring(0, 20)}...` : 'NOT_FOUND');
    console.log('  Apple Client ID:', this.appleClientId ? `${this.appleClientId.substring(0, 20)}...` : 'NOT_FOUND');

    this.validateConfiguration();

    logger.info('UnifiedSSOService initialized', {
      hasGoogleClientId: !!this.googleClientId,
      hasTwitterClientId: !!this.twitterClientId,
      hasAppleClientId: !!this.appleClientId,
      platform: Platform.OS,
      usingWebClientId: this.googleClientId === webClientId
    }, 'UnifiedSSO');
  }

  public static getInstance(): UnifiedSSOService {
    if (!UnifiedSSOService.instance) {
      UnifiedSSOService.instance = new UnifiedSSOService();
    }
    return UnifiedSSOService.instance;
  }

  /**
   * Validate OAuth configuration
   */
  private validateConfiguration(): void {
    const missingConfigs: string[] = [];

    if (!this.googleClientId) missingConfigs.push('Google Client ID');
    if (!this.twitterClientId) missingConfigs.push('Twitter Client ID');
    if (!this.appleClientId) missingConfigs.push('Apple Client ID');

    if (missingConfigs.length > 0) {
      logger.warn('Missing OAuth configuration', {
        missingConfigs,
        platform: Platform.OS,
        note: 'Some social login options may not be available'
      }, 'UnifiedSSO');
    }
  }

  /**
   * Main SSO authentication method
   */
  async authenticateWithSSO(provider: 'google' | 'twitter' | 'apple'): Promise<SSOResult> {
    try {
      logger.info(`🔄 Starting ${provider} SSO authentication`, {
        provider,
        platform: Platform.OS
      }, 'UnifiedSSO');

      // Step 1: Perform OAuth authentication
      const authResult = await this.performOAuthAuthentication(provider);
      
      if (!authResult.success || !authResult.user) {
        return {
          success: false,
          error: authResult.error || `${provider} authentication failed`
        };
      }

      // Step 2: Save/update user data
      const userDataResult = await this.saveUserData(authResult.user, provider);
      
      if (!userDataResult.success || !userDataResult.userData) {
        return {
          success: false,
          error: userDataResult.error || 'Failed to save user data'
        };
      }

      // Step 3: Transform to AppUser format
      const appUser = this.transformToAppUser(userDataResult.userData);

      logger.info(`✅ ${provider} SSO authentication completed successfully`, {
        userId: appUser.id,
        email: appUser.email,
        hasWallet: !!appUser.wallet_address,
        isNewUser: userDataResult.isNewUser
      }, 'UnifiedSSO');

      return {
        success: true,
        user: appUser,
        isNewUser: userDataResult.isNewUser
      };

    } catch (error) {
      logger.error(`❌ ${provider} SSO authentication failed`, error, 'UnifiedSSO');
      return {
        success: false,
        error: error instanceof Error ? error.message : `${provider} authentication failed`
      };
    }
  }

  /**
   * Perform OAuth authentication with provider
   */
  private async performOAuthAuthentication(provider: 'google' | 'twitter' | 'apple'): Promise<{ success: boolean; user?: User; error?: string }> {
    switch (provider) {
      case 'google':
        return await this.signInWithGoogle();
      case 'twitter':
        return await this.signInWithTwitter();
      case 'apple':
        return await this.signInWithApple();
      default:
        return { success: false, error: 'Unsupported provider' };
    }
  }

  /**
   * Google OAuth authentication
   */
  private async signInWithGoogle(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      if (!this.googleClientId) {
        return { success: false, error: 'Google Client ID not configured' };
      }

      const redirectUri = getOAuthRedirectUri();
      
      logger.info('🔄 Starting Google Sign-In', {
        clientId: this.googleClientId.substring(0, 20) + '...',
        platform: Platform.OS,
        redirectUri
      }, 'UnifiedSSO');

      // Create OAuth request
      const request = new AuthSession.AuthRequest({
        clientId: this.googleClientId,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {},
        additionalParameters: {},
        prompt: AuthSession.Prompt.SelectAccount,
      });

      // Prompt user for Google sign-in with timeout
      const result = await Promise.race([
        request.promptAsync({
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OAuth prompt timeout after 2 minutes')), 120000)
        )
      ]) as any;

      logger.info('🔄 Google sign-in prompt completed', {
        type: result.type,
        hasCode: result.type === 'success' && 'params' in result && !!result.params?.code,
        hasError: result.type === 'success' && 'params' in result && !!result.params?.error,
        platform: Platform.OS
      }, 'UnifiedSSO');

      // Handle user cancellation
      if (result.type === 'cancel') {
        return { success: false, error: 'User cancelled sign-in' };
      }

      // Handle errors
      if (result.type === 'error') {
        const error = result.error?.message || 'Unknown error occurred';
        logger.error('❌ Google sign-in error', { error }, 'UnifiedSSO');
        
        if (error.includes('access_denied') || error.includes('access blocked')) {
          return { 
            success: false, 
            error: 'Access blocked. Please check your Google OAuth configuration. You may need to add your app\'s SHA-1 fingerprint to the Google Cloud Console.' 
          };
        }
        
        return { success: false, error };
      }

      // Handle success
      if (result.type === 'success' && 'params' in result) {
        const { code, error } = result.params;

        if (error) {
          logger.error('❌ Google OAuth error', { error }, 'UnifiedSSO');
          
          if (error.includes('access_denied') || error.includes('access blocked')) {
            return { 
              success: false, 
              error: 'Access blocked. Please check your Google OAuth configuration. You may need to add your app\'s SHA-1 fingerprint to the Google Cloud Console.' 
            };
          }
          
          return { success: false, error: `OAuth error: ${error}` };
        }

        if (!code) {
          return { success: false, error: 'No authorization code received' };
        }

        // Exchange code for tokens
        const tokenResult = await AuthSession.exchangeCodeAsync({
          clientId: this.googleClientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier || ''
          }
        }, {
          tokenEndpoint: 'https://oauth2.googleapis.com/token'
        });

        // Create Firebase credential
        const credential = GoogleAuthProvider.credential(tokenResult.idToken);
        const firebaseResult = await signInWithCredential(auth, credential);

        logger.info('✅ Google authentication successful', {
          uid: firebaseResult.user.uid,
          email: firebaseResult.user.email,
          isNewUser: (firebaseResult as any).additionalUserInfo?.isNewUser
        }, 'UnifiedSSO');

        return {
          success: true,
          user: firebaseResult.user
        };
      }

      return { success: false, error: 'Unexpected result type' };

    } catch (error) {
      logger.error('❌ Google authentication failed', error, 'UnifiedSSO');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google authentication failed'
      };
    }
  }

  /**
   * Twitter OAuth authentication
   */
  private async signInWithTwitter(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      if (!this.twitterClientId) {
        return { success: false, error: 'Twitter Client ID not configured' };
      }

      const redirectUri = getOAuthRedirectUri();
      
      logger.info('🔄 Starting Twitter Sign-In', {
        clientId: this.twitterClientId.substring(0, 20) + '...',
        platform: Platform.OS,
        redirectUri
      }, 'UnifiedSSO');

      // Create OAuth request
      const request = new AuthSession.AuthRequest({
        clientId: this.twitterClientId,
        scopes: ['tweet.read', 'users.read'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {},
        additionalParameters: {},
      });

      // Prompt user for Twitter sign-in
      const result = await Promise.race([
        request.promptAsync({
          authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OAuth prompt timeout after 2 minutes')), 120000)
        )
      ]) as any;

      // Handle user cancellation
      if (result.type === 'cancel') {
        return { success: false, error: 'User cancelled sign-in' };
      }

      // Handle errors
      if (result.type === 'error') {
        const error = result.error?.message || 'Unknown error occurred';
        logger.error('❌ Twitter sign-in error', { error }, 'UnifiedSSO');
        return { success: false, error };
      }

      // Handle success
      if (result.type === 'success' && 'params' in result) {
        const { code, error } = result.params;

        if (error) {
          logger.error('❌ Twitter OAuth error', { error }, 'UnifiedSSO');
          return { success: false, error: `OAuth error: ${error}` };
        }

        if (!code) {
          return { success: false, error: 'No authorization code received' };
        }

        // Exchange code for tokens
        const tokenResult = await AuthSession.exchangeCodeAsync({
          clientId: this.twitterClientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier || ''
          }
        }, {
          tokenEndpoint: 'https://api.twitter.com/2/oauth2/token'
        });

        // Create Firebase credential
        const credential = TwitterAuthProvider.credential(tokenResult.accessToken, tokenResult.idToken);
        const firebaseResult = await signInWithCredential(auth, credential);

        logger.info('✅ Twitter authentication successful', {
          uid: firebaseResult.user.uid,
          email: firebaseResult.user.email,
          isNewUser: (firebaseResult as any).additionalUserInfo?.isNewUser
        }, 'UnifiedSSO');

        return {
          success: true,
          user: firebaseResult.user
        };
      }

      return { success: false, error: 'Unexpected result type' };

    } catch (error) {
      logger.error('❌ Twitter authentication failed', error, 'UnifiedSSO');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Twitter authentication failed'
      };
    }
  }

  /**
   * Apple OAuth authentication
   */
  private async signInWithApple(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      if (!this.appleClientId) {
        return { success: false, error: 'Apple Client ID not configured' };
      }

      const redirectUri = getOAuthRedirectUri();
      
      logger.info('🔄 Starting Apple Sign-In', {
        clientId: this.appleClientId.substring(0, 20) + '...',
        platform: Platform.OS,
        redirectUri
      }, 'UnifiedSSO');

      // Create OAuth request
      const request = new AuthSession.AuthRequest({
        clientId: this.appleClientId,
        scopes: ['name', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {},
        additionalParameters: {},
      });

      // Prompt user for Apple sign-in
      const result = await Promise.race([
        request.promptAsync({
          authorizationEndpoint: 'https://appleid.apple.com/auth/authorize'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OAuth prompt timeout after 2 minutes')), 120000)
        )
      ]) as any;

      // Handle user cancellation
      if (result.type === 'cancel') {
        return { success: false, error: 'User cancelled sign-in' };
      }

      // Handle errors
      if (result.type === 'error') {
        const error = result.error?.message || 'Unknown error occurred';
        logger.error('❌ Apple sign-in error', { error }, 'UnifiedSSO');
        return { success: false, error };
      }

      // Handle success
      if (result.type === 'success' && 'params' in result) {
        const { code, error } = result.params;

        if (error) {
          logger.error('❌ Apple OAuth error', { error }, 'UnifiedSSO');
          return { success: false, error: `OAuth error: ${error}` };
        }

        if (!code) {
          return { success: false, error: 'No authorization code received' };
        }

        // Exchange code for tokens
        const tokenResult = await AuthSession.exchangeCodeAsync({
          clientId: this.appleClientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier || ''
          }
        }, {
          tokenEndpoint: 'https://appleid.apple.com/auth/token'
        });

        // Create Firebase credential
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: tokenResult.idToken,
          rawNonce: request.codeVerifier
        });
        const firebaseResult = await signInWithCredential(auth, credential);

        logger.info('✅ Apple authentication successful', {
          uid: firebaseResult.user.uid,
          email: firebaseResult.user.email,
          isNewUser: (firebaseResult as any).additionalUserInfo?.isNewUser
        }, 'UnifiedSSO');

        return {
          success: true,
          user: firebaseResult.user
        };
      }

      return { success: false, error: 'Unexpected result type' };

    } catch (error) {
      logger.error('❌ Apple authentication failed', error, 'UnifiedSSO');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Apple authentication failed'
      };
    }
  }

  /**
   * Save user data to Firestore
   */
  private async saveUserData(firebaseUser: User, provider: 'google' | 'apple' | 'twitter'): Promise<{ success: boolean; userData?: UserData; error?: string; isNewUser?: boolean }> {
    try {
      logger.info('🔄 Saving user data after SSO login', { 
        uid: firebaseUser.uid, 
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        provider 
      }, 'UnifiedSSO');

      // Check if user already exists in Firestore
      let existingUserData = await firestoreService.getUserDocument(firebaseUser.uid);

      if (existingUserData) {
        // Update existing user data
        const updatedUserData = await this.updateExistingUserData(firebaseUser, existingUserData, provider);
        
        logger.info('✅ User data updated successfully', { 
          uid: firebaseUser.uid,
          name: updatedUserData.name,
          hasCompletedOnboarding: updatedUserData.hasCompletedOnboarding
        }, 'UnifiedSSO');
        
        return {
          success: true,
          userData: updatedUserData,
          isNewUser: false
        };
      } else {
        // Create new user data
        const newUserData = await this.createNewUserData(firebaseUser, provider);
        
        logger.info('✅ New user data created successfully', { 
          uid: firebaseUser.uid,
          name: newUserData.name,
          hasCompletedOnboarding: newUserData.hasCompletedOnboarding
        }, 'UnifiedSSO');
        
        return {
          success: true,
          userData: newUserData,
          isNewUser: true
        };
      }

    } catch (error) {
      logger.error('❌ Failed to save user data after SSO login', error, 'UnifiedSSO');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save user data'
      };
    }
  }

  /**
   * Create new user data for first-time SSO login
   */
  private async createNewUserData(firebaseUser: User, provider: 'google' | 'apple' | 'twitter'): Promise<UserData> {
    try {
      logger.info('Creating new user data with wallet', { 
        uid: firebaseUser.uid,
        provider,
        email: firebaseUser.email
      }, 'UnifiedSSO');

      // Ensure user has a wallet with retry logic
      let walletResult;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          walletResult = await userWalletService.ensureUserWallet(firebaseUser.uid);
          
          if (walletResult.success) {
            logger.info('Wallet created successfully for new user', { 
              uid: firebaseUser.uid,
              walletAddress: walletResult.wallet?.address
            }, 'UnifiedSSO');
            break;
          } else {
            logger.warn(`Wallet creation failed (attempt ${retryCount + 1}/${maxRetries})`, { 
              uid: firebaseUser.uid,
              error: walletResult.error,
              retryCount: retryCount + 1
            }, 'UnifiedSSO');
            
            if (retryCount === maxRetries - 1) {
              logger.error('All wallet creation attempts failed, continuing without wallet', { 
                uid: firebaseUser.uid,
                finalError: walletResult.error
              }, 'UnifiedSSO');
              break;
            }
            
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        } catch (walletError) {
          logger.error(`Wallet creation error (attempt ${retryCount + 1}/${maxRetries})`, { 
            uid: firebaseUser.uid,
            error: walletError,
            retryCount: retryCount + 1
          }, 'UnifiedSSO');
          
          if (retryCount === maxRetries - 1) {
            logger.error('All wallet creation attempts failed, continuing without wallet', { 
              uid: firebaseUser.uid,
              finalError: walletError
            }, 'UnifiedSSO');
            break;
          }
          
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

      // Create user data
      const userData: UserData = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        wallet_address: walletResult?.success ? walletResult.wallet?.address : '',
        wallet_public_key: walletResult?.success ? walletResult.wallet?.publicKey : '',
        created_at: new Date().toISOString(),
        avatar: firebaseUser.photoURL || '',
        provider,
        emailVerified: firebaseUser.emailVerified,
        lastLoginAt: new Date().toISOString(),
        hasCompletedOnboarding: false // New users need to complete onboarding
      };

      // Save to Firestore
      await firestoreService.createUserDocument(userData);

      return userData;

    } catch (error) {
      logger.error('Failed to create new user data', error, 'UnifiedSSO');
      throw error;
    }
  }

  /**
   * Update existing user data
   */
  private async updateExistingUserData(firebaseUser: User, existingUserData: any, provider: 'google' | 'apple' | 'twitter'): Promise<UserData> {
    try {
      logger.info('Updating existing user data', { 
        uid: firebaseUser.uid,
        existingName: existingUserData.name,
        existingEmail: existingUserData.email
      }, 'UnifiedSSO');

      // Update user data
      const updatedUserData: UserData = {
        id: firebaseUser.uid,
        name: existingUserData.name || firebaseUser.displayName || '',
        email: firebaseUser.email || existingUserData.email || '',
        wallet_address: existingUserData.wallet_address || '',
        wallet_public_key: existingUserData.wallet_public_key || '',
        created_at: existingUserData.created_at || new Date().toISOString(),
        avatar: firebaseUser.photoURL || existingUserData.avatar || '',
        provider,
        emailVerified: firebaseUser.emailVerified,
        lastLoginAt: new Date().toISOString(),
        hasCompletedOnboarding: existingUserData.hasCompletedOnboarding || false
      };

      // Ensure user has a wallet if they don't have one
      if (!updatedUserData.wallet_address) {
        logger.info('Existing user has no wallet, creating one', { 
          uid: firebaseUser.uid
        }, 'UnifiedSSO');

        const walletResult = await userWalletService.ensureUserWallet(firebaseUser.uid);
        
        if (walletResult.success && walletResult.wallet) {
          updatedUserData.wallet_address = walletResult.wallet.address;
          updatedUserData.wallet_public_key = walletResult.wallet.publicKey;
          
          logger.info('Wallet created for existing user', { 
            uid: firebaseUser.uid,
            walletAddress: walletResult.wallet.address
          }, 'UnifiedSSO');
        } else {
          logger.warn('Failed to create wallet for existing user', { 
            uid: firebaseUser.uid,
            error: walletResult.error
          }, 'UnifiedSSO');
        }
      }

      // Update in Firestore
      await firestoreService.updateUserDocument(firebaseUser.uid, updatedUserData);

      return updatedUserData;

    } catch (error) {
      logger.error('Failed to update existing user data', error, 'UnifiedSSO');
      throw error;
    }
  }

  /**
   * Transform UserData to AppUser format
   */
  private transformToAppUser(userData: UserData): AppUser {
    return {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      wallet_address: userData.wallet_address || '',
      wallet_public_key: userData.wallet_public_key || '',
      avatar: userData.avatar || '',
      created_at: userData.created_at,
      emailVerified: userData.emailVerified,
      lastLoginAt: userData.lastLoginAt,
      hasCompletedOnboarding: userData.hasCompletedOnboarding
    };
  }
}

// Export singleton instance
export const unifiedSSOService = UnifiedSSOService.getInstance();
export default unifiedSSOService;
