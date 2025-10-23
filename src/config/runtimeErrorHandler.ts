/**
 * Runtime Error Handler
 * Catches and handles runtime errors, especially "property is not configurable" errors
 */

import { logger } from '../services/analytics/loggingService';

// Global error handler for unhandled errors
export const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  const originalUnhandledRejection = global.onunhandledrejection;
  global.onunhandledrejection = (event: any) => {
    logger.error('Unhandled promise rejection', { 
      reason: event.reason,
      promise: event.promise 
    }, 'RuntimeErrorHandler');
    
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
      logger.error('React Native global error', { 
        error: error.message, 
        stack: error.stack, 
        isFatal 
      }, 'RuntimeErrorHandler');
      
      // Call original handler
      if (originalGlobalHandler) {
        originalGlobalHandler(error, isFatal);
      }
    });
  }
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

// Override Object.defineProperty globally to prevent "property is not configurable" errors
const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function(obj: any, prop: string | symbol, descriptor: PropertyDescriptor) {
  try {
    // Check if the property is already defined and not configurable
    const existingDescriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (existingDescriptor && existingDescriptor.configurable === false) {
      logger.warn('Attempted to redefine non-configurable property', { 
        object: obj.constructor?.name || 'Unknown', 
        property: prop.toString(),
        existingDescriptor 
      }, 'RuntimeErrorHandler');
      
      // Return the object without throwing an error
      return obj;
    }
    
    // If the descriptor is trying to make a property non-configurable, make it configurable
    if (descriptor.configurable === false) {
      logger.warn('Preventing non-configurable property definition', { 
        object: obj.constructor?.name || 'Unknown', 
        property: prop.toString() 
      }, 'RuntimeErrorHandler');
      
      descriptor = { ...descriptor, configurable: true };
    }
    
    return originalDefineProperty.call(this, obj, prop, descriptor);
  } catch (error) {
    logger.error('Object.defineProperty failed, returning object unchanged', { 
      object: obj.constructor?.name || 'Unknown', 
      property: prop.toString(),
      error: error.message 
    }, 'RuntimeErrorHandler');
    
    // Return the object without throwing an error
    return obj;
  }
};

// Initialize error handlers
setupGlobalErrorHandlers();
