/**
 * Service Error Handler
 * Provides standardized error handling patterns for service methods
 * Extends the base ErrorHandler with service-specific patterns
 */

import { ErrorHandler, ErrorContext, ErrorHandlingOptions } from './errorHandler';
import { logger } from '../../services/core/loggingService';

export interface ServiceErrorResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface ServiceErrorOptions extends ErrorHandlingOptions {
  returnErrorResult?: boolean;
  errorCode?: string;
  fallbackData?: any;
}

/**
 * Service Error Handler with standardized patterns
 */
export class ServiceErrorHandler {
  /**
   * Handle service method errors with standardized return format
   */
  static async handleServiceError<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: ServiceErrorOptions = {}
  ): Promise<ServiceErrorResult<T>> {
    const {
      returnErrorResult = true,
      errorCode,
      fallbackData,
      logError = true,
      showAlert = false, // Services typically don't show alerts directly
      ...errorOptions
    } = options;

    try {
      const result = await operation();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const finalErrorCode = errorCode || this.getErrorCode(error);

      // Log error if requested
      if (logError) {
        logger.error('Service operation failed', {
          error: errorMessage,
          errorCode: finalErrorCode,
          context,
          timestamp: new Date().toISOString()
        });
      }

      // Handle error with base ErrorHandler (without showing alerts for services)
      ErrorHandler.handleError(error, context, {
        ...errorOptions,
        showAlert,
        logError: false // We already logged above
      });

      if (returnErrorResult) {
        return {
          success: false,
          error: errorMessage,
          errorCode: finalErrorCode,
          data: fallbackData
        };
      }

      // Re-throw if not returning error result
      throw error;
    }
  }

  /**
   * Handle service method errors with retry logic
   */
  static async handleServiceErrorWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: ServiceErrorOptions & { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<ServiceErrorResult<T>> {
    const { maxRetries = 3, retryDelay = 1000, ...errorOptions } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          data: result
        };
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          return this.handleServiceError(
            () => Promise.reject(error),
            context,
            errorOptions
          );
        }

        // Wait before retry (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        logger.warn(`Service operation retry attempt ${attempt}/${maxRetries}`, {
          error: lastError.message,
          context,
          nextRetryIn: delay
        });
      }
    }

    // This should never be reached, but just in case
    return this.handleServiceError(
      () => Promise.reject(lastError),
      context,
      errorOptions
    );
  }

  /**
   * Handle network-related service errors
   */
  static async handleNetworkServiceError<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: ServiceErrorOptions = {}
  ): Promise<ServiceErrorResult<T>> {
    return this.handleServiceError(operation, context, {
      ...options,
      errorCode: 'NETWORK_ERROR',
      retryable: true
    });
  }

  /**
   * Handle validation-related service errors
   */
  static async handleValidationServiceError<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: ServiceErrorOptions = {}
  ): Promise<ServiceErrorResult<T>> {
    return this.handleServiceError(operation, context, {
      ...options,
      errorCode: 'VALIDATION_ERROR',
      retryable: false
    });
  }

  /**
   * Handle authentication-related service errors
   */
  static async handleAuthServiceError<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: ServiceErrorOptions = {}
  ): Promise<ServiceErrorResult<T>> {
    return this.handleServiceError(operation, context, {
      ...options,
      errorCode: 'AUTH_ERROR',
      retryable: false
    });
  }

  /**
   * Handle rate limiting service errors
   */
  static async handleRateLimitServiceError<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: ServiceErrorOptions = {}
  ): Promise<ServiceErrorResult<T>> {
    return this.handleServiceError(operation, context, {
      ...options,
      errorCode: 'RATE_LIMIT_ERROR',
      retryable: true
    });
  }

  /**
   * Get error code based on error type
   */
  private static getErrorCode(error: any): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
        return 'NETWORK_ERROR';
      }
      
      if (message.includes('auth') || message.includes('unauthorized') || message.includes('permission')) {
        return 'AUTH_ERROR';
      }
      
      if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
        return 'VALIDATION_ERROR';
      }
      
      if (message.includes('timeout') || message.includes('timed out')) {
        return 'TIMEOUT_ERROR';
      }
      
      if (message.includes('rate limit') || message.includes('429') || message.includes('overloaded')) {
        return 'RATE_LIMIT_ERROR';
      }
      
      if (message.includes('not found') || message.includes('404')) {
        return 'NOT_FOUND_ERROR';
      }
      
      if (message.includes('server') || message.includes('500') || message.includes('internal')) {
        return 'SERVER_ERROR';
      }
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Check if error is retryable
   */
  private static isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Network errors are retryable
      if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
        return true;
      }
      
      // Timeout errors are retryable
      if (message.includes('timeout') || message.includes('timed out')) {
        return true;
      }
      
      // Rate limiting errors are retryable
      if (message.includes('rate limit') || message.includes('429') || message.includes('overloaded')) {
        return true;
      }
      
      // Server errors are retryable
      if (message.includes('server') || message.includes('500') || message.includes('internal')) {
        return true;
      }
      
      // Authentication errors are NOT retryable
      if (message.includes('auth') || message.includes('unauthorized') || message.includes('permission')) {
        return false;
      }
      
      // Validation errors are NOT retryable
      if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
        return false;
      }
      
      // Not found errors are NOT retryable
      if (message.includes('not found') || message.includes('404')) {
        return false;
      }
    }
    
    // Default to not retryable for unknown errors
    return false;
  }
}

export default ServiceErrorHandler;
