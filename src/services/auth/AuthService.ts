/**
 * Unified Authentication Service for WeSplit
 * Consolidates all authentication methods: Phone Authentication, Email Verification
 * All social authentication (Google, Apple) is handled through Phantom
 * Replaces: consolidatedAuthService, unifiedSSOService, simpleGoogleAuth, firebaseGoogleAuth
 */

import {
  signInWithCredential,
  User,
  signOut as firebaseSignOut,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  RecaptchaVerifier,
  ConfirmationResult,
  linkWithCredential,
  signInWithCustomToken
} from 'firebase/auth';
import { auth } from '../../config/firebase/firebase';
import { Platform } from 'react-native';
import { logger } from '../analytics/loggingService';
import { getEnvVar } from '../../utils/core';
import { firebaseDataService } from '../data/firebaseDataService';
import { walletService } from '../blockchain/wallet';
import { UserMigrationService } from '../core/UserMigrationService';


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

export type AuthProvider = 'google' | 'apple' | 'phone';

class AuthService {
  /**
   * Validate phone number format (E.164)
   */
  private validatePhoneNumber(phoneNumber: string): { isValid: boolean; error?: string } {
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      return {
        isValid: false,
        error: 'Phone number must be in E.164 format (e.g., +1234567890)'
      };
    }
    return { isValid: true };
  }
  private static instance: AuthService;

  private constructor() {
    if (__DEV__) {
      logger.info('AuthService initialized', {
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
   * Sign in with phone number (Firebase Phone Authentication)
   * Firebase automatically sends SMS code
   */
  async signInWithPhoneNumber(phoneNumber: string, recaptchaVerifier?: RecaptchaVerifier): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    try {
      // Validate Firebase is initialized
      if (!auth || !auth.app) {
        return {
          success: false,
          error: 'Firebase authentication is not initialized'
        };
      }

      // Log Firebase configuration for debugging
      logger.info('Firebase Phone Auth Configuration Check', {
        projectId: auth.app.options.projectId,
        authDomain: auth.app.options.authDomain,
        hasApiKey: !!auth.app.options.apiKey,
        platform: Platform.OS,
        isDev: __DEV__
      }, 'AuthService');

      // Validate phone number format (E.164)
      const phoneValidation = this.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        return {
          success: false,
          error: phoneValidation.error
        };
      }

      // Check if this is a Firebase test phone number (bypasses reCAPTCHA)
      const testPhoneNumbers = ['+15551234567', '+15559876543', '+15551111111'];
      const isTestNumber = testPhoneNumbers.includes(phoneNumber);

      logger.info('🔄 Starting Phone Sign-In', {
        phone: phoneNumber.substring(0, 5) + '...',
        isTestNumber,
        firebaseInitialized: !!auth?.app,
        projectId: auth.app?.options?.projectId
      }, 'AuthService');

      // Handle phone authentication based on environment
      let confirmationResult: ConfirmationResult;

      try {
        logger.info('Attempting Firebase Phone Auth', {
          platform: Platform.OS,
          phonePrefix: phoneNumber.substring(0, 5),
          isTestNumber,
          firebaseConfig: {
            projectId: auth.app.options.projectId,
            authDomain: auth.app.options.authDomain
          }
        }, 'AuthService');

        // DEBUG: Check Firebase auth state
        logger.info('Firebase Auth Debug', {
          currentUser: !!auth.currentUser,
          currentUserId: auth.currentUser?.uid,
          appName: auth.app.name,
          projectId: auth.app.options.projectId
        }, 'AuthService');

        if (Platform.OS === 'web' && recaptchaVerifier) {
          confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        } else if (Platform.OS !== 'web') {
          // Mobile - React Native/Expo with reCAPTCHA Enterprise requires proper configuration
          logger.info('Setting up React Native phone authentication with reCAPTCHA', {
            phonePrefix: phoneNumber.substring(0, 5),
            platform: Platform.OS,
            firebaseVersion: '11.10.0',
            recaptchaEnabled: true
          }, 'AuthService');

          try {
            // For React Native with reCAPTCHA Enterprise enabled,
            // Firebase handles reCAPTCHA automatically but requires proper Firebase Console setup

            // Try with explicit reCAPTCHA verifier for React Native/Expo
            if (Platform.OS === 'ios' && !isTestNumber) {
              // For iOS real numbers, try with web fallback approach
              console.log('iOS real number detected - using web fallback approach');
              confirmationResult = await signInWithPhoneNumber(auth, phoneNumber);
            } else {
              // For Android, web, or test numbers
              confirmationResult = await signInWithPhoneNumber(auth, phoneNumber);
            }
          } catch (mobileError: any) {
            logger.error('React Native Phone Auth failed', {
              error: mobileError.message,
              code: mobileError.code,
              platform: Platform.OS,
              stack: mobileError.stack?.substring(0, 200)
            }, 'AuthService');

            // Check for specific Firebase errors
            if (mobileError.message?.includes('Unable to load external scripts')) {
              throw new Error('reCAPTCHA Enterprise configuration issue. To maintain security:\n\nAction Required:\n1. Phone Authentication ENABLED in Firebase Console > Authentication > Sign-in method\n2. reCAPTCHA Enterprise ENABLED and properly configured\n3. Add your app domains to reCAPTCHA Enterprise\n4. Test with +15551234567 first, then real numbers\n\nFor security: Keep reCAPTCHA Enterprise enabled but ensure proper domain configuration.');
            } else if (mobileError.code === 'auth/invalid-phone-number') {
              throw new Error('Invalid phone number format. Use E.164 format (e.g., +33635551484)');
            } else if (mobileError.code === 'auth/too-many-requests') {
              throw new Error('Too many requests. Please wait before trying again.');
            } else if (mobileError.code === 'auth/missing-client-identifier') {
              throw new Error('Firebase configuration error. Check google-services.json and GoogleService-Info.plist');
            }

            throw mobileError;
          }
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
            errorCode: phoneError.code,
            phone: phoneNumber.substring(0, 5) + '...',
            platform: Platform.OS,
            isDevMode: __DEV__,
            firebaseProjectId: auth.app?.options?.projectId,
            authDomain: auth.app?.options?.authDomain,
            suggestion: 'Check Firebase Console: Authentication > Sign-in method > Phone should be ENABLED'
          }, 'AuthService');

          // Provide specific guidance for React Native/Expo
          if (Platform.OS !== 'web') {
            return {
              success: false,
              error: 'Phone Authentication failed. Please check:\n1. Phone is ENABLED in Firebase Console > Authentication > Sign-in method\n2. reCAPTCHA Enterprise is DISABLED\n3. Your app is properly registered in Firebase Console\n\nFor testing, use: +15551234567 (code: 123456)'
            };
          } else {
            return {
              success: false,
              error: 'Phone authentication requires a reCAPTCHA verifier for web platform.'
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
      const phoneValidation = this.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        return {
          success: false,
          error: phoneValidation.error
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
            error: 'Invalid phone number. Please enter a valid phone number in E.164 format (e.g., +33635551484).'
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
   * Ensure user has a wallet (consolidated wallet creation logic)
   */
  async ensureUserWallet(userId: string): Promise<{ walletAddress: string; walletPublicKey: string } | null> {
    try {
      // Check if user already has wallet in database
      const existingUser = await firebaseDataService.user.getCurrentUser(userId);
      if (existingUser?.wallet_address) {
        return {
          walletAddress: existingUser.wallet_address,
          walletPublicKey: existingUser.wallet_public_key || existingUser.wallet_address
        };
      }

      // Check if wallet exists on device
      const hasWalletOnDevice = await walletService.hasWalletOnDevice(userId);
      if (hasWalletOnDevice) {
        // Try to get wallet info from device
        const walletInfo = await walletService.getWalletInfo(userId);
        if (walletInfo) {
          // Update database with wallet info
          await firebaseDataService.user.updateUser(userId, {
            wallet_address: walletInfo.address,
            wallet_public_key: walletInfo.publicKey,
            wallet_status: 'healthy',
            wallet_created_at: new Date().toISOString(),
            wallet_has_private_key: true,
            wallet_type: 'app-generated'
          });
          return {
            walletAddress: walletInfo.address,
            walletPublicKey: walletInfo.publicKey
          };
        }
      }

      // Create new wallet
      const walletResult = await walletService.createWallet(userId);
      if (walletResult.success && walletResult.wallet) {
        // Update database with new wallet info
        await firebaseDataService.user.updateUser(userId, {
          wallet_address: walletResult.wallet.address,
          wallet_public_key: walletResult.wallet.publicKey,
          wallet_status: 'healthy',
          wallet_created_at: new Date().toISOString(),
          wallet_has_private_key: true,
          wallet_type: 'app-generated'
        });

        logger.info('✅ Created wallet for user', {
          userId,
          walletAddress: walletResult.wallet.address
        }, 'AuthService');

        return {
          walletAddress: walletResult.wallet.address,
          walletPublicKey: walletResult.wallet.publicKey
        };
      }

      logger.error('❌ Failed to create wallet for user', { userId }, 'AuthService');
      return null;
    } catch (error) {
      logger.error('❌ Error ensuring user wallet', error, 'AuthService');
      return null;
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
      
      // Ensure user has a wallet using consolidated logic
      await this.ensureUserWallet(consistentUser.id);
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
      
      // Ensure user has a wallet using consolidated logic
      await this.ensureUserWallet(consistentUser.id);
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

/**
 * Backend test utility for phone authentication - no frontend dependencies
 * Use this to test and debug Firebase Phone Authentication logic
 */
export class PhoneAuthBackendTester {
  private authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  /**
   * Test Firebase Phone Authentication configuration
   */
  async testFirebaseConfiguration(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('🔧 Testing Firebase Phone Authentication Configuration...');
      console.log('='.repeat(60));

      // Check if we're in a Node.js environment with Firebase
      const isNode = typeof global !== 'undefined' && typeof global.process !== 'undefined';
      const hasFirebase = typeof global !== 'undefined' && (global as any).firebase;

      console.log(`🌐 Environment: ${isNode ? 'Node.js' : 'Browser/React Native'}`);
      console.log(`🔥 Firebase Available: ${hasFirebase ? '✅' : '❌'}`);

      if (hasFirebase) {
        const apps = (global as any).firebase.apps || [];
        const projectId = apps[0]?.options?.projectId;
        console.log(`📱 Firebase Apps: ${apps.length}`);
        console.log(`📋 Project ID: ${projectId || 'Not found'}`);
      }

      // For React Native testing, Firebase should be initialized
      const firebaseInitialized = hasFirebase && (global as any).firebase.apps?.length > 0;

      if (!firebaseInitialized) {
        return {
          success: false,
          message: 'Firebase not properly initialized in test environment',
          data: { hasFirebase, isNode }
        };
      }

      return {
        success: true,
        message: 'Firebase configuration available for testing',
        data: { hasFirebase, isNode, firebaseApps: (global as any).firebase.apps?.length }
      };

    } catch (error) {
      return {
        success: false,
        message: `Configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { error: error instanceof Error ? error.message : error }
      };
    }
  }

  /**
   * Test phone authentication with Firebase test number (bypasses reCAPTCHA)
   */
  async testFirebaseTestNumber(): Promise<{ success: boolean; message: string; data?: any }> {
    const testPhone = '+15551234567';
    const expectedCode = '123456';

    try {
      console.log('\n🧪 Testing Firebase Phone Auth with test number...');
      console.log(`📞 Phone: ${testPhone}`);
      console.log(`🔐 Expected code: ${expectedCode}`);
      console.log('-'.repeat(50));

      // Step 1: Send verification code
      console.log('📤 Step 1: Sending verification code...');
      const sendResult = await this.authService.signInWithPhoneNumber(testPhone);

      if (!sendResult.success) {
        console.log(`❌ Failed to send code: ${sendResult.error}`);
        return {
          success: false,
          message: `Failed to send verification code: ${sendResult.error}`,
          data: sendResult
        };
      }

      console.log('✅ Verification code sent successfully');
      console.log(`📋 Verification ID received: ${!!sendResult.verificationId}`);

      // Step 2: Verify code (simulate user entering code)
      console.log('\n🔍 Step 2: Verifying code...');
      const verifyResult = await this.authService.verifyPhoneCode(sendResult.verificationId!, expectedCode);

      if (verifyResult.success) {
        console.log('✅ Phone authentication successful!');
        console.log(`👤 User ID: ${verifyResult.user?.uid?.substring(0, 8)}...`);
        console.log(`📧 Email: ${verifyResult.user?.email || 'Not provided'}`);
        console.log(`🆕 New User: ${verifyResult.isNewUser ? 'Yes' : 'No'}`);

        return {
          success: true,
          message: 'Firebase Phone Authentication working correctly with test number!',
          data: {
            userId: verifyResult.user?.uid,
            email: verifyResult.user?.email,
            phoneNumber: testPhone,
            isNewUser: verifyResult.isNewUser,
            verificationId: sendResult.verificationId?.substring(0, 20) + '...'
          }
        };
      } else {
        console.log(`❌ Code verification failed: ${verifyResult.error}`);
        return {
          success: false,
          message: `Code verification failed: ${verifyResult.error}`,
          data: verifyResult
        };
      }

    } catch (error) {
      console.error('💥 Test failed with error:', error);
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { error: error instanceof Error ? error.message : error }
      };
    }
  }

  /**
   * Test phone authentication with real number (tests reCAPTCHA configuration)
   */
  async testRealNumber(phoneNumber: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log(`\n🧪 Testing Firebase Phone Auth with real number...`);
      console.log(`📞 Phone: ${phoneNumber}`);
      console.log('⚠️  Note: This tests reCAPTCHA Enterprise configuration');
      console.log('-'.repeat(50));

      const sendResult = await this.authService.signInWithPhoneNumber(phoneNumber);

      if (!sendResult.success) {
        console.log(`❌ Failed to send code to real number: ${sendResult.error}`);

        // Analyze the error to provide specific guidance
        const error = sendResult.error || '';
        if (error.includes('reCAPTCHA Enterprise configuration')) {
          console.log('🔧 Issue: reCAPTCHA Enterprise needs proper configuration');
          console.log('   Solution: Configure reCAPTCHA Enterprise in Google Cloud Console');
        } else if (error.includes('Phone Authentication is NOT ENABLED')) {
          console.log('🔧 Issue: Phone Authentication disabled in Firebase Console');
          console.log('   Solution: Enable Phone provider in Firebase Console > Authentication > Sign-in method');
        }

        return {
          success: false,
          message: `Failed to send code to real number: ${sendResult.error}`,
          data: sendResult
        };
      }

      console.log('✅ Verification code sent to real number!');
      console.log('📝 Check your phone for the SMS verification code');
      console.log(`📋 Verification ID: ${sendResult.verificationId?.substring(0, 20)}...`);

      return {
        success: true,
        message: 'SMS sent successfully to real number! reCAPTCHA Enterprise is working.',
        data: {
          verificationId: sendResult.verificationId,
          phoneNumber,
          note: 'Use the received SMS code to complete authentication'
        }
      };

    } catch (error) {
      console.error('💥 Real number test failed:', error);
      return {
        success: false,
        message: `Real number test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { error: error instanceof Error ? error.message : error }
      };
    }
  }

  /**
   * Complete authentication with received SMS code
   */
  async completeWithSmsCode(verificationId: string, smsCode: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('\n🔍 Completing authentication with SMS code...');
      console.log(`📋 Verification ID: ${verificationId.substring(0, 20)}...`);
      console.log(`🔐 SMS Code: ${smsCode}`);
      console.log('-'.repeat(50));

      const result = await this.authService.verifyPhoneCode(verificationId, smsCode);

      if (result.success) {
        console.log('✅ Authentication completed successfully!');
        console.log(`👤 User ID: ${result.user?.uid?.substring(0, 8)}...`);
        console.log(`📧 Email: ${result.user?.email || 'Not provided'}`);
        console.log(`🆕 New User: ${result.isNewUser ? 'Yes' : 'No'}`);

        return {
          success: true,
          message: 'Phone authentication completed successfully!',
          data: {
            userId: result.user?.uid,
            email: result.user?.email,
            isNewUser: result.isNewUser
          }
        };
      } else {
        console.log(`❌ Authentication failed: ${result.error}`);
        return {
          success: false,
          message: `Authentication failed: ${result.error}`,
          data: result
        };
      }

    } catch (error) {
      console.error('💥 SMS code verification failed:', error);
      return {
        success: false,
        message: `SMS verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { error: error instanceof Error ? error.message : error }
      };
    }
  }

  /**
   * Run comprehensive phone authentication backend tests
   */
  async runComprehensiveBackendTest(): Promise<{ success: boolean; message: string; results: any[] }> {
    console.log('🚀 Starting comprehensive Firebase Phone Authentication backend test...');
    console.log('='.repeat(70));

    const results = [];

    // Test 1: Firebase configuration
    console.log('\n📋 Test 1: Firebase Configuration Check');
    console.log('-'.repeat(50));
    const configResult = await this.testFirebaseConfiguration();
    results.push({ test: 'firebase_config', ...configResult });

    if (!configResult.success) {
      console.log('\n❌ Firebase configuration failed - cannot proceed with tests');
      return {
        success: false,
        message: 'Firebase configuration issues detected',
        results
      };
    }

    // Test 2: Firebase test number (tests Phone Auth enablement)
    console.log('\n📋 Test 2: Firebase Test Number (+15551234567)');
    console.log('-'.repeat(50));
    const testResult = await this.testFirebaseTestNumber();
    results.push({ test: 'firebase_test_number', ...testResult });

    if (!testResult.success) {
      console.log('\n❌ Firebase test number failed - Phone Authentication may not be enabled');
      console.log('🔧 Solution: Enable Phone provider in Firebase Console > Authentication > Sign-in method');
      return {
        success: false,
        message: 'Phone Authentication not enabled in Firebase Console',
        results
      };
    }

    // Test 3: Real number attempt (tests reCAPTCHA configuration)
    console.log('\n📋 Test 3: Real Number reCAPTCHA Test (+33635551484)');
    console.log('-'.repeat(50));
    const realResult = await this.testRealNumber('+33635551484');
    results.push({ test: 'real_number_recaptcha', ...realResult });

    // Summary
    console.log('\n📊 Backend Test Results Summary:');
    console.log('='.repeat(70));

    const configPassed = results.find(r => r.test === 'firebase_config')?.success;
    const firebaseTestPassed = results.find(r => r.test === 'firebase_test_number')?.success;
    const realNumberWorked = results.find(r => r.test === 'real_number_recaptcha')?.success;

    if (configPassed && firebaseTestPassed && realNumberWorked) {
      console.log('✅ ALL TESTS PASSED - Phone Authentication fully functional!');
      console.log('🔐 reCAPTCHA Enterprise properly configured');
      console.log('📱 Mobile authentication ready for production');
      return {
        success: true,
        message: 'Phone authentication backend is fully functional with security enabled',
        results
      };
    } else if (configPassed && firebaseTestPassed && !realNumberWorked) {
      console.log('⚠️  PARTIAL SUCCESS - Basic setup works, reCAPTCHA Enterprise needs configuration');
      console.log('🔧 Next step: Configure reCAPTCHA Enterprise in Google Cloud Console');
      return {
        success: true,
        message: 'Basic phone authentication works, but reCAPTCHA Enterprise needs configuration for real numbers',
        results
      };
    } else {
      console.log('❌ TESTS FAILED - Phone Authentication backend has issues');
      console.log('🔧 Check Firebase Console configuration');
      return {
        success: false,
        message: 'Phone authentication backend configuration issues detected',
        results
      };
    }
  }
}

// Backend test utilities - no frontend dependencies
export const phoneAuthBackendTestUtils = {
  /**
   * Test Firebase configuration
   */
  async testFirebaseConfiguration(): Promise<{ success: boolean; message: string; data?: any }> {
    const tester = new PhoneAuthBackendTester();
    return tester.testFirebaseConfiguration();
  },

  /**
   * Test Firebase Phone Authentication with test number
   */
  async testFirebaseTestNumber(): Promise<{ success: boolean; message: string; data?: any }> {
    const tester = new PhoneAuthBackendTester();
    return tester.testFirebaseTestNumber();
  },

  /**
   * Test with real phone number (reCAPTCHA test)
   */
  async testRealNumber(phoneNumber: string): Promise<{ success: boolean; message: string; data?: any }> {
    const tester = new PhoneAuthBackendTester();
    return tester.testRealNumber(phoneNumber);
  },

  /**
   * Complete authentication with SMS code
   */
  async completeWithSmsCode(verificationId: string, smsCode: string): Promise<{ success: boolean; message: string; data?: any }> {
    const tester = new PhoneAuthBackendTester();
    return tester.completeWithSmsCode(verificationId, smsCode);
  },

  /**
   * Run comprehensive backend tests
   */
  async runComprehensiveBackendTest(): Promise<{ success: boolean; message: string; results: any[] }> {
    const tester = new PhoneAuthBackendTester();
    return tester.runComprehensiveBackendTest();
  }
};
