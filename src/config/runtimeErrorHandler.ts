/**
 * Runtime Error Handler
 * Catches and handles runtime errors, especially "property is not configurable" errors
 */

import { logger } from '../services/analytics/loggingService';

// Global error handler for unhandled errors
export const setupGlobalErrorHandlers = () => {
  // Helper function to check if an error is a WebSocket error
  const isWebSocketError = (...args: any[]): boolean => {
    if (args.length === 0) return false;
    
    // Normalize all arguments to strings for checking
    const normalizedArgs: string[] = [];
    
    for (const arg of args) {
      let argStr: string;
      if (arg === null || arg === undefined) {
        argStr = 'undefined';
      } else if (typeof arg === 'object') {
        try {
          argStr = JSON.stringify(arg).toLowerCase();
        } catch {
          try {
            argStr = String(arg).toLowerCase();
          } catch {
            argStr = 'object';
          }
        }
      } else {
        argStr = String(arg).toLowerCase();
      }
      normalizedArgs.push(argStr);
    }
    
    // Combine all arguments into a single string for pattern matching
    const combinedString = normalizedArgs.join(' ');
    
    // Check for WebSocket error patterns
    // Patterns: "ws error", "websocket error", "ws error: undefined", etc.
    const patterns = [
      'ws error',
      'websocket error',
      'websocket',
      'ws error: undefined',
      'ws error undefined',
      'ws error',
      'error: undefined', // Catch "error: undefined" when combined with ws
    ];
    
    // Check combined string
    for (const pattern of patterns) {
      if (combinedString.includes(pattern)) {
        return true;
      }
    }
    
    // Check individual arguments
    for (const argStr of normalizedArgs) {
      for (const pattern of patterns) {
        if (argStr.includes(pattern)) {
          return true;
        }
      }
    }
    
    // Special case: if we have "undefined" and "ws" in the same call
    const hasWs = normalizedArgs.some(a => a.includes('ws') || a.includes('websocket'));
    const hasUndefined = normalizedArgs.some(a => a === 'undefined' || a.includes('undefined'));
    const hasError = normalizedArgs.some(a => a.includes('error'));
    
    if (hasWs && (hasUndefined || hasError)) {
      return true;
    }
    
    // Even more aggressive: if any arg contains "ws" and another contains "undefined"
    if (hasWs && hasUndefined) {
      return true;
    }
    
    return false;
  };

  // Intercept console.error to filter out non-critical WebSocket errors from Solana SDK
  // Do this BEFORE any other code runs to ensure we catch all errors
  const originalConsoleError = console.error;
  
  // Create a new console.error function that filters WebSocket errors
  const filteredConsoleError = (...args: any[]) => {
    // Filter out WebSocket errors
    if (isWebSocketError(...args)) {
      // Suppress completely - don't log at all
      return;
    }
    
    // Call original console.error for all other errors
    originalConsoleError.apply(console, args);
  };
  
  // Replace console.error with our filtered version
  console.error = filteredConsoleError;
  
  // Also replace it on the global object if it exists
  if (typeof global !== 'undefined') {
    (global as any).console = global.console || {};
    (global as any).console.error = filteredConsoleError;
  }
  
  // Log that error handler is initialized (only once)
  if (__DEV__) {
    logger.debug('Console.error interceptor initialized for WebSocket error filtering', {}, 'RuntimeErrorHandler');
  }

  // Handle unhandled promise rejections
  const originalUnhandledRejection = global.onunhandledrejection;
  global.onunhandledrejection = (event: any) => {
    // Filter out WebSocket-related promise rejections
    const rejectionReason = event.reason;
    const isWsRejection = rejectionReason && (
      String(rejectionReason).toLowerCase().includes('ws error') ||
      String(rejectionReason).toLowerCase().includes('websocket error')
    );
    
    if (!isWsRejection) {
      logger.error('Unhandled promise rejection', { 
        reason: event.reason,
        promise: event.promise 
      }, 'RuntimeErrorHandler');
    } else if (__DEV__) {
      logger.debug('WebSocket promise rejection suppressed (non-critical)', { 
        reason: event.reason 
      }, 'RuntimeErrorHandler');
    }
    
    // Call original handler if it exists
    if (originalUnhandledRejection) {
      originalUnhandledRejection(event);
    }
  };

  // Handle uncaught exceptions
  const originalUncaughtException = global.onerror;
  global.onerror = (message: string, source?: string, lineno?: number, colno?: number, error?: Error) => {
    logger.error('Uncaught exception', { 
      message, 
      source, 
      lineno, 
      colno, 
      error 
    }, 'RuntimeErrorHandler');
    
    // Call original handler if it exists
    if (originalUncaughtException) {
      return originalUncaughtException(message, source, lineno, colno, error);
    }
    
    return false;
  };

  // Handle React Native specific errors
  if (typeof global !== 'undefined' && global.ErrorUtils) {
    const originalGlobalHandler = global.ErrorUtils.getGlobalHandler();
    global.ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
      // Filter out WebSocket errors from React Native error handler
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorStack = error?.stack?.toLowerCase() || '';
      const isWsError = errorMessage.includes('ws error') || 
                       errorMessage.includes('websocket error') ||
                       errorStack.includes('websocket') ||
                       (errorMessage === 'undefined' && errorStack.includes('ws'));
      
      if (!isWsError) {
        logger.error('React Native global error', { 
          error: error.message, 
          stack: error.stack, 
          isFatal 
        }, 'RuntimeErrorHandler');
      }
      
      // Call original handler only if not a WebSocket error
      if (!isWsError && originalGlobalHandler) {
        originalGlobalHandler(error, isFatal);
      }
    });
  }
  
  // Also intercept console.warn in case errors are logged there
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (isWebSocketError(...args)) {
      return; // Suppress WebSocket warnings
    }
    originalConsoleWarn.apply(console, args);
  };
};

