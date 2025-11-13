/**
 * Property Protection System
 * Prevents "property is not configurable" errors by protecting critical global properties
 */

import { logger } from '../services/analytics/loggingService';

// List of critical global properties that should be protected
const CRITICAL_PROPERTIES = [
  'Buffer',
  'crypto',
  'process',
  'global',
  'window',
  'console',
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Function',
  'Date',
  'RegExp',
  'Error',
  'Promise',
  'Symbol',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Proxy',
  'Reflect'
];

// Store original property descriptors
const originalDescriptors: Map<string, PropertyDescriptor> = new Map();

// Protect critical global properties
export const protectGlobalProperties = () => {
  try {
    CRITICAL_PROPERTIES.forEach(propName => {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(global, propName);
        if (descriptor) {
          // Store original descriptor
          originalDescriptors.set(propName, descriptor);
          
          // Only make the property configurable if it's safe to do so
          if (descriptor.configurable === false && propName !== 'Object' && propName !== 'Array') {
            logger.warn('Making non-configurable property configurable', { property: propName }, 'PropertyProtection');
            
            try {
              Object.defineProperty(global, propName, {
                ...descriptor,
                configurable: true
              });
            } catch (defineError) {
              const errorMessage = defineError instanceof Error ? defineError.message : 'Unknown error';
              logger.warn('Failed to make property configurable', { property: propName, error: errorMessage }, 'PropertyProtection');
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Failed to protect property', { property: propName, error: errorMessage }, 'PropertyProtection');
      }
    });
    
    logger.info('Global properties protected', { count: CRITICAL_PROPERTIES.length }, 'PropertyProtection');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to protect global properties', { error: errorMessage }, 'PropertyProtection');
  }
};

// Restore original property descriptors
export const restoreGlobalProperties = () => {
  try {
    originalDescriptors.forEach((descriptor, propName) => {
      try {
        Object.defineProperty(global, propName, descriptor);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Failed to restore property', { property: propName, error: errorMessage }, 'PropertyProtection');
      }
    });
    
    logger.info('Global properties restored', { count: originalDescriptors.size }, 'PropertyProtection');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to restore global properties', { error: errorMessage }, 'PropertyProtection');
  }
};

// Safe property access with fallback
export const safeGetGlobalProperty = (propName: string, fallback: any = undefined): any => {
  try {
    return (global as any)[propName];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Failed to access global property', { property: propName, error: errorMessage }, 'PropertyProtection');
    return fallback;
  }
};

// Safe property definition with protection
export const safeSetGlobalProperty = (propName: string, value: any, options: PropertyDescriptor = {}): boolean => {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(global, propName);
    
    if (descriptor && descriptor.configurable === false) {
      logger.warn('Cannot set non-configurable property', { property: propName }, 'PropertyProtection');
      return false;
    }
    
    Object.defineProperty(global, propName, {
      value,
      writable: options.writable !== false,
      enumerable: options.enumerable !== false,
      configurable: options.configurable !== false,
      ...options
    });
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to set global property', { property: propName, error: errorMessage }, 'PropertyProtection');
    return false;
  }
};

// Initialize property protection
protectGlobalProperties();
