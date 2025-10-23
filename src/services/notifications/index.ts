/**
 * Notification Services
 * Centralized exports for all notification-related services
 */

// Notification services
export { notificationService } from './notificationService';

// Re-export commonly used types
export type { 
  NotificationData,
  NotificationType,
  NotificationPayload
} from '../../types/notifications';

// Default export for backward compatibility
export { notificationService as default } from './notificationService';