/**
 * Consolidated Authentication Service for WeSplit
 * Combines all authentication methods: Google OAuth, Twitter OAuth, Apple Sign-In, and Email
 * Replaces: firebaseAuthService, googleOAuthService, socialAuthService, twitterOAuthService
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
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { logger } from './loggingService';
import Constants from 'expo-constants';

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

export interface GoogleSignInResult extends AuthResult {}
export interface TwitterSignInResult extends AuthResult {}
export interface AppleSignInResult extends AuthResult {}
export interface EmailSignInResult extends AuthResult {}

class ConsolidatedAuthService {
  private static instance: ConsolidatedAuthService;
  private googleClientId: string;
  private twitterClientId: string;
  private appleClientId: string;

  private constructor() {
    this.googleClientId = this.getGoogleClientId();
    this.twitterClientId = getEnvVar('EXPO_PUBLIC_TWITTER_CLIENT_ID');
    this.appleClientId = getEnvVar('EXPO_PUBLIC_APPLE_CLIENT_ID');

    logger.info('ConsolidatedAuthService initialized', {
      hasGoogleClientId: !!this.googleClientId,
      hasTwitterClientId: !!this.twitterClientId,
      hasAppleClientId: !!this.appleClientId,
      platform: Platform.OS
    }, 'ConsolidatedAuth');
  }

  public static getInstance(): ConsolidatedAuthService {
    if (!ConsolidatedAuthService.instance) {
      ConsolidatedAuthService.instance = new ConsolidatedAuthService();
    }
    return ConsolidatedAuthService.instance;
  }

  // ===== GOOGLE AUTHENTICATION =====

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
    
    const clientId = this.googleClientId;
    const isUsingAndroidClient = clientId.includes('q8ucda9');
    const isUsingIOSClient = clientId.includes('ldm3rb2');
    
    if (Platform.OS === 'android' && isUsingAndroidClient) {
      return 'wesplit://auth';
    }
    
    if (Platform.OS === 'ios' && isUsingIOSClient) {
      return 'wesplit://auth';
    }
    
    return 'wesplit://auth';
  }

  /**
   * Sign in with Google using Firebase Authentication
   */
  async signInWithGoogle(): Promise<GoogleSignInResult> {
    try {
      const clientId = this.googleClientId;
      const redirectUri = this.getRedirectUri();

      logger.info('🔄 Starting Google Sign-In', {
        platform: Platform.OS,
        clientId: clientId ? `${clientId.substring(0, 20)}...` : 'NOT_SET',
        redirectUri,
        isDevelopment: __DEV__
      }, 'ConsolidatedAuth');

      if (!clientId) {
        const error = 'Google Client ID not configured for this platform';
        logger.error('❌ Configuration error', { error, platform: Platform.OS }, 'ConsolidatedAuth');
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

      logger.info('🔄 OAuth request created', {
        hasClientId: !!clientId,
        redirectUri,
        platform: Platform.OS
      }, 'ConsolidatedAuth');

      // Prompt user for Google sign-in
      logger.info('🔄 Opening Google sign-in prompt...', null, 'ConsolidatedAuth');
      
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth'
      });
      
      logger.info('🔄 Google sign-in prompt completed', {
        type: result.type,
        hasCode: result.type === 'success' && 'params' in result && !!result.params?.code,
        hasError: result.type === 'success' && 'params' in result && !!result.params?.error,
        platform: Platform.OS
      }, 'ConsolidatedAuth');

      // Handle user cancellation
      if (result.type === 'cancel') {
        logger.info('🔄 User cancelled Google sign-in', null, 'ConsolidatedAuth');
        return { success: false, error: 'User cancelled sign-in' };
      }

      // Handle errors
      if (result.type === 'error') {
        const error = result.error?.message || 'Unknown error occurred';
        logger.error('❌ Google sign-in error', { error }, 'ConsolidatedAuth');
        return { success: false, error };
      }

      // Handle success
      if (result.type === 'success' && 'params' in result) {
        const { code, error } = result.params;

        if (error) {
          logger.error('❌ Google OAuth error', { error }, 'ConsolidatedAuth');
          return { success: false, error: `OAuth error: ${error}` };
        }

        if (!code) {
          logger.error('❌ No authorization code received', null, 'ConsolidatedAuth');
          return { success: false, error: 'No authorization code received' };
        }

        logger.info('✅ Authorization code received, exchanging for tokens...', null, 'ConsolidatedAuth');

        // Exchange code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync({
          clientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        });

        logger.info('🔄 Token exchange completed', {
          hasAccessToken: !!tokenResponse.accessToken,
          hasIdToken: !!tokenResponse.idToken,
          platform: Platform.OS
        }, 'ConsolidatedAuth');

        if (tokenResponse.accessToken && tokenResponse.idToken) {
          logger.info('✅ Tokens received, signing in to Firebase...', null, 'ConsolidatedAuth');
          
          try {
            // Sign in to Firebase with Google credential
            const credential = GoogleAuthProvider.credential(tokenResponse.idToken, tokenResponse.accessToken);
            const firebaseResult = await signInWithCredential(auth, credential);

            logger.info('✅ Google OAuth successful', { 
              uid: firebaseResult.user.uid,
              email: firebaseResult.user.email,
              displayName: firebaseResult.user.displayName,
              platform: Platform.OS
            }, 'ConsolidatedAuth');

            return {
              success: true,
              user: firebaseResult.user,
              isNewUser: firebaseResult.additionalUserInfo?.isNewUser || false
            };
          } catch (firebaseError: any) {
            logger.error('❌ Firebase sign-in failed', {
              error: firebaseError.message,
              code: firebaseError.code,
              platform: Platform.OS
            }, 'ConsolidatedAuth');
            
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
          logger.error('❌ Failed to exchange code for tokens', {
            hasAccessToken: !!tokenResponse.accessToken,
            hasIdToken: !!tokenResponse.idToken,
            platform: Platform.OS
          }, 'ConsolidatedAuth');
          return { success: false, error: 'Failed to exchange authorization code for tokens' };
        }
      }

      return { success: false, error: 'Unexpected result from Google sign-in' };

    } catch (error: any) {
      logger.error('❌ Google sign-in failed', {
        error: error.message,
        stack: error.stack,
        platform: Platform.OS
      }, 'ConsolidatedAuth');
      
      return { 
        success: false, 
        error: error.message || 'Google sign-in failed' 
      };
    }
  }

  // ===== TWITTER AUTHENTICATION =====

  /**
   * Sign in with Twitter using Firebase Authentication
   */
  async signInWithTwitter(): Promise<TwitterSignInResult> {
    try {
      if (!this.twitterClientId) {
        return { success: false, error: 'Twitter Client ID not configured' };
      }

      logger.info('🔄 Starting Twitter Sign-In', { platform: Platform.OS }, 'ConsolidatedAuth');

      // Create OAuth request for Twitter
      const request = new AuthSession.AuthRequest({
        clientId: this.twitterClientId,
        scopes: ['tweet.read', 'users.read'],
        redirectUri: 'wesplit://auth',
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256
      });

      // Open Twitter OAuth flow
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize'
      });

      if (result.type === 'cancel') {
        return { success: false, error: 'User cancelled sign-in' };
      }

      if (result.type === 'error') {
        return { success: false, error: result.error?.message || 'Twitter sign-in failed' };
      }

      if (result.type === 'success' && 'params' in result) {
        const { code, error } = result.params;

        if (error) {
          return { success: false, error: `OAuth error: ${error}` };
        }

        if (!code) {
          return { success: false, error: 'No authorization code received' };
        }

        // Exchange code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync({
          clientId: this.twitterClientId,
          code,
          redirectUri: 'wesplit://auth',
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        });

        if (tokenResponse.accessToken && tokenResponse.idToken) {
          // Sign in to Firebase with Twitter credential
          const credential = TwitterAuthProvider.credential(tokenResponse.idToken, tokenResponse.accessToken);
          const firebaseResult = await signInWithCredential(auth, credential);

          logger.info('✅ Twitter OAuth successful', { 
            uid: firebaseResult.user.uid,
            email: firebaseResult.user.email,
            displayName: firebaseResult.user.displayName
          }, 'ConsolidatedAuth');

          return {
            success: true,
            user: firebaseResult.user,
            isNewUser: firebaseResult.additionalUserInfo?.isNewUser || false
          };
        } else {
          return { success: false, error: 'Failed to exchange authorization code for tokens' };
        }
      }

      return { success: false, error: 'Unexpected result from Twitter sign-in' };

    } catch (error: any) {
      logger.error('❌ Twitter sign-in failed', {
        error: error.message,
        platform: Platform.OS
      }, 'ConsolidatedAuth');
      
      return { 
        success: false, 
        error: error.message || 'Twitter sign-in failed' 
      };
    }
  }

  // ===== APPLE AUTHENTICATION =====

  /**
   * Sign in with Apple using Firebase Authentication
   */
  async signInWithApple(): Promise<AppleSignInResult> {
    try {
      if (!this.appleClientId) {
        return { success: false, error: 'Apple Client ID not configured' };
      }

      logger.info('🔄 Starting Apple Sign-In', { platform: Platform.OS }, 'ConsolidatedAuth');

      // Create OAuth request for Apple
      const request = new AuthSession.AuthRequest({
        clientId: this.appleClientId,
        scopes: ['name', 'email'],
        redirectUri: 'wesplit://auth',
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256
      });

      // Open Apple OAuth flow
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://appleid.apple.com/auth/authorize'
      });

      if (result.type === 'cancel') {
        return { success: false, error: 'User cancelled sign-in' };
      }

      if (result.type === 'error') {
        return { success: false, error: result.error?.message || 'Apple sign-in failed' };
      }

      if (result.type === 'success' && 'params' in result) {
        const { code, error } = result.params;

        if (error) {
          return { success: false, error: `OAuth error: ${error}` };
        }

        if (!code) {
          return { success: false, error: 'No authorization code received' };
        }

        // Exchange code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync({
          clientId: this.appleClientId,
          code,
          redirectUri: 'wesplit://auth',
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        });

        if (tokenResponse.accessToken && tokenResponse.idToken) {
          // Sign in to Firebase with Apple credential
          const credential = OAuthProvider.credential('apple.com', {
            idToken: tokenResponse.idToken,
            rawNonce: request.codeVerifier
          });
          const firebaseResult = await signInWithCredential(auth, credential);

          logger.info('✅ Apple OAuth successful', { 
            uid: firebaseResult.user.uid,
            email: firebaseResult.user.email,
            displayName: firebaseResult.user.displayName
          }, 'ConsolidatedAuth');

          return {
            success: true,
            user: firebaseResult.user,
            isNewUser: firebaseResult.additionalUserInfo?.isNewUser || false
          };
        } else {
          return { success: false, error: 'Failed to exchange authorization code for tokens' };
        }
      }

      return { success: false, error: 'Unexpected result from Apple sign-in' };

    } catch (error: any) {
      logger.error('❌ Apple sign-in failed', {
        error: error.message,
        platform: Platform.OS
      }, 'ConsolidatedAuth');
      
      return { 
        success: false, 
        error: error.message || 'Apple sign-in failed' 
      };
    }
  }

  // ===== EMAIL AUTHENTICATION =====

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<EmailSignInResult> {
    try {
      logger.info('🔄 Starting Email Sign-In', { email }, 'ConsolidatedAuth');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      logger.info('✅ Email sign-in successful', { 
        uid: userCredential.user.uid,
        email: userCredential.user.email
      }, 'ConsolidatedAuth');

      return {
        success: true,
        user: userCredential.user,
        isNewUser: userCredential.additionalUserInfo?.isNewUser || false
      };

    } catch (error: any) {
      logger.error('❌ Email sign-in failed', {
        error: error.message,
        code: error.code
      }, 'ConsolidatedAuth');
      
      return { 
        success: false, 
        error: error.message || 'Email sign-in failed' 
      };
    }
  }

  /**
   * Create account with email and password
   */
  async createAccountWithEmail(email: string, password: string): Promise<EmailSignInResult> {
    try {
      logger.info('🔄 Creating Email Account', { email }, 'ConsolidatedAuth');

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      logger.info('✅ Email account created successfully', { 
        uid: userCredential.user.uid,
        email: userCredential.user.email
      }, 'ConsolidatedAuth');

      return {
        success: true,
        user: userCredential.user,
        isNewUser: true
      };

    } catch (error: any) {
      logger.error('❌ Email account creation failed', {
        error: error.message,
        code: error.code
      }, 'ConsolidatedAuth');
      
      return { 
        success: false, 
        error: error.message || 'Account creation failed' 
      };
    }
  }

  // ===== UTILITY METHODS =====

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
      logger.info('✅ User signed out successfully', null, 'ConsolidatedAuth');
    } catch (error: any) {
      logger.error('❌ Sign out failed', { error: error.message }, 'ConsolidatedAuth');
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
export const consolidatedAuthService = ConsolidatedAuthService.getInstance();
