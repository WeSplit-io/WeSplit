/**
 * Unified Notification Types
 * Provides consistent data structures for all notification types
 */

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

export interface NotificationData extends BaseNotificationData {
  read: boolean;
  user_id: string;
}

export type NotificationType = 
  | 'general'
  | 'payment_received'
  | 'payment_sent'
  | 'split_payment_required'
  | 'split_completed'
  | 'payment_request'
  | 'settlement_request'
  | 'money_sent'
  | 'money_received'
  | 'split_spin_available'
  | 'split_loser'
  | 'split_winner'
  | 'system_warning'
  | 'payment_reminder'
  | 'split_invite'
  | 'system_notification'
  | 'degen_all_locked'
  | 'degen_ready_to_roll'
  | 'roulette_result'
  | 'split_lock_required'
  | 'contact_added';

// Unified notification payload interface
export interface NotificationPayload {
  // Common fields
  senderId?: string;
  senderName?: string;
  recipientId?: string;
  recipientName?: string;
  amount?: number;
  currency?: string;
  
  // Split-specific fields
  splitId?: string;
  splitWalletId?: string;
  splitType?: 'fair' | 'degen';
  splitStatus?: string;
  billName?: string;
  billId?: string;
  participantAmount?: number;
  totalAmount?: number;
  
  // Payment request fields
  requestId?: string;
  expenseId?: string;
  description?: string;
  note?: string;
  
  // Transaction fields
  transactionId?: string;
  transactionHash?: string;
  status?: string;
  
  // Deep link fields
  shareableLink?: string;
  splitInvitationData?: string;
  
  // Additional context
  timestamp?: string;
  [key: string]: any;
}

// Specific notification data interfaces
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
