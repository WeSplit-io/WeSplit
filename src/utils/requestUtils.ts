/**
 * Request Utility Functions
 * Centralized utilities for payment request operations
 */

import { Alert } from 'react-native';
import { logger } from '../services/loggingService';

/**
 * Format wallet address for display
 * Shows first 6 and last 6 characters with ellipsis
 */
export const formatWalletAddress = (address: string): string => {
  if (!address) return '';
  if (address.length <= 8) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
};

/**
 * Validate payment request amount
 */
export const validatePaymentAmount = (amount: string): { isValid: boolean; numAmount?: number; error?: string } => {
  const numAmount = parseFloat(amount);
  
  if (!numAmount || numAmount <= 0) {
    return {
      isValid: false,
      error: 'Please enter a valid amount greater than 0'
    };
  }
  
  return {
    isValid: true,
    numAmount
  };
};

/**
 * Validate contact information for payment requests
 */
export const validateContactForRequest = (contact: any): { isValid: boolean; error?: string } => {
  if (!contact) {
    return {
      isValid: false,
      error: 'Contact information is missing'
    };
  }
  
  if (!contact.id) {
    return {
      isValid: false,
      error: 'Contact ID is missing'
    };
  }
  
  return {
    isValid: true
  };
};

/**
 * Validate user authentication for payment requests
 */
export const validateUserForRequest = (currentUser: any): { isValid: boolean; error?: string } => {
  if (!currentUser?.id) {
    return {
      isValid: false,
      error: 'User not authenticated'
    };
  }
  
  return {
    isValid: true
  };
};

/**
 * Standardized error handling for payment request creation
 */
export const handlePaymentRequestError = (error: any, context: string): void => {
  console.error(`❌ ${context}: Error creating payment request:`, error);
  
  // More detailed error logging
  if (error instanceof Error) {
    console.error(`❌ ${context}: Error details:`, {
      message: error.message,
      stack: error.stack
    });
  }
  
  Alert.alert(
    'Error', 
    `Failed to create payment request: ${error instanceof Error ? error.message : 'Unknown error'}`
  );
};

/**
 * Log payment request creation attempt
 */
export const logPaymentRequestAttempt = (
  senderId: string,
  recipientId: string,
  amount: number,
  description: string,
  groupId?: string,
  context: string = 'PaymentRequest'
): void => {
  logger.info('Creating payment request', {
    senderId,
    recipientId,
    amount,
    description,
    groupId,
    context
  });
};

/**
 * Log successful payment request creation
 */
export const logPaymentRequestSuccess = (
  paymentRequest: any,
  context: string = 'PaymentRequest'
): void => {
  logger.info('Payment request created successfully', { paymentRequest }, context);
};

/**
 * Check if amount is valid for UI display
 */
export const isAmountValid = (amount: string): boolean => {
  return parseFloat(amount) > 0;
};

export const createRequestSuccessNavigationData = (
  contact: any,
  amount: number,
  description: string,
  requestId: string,
  paymentRequest: any,
  groupId?: string
) => {
  return {
    contact,
    amount,
    description,
    groupId,
    requestId,
    paymentRequest
  };
};
