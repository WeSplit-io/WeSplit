/**
 * Notification Completion Service
 * Handles notification deletion only after complete end-to-end processes
 */

import { logger } from './loggingService';
import { firebaseDataService } from './firebaseDataService';

export interface NotificationCompletionData {
  notificationId: string;
  processType: 'payment_request' | 'group_invite' | 'split_invite' | 'split_action' | 'contact_add' | 'settlement_request';
  userId: string;
  completedAt: string;
  processData?: any;
}

export class NotificationCompletionService {
  /**
   * Mark a notification as completed and delete it
   * This should only be called when the entire end-to-end process is finished
   */
  static async completeNotificationProcess(
    notificationId: string,
    processType: NotificationCompletionData['processType'],
    userId: string,
    processData?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Completing notification process', {
        notificationId,
        processType,
        userId,
        processData
      }, 'NotificationCompletionService');

      // Delete the notification from Firebase
      await firebaseDataService.notification.deleteNotification(notificationId);

      // Log completion for analytics/debugging
      const completionData: NotificationCompletionData = {
        notificationId,
        processType,
        userId,
        completedAt: new Date().toISOString(),
        processData
      };

      logger.info('Notification process completed successfully', completionData, 'NotificationCompletionService');

      return { success: true };
    } catch (error) {
      logger.error('Failed to complete notification process', error, 'NotificationCompletionService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Complete payment request notification after successful payment
   */
  static async completePaymentRequestNotification(
    notificationId: string,
    userId: string,
    paymentData: {
      amount: number;
      currency: string;
      recipientId: string;
      transactionId: string;
      groupId?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.completeNotificationProcess(
      notificationId,
      'payment_request',
      userId,
      paymentData
    );
  }

  /**
   * Complete group invite notification after successful group join
   */
  static async completeGroupInviteNotification(
    notificationId: string,
    userId: string,
    groupData: {
      groupId: string;
      groupName: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.completeNotificationProcess(
      notificationId,
      'group_invite',
      userId,
      groupData
    );
  }

  /**
   * Complete split invitation notification after successful split join
   */
  static async completeSplitInvitationNotification(
    notificationId: string,
    userId: string,
    splitData: {
      splitId: string;
      splitTitle: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.completeNotificationProcess(
      notificationId,
      'split_invite',
      userId,
      splitData
    );
  }

  /**
   * Complete split action notification after successful split action
   */
  static async completeSplitActionNotification(
    notificationId: string,
    userId: string,
    splitData: {
      splitWalletId: string;
      billName: string;
      actionType: 'completed' | 'locked' | 'rolled';
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.completeNotificationProcess(
      notificationId,
      'split_action',
      userId,
      splitData
    );
  }

  /**
   * Complete contact add notification after successful contact addition
   */
  static async completeContactAddNotification(
    notificationId: string,
    userId: string,
    contactData: {
      contactId: string;
      contactName: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.completeNotificationProcess(
      notificationId,
      'contact_add',
      userId,
      contactData
    );
  }

  /**
   * Complete settlement request notification after successful settlement
   */
  static async completeSettlementRequestNotification(
    notificationId: string,
    userId: string,
    settlementData: {
      groupId: string;
      amount: number;
      currency: string;
      transactionId: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.completeNotificationProcess(
      notificationId,
      'settlement_request',
      userId,
      settlementData
    );
  }
}
