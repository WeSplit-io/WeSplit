import { auth, firestoreService } from '../config/firebase';
import { 
  signInWithCredential, 
  GoogleAuthProvider, 
  OAuthProvider,
  TwitterAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { userWalletService } from './userWalletService';
import { logger } from './loggingService';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { twitterOAuthService } from './twitterOAuthService';
import { loginWithGoogle } from './firebaseAuthService';

// Environment variable helper
const getEnvVar = (key: string): string => {
  if (process.env[key]) { return process.env[key]!; }
  if (Constants.expoConfig?.extra?.[key]) { return Constants.expoConfig.extra[key]; }
  if ((Constants.manifest as any)?.extra?.[key]) { return (Constants.manifest as any).extra[key]; }
  return '';
};

export interface SocialAuthResult {
  success: boolean;
  user?: any;
  error?: string;
  provider: 'google' | 'apple' | 'twitter';
}

class SocialAuthService {
  private googleClientId: string;
  private twitterClientId: string;
  private twitterClientSecret: string;

  constructor() {
    this.googleClientId = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
    this.twitterClientId = getEnvVar('EXPO_PUBLIC_TWITTER_CLIENT_ID');
    this.twitterClientSecret = getEnvVar('EXPO_PUBLIC_TWITTER_CLIENT_SECRET');
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<SocialAuthResult> {
    try {
      logger.info('🔄 Starting Google OAuth flow', null, 'SocialAuth');
      
      const result = await loginWithGoogle();

      logger.info('✅ Google OAuth completed', { 
        success: result.success, 
        hasUser: !!result.user,
        error: result.error 
      }, 'SocialAuth');

        return {
        ...result,
          provider: 'google'
        };
    } catch (error) {
      logger.error('❌ Google OAuth error', error, 'SocialAuth');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google Sign-In failed',
        provider: 'google'
      };
    }
  }

  /**
   * Sign in with Twitter OAuth using the dedicated Twitter OAuth service
   */
  async signInWithTwitter(): Promise<SocialAuthResult> {
    try {
      logger.info('Starting Twitter Sign-In process', null, 'SocialAuth');
      
      if (!this.twitterClientId || !this.twitterClientSecret) {
        throw new Error('Twitter OAuth credentials not configured');
      }

      // Use the dedicated Twitter OAuth service
      const result = await twitterOAuthService.signInWithTwitter();

      if (result.success && result.user) {
        logger.info('Twitter OAuth successful, user authenticated', { 
          uid: result.user.uid,
          email: result.user.email 
        }, 'SocialAuth');

        // Ensure user has wallet
        await userWalletService.ensureUserWallet(result.user.uid);

        // Store tokens securely (Twitter tokens are handled by the Twitter OAuth service)
        await this.storeTokens('twitter', {
          accessToken: 'twitter_access_token', // Placeholder - actual tokens handled by Twitter service
          idToken: 'twitter_id_token', // Placeholder
        });

        logger.info('Twitter Sign-In process completed successfully', { uid: result.user.uid }, 'SocialAuth');

        return {
          success: true,
          user: result.user,
          provider: 'twitter'
        };
      } else {
        logger.error('Twitter Sign-In failed', { error: result.error }, 'SocialAuth');
        return {
          success: false,
          error: result.error || 'Twitter Sign-In failed',
          provider: 'twitter'
        };
      }

    } catch (error: any) {
      let errorMessage = 'Twitter Sign-In failed';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled by user';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address but different sign-in credentials';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account already exists with this email address';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Twitter Sign-In is not enabled in Firebase Console';
      } else if (error.message) {
        errorMessage = error.message;
      }

      logger.error('Twitter Sign-In error', error, 'SocialAuth');
      
      return {
        success: false,
        error: errorMessage,
        provider: 'twitter'
      };
    }
  }

  /**
   * Sign in with Apple OAuth using expo-auth-session
   */
  async signInWithApple(): Promise<SocialAuthResult> {
    try {
      logger.info('Starting Apple Sign-In process', null, 'SocialAuth');
      
      const appleClientId = getEnvVar('EXPO_PUBLIC_APPLE_CLIENT_ID');
      
      if (!appleClientId) {
        throw new Error('Apple OAuth credentials not configured');
      }

      // Generate nonce for Apple Sign-In
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(),
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // Create OAuth request
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'wesplit',
        path: 'auth'
      });

      const request = new AuthSession.AuthRequest({
        clientId: appleClientId,
        scopes: ['name', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
          response_mode: 'form_post',
          nonce: nonce,
        },
      });

      // Open OAuth flow in browser
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
      });

      if (result.type === 'success' && result.params.code) {
        // Exchange code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: appleClientId,
            code: result.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeChallenge || '',
            },
          },
          {
            tokenEndpoint: 'https://appleid.apple.com/auth/token',
          }
        );

        if (tokenResponse.accessToken && tokenResponse.idToken) {
          // Sign in to Firebase with Apple credential
          const provider = new OAuthProvider('apple.com');
          const credential = provider.credential({
            idToken: tokenResponse.idToken,
            rawNonce: nonce,
          });
          
          const firebaseResult = await signInWithCredential(auth, credential);
          
          // Ensure user has wallet
          await userWalletService.ensureUserWallet(firebaseResult.user.uid);

          // Store tokens securely
          await this.storeTokens('apple', {
            accessToken: tokenResponse.accessToken,
            idToken: tokenResponse.idToken,
            refreshToken: tokenResponse.refreshToken,
          });

          logger.info('Apple Sign-In successful', { uid: firebaseResult.user.uid }, 'SocialAuth');

          return {
            success: true,
            user: firebaseResult.user,
            provider: 'apple'
          };
        } else {
          throw new Error('Failed to exchange code for tokens');
        }
      } else if (result.type === 'cancel') {
        return {
          success: false,
          error: 'Sign-in was cancelled by user',
          provider: 'apple'
        };
      } else {
        throw new Error('OAuth flow failed');
      }

    } catch (error: any) {
      let errorMessage = 'Apple Sign-In failed';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled by user';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address but different sign-in credentials';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account already exists with this email address';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Apple Sign-In is not enabled in Firebase Console';
      } else if (error.message) {
        errorMessage = error.message;
      }

      logger.error('Apple Sign-In error', error, 'SocialAuth');
      
      return {
        success: false,
        error: errorMessage,
        provider: 'apple'
      };
    }
  }

  /**
   * Store OAuth tokens securely
   */
  private async storeTokens(provider: string, tokens: {
    accessToken: string;
    idToken: string;
    refreshToken?: string;
  }) {
    try {
      const tokenData = {
        provider,
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
        refreshToken: tokens.refreshToken,
        timestamp: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        `oauth_tokens_${provider}`,
        JSON.stringify(tokenData)
      );

      logger.info(`Stored ${provider} tokens securely`, null, 'SocialAuth');
    } catch (error) {
      logger.error(`Failed to store ${provider} tokens`, error, 'SocialAuth');
    }
  }

  /**
   * Get stored OAuth tokens
   */
  async getStoredTokens(provider: string) {
    try {
      const tokenData = await AsyncStorage.getItem(`oauth_tokens_${provider}`);
      return tokenData ? JSON.parse(tokenData) : null;
    } catch (error) {
      logger.error(`Failed to get stored ${provider} tokens`, error, 'SocialAuth');
      return null;
    }
  }

  /**
   * Clear stored OAuth tokens
   */
  async clearStoredTokens(provider?: string) {
    try {
      if (provider) {
        await AsyncStorage.removeItem(`oauth_tokens_${provider}`);
      } else {
        // Clear all OAuth tokens
        const keys = await AsyncStorage.getAllKeys();
        const oauthKeys = keys.filter(key => key.startsWith('oauth_tokens_'));
        await AsyncStorage.multiRemove(oauthKeys);
      }

      logger.info(`Cleared ${provider || 'all'} OAuth tokens`, null, 'SocialAuth');
    } catch (error) {
      logger.error(`Failed to clear ${provider || 'all'} OAuth tokens`, error, 'SocialAuth');
    }
  }

  /**
   * Sign out from all social providers
   */
  async signOut(): Promise<void> {
    try {
      // Sign out from Firebase
      await auth.signOut();
      
      // Clear all stored OAuth tokens
      await this.clearStoredTokens();
      
      logger.info('Social Sign-Out successful', null, 'SocialAuth');
    } catch (error) {
      logger.error('Social Sign-Out error', error, 'SocialAuth');
    }
  }

  /**
   * Check if user is signed in with any social provider
   */
  async isSignedIn(): Promise<boolean> {
    try {
      const firebaseUser = auth.currentUser;
      return !!firebaseUser;
    } catch (error) {
      logger.error('Error checking sign-in status', error, 'SocialAuth');
      return false;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<any> {
    try {
      const firebaseUser = auth.currentUser;
      return firebaseUser;
    } catch (error) {
      logger.error('Error getting current user', error, 'SocialAuth');
      return null;
    }
  }

  /**
   * Get user's social provider info
   */
  async getUserProviderInfo(user: any): Promise<{ provider: string; email?: string; name?: string }> {
    try {
      if (!user) return { provider: 'unknown' };

      const providerData = user.providerData || [];
      const primaryProvider = providerData[0];

      return {
        provider: primaryProvider?.providerId || 'unknown',
        email: user.email || primaryProvider?.email,
        name: user.displayName || primaryProvider?.displayName
      };
    } catch (error) {
      logger.error('Error getting user provider info', error, 'SocialAuth');
      return { provider: 'unknown' };
    }
  }

  /**
   * Get provider from user object
   */
  private getProviderFromUser(user: any): 'google' | 'apple' | 'twitter' {
    const providerData = user.providerData || [];
    const primaryProvider = providerData[0];
    
    switch (primaryProvider?.providerId) {
      case 'google.com':
        return 'google';
      case 'apple.com':
        return 'apple';
      case 'twitter.com':
        return 'twitter';
      default:
        return 'google'; // fallback
    }
  }
}

export const socialAuthService = new SocialAuthService(); 