/**
 * Error Recovery System
 * Provides comprehensive error recovery mechanisms for runtime errors
 */

import { logger } from '../services/analytics/loggingService';

// Error recovery strategies
export enum RecoveryStrategy {
  IGNORE = 'ignore',
  RETRY = 'retry',
  FALLBACK = 'fallback',
  RESTART = 'restart'
}

// Error recovery configuration
interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  fallbackValue: any;
  strategy: RecoveryStrategy;
}

// Default recovery configurations for different error types
const RECOVERY_CONFIGS: Map<string, ErrorRecoveryConfig> = new Map([
  ['property is not configurable', {
    maxRetries: 0,
    retryDelay: 0,
    fallbackValue: null,
    strategy: RecoveryStrategy.IGNORE
  }],
  ['module loading', {
    maxRetries: 3,
    retryDelay: 100,
    fallbackValue: {},
    strategy: RecoveryStrategy.FALLBACK
  }],
  ['network', {
    maxRetries: 5,
    retryDelay: 1000,
    fallbackValue: null,
    strategy: RecoveryStrategy.RETRY
  }]
]);

// Error recovery function
export const recoverFromError = async (
  error: Error, 
  context: string, 
  customConfig?: Partial<ErrorRecoveryConfig>
): Promise<any> => {
  const errorType = classifyError(error);
  const config = { ...RECOVERY_CONFIGS.get(errorType), ...customConfig };
  
  logger.info('Attempting error recovery', { 
    errorType, 
    context, 
    strategy: config.strategy,
    error: error.message 
  }, 'ErrorRecovery');
  
  switch (config.strategy) {
    case RecoveryStrategy.IGNORE:
      logger.warn('Ignoring error as per recovery strategy', { context, error: error.message }, 'ErrorRecovery');
      return config.fallbackValue;
      
    case RecoveryStrategy.FALLBACK:
      logger.warn('Using fallback value as per recovery strategy', { context, error: error.message }, 'ErrorRecovery');
      return config.fallbackValue;
      
    case RecoveryStrategy.RETRY:
      return await retryWithBackoff(() => {
        throw error; // This would be replaced with the actual operation
      }, config.maxRetries, config.retryDelay);
      
    case RecoveryStrategy.RESTART:
      logger.error('Restart strategy not implemented', { context, error: error.message }, 'ErrorRecovery');
      return config.fallbackValue;
      
    default:
      logger.error('Unknown recovery strategy', { strategy: config.strategy, context, error: error.message }, 'ErrorRecovery');
      return config.fallbackValue;
  }
};

// Classify error type based on error message
const classifyError = (error: Error): string => {
  const message = error.message.toLowerCase();
  
  if (message.includes('property is not configurable')) {
    return 'property is not configurable';
  }
  
  if (message.includes('module') || message.includes('require') || message.includes('import')) {
    return 'module loading';
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('http')) {
    return 'network';
  }
  
  return 'unknown';
};

// Retry with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>, 
  maxRetries: number, 
  baseDelay: number
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        logger.error('Max retries exceeded', { 
          maxRetries, 
          error: lastError.message 
        }, 'ErrorRecovery');
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn('Retry attempt failed, waiting before retry', { 
        attempt: attempt + 1, 
        maxRetries, 
        delay,
        error: lastError.message 
      }, 'ErrorRecovery');
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// Global error recovery wrapper
export const withErrorRecovery = <T extends any[], R>(
  fn: (...args: T) => R,
  context: string,
  config?: Partial<ErrorRecoveryConfig>
) => {
  return (...args: T): R => {
    try {
      const result = fn(...args);
      // Handle both sync and async functions
      if (result && typeof result.then === 'function') {
        return result.catch((error: Error) => recoverFromError(error, context, config)) as R;
      }
      return result;
    } catch (error) {
      return recoverFromError(error as Error, context, config) as R;
    }
  };
};

// Initialize error recovery system
logger.info('Error recovery system initialized', {}, 'ErrorRecovery');
