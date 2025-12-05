/**
 * Phone Authentication Service
 * Handles phone-specific authentication operations
 */

import { signInWithCustomToken, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../../config/firebase/firebase';
import { logger } from '../analytics/loggingService';
import { Platform } from 'react-native';

export interface PhoneAuthResult {
  success: boolean;
  verificationId?: string;
  expiresIn?: number;
  user?: any;
  isNewUser?: boolean;
  error?: string;
}

export class PhoneAuthService {
  private static confirmationResult: any = null;

  /**
   * Check if phone user exists for instant login
   */
  static async checkUserExists(phoneNumber: string): Promise<{ success: boolean; userExists: boolean; userId?: string; error?: string }> {
    try {
      const functions = getFunctions();
      const checkUserExists = httpsCallable<{ phoneNumber: string }, {
        success: boolean;
        userExists: boolean;
        userId?: string;
        message?: string;
      }>(functions, 'checkPhoneUserExists');

      const result = await checkUserExists({ phoneNumber });
      const data = result.data;

      return {
        success: data.success,
        userExists: data.userExists || false,
        userId: data.userId,
        error: data.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Phone user existence check failed', { error: errorMessage }, 'PhoneAuthService');
      return { success: false, userExists: false, error: errorMessage };
    }
  }

  /**
   * Get custom token for existing phone user
   */
  static async getCustomToken(userId: string): Promise<{ success: boolean; customToken?: string; error?: string }> {
    try {
      const functions = getFunctions();
      const getUserToken = httpsCallable<{ userId: string }, {
        success: boolean;
        customToken: string;
        message?: string;
      }>(functions, 'getUserCustomToken');

      const result = await getUserToken({ userId });
      const data = result.data;

      if (data.success && data.customToken) {
        return { success: true, customToken: data.customToken };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Custom token retrieval failed', { error: errorMessage }, 'PhoneAuthService');
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send SMS verification code
   */
  static async sendVerificationCode(phoneNumber: string): Promise<PhoneAuthResult> {
    try {
      logger.info('Sending SMS verification code', { phone: phoneNumber.substring(0, 5) + '...' }, 'PhoneAuthService');

      // Use server-side SMS sending with Twilio (bypasses reCAPTCHA issues)
      const functions = getFunctions();
      const startPhoneAuth = httpsCallable<{ phoneNumber: string }, {
        success: boolean;
        sessionId: string;
        expiresIn: number;
        message?: string;
      }>(functions, 'startPhoneAuthentication');

      const result = await startPhoneAuth({ phoneNumber });
      const data = result.data;

      if (!data.success) {
        throw new Error(data.message || 'Failed to start phone authentication');
      }

      logger.info('SMS verification session started', {
        sessionId: data.sessionId,
        phone: phoneNumber.substring(0, 5) + '...',
        expiresIn: data.expiresIn
      }, 'PhoneAuthService');

      return {
        success: true,
        verificationId: data.sessionId,
        expiresIn: data.expiresIn
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('SMS sending failed', { error: errorMessage }, 'PhoneAuthService');
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Verify SMS code
   */
  static async verifyCode(verificationId: string, code: string): Promise<PhoneAuthResult> {
    try {
      logger.info('Verifying SMS code', { codeLength: code.length }, 'PhoneAuthService');

      // Use server-side verification
      const functions = getFunctions();
      const verifyPhoneCodeFunction = httpsCallable<{
        sessionId: string;
        code: string;
      }, {
        success: boolean;
        customToken: string;
        userId: string;
        isNewUser: boolean;
        phoneNumber: string;
        message?: string;
      }>(functions, 'verifyPhoneCode');

      const result = await verifyPhoneCodeFunction({ sessionId: verificationId, code });
      const data = result.data;

      if (!data.success) {
        throw new Error(data.message || 'Failed to verify phone code');
      }

      // Sign in with the custom token
      const userCredential = await signInWithCustomToken(auth, data.customToken);

      logger.info('SMS verification successful', {
        userId: userCredential.user.uid,
        phone: data.phoneNumber.substring(0, 5) + '...',
        isNewUser: data.isNewUser
      }, 'PhoneAuthService');

      return {
        success: true,
        user: userCredential.user,
        isNewUser: data.isNewUser
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof Error ? (error as any).code : 'unknown';

      logger.error('SMS verification failed', {
        message: errorMessage,
        code: errorCode
      }, 'PhoneAuthService');

      // Handle specific Firebase errors
      if (errorCode === 'auth/invalid-verification-code') {
        return { success: false, error: 'Invalid verification code. Please try again.' };
      } else if (errorCode === 'auth/code-expired') {
        return { success: false, error: 'Verification code has expired. Please request a new one.' };
      }

      return { success: false, error: errorMessage || 'Failed to verify phone code' };
    }
  }

  /**
   * Perform instant login for existing phone user
   */
  static async instantLogin(phoneNumber: string, userId: string): Promise<PhoneAuthResult> {
    try {
      logger.info('Performing instant login for phone user', {
        phone: phoneNumber.substring(0, 5) + '...',
        userId
      }, 'PhoneAuthService');

      // Get custom token for the user
      const tokenResult = await this.getCustomToken(userId);
      if (!tokenResult.success || !tokenResult.customToken) {
        throw new Error(tokenResult.error || 'Failed to get custom token');
      }

      // Sign in with custom token
      const userCredential = await signInWithCustomToken(auth, tokenResult.customToken);

      logger.info('Phone instant login successful', {
        userId: userCredential.user.uid,
        phone: phoneNumber.substring(0, 5) + '...',
        isNewUser: false
      }, 'PhoneAuthService');

      return {
        success: true,
        user: userCredential.user,
        isNewUser: false
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Phone instant login failed', { error: errorMessage }, 'PhoneAuthService');
      return { success: false, error: errorMessage };
    }
  }
}
