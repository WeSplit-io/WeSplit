/**
 * RPC Retry Utility with Exponential Backoff
 * Best Practice: Implements retry logic for unreliable network operations
 * Shared utility for Express backend
 * 
 * NOTE: This is intentionally separate from Firebase Functions version
 * because they run in different deployment contexts, but core logic is identical
 */

/**
 * Retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 100, // ms
  maxDelay: 2000, // ms
  backoffMultiplier: 2,
  timeout: 5000 // ms per attempt
};

/**
 * Check if error is retryable
 */
function isRetryableError(error) {
  if (!error) return false;
  
  const errorMessage = error.message || String(error);
  const errorString = errorMessage.toLowerCase();
  
  // Network errors are retryable
  if (errorString.includes('network') || 
      errorString.includes('timeout') ||
      errorString.includes('econnrefused') ||
      errorString.includes('enotfound') ||
      errorString.includes('econnreset')) {
    return true;
  }
  
  // Rate limiting errors are retryable
  if (errorString.includes('rate limit') || 
      errorString.includes('429') ||
      errorString.includes('too many requests')) {
    return true;
  }
  
  // Server errors (5xx) are retryable
  if (errorString.includes('500') || 
      errorString.includes('502') ||
      errorString.includes('503') ||
      errorString.includes('504')) {
    return true;
  }
  
  // Blockhash errors are NOT retryable (need fresh blockhash)
  if (errorString.includes('blockhash') && 
      (errorString.includes('expired') || errorString.includes('not found'))) {
    return false;
  }
  
  // Transaction errors are NOT retryable (transaction is invalid)
  if (errorString.includes('transaction') && 
      (errorString.includes('invalid') || errorString.includes('rejected'))) {
    return false;
  }
  
  // Default: retry on unknown errors (could be transient)
  return true;
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt, config) {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Retry RPC operation with exponential backoff
 * Best Practice: Implements retry pattern for unreliable network operations
 * 
 * @param {Function} operation - Async function to retry
 * @param {Object} config - Retry configuration
 * @returns {Promise} Result of operation
 */
async function retryRpcOperation(operation, config = {}) {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError = null;
  
  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Add timeout to each attempt
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), retryConfig.timeout)
        )
      ]);
      
      // Success - return result
      if (attempt > 1) {
        console.log(`RPC operation succeeded on attempt ${attempt}`, {
          totalAttempts: attempt,
          maxRetries: retryConfig.maxRetries
        });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!isRetryableError(error) || attempt === retryConfig.maxRetries) {
        // Not retryable or max retries reached
        if (attempt > 1) {
          console.error(`RPC operation failed after ${attempt} attempts`, {
            error: error.message,
            totalAttempts: attempt,
            maxRetries: retryConfig.maxRetries,
            isRetryable: isRetryableError(error)
          });
        }
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, retryConfig);
      
      console.warn(`RPC operation failed, retrying (attempt ${attempt}/${retryConfig.maxRetries})`, {
        error: error.message,
        attempt,
        maxRetries: retryConfig.maxRetries,
        nextRetryIn: delay,
        isRetryable: isRetryableError(error)
      });
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Should never reach here, but just in case
  throw lastError || new Error('RPC operation failed after all retries');
}

module.exports = {
  retryRpcOperation,
  isRetryableError
};

