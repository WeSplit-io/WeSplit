/**
 * Notification Validation Utilities
 * Provides validation for notification data consistency
 */

import { 
  NotificationPayload, 
  NotificationType, 
  NotificationValidationResult,
  SplitNotificationData,
  PaymentRequestNotificationData,
  GroupInviteNotificationData,
  SplitInviteNotificationData
} from '../types/notificationTypes';

/**
 * Validate notification payload based on type
 */
export function validateNotificationPayload(
  data: NotificationPayload,
  type: NotificationType
): NotificationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Common validations
  if (!data) {
    errors.push('Notification data is required');
    return { isValid: false, errors, warnings };
  }

  // Type-specific validations
  switch (type) {
    case 'split_payment_required':
    case 'split_invite':
      validateSplitNotificationData(data, errors, warnings);
      break;
    
    case 'payment_request':
    case 'payment_reminder':
      validatePaymentRequestNotificationData(data, errors, warnings);
      break;
    
    case 'group_invite':
      validateGroupInviteNotificationData(data, errors, warnings);
      break;
    
    case 'split_invite':
      validateSplitInviteNotificationData(data, errors, warnings);
      break;
    
    default:
      // Basic validation for other types
      validateBasicNotificationData(data, errors, warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate split notification data
 */
function validateSplitNotificationData(
  data: NotificationPayload,
  errors: string[],
  warnings: string[]
): void {
  if (!data.splitId) {
    errors.push('splitId is required for split notifications');
  }
  
  if (!data.splitWalletId) {
    errors.push('splitWalletId is required for split notifications');
  }
  
  if (!data.billName) {
    errors.push('billName is required for split notifications');
  }
  
  if (typeof data.participantAmount !== 'number' || data.participantAmount <= 0) {
    errors.push('participantAmount must be a positive number');
  }
  
  if (typeof data.totalAmount !== 'number' || data.totalAmount <= 0) {
    errors.push('totalAmount must be a positive number');
  }
  
  if (data.splitType && !['fair', 'degen'].includes(data.splitType)) {
    errors.push('splitType must be either "fair" or "degen"');
  }
  
  if (!data.currency) {
    warnings.push('currency not specified, defaulting to USDC');
  }
}

/**
 * Validate payment request notification data
 */
function validatePaymentRequestNotificationData(
  data: NotificationPayload,
  errors: string[],
  warnings: string[]
): void {
  if (!data.senderId) {
    errors.push('senderId is required for payment request notifications');
  }
  
  if (!data.senderName) {
    errors.push('senderName is required for payment request notifications');
  }
  
  if (!data.recipientId) {
    errors.push('recipientId is required for payment request notifications');
  }
  
  if (typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push('amount must be a positive number');
  }
  
  if (!data.currency) {
    warnings.push('currency not specified, defaulting to USDC');
  }
  
  if (!data.requestId) {
    errors.push('requestId is required for payment request notifications');
  }
}

/**
 * Validate group invite notification data
 */
function validateGroupInviteNotificationData(
  data: NotificationPayload,
  errors: string[],
  warnings: string[]
): void {
  if (!data.groupId) {
    errors.push('groupId is required for group invite notifications');
  }
  
  if (!data.groupName) {
    errors.push('groupName is required for group invite notifications');
  }
  
  if (!data.inviteId) {
    errors.push('inviteId is required for group invite notifications');
  }
}

/**
 * Validate split invite notification data
 */
function validateSplitInviteNotificationData(
  data: NotificationPayload,
  errors: string[],
  warnings: string[]
): void {
  if (!data.splitId) {
    errors.push('splitId is required for split invite notifications');
  }
  
  if (!data.billName) {
    errors.push('billName is required for split invite notifications');
  }
  
  if (!data.splitType || !['fair', 'degen'].includes(data.splitType)) {
    errors.push('splitType must be either "fair" or "degen"');
  }
  
  if (typeof data.totalAmount !== 'number' || data.totalAmount <= 0) {
    errors.push('totalAmount must be a positive number');
  }
  
  if (typeof data.participantCount !== 'number' || data.participantCount <= 0) {
    errors.push('participantCount must be a positive number');
  }
}

/**
 * Validate basic notification data
 */
function validateBasicNotificationData(
  data: NotificationPayload,
  errors: string[],
  warnings: string[]
): void {
  if (data.amount && (typeof data.amount !== 'number' || data.amount <= 0)) {
    errors.push('amount must be a positive number');
  }
  
  if (data.currency && typeof data.currency !== 'string') {
    errors.push('currency must be a string');
  }
}

/**
 * Create standardized split notification data
 */
export function createSplitNotificationData(
  splitId: string,
  splitWalletId: string,
  splitType: 'fair' | 'degen',
  billName: string,
  participantAmount: number,
  totalAmount: number,
  currency: string = 'USDC',
  additionalData: Partial<NotificationPayload> = {}
): SplitNotificationData {
  return {
    splitId,
    splitWalletId,
    splitType,
    billName,
    participantAmount,
    totalAmount,
    currency,
    timestamp: new Date().toISOString(),
    ...additionalData
  };
}

/**
 * Create standardized payment request notification data
 */
export function createPaymentRequestNotificationData(
  senderId: string,
  senderName: string,
  recipientId: string,
  amount: number,
  currency: string = 'USDC',
  requestId: string,
  description?: string,
  groupId?: string,
  groupName?: string
): PaymentRequestNotificationData {
  return {
    senderId,
    senderName,
    recipientId,
    amount,
    currency,
    requestId,
    description,
    groupId,
    groupName,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create standardized group invite notification data
 */
export function createGroupInviteNotificationData(
  groupId: string,
  groupName: string,
  inviteId: string,
  inviteLink?: string
): GroupInviteNotificationData {
  return {
    groupId,
    groupName,
    inviteId,
    inviteLink,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create standardized split invite notification data
 */
export function createSplitInviteNotificationData(
  splitId: string,
  billName: string,
  splitType: 'fair' | 'degen',
  totalAmount: number,
  participantCount: number,
  currency: string = 'USDC'
): SplitInviteNotificationData {
  return {
    splitId,
    billName,
    splitType,
    totalAmount,
    participantCount,
    currency,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate notification data consistency across the app
 */
export function validateNotificationConsistency(
  data: NotificationPayload,
  type: NotificationType
): NotificationValidationResult {
  const result = validateNotificationPayload(data, type);
  
  // Additional consistency checks (only if data is valid)
  if (data && typeof data === 'object') {
    if (data.amount && data.currency) {
      // Check if amount is reasonable for the currency
      if (data.currency === 'USDC' && data.amount > 1000000) {
        result.warnings.push('Amount seems unusually high for USDC');
      }
    }
    
    if (data.splitId && data.splitWalletId) {
      // Check if split and wallet IDs are consistent
      if (data.splitId.length < 10 || data.splitWalletId.length < 10) {
        result.warnings.push('Split or wallet ID seems unusually short');
      }
    }
  }
  
  return result;
}
