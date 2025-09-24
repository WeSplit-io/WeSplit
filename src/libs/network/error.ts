/**
 * Network Error Handling Utilities
 * Centralized error handling for network operations
 */

export interface NetworkError extends Error {
  code?: string;
  status?: number;
  response?: any;
  isRetryable?: boolean;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  isRateLimitError?: boolean;
}

/**
 * Create a network error
 */
function createNetworkError(
  message: string,
  options: {
    code?: string;
    status?: number;
    response?: any;
    isRetryable?: boolean;
  } = {}
): NetworkError {
  const error = new Error(message) as NetworkError;
  error.code = options.code;
  error.status = options.status;
  error.response = options.response;
  error.isRetryable = options.isRetryable ?? true;
  error.isNetworkError = true;
  error.isTimeoutError = options.code === 'TIMEOUT';
  error.isRateLimitError = options.status === 429;
  
  return error;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Network errors
  if (error.code === 'NETWORK_ERROR' || 
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED') {
    return true;
  }

  // Timeout errors
  if (error.code === 'TIMEOUT' || error.isTimeoutError) {
    return true;
  }

  // HTTP status codes
  if (error.status) {
    // 5xx server errors
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // Rate limiting
    if (error.status === 429) {
      return true;
    }
    
    // Some 4xx errors might be retryable
    if (error.status === 408 || error.status === 409) {
      return true;
    }
  }

  // Check explicit retryable flag
  if (error.isRetryable === true) {
    return true;
  }

  return false;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return error?.isNetworkError === true || 
         error?.code === 'NETWORK_ERROR' ||
         error?.code === 'ECONNRESET' ||
         error?.code === 'ENOTFOUND' ||
         error?.code === 'ECONNREFUSED';
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
  return error?.isTimeoutError === true || 
         error?.code === 'TIMEOUT' ||
         error?.name === 'TimeoutError';
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: any): boolean {
  return error?.isRateLimitError === true || 
         error?.status === 429;
}

/**
 * Get error message for user display
 */
export function getUserErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';

  // Network errors
  if (isNetworkError(error)) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }

  // Timeout errors
  if (isTimeoutError(error)) {
    return 'Request timed out. Please try again.';
  }

  // Rate limit errors
  if (isRateLimitError(error)) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // HTTP status codes
  if (error.status) {
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication failed. Please log in again.';
      case 403:
        return 'Access denied. You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 408:
        return 'Request timed out. Please try again.';
      case 409:
        return 'Conflict. The resource has been modified by another user.';
      case 422:
        return 'Invalid data provided. Please check your input.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Bad gateway. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. Please try again later.';
      default:
        return `Server error (${error.status}). Please try again later.`;
    }
  }

  // Custom error messages
  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get error code for logging
 */
export function getErrorCode(error: any): string {
  if (error?.code) return error.code;
  if (error?.status) return `HTTP_${error.status}`;
  if (error?.name) return error.name;
  return 'UNKNOWN_ERROR';
}

/**
 * Log error with context
 */
export function logError(error: any, context: string = 'Network operation'): void {
  const errorCode = getErrorCode(error);
  const userMessage = getUserErrorMessage(error);
  
  console.error(`[${context}] ${errorCode}:`, {
    message: error.message,
    code: error.code,
    status: error.status,
    isRetryable: isRetryableError(error),
    userMessage
  });
}

/**
 * Wrap async function with error handling
 */
function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string = 'Network operation'
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, context);
      throw error;
    }
  }) as T;
}

/**
 * Handle error and return fallback value
 */
export async function handleErrorWithFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  context: string = 'Network operation'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logError(error, context);
    return fallback;
  }
}

/**
 * Error recovery strategies
 */
const ErrorRecovery = {
  /**
   * Retry with exponential backoff
   */
  retry: async <T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts || !isRetryableError(error)) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  },

  /**
   * Fallback to cached data
   */
  withCache: async <T>(
    operation: () => Promise<T>,
    cacheKey: string,
    cache: Map<string, { data: T; timestamp: number }>,
    maxAge: number = 300000 // 5 minutes
  ): Promise<T> => {
    try {
      const result = await operation();
      
      // Cache the result
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      // Try to get from cache
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < maxAge) {
        return cached.data;
      }
      
      throw error;
    }
  },

  /**
   * Fallback to default value
   */
  withDefault: async <T>(
    operation: () => Promise<T>,
    defaultValue: T
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (isRetryableError(error)) {
        throw error;
      }
      return defaultValue;
    }
  }
};
