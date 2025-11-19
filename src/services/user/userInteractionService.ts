/**
 * User Interaction Service
 * Gets interactions between two users (transactions, splits, shared wallets)
 */

import { firebaseDataService } from '../data/firebaseDataService';
import { TransactionHistoryService } from '../blockchain/transaction/transactionHistoryService';
import { SplitStorageService } from '../splits/splitStorageService';
import { SharedWalletService } from '../sharedWallet';
import { logger } from '../analytics/loggingService';

export interface UserInteraction {
  id: string;
  type: 'transaction' | 'split' | 'shared_wallet';
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  status: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface UserInteractionsResult {
  success: boolean;
  interactions?: UserInteraction[];
  error?: string;
}

class UserInteractionService {
  private transactionHistoryService = new TransactionHistoryService();

  /**
   * Get all interactions between two users
   * Includes transactions, splits, and shared wallets
   */
  async getUserInteractions(
    currentUserId: string,
    targetUserId: string,
    limit: number = 50
  ): Promise<UserInteractionsResult> {
    try {
      const interactions: UserInteraction[] = [];

      // Get transactions between users
      const transactions = await this.getTransactionsBetweenUsers(
        currentUserId,
        targetUserId,
        limit
      );
      interactions.push(...transactions);

      // Get splits between users
      const splits = await this.getSplitsBetweenUsers(
        currentUserId,
        targetUserId,
        limit
      );
      interactions.push(...splits);

      // Get shared wallets between users
      const sharedWallets = await this.getSharedWalletsBetweenUsers(
        currentUserId,
        targetUserId
      );
      interactions.push(...sharedWallets);

      // Sort by creation date (newest first)
      interactions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Limit results
      const limitedInteractions = interactions.slice(0, limit);

      return {
        success: true,
        interactions: limitedInteractions
      };
    } catch (error) {
      logger.error('Failed to get user interactions', { error, currentUserId, targetUserId }, 'UserInteractionService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get transactions between two users
   */
  private async getTransactionsBetweenUsers(
    currentUserId: string,
    targetUserId: string,
    limit: number
  ): Promise<UserInteraction[]> {
    try {
      const transactionHistory = await this.transactionHistoryService.getUserTransactionHistory(
        currentUserId,
        { limit: 1000 } // Get more to filter
      );

      if (!transactionHistory.success || !transactionHistory.transactions) {
        return [];
      }

      const interactions: UserInteraction[] = [];

      transactionHistory.transactions.forEach(transaction => {
        // Check if transaction is between the two users
        const isBetweenUsers = 
          (transaction.from_user === currentUserId && transaction.to_user === targetUserId) ||
          (transaction.from_user === targetUserId && transaction.to_user === currentUserId);

        if (isBetweenUsers) {
          const isSent = transaction.from_user === currentUserId;
          interactions.push({
            id: transaction.id || `tx_${transaction.firebaseDocId}`,
            type: 'transaction',
            title: isSent ? 'Request Send' : 'Top Up Wallet',
            description: transaction.note || transaction.memo,
            amount: transaction.amount,
            currency: transaction.currency || 'USDC',
            status: transaction.status === 'completed' ? 'Paid' : transaction.status,
            createdAt: transaction.created_at || transaction.createdAt || new Date().toISOString(),
            metadata: {
              transactionId: transaction.id,
              firebaseDocId: transaction.firebaseDocId,
              isSent
            }
          });
        }
      });

      return interactions;
    } catch (error) {
      logger.error('Failed to get transactions between users', { error }, 'UserInteractionService');
      return [];
    }
  }

  /**
   * Get splits between two users
   */
  private async getSplitsBetweenUsers(
    currentUserId: string,
    targetUserId: string,
    limit: number
  ): Promise<UserInteraction[]> {
    try {
      const userSplits = await SplitStorageService.getUserSplits(currentUserId, 100);

      if (!userSplits.success || !userSplits.splits) {
        return [];
      }

      const interactions: UserInteraction[] = [];

      userSplits.splits.forEach(split => {
        // Check if target user is a participant
        const isParticipant = split.participants.some(
          p => p.userId === targetUserId
        );

        if (isParticipant) {
          const participant = split.participants.find(p => p.userId === targetUserId);
          interactions.push({
            id: split.id,
            type: 'split',
            title: split.name || 'Split',
            description: split.description,
            amount: participant?.amountOwed || 0,
            currency: split.currency || 'USDC',
            status: participant?.status || 'pending',
            createdAt: split.createdAt,
            metadata: {
              splitId: split.id,
              splitType: split.status === 'spinning_completed' ? 'degen' : 'fair',
              participantStatus: participant?.status
            }
          });
        }
      });

      return interactions;
    } catch (error) {
      logger.error('Failed to get splits between users', { error }, 'UserInteractionService');
      return [];
    }
  }

  /**
   * Get shared wallets between two users
   */
  private async getSharedWalletsBetweenUsers(
    currentUserId: string,
    targetUserId: string
  ): Promise<UserInteraction[]> {
    try {
      const sharedWalletsResult = await SharedWalletService.getUserSharedWallets(currentUserId);

      if (!sharedWalletsResult.success || !sharedWalletsResult.wallets) {
        return [];
      }

      const interactions: UserInteraction[] = [];

      sharedWalletsResult.wallets.forEach(wallet => {
        // Check if target user is a member
        const isMember = wallet.members.some(
          m => m.userId === targetUserId
        );

        if (isMember) {
          const member = wallet.members.find(m => m.userId === targetUserId);
          interactions.push({
            id: wallet.id,
            type: 'shared_wallet',
            title: wallet.name,
            description: wallet.description,
            amount: member?.totalContributed || 0,
            currency: wallet.currency || 'USDC',
            status: member?.status || 'active',
            createdAt: wallet.createdAt,
            metadata: {
              sharedWalletId: wallet.id,
              memberRole: member?.role,
              walletBalance: wallet.totalBalance
            }
          });
        }
      });

      return interactions;
    } catch (error) {
      logger.error('Failed to get shared wallets between users', { error }, 'UserInteractionService');
      return [];
    }
  }
}

// Export singleton instance
export const userInteractionService = new UserInteractionService();

