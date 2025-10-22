/**
 * Standardized Error Handling Utility
 * Provides consistent error handling patterns across the app
 */

import { Alert } from 'react-native';
import { logger } from '../../services/core/loggingService';

export interface ErrorContext {
  screen?: string;
  function?: string;
  operation?: string;
  userId?: string;
  additionalData?: any;
}

export interface ErrorHandlingOptions {
  showAlert?: boolean;
  logError?: boolean;
  retryable?: boolean;
  fallbackAction?: () => void;
  customMessage?: string;
}

export class ErrorHandler {
  /**
   * Handle errors with standardized patterns
   */
  static handleError(
    error: any,
    context: ErrorContext,
    options: ErrorHandlingOptions = {}
  ): void {
    const {
      showAlert = true,
      logError = true,
      retryable = false,
      fallbackAction,
      customMessage
    } = options;

    // Log error if requested
    if (logError) {
      logger.error('Error occurred', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context,
        timestamp: new Date().toISOString()
      });
    }

    // Show alert if requested
    if (showAlert) {
      const message = customMessage || this.getErrorMessage(error, context);
      const title = this.getErrorTitle(error, context);
      
      if (retryable && fallbackAction) {
        Alert.alert(
          title,
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: fallbackAction }
          ]
        );
      } else {
        Alert.alert(title, message);
      }
    }
  }

  /**
   * Handle async operations with standardized error handling
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: ErrorHandlingOptions = {}
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context, options);
      return null;
    }
  }

  /**
   * Get user-friendly error message
   */
  private static getErrorMessage(error: any, context: ErrorContext): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Network errors
      if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
        return 'Network error. Please check your connection and try again.';
      }
      
      // Authentication errors
      if (message.includes('auth') || message.includes('unauthorized') || message.includes('permission')) {
        return 'Authentication error. Please sign in again.';
      }
      
      // Validation errors
      if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
        return 'Invalid data provided. Please check your inputs and try again.';
      }
      
      // Timeout errors
      if (message.includes('timeout') || message.includes('timed out')) {
        return 'Request timed out. Please try again.';
      }
      
      // Rate limiting
      if (message.includes('rate limit') || message.includes('429') || message.includes('overloaded')) {
        return 'Service is busy. Please wait a moment and try again.';
      }
      
      // Offline errors
      if (message.includes('offline') || message.includes('no internet')) {
        return 'You are currently offline. Please check your connection and try again.';
      }
      
      // Generic error message
      return `Failed to ${context.operation || 'complete operation'}. Please try again.`;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Get appropriate error title
   */
  private static getErrorTitle(error: any, context: ErrorContext): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('network') || message.includes('connection')) {
        return 'Connection Error';
      }
      
      if (message.includes('auth') || message.includes('unauthorized')) {
        return 'Authentication Error';
      }
      
      if (message.includes('validation') || message.includes('invalid')) {
        return 'Validation Error';
      }
      
      if (message.includes('timeout')) {
        return 'Timeout Error';
      }
      
      if (message.includes('rate limit') || message.includes('429')) {
        return 'Service Busy';
      }
    }
    
    return 'Error';
  }

  /**
   * Handle specific error types with custom logic
   */
  static handleNetworkError(error: any, context: ErrorContext, retryAction?: () => void): void {
    this.handleError(error, context, {
      showAlert: true,
      logError: true,
      retryable: true,
      fallbackAction: retryAction,
      customMessage: 'Network error. Please check your connection and try again.'
    });
  }

  static handleAuthError(error: any, context: ErrorContext): void {
    this.handleError(error, context, {
      showAlert: true,
      logError: true,
      customMessage: 'Authentication error. Please sign in again.'
    });
  }

  static handleValidationError(error: any, context: ErrorContext): void {
    this.handleError(error, context, {
      showAlert: true,
      logError: true,
      customMessage: 'Invalid data provided. Please check your inputs and try again.'
    });
  }

  static handleRateLimitError(error: any, context: ErrorContext, retryAction?: () => void): void {
    this.handleError(error, context, {
      showAlert: true,
      logError: true,
      retryable: true,
      fallbackAction: retryAction,
      customMessage: 'Service is busy. Please wait a moment and try again.'
    });
  }
}

export default ErrorHandler;
