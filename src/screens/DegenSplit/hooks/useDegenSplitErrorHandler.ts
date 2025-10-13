/**
 * Degen Split Error Handler Hook
 * Centralized error handling for all Degen Split operations
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { logger } from '../../../services/loggingService';

export interface DegenSplitErrorHandler {
  handleError: (error: any, context: string, showAlert?: boolean) => void;
  handleNetworkError: (error: any, context: string) => void;
  handleValidationError: (error: any, context: string) => void;
  handleWalletError: (error: any, context: string) => void;
  handleTransactionError: (error: any, context: string) => void;
  clearError: () => void;
}

export const useDegenSplitErrorHandler = (
  setError: (error: string | null) => void
): DegenSplitErrorHandler => {
  
  // Generic error handler
  const handleError = useCallback((error: any, context: string, showAlert: boolean = true) => {
    let errorMessage = 'An unexpected error occurred';
    let errorType = 'unknown';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorType = 'Error';
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorType = 'String';
    } else if (error?.message) {
      errorMessage = error.message;
      errorType = 'Object';
    } else if (error?.error) {
      errorMessage = error.error;
      errorType = 'Object';
    }
    
    // Log the error
    logger.error(`Error in ${context}`, {
      error,
      errorMessage,
      errorType,
      context
    }, 'DegenSplitErrorHandler');
    
    // Set error state
    setError(errorMessage);
    
    // Show alert if requested
    if (showAlert) {
      Alert.alert(
        'Error',
        `Failed to ${context}. ${errorMessage}`,
        [
          { text: 'OK', onPress: () => setError(null) }
        ]
      );
    }
  }, [setError]);

  // Network-specific error handler
  const handleNetworkError = useCallback((error: any, context: string) => {
    let errorMessage = 'Network connection failed';
    
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
      errorMessage = 'Please check your internet connection and try again';
    } else if (error?.code === 'TIMEOUT') {
      errorMessage = 'Request timed out. Please try again';
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    logger.error(`Network error in ${context}`, error, 'DegenSplitErrorHandler');
    
    setError(errorMessage);
    
    Alert.alert(
      'Network Error',
      `Failed to ${context}. ${errorMessage}`,
      [
        { text: 'Retry', onPress: () => setError(null) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [setError]);

  // Validation-specific error handler
  const handleValidationError = useCallback((error: any, context: string) => {
    let errorMessage = 'Invalid data provided';
    
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    logger.error(`Validation error in ${context}`, error, 'DegenSplitErrorHandler');
    
    setError(errorMessage);
    
    Alert.alert(
      'Validation Error',
      errorMessage,
      [{ text: 'OK', onPress: () => setError(null) }]
    );
  }, [setError]);

  // Wallet-specific error handler
  const handleWalletError = useCallback((error: any, context: string) => {
    let errorMessage = 'Wallet operation failed';
    
    if (error?.message?.includes('insufficient')) {
      errorMessage = 'Insufficient funds in wallet';
    } else if (error?.message?.includes('private key')) {
      errorMessage = 'Failed to access wallet private key';
    } else if (error?.message?.includes('address')) {
      errorMessage = 'Invalid wallet address';
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    logger.error(`Wallet error in ${context}`, error, 'DegenSplitErrorHandler');
    
    setError(errorMessage);
    
    Alert.alert(
      'Wallet Error',
      `Failed to ${context}. ${errorMessage}`,
      [
        { text: 'OK', onPress: () => setError(null) }
      ]
    );
  }, [setError]);

  // Transaction-specific error handler
  const handleTransactionError = useCallback((error: any, context: string) => {
    let errorMessage = 'Transaction failed';
    
    if (error?.message?.includes('gas')) {
      errorMessage = 'Transaction failed due to gas issues';
    } else if (error?.message?.includes('signature')) {
      errorMessage = 'Transaction signature failed';
    } else if (error?.message?.includes('rejected')) {
      errorMessage = 'Transaction was rejected';
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    logger.error(`Transaction error in ${context}`, error, 'DegenSplitErrorHandler');
    
    setError(errorMessage);
    
    Alert.alert(
      'Transaction Error',
      `Failed to ${context}. ${errorMessage}`,
      [
        { text: 'Retry', onPress: () => setError(null) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [setError]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return {
    handleError,
    handleNetworkError,
    handleValidationError,
    handleWalletError,
    handleTransactionError,
    clearError,
  };
};
