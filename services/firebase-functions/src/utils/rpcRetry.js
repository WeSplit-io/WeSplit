/**
 * RPC Retry Utility with Exponential Backoff
 * Best Practice: Implements retry logic for unreliable network operations
 * Follows Node.js best practices for async error handling
 * 
 * NOTE: This is intentionally separate from Express backend version
 * because they run in different deployment contexts (Firebase Functions vs Express server)
 * Core retry logic is identical, but this version includes CircuitBreaker pattern
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

/**
 * Retry RPC operation with circuit breaker pattern
 * Best Practice: Prevents cascading failures by breaking circuit after failures
 */
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }
  
  async execute(operation) {
    // Check circuit state
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - too many failures');
      }
      // Try to close circuit
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await operation();
      
      // Success - reset failure count
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
        console.log('Circuit breaker closed - operation succeeded');
      } else {
        this.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      
      // Open circuit if threshold reached
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.timeout;
        console.error('Circuit breaker opened - too many failures', {
          failureCount: this.failureCount,
          threshold: this.threshold,
          nextAttempt: new Date(this.nextAttempt).toISOString()
        });
      }
      
      throw error;
    }
  }
}

// Create singleton circuit breaker for RPC operations
const rpcCircuitBreaker = new CircuitBreaker(5, 60000);

/**
 * Retry RPC operation with circuit breaker
 * Best Practice: Combines retry logic with circuit breaker pattern
 */
async function retryRpcWithCircuitBreaker(operation, config = {}) {
  return rpcCircuitBreaker.execute(() => retryRpcOperation(operation, config));
}

module.exports = {
  retryRpcOperation,
  retryRpcWithCircuitBreaker,
  isRetryableError,
  CircuitBreaker
};

