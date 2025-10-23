/**
 * Minimal Error Handler
 * Focuses only on preventing "property is not configurable" errors
 */

import { logger } from '../services/analytics/loggingService';

// Track logged properties to prevent infinite loops
const loggedProperties = new Set<string>();
const maxLogsPerProperty = 3;

// Properties that should be ignored to prevent infinite loops
const ignoredProperties = new Set([
  '_debugTask',
  'validated', 
  '_debugInfo',
  '_debugStack'
]);

// Override Object.defineProperty to prevent "property is not configurable" errors
const originalDefineProperty = Object.defineProperty;

Object.defineProperty = function(obj: any, prop: string | symbol, descriptor: PropertyDescriptor) {
  try {
    const propKey = `${obj.constructor?.name || 'Unknown'}.${prop.toString()}`;
    const propName = prop.toString();
    
    // Skip ignored properties to prevent infinite loops
    if (ignoredProperties.has(propName)) {
      return originalDefineProperty.call(this, obj, prop, descriptor);
    }
    
    // Check if the property is already defined and not configurable
    const existingDescriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (existingDescriptor && existingDescriptor.configurable === false) {
      // Only log if we haven't logged this property too many times
      if (!loggedProperties.has(propKey) && loggedProperties.size < maxLogsPerProperty) {
        logger.warn('Attempted to redefine non-configurable property', { 
          object: obj.constructor?.name || 'Unknown', 
          property: propName
        }, 'MinimalErrorHandler');
        loggedProperties.add(propKey);
      }
      
      // Return the object without throwing an error
      return obj;
    }
    
    // If the descriptor is trying to make a property non-configurable, make it configurable
    if (descriptor.configurable === false) {
      // Only log if we haven't logged this property too many times
      if (!loggedProperties.has(propKey) && loggedProperties.size < maxLogsPerProperty) {
        logger.warn('Preventing non-configurable property definition', { 
          object: obj.constructor?.name || 'Unknown', 
          property: propName 
        }, 'MinimalErrorHandler');
        loggedProperties.add(propKey);
      }
      
      descriptor = { ...descriptor, configurable: true };
    }
    
    return originalDefineProperty.call(this, obj, prop, descriptor);
  } catch (error) {
    // Only log errors occasionally to prevent spam
    if (Math.random() < 0.01) { // Log only 1% of errors
      logger.error('Object.defineProperty failed, returning object unchanged', { 
        object: obj.constructor?.name || 'Unknown', 
        property: prop.toString(),
        error: error instanceof Error ? error.message : String(error)
      }, 'MinimalErrorHandler');
    }
    
    // Return the object without throwing an error
    return obj;
  }
};

// Initialize minimal error handler
logger.info('Minimal error handler initialized', {}, 'MinimalErrorHandler');
