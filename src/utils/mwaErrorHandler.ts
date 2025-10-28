/**
 * MWA Error Handler
 * Handles MWA-related errors gracefully to prevent app crashes
 */

import { logger } from '../services/analytics/loggingService';

export interface MWAErrorInfo {
  isMWAError: boolean;
  errorType: 'TurboModuleRegistry' | 'ImportError' | 'NativeModule' | 'Other';
  message: string;
  canRetry: boolean;
}

/**
 * Check if an error is MWA-related
 */
export const isMWAError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return (
    errorMessage.includes('TurboModuleRegistry') ||
    errorMessage.includes('SolanaMobileWalletAdapter') ||
    errorMessage.includes('startRemoteScenario is not a function') ||
    errorMessage.includes('mobile-wallet-adapter-protocol')
  );
};

/**
 * Analyze MWA error and provide information
 */
export const analyzeMWAError = (error: any): MWAErrorInfo => {
  if (!error) {
    return {
      isMWAError: false,
      errorType: 'Other',
      message: 'Unknown error',
      canRetry: false
    };
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('TurboModuleRegistry')) {
    return {
      isMWAError: true,
      errorType: 'TurboModuleRegistry',
      message: 'MWA native module not registered in the binary',
      canRetry: false
    };
  }
  
  if (errorMessage.includes('SolanaMobileWalletAdapter')) {
    return {
      isMWAError: true,
      errorType: 'NativeModule',
      message: 'SolanaMobileWalletAdapter native module not found',
      canRetry: false
    };
  }
  
  if (errorMessage.includes('startRemoteScenario is not a function')) {
    return {
      isMWAError: true,
      errorType: 'ImportError',
      message: 'MWA module imported but startRemoteScenario not available',
      canRetry: false
    };
  }
  
  if (errorMessage.includes('mobile-wallet-adapter-protocol')) {
    return {
      isMWAError: true,
      errorType: 'ImportError',
      message: 'Failed to import MWA protocol module',
      canRetry: true
    };
  }
  
  return {
    isMWAError: false,
    errorType: 'Other',
    message: errorMessage,
    canRetry: true
  };
};

/**
 * Handle MWA error with appropriate logging and user feedback
 */
export const handleMWAError = (error: any, context: string): void => {
  const errorInfo = analyzeMWAError(error);
  
  if (errorInfo.isMWAError) {
    logger.warn('MWA error detected', {
      context,
      errorType: errorInfo.errorType,
      message: errorInfo.message,
      canRetry: errorInfo.canRetry
    }, 'MWAErrorHandler');
  } else {
    logger.error('Non-MWA error', {
      context,
      error: error instanceof Error ? error.message : String(error)
    }, 'MWAErrorHandler');
  }
};

/**
 * Safe MWA import with error handling
 */
export const safeMWAImport = async (): Promise<{
  success: boolean;
  module?: any;
  error?: string;
}> => {
  try {
    const mwaModule = await import('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
    
    if (!mwaModule.startRemoteScenario) {
      return {
        success: false,
        error: 'startRemoteScenario not available in MWA module'
      };
    }
    
    return {
      success: true,
      module: mwaModule
    };
  } catch (error) {
    const errorInfo = analyzeMWAError(error);
    
    return {
      success: false,
      error: errorInfo.message
    };
  }
};

/**
 * Check if MWA is properly configured
 */
export const isMWAProperlyConfigured = async (): Promise<boolean> => {
  try {
    const result = await safeMWAImport();
    return result.success;
  } catch (error) {
    return false;
  }
};
