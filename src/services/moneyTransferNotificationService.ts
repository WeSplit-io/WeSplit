/**
 * Money Transfer Notification Service for WeSplit
 * Handles notifications for P2P money transfers and group payments
 */

import { sendNotification } from './firebaseNotificationService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface MoneyTransferNotificationData {
  transactionId: string;
  amount: number;
  currency: string;
  memo?: string;
  senderId?: string;
  recipientId?: string;
  senderName?: string;
  recipientName?: string;
  groupId?: string;
  groupName?: string;
  status: 'completed' | 'failed' | 'pending';
}

export interface GroupPaymentNotificationData extends MoneyTransferNotificationData {
  groupId: string;
  groupName: string;
  isGroupPayment: true;
}

class MoneyTransferNotificationService {
  private static instance: MoneyTransferNotificationService;

  private constructor() {}

  public static getInstance(): MoneyTransferNotificationService {
    if (!MoneyTransferNotificationService.instance) {
      MoneyTransferNotificationService.instance = new MoneyTransferNotificationService();
    }
    return MoneyTransferNotificationService.instance;
  }

  /**
   * Create notification for money sent (P2P transfer)
   */
  async createMoneySentNotification(
    senderId: string,
    recipientId: string,
    amount: number,
    currency: string,
    transactionId: string,
    memo?: string
  ): Promise<void> {
    try {
      console.log('💰 Creating money sent notification:', {
        senderId,
        recipientId,
        amount,
        currency,
        transactionId
      });

      // Get recipient name for the notification
      const recipientName = await this.getUserName(recipientId);

      // Send notification to sender (confirmation)
      await sendNotification(
        senderId,
        'Money Sent Successfully',
        `You sent ${amount} ${currency} to ${recipientName}${memo ? ` - ${memo}` : ''}`,
        'money_sent',
        {
          transactionId,
          recipientId,
          recipientName,
          amount,
          currency,
          memo,
          status: 'completed'
        }
      );

      console.log('💰 Money sent notification created successfully');
    } catch (error) {
      console.error('💰 Error creating money sent notification:', error);
      throw error;
    }
  }

  /**
   * Create notification for money received (P2P transfer)
   */
  async createMoneyReceivedNotification(
    senderId: string,
    recipientId: string,
    amount: number,
    currency: string,
    transactionId: string,
    memo?: string
  ): Promise<void> {
    try {
      console.log('💰 Creating money received notification:', {
        senderId,
        recipientId,
        amount,
        currency,
        transactionId
      });

      // Get sender name for the notification
      const senderName = await this.getUserName(senderId);

      // Send notification to recipient
      await sendNotification(
        recipientId,
        'Money Received',
        `You received ${amount} ${currency} from ${senderName}${memo ? ` - ${memo}` : ''}`,
        'money_received',
        {
          transactionId,
          senderId,
          senderName,
          amount,
          currency,
          memo,
          status: 'completed'
        }
      );

      console.log('💰 Money received notification created successfully');
    } catch (error) {
      console.error('💰 Error creating money received notification:', error);
      throw error;
    }
  }

  /**
   * Create notification for group payment sent
   */
  async createGroupPaymentSentNotification(
    senderId: string,
    groupId: string,
    amount: number,
    currency: string,
    transactionId: string,
    memo?: string
  ): Promise<void> {
    try {
      console.log('💰 Creating group payment sent notification:', {
        senderId,
        groupId,
        amount,
        currency,
        transactionId
      });

      // Get group name
      const groupName = await this.getGroupName(groupId);

      // Send notification to sender (confirmation)
      await sendNotification(
        senderId,
        'Group Payment Sent',
        `You sent ${amount} ${currency} to ${groupName}${memo ? ` - ${memo}` : ''}`,
        'group_payment_sent',
        {
          transactionId,
          groupId,
          groupName,
          amount,
          currency,
          memo,
          status: 'completed'
        }
      );

      console.log('💰 Group payment sent notification created successfully');
    } catch (error) {
      console.error('💰 Error creating group payment sent notification:', error);
      throw error;
    }
  }

  /**
   * Create notification for group payment received
   */
  async createGroupPaymentReceivedNotification(
    groupId: string,
    amount: number,
    currency: string,
    transactionId: string,
    senderId: string,
    memo?: string
  ): Promise<void> {
    try {
      console.log('💰 Creating group payment received notification:', {
        groupId,
        amount,
        currency,
        transactionId,
        senderId
      });

      // Get group name and sender name
      const [groupName, senderName] = await Promise.all([
        this.getGroupName(groupId),
        this.getUserName(senderId)
      ]);

      // Get all group members to notify them
      const groupMembers = await this.getGroupMembers(groupId);

      // Send notification to all group members
      for (const member of groupMembers) {
        await sendNotification(
          member.id,
          'Group Payment Received',
          `${senderName} sent ${amount} ${currency} to ${groupName}${memo ? ` - ${memo}` : ''}`,
          'group_payment_received',
          {
            transactionId,
            groupId,
            groupName,
            senderId,
            senderName,
            amount,
            currency,
            memo,
            status: 'completed'
          }
        );
      }

      console.log('💰 Group payment received notifications created successfully');
    } catch (error) {
      console.error('💰 Error creating group payment received notification:', error);
      throw error;
    }
  }

  /**
   * Create notification for failed money transfer
   */
  async createMoneyTransferFailedNotification(
    userId: string,
    amount: number,
    currency: string,
    error: string,
    isGroupPayment: boolean = false,
    groupId?: string
  ): Promise<void> {
    try {
      console.log('💰 Creating money transfer failed notification:', {
        userId,
        amount,
        currency,
        error,
        isGroupPayment,
        groupId
      });

      const title = isGroupPayment ? 'Group Payment Failed' : 'Money Transfer Failed';
      const message = isGroupPayment 
        ? `Failed to send ${amount} ${currency} to group. ${error}`
        : `Failed to send ${amount} ${currency}. ${error}`;

      await sendNotification(
        userId,
        title,
        message,
        'system_warning',
        {
          amount,
          currency,
          error,
          isGroupPayment,
          groupId,
          status: 'failed'
        }
      );

      console.log('💰 Money transfer failed notification created successfully');
    } catch (error) {
      console.error('💰 Error creating money transfer failed notification:', error);
      throw error;
    }
  }

  /**
   * Get user name by user ID
   */
  private async getUserName(userId: string): Promise<string> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.name || userData.email || 'Unknown User';
      }
      return 'Unknown User';
    } catch (error) {
      console.warn('💰 Error getting user name:', error);
      return 'Unknown User';
    }
  }

  /**
   * Get group name by group ID
   */
  private async getGroupName(groupId: string): Promise<string> {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        return groupData.name || 'Unknown Group';
      }
      return 'Unknown Group';
    } catch (error) {
      console.warn('💰 Error getting group name:', error);
      return 'Unknown Group';
    }
  }

  /**
   * Get group members by group ID
   */
  private async getGroupMembers(groupId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        const members = groupData.members || [];
        
        // Get member names
        const memberPromises = members.map(async (memberId: string) => {
          const name = await this.getUserName(memberId);
          return { id: memberId, name };
        });
        
        return await Promise.all(memberPromises);
      }
      return [];
    } catch (error) {
      console.warn('💰 Error getting group members:', error);
      return [];
    }
  }
}

// Export singleton instance
export const moneyTransferNotificationService = MoneyTransferNotificationService.getInstance();
