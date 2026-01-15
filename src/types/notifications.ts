/**
 * Unified Notification Types and Interfaces
 * Single source of truth for all notification-related types
 */

// Unified notification types - comprehensive list
export type NotificationType = 
  | 'general'
  | 'payment_received'
  | 'payment_sent'
  | 'split_payment_required'
  | 'split_completed'
  | 'payment_request'
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
  | 'contact_added'
  | 'split_accepted'
  | 'split_declined'
  | 'split_paid'
  | 'split_confirmed'
  | 'shared_wallet_invite'
  | 'shared_wallet_funding'
  | 'shared_wallet_withdrawal'
  | 'shared_wallet_goal_reached'
  | 'shared_wallet_permissions_updated';

// Unified notification data interface
export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: { [key: string]: any };
  is_read: boolean;
  created_at: string;
  read_at?: string;
  user_id: string; // For backward compatibility
  status?: 'pending' | 'paid' | 'cancelled'; // For backward compatibility
}

// Unified notification payload interface
export interface NotificationPayload {
  // Common fields
  senderId?: string;
  senderName?: string;
  recipientId?: string;
  recipientName?: string;
  amount?: number;
  currency?: string;
  description?: string;
  
  // Request/Split specific
  requestId?: string;
  splitId?: string;
  
  // Transaction specific
  transactionId?: string;
  signature?: string;
  status?: string;
  
  // Additional context
  [key: string]: any;
}

// Legacy notification interface for backward compatibility
export interface LegacyNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean; // Legacy field name
  created_at: string;
  user_id: string;
}

// Type guards for notification validation
export function isNotificationType(type: string): type is NotificationType {
  const validTypes: NotificationType[] = [
    'general', 'payment_received', 'payment_sent', 'split_payment_required',
    'split_completed', 'payment_request', 'money_sent', 'money_received', 
    'split_spin_available', 'split_loser', 'split_winner', 'system_warning', 
    'payment_reminder', 'split_invite', 'system_notification', 'degen_all_locked', 
    'degen_ready_to_roll', 'roulette_result', 'split_lock_required', 'contact_added', 
    'split_accepted', 'split_declined', 'split_paid', 'split_confirmed',
    'shared_wallet_invite', 'shared_wallet_funding', 'shared_wallet_withdrawal', 
    'shared_wallet_goal_reached', 'shared_wallet_permissions_updated'
  ];
  return validTypes.includes(type as NotificationType);
}

// Utility function to convert legacy notification to unified format
export function convertLegacyNotification(legacy: LegacyNotification): NotificationData {
  return {
    id: legacy.id,
    userId: legacy.user_id,
    type: legacy.type,
    title: legacy.title,
    message: legacy.message,
    data: legacy.data,
    is_read: legacy.read, // Convert read to is_read
    created_at: legacy.created_at,
    user_id: legacy.user_id // Keep for backward compatibility
  };
}

// Utility function to convert unified notification to legacy format
export function convertToLegacyNotification(unified: NotificationData): LegacyNotification {
  return {
    id: unified.id,
    type: unified.type,
    title: unified.title,
    message: unified.message,
    data: unified.data,
    read: unified.is_read, // Convert is_read to read
    created_at: unified.created_at,
    user_id: unified.user_id
  };
}
