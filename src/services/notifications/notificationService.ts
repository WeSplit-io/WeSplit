/**
 * Unified Notification Service for WeSplit
 * Consolidates all notification functionality into a single, clean service
 * Replaces: unifiedNotificationService, firebaseNotificationService, moneyTransferNotificationService, 
 *          notificationService, notificationNavigationService, notificationCompletionService, notificationStatusService
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from '../core/loggingService';
import { validateNotificationConsistency } from '../../utils/validation/notificationValidation';
import { NotificationPayload } from '../../types/unified';

// Notification types - Focused on splits/bills and P2P transfers
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

export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: { [key: string]: any };
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

class NotificationServiceClass {
  private isInitialized = false;

  /**
   * Initialize push notifications
   */
  async initializePushNotifications(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Check if running in Expo Go (limited functionality)
      const isExpoGo = __DEV__ && Platform.OS !== 'web' && !(global as any).Expo?.modules?.expo?.modules?.ExpoModulesCore;
      if (isExpoGo) {
        logger.warn('Running in Expo Go - push notifications have limited functionality. Consider using a development build for full notification support.', null, 'NotificationService');
        // Still initialize but with limited functionality
        this.isInitialized = true;
        return true;
      }

      // Configure notification behavior
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('Push notification permissions not granted', null, 'NotificationService');
        return false;
      }

      this.isInitialized = true;
      logger.info('Push notifications initialized successfully', null, 'NotificationService');
      return true;
    } catch (error) {
      logger.error('Failed to initialize push notifications:', error, 'NotificationService');
      return false;
    }
  }

  /**
   * Create timeout wrapper for notification operations
   */
  private createTimeoutWrapper<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${operationName} timeout after ${timeoutMs/1000} seconds`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Send a notification to a user (non-blocking)
   */
  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'general',
    data: { [key: string]: any } = {}
  ): Promise<boolean> {
    // Validate notification data before sending
    const validation = validateNotificationConsistency(data as NotificationPayload, type);
    if (!validation.isValid) {
      logger.error('Invalid notification data', {
        userId,
        type,
        errors: validation.errors,
        warnings: validation.warnings
      }, 'NotificationService');
      return false;
    }
    
    if (validation.warnings.length > 0) {
      logger.warn('Notification data warnings', {
        userId,
        type,
        warnings: validation.warnings
      }, 'NotificationService');
    }
    
    // Run notification sending in background to avoid blocking transactions
    this.sendNotificationAsync(userId, title, message, type, data).catch(error => {
      logger.error('Background notification failed:', error, 'NotificationService');
    });
    
    // Return immediately to avoid blocking the caller
    return true;
  }

  /**
   * Internal method to send notification asynchronously (non-blocking)
   */
  private async sendNotificationAsync(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'general',
    data: { [key: string]: any } = {}
  ): Promise<void> {
    try {
      // Store in Firestore
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        data,
        is_read: false,
        created_at: serverTimestamp()
      });

      // Send push notification if possible
      if (this.isInitialized) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body: message,
              data: { 
                userId, 
                type, 
                notificationId: notificationRef.id, // Include notification ID for proper navigation
                ...data 
              },
            },
            trigger: null, // Send immediately
          });
          logger.info('Push notification scheduled', { userId, type }, 'NotificationService');
        } catch (notificationError) {
          if (notificationError instanceof Error && 
              (notificationError.message.includes('expo-notifications') || 
               notificationError.message.includes('Expo Go'))) {
            logger.warn('Push notification failed due to Expo Go limitations - notification stored in Firestore only', {
              userId,
              type,
              error: notificationError.message
            }, 'NotificationService');
          } else {
            logger.error('Failed to schedule push notification', {
              userId,
              type,
              error: notificationError
            }, 'NotificationService');
            
            // Retry push notification after a delay
            setTimeout(async () => {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title,
                    body: message,
                    data: { 
                      userId, 
                      type, 
                      notificationId: notificationRef.id, // Include notification ID for proper navigation
                      ...data 
                    },
                  },
                  trigger: null,
                });
                logger.info('Push notification retry successful', { userId, type }, 'NotificationService');
              } catch (retryError) {
                logger.error('Push notification retry failed', {
                  userId,
                  type,
                  error: retryError
                }, 'NotificationService');
              }
            }, 5000); // Retry after 5 seconds
          }
        }
      }

      logger.info('Notification sent successfully', { userId, type, title }, 'NotificationService');
    } catch (error) {
      logger.error('Failed to send notification:', error, 'NotificationService');
    }
  }

  /**
   * Send bulk notifications to multiple users with timeout
   */
  async sendBulkNotifications(
    userIds: string[],
    type: NotificationType,
    data?: { [key: string]: any },
    timeoutMs: number = 12000
  ): Promise<void> {
    try {
      const bulkNotificationPromise = this.sendBulkNotificationsAsync(userIds, type, data);
      await this.createTimeoutWrapper(bulkNotificationPromise, timeoutMs, 'Send bulk notifications');
      logger.info('Bulk notifications sent successfully', { userIds: userIds.length, type }, 'NotificationService');
    } catch (error) {
      logger.error('Failed to send bulk notifications:', error, 'NotificationService');
      // Don't throw - allow the operation to continue
    }
  }

  /**
   * Internal method to send bulk notifications asynchronously (non-blocking)
   */
  private async sendBulkNotificationsAsync(
    userIds: string[],
    type: NotificationType,
    data?: { [key: string]: any }
  ): Promise<void> {
    try {
      const promises = userIds.map(userId =>
        this.sendNotificationAsync(
          userId,
          this.getNotificationTitle(type),
          this.getNotificationMessage(type, data),
          type,
          data
        )
      );

      await Promise.all(promises);
      logger.info('Bulk notifications sent successfully', { userIds: userIds.length, type }, 'NotificationService');
    } catch (error) {
      logger.error('Error sending bulk notifications:', error, 'NotificationService');
    }
  }




  /**
   * Get notification title based on type
   */
  private getNotificationTitle(type: NotificationType): string {
    switch (type) {
      case 'split_payment_required':
        return 'Payment Required';
      case 'payment_received':
        return 'Payment Received';
      case 'money_sent':
        return 'Money Sent';
      case 'money_received':
        return 'Money Received';
      case 'split_invite':
        return 'Split Invitation';
      case 'split_completed':
        return 'Split Completed';
      case 'split_spin_available':
        return 'Split Spin Available';
      case 'split_loser':
        return 'Split Result';
      case 'split_winner':
        return 'You Won!';
      case 'system_warning':
        return 'System Warning';
      case 'payment_reminder':
        return 'Payment Reminder';
      case 'system_notification':
        return 'System Notification';
      case 'degen_all_locked':
        return 'All Participants Locked';
      case 'degen_ready_to_roll':
        return 'Ready to Roll!';
      case 'roulette_result':
        return 'Roulette Result';
      case 'split_lock_required':
        return 'Lock Required';
      case 'contact_added':
        return 'Contact Added';
      default:
        return 'Notification';
    }
  }

  /**
   * Get notification message based on type
   */
  private getNotificationMessage(type: NotificationType, data?: { [key: string]: any }): string {
    switch (type) {
      case 'split_payment_required':
        return `You have a payment due for ${data?.billName || 'a split'}`;
      case 'payment_received':
        return `You received a payment of ${data?.amount || 'funds'}`;
      case 'money_sent':
        return `You sent ${data?.amount || 'funds'} to ${data?.recipientName || 'someone'}`;
      case 'money_received':
        return `You received ${data?.amount || 'funds'} from ${data?.senderName || 'someone'}`;
      case 'split_invite':
        return `You're invited to split "${data?.billName || 'a bill'}"`;
      case 'split_completed':
        return `The split "${data?.billName || 'Split'}" has been completed`;
      case 'split_spin_available':
        return `The split "${data?.billName || 'Split'}" is ready to spin!`;
      case 'split_loser':
        return `The split "${data?.billName || 'Split'}" has been completed. Better luck next time!`;
      case 'split_winner':
        return `Congratulations! You won the split "${data?.billName || 'Split'}"!`;
      case 'system_warning':
        return data?.message || 'System warning';
      case 'payment_reminder':
        return `Reminder: You have a pending payment of ${data?.amount || 'funds'}`;
      case 'system_notification':
        return data?.message || 'System notification';
      case 'degen_all_locked':
        return `All participants have locked their funds for "${data?.billName || 'Degen Split'}". Ready to spin!`;
      case 'degen_ready_to_roll':
        return `The degen split "${data?.billName || 'Split'}" is ready to roll!`;
      case 'roulette_result':
        return `The roulette for "${data?.billName || 'Split'}" has been spun!`;
      case 'split_lock_required':
        return `You need to lock your funds for "${data?.billName || 'Degen Split'}" to participate.`;
      case 'contact_added':
        return `${data?.addedByName || 'Someone'} added you as a contact.`;
      default:
        return 'You have a new notification';
    }
  }

  /**
   * Send winner notification (for DegenSplit) with timeout
   */
  async sendWinnerNotification(
    winnerId: string,
    splitWalletId: string,
    billName: string,
    timeoutMs: number = 10000
  ): Promise<boolean> {
    try {
      const notificationPromise = this.sendNotificationAsync(
        winnerId,
        '🎉 You Won!',
        `Congratulations! You won the degen split for "${billName}"!`,
        'split_winner',
        { splitWalletId, billName }
      );
      
      await this.createTimeoutWrapper(notificationPromise, timeoutMs, 'Send winner notification');
      return true;
    } catch (error) {
      logger.error('Failed to send winner notification:', error, 'NotificationService');
      return false;
    }
  }

  /**
   * Send payment processing notification (non-blocking)
   */
  async sendPaymentProcessingNotification(
    userId: string,
    splitId: string,
    billName: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<boolean> {
    // Send notification in background to avoid blocking transaction
    this.sendNotificationAsync(
      userId,
      'Payment Processing',
      `Your payment of ${amount} ${currency} for "${billName}" is being processed...`,
      'general',
      {
        splitId,
        billName,
        amount,
        currency,
        status: 'processing',
        timestamp: new Date().toISOString()
      }
    ).catch(error => {
      logger.error('Payment processing notification failed:', error, 'NotificationService');
    });
    
    return true; // Return immediately to avoid blocking
  }

  /**
   * Send payment confirmed notification (non-blocking)
   */
  async sendPaymentConfirmedNotification(
    userId: string,
    splitId: string,
    billName: string,
    amount: number,
    currency: string = 'USD',
    transactionHash?: string
  ): Promise<boolean> {
    // Send notification in background to avoid blocking transaction
    this.sendNotificationAsync(
      userId,
      'Payment Confirmed',
      `Your payment of ${amount} ${currency} for "${billName}" has been confirmed!`,
      'payment_received',
      {
        splitId,
        billName,
        amount,
        currency,
        transactionHash,
        status: 'confirmed',
        timestamp: new Date().toISOString()
      }
    ).catch(error => {
      logger.error('Payment confirmed notification failed:', error, 'NotificationService');
    });
    
    return true; // Return immediately to avoid blocking
  }

  /**
   * Send payment failed notification (non-blocking)
   */
  async sendPaymentFailedNotification(
    userId: string,
    splitId: string,
    billName: string,
    amount: number,
    currency: string = 'USD',
    reason?: string
  ): Promise<boolean> {
    // Send notification in background to avoid blocking transaction
    this.sendNotificationAsync(
      userId,
      'Payment Failed',
      `Your payment of ${amount} ${currency} for "${billName}" failed${reason ? `: ${reason}` : ''}`,
      'system_warning',
      {
        splitId,
        billName,
        amount,
        currency,
        reason,
        status: 'failed',
        timestamp: new Date().toISOString()
      }
    ).catch(error => {
      logger.error('Payment failed notification failed:', error, 'NotificationService');
    });
    
    return true; // Return immediately to avoid blocking
  }

  /**
   * End payment processing notification (completes the processing state) - non-blocking
   */
  async endPaymentProcessingNotification(
    userId: string,
    splitId: string,
    billName: string,
    amount: number,
    currency: string = 'USD',
    status: 'completed' | 'failed' = 'completed',
    transactionHash?: string,
    reason?: string
  ): Promise<boolean> {
    const title = status === 'completed' ? 'Payment Completed' : 'Payment Failed';
    const message = status === 'completed' 
      ? `Your payment of ${amount} ${currency} for "${billName}" has been completed successfully!`
      : `Your payment of ${amount} ${currency} for "${billName}" failed${reason ? `: ${reason}` : ''}`;

    // Send notification in background to avoid blocking transaction
    this.sendNotificationAsync(
      userId,
      title,
      message,
      status === 'completed' ? 'payment_received' : 'system_warning',
      {
        splitId,
        billName,
        amount,
        currency,
        status,
        transactionHash,
        reason,
        timestamp: new Date().toISOString()
      }
    ).catch(error => {
      logger.error('End payment processing notification failed:', error, 'NotificationService');
    });
    
    return true; // Return immediately to avoid blocking
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        is_read: true,
        read_at: serverTimestamp()
      });
      
      logger.info('Notification marked as read', { notificationId }, 'NotificationService');
      return true;
    } catch (error) {
      logger.error('Failed to mark notification as read:', error, 'NotificationService');
      return false;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      
      logger.info('Notification deleted', { notificationId }, 'NotificationService');
      return true;
    } catch (error) {
      logger.error('Failed to delete notification:', error, 'NotificationService');
      return false;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limitCount: number = 50): Promise<NotificationData[]> {
    try {
      const notificationsRef = collection(db, 'notifications');
      const notificationsQuery = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      const notificationsDocs = await getDocs(notificationsQuery);
      
      return notificationsDocs.docs.map(doc => ({
        id: doc.id,
        userId: doc.data().userId,
        type: doc.data().type,
        title: doc.data().title,
        message: doc.data().message,
        data: doc.data().data || {},
        is_read: doc.data().is_read || false,
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        read_at: doc.data().read_at?.toDate?.()?.toISOString()
      }));
    } catch (error) {
      logger.error('Failed to get user notifications:', error, 'NotificationService');
      return [];
    }
  }

  /**
   * Navigate from notification (handles both push and in-app notifications)
   */
  async navigateFromNotification(
    notification: { id: string; type: NotificationType; data?: any },
    navigation: any,
    currentUserId: string
  ): Promise<void> {
    try {
      logger.info('Navigating from notification', {
        notificationId: notification.id,
        type: notification.type,
        data: notification.data
      }, 'NotificationService');

      // Mark notification as read first
      await this.markAsRead(notification.id);

      // Handle navigation based on notification type
      switch (notification.type) {
        case 'split_invite':
          if (notification.data?.splitId) {
            navigation.navigate('SplitDetails', {
              splitId: notification.data.splitId,
              isFromNotification: true,
              notificationId: notification.id
            });
          } else {
            logger.warn('Split invite notification missing splitId', { notification }, 'NotificationService');
            navigation.navigate('SplitsList');
          }
          break;

        case 'split_payment_required':
          if (notification.data?.splitId) {
            // Navigate to the appropriate split screen based on split type
            if (notification.data.splitType === 'fair') {
              navigation.navigate('FairSplit', {
                splitData: { id: notification.data.splitId },
                isFromNotification: true,
                notificationId: notification.id
              });
            } else if (notification.data.splitType === 'degen') {
              navigation.navigate('DegenLock', {
                splitData: { id: notification.data.splitId },
                isFromNotification: true,
                notificationId: notification.id
              });
            } else {
              navigation.navigate('SplitDetails', {
                splitId: notification.data.splitId,
                isFromNotification: true,
                notificationId: notification.id
              });
            }
          } else {
            logger.warn('Split payment notification missing splitId', { notification }, 'NotificationService');
            navigation.navigate('SplitsList');
          }
          break;

        case 'payment_request':
          if (notification.data?.requestId) {
            navigation.navigate('RequestConfirmation', {
              requestId: notification.data.requestId,
              isFromNotification: true,
              notificationId: notification.id
            });
          } else {
            logger.warn('Payment request notification missing requestId', { notification }, 'NotificationService');
            navigation.navigate('Dashboard');
          }
          break;

        case 'payment_reminder':
          if (notification.data?.requestId) {
            navigation.navigate('RequestConfirmation', {
              requestId: notification.data.requestId,
              isFromNotification: true,
              notificationId: notification.id
            });
          } else {
            logger.warn('Payment reminder notification missing requestId', { notification }, 'NotificationService');
            navigation.navigate('Dashboard');
          }
          break;


        case 'contact_added':
          navigation.navigate('Contacts', {
            isFromNotification: true,
            notificationId: notification.id
          });
          break;

        case 'general':
        default:
          // For general notifications, navigate to notifications screen
          navigation.navigate('Notifications', {
            isFromNotification: true,
            notificationId: notification.id
          });
          break;
      }

      logger.info('Successfully navigated from notification', {
        notificationId: notification.id,
        type: notification.type
      }, 'NotificationService');

    } catch (error) {
      logger.error('Failed to navigate from notification', {
        notificationId: notification.id,
        type: notification.type,
        error
      }, 'NotificationService');
      
      // Fallback navigation with error handling
      try {
        navigation.navigate('Dashboard');
      } catch (fallbackError) {
        logger.error('Fallback navigation also failed', {
          notificationId: notification.id,
          error: fallbackError
        }, 'NotificationService');
      }
    }
  }
}

// Export singleton instance
// Lazy singleton to avoid initialization issues during module loading
let _notificationService: NotificationServiceClass | null = null;

export const notificationService = {
  get instance() {
    if (!_notificationService) {
      _notificationService = new NotificationServiceClass();
    }
    return _notificationService;
  }
};
export default notificationService;