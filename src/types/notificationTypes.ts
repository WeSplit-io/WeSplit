/**
 * DEPRECATED: Use src/types/notifications.ts instead
 * This file is kept for backward compatibility only
 */

// Re-export unified types
export { NotificationType, NotificationData, NotificationPayload } from './notifications';

// Legacy interfaces for backward compatibility
export interface BaseNotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationPayload;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
  read_at?: string;
}

// Legacy notification data interface with both field names for compatibility
export interface LegacyNotificationData extends BaseNotificationData {
  read: boolean; // Legacy field name
  user_id: string; // Legacy field name
}

// Specific notification data interfaces (kept for specialized use cases)
export interface SplitNotificationData extends NotificationPayload {
  splitId: string;
  splitWalletId: string;
  splitType: 'fair' | 'degen';
  billName: string;
  participantAmount: number;
  totalAmount: number;
}

export interface PaymentRequestNotificationData extends NotificationPayload {
  senderId: string;
  senderName: string;
  recipientId: string;
  amount: number;
  currency: string;
  requestId: string;
  description?: string;
}

export interface SplitInviteNotificationData extends NotificationPayload {
  splitId: string;
  billName: string;
  splitType: 'fair' | 'degen';
  totalAmount: number;
  participantCount: number;
}

// Notification validation result
export interface NotificationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Notification creation parameters
export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationPayload;
}

// Notification update parameters
export interface UpdateNotificationParams {
  id: string;
  is_read?: boolean;
  read_at?: string;
  data?: Partial<NotificationPayload>;
}

// Notification query parameters
export interface NotificationQueryParams {
  userId: string;
  type?: NotificationType;
  is_read?: boolean;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

// Notification response
export interface NotificationResponse {
  success: boolean;
  notification?: BaseNotificationData;
  error?: string;
}

// Bulk notification response
export interface BulkNotificationResponse {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

// Notification statistics
export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  recentActivity: BaseNotificationData[];
}