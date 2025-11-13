/**
 * Notification Data Utilities
 * Provides standardized data structures and validation for notifications
 */

import { logger } from '../analytics/loggingService';

export interface StandardizedNotificationData {
  // Core request data
  requestId?: string;
  splitId?: string;
  
  // User identification (multiple field names for compatibility)
  senderId: string;
  senderName: string;
  recipientId?: string;
  requester: string;
  sender: string;
  
  // Payment data
  amount: number;
  currency: string;
  description?: string;
  
  // Status
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  
  // Additional context
  [key: string]: unknown;
}

/**
 * Standardize notification data from various sources
 */
export function standardizeNotificationData(
  rawData: Record<string, unknown>,
  notificationType: string
): StandardizedNotificationData | null {
  try {
    // Extract sender information with multiple fallbacks
    const senderId = rawData?.senderId || rawData?.requester || rawData?.sender || rawData?.payerId;
    const senderName = rawData?.senderName || rawData?.payerName || rawData?.requesterName || 'Unknown';
    
    if (!senderId) {
      logger.error('Missing sender ID in notification data', { rawData, notificationType }, 'notificationDataUtils');
      return null;
    }

    // Extract amount with validation (only for payment-related notifications)
    const amount = parseFloat(rawData?.amount || '0');
    const requiresAmount = ['payment_request', 'payment_received', 'payment_sent', 'money_sent', 'money_received', 'split_invite', 'split_payment_required', 'split_completed'];
    
    if (requiresAmount.includes(notificationType) && (!amount || amount <= 0)) {
      logger.error('Invalid amount in notification data', { rawData, notificationType, amount }, 'notificationDataUtils');
      return null;
    }

    // Extract currency with fallback
    const currency = rawData?.currency || 'USDC';

    // Build standardized data
    const standardizedData: StandardizedNotificationData = {
      // Core request data
      requestId: rawData?.requestId,
      splitId: rawData?.splitId,
      
      // User identification (multiple field names for compatibility)
      senderId: String(senderId),
      senderName: String(senderName),
      requester: String(senderId),
      sender: String(senderId),
      
      // Payment data
      amount: amount,
      currency: currency,
      description: rawData?.description || '',
      
      // Status
      status: rawData?.status || 'pending',
      
      // Preserve additional context
      ...rawData
    };

    logger.debug('Standardized notification data', { 
      original: rawData, 
      standardized: standardizedData,
      notificationType 
    }, 'notificationDataUtils');

    return standardizedData;
  } catch (error) {
    logger.error('Failed to standardize notification data', { 
      error, 
      rawData, 
      notificationType 
    }, 'notificationDataUtils');
    return null;
  }
}

/**
 * Validate notification data before sending
 */
export function validateNotificationData(
  data: StandardizedNotificationData,
  notificationType: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields validation
  if (!data.senderId) {
    errors.push('Missing sender ID');
  }

  if (!data.senderName || data.senderName === 'Unknown') {
    errors.push('Missing or invalid sender name');
  }

  // Only validate amount for payment-related notifications
  const requiresAmount = ['payment_request', 'payment_received', 'payment_sent', 'money_sent', 'money_received', 'split_invite', 'split_payment_required', 'split_completed'];
  if (requiresAmount.includes(notificationType)) {
    if (!data.amount || data.amount <= 0) {
      errors.push('Invalid amount');
    }

    if (!data.currency) {
      errors.push('Missing currency');
    }
  }

  // Type-specific validation
  if (notificationType === 'payment_request') {
    if (!data.requestId) {
      errors.push('Missing request ID for payment request');
    }
  }

  if (notificationType === 'split_invite' || notificationType === 'split_payment_required') {
    if (!data.splitId) {
      errors.push('Missing split ID for split notification');
    }
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    logger.warn('Notification data validation failed', { 
      errors, 
      data, 
      notificationType 
    }, 'notificationDataUtils');
  }

  return { isValid, errors };
}

/**
 * Create standardized notification data for payment requests
 */
export function createPaymentRequestNotificationData(
  senderId: string,
  senderName: string,
  recipientId: string,
  amount: number,
  currency: string = 'USDC',
  description?: string,
  requestId?: string
): StandardizedNotificationData {
  return {
    requestId,
    senderId: String(senderId),
    senderName: String(senderName),
    recipientId: String(recipientId),
    requester: String(senderId),
    sender: String(senderId),
    amount: Number(amount),
    currency: String(currency),
    description: description || '',
    status: 'pending'
  };
}

/**
 * Extract recipient ID from notification data
 */
export function extractRecipientId(notificationData: Record<string, unknown>): string | null {
  // For payment requests, the recipient is the current user
  // This function is mainly for validation and logging
  return notificationData?.recipientId || null;
}

/**
 * Log notification data for debugging
 */
export function logNotificationData(
  data: Record<string, unknown>,
  context: string,
  notificationType?: string
): void {
  logger.debug('Notification data log', {
    context,
    notificationType,
    data: {
      ...data,
      // Mask sensitive data
      wallet_address: data?.wallet_address ? `${data.wallet_address.substring(0, 6)}...${data.wallet_address.substring(data.wallet_address.length - 6)}` : undefined,
      wallet_public_key: data?.wallet_public_key ? `${data.wallet_public_key.substring(0, 6)}...${data.wallet_public_key.substring(data.wallet_public_key.length - 6)}` : undefined
    }
  }, 'notificationDataUtils');
}
