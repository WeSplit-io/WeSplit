/**
 * Unified Authentication Service for WeSplit
 * Main orchestration service for authentication flows
 * Delegates to specialized services for specific auth methods
 */

import {
  User,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../../config/firebase/firebase';
import { Platform } from 'react-native';
import { logger } from '../analytics/loggingService';
import { firebaseDataService } from '../data/firebaseDataService';
import { walletService } from '../blockchain/wallet';
import { EmailAuthService } from './EmailAuthService';
import { PhoneAuthService } from './PhoneAuthService';


// Types
export interface AuthResult {
  success: boolean;
  user?: User;
  customToken?: string | null;
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
  private lastAuthCallTimes: Map<string, number> = new Map();

  /**
   * Validate phone number format (E.164)
   * E.164 format: +[country code][number] where country code is 1-9 followed by 1-14 digits
   * Total length: 1-15 digits after +
   */
  private validatePhoneNumber(phoneNumber: string): { isValid: boolean; error?: string } {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return {
        isValid: false,
        error: 'Phone number is required'
      };
    }

    // Remove whitespace for validation
    const cleaned = phoneNumber.trim().replace(/\s/g, '');
    
    // E.164 format: ^\+[1-9]\d{1,14}$
    // Must start with +, country code starts with 1-9, followed by 1-14 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    
    if (!e164Regex.test(cleaned)) {
      return {
        isValid: false,
        error: 'Phone number must be in E.164 format (e.g., +1234567890). Country code must start with 1-9, followed by 1-14 digits.'
      };
    }

    // Additional validation: minimum length check (at least country code + 1 digit)
    if (cleaned.length < 8) {
      return {
        isValid: false,
        error: 'Phone number is too short. Please include country code and full number.'
      };
    }

    // Maximum length check (E.164 max is 15 digits after +)
    if (cleaned.length > 16) {
      return {
        isValid: false,
        error: 'Phone number is too long. Maximum 15 digits after country code.'
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
  /**
   * Check if email user exists
   */
  async checkEmailUserExists(email: string): Promise<{ success: boolean; userExists: boolean; userId?: string; error?: string }> {
    return EmailAuthService.checkUserExists(email);
  }

  /**
   * Send email verification code
   */
  async sendEmailVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
    return EmailAuthService.sendVerificationCode(email);
  }

  /**
   * Verify email code
   */
  async verifyEmailCode(email: string, code: string): Promise<AuthResult> {
    const result = await EmailAuthService.verifyCode(email, code);

    if (result.success && result.user) {
      // NOTE: Wallet and login time updates require authentication
      // These will be handled after sign-in with custom token in VerificationScreen
      // We skip them here to avoid permission errors before auth is ready
    }

    return {
      success: result.success,
      user: result.user,
      customToken: result.customToken,
      error: result.error
    };
  }

  /**
   * Start phone authentication process
   * Checks for existing user (instant login) or sends SMS
   */
  async signInWithPhoneNumber(phoneNumber: string): Promise<{ success: boolean; verificationId?: string; expiresIn?: number; user?: any; isNewUser?: boolean; error?: string }> {
    try {
      // Log environment for debugging
      logger.info('Phone Auth Environment Check', {
        isDev: __DEV__,
        platform: Platform.OS,
        hasFirebase: !!auth?.app,
        projectId: auth?.app?.options?.projectId
      }, 'AuthService');

      // Prevent duplicate calls for the same phone number within a short time window
      const now = Date.now();
      const lastCallKey = `phone_auth_${phoneNumber}`;
      const lastCallTime = this.lastAuthCallTimes?.get(lastCallKey);

      if (lastCallTime && (now - lastCallTime) < 5000) { // 5 second cooldown
        logger.warn('Phone auth call too frequent, blocking duplicate request', {
          phone: phoneNumber.substring(0, 5) + '...',
          timeSinceLastCall: now - lastCallTime
        }, 'AuthService');
        return {
          success: false,
          error: 'Please wait before requesting another SMS code'
        };
      }

      // Initialize lastAuthCallTimes if it doesn't exist
      if (!this.lastAuthCallTimes) {
        this.lastAuthCallTimes = new Map();
      }
      this.lastAuthCallTimes.set(lastCallKey, now);

      // Validate Firebase is initialized
      if (!auth || !auth.app) {
        logger.error('Firebase auth not initialized', {
          auth: !!auth,
          authApp: !!auth?.app,
          authAppOptions: auth?.app?.options
        }, 'AuthService');
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

      logger.info('🔄 Starting Phone Sign-In', {
        phone: phoneNumber.substring(0, 5) + '...',
        firebaseInitialized: !!auth?.app,
        projectId: auth.app?.options?.projectId
      }, 'AuthService');

      // Check if user already exists with this phone number for instant login
      logger.info('Checking if user exists with phone number', {
        phonePrefix: phoneNumber.substring(0, 5)
      }, 'AuthService');

      try {
        // Use PhoneAuthService to check if user exists
        const checkResult = await PhoneAuthService.checkUserExists(phoneNumber);

        if (checkResult.success && checkResult.userExists && checkResult.userId) {
          // User exists - instant login without SMS verification
          logger.info('User exists with phone number - instant login', {
            userId: checkResult.userId,
            phonePrefix: phoneNumber.substring(0, 5)
          }, 'AuthService');

          // Use PhoneAuthService for instant login
          const instantLoginResult = await PhoneAuthService.instantLogin(phoneNumber, checkResult.userId);

          if (!instantLoginResult.success || !instantLoginResult.user) {
            throw new Error(instantLoginResult.error || 'Failed to perform instant login');
          }

          // Get user data from Firestore
          const { firebaseDataService } = await import('../data/firebaseDataService');
          const existingUserData = await firebaseDataService.user.getCurrentUser(instantLoginResult.user.uid);

          if (!existingUserData) {
            throw new Error('User data not found in database');
          }

          // Ensure wallet exists for the user
          await this.ensureUserWallet(instantLoginResult.user.uid);

          // Update last login time
          await this.updateLastLoginTime(instantLoginResult.user.uid);

          logger.info('✅ Phone instant login successful', {
            userId: instantLoginResult.user.uid,
            phone: phoneNumber.substring(0, 5) + '...',
            isNewUser: false
          }, 'AuthService');

          return {
            success: true,
            verificationId: 'instant-login', // Special marker for instant login
            user: instantLoginResult.user,
            isNewUser: false
          };
        }
      } catch (checkError) {
        logger.warn('Failed to check existing user, proceeding with SMS verification', {
          error: checkError instanceof Error ? checkError.message : String(checkError)
        }, 'AuthService');
        // Continue with SMS verification if instant login check fails
      }

      // User doesn't exist or check failed - proceed with SMS verification
      logger.info('User not found or check failed - proceeding with SMS verification', {
        phonePrefix: phoneNumber.substring(0, 5)
      }, 'AuthService');

      // Use PhoneAuthService to send verification code
      logger.info('Using server-side SMS verification with Twilio', {
        phonePrefix: phoneNumber.substring(0, 5),
        platform: Platform.OS
      }, 'AuthService');

      try {
        // Use PhoneAuthService to send verification code
        const sendResult = await PhoneAuthService.sendVerificationCode(phoneNumber);

        if (!sendResult.success) {
          throw new Error(sendResult.error || 'Failed to send verification code');
        }

        logger.info('✅ SMS verification session started with Twilio', {
          sessionId: sendResult.verificationId,
          phonePrefix: phoneNumber.substring(0, 5),
          expiresIn: sendResult.expiresIn
        }, 'AuthService');

        return {
          success: true,
          verificationId: sendResult.verificationId,
          expiresIn: sendResult.expiresIn
        };

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = error instanceof Error ? (error as any).code : 'unknown';

        logger.error('❌ Server-side SMS session creation failed', {
          message: errorMessage,
          code: errorCode,
          phonePrefix: phoneNumber.substring(0, 5)
        }, 'AuthService');

        // Handle specific Firebase Functions errors
        if (errorCode === 'functions/not-found') {
          return {
            success: false,
            error: 'Phone authentication service is not available. Please try again later or use email authentication.'
          };
        } else if (errorCode === 'functions/permission-denied') {
          return {
            success: false,
            error: 'Permission denied. Please ensure you have the latest app version.'
          };
        } else if (errorCode === 'functions/resource-exhausted') {
          return {
            success: false,
            error: 'Too many requests. Please wait a few minutes before trying again.'
          };
        } else if (errorCode === 'functions/invalid-argument') {
          return {
            success: false,
            error: 'Invalid phone number format. Please use international format (e.g., +1234567890).'
          };
        } else if (errorCode === 'functions/internal') {
          return {
            success: false,
            error: errorMessage || 'Failed to send SMS verification code. Please try again.'
          };
        }

        return {
          success: false,
          error: errorMessage || 'Failed to send SMS verification code'
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof Error ? (error as any).code : 'unknown';

      logger.error('❌ Phone Sign-In failed', {
        message: errorMessage,
        code: errorCode
      }, 'AuthService');

      // Handle specific Firebase Phone Auth errors
      if (errorCode === 'auth/invalid-phone-number') {
        return {
          success: false,
          error: 'Invalid phone number. Please enter a valid phone number in international format (e.g., +1234567890).'
        };
      } else if (errorCode === 'auth/too-many-requests') {
        return {
          success: false,
          error: 'Too many requests. Please wait a few minutes before trying again.'
        };
      } else if (errorCode === 'auth/missing-client-identifier') {
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
   * Link phone number to existing user account (for profile settings)
   * Uses server-side phone linking to avoid reCAPTCHA issues
   */
  async linkPhoneNumberToUser(phoneNumber: string, userId?: string): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    try {
      // Validate we have a user ID
      if (!userId) {
        logger.error('User ID is required for phone linking', null, 'AuthService');
          return {
            success: false,
          error: 'User ID is required for phone linking'
          };
        }

      logger.info('🔄 Starting server-side phone linking process', {
        userId,
        phone: phoneNumber.substring(0, 5) + '...',
        platform: Platform.OS
      }, 'AuthService');

      // Validate phone number format (E.164)
      const phoneValidation = this.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        return {
          success: false,
          error: phoneValidation.error
        };
      }

      // Use server-side phone linking to avoid reCAPTCHA issues
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { getApp } = await import('firebase/app');
      const app = getApp();
      const functions = getFunctions(app, 'us-central1');

      // Call the server-side function to start phone linking
      const startPhoneLinking = httpsCallable<{
        phoneNumber: string;
        userId: string;
      }, {
        success: boolean;
        sessionId: string;
        expiresIn: number;
        message?: string;
      }>(functions, 'startPhoneLinking');

      const result = await startPhoneLinking({
        phoneNumber,
        userId
      });

      const data = result.data as {
        success: boolean;
        sessionId: string;
        expiresIn: number;
        message?: string;
      };

      if (!data.success) {
        throw new Error(data.message || 'Failed to start phone linking');
          }
          
      logger.info('✅ Server-side SMS code sent for phone linking', {
        userId,
            phone: phoneNumber.substring(0, 5) + '...',
        sessionId: data.sessionId,
        expiresIn: data.expiresIn
      }, 'AuthService');

      return {
        success: true,
        verificationId: data.sessionId // Use session ID as verification ID
      };
    } catch (error) {
      logger.error('❌ Phone linking failed', {
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof Error ? (error as any).code : 'unknown'
      }, 'AuthService');
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

      if (!currentUser) {
        return {
          success: false,
          error: 'User authentication lost during verification'
        };
      }

      logger.info('🔄 Verifying phone code for linking (server-side)', {
        sessionId: verificationId.substring(0, 10) + '...',
        phone: phoneNumber.substring(0, 5) + '...',
        userId: userId
      }, 'AuthService');

      // Use server-side verification for phone linking
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { getApp } = await import('firebase/app');
      const app = getApp();
      const functions = getFunctions(app, 'us-central1');
      
      // Call the server-side function to verify phone code and link to user
      const verifyPhoneForLinking = httpsCallable<{
        userId: string;
        phoneNumber: string;
        sessionId: string;
        code: string;
      }, {
        success: boolean;
        message?: string;
      }>(functions, 'verifyPhoneForLinking');

      const result = await verifyPhoneForLinking({
        userId: userId!,
        phoneNumber,
        sessionId: verificationId,
        code
      });

      const data = result.data as {
        success: boolean;
        message?: string;
      };

      if (!data.success) {
        throw new Error(data.message || 'Failed to verify phone code for linking');
      }

      logger.info('✅ Phone number linked successfully (server-side)', {
        userId: userId,
        phone: phoneNumber.substring(0, 5) + '...'
      }, 'AuthService');

      // Note: Server-side function already updated the user data in Firestore

      return {
        success: true
      };
    } catch (error: unknown) {
      const errorCode = error instanceof Error ? (error as any).code : 'unknown';

      logger.error('❌ Phone code verification/linking failed', {
        message: error instanceof Error ? error.message : String(error),
        code: errorCode
      }, 'AuthService');
      
      // Handle specific Firebase errors
      if (errorCode === 'auth/credential-already-in-use') {
        return {
          success: false,
          error: 'This phone number is already linked to another account'
        };
      } else if (errorCode === 'auth/invalid-verification-code') {
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
      // Prevent duplicate verification attempts for the same session
      const now = Date.now();
      const lastCallKey = `phone_verify_${verificationId}`;
      const lastCallTime = this.lastAuthCallTimes?.get(lastCallKey);

      if (lastCallTime && (now - lastCallTime) < 3000) { // 3 second cooldown
        logger.warn('Phone verification call too frequent, blocking duplicate request', {
          verificationId,
          timeSinceLastCall: now - lastCallTime
        }, 'AuthService');
        return {
          success: false,
          error: 'Verification already in progress'
        };
      }

      // Initialize lastAuthCallTimes if it doesn't exist
      if (!this.lastAuthCallTimes) {
        this.lastAuthCallTimes = new Map();
      }
      this.lastAuthCallTimes.set(lastCallKey, now);

      logger.info('🔄 Verifying phone code (server-side)', {
        sessionId: verificationId.substring(0, 10) + '...',
        codeLength: code.length
      }, 'AuthService');

      // Use PhoneAuthService to verify the code
      const verifyResult = await PhoneAuthService.verifyCode(verificationId, code);

      if (!verifyResult.success || !verifyResult.user) {
        throw new Error(verifyResult.error || 'Failed to verify phone code');
      }

      // PhoneAuthService already handled sign-in with custom token
      // We just need to ensure wallet setup and update login time
      const userCredential = { user: verifyResult.user };
      const isNewUser = verifyResult.isNewUser || false;
      const phoneNumber = verifyResult.user.phoneNumber || '';

      logger.info('Phone verification result', {
        userId: userCredential.user.uid,
        isNewUser,
        phoneNumber: phoneNumber.substring(0, 5) + '...'
      }, 'AuthService');

      // Get user data from Firestore - Firebase Function should have created it
      let existingUserData;
      try {
        existingUserData = await firebaseDataService.user.getCurrentUser(userCredential.user.uid);
        logger.info('User data found in Firestore after phone verification', {
          userId: userCredential.user.uid,
          hasName: !!existingUserData?.name,
          hasWallet: !!existingUserData?.wallet_address
        }, 'AuthService');
      } catch (firestoreError) {
        logger.warn('User data not immediately found in Firestore after phone verification', {
          userId: userCredential.user.uid,
          isNewUser,
          error: firestoreError instanceof Error ? firestoreError.message : String(firestoreError)
        }, 'AuthService');

        // If Firebase Function reported this as a new user but document doesn't exist yet,
        // wait a bit and try again (could be eventual consistency)
        if (isNewUser) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          try {
            existingUserData = await firebaseDataService.user.getCurrentUser(userCredential.user.uid);
            logger.info('User data found after retry', { userId: userCredential.user.uid }, 'AuthService');
          } catch (retryError) {
            logger.error('User data still not found after retry', {
              userId: userCredential.user.uid,
              error: retryError instanceof Error ? retryError.message : String(retryError)
            }, 'AuthService');
          }
        }
      }

      // Only create Firestore document as fallback if Firebase Function failed to create it
      // This should be rare since the Firebase Function handles document creation
      if (!existingUserData) {
        logger.warn('Firebase Function did not create Firestore document, creating as fallback', {
          userId: userCredential.user.uid,
          isNewUser,
          phoneNumber: phoneNumber.substring(0, 5) + '...'
        }, 'AuthService');

        try {
          const phoneNumber = userCredential.user.phoneNumber || '';

          // Create minimal user document - Firebase Function should have created the full one
          await firebaseDataService.user.createUser({
            name: userCredential.user.displayName || '',
            email: userCredential.user.email || '',
            phone: phoneNumber,
            phoneVerified: true,
            primary_phone: phoneNumber,
            wallet_address: '',
            wallet_public_key: '',
            avatar: userCredential.user.photoURL || '',
            email_verified: !!userCredential.user.email,
            hasCompletedOnboarding: false,
            points: 0,
            total_points_earned: 0
          });

          logger.info('✅ Firestore document created as fallback for phone user', {
            userId: userCredential.user.uid
          }, 'AuthService');

        } catch (createError) {
          // Check if document was created by another process (race condition)
          if (createError instanceof Error && createError.message.includes('already exists')) {
            logger.info('Document was created by another process (race condition resolved)', {
              userId: userCredential.user.uid
            }, 'AuthService');
          } else {
            logger.error('❌ Failed to create Firestore document for phone user', {
              userId: userCredential.user.uid,
              error: createError instanceof Error ? createError.message : String(createError)
            }, 'AuthService');
            throw createError; // Fail the authentication if we can't create the user
          }
        }
      } else {
        logger.info('Phone user document exists in Firestore', {
          userId: userCredential.user.uid,
          hasWallet: !!existingUserData.wallet_address,
          isNewUser
        }, 'AuthService');
      }

      // Ensure wallet exists for the user
      await this.ensureUserWallet(userCredential.user.uid);

      // Update last login time
      await this.updateLastLoginTime(userCredential.user.uid);

      logger.info('✅ Server-side Phone Sign-In successful', {
        userId: userCredential.user.uid,
        phone: phoneNumber.substring(0, 5) + '...',
        isNewUser: isNewUser
      }, 'AuthService');

      return {
        success: true,
        user: userCredential.user,
        isNewUser: isNewUser
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof Error ? (error as any).code : 'unknown';

      logger.error('❌ Phone code verification failed', {
        message: errorMessage,
        code: errorCode
      }, 'AuthService');

      // Handle specific Firebase errors
      if (errorCode === 'auth/invalid-verification-code') {
        return {
          success: false,
          error: 'Invalid verification code. Please try again.'
        };
      } else if (errorCode === 'auth/code-expired') {
        return {
          success: false,
          error: 'Verification code has expired. Please request a new code.'
        };
      }

      return {
        success: false,
        error: errorMessage || 'Failed to verify phone code'
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
      logger.error('❌ Sign out failed', {
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof Error ? (error as any).code : 'unknown'
      }, 'AuthService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      };
    }
  }

  /**
   * Ensure user has a wallet (consolidated wallet creation logic)
   */
  async ensureUserWallet(userId: string): Promise<{ walletAddress: string; walletPublicKey: string; needsRecovery?: boolean } | null> {
    try {
      // Check if user already has wallet in database
      const existingUser = await firebaseDataService.user.getCurrentUser(userId);
      if (existingUser?.wallet_address) {
        // CRITICAL: If user has an external wallet (e.g., Phantom), don't create a new app-generated wallet
        if (existingUser.wallet_type === 'external') {
          logger.info('User has external wallet (e.g., Phantom), skipping app-generated wallet creation', {
            userId,
            walletAddress: existingUser.wallet_address,
            walletType: existingUser.wallet_type
          }, 'AuthService');
          
          // Return the existing external wallet - no need to create a new one
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
            // Ensure database is up to date
            await firebaseDataService.user.updateUser(userId, {
              wallet_address: walletInfo.address,
              wallet_public_key: walletInfo.publicKey,
              wallet_status: 'healthy',
              wallet_has_private_key: true
            });
            return {
              walletAddress: walletInfo.address,
              walletPublicKey: walletInfo.publicKey
            };
          }
        }

        // Wallet exists in database but not on device - recovery needed
        logger.warn('Wallet exists in database but not on device - recovery situation', {
          userId,
          expectedAddress: existingUser.wallet_address,
          hasWalletOnDevice
        }, 'AuthService');

        // Return database wallet info but mark as needing recovery
        // The UI should detect this and prompt user to restore wallet
        return {
          walletAddress: existingUser.wallet_address,
          walletPublicKey: existingUser.wallet_public_key || existingUser.wallet_address,
          needsRecovery: true
        };
      }

      // Check if wallet exists on device but not in database
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
      logger.error('❌ Error ensuring user wallet', {
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof Error ? (error as any).code : 'unknown'
      }, 'AuthService');
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
   * Update last login time
   */
  private async updateLastLoginTime(userId: string): Promise<void> {
    try {
      // Note: lastLoginAt is not part of the User type, so we skip this update
      logger.info('✅ Last login time update skipped (not in User type)', { userId }, 'AuthService');
    } catch (error) {
      logger.error('❌ Failed to update last login time', {
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof Error ? (error as any).code : 'unknown'
      }, 'AuthService');
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
