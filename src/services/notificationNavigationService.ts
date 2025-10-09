/**
 * Notification Navigation Service
 * Handles clean navigation from notifications to appropriate screens
 */

import { NavigationProp } from '@react-navigation/native';
import { NotificationData } from './unifiedNotificationService';

export interface NavigationParams {
  [key: string]: any;
}

export class NotificationNavigationService {
  /**
   * Navigate based on notification type and data
   */
  static navigateFromNotification(
    notification: NotificationData,
    navigation: NavigationProp<any>,
    currentUserId: string
  ): void {
    try {
      console.log('🧭 Navigating from notification:', notification.type);

      switch (notification.type) {
        case 'payment_request':
        case 'payment_reminder':
          this.navigateToPaymentRequest(notification, navigation);
          break;

        case 'group_invite':
          this.navigateToGroupInvite(notification, navigation);
          break;

        case 'expense_added':
          this.navigateToExpense(notification, navigation);
          break;

        case 'settlement_request':
          this.navigateToSettlement(notification, navigation);
          break;

        case 'money_sent':
        case 'money_received':
        case 'group_payment_sent':
        case 'group_payment_received':
          this.navigateToTransaction(notification, navigation);
          break;

        case 'split_completed':
        case 'degen_all_locked':
        case 'degen_ready_to_roll':
        case 'roulette_result':
          this.navigateToSplit(notification, navigation);
          break;

        case 'contact_added':
          this.navigateToContacts(notification, navigation);
          break;

        case 'system_warning':
        case 'system_notification':
        case 'general':
          // These don't need navigation, just mark as read
          break;

        default:
          console.warn('🧭 Unknown notification type:', notification.type);
      }
    } catch (error) {
      console.error('🧭 Navigation error:', error);
      // Don't throw - navigation errors shouldn't crash the app
    }
  }

  /**
   * Navigate to payment request screen
   */
  private static navigateToPaymentRequest(
    notification: NotificationData,
    navigation: NavigationProp<any>
  ): void {
    const { data } = notification;
    
    if (data?.groupId) {
      // Group payment request
      navigation.navigate('GroupDetails', { 
        groupId: data.groupId,
        showPaymentRequest: true,
        paymentRequestData: {
          amount: data.amount,
          currency: data.currency,
          senderId: data.senderId,
          senderName: data.senderName
        }
      });
    } else {
      // P2P payment request
      navigation.navigate('Send', {
        recipientId: data?.senderId,
        recipientName: data?.senderName,
        amount: data?.amount,
        currency: data?.currency,
        isPaymentRequest: true
      });
    }
  }

  /**
   * Navigate to group invite screen
   */
  private static navigateToGroupInvite(
    notification: NotificationData,
    navigation: NavigationProp<any>
  ): void {
    const { data } = notification;
    
    if (data?.splitId) {
      // Split invitation
      navigation.navigate('SplitDetails', { 
        splitId: data.splitId,
        isFromNotification: true
      });
    } else if (data?.groupId) {
      // Group invitation
      navigation.navigate('GroupDetails', { 
        groupId: data.groupId,
        isFromNotification: true
      });
    }
  }

  /**
   * Navigate to expense details
   */
  private static navigateToExpense(
    notification: NotificationData,
    navigation: NavigationProp<any>
  ): void {
    const { data } = notification;
    
    if (data?.groupId) {
      navigation.navigate('GroupDetails', { 
        groupId: data.groupId,
        showExpenses: true
      });
    }
  }

  /**
   * Navigate to settlement screen
   */
  private static navigateToSettlement(
    notification: NotificationData,
    navigation: NavigationProp<any>
  ): void {
    const { data } = notification;
    
    if (data?.groupId) {
      navigation.navigate('GroupDetails', { 
        groupId: data.groupId,
        showSettlement: true
      });
    }
  }

  /**
   * Navigate to transaction history
   */
  private static navigateToTransaction(
    notification: NotificationData,
    navigation: NavigationProp<any>
  ): void {
    navigation.navigate('TransactionHistory', {
      highlightTransactionId: notification.data?.transactionId
    });
  }

  /**
   * Navigate to split details
   */
  private static navigateToSplit(
    notification: NotificationData,
    navigation: NavigationProp<any>
  ): void {
    const { data } = notification;
    
    if (data?.splitId) {
      navigation.navigate('SplitDetails', { 
        splitId: data.splitId,
        isFromNotification: true
      });
    } else if (data?.splitWalletId) {
      // Find split by wallet ID - this might need additional logic
      navigation.navigate('SplitDetails', { 
        splitWalletId: data.splitWalletId,
        isFromNotification: true
      });
    }
  }

  /**
   * Navigate to contacts
   */
  private static navigateToContacts(
    notification: NotificationData,
    navigation: NavigationProp<any>
  ): void {
    navigation.navigate('Contacts');
  }

  /**
   * Get navigation parameters for a notification type
   */
  static getNavigationParams(notification: NotificationData): NavigationParams {
    const { type, data } = notification;
    
    switch (type) {
      case 'payment_request':
      case 'payment_reminder':
        return {
          screen: data?.groupId ? 'GroupDetails' : 'Send',
          params: data?.groupId 
            ? { groupId: data.groupId, showPaymentRequest: true }
            : { 
                recipientId: data?.senderId,
                recipientName: data?.senderName,
                amount: data?.amount,
                currency: data?.currency,
                isPaymentRequest: true
              }
        };

      case 'group_invite':
        return {
          screen: data?.splitId ? 'SplitDetails' : 'GroupDetails',
          params: data?.splitId 
            ? { splitId: data.splitId, isFromNotification: true }
            : { groupId: data?.groupId, isFromNotification: true }
        };

      case 'expense_added':
        return {
          screen: 'GroupDetails',
          params: { groupId: data?.groupId, showExpenses: true }
        };

      case 'settlement_request':
        return {
          screen: 'GroupDetails',
          params: { groupId: data?.groupId, showSettlement: true }
        };

      case 'money_sent':
      case 'money_received':
      case 'group_payment_sent':
      case 'group_payment_received':
        return {
          screen: 'TransactionHistory',
          params: { highlightTransactionId: data?.transactionId }
        };

      case 'split_completed':
      case 'degen_all_locked':
      case 'degen_ready_to_roll':
      case 'roulette_result':
        return {
          screen: 'SplitDetails',
          params: { 
            splitId: data?.splitId || data?.splitWalletId,
            isFromNotification: true
          }
        };

      case 'contact_added':
        return {
          screen: 'Contacts',
          params: {}
        };

      default:
        return { screen: 'Dashboard', params: {} };
    }
  }
}
