/**
 * Safe Polyfill Initialization
 * Prevents "property is not configurable" errors by safely defining global properties
 */

import { logger } from '../services/analytics/loggingService';

// Safe global property definition function
export const defineGlobalProperty = (name: string, value: any, options: {
  writable?: boolean;
  enumerable?: boolean;
  configurable?: boolean;
} = {}): boolean => {
  try {
    // Check if property already exists
    if (typeof (global as any)[name] !== 'undefined') {
      return true; // Already defined
    }

    // Check if we can define the property
    const descriptor = Object.getOwnPropertyDescriptor(global, name);
    if (descriptor && descriptor.configurable === false) {
      logger.warn(`Global property ${name} is not configurable, skipping definition`, {}, 'SafePolyfills');
      return false;
    }

    // Define the property safely
    Object.defineProperty(global, name, {
      value,
      writable: options.writable !== false,
      enumerable: options.enumerable !== false,
      configurable: options.configurable !== false,
    });

    return true;
  } catch (error) {
    logger.warn(`Failed to define global property ${name}`, { error }, 'SafePolyfills');
    return false;
  }
};

// Safe global assignment function
export const assignGlobalProperty = (name: string, value: any): boolean => {
  try {
    if (typeof (global as any)[name] === 'undefined') {
      (global as any)[name] = value;
      return true;
    }
    return true; // Already defined
  } catch (error) {
    logger.warn(`Failed to assign global property ${name}`, { error }, 'SafePolyfills');
    return false;
  }
};

// Initialize essential polyfills safely
export const initializeSafePolyfills = () => {
  // Import required polyfills first
  try {
    require('react-native-get-random-values');
  } catch (error) {
    logger.warn('Failed to load react-native-get-random-values', { error }, 'SafePolyfills');
  }

  try {
    require('react-native-url-polyfill/auto');
  } catch (error) {
    logger.warn('Failed to load react-native-url-polyfill', { error }, 'SafePolyfills');
  }

  // Buffer polyfill
  try {
    const { Buffer } = require('buffer');
    defineGlobalProperty('Buffer', Buffer);
  } catch (error) {
    logger.warn('Failed to load Buffer polyfill', { error }, 'SafePolyfills');
  }

  // Process polyfill
  try {
    const process = require('process');
    defineGlobalProperty('process', process);
  } catch (error) {
    logger.warn('Failed to load process polyfill', { error }, 'SafePolyfills');
  }
};

// Auto-initialize if this module is imported
if (typeof global !== 'undefined') {
  initializeSafePolyfills();
}
