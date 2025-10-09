/**
 * Unified Notification Service for WeSplit
 * Consolidates all notification functionality into a single, clean service
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
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { logger } from './loggingService';

// Unified notification types
export type NotificationType = 
  | 'payment_request' 
  | 'payment_received' 
  | 'payment_reminder'
  | 'money_sent' 
  | 'money_received'
  | 'group_invite' 
  | 'group_payment_request'
  | 'group_payment_sent'
  | 'group_payment_received'
  | 'settlement_request' 
  | 'settlement_notification'
  | 'expense_added'
  | 'split_completed'
  | 'degen_all_locked'
  | 'degen_ready_to_roll'
  | 'roulette_result'
  | 'contact_added'
  | 'system_warning'
  | 'system_notification'
  | 'general';

export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: {
    amount?: number;
    currency?: string;
    senderId?: string;
    senderName?: string;
    recipientId?: string;
    recipientName?: string;
    groupId?: string;
    groupName?: string;
    splitId?: string;
    splitWalletId?: string;
    billName?: string;
    transactionId?: string;
    inviteLink?: string;
    status?: 'pending' | 'paid' | 'cancelled' | 'completed';
    [key: string]: any;
  };
  is_read: boolean;
  created_at: string;
}

// Data transformation utilities
const notificationTransformers = {
  firestoreToNotification: (doc: any): NotificationData => ({
    id: doc.id,
    userId: doc.data().userId || doc.data().user_id || '',
    title: doc.data().title || '',
    message: doc.data().message || '',
    type: doc.data().type || 'general',
    data: doc.data().data || {},
    is_read: doc.data().is_read || doc.data().read || false,
    created_at: doc.data().created_at?.toDate?.()?.toISOString() || 
                doc.data().createdAt?.toDate?.()?.toISOString() || 
                new Date().toISOString()
  }),

  notificationToFirestore: (notification: Omit<NotificationData, 'id' | 'created_at'>): any => ({
    userId: notification.userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    data: notification.data || {},
    is_read: notification.is_read,
    created_at: serverTimestamp()
  })
};

export class UnifiedNotificationService {
  private static pushNotificationsInitialized = false;

  /**
   * Initialize push notifications
   */
  static async initializePushNotifications(): Promise<boolean> {
    try {
      if (this.pushNotificationsInitialized) {
        return true;
      }

      if (!Device.isDevice) {
        console.log('📱 Push notifications require a physical device');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('📱 Push notification permission denied');
        return false;
      }

      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      this.pushNotificationsInitialized = true;
      logger.info('Push notifications initialized successfully', {}, 'UnifiedNotificationService');
      return true;
    } catch (error) {
      logger.error('Failed to initialize push notifications', error, 'UnifiedNotificationService');
      return false;
    }
  }

  /**
   * Send notification to a specific user
   */
  static async sendNotification(
    userId: string | number,
    title: string,
    message: string,
    type: NotificationType,
    data?: any
  ): Promise<NotificationData> {
    try {
      console.log('📬 Sending notification:', { userId, title, message, type });
      
      const notificationData = notificationTransformers.notificationToFirestore({
        userId: String(userId),
        title,
        message,
        type,
        data,
        is_read: false
      });

      const notificationRef = await addDoc(collection(db, 'notifications'), notificationData);
      const notificationDoc = await getDoc(notificationRef);
      const notification = notificationTransformers.firestoreToNotification(notificationDoc);
      
      // Send push notification if initialized
      if (this.pushNotificationsInitialized) {
        await this.sendPushNotification(title, message, { type, ...data });
      }
      
      console.log('📬 Notification sent successfully:', notification.id);
      return notification;
    } catch (error) {
      console.error('📬 Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send notifications to multiple users
   */
  static async sendNotificationsToUsers(
    userIds: (string | number)[],
    title: string,
    message: string,
    type: NotificationType,
    data?: any
  ): Promise<NotificationData[]> {
    try {
      console.log('📬 Sending bulk notifications to', userIds.length, 'users');
      
      const batch = writeBatch(db);
      const notifications: NotificationData[] = [];
      
      for (const userId of userIds) {
        const notificationData = notificationTransformers.notificationToFirestore({
          userId: String(userId),
          title,
          message,
          type,
          data,
          is_read: false
        });
        
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, notificationData);
        
        notifications.push({
          id: notificationRef.id,
          userId: String(userId),
          title,
          message,
          type,
          data: data || {},
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
      
      await batch.commit();
      
      // Send push notifications
      if (this.pushNotificationsInitialized) {
        await this.sendPushNotification(title, message, { type, ...data });
      }
      
      console.log('📬 Bulk notifications sent successfully');
      return notifications;
    } catch (error) {
      console.error('📬 Error sending bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId: string | number, limitCount: number = 50): Promise<NotificationData[]> {
    try {
      const notificationsRef = collection(db, 'notifications');
      
      try {
        const notificationsQuery = query(
          notificationsRef,
          where('userId', '==', String(userId)),
          orderBy('created_at', 'desc'),
          limit(limitCount)
        );
        
        const querySnapshot = await getDocs(notificationsQuery);
        return querySnapshot.docs.map(doc => 
          notificationTransformers.firestoreToNotification(doc)
        );
      } catch (queryError) {
        console.log('📬 Main query failed, trying fallback query');
        
        // Fallback: try without orderBy
        const fallbackQuery = query(
          notificationsRef,
          where('userId', '==', String(userId)),
          limit(limitCount)
        );
        
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackNotifications = fallbackSnapshot.docs.map(doc => 
          notificationTransformers.firestoreToNotification(doc)
        );
        
        // Sort manually
        fallbackNotifications.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        return fallbackNotifications;
      }
    } catch (error) {
      console.error('📬 Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        is_read: true,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('📬 Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  static async markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      for (const notificationId of notificationIds) {
        const notificationRef = doc(db, 'notifications', notificationId);
        batch.update(notificationRef, {
          is_read: true,
          updated_at: serverTimestamp()
        });
      }
      
      await batch.commit();
    } catch (error) {
      console.error('📬 Error marking multiple notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
    } catch (error) {
      console.error('📬 Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadNotificationCount(userId: string | number): Promise<number> {
    try {
      const notificationsRef = collection(db, 'notifications');
      const unreadQuery = query(
        notificationsRef,
        where('userId', '==', String(userId)),
        where('is_read', '==', false)
      );
      
      const querySnapshot = await getDocs(unreadQuery);
      return querySnapshot.docs.length;
    } catch (error) {
      console.error('📬 Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
      return true;
    } catch (error) {
      console.error('📬 Error sending push notification:', error);
      return false;
    }
  }

  // Specialized notification methods
  static async sendPaymentRequestNotification(
    recipientId: string,
    senderId: string,
    senderName: string,
    amount: number,
    currency: string,
    groupId?: string,
    groupName?: string
  ): Promise<NotificationData> {
    const title = groupId ? 'Group Payment Request' : 'Payment Request';
    const message = groupId 
      ? `${senderName} requests ${amount} ${currency} for ${groupName}`
      : `${senderName} requests ${amount} ${currency}`;

    return this.sendNotification(
      recipientId,
      title,
      message,
      groupId ? 'group_payment_request' : 'payment_request',
      {
        senderId,
        senderName,
        amount,
        currency,
        groupId,
        groupName,
        status: 'pending'
      }
    );
  }

  static async sendMoneyTransferNotification(
    recipientId: string,
    senderId: string,
    senderName: string,
    amount: number,
    currency: string,
    transactionId: string,
    isGroupPayment: boolean = false,
    groupId?: string,
    groupName?: string
  ): Promise<NotificationData> {
    const title = isGroupPayment ? 'Group Payment Received' : 'Money Received';
    const message = isGroupPayment
      ? `${senderName} sent ${amount} ${currency} to ${groupName}`
      : `You received ${amount} ${currency} from ${senderName}`;

    return this.sendNotification(
      recipientId,
      title,
      message,
      isGroupPayment ? 'group_payment_received' : 'money_received',
      {
        senderId,
        senderName,
        amount,
        currency,
        transactionId,
        groupId,
        groupName,
        status: 'completed'
      }
    );
  }

  static async sendGroupInviteNotification(
    recipientId: string,
    inviterName: string,
    groupId: string,
    groupName: string,
    inviteLink: string
  ): Promise<NotificationData> {
    return this.sendNotification(
      recipientId,
      'Group Invitation',
      `${inviterName} invited you to join ${groupName}`,
      'group_invite',
      {
        groupId,
        groupName,
        inviterName,
        inviteLink,
        status: 'pending'
      }
    );
  }
}

// Export for backward compatibility
export const firebaseNotificationService = UnifiedNotificationService;
export const sendNotification = UnifiedNotificationService.sendNotification;
export const getUserNotifications = UnifiedNotificationService.getUserNotifications;
export const markNotificationAsRead = UnifiedNotificationService.markNotificationAsRead;
