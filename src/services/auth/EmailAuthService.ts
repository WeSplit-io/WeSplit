/**
 * Email Authentication Service
 * Handles email-specific authentication operations
 */

import { logger } from '../analytics/loggingService';
import { sendVerificationCode, verifyCode, checkEmailUserExists } from '../data/firebaseFunctionsService';

/**
 * Test/Placeholder credentials for iOS team testing
 * 
 * Usage:
 * - Email: test@wesplit.app
 * - Code: 1234
 * 
 * These credentials bypass the actual email verification flow and allow
 * testing the authentication process without needing to receive real emails.
 * 
 * NOTE: Enabled in both development and production for iOS team testing
 */
const TEST_EMAIL = 'test@wesplit.app';
const TEST_CODE = '1234';

export interface EmailAuthResult {
  success: boolean;
  verificationId?: string;
  expiresIn?: number;
  user?: any;
  customToken?: string | null;
  error?: string;
}

export class EmailAuthService {
  /**
   * Check if email user exists
   */
  static async checkUserExists(email: string): Promise<{ success: boolean; userExists: boolean; userId?: string; error?: string }> {
    // TEST MODE: Always return that test user exists (enabled for iOS team testing)
    if (email.trim().toLowerCase() === TEST_EMAIL.toLowerCase()) {
      logger.info('🧪 TEST MODE: Placeholder email detected - returning test user exists', { email: TEST_EMAIL }, 'EmailAuthService');
      return {
        success: true,
        userExists: true,
        userId: 'test_user_placeholder',
        error: undefined
      };
    }
    
    try {
      logger.info('Checking if email user exists', { email: email.substring(0, 5) + '...' }, 'EmailAuthService');

      // checkEmailUserExists returns the response directly (not wrapped in data)
      const result = await checkEmailUserExists(email);

      // Add detailed logging to debug the issue
      if (__DEV__) {
        logger.debug('checkEmailUserExists result', { 
          result, 
          hasResult: !!result,
          resultType: typeof result,
          resultKeys: result ? Object.keys(result) : []
        }, 'EmailAuthService');
      }

      if (!result) {
        logger.error('Email user existence check returned no result', null, 'EmailAuthService');
        return { success: false, userExists: false, error: 'No response received' };
      }

      // Safely access properties with null checks
      const success = result?.success ?? false;
      const userExists = result?.userExists ?? false;
      const userId = result?.userId;
      const message = result?.message;

      if (__DEV__) {
        logger.debug('Parsed checkEmailUserExists result', { 
          success, 
          userExists, 
          userId, 
          message 
        }, 'EmailAuthService');
      }

      return {
        success,
        userExists,
        userId,
        error: message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Email user existence check failed', { 
        error: errorMessage,
        stack: errorStack,
        errorType: typeof error,
        errorKeys: error ? Object.keys(error) : []
      }, 'EmailAuthService');
      return { success: false, userExists: false, error: errorMessage };
    }
  }

  /**
   * Send email verification code
   */
  static async sendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Sending email verification code', { email: email.substring(0, 5) + '...' }, 'EmailAuthService');

      const result = await sendVerificationCode(email);

      if (result.success) {
        logger.info('Email verification code sent successfully', { email: email.substring(0, 5) + '...' }, 'EmailAuthService');
        return { success: true };
      } else {
        logger.error('Failed to send email verification code', { error: result.error }, 'EmailAuthService');
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Email verification code sending failed', { error: errorMessage }, 'EmailAuthService');
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Verify email code
   */
  static async verifyCode(email: string, code: string): Promise<EmailAuthResult> {
    try {
      logger.info('Verifying email code', {
        email: email.substring(0, 5) + '...',
        codeLength: code.length
      }, 'EmailAuthService');

      const result = await verifyCode(email, code);

      if (result.success && result.user) {
        logger.info('Email code verified successfully', {
          userId: result.user.id,
          email: email.substring(0, 5) + '...',
          hasCustomToken: !!result.customToken
        }, 'EmailAuthService');

        return {
          success: true,
          user: result.user,
          customToken: result.customToken || undefined
        };
      } else {
        logger.error('Email code verification failed', { error: result.message }, 'EmailAuthService');
        return {
          success: false,
          error: result.message || 'Invalid verification code'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Email code verification error', { error: errorMessage }, 'EmailAuthService');
      return { success: false, error: errorMessage };
    }
  }
}
