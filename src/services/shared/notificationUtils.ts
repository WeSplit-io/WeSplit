/**
 * Shared Notification Utilities
 * Centralized notification and transaction saving logic
 * Used by both consolidatedTransactionService and internalTransferService
 */

import { logger } from '../core';

export interface TransactionData {
  userId: string;
  to: string;
  amount: number;
  currency: string;
  signature: string;
  companyFee: number;
  netAmount: number;
  memo?: string;
  groupId?: string;
}

export class NotificationUtils {
  private static instance: NotificationUtils;

  private constructor() {}

  public static getInstance(): NotificationUtils {
    if (!NotificationUtils.instance) {
      NotificationUtils.instance = new NotificationUtils();
    }
    return NotificationUtils.instance;
  }

  /**
   * Save transaction to Firestore for history and send notification to recipient
   * @deprecated Use saveTransactionAndAwardPoints from transactionPostProcessing.ts instead
   * This method is kept for backward compatibility but should not be used in new code.
   * The new method handles both transaction saving AND point awarding in a centralized way.
   */
  async saveTransactionToFirestore(transactionData: TransactionData): Promise<void> {
    try {
      const { firebaseTransactionService, firebaseDataService } = await import('../firebaseDataService');
      
      // Find recipient user by wallet address to get their user ID
      const recipientUser = await firebaseDataService.user.getUserByWalletAddress(transactionData.to);
      const recipientUserId = recipientUser ? recipientUser.id.toString() : transactionData.to; // Fallback to address if no user found
      
      // Create sender transaction record
      const senderTransaction = {
        id: `${transactionData.signature}_sender`,
        type: 'send' as const,
        amount: transactionData.amount,
        currency: transactionData.currency,
        from_user: transactionData.userId,
        to_user: recipientUserId, // Use user ID instead of wallet address
        from_wallet: '', // Will be filled by the service
        to_wallet: transactionData.to,
        tx_hash: transactionData.signature,
        note: transactionData.memo || `Payment to ${transactionData.to}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'completed' as const,
        group_id: transactionData.groupId || null,
        company_fee: transactionData.companyFee,
        net_amount: transactionData.netAmount
      };

      // Create recipient transaction record (only if recipient is a registered user)
      const recipientTransaction = {
        id: `${transactionData.signature}_recipient`,
        type: 'receive' as const,
        amount: transactionData.amount,
        currency: transactionData.currency,
        from_user: transactionData.userId,
        to_user: recipientUserId,
        from_wallet: '', // Will be filled by the service
        to_wallet: transactionData.to,
        tx_hash: transactionData.signature,
        note: transactionData.memo || `Payment from ${transactionData.userId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'completed' as const,
        group_id: transactionData.groupId || null,
        company_fee: 0, // Recipient doesn't pay company fees
        net_amount: transactionData.amount // Recipient gets full amount
      };

      // Save both transaction records
      await firebaseTransactionService.createTransaction(senderTransaction);
      
      // Only create recipient transaction if recipient is a registered user
      if (recipientUser) {
        await firebaseTransactionService.createTransaction(recipientTransaction);
        logger.info('Both sender and recipient transactions saved to Firebase', { 
          signature: transactionData.signature,
          from_user: transactionData.userId,
          to_user: recipientUserId,
          to_wallet: transactionData.to
        }, 'NotificationUtils');
      } else {
        logger.info('Sender transaction saved to Firebase (recipient not registered)', { 
          signature: transactionData.signature,
          from_user: transactionData.userId,
          to_wallet: transactionData.to
        }, 'NotificationUtils');
      }

      // Send notification to recipient
      await this.sendReceivedFundsNotification(transactionData);
    } catch (error) {
      logger.error('Failed to save transaction to Firebase', error, 'NotificationUtils');
      throw error;
    }
  }

  /**
   * Send notification to recipient when they receive funds
   */
  async sendReceivedFundsNotification(transactionData: TransactionData): Promise<void> {
    try {
      logger.info('🔔 Sending received funds notification', {
        to: transactionData.to,
        amount: transactionData.netAmount,
        currency: transactionData.currency
      }, 'NotificationUtils');

      // Find recipient user by wallet address
      const { firebaseDataService } = await import('../firebaseDataService');
      const recipientUser = await firebaseDataService.user.getUserByWalletAddress(transactionData.to);

      if (!recipientUser) {
        logger.info('🔔 No user found with wallet address (external wallet):', transactionData.to, 'NotificationUtils');
        return; // External wallet, no notification needed
      }

      // Get sender user info
      const senderUser = await firebaseDataService.user.getCurrentUser(transactionData.userId);

      // Create notification data
      const notificationData = {
        userId: recipientUser.id.toString(),
        title: '💰 Funds Received',
        message: `You received ${transactionData.netAmount} ${transactionData.currency} from ${senderUser.name}`,
        type: 'money_received' as const,
        data: {
          transactionId: transactionData.signature,
          amount: transactionData.netAmount,
          currency: transactionData.currency,
          senderId: transactionData.userId,
          senderName: senderUser.name,
          memo: transactionData.memo || '',
          timestamp: new Date().toISOString()
        },
        is_read: false
      };

      // Send notification
      const { notificationService } = await import('../notifications');
      await notificationService.sendNotification(
        notificationData.userId,
        notificationData.title,
        notificationData.message,
        notificationData.type,
        notificationData.data
      );

      logger.info('✅ Received funds notification sent successfully', {
        recipientId: recipientUser.id,
        recipientName: recipientUser.name,
        amount: transactionData.netAmount,
        currency: transactionData.currency
      }, 'NotificationUtils');

    } catch (error) {
      logger.error('❌ Error sending received funds notification', error, 'NotificationUtils');
      // Don't throw error - notification failure shouldn't break the transaction
    }
  }

  /**
   * Send money sent notification to sender only
   */
  async sendMoneySentNotification(transactionData: TransactionData): Promise<void> {
    try {
      logger.info('🔔 Sending money sent notification', {
        from: transactionData.userId,
        to: transactionData.to,
        amount: transactionData.netAmount,
        currency: transactionData.currency
      }, 'NotificationUtils');

      // Get sender user info
      const { firebaseDataService } = await import('../firebaseDataService');
      const senderUser = await firebaseDataService.user.getCurrentUser(transactionData.userId);

      // Create notification data
      const notificationData = {
        userId: transactionData.userId,
        title: '💰 Money Sent Successfully',
        message: `You sent ${transactionData.netAmount} ${transactionData.currency} to ${transactionData.to}`,
        type: 'money_sent' as const,
        data: {
          transactionId: transactionData.signature,
          amount: transactionData.netAmount,
          currency: transactionData.currency,
          recipientId: transactionData.to,
          recipientName: 'Unknown User', // No user lookup for external addresses
          memo: transactionData.memo || '',
          timestamp: new Date().toISOString()
        },
        is_read: false
      };

      // Send notification
      const { notificationService } = await import('../notifications');
      await notificationService.sendNotification(
        notificationData.userId,
        notificationData.title,
        notificationData.message,
        notificationData.type,
        notificationData.data
      );

      logger.info('✅ Money sent notification sent successfully', {
        senderId: transactionData.userId,
        senderName: senderUser.name,
        amount: transactionData.netAmount,
        currency: transactionData.currency
      }, 'NotificationUtils');

    } catch (error) {
      logger.error('❌ Error sending money sent notification', error, 'NotificationUtils');
      // Don't throw error - notification failure shouldn't break the transaction
    }
  }
}

// Export singleton instance
export const notificationUtils = NotificationUtils.getInstance();
