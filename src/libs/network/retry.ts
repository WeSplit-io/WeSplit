/**
 * Retry Utilities
 * Centralized retry logic with exponential backoff and jitter
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  jitter: true,
  retryCondition: () => true
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.retryCondition(error)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, opts);
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: opts.maxAttempts,
    totalTime: Date.now() - startTime
  };
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.baseDelay * Math.pow(options.backoffFactor, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay);
  
  if (options.jitter) {
    // Add random jitter (±25%)
    const jitterRange = cappedDelay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, cappedDelay + jitter);
  }
  
  return cappedDelay;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with custom retry condition
 */
function retryOnNetworkError<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'retryCondition'> = {}
): Promise<RetryResult<T>> {
  return retry(fn, {
    ...options,
    retryCondition: (error) => {
      // Retry on network errors, timeouts, and 5xx status codes
      if (error.code === 'NETWORK_ERROR' || 
          error.code === 'TIMEOUT' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ENOTFOUND') {
        return true;
      }
      
      // Retry on HTTP 5xx errors
      if (error.status >= 500 && error.status < 600) {
        return true;
      }
      
      // Retry on rate limiting
      if (error.status === 429) {
        return true;
      }
      
      return false;
    }
  });
}

/**
 * Retry with linear backoff
 */
function retryLinear<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'backoffFactor'> = {}
): Promise<RetryResult<T>> {
  return retry(fn, {
    ...options,
    backoffFactor: 1
  });
}

/**
 * Retry with fixed delay
 */
function retryFixed<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'backoffFactor' | 'jitter'> = {}
): Promise<RetryResult<T>> {
  return retry(fn, {
    ...options,
    backoffFactor: 1,
    jitter: false
  });
}

/**
 * Create a retry wrapper for a function
 */
function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    const result = await retry(() => fn(...args), options);
    
    if (result.success) {
      return result.data;
    }
    
    throw result.error;
  }) as T;
}

/**
 * Retry with circuit breaker pattern
 */
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private options: {
      failureThreshold: number;
      recoveryTimeout: number;
      monitoringPeriod: number;
    } = {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 10000
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

/**
 * Batch retry for multiple operations
 */
async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<RetryResult<T>>> {
  const results = await Promise.allSettled(
    operations.map(op => retry(op, options))
  );

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        success: false,
        error: result.reason,
        attempts: 0,
        totalTime: 0
      };
    }
  });
}
