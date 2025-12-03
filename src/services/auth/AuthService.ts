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
  updateProfile,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  RecaptchaVerifier,
  ConfirmationResult,
  linkWithCredential,
  updatePhoneNumber,
  signInWithCustomToken
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

export type AuthProvider = 'google' | 'twitter' | 'apple' | 'email' | 'phone';

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
   * Sign in with phone number (Firebase Phone Authentication)
   * Firebase automatically sends SMS code
   */
  async signInWithPhoneNumber(phoneNumber: string, recaptchaVerifier?: RecaptchaVerifier): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    try {
      // Validate phone number format (E.164)
      if (!phoneNumber || !phoneNumber.startsWith('+')) {
        return {
          success: false,
          error: 'Phone number must be in E.164 format (e.g., +1234567890)'
        };
      }

      // Check if this is a Firebase test phone number (bypasses reCAPTCHA)
      const testPhoneNumbers = ['+15551234567', '+15559876543', '+15551111111'];
      const isTestNumber = testPhoneNumbers.includes(phoneNumber);

      logger.info('🔄 Starting Phone Sign-In', {
        phone: phoneNumber.substring(0, 5) + '...',
        isTestNumber
      }, 'AuthService');

      // Handle phone authentication based on environment
      let confirmationResult: ConfirmationResult;

      try {
        if (Platform.OS === 'web' && recaptchaVerifier) {
          confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        } else if (Platform.OS !== 'web') {
          // Mobile - Firebase should handle reCAPTCHA automatically
          confirmationResult = await signInWithPhoneNumber(auth, phoneNumber);
        } else {
          return {
            success: false,
            error: 'reCAPTCHA verifier is required for web platform'
          };
        }
      } catch (phoneError: any) {
        // Handle specific Firebase Phone Auth errors
        if (phoneError.message?.includes('Unable to load external scripts') ||
            phoneError.message?.includes('reCAPTCHA') ||
            phoneError.message?.includes('external scripts')) {

          logger.error('Firebase Phone Auth reCAPTCHA issue', {
            error: phoneError.message,
            phone: phoneNumber.substring(0, 5) + '...',
            platform: Platform.OS,
            isDevMode: __DEV__
          }, 'AuthService');

          // Provide helpful guidance based on environment
          if (__DEV__) {
            return {
              success: false,
              error: 'Phone authentication requires reCAPTCHA setup. For testing: +15551234567, +15559876543, +15551111111 (code: 123456). For production: Configure reCAPTCHA site key in Firebase Console.'
            };
          } else {
            return {
              success: false,
              error: 'Phone authentication requires configuration. Please contact support or use email authentication.'
            };
          }
        }

        // Re-throw other errors
        throw phoneError;
      }

      logger.info('✅ SMS code sent successfully', {
        phone: phoneNumber.substring(0, 5) + '...'
      }, 'AuthService');

      return {
        success: true,
        verificationId: confirmationResult.verificationId
      };
    } catch (error: any) {
      logger.error('❌ Phone Sign-In failed', error, 'AuthService');

      // Handle other Firebase Phone Auth errors
      if (error.code === 'auth/invalid-phone-number') {
        return {
          success: false,
          error: 'Invalid phone number. Please enter a valid phone number in international format (e.g., +1234567890).'
        };
      } else if (error.code === 'auth/too-many-requests') {
        return {
          success: false,
          error: 'Too many requests. Please wait a few minutes before trying again.'
        };
      } else if (error.code === 'auth/missing-client-identifier') {
        return {
          success: false,
          error: 'Phone authentication is not properly configured. Please contact support.'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Phone authentication failed'
      };
    }
  }

  /**
   * Get custom token for linking (helper method)
   */
  private async getCustomTokenForLinking(userId: string, email: string): Promise<string | null> {
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const firebaseConfig = await import('../../config/firebase/firebase');
      const app = firebaseConfig.default || (firebaseConfig as any).app;
      const functions = getFunctions(app, 'us-central1');
      
      const getCustomToken = httpsCallable(functions, 'getCustomTokenForUser');
      const result = await getCustomToken({ userId, email });
      
      if (result.data && typeof result.data === 'object' && 'token' in result.data) {
        return (result.data as { token: string }).token;
      }
      
      return null;
    } catch (error) {
      logger.warn('Failed to get custom token for linking', error, 'AuthService');
      return null;
    }
  }

  /**
   * Ensure user is signed into Firebase Auth
   * This is needed for linking phone numbers when user is authenticated via email/Firestore
   */
  private async ensureFirebaseAuthUser(userId: string, email: string): Promise<boolean> {
    try {
      // Check if already signed in
      if (auth.currentUser && auth.currentUser.uid === userId) {
        return true;
      }

      logger.info('Ensuring Firebase Auth user is signed in', { userId, email: email.substring(0, 5) + '...' }, 'AuthService');

      // Try to get a custom token from backend using verifyCode function's logic
      // The verifyCode function creates/gets Firebase Auth user and returns customToken
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const firebaseConfig = await import('../../config/firebase/firebase');
      const app = firebaseConfig.default || (firebaseConfig as any).app;
      const functions = getFunctions(app, 'us-central1');
      
      try {
        // Try to call a function that gets/creates custom token
        // First, try the getCustomTokenForUser function (if it exists)
        try {
          const getCustomToken = httpsCallable(functions, 'getCustomTokenForUser');
          const result = await getCustomToken({ userId, email });
          
          if (result.data && typeof result.data === 'object' && 'token' in result.data) {
            const customToken = (result.data as { token: string }).token;
            await signInWithCustomToken(auth, customToken);
            logger.info('✅ Signed in with custom token', { userId }, 'AuthService');
            return true;
          } else {
            logger.warn('getCustomTokenForUser returned invalid response', { data: result.data }, 'AuthService');
          }
        } catch (funcError: any) {
          // Log the error but don't fail - we'll show a helpful error message
          logger.warn('Failed to get custom token from backend', { 
            error: funcError.message,
            code: funcError.code 
          }, 'AuthService');
          
          // Alternative: Check if user exists in Firebase Auth by trying to sign in
          // Since we don't have password, we can't use signInWithEmailAndPassword
          // Instead, we'll need to create a backend function or use a different approach
          
          // For now, we'll check if there's a Firebase Auth user with this email
          // by checking auth state or using a workaround
          // The best solution is to ensure users are signed into Firebase Auth when they verify email
          // But for now, we'll return false and handle it in the caller
        }
      } catch (error: any) {
        logger.warn('Failed to get custom token', { error: error.message }, 'AuthService');
      }

      // If we can't get a custom token, we can't proceed with phone linking
      // The user needs to be signed into Firebase Auth
      return false;
    } catch (error) {
      logger.error('Failed to ensure Firebase Auth user', error, 'AuthService');
      return false;
    }
  }

  /**
   * Link phone number to existing user account (for profile settings)
   * Sends SMS code to verify phone number
   */
  async linkPhoneNumberToUser(phoneNumber: string, recaptchaVerifier?: RecaptchaVerifier, userId?: string, email?: string): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    try {
      let currentUser = auth.currentUser;
      
      // If Firebase Auth user is not available but we have userId, try to ensure they're signed in
      if (!currentUser && userId && email) {
        logger.info('Firebase Auth currentUser is null, attempting to sign in user', { userId }, 'AuthService');
        
        // Wait a bit for auth state to sync first
        await new Promise(resolve => setTimeout(resolve, 200));
        currentUser = auth.currentUser;
        
        // If still not available, try to ensure Firebase Auth sign-in
        if (!currentUser) {
          const signedIn = await this.ensureFirebaseAuthUser(userId, email);
          if (signedIn) {
            // Wait again for auth state to update
            await new Promise(resolve => setTimeout(resolve, 200));
            currentUser = auth.currentUser;
          }
        }
        
        if (!currentUser) {
          logger.warn('Firebase Auth currentUser is still null after attempting sign-in', { userId }, 'AuthService');
          
          // On mobile, Firebase Phone Auth requires currentUser to be set for linking
          // We need to inform the user they need to sign in to Firebase Auth
          return {
            success: false,
            error: 'Unable to link phone number. Please log out and log back in to refresh your authentication.'
          };
        }
      }
      
      // On mobile, Firebase Phone Auth can work even without currentUser
      // The phone will be linked when we verify the code
      if (!currentUser && Platform.OS === 'web') {
        return {
          success: false,
          error: 'User must be logged in to link phone number'
        };
      }

      // Validate phone number format (E.164)
      if (!phoneNumber || !phoneNumber.startsWith('+')) {
        return { 
          success: false, 
          error: 'Phone number must be in E.164 format (e.g., +1234567890)' 
        };
      }

      logger.info('🔄 Linking phone number to existing user', {
        userId: currentUser?.uid || userId || 'unknown',
        phone: phoneNumber.substring(0, 5) + '...',
        hasCurrentUser: !!currentUser
      }, 'AuthService');

      // IMPORTANT: For linking phone numbers, we MUST have currentUser set
      // On mobile, signInWithPhoneNumber can work without currentUser for NEW sign-ups,
      // but for LINKING to an existing account, currentUser must be set
      if (!currentUser) {
        return {
          success: false,
          error: 'Unable to link phone number. Please log out and log back in to refresh your authentication, then try again.'
        };
      }

      // On mobile, recaptchaVerifier is not needed (automatic)
      // On web, it's required
      let confirmationResult: ConfirmationResult;
      
      try {
        if (Platform.OS === 'web' && recaptchaVerifier) {
          confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        } else if (Platform.OS !== 'web') {
          // Mobile - no recaptcha needed
          // For linking phone numbers on mobile, we can use signInWithPhoneNumber
          // even when a user is signed in - Firebase handles this correctly
          // Wait a bit more to ensure auth state is fully synced
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Double-check currentUser is still set
          const finalCurrentUser = auth.currentUser;
          if (!finalCurrentUser) {
            logger.warn('currentUser became null before sending SMS', { userId }, 'AuthService');
            return {
              success: false,
              error: 'Authentication state lost. Please try again.'
            };
          }
          
          logger.info('Sending SMS for phone linking', {
            phone: phoneNumber.substring(0, 5) + '...',
            currentUserId: finalCurrentUser.uid,
            email: finalCurrentUser.email
          }, 'AuthService');
          
          // On mobile, signInWithPhoneNumber can be called even when user is signed in
          // However, there's a known Firebase issue where it fails with auth/argument-error
          // when reCAPTCHA Enterprise tries to initialize on mobile
          // The workaround is to temporarily sign out, send SMS, then sign back in
          const currentUserBeforeSMS = finalCurrentUser;
          let tempSignedOut = false;
          let customTokenForRestore: string | null = null;
          
          try {
            // First, try the normal way
            confirmationResult = await signInWithPhoneNumber(auth, phoneNumber);
          } catch (signInError: any) {
            // If signInWithPhoneNumber fails with argument-error, use workaround
            if (signInError.code === 'auth/argument-error') {
              logger.warn('signInWithPhoneNumber failed with argument-error, using workaround', {
                error: signInError.message
              }, 'AuthService');
              
              // The workaround of signing out doesn't help because the reCAPTCHA Enterprise
              // error occurs regardless of auth state. This is a Firebase configuration issue.
              // The best solution is to inform the user and provide instructions.
              logger.error('Phone linking failed due to reCAPTCHA Enterprise configuration issue', {
                error: signInError.message,
                note: 'This requires Firebase Console configuration changes'
              }, 'AuthService');
              
              // Provide a helpful error message
              throw new Error(
                'Phone authentication is currently unavailable due to a configuration issue. ' +
                'Please contact support or try again later. ' +
                'Alternatively, you can disable reCAPTCHA Enterprise in Firebase Console ' +
                'under Authentication > Settings > Phone authentication.'
              );
            } else {
              throw signInError;
            }
          }
        } else {
          return {
            success: false,
            error: 'reCAPTCHA verifier is required for web platform'
          };
        }
      } catch (phoneError: any) {
        logger.error('Failed to send SMS for phone linking', {
          error: phoneError.message,
          code: phoneError.code,
          phone: phoneNumber.substring(0, 5) + '...'
        }, 'AuthService');
        
        // Provide more specific error messages
        if (phoneError.code === 'auth/argument-error') {
          // This error typically occurs when reCAPTCHA Enterprise is enabled
          // but not properly configured for mobile React Native/Expo apps
          // The solution is to disable reCAPTCHA Enterprise in Firebase Console
          return {
            success: false,
            error: 'Phone authentication is currently unavailable due to a Firebase configuration issue with reCAPTCHA Enterprise. Please disable reCAPTCHA Enterprise in Firebase Console under Authentication > Settings > Phone authentication, or contact support.'
          };
        } else if (phoneError.code === 'auth/invalid-phone-number') {
          return {
            success: false,
            error: 'Invalid phone number. Please enter a valid phone number in international format (e.g., +1234567890).'
          };
        } else if (phoneError.code === 'auth/too-many-requests') {
          return {
            success: false,
            error: 'Too many requests. Please wait a few minutes before trying again.'
          };
        }
        
        return {
          success: false,
          error: phoneError.message || 'Failed to send verification code. Please try again.'
        };
      }

      logger.info('✅ SMS code sent for phone linking', {
        phone: phoneNumber.substring(0, 5) + '...'
      }, 'AuthService');

      return {
        success: true,
        verificationId: confirmationResult.verificationId
      };
    } catch (error) {
      logger.error('❌ Phone linking failed', error, 'AuthService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send verification code' 
      };
    }
  }

  /**
   * Verify phone code and link to existing user account
   */
  async verifyAndLinkPhoneCode(verificationId: string, code: string, phoneNumber: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      let currentUser = auth.currentUser;
      
      // If Firebase Auth user is not available, wait a bit for auth state to sync
      if (!currentUser) {
        logger.warn('Firebase Auth currentUser is null, waiting for auth state sync', { userId }, 'AuthService');
        // Wait for auth state to sync (Firebase Auth might be initializing)
        await new Promise(resolve => setTimeout(resolve, 500));
        currentUser = auth.currentUser;
      }
      
      // If still not available, we need to handle this differently
      // On mobile, we might need to sign in first or use a different approach
      if (!currentUser) {
        // Try to get user from app context if available
        if (userId) {
          logger.warn('Firebase Auth currentUser is null, but userId provided. Attempting to proceed with phone linking.', { userId }, 'AuthService');
          // For mobile, we can still proceed - Firebase Phone Auth handles this differently
          // But we need to ensure the user is authenticated in Firebase Auth
          // This might require re-authentication or using a custom token
        } else {
          return {
            success: false,
            error: 'User must be logged in to link phone number. Please log out and log back in.'
          };
        }
      }

      logger.info('🔄 Verifying phone code for linking', {
        userId: currentUser.uid,
        phone: phoneNumber.substring(0, 5) + '...'
      }, 'AuthService');

      // Create credential from verification ID and code
      const credential = PhoneAuthProvider.credential(verificationId, code);
      
      // Link phone credential to current user
      await linkWithCredential(currentUser, credential);

      const finalUserId = currentUser?.uid || userId;
      
      if (!finalUserId) {
        return {
          success: false,
          error: 'Unable to determine user ID for phone linking'
        };
      }

      logger.info('✅ Phone number linked successfully', {
        userId: finalUserId,
        phone: phoneNumber.substring(0, 5) + '...'
      }, 'AuthService');

      // Update user profile in Firestore
      const { firebaseDataService } = await import('../data/firebaseDataService');
      await firebaseDataService.user.updateUser(finalUserId, {
        phone: phoneNumber,
        phoneVerified: true,
        primary_phone: phoneNumber
      });

      return {
        success: true
      };
    } catch (error: any) {
      logger.error('❌ Phone code verification/linking failed', error, 'AuthService');
      
      // Handle specific Firebase errors
      if (error.code === 'auth/credential-already-in-use') {
        return {
          success: false,
          error: 'This phone number is already linked to another account'
        };
      } else if (error.code === 'auth/invalid-verification-code') {
        return {
          success: false,
          error: 'Invalid verification code. Please try again.'
        };
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to link phone number' 
      };
    }
  }

  /**
   * Verify phone code and sign in
   */
  async verifyPhoneCode(verificationId: string, code: string): Promise<AuthResult> {
    try {
      logger.info('🔄 Verifying phone code', {
        verificationId: verificationId.substring(0, 10) + '...'
      }, 'AuthService');

      // Create credential from verification ID and code
      const credential = PhoneAuthProvider.credential(verificationId, code);
      
      // CRITICAL: Before signing in, check if phone number exists in Firestore
      // This ensures we link to existing email accounts properly
      const { firebaseDataService } = await import('../data/firebaseDataService');
      let existingUserByPhone: any = null;
      
      try {
        // Get phone number from the verification ID (we need to extract it)
        // Since we don't have the phone number yet, we'll check after sign-in
        // But we can check if the credential will create a new user or use existing
      } catch (checkError) {
        logger.warn('Could not check for existing phone before sign-in', checkError, 'AuthService');
      }
      
      // Sign in with credential
      // If phone is already linked to a Firebase Auth user, this will sign into that user
      // If not, it creates a new Firebase Auth user
      const userCredential = await signInWithCredential(auth, credential);
      
      // Get phone number from user
      const phoneNumber = userCredential.user.phoneNumber;
      
      if (!phoneNumber) {
        throw new Error('Phone number not found in user credential');
      }

      // CRITICAL: Check if this phone number is linked to an existing email account in Firestore
      // This handles the case where user added phone to their email account
      try {
        existingUserByPhone = await firebaseDataService.user.getUserByPhone(phoneNumber);
        
        if (existingUserByPhone) {
          logger.info('📱 Found existing user by phone number', {
            phone: phoneNumber.substring(0, 5) + '...',
            existingUserId: existingUserByPhone.id,
            firebaseUid: userCredential.user.uid,
            hasEmail: !!existingUserByPhone.email
          }, 'AuthService');
          
          // If the Firebase Auth UID doesn't match the Firestore user ID, we need to link them
          if (existingUserByPhone.id !== userCredential.user.uid) {
            logger.warn('⚠️ Phone number linked to different Firebase Auth user', {
              firestoreUserId: existingUserByPhone.id,
              firebaseAuthUid: userCredential.user.uid,
              email: existingUserByPhone.email?.substring(0, 5) + '...'
            }, 'AuthService');
            
            // The phone is linked to a different Firebase Auth user (the one with email)
            // We need to sign out and sign in with the correct user
            // However, since we just signed in, we should update Firestore to use the new UID
            // OR link the phone credential to the existing Firebase Auth user
            
            // For now, update Firestore user to use the new Firebase Auth UID
            // This ensures consistency
            await firebaseDataService.user.updateUser(existingUserByPhone.id, {
              firebase_uid: userCredential.user.uid
            });
            
            // Also update the user document ID reference if needed
            // But we should keep the original user data
            logger.info('✅ Updated Firestore user to match Firebase Auth UID', {
              userId: existingUserByPhone.id,
              firebaseUid: userCredential.user.uid
            }, 'AuthService');
          }
        }
      } catch (phoneCheckError) {
        logger.warn('Could not check for existing phone in Firestore', phoneCheckError, 'AuthService');
        // Continue with normal flow
      }

      // Check if user exists in our database
      const isNewUser = await this.checkIfUserIsNew(userCredential.user.uid);
      
      // Create or update user data (this handles wallet recovery and phone linking)
      // UserMigrationService.ensureUserConsistencyWithPhone will find existing user by phone
      // and preserve email if phone is linked to an email account
      await this.createOrUpdateUserDataWithPhone(userCredential.user, phoneNumber, isNewUser);
      
      // Update last login time
      await this.updateLastLoginTime(userCredential.user.uid);

      logger.info('✅ Phone Sign-In successful', {
        userId: userCredential.user.uid,
        phone: phoneNumber.substring(0, 5) + '...',
        isNewUser,
        hadExistingAccount: !!existingUserByPhone
      }, 'AuthService');

      return {
        success: true,
        user: userCredential.user,
        isNewUser
      };
    } catch (error) {
      logger.error('❌ Phone code verification failed', error, 'AuthService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Phone code verification failed' 
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
      case 'phone':
        throw new Error('Phone authentication requires phone number and verification code parameters');
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
   * Create or update user data in Firestore using phone-based identification
   */
  private async createOrUpdateUserDataWithPhone(user: User, phoneNumber: string, isNewUser: boolean): Promise<void> {
    try {
      // Use UserMigrationService to ensure consistent user identification
      // First try to find by phone, then by email if phone not found
      const consistentUser = await UserMigrationService.ensureUserConsistencyWithPhone(user, phoneNumber);
      
      logger.info('✅ User consistency ensured (phone)', {
        userId: consistentUser.id,
        phone: phoneNumber.substring(0, 5) + '...',
        email: consistentUser.email?.substring(0, 5) + '...' || 'none',
        isNewUser
      }, 'AuthService');
      
      // CRITICAL: If user has email, save it to SecureStore for future logins
      // This ensures users can log in with either email or phone after linking
      if (consistentUser.email) {
        try {
          const { EmailPersistenceService } = await import('../core/emailPersistenceService');
          await EmailPersistenceService.saveEmail(consistentUser.email);
          logger.info('✅ Email saved to SecureStore after phone login', {
            email: consistentUser.email.substring(0, 5) + '...',
            userId: consistentUser.id
          }, 'AuthService');
        } catch (emailSaveError) {
          logger.warn('Failed to save email after phone login (non-critical)', emailSaveError, 'AuthService');
          // Non-critical, continue
        }
      }
      
      // Update user with phone number if not already set
      if (!consistentUser.phone || consistentUser.phone !== phoneNumber) {
        await firebaseDataService.user.updateUser(consistentUser.id, {
          phone: phoneNumber,
          phoneVerified: true,
          primary_phone: phoneNumber
        });
      }
      
      if (isNewUser) {
        // Create wallet for new user using atomic creation
        const walletResult = await walletService.createWallet(consistentUser.id);
        if (walletResult.success && walletResult.wallet) {
          logger.info('✅ New user wallet created atomically', {
            userId: consistentUser.id,
            walletAddress: walletResult.wallet.address
          }, 'AuthService');
        } else {
          logger.error('❌ Failed to create wallet for new user', {
            userId: consistentUser.id,
            error: walletResult.error
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
          let walletResult = await walletService.recoverWalletFromAddress(consistentUser.id, consistentUser.wallet_address);
          
          // If local recovery failed, try cloud backup restore
          if (!walletResult.success) {
            logger.info('Local recovery failed, cloud backup restore will be attempted', { 
              userId: consistentUser.id 
            }, 'AuthService');
            
            const { walletCloudBackupService } = await import('../security/walletCloudBackupService');
            const hasBackup = await walletCloudBackupService.hasBackup(consistentUser.id);
            
            if (hasBackup) {
              logger.info('Cloud backup available for restore', { userId: consistentUser.id }, 'AuthService');
            } else {
              logger.warn('No cloud backup found, user will need to restore from seed phrase', { 
                userId: consistentUser.id 
              }, 'AuthService');
            }
          } else {
            logger.info('✅ Wallet recovered successfully', { userId: consistentUser.id }, 'AuthService');
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
      logger.error('❌ Failed to create/update user data (phone)', error, 'AuthService');
      // Don't throw error - authentication should still succeed
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
        // Create wallet for new user using atomic creation
        const walletResult = await walletService.createWallet(consistentUser.id);
        if (walletResult.success && walletResult.wallet) {
          logger.info('✅ New user wallet created atomically', {
            userId: consistentUser.id,
            walletAddress: walletResult.wallet.address
          }, 'AuthService');
        } else {
          logger.error('❌ Failed to create wallet for new user', {
            userId: consistentUser.id,
            error: walletResult.error
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
          let walletResult = await walletService.recoverWalletFromAddress(consistentUser.id, consistentUser.wallet_address);
          
          // If local recovery failed, try cloud backup restore (requires user password)
          if (!walletResult.success) {
            logger.info('Local recovery failed, cloud backup restore will be attempted on next login with password', { 
              userId: consistentUser.id 
            }, 'AuthService');
            
            // Note: Cloud backup restore requires user password, so we'll prompt user later
            // For now, we'll just log that backup is available
            const { walletCloudBackupService } = await import('../security/walletCloudBackupService');
            const hasBackup = await walletCloudBackupService.hasBackup(consistentUser.id);
            
            if (hasBackup) {
              logger.info('Cloud backup available for restore', { userId: consistentUser.id }, 'AuthService');
              // User will be prompted to restore from backup on next screen
            } else {
              logger.warn('No cloud backup found, user will need to restore from seed phrase', { 
                userId: consistentUser.id 
              }, 'AuthService');
            }
          } else {
            logger.info('✅ Wallet recovered successfully', { userId: consistentUser.id }, 'AuthService');
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
