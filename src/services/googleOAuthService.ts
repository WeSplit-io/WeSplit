import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';
import { logger } from './loggingService';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

// Environment variable helper
const getEnvVar = (key: string): string => {
  if (process.env[key]) { return process.env[key]!; }
  if (Constants.expoConfig?.extra?.[key]) { return Constants.expoConfig.extra[key]; }
  if ((Constants.manifest as any)?.extra?.[key]) { return (Constants.manifest as any).extra[key]; }
  return '';
};

export interface GoogleOAuthResult {
  success: boolean;
  user?: any;
  error?: string;
}

class GoogleOAuthService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
    this.clientSecret = getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_SECRET');

    logger.info('Google OAuth Service initialized', {
      clientId: this.clientId ? `${this.clientId.substring(0, 20)}...` : 'NOT_SET',
      clientIdLength: this.clientId?.length || 0,
      clientSecretLength: this.clientSecret?.length || 0,
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      platform: Platform.OS
    }, 'GoogleOAuth');
  }

  /**
   * Sign in with Google OAuth using Firebase Auth
   * Platform-aware implementation for Expo Go and standalone builds
   */
  async signInWithGoogle(): Promise<GoogleOAuthResult> {
    try {
      logger.info('Starting Google OAuth flow', { platform: Platform.OS }, 'GoogleOAuth');

      if (!this.clientId) {
        throw new Error('Google OAuth credentials not configured');
      }

      // Platform-specific configuration
      const redirectUri = this.getRedirectUri();
      logger.info('Using redirect URI:', { redirectUri, platform: Platform.OS }, 'GoogleOAuth');

      // Create OAuth request with proper configuration
      const request = new AuthSession.AuthRequest({
        clientId: this.clientId,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
          access_type: 'offline',
          prompt: 'select_account'
        },
        usePKCE: true,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256
      });

      logger.info('🔄 OAuth request created', {
        clientId: this.clientId ? `${this.clientId.substring(0, 20)}...` : 'NOT_SET',
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        platform: Platform.OS
      }, 'GoogleOAuth');

      logger.info('🔄 Opening OAuth flow in browser...', null, 'GoogleOAuth');

      // Open OAuth flow in browser
      let result;
      try {
        logger.info('🔄 Calling promptAsync...', null, 'GoogleOAuth');
        result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth'
      });
        logger.info('🔄 promptAsync completed', { 
          resultType: result.type,
          hasParams: 'params' in result,
          platform: Platform.OS
        }, 'GoogleOAuth');
      } catch (promptError: any) {
        logger.error('❌ promptAsync failed', {
          error: promptError.message,
          code: promptError.code,
          platform: Platform.OS
        }, 'GoogleOAuth');
        throw promptError;
      }

      logger.info('🔄 OAuth flow completed, processing result...', { 
        type: result.type, 
        hasCode: result.type === 'success' && 'params' in result && !!result.params?.code,
        hasError: result.type === 'success' && 'params' in result && !!result.params?.error,
        params: result.type === 'success' && 'params' in result ? Object.keys(result.params) : [],
        platform: Platform.OS
      }, 'GoogleOAuth');

      if (result.type === 'success' && 'params' in result && result.params.code) {
        logger.info('✅ OAuth code received, exchanging for tokens...', null, 'GoogleOAuth');
        
        // Exchange code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: this.clientId,
            code: result.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeChallenge || '',
            },
          },
          {
            tokenEndpoint: 'https://oauth2.googleapis.com/token',
          }
        );

        logger.info('Token exchange result:', { 
          hasAccessToken: !!tokenResponse.accessToken,
          hasIdToken: !!tokenResponse.idToken,
          accessTokenLength: tokenResponse.accessToken?.length || 0,
          idTokenLength: tokenResponse.idToken?.length || 0,
          platform: Platform.OS
        }, 'GoogleOAuth');

        if (tokenResponse.accessToken && tokenResponse.idToken) {
          logger.info('✅ Tokens received, signing in to Firebase...', null, 'GoogleOAuth');
          
          try {
          // Sign in to Firebase with Google credential
          const credential = GoogleAuthProvider.credential(tokenResponse.idToken, tokenResponse.accessToken);
          const firebaseResult = await signInWithCredential(auth, credential);

            logger.info('✅ Google OAuth successful', { 
              uid: firebaseResult.user.uid,
              email: firebaseResult.user.email,
              displayName: firebaseResult.user.displayName,
              platform: Platform.OS
            }, 'GoogleOAuth');

          return {
            success: true,
            user: firebaseResult.user
          };
          } catch (firebaseError: any) {
            logger.error('❌ Firebase sign-in failed', {
              error: firebaseError.message,
              code: firebaseError.code,
              platform: Platform.OS
            }, 'GoogleOAuth');
            
            // Handle specific Firebase auth errors
            if (firebaseError.code === 'auth/account-exists-with-different-credential') {
              throw new Error('An account already exists with the same email address but different sign-in credentials');
            } else if (firebaseError.code === 'auth/email-already-in-use') {
              throw new Error('An account already exists with this email address');
            } else if (firebaseError.code === 'auth/operation-not-allowed') {
              throw new Error('Google Sign-In is not enabled in Firebase Console');
            } else {
              throw new Error(`Firebase authentication failed: ${firebaseError.message}`);
            }
          }
        } else {
          logger.error('❌ Failed to exchange code for tokens', { 
            hasAccessToken: !!tokenResponse.accessToken,
            hasIdToken: !!tokenResponse.idToken,
            platform: Platform.OS
          }, 'GoogleOAuth');
          throw new Error('Failed to exchange code for tokens');
        }
      } else if (result.type === 'cancel') {
        logger.info('❌ OAuth flow cancelled by user', { platform: Platform.OS }, 'GoogleOAuth');
        return {
          success: false,
          error: 'Sign-in was cancelled by user'
        };
      } else if (result.type === 'success' && 'params' in result && result.params?.error) {
        logger.error('❌ OAuth error received', { 
          error: result.params.error,
          platform: Platform.OS
        }, 'GoogleOAuth');
        throw new Error(`OAuth error: ${result.params.error}`);
      } else {
        logger.error('❌ OAuth flow failed', { 
          type: result.type,
          hasParams: 'params' in result,
          params: 'params' in result ? Object.keys(result.params) : [],
          platform: Platform.OS
        }, 'GoogleOAuth');
        throw new Error('OAuth flow failed');
      }

    } catch (error: any) {
      let errorMessage = 'Google Sign-In failed';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled by user';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address but different sign-in credentials';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account already exists with this email address';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google Sign-In is not enabled in Firebase Console';
      } else if (error.message) {
        errorMessage = error.message;
      }

      logger.error('❌ Google OAuth error', {
        error: error.message,
        code: error.code,
        platform: Platform.OS
      }, 'GoogleOAuth');
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get the appropriate redirect URI based on platform and build type
   */
  private getRedirectUri(): string {
    // For Expo Go, use the proxy URL
    if (__DEV__) {
      return 'https://auth.expo.io/@devadmindappzy/WeSplit';
    }
    
    // For production builds, use custom scheme
    return AuthSession.makeRedirectUri({
      scheme: 'wesplit',
      path: 'auth'
    });
  }

  /**
   * Get OAuth configuration for debugging
   */
  getOAuthConfig() {
    const redirectUri = this.getRedirectUri();

    return {
      clientId: this.clientId,
      redirectUri,
      provider: 'expo-auth-session',
      scopes: ['openid', 'profile', 'email'],
      platform: Platform.OS,
      isDevelopment: __DEV__
    };
  }

  /**
   * Test OAuth configuration
   */
  async testConfiguration(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.clientId) {
      errors.push('Google Client ID not configured');
    }

    if (!this.clientSecret) {
      errors.push('Google Client Secret not configured');
    }

    if (this.clientId && this.clientId.length < 20) {
      errors.push('Google Client ID appears to be invalid (too short)');
    }

    if (this.clientId && /^\d+$/.test(this.clientId)) {
      errors.push('Google Client ID is numeric - should be in format: 123456789-abcdefghijklmnop.apps.googleusercontent.com');
    }

    // Check if using Web Client ID for Expo Go
    if (__DEV__ && this.clientId && !this.clientId.includes('.apps.googleusercontent.com')) {
      errors.push('For Expo Go, use Web Client ID, not Android Client ID');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// DISABLED: Using new Firebase auth service instead
// export const googleOAuthService = new GoogleOAuthService(); 