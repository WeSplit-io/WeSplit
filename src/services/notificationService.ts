/**
 * Notification Service for WeSplit
 * Handles push notifications for split events
 */

import { logger } from './loggingService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export interface NotificationData {
  id: string;
  userId: string;
  type: 'split_lock_required' | 'split_spin_available' | 'split_winner' | 'split_loser' | 'split_payment_required';
  title: string;
  message: string;
  splitWalletId?: string;
  billId?: string;
  billName?: string;
  amount?: number;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

export class NotificationService {
  /**
   * Initialize push notifications
   */
  static async initializePushNotifications(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
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

      logger.info('Push notifications initialized successfully', {}, 'NotificationService');
      return true;
    } catch (error) {
      logger.error('Failed to initialize push notifications', error, 'NotificationService');
      return false;
    }
  }

  /**
   * Get push notification token
   */
  static async getPushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (error) {
      logger.error('Failed to get push token', error, 'NotificationService');
      return null;
    }
  }

  /**
   * Send push notification
   */
  static async sendPushNotification(
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

      logger.info('Push notification sent successfully', { title, body }, 'NotificationService');
      return true;
    } catch (error) {
      logger.error('Failed to send push notification', error, 'NotificationService');
      return false;
    }
  }

  /**
   * Send notification to lock currency for Degen Split
   */
  static async sendLockRequiredNotification(
    userId: string,
    splitWalletId: string,
    billName: string,
    amount: number
  ): Promise<NotificationResult> {
    try {
      console.log('🔍 NotificationService: Creating lock required notification:', {
        userId,
        splitWalletId,
        billName,
        amount,
        amountType: typeof amount
      });
      
      const notification: NotificationData = {
        id: `notification_${Date.now()}_${userId}`,
        userId,
        type: 'split_lock_required',
        title: '🔒 Lock Required for Degen Split',
        message: `You need to lock ${amount} USDC for the "${billName}" degen split. The spinning will begin once everyone has locked their amount.`,
        splitWalletId,
        billName,
        amount,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      
      console.log('🔍 NotificationService: Notification object:', notification);

      await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: serverTimestamp(),
      });

      // Send push notification
      await this.sendPushNotification(
        notification.title,
        notification.message,
        {
          type: notification.type,
          splitWalletId: notification.splitWalletId,
          billName: notification.billName,
          amount: notification.amount
        }
      );

      logger.info('Lock required notification sent', {
        userId,
        splitWalletId,
        amount,
      }, 'NotificationService');

      return {
        success: true,
        notificationId: notification.id,
      };

    } catch (error) {
      console.error('[ERROR] [NotificationService] Failed to send lock required notification', error);
      console.error('[ERROR] [NotificationService] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        customData: (error as any)?.customData
      });
      logger.error('Failed to send lock required notification', error, 'NotificationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send notification that spinning is now available
   */
  static async sendSpinAvailableNotification(
    userId: string,
    splitWalletId: string,
    billName: string
  ): Promise<NotificationResult> {
    try {
      const notification: NotificationData = {
        id: `notification_${Date.now()}_${userId}`,
        userId,
        type: 'split_spin_available',
        title: '🎰 Degen Split Spinning Available!',
        message: `All participants have locked their amounts for "${billName}". The creator can now start the spinning to determine who pays!`,
        splitWalletId,
        billName,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: serverTimestamp(),
      });

      logger.info('Spin available notification sent', {
        userId,
        splitWalletId,
      }, 'NotificationService');

      return {
        success: true,
        notificationId: notification.id,
      };

    } catch (error) {
      logger.error('Failed to send spin available notification', error, 'NotificationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send winner notification
   */
  static async sendWinnerNotification(
    userId: string,
    splitWalletId: string,
    billName: string
  ): Promise<NotificationResult> {
    try {
      const notification: NotificationData = {
        id: `notification_${Date.now()}_${userId}`,
        userId,
        type: 'split_winner',
        title: '🎉 GG Well Played!',
        message: `Congratulations! You won the degen split for "${billName}". You don't have to pay anything! 🍀`,
        splitWalletId,
        billName,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: serverTimestamp(),
      });

      logger.info('Winner notification sent', {
        userId,
        splitWalletId,
      }, 'NotificationService');

      return {
        success: true,
        notificationId: notification.id,
      };

    } catch (error) {
      logger.error('Failed to send winner notification', error, 'NotificationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send loser notification
   */
  static async sendLoserNotification(
    userId: string,
    splitWalletId: string,
    billName: string,
    amount: number
  ): Promise<NotificationResult> {
    try {
      const notification: NotificationData = {
        id: `notification_${Date.now()}_${userId}`,
        userId,
        type: 'split_loser',
        title: '😅 Bad Luck Today!',
        message: `Unfortunately, today is not your day! You need to pay ${amount} USDC for "${billName}". Come to the app to complete your payment.`,
        splitWalletId,
        billName,
        amount,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: serverTimestamp(),
      });

      logger.info('Loser notification sent', {
        userId,
        splitWalletId,
        amount,
      }, 'NotificationService');

      return {
        success: true,
        notificationId: notification.id,
      };

    } catch (error) {
      logger.error('Failed to send loser notification', error, 'NotificationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send payment required notification for Fair Split
   */
  static async sendPaymentRequiredNotification(
    userId: string,
    splitWalletId: string,
    billName: string,
    amount: number
  ): Promise<NotificationResult> {
    try {
      const notification: NotificationData = {
        id: `notification_${Date.now()}_${userId}`,
        userId,
        type: 'split_payment_required',
        title: '💰 Payment Required',
        message: `Please pay your share of ${amount} USDC for "${billName}". The split wallet has been created and is ready to receive payments.`,
        splitWalletId,
        billName,
        amount,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: serverTimestamp(),
      });

      logger.info('Payment required notification sent', {
        userId,
        splitWalletId,
        amount,
      }, 'NotificationService');

      return {
        success: true,
        notificationId: notification.id,
      };

    } catch (error) {
      logger.error('Failed to send payment required notification', error, 'NotificationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send notifications to multiple users
   */
  static async sendBulkNotifications(
    userIds: string[],
    notificationType: NotificationData['type'],
    data: Partial<NotificationData>
  ): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
    console.log('🔍 NotificationService: sendBulkNotifications called with:', {
      userIds,
      notificationType,
      data
    });
    
    const results = await Promise.allSettled(
      userIds.map(userId => {
        switch (notificationType) {
          case 'split_lock_required':
            return this.sendLockRequiredNotification(
              userId,
              data.splitWalletId!,
              data.billName!,
              data.amount!
            );
          case 'split_spin_available':
            return this.sendSpinAvailableNotification(
              userId,
              data.splitWalletId!,
              data.billName!
            );
          case 'split_winner':
            return this.sendWinnerNotification(
              userId,
              data.splitWalletId!,
              data.billName!
            );
          case 'split_loser':
            return this.sendLoserNotification(
              userId,
              data.splitWalletId!,
              data.billName!,
              data.amount!
            );
          case 'split_payment_required':
            return this.sendPaymentRequiredNotification(
              userId,
              data.splitWalletId!,
              data.billName!,
              data.amount!
            );
          default:
            throw new Error(`Unknown notification type: ${notificationType}`);
        }
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - sent;
    const errors = results
      .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
      .map(r => r.status === 'rejected' ? r.reason.message : (r as any).value.error);

    logger.info('Bulk notifications sent', {
      total: userIds.length,
      sent,
      failed,
      notificationType,
    }, 'NotificationService');

    return {
      success: sent > 0,
      sent,
      failed,
      errors,
    };
  }
}
