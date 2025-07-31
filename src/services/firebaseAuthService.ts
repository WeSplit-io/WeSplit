/**
 * Pure Firebase-based authentication service for WeSplit
 * Uses Firebase Auth and Firestore for email verification without passwords
 */

import { GoogleAuthProvider, signInWithCredential, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { logger } from './loggingService';
import Constants from 'expo-constants';

// Environment variable helper
const getEnvVar = (key: string): string => {
  // Check process.env first
  if (process.env[key]) return process.env[key]!;
  // Check EXPO_PUBLIC_ prefix
  if (process.env[`EXPO_PUBLIC_${key}`]) return process.env[`EXPO_PUBLIC_${key}`]!;
  // Check Constants.expoConfig.extra
  if (Constants.expoConfig?.extra?.[key]) return Constants.expoConfig.extra[key];
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];
  // Check Constants.manifest.extra
  if ((Constants.manifest as any)?.extra?.[key]) return (Constants.manifest as any).extra[key];
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];
  return '';
};

/**
 * Get Google Client ID for current platform
 */
const getGoogleClientId = (): string => {
  // For development with Expo Go, use web client
  if (__DEV__) {
    return getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
  }
  
  // For production builds, prioritize platform-specific IDs
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
};

/**
 * Get the appropriate redirect URI based on platform and environment
 */
const getRedirectUri = (): string => {
  // For development with Expo Go, use Expo proxy (Google Cloud Console compatible)
  if (__DEV__) {
    // Use the Expo proxy URL that Google Cloud Console accepts
    return 'https://auth.expo.io/@devadmindappzy/WeSplit';
  }
  
  const clientId = getGoogleClientId();
  const isUsingAndroidClient = clientId.includes('q8ucda9'); // Android client ID
  const isUsingIOSClient = clientId.includes('ldm3rb2'); // iOS client ID
  
  // For Android with Android client, use custom scheme
  if (Platform.OS === 'android' && isUsingAndroidClient) {
    return 'wesplit://auth';
  }
  
  // For iOS with iOS client, use custom scheme
  if (Platform.OS === 'ios' && isUsingIOSClient) {
    return 'wesplit://auth';
  }
  
  // For production builds, use custom scheme
  return 'wesplit://auth';
};

export interface GoogleSignInResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Sign in with Google using Firebase Authentication
 * 
 * @returns Promise<GoogleSignInResult> - Result of the sign-in attempt
 */
