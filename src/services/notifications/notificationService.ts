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
import { logger } from '../analytics/loggingService';
// Removed unused validation import
import { NotificationType, NotificationData, NotificationPayload } from '../../types/notifications';

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
    data: Record<string, unknown> = {}
  ): Promise<boolean> {
    // Data validation is handled at the data layer
    
    // Run notification sending in background to avoid blocking transactions
    this.sendNotificationAsync(userId, title, message, type, data).catch(error => {
      logger.error('Background notification failed:', error, 'NotificationService');
    });
    
    // Return immediately to avoid blocking the caller
    return true;
  }

  /**
   * Check if notification type should trigger push notification
   */
  private shouldSendPushNotification(type: NotificationType): boolean {
    // Essential notifications that should trigger push notifications
    const pushNotificationTypes: NotificationType[] = [
      'payment_request',      // User requests money
      'payment_received',     // User receives money
      'payment_sent',         // User sent money
      'money_sent',           // User sent money (legacy)
      'money_received',       // User received money (legacy)
      'split_invite',         // User invited to split
      'split_payment_required', // User needs to pay for split
      'split_completed',      // Split is completed
      'split_confirmed',      // Split is confirmed
      'contact_added',        // New contact added
      'system_warning',       // Important system warnings
      'payment_reminder'      // Payment reminders
    ];
    
    return pushNotificationTypes.includes(type);
  }

  /**
   * Internal method to send notification asynchronously (non-blocking)
   */
  private async sendNotificationAsync(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'general',
    data: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      // Filter out undefined values from data to prevent Firestore errors
      // Firestore doesn't allow undefined values in documents
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );
      
      // Store in Firestore
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        data: cleanData, // Use cleaned data without undefined values
        is_read: false,
        created_at: serverTimestamp()
      });

      // Send push notification only for essential types
      if (this.isInitialized && this.shouldSendPushNotification(type)) {
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
    data?: Record<string, unknown>,
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
  private getNotificationMessage(type: NotificationType, data?: Record<string, unknown>): string {
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
   * Send payment status notification (unified method)
   */
  async sendPaymentStatusNotification(
    userId: string,
    amount: number,
    currency: string = 'USDC',
    billName?: string,
    splitId?: string,
    status: 'processing' | 'completed' | 'failed' = 'completed',
    reason?: string,
    transactionHash?: string
  ): Promise<boolean> {
    const titles = {
      processing: 'Payment Processing',
      completed: 'Payment Confirmed',
      failed: 'Payment Failed'
    };
    
    const messages = {
      processing: `Your payment of ${amount} ${currency}${billName ? ` for "${billName}"` : ''} is being processed...`,
      completed: `Your payment of ${amount} ${currency}${billName ? ` for "${billName}"` : ''} has been confirmed!`,
      failed: `Your payment of ${amount} ${currency}${billName ? ` for "${billName}"` : ''} failed${reason ? `: ${reason}` : ''}`
    };
    
    const notificationTypes = {
      processing: 'general',
      completed: 'payment_received',
      failed: 'system_warning'
    };
    
    // Send notification in background to avoid blocking transaction
    this.sendNotificationAsync(
      userId,
      titles[status],
      messages[status],
      notificationTypes[status] as NotificationType,
      {
        splitId,
        billName,
        amount,
        currency,
        transactionHash,
        reason,
        status,
        timestamp: new Date().toISOString()
      }
    ).catch(error => {
      logger.error(`Payment ${status} notification failed:`, error, 'NotificationService');
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
   * Mark payment request notification as completed and remove it from display
   */
  async markPaymentRequestCompleted(requestId: string, userId: string): Promise<boolean> {
    try {
      // Find notifications related to this payment request
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('type', '==', 'payment_request'),
        where('data.requestId', '==', requestId)
      );

      const querySnapshot = await getDocs(notificationsQuery);
      
      if (querySnapshot.empty) {
        logger.warn('No payment request notifications found to mark as completed', { requestId, userId }, 'NotificationService');
        return true; // Not an error, just no notifications to update
      }

      // Mark all related notifications as completed
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          is_read: true,
          data: {
            ...doc.data().data,
            status: 'completed',
            completed_at: serverTimestamp()
          },
          updated_at: serverTimestamp()
        });
      });

      await batch.commit();
      
      logger.info('Payment request notifications marked as completed', { 
        requestId, 
        userId, 
        count: querySnapshot.docs.length 
      }, 'NotificationService');
      
      return true;
    } catch (error) {
      logger.error('Failed to mark payment request notifications as completed', { 
        requestId, 
        userId, 
        error 
      }, 'NotificationService');
      return false;
    }
  }

  /**
   * Send personalized payment completion notifications to both users after payment request completion
   */
  async sendPaymentRequestCompletionNotifications(
    requestId: string,
    senderId: string,
    senderName: string,
    recipientId: string,
    recipientName: string,
    amount: number,
    currency: string = 'USDC',
    transactionId?: string
  ): Promise<boolean> {
    try {
      logger.info('Sending payment request completion notifications', {
        requestId,
        senderId,
        recipientId,
        amount,
        currency
      }, 'NotificationService');

      // Send personalized notification to the requester (recipient of the payment)
      const requesterMessage = `${senderName} covered your request, think about thanking him later on!!`;
      await this.sendNotificationAsync(
        recipientId,
        'Request Fulfilled! 🎉',
        requesterMessage,
        'payment_received',
        {
          requestId,
          senderId,
          senderName,
          recipientId,
          recipientName,
          amount,
          currency,
          transactionId,
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      );

      // Send personalized notification to the sender (person who paid)
      const senderMessage = `${recipientName} correctly received the funds you can go back to your dashboard`;
      await this.sendNotificationAsync(
        senderId,
        'Payment Delivered! ✅',
        senderMessage,
        'payment_sent',
        {
          requestId,
          senderId,
          senderName,
          recipientId,
          recipientName,
          amount,
          currency,
          transactionId,
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      );

      logger.info('Payment request completion notifications sent successfully', {
        requestId,
        senderId,
        recipientId,
        amount,
        currency
      }, 'NotificationService');

      return true;
    } catch (error) {
      logger.error('Failed to send payment request completion notifications', {
        requestId,
        senderId,
        recipientId,
        amount,
        currency,
        error
      }, 'NotificationService');
      return false;
    }
  }

  /**
   * Send split invitation notification
   */
  async sendSplitInvitationNotification(
    splitId: string,
    splitName: string,
    inviterId: string,
    inviterName: string,
    inviteeId: string,
    inviteeName: string,
    amount: number,
    currency: string = 'USDC'
  ): Promise<boolean> {
    try {
      logger.info('Sending split invitation notification', {
        splitId,
        inviterId,
        inviteeId,
        amount,
        currency
      }, 'NotificationService');

      const message = `${inviterName} invited you to split ${amount} ${currency}${splitName ? ` for ${splitName}` : ''}`;
      await this.sendNotificationAsync(
        inviteeId,
        'Split Invitation! 🎯',
        message,
        'split_invite',
        {
          splitId,
          inviterId,
          inviterName,
          inviteeId,
          inviteeName,
          amount,
          currency,
          splitName,
          status: 'pending',
          timestamp: new Date().toISOString()
        }
      );

      logger.info('Split invitation notification sent successfully', {
        splitId,
        inviterId,
        inviteeId,
        amount,
        currency
      }, 'NotificationService');

      return true;
    } catch (error) {
      logger.error('Failed to send split invitation notification', {
        splitId,
        inviterId,
        inviteeId,
        amount,
        currency,
        error
      }, 'NotificationService');
      return false;
    }
  }

  /**
   * Send split payment required notification
   */
  async sendSplitPaymentRequiredNotification(
    splitId: string,
    splitName: string,
    payerId: string,
    payerName: string,
    amount: number,
    currency: string = 'USDC'
  ): Promise<boolean> {
    try {
      logger.info('Sending split payment required notification', {
        splitId,
        payerId,
        amount,
        currency
      }, 'NotificationService');

      const message = `You need to pay ${amount} ${currency} for ${splitName || 'the split'}`;
      await this.sendNotificationAsync(
        payerId,
        'Payment Required! 💰',
        message,
        'split_payment_required',
        {
          splitId,
          splitName,
          payerId,
          payerName,
          amount,
          currency,
          status: 'pending',
          timestamp: new Date().toISOString()
        }
      );

      logger.info('Split payment required notification sent successfully', {
        splitId,
        payerId,
        amount,
        currency
      }, 'NotificationService');

      return true;
    } catch (error) {
      logger.error('Failed to send split payment required notification', {
        splitId,
        payerId,
        amount,
        currency,
        error
      }, 'NotificationService');
      return false;
    }
  }

  /**
   * Send split completion notification
   */
  async sendSplitCompletionNotification(
    splitId: string,
    splitName: string,
    participantId: string,
    participantName: string,
    totalAmount: number,
    currency: string = 'USDC'
  ): Promise<boolean> {
    try {
      logger.info('Sending split completion notification', {
        splitId,
        participantId,
        totalAmount,
        currency
      }, 'NotificationService');

      const message = `Split "${splitName || 'Untitled'}" has been completed! Total: ${totalAmount} ${currency}`;
      await this.sendNotificationAsync(
        participantId,
        'Split Completed! ✅',
        message,
        'split_completed',
        {
          splitId,
          splitName,
          participantId,
          participantName,
          totalAmount,
          currency,
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      );

      logger.info('Split completion notification sent successfully', {
        splitId,
        participantId,
        totalAmount,
        currency
      }, 'NotificationService');

      return true;
    } catch (error) {
      logger.error('Failed to send split completion notification', {
        splitId,
        participantId,
        totalAmount,
        currency,
        error
      }, 'NotificationService');
      return false;
    }
  }

  /**
   * Send contact added notification
   */
  async sendContactAddedNotification(
    userId: string,
    contactName: string,
    contactId: string
  ): Promise<boolean> {
    try {
      logger.info('Sending contact added notification', {
        userId,
        contactName,
        contactId
      }, 'NotificationService');

      const message = `${contactName} has been added to your contacts!`;
      await this.sendNotificationAsync(
        userId,
        'New Contact Added! 👋',
        message,
        'contact_added',
        {
          contactId,
          contactName,
          userId,
          status: 'added',
          timestamp: new Date().toISOString()
        }
      );

      logger.info('Contact added notification sent successfully', {
        userId,
        contactName,
        contactId
      }, 'NotificationService');

      return true;
    } catch (error) {
      logger.error('Failed to send contact added notification', {
        userId,
        contactName,
        contactId,
        error
      }, 'NotificationService');
      return false;
    }
  }

  /**
   * Send system warning notification
   */
  async sendSystemWarningNotification(
    userId: string,
    title: string,
    message: string,
    data?: { [key: string]: any }
  ): Promise<boolean> {
    try {
      logger.info('Sending system warning notification', {
        userId,
        title
      }, 'NotificationService');

      await this.sendNotificationAsync(
        userId,
        title,
        message,
        'system_warning',
        {
          ...data,
          userId,
          status: 'warning',
          timestamp: new Date().toISOString()
        }
      );

      logger.info('System warning notification sent successfully', {
        userId,
        title
      }, 'NotificationService');

      return true;
    } catch (error) {
      logger.error('Failed to send system warning notification', {
        userId,
        title,
        error
      }, 'NotificationService');
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
        read_at: doc.data().read_at?.toDate?.()?.toISOString(),
        user_id: doc.data().userId // Add user_id for backward compatibility
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
    notification: { id: string; type: NotificationType; data?: Record<string, unknown> },
    navigation: NavigationContainerRef<ParamListBase> | { navigate: (route: string, params?: Record<string, unknown>) => void },
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
                splitData: { id: notification.data.splitId, splitType: 'degen' },
                isFromNotification: true,
                notificationId: notification.id
              });
            } else if (notification.data.splitType === 'spend') {
              navigation.navigate('SpendSplit', {
                splitData: { id: notification.data.splitId, splitType: 'spend' },
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
            // Navigate to Send screen with pre-filled data (same as NotificationsScreen)
            try {
              const { standardizeNotificationData } = await import('./notificationDataUtils');
              const standardizedData = standardizeNotificationData(notification.data, 'payment_request');
              
              if (standardizedData) {
                const { senderId: requesterId, amount, currency, requestId } = standardizedData;
                
                // Fetch user data for the requester
                const { firebaseDataService } = await import('../data/firebaseDataService');
                const requesterData = await firebaseDataService.user.getCurrentUser(requesterId);
                
                if (requesterData) {
                  navigation.navigate('Send', {
                    destinationType: 'friend',
                    contact: {
                      id: requesterId,
                      name: requesterData.name || 'Unknown User',
                      email: requesterData.email || '',
                      wallet_address: requesterData.wallet_address || '',
                      avatar: requesterData.avatar || null
                    },
                    prefilledAmount: amount,
                    prefilledNote: `Payment request from ${requesterData.name}`,
                    requestId: requestId,
                    fromNotification: true,
                    notificationId: notification.id
                  });
                } else {
                  logger.warn('Could not fetch requester data for payment request', { requesterId }, 'NotificationService');
                  navigation.navigate('Dashboard');
                }
              } else {
                logger.warn('Could not standardize payment request data', { notification }, 'NotificationService');
                navigation.navigate('Dashboard');
              }
            } catch (error) {
              logger.error('Error handling payment request notification', { error, notification }, 'NotificationService');
              navigation.navigate('Dashboard');
            }
          } else {
            logger.warn('Payment request notification missing requestId', { notification }, 'NotificationService');
            navigation.navigate('Dashboard');
          }
          break;

        case 'payment_reminder':
          if (notification.data?.requestId) {
            navigation.navigate('RequestAmount', {
              requestId: notification.data.requestId,
              isFromNotification: true,
              notificationId: notification.id
            });
          } else {
            logger.warn('Payment reminder notification missing requestId', { notification }, 'NotificationService');
            navigation.navigate('Dashboard');
          }
          break;


        case 'payment_sent':
        case 'payment_received':
        case 'money_sent':
        case 'money_received':
          // Handle payment sent/received notifications
          const transactionId = notification.data?.transactionId || notification.data?.tx_hash || notification.data?.signature;
          if (transactionId) {
            navigation.navigate('TransactionHistory', {
              transactionId,
              isFromNotification: true,
              notificationId: notification.id
            });
          } else {
            logger.warn('Payment notification missing transactionId', { notification }, 'NotificationService');
            navigation.navigate('Dashboard');
          }
          break;

        case 'split_invite':
          const splitId = notification.data?.splitId;
          if (splitId) {
            navigation.navigate('SplitDetails', {
              splitId,
              isFromNotification: true,
              notificationId: notification.id
            });
          } else {
            logger.warn('Split invite notification missing splitId', { notification }, 'NotificationService');
            navigation.navigate('Dashboard');
          }
          break;

        case 'split_payment_required':
          const paymentSplitId = notification.data?.splitId;
          if (paymentSplitId) {
            navigation.navigate('SplitPayment', {
              splitId: paymentSplitId,
              isFromNotification: true,
              notificationId: notification.id
            });
          } else {
            logger.warn('Split payment required notification missing splitId', { notification }, 'NotificationService');
            navigation.navigate('Dashboard');
          }
          break;

        case 'split_completed':
          const completedSplitId = notification.data?.splitId;
          if (completedSplitId) {
            navigation.navigate('SplitDetails', {
              splitId: completedSplitId,
              isFromNotification: true,
              notificationId: notification.id
            });
          } else {
            logger.warn('Split completed notification missing splitId', { notification }, 'NotificationService');
            navigation.navigate('Dashboard');
          }
          break;

        case 'split_confirmed':
          const confirmedSplitId = notification.data?.splitId;
          if (confirmedSplitId) {
            navigation.navigate('SplitDetails', {
              splitId: confirmedSplitId,
              isFromNotification: true,
              notificationId: notification.id
            });
          } else {
            logger.warn('Split confirmed notification missing splitId', { notification }, 'NotificationService');
            navigation.navigate('Dashboard');
          }
          break;

        case 'split_accepted':
        case 'split_declined':
        case 'split_paid':
          const statusSplitId = notification.data?.splitId;
          if (statusSplitId) {
            navigation.navigate('SplitDetails', {
              splitId: statusSplitId,
              isFromNotification: true,
              notificationId: notification.id
            });
          } else {
            logger.warn('Split status notification missing splitId', { notification }, 'NotificationService');
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