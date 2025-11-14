/**
 * Structured Error Handler
 * Best Practice: Consistent error handling across the application
 */

/**
 * Error types
 */
const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  BLOCKCHAIN: 'BLOCKCHAIN_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  INTERNAL: 'INTERNAL_ERROR'
};

/**
 * Structured error class
 */
class StructuredError extends Error {
  constructor(message, type, code, details = {}) {
    super(message);
    this.name = 'StructuredError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StructuredError);
    }
  }
  
  toJSON() {
    return {
      message: this.message,
      type: this.type,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Create structured error
 */
function createError(message, type, code, details = {}) {
  return new StructuredError(message, type, code, details);
}

/**
 * Handle error and return structured response
 * Best Practice: Consistent error response format
 */
function handleError(error, context = {}) {
  // If already a StructuredError, return it
  if (error instanceof StructuredError) {
    console.error('Structured error occurred', {
      error: error.toJSON(),
      context
    });
    return error;
  }
  
  // Determine error type
  let errorType = ErrorTypes.INTERNAL;
  let errorCode = 'INTERNAL_ERROR';
  const errorMessage = error?.message || String(error);
  const errorString = errorMessage.toLowerCase();
  
  // Classify error
  if (errorString.includes('timeout') || errorString.includes('timed out')) {
    errorType = ErrorTypes.TIMEOUT;
    errorCode = 'OPERATION_TIMEOUT';
  } else if (errorString.includes('network') || 
             errorString.includes('econnrefused') ||
             errorString.includes('enotfound')) {
    errorType = ErrorTypes.NETWORK;
    errorCode = 'NETWORK_ERROR';
  } else if (errorString.includes('blockhash') || 
             errorString.includes('transaction')) {
    errorType = ErrorTypes.BLOCKCHAIN;
    errorCode = 'BLOCKCHAIN_ERROR';
  } else if (errorString.includes('rate limit') || 
             errorString.includes('429')) {
    errorType = ErrorTypes.RATE_LIMIT;
    errorCode = 'RATE_LIMIT_EXCEEDED';
  } else if (errorString.includes('validation') || 
             errorString.includes('invalid')) {
    errorType = ErrorTypes.VALIDATION;
    errorCode = 'VALIDATION_ERROR';
  }
  
  // Create structured error
  const structuredError = new StructuredError(
    errorMessage,
    errorType,
    errorCode,
    {
      originalError: error?.constructor?.name,
      context,
      stack: error?.stack
    }
  );
  
  // Log error
  console.error('Error handled', {
    error: structuredError.toJSON(),
    context
  });
  
  return structuredError;
}

/**
 * Wrap async function with error handling
 * Best Practice: Automatic error handling wrapper
 */
function withErrorHandling(operation, context = {}) {
  return async function(...args) {
    try {
      return await operation.apply(this, args);
    } catch (error) {
      throw handleError(error, { ...context, args });
    }
  };
}

/**
 * Safe async operation wrapper
 * Best Practice: Graceful error handling without throwing
 */
async function safeAsyncOperation(operation, context = {}) {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    const structuredError = handleError(error, context);
    return { 
      success: false, 
      error: structuredError.message,
      errorType: structuredError.type,
      errorCode: structuredError.code
    };
  }
}

module.exports = {
  ErrorTypes,
  StructuredError,
  createError,
  handleError,
  withErrorHandling,
  safeAsyncOperation
};