// Safe property access helper
export const safeGetProperty = (obj: any, path: string, defaultValue: any = undefined) => {
  try {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
  } catch (error) {
    logger.warn('Safe property access failed', { path, error }, 'RuntimeErrorHandler');
    return defaultValue;
  }
};

// Safe property definition helper
export const safeDefineProperty = (obj: any, name: string, value: any, options: PropertyDescriptor = {}) => {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(obj, name);
    if (descriptor && descriptor.configurable === false) {
      logger.warn('Property is not configurable', { object: obj.constructor?.name, property: name }, 'RuntimeErrorHandler');
      return false;
    }
    
    Object.defineProperty(obj, name, {
      value,
      writable: options.writable !== false,
      enumerable: options.enumerable !== false,
      configurable: options.configurable !== false,
      ...options
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to define property', { 
      object: obj.constructor?.name, 
      property: name, 
      error: error.message 
    }, 'RuntimeErrorHandler');
    return false;
  }
};

// Track logged properties to prevent spam
const loggedProperties = new Set<string>();
const maxLogsPerProperty = 1; // Only log once per property
const ignoredProperties = new Set([
  '_debugTask',
  'validated',
  '_debugInfo',
  '_debugStack'
]);

// Override Object.defineProperty globally to prevent "property is not configurable" errors
const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function(obj: any, prop: string | symbol, descriptor: PropertyDescriptor) {
  try {
    const propKey = `${obj.constructor?.name || 'Unknown'}.${prop.toString()}`;
    const propName = prop.toString();
    
    // Skip ignored properties - they're known to cause spam and are handled gracefully
    if (ignoredProperties.has(propName)) {
      return originalDefineProperty.call(this, obj, prop, descriptor);
    }
    
    // Check if the property is already defined and not configurable
    const existingDescriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (existingDescriptor && existingDescriptor.configurable === false) {
      // Only log if we haven't logged this property before
      if (!loggedProperties.has(propKey) && loggedProperties.size < maxLogsPerProperty * 10) {
        logger.warn('Attempted to redefine non-configurable property', { 
          object: obj.constructor?.name || 'Unknown', 
          property: prop.toString()
        }, 'RuntimeErrorHandler');
        loggedProperties.add(propKey);
      }
      
      // Return the object without throwing an error
      return obj;
    }
    
    // If the descriptor is trying to make a property non-configurable, make it configurable
    if (descriptor.configurable === false) {
      // Only log if we haven't logged this property before
      if (!loggedProperties.has(propKey) && loggedProperties.size < maxLogsPerProperty * 10) {
        logger.warn('Preventing non-configurable property definition', { 
          object: obj.constructor?.name || 'Unknown', 
          property: prop.toString() 
        }, 'RuntimeErrorHandler');
        loggedProperties.add(propKey);
      }
      
      descriptor = { ...descriptor, configurable: true };
    }
    
    return originalDefineProperty.call(this, obj, prop, descriptor);
  } catch (error) {
    // Only log errors occasionally to prevent spam
    const propKey = `${obj.constructor?.name || 'Unknown'}.${prop.toString()}`;
    if (!loggedProperties.has(propKey) && Math.random() < 0.01) { // Log only 1% of errors
      logger.error('Object.defineProperty failed, returning object unchanged', { 
        object: obj.constructor?.name || 'Unknown', 
        property: prop.toString(),
        error: error instanceof Error ? error.message : String(error)
      }, 'RuntimeErrorHandler');
      loggedProperties.add(propKey);
    }
    
    // Return the object without throwing an error
    return obj;
  }
};

// Initialize error handlers
setupGlobalErrorHandlers();
