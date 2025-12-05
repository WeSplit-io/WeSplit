/**
 * Email Authentication Service
 * Handles email-specific authentication operations
 */

import { logger } from '../analytics/loggingService';
import { sendVerificationCode, verifyCode, checkEmailUserExists } from '../data/firebaseFunctionsService';

export interface EmailAuthResult {
  success: boolean;
  verificationId?: string;
  expiresIn?: number;
  user?: any;
  error?: string;
}

export class EmailAuthService {
  /**
   * Check if email user exists
   */
  static async checkUserExists(email: string): Promise<{ success: boolean; userExists: boolean; userId?: string; error?: string }> {
    try {
      logger.info('Checking if email user exists', { email: email.substring(0, 5) + '...' }, 'EmailAuthService');

      const result = await checkEmailUserExists(email);
      const data = result.data;

      return {
        success: data.success,
        userExists: data.userExists || false,
        userId: data.userId,
        error: data.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Email user existence check failed', { error: errorMessage }, 'EmailAuthService');
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
          email: email.substring(0, 5) + '...'
        }, 'EmailAuthService');

        return {
          success: true,
          user: result.user
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
