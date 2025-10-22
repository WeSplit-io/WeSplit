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
import { db } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from './loggingService';

// Notification types
export type NotificationType = 
  | 'general'
  | 'payment_received'
  | 'payment_sent'
  | 'split_payment_required'
  | 'split_completed'
  | 'group_invite'
  | 'payment_request'
  | 'settlement_request'
  | 'money_sent'
  | 'money_received'
  | 'split_spin_available'
  | 'split_loser'
  | 'split_winner'
  | 'group_added'
  | 'system_warning'
  | 'payment_reminder'
  | 'split_invite'
  | 'group_payment_request'
  | 'system_notification';

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
   * Send a notification to a user
   */
  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'general',
    data: { [key: string]: any } = {}
  ): Promise<boolean> {
    try {
      // Store in Firestore
      await addDoc(collection(db, 'notifications'), {
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
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body: message,
            data: { userId, type, ...data },
          },
          trigger: null, // Send immediately
        });
      }

      logger.info('Notification sent successfully', { userId, type, title }, 'NotificationService');
      return true;
    } catch (error) {
      logger.error('Failed to send notification:', error, 'NotificationService');
      return false;
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotifications(
    userIds: string[],
    type: NotificationType,
    data?: { [key: string]: any }
  ): Promise<void> {
    try {
      const promises = userIds.map(userId =>
        this.sendNotification(
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
      throw new Error(`Failed to send bulk notifications: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limitCount: number = 50): Promise<NotificationData[]> {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type || 'general',
          data: data.data || {},
          is_read: data.is_read || false,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          read_at: data.read_at?.toDate?.()?.toISOString()
        };
      });
    } catch (error) {
      logger.error('Error fetching notifications:', error, 'NotificationService');
      return [];
    }
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
      return true;
    } catch (error) {
      logger.error('Error marking notification as read:', error, 'NotificationService');
      return false;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error, 'NotificationService');
      return false;
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
      case 'group_invite':
        return 'Group Invitation';
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
      case 'group_added':
        return 'Added to Group';
      case 'system_warning':
        return 'System Warning';
      case 'payment_reminder':
        return 'Payment Reminder';
      case 'group_payment_request':
        return 'Group Payment Request';
      case 'system_notification':
        return 'System Notification';
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
      case 'group_invite':
        return `You've been invited to join ${data?.groupName || 'a group'}`;
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
      case 'group_added':
        return `You've been added to ${data?.groupName || 'a group'}`;
      case 'system_warning':
        return data?.message || 'System warning';
      case 'payment_reminder':
        return `Reminder: You have a pending payment of ${data?.amount || 'funds'}`;
      case 'group_payment_request':
        return `You have a group payment request for ${data?.amount || 'funds'}`;
      case 'system_notification':
        return data?.message || 'System notification';
      default:
        return 'You have a new notification';
    }
  }

  /**
   * Send winner notification (for DegenSplit)
   */
  async sendWinnerNotification(
    winnerId: string,
    splitWalletId: string,
    billName: string
  ): Promise<boolean> {
    return this.sendNotification(
      winnerId,
      'You Won!',
      `Congratulations! You won the split "${billName}"!`,
      'split_winner',
      { splitWalletId, billName }
    );
  }
}

// Export singleton instance
export const notificationService = new NotificationServiceClass();
export default notificationService;