export const loginWithGoogle = async (): Promise<GoogleSignInResult> => {
  try {
    const clientId = getGoogleClientId();
    const redirectUri = getRedirectUri();

    logger.info('🔄 Starting Google Sign-In', {
      platform: Platform.OS,
      clientId: clientId ? `${clientId.substring(0, 20)}...` : 'NOT_SET',
      redirectUri,
      isDevelopment: __DEV__
    }, 'FirebaseAuth');

    // Validate configuration
    if (!clientId) {
      const error = 'Google Client ID not configured for this platform';
      logger.error('❌ Configuration error', { error, platform: Platform.OS }, 'FirebaseAuth');
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
    }, 'FirebaseAuth');

    // Prompt user for Google sign-in
    logger.info('🔄 Opening Google sign-in prompt...', null, 'FirebaseAuth');
    
    const result = await request.promptAsync({
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth'
    });
    
    logger.info('🔄 Google sign-in prompt completed', {
      type: result.type,
      hasCode: result.type === 'success' && 'params' in result && !!result.params?.code,
      hasError: result.type === 'success' && 'params' in result && !!result.params?.error,
      platform: Platform.OS
    }, 'FirebaseAuth');

    // Handle user cancellation
    if (result.type === 'cancel') {
      logger.info('❌ Google sign-in cancelled by user', { platform: Platform.OS }, 'FirebaseAuth');
      return { success: false, error: 'Sign-in was cancelled by user' };
    }

    // Handle OAuth errors
    if (result.type === 'success' && 'params' in result && result.params?.error) {
      const error = `OAuth error: ${result.params.error}`;
      logger.error('❌ OAuth error received', { error: result.params.error, platform: Platform.OS }, 'FirebaseAuth');
      return { success: false, error };
    }

    // Handle successful OAuth flow
    if (result.type === 'success' && 'params' in result && result.params.code) {
      logger.info('✅ OAuth code received, exchanging for tokens...', null, 'FirebaseAuth');

      // Exchange code for tokens
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId,
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

      logger.info('Token exchange completed', {
        hasAccessToken: !!tokenResponse.accessToken,
        hasIdToken: !!tokenResponse.idToken,
        accessTokenLength: tokenResponse.accessToken?.length || 0,
        idTokenLength: tokenResponse.idToken?.length || 0,
        platform: Platform.OS
      }, 'FirebaseAuth');

      if (tokenResponse.accessToken && tokenResponse.idToken) {
        logger.info('✅ Tokens received, signing in to Firebase...', null, 'FirebaseAuth');

        try {
          // Create Firebase credential
          const credential = GoogleAuthProvider.credential(tokenResponse.idToken, tokenResponse.accessToken);
          
          // Sign in to Firebase
          const firebaseResult = await signInWithCredential(auth, credential);

          logger.info('✅ Google Sign-In successful', {
            uid: firebaseResult.user.uid,
            email: firebaseResult.user.email,
            displayName: firebaseResult.user.displayName,
            platform: Platform.OS
          }, 'FirebaseAuth');
        
        return {
          success: true,
            user: firebaseResult.user
          };
        } catch (firebaseError: any) {
          logger.error('❌ Firebase sign-in failed', {
            error: firebaseError.message,
            code: firebaseError.code,
            platform: Platform.OS
          }, 'FirebaseAuth');

          // Handle specific Firebase auth errors
          let errorMessage = 'Firebase authentication failed';
          
          switch (firebaseError.code) {
            case 'auth/account-exists-with-different-credential':
              errorMessage = 'An account already exists with the same email address but different sign-in credentials';
              break;
            case 'auth/email-already-in-use':
              errorMessage = 'An account already exists with this email address';
              break;
            case 'auth/operation-not-allowed':
              errorMessage = 'Google Sign-In is not enabled in Firebase Console';
              break;
            case 'auth/invalid-credential':
              errorMessage = 'Invalid Google credentials';
              break;
            case 'auth/user-disabled':
              errorMessage = 'This account has been disabled';
              break;
            default:
              errorMessage = `Firebase authentication failed: ${firebaseError.message}`;
          }

          return { success: false, error: errorMessage };
        }
          } else {
        const error = 'Failed to exchange OAuth code for tokens';
        logger.error('❌ Token exchange failed', {
          hasAccessToken: !!tokenResponse.accessToken,
          hasIdToken: !!tokenResponse.idToken,
          platform: Platform.OS
        }, 'FirebaseAuth');
        return { success: false, error };
      }
    } else {
      const error = 'OAuth flow failed - no authorization code received';
      logger.error('❌ OAuth flow failed', {
        type: result.type,
        hasParams: 'params' in result,
        params: 'params' in result ? Object.keys(result.params) : [],
        platform: Platform.OS
      }, 'FirebaseAuth');
      return { success: false, error };
    }
  } catch (error: any) {
    const errorMessage = error.message || 'Google Sign-In failed';
    logger.error('❌ Google Sign-In error', {
      error: error.message,
      code: error.code,
      platform: Platform.OS
    }, 'FirebaseAuth');
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Get current authentication configuration for debugging
 */
export const getAuthConfig = () => {
  const clientId = getGoogleClientId();
  const redirectUri = getRedirectUri();

  return {
    platform: Platform.OS,
    clientId: clientId ? `${clientId.substring(0, 20)}...` : 'NOT_SET',
    redirectUri,
    isDevelopment: __DEV__,
    hasClientId: !!clientId
  };
};

/**
 * Test authentication configuration
 */
export const testAuthConfiguration = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const clientId = getGoogleClientId();

  if (!clientId) {
    errors.push('Google Client ID not configured');
  }

  if (clientId && clientId.length < 20) {
    errors.push('Google Client ID appears to be invalid (too short)');
  }

  // Check if client ID is numeric (wrong format)
  if (clientId && /^\d+$/.test(clientId)) {
    errors.push('Google Client ID is numeric - should be in format: 123456789-abcdefghijklmnop.apps.googleusercontent.com');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}; 