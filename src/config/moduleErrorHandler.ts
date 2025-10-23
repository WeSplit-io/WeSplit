/**
 * Module Loading Error Handler
 * Handles errors that occur during module loading and initialization
 */

import { logger } from '../services/analytics/loggingService';

// Safe module loading without overriding global functions
// This approach is safer and doesn't cause circular references

// Safe module loading function
export const safeRequire = (id: string, fallback: any = {}): any => {
  try {
    return require(id);
  } catch (error) {
    logger.warn('Safe require failed, using fallback', { 
      moduleId: id, 
      error: error instanceof Error ? error.message : String(error)
    }, 'ModuleErrorHandler');
    return fallback;
  }
};

// Safe dynamic import function
export const safeImport = async (id: string, fallback: any = {}): Promise<any> => {
  try {
    return await import(id);
  } catch (error) {
    logger.warn('Safe import failed, using fallback', { 
      moduleId: id, 
      error: error instanceof Error ? error.message : String(error)
    }, 'ModuleErrorHandler');
    return fallback;
  }
};

// Initialize module error handling
logger.info('Module error handler initialized', {}, 'ModuleErrorHandler');
