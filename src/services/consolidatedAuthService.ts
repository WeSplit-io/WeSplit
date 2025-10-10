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

    // Validate environment configuration
    this.validateEnvironmentConfig();

    logger.info('ConsolidatedAuthService initialized', {
      hasGoogleClientId: !!this.googleClientId,
      hasTwitterClientId: !!this.twitterClientId,
      hasAppleClientId: !!this.appleClientId,
      platform: Platform.OS
    }, 'ConsolidatedAuth');
  }

  /**
   * Validate environment configuration for OAuth providers
   */
  private validateEnvironmentConfig(): void {
    const missingConfigs: string[] = [];

    if (!this.googleClientId) {
      missingConfigs.push('Google Client ID');
    }

    if (!this.twitterClientId) {
      missingConfigs.push('Twitter Client ID');
    }

    if (!this.appleClientId) {
      missingConfigs.push('Apple Client ID');
    }

    if (missingConfigs.length > 0) {
      logger.warn('Missing OAuth configuration', {
        missingConfigs,
        platform: Platform.OS,
        note: 'Some social login options may not be available'
      }, 'ConsolidatedAuth');
    }
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
    // Always use platform-specific client IDs for proper OAuth configuration
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
    // Always use the app's deep link scheme for OAuth callbacks
    // This ensures proper callback handling in both development and production
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

      // Prompt user for Google sign-in with timeout
      logger.info('🔄 Opening Google sign-in prompt...', null, 'ConsolidatedAuth');
      
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
        platform: Platform.OS,
        resultKeys: result.type === 'success' && 'params' in result ? Object.keys(result.params) : []
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
        
        // Provide more specific error messages for common issues
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
          logger.error('❌ Google OAuth error', { error }, 'ConsolidatedAuth');
          
          // Provide more specific error messages for OAuth parameter errors
          if (error.includes('access_denied') || error.includes('access blocked')) {
            return { 
              success: false, 
              error: 'Access blocked. Please check your Google OAuth configuration. You may need to add your app\'s SHA-1 fingerprint to the Google Cloud Console.' 
            };
          }
          
          return { success: false, error: `OAuth error: ${error}` };
        }

        if (!code) {
          logger.error('❌ No authorization code received', null, 'ConsolidatedAuth');
          return { success: false, error: 'No authorization code received' };
        }

        logger.info('✅ Authorization code received, exchanging for tokens...', null);

        // Exchange code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync({
          clientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier || '',
          },
        }, {
          tokenEndpoint: 'https://oauth2.googleapis.com/token'
        });

        logger.info('🔄 Token exchange completed', {
          hasAccessToken: !!tokenResponse.accessToken,
          hasIdToken: !!tokenResponse.idToken,
          platform: Platform.OS
        }, 'ConsolidatedAuth');

        if (tokenResponse.accessToken && tokenResponse.idToken) {
          logger.info('✅ Tokens received, signing in to Firebase...', null);
          
          try {
            // Sign in to Firebase with Google credential
            const credential = GoogleAuthProvider.credential(tokenResponse.idToken, tokenResponse.accessToken);
            const firebaseResult = await signInWithCredential(auth, credential);

            logger.info('✅ Google OAuth successful', { 
              uid: firebaseResult.user.uid,
              email: firebaseResult.user.email,
              displayName: firebaseResult.user.displayName,
              platform: Platform.OS
            });

            return {
              success: true,
              user: firebaseResult.user,
              isNewUser: (firebaseResult as any).additionalUserInfo?.isNewUser || false
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
        const error = 'Twitter Client ID not configured. Please check your environment variables.';
        logger.error('❌ Configuration error', { error, platform: Platform.OS }, 'ConsolidatedAuth');
        return { success: false, error };
      }

      logger.info('🔄 Starting Twitter Sign-In', { 
        platform: Platform.OS,
        clientId: this.twitterClientId ? `${this.twitterClientId.substring(0, 20)}...` : 'NOT_SET'
      }, 'ConsolidatedAuth');

      // Create OAuth request for Twitter
      const request = new AuthSession.AuthRequest({
        clientId: this.twitterClientId,
        scopes: ['tweet.read', 'users.read'],
        redirectUri: 'wesplit://auth',
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256
      });

      logger.info('🔄 Opening Twitter OAuth flow...', null, 'ConsolidatedAuth');

      // Open Twitter OAuth flow
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize'
      });

      logger.info('🔄 Twitter OAuth flow completed', {
        type: result.type,
        hasCode: result.type === 'success' && 'params' in result && !!result.params?.code,
        hasError: result.type === 'success' && 'params' in result && !!result.params?.error,
        platform: Platform.OS
      }, 'ConsolidatedAuth');

      if (result.type === 'cancel') {
        logger.info('🔄 User cancelled Twitter sign-in', null, 'ConsolidatedAuth');
        return { success: false, error: 'User cancelled sign-in' };
      }

      if (result.type === 'error') {
        const error = result.error?.message || 'Twitter sign-in failed';
        logger.error('❌ Twitter OAuth error', { error }, 'ConsolidatedAuth');
        return { success: false, error };
      }

      if (result.type === 'success' && 'params' in result) {
        const { code, error } = result.params;

        if (error) {
          logger.error('❌ Twitter OAuth parameter error', { error }, 'ConsolidatedAuth');
          return { success: false, error: `OAuth error: ${error}` };
        }

        if (!code) {
          logger.error('❌ No authorization code received from Twitter', null, 'ConsolidatedAuth');
          return { success: false, error: 'No authorization code received' };
        }

        logger.info('✅ Authorization code received, exchanging for tokens...', null);

        // Exchange code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync({
          clientId: this.twitterClientId,
          code,
          redirectUri: 'wesplit://auth',
          extraParams: {
            code_verifier: request.codeVerifier || '',
          },
        }, {
          tokenEndpoint: 'https://api.twitter.com/2/oauth2/token'
        });

        logger.info('🔄 Token exchange completed', {
          hasAccessToken: !!tokenResponse.accessToken,
          hasIdToken: !!tokenResponse.idToken,
          platform: Platform.OS
        }, 'ConsolidatedAuth');

        if (tokenResponse.accessToken && tokenResponse.idToken) {
          logger.info('✅ Tokens received, signing in to Firebase...', null);
          
          try {
            // Sign in to Firebase with Twitter credential
            const credential = TwitterAuthProvider.credential(tokenResponse.idToken, tokenResponse.accessToken);
            const firebaseResult = await signInWithCredential(auth, credential);

            logger.info('✅ Twitter OAuth successful', { 
              uid: firebaseResult.user.uid,
              email: firebaseResult.user.email,
              displayName: firebaseResult.user.displayName,
              platform: Platform.OS
            });

            return {
              success: true,
              user: firebaseResult.user,
              isNewUser: (firebaseResult as any).additionalUserInfo?.isNewUser || false
            };
          } catch (firebaseError: any) {
            logger.error('❌ Firebase sign-in failed for Twitter', {
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
              return { success: false, error: 'Twitter Sign-In is not enabled in Firebase Console' };
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

      return { success: false, error: 'Unexpected result from Twitter sign-in' };

    } catch (error: any) {
      logger.error('❌ Twitter sign-in failed', {
        error: error.message,
        stack: error.stack,
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
        const error = 'Apple Client ID not configured. Please check your environment variables.';
        logger.error('❌ Configuration error', { error, platform: Platform.OS }, 'ConsolidatedAuth');
        return { success: false, error };
      }

      logger.info('🔄 Starting Apple Sign-In', { 
        platform: Platform.OS,
        clientId: this.appleClientId ? `${this.appleClientId.substring(0, 20)}...` : 'NOT_SET'
      }, 'ConsolidatedAuth');

      // Create OAuth request for Apple
      const request = new AuthSession.AuthRequest({
        clientId: this.appleClientId,
        scopes: ['name', 'email'],
        redirectUri: 'wesplit://auth',
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256
      });

      logger.info('🔄 Opening Apple OAuth flow...', null, 'ConsolidatedAuth');

      // Open Apple OAuth flow
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://appleid.apple.com/auth/authorize'
      });

      logger.info('🔄 Apple OAuth flow completed', {
        type: result.type,
        hasCode: result.type === 'success' && 'params' in result && !!result.params?.code,
        hasError: result.type === 'success' && 'params' in result && !!result.params?.error,
        platform: Platform.OS
      }, 'ConsolidatedAuth');

      if (result.type === 'cancel') {
        logger.info('🔄 User cancelled Apple sign-in', null, 'ConsolidatedAuth');
        return { success: false, error: 'User cancelled sign-in' };
      }

      if (result.type === 'error') {
        const error = result.error?.message || 'Apple sign-in failed';
        logger.error('❌ Apple OAuth error', { error }, 'ConsolidatedAuth');
        return { success: false, error };
      }

      if (result.type === 'success' && 'params' in result) {
        const { code, error } = result.params;

        if (error) {
          logger.error('❌ Apple OAuth parameter error', { error }, 'ConsolidatedAuth');
          return { success: false, error: `OAuth error: ${error}` };
        }

        if (!code) {
          logger.error('❌ No authorization code received from Apple', null, 'ConsolidatedAuth');
          return { success: false, error: 'No authorization code received' };
        }

        logger.info('✅ Authorization code received, exchanging for tokens...', null);

        // Exchange code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync({
          clientId: this.appleClientId,
          code,
          redirectUri: 'wesplit://auth',
          extraParams: {
            code_verifier: request.codeVerifier || '',
          },
        }, {
          tokenEndpoint: 'https://appleid.apple.com/auth/token'
        });

        logger.info('🔄 Token exchange completed', {
          hasAccessToken: !!tokenResponse.accessToken,
          hasIdToken: !!tokenResponse.idToken,
          platform: Platform.OS
        }, 'ConsolidatedAuth');

        if (tokenResponse.accessToken && tokenResponse.idToken) {
          logger.info('✅ Tokens received, signing in to Firebase...', null);
          
          try {
            // Sign in to Firebase with Apple credential
            const credential = (OAuthProvider as any).credential('apple.com', {
              idToken: tokenResponse.idToken,
              rawNonce: request.codeVerifier
            });
            const firebaseResult = await signInWithCredential(auth, credential);

            logger.info('✅ Apple OAuth successful', { 
              uid: firebaseResult.user.uid,
              email: firebaseResult.user.email,
              displayName: firebaseResult.user.displayName,
              platform: Platform.OS
            });

            return {
              success: true,
              user: firebaseResult.user,
              isNewUser: (firebaseResult as any).additionalUserInfo?.isNewUser || false
            };
          } catch (firebaseError: any) {
            logger.error('❌ Firebase sign-in failed for Apple', {
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
              return { success: false, error: 'Apple Sign-In is not enabled in Firebase Console' };
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

      return { success: false, error: 'Unexpected result from Apple sign-in' };

    } catch (error: any) {
      logger.error('❌ Apple sign-in failed', {
        error: error.message,
        stack: error.stack,
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
      });

      return {
        success: true,
        user: userCredential.user,
        isNewUser: (userCredential as any).additionalUserInfo?.isNewUser || false
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
