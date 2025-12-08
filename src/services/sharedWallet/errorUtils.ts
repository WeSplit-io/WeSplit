/**
 * Shared Wallet Error Utilities
 * Standardized error handling for shared wallet services
 */

import { logger } from '../core';
import type { SHARED_WALLET_ERROR_CODES, ErrorResult } from './types';

/**
 * Custom error class for shared wallet operations
 */
export class SharedWalletError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'SharedWalletError';
  }
}

/**
 * Utility functions for consistent error handling
 */
export const SharedWalletErrors = {
  /**
   * Create a standardized error result
   */
  createError: (
    code: keyof typeof SHARED_WALLET_ERROR_CODES,
    message: string,
    context?: Record<string, any>
  ): ErrorResult => ({
    success: false,
    error: message,
    code: SHARED_WALLET_ERROR_CODES[code],
    context,
  }),

  /**
   * Create a standardized success result
   */
  createSuccess: <T>(data: T) => ({
    success: true as const,
    data,
  }),

  /**
   * Handle errors in service methods with consistent logging
   */
  handleServiceError: (
    error: unknown,
    serviceName: string,
    methodName: string,
    context?: Record<string, any>
  ): ErrorResult => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorCode = error instanceof SharedWalletError
      ? error.code
      : 'UNKNOWN_ERROR';

    logger.error(`${serviceName}.${methodName} failed`, {
      error: errorMessage,
      code: errorCode,
      context,
    }, serviceName);

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      context,
    };
  },

  /**
   * Wrap async operations with consistent error handling
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    serviceName: string,
    methodName: string,
    context?: Record<string, any>
  ): Promise<T | ErrorResult> {
    try {
      return await operation();
    } catch (error) {
      return this.handleServiceError(error, serviceName, methodName, context);
    }
  },
};

