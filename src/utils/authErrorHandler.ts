/**
 * Enhanced Authentication Error Handler
 * Provides better error handling and user feedback for authentication issues
 */

import { Alert } from 'react-native';
import { logger } from '../services/loggingService';

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export class AuthErrorHandler {
  /**
   * Handle authentication errors with user-friendly messages
   */
  static handleAuthError(error: any, context: string = 'Authentication'): void {
    const authError = this.parseError(error);
    
    logger.error(`${context} Error`, {
      code: authError.code,
      message: authError.message,
      details: authError.details
    }, 'AuthErrorHandler');

    // Show user-friendly error message
    this.showUserFriendlyError(authError);
  }

  /**
   * Parse error into standardized format
   */
  private static parseError(error: any): AuthError {
    if (error?.code && error?.message) {
      return {
        code: error.code,
        message: error.message,
        details: error
      };
    }

    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        details: error
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: error
    };
  }

  /**
   * Show user-friendly error message based on error code
   */
  private static showUserFriendlyError(error: AuthError): void {
    let title = 'Authentication Error';
    let message = 'Please try again.';
    let actions = [{ text: 'OK' }];

    switch (error.code) {
      case 'auth/network-request-failed':
        title = 'Network Error';
        message = 'Please check your internet connection and try again.';
        actions = [
          { text: 'Retry', onPress: () => this.retryAuth() },
          { text: 'Cancel' }
        ];
        break;

      case 'auth/too-many-requests':
        title = 'Too Many Attempts';
        message = 'Please wait a few minutes before trying again.';
        break;

      case 'auth/invalid-email':
        title = 'Invalid Email';
        message = 'Please enter a valid email address.';
        break;

      case 'auth/user-disabled':
        title = 'Account Disabled';
        message = 'Your account has been disabled. Please contact support.';
        break;

      case 'auth/user-not-found':
        title = 'Account Not Found';
        message = 'No account found with this email address.';
        break;

      case 'auth/wrong-password':
        title = 'Incorrect Password';
        message = 'The password you entered is incorrect.';
        break;

      case 'auth/email-already-in-use':
        title = 'Email Already in Use';
        message = 'An account with this email already exists.';
        break;

      case 'auth/weak-password':
        title = 'Weak Password';
        message = 'Please choose a stronger password.';
        break;

      case 'auth/operation-not-allowed':
        title = 'Sign-in Method Disabled';
        message = 'This sign-in method is currently disabled.';
        break;

      case 'auth/requires-recent-login':
        title = 'Recent Login Required';
        message = 'Please sign in again to complete this action.';
        break;

      case 'auth/invalid-credential':
        title = 'Invalid Credentials';
        message = 'The credentials provided are invalid.';
        break;

      case 'auth/credential-already-in-use':
        title = 'Credential Already in Use';
        message = 'This credential is already associated with another account.';
        break;

      case 'auth/invalid-verification-code':
        title = 'Invalid Verification Code';
        message = 'The verification code you entered is incorrect.';
        break;

      case 'auth/invalid-verification-id':
        title = 'Invalid Verification ID';
        message = 'The verification ID is invalid. Please request a new code.';
        break;

      case 'auth/missing-verification-code':
        title = 'Missing Verification Code';
        message = 'Please enter the verification code.';
        break;

      case 'auth/missing-verification-id':
        title = 'Missing Verification ID';
        message = 'Please request a new verification code.';
        break;

      case 'auth/quota-exceeded':
        title = 'Quota Exceeded';
        message = 'Too many requests. Please try again later.';
        break;

      case 'auth/app-deleted':
        title = 'App Deleted';
        message = 'This app has been deleted from Firebase.';
        break;

      case 'auth/keychain-error':
        title = 'Keychain Error';
        message = 'There was an error accessing the device keychain.';
        break;

      case 'auth/internal-error':
        title = 'Internal Error';
        message = 'An internal error occurred. Please try again.';
        break;

      default:
        if (error.message.includes('network') || error.message.includes('connection')) {
          title = 'Network Error';
          message = 'Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          title = 'Timeout Error';
          message = 'The request timed out. Please try again.';
        } else {
          message = error.message || 'An unexpected error occurred. Please try again.';
        }
    }

    Alert.alert(title, message, actions);
  }

  /**
   * Retry authentication (placeholder for retry logic)
   */
  private static retryAuth(): void {
    // This would be implemented by the calling component
    logger.info('User requested auth retry', null, 'AuthErrorHandler');
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: any): boolean {
    const retryableCodes = [
      'auth/network-request-failed',
      'auth/internal-error',
      'auth/quota-exceeded'
    ];

    if (error?.code && retryableCodes.includes(error.code)) {
      return true;
    }

    if (error?.message) {
      const message = error.message.toLowerCase();
      return message.includes('network') || 
             message.includes('connection') || 
             message.includes('timeout');
    }

    return false;
  }

  /**
   * Get retry delay for error
   */
  static getRetryDelay(error: any): number {
    switch (error?.code) {
      case 'auth/too-many-requests':
        return 60000; // 1 minute
      case 'auth/quota-exceeded':
        return 300000; // 5 minutes
      default:
        return 5000; // 5 seconds
    }
  }
}

export default AuthErrorHandler;
