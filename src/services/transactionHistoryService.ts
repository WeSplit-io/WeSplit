/**
 * Transaction History Service
 * Manages user transaction history storage and retrieval
 * Stores transactions in both user's app space and database
 */

import { logger } from './loggingService';

import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction } from '../types';
import { firebaseDataTransformers } from './firebaseDataService';
import { consolidatedTransactionService } from './transaction';

export interface TransactionHistoryEntry extends Transaction {
  // Additional fields for enhanced tracking
  company_fee?: number;
  gas_fee?: number;
  gas_fee_covered_by_company?: boolean;
  recipient_name?: string;
  sender_name?: string;
  transaction_method?: 'app_wallet' | 'external_wallet';
  app_version?: string;
  device_info?: string;
}

export interface TransactionHistoryFilters {
  type?: 'send' | 'receive' | 'deposit' | 'withdraw';
  status?: 'pending' | 'completed' | 'failed';
  currency?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

export interface TransactionHistoryResult {
  success: boolean;
  transactions: TransactionHistoryEntry[];
  totalCount: number;
  error?: string;
}

export interface SaveTransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export class TransactionHistoryService {
  private readonly COLLECTION_NAME = 'transactions';
  private readonly USER_TRANSACTIONS_COLLECTION = 'user_transactions';

  /**
   * Save a transaction to the database
   */
  async saveTransaction(
    transaction: Omit<TransactionHistoryEntry, 'id' | 'created_at' | 'updated_at'>,
    userId: string
  ): Promise<SaveTransactionResult> {
    try {
      if (__DEV__) {
        logger.info('Saving transaction', {
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          from_user: transaction.from_user,
          to_user: transaction.to_user,
          userId
        });
      }

      // Add user-specific metadata
      const transactionWithMetadata: Omit<TransactionHistoryEntry, 'id' | 'created_at' | 'updated_at'> = {
        ...transaction,
        app_version: '1.0.0', // You can get this from app config
        device_info: 'mobile', // You can get this from device info
        gas_fee_covered_by_company: true, // Since we're using company gas coverage
      };

      // Save to main transactions collection
      const transactionRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        firebaseDataTransformers.transactionToFirestore(transactionWithMetadata)
      );

      // Save to user-specific transactions collection for easy querying
      const userTransactionRef = await addDoc(
        collection(db, this.USER_TRANSACTIONS_COLLECTION),
        {
          ...firebaseDataTransformers.transactionToFirestore(transactionWithMetadata),
          user_id: userId,
          transaction_id: transactionRef.id, // Reference to main transaction
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        }
      );

      if (__DEV__) {
        logger.info('Transaction saved successfully', {
          transactionId: transactionRef.id,
          userTransactionId: userTransactionRef.id
        });
      }

      return {
        success: true,
        transactionId: transactionRef.id
      };

    } catch (error) {
      console.error('❌ TransactionHistoryService: Failed to save transaction:', error);
      return {
        success: false,
        error: 'Failed to save transaction: ' + (error as Error).message
      };
    }
  }

  /**
   * Get transaction history for a specific user
   */
  async getUserTransactionHistory(
    userId: string,
    filters: TransactionHistoryFilters = {}
  ): Promise<TransactionHistoryResult> {
    try {
      if (__DEV__) {
        logger.info('Getting transaction history for user', { userId, filters }, 'transactionHistoryService');
      }

      // Build query for user transactions
      let userTransactionsQuery = query(
        collection(db, this.USER_TRANSACTIONS_COLLECTION),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );

      // Apply filters
      if (filters.type) {
        userTransactionsQuery = query(userTransactionsQuery, where('type', '==', filters.type));
      }

      if (filters.status) {
        userTransactionsQuery = query(userTransactionsQuery, where('status', '==', filters.status));
      }

      if (filters.currency) {
        userTransactionsQuery = query(userTransactionsQuery, where('currency', '==', filters.currency));
      }

      if (filters.limit) {
        userTransactionsQuery = query(userTransactionsQuery, limit(filters.limit));
      }

      // Execute query
      const userTransactionsSnapshot = await getDocs(userTransactionsQuery);
      
      const transactions: TransactionHistoryEntry[] = [];
      
      userTransactionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const transaction: TransactionHistoryEntry = {
          id: doc.id,
          type: data.type || 'send',
          amount: data.amount || 0,
          currency: data.currency || 'USDC',
          from_user: data.from_user || '',
          to_user: data.to_user || '',
          from_wallet: data.from_wallet || '',
          to_wallet: data.to_wallet || '',
          tx_hash: data.tx_hash || '',
          note: data.note || '',
          status: data.status || 'pending',
          created_at: firebaseDataTransformers.timestampToISO(data.created_at),
          updated_at: firebaseDataTransformers.timestampToISO(data.updated_at),
          // Additional fields
          company_fee: data.company_fee || 0,
          gas_fee: data.gas_fee || 0,
          gas_fee_covered_by_company: data.gas_fee_covered_by_company || false,
          recipient_name: data.recipient_name || '',
          sender_name: data.sender_name || '',
          transaction_method: data.transaction_method || 'app_wallet',
          app_version: data.app_version || '1.0.0',
          device_info: data.device_info || 'mobile'
        };
        
        transactions.push(transaction);
      });

      if (__DEV__) {
        logger.info('Retrieved transactions', {
          count: transactions.length,
          userId
        });
      }

      return {
        success: true,
        transactions,
        totalCount: transactions.length
      };

    } catch (error) {
      console.error('❌ TransactionHistoryService: Failed to get transaction history:', error);
      return {
        success: false,
        transactions: [],
        totalCount: 0,
        error: 'Failed to get transaction history: ' + (error as Error).message
      };
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: 'pending' | 'completed' | 'failed',
    userId: string
  ): Promise<SaveTransactionResult> {
    try {
      if (__DEV__) {
        logger.info('Updating transaction status', {
          transactionId,
          status,
          userId
        });
      }

      // Update in user transactions collection
      const userTransactionQuery = query(
        collection(db, this.USER_TRANSACTIONS_COLLECTION),
        where('transaction_id', '==', transactionId),
        where('user_id', '==', userId)
      );

      const userTransactionSnapshot = await getDocs(userTransactionQuery);
      
      if (userTransactionSnapshot.empty) {
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      const userTransactionDoc = userTransactionSnapshot.docs[0];
      await updateDoc(userTransactionDoc.ref, {
        status,
        updated_at: serverTimestamp()
      });

      // Also update in main transactions collection
      const mainTransactionRef = doc(db, this.COLLECTION_NAME, transactionId);
      await updateDoc(mainTransactionRef, {
        status,
        updated_at: serverTimestamp()
      });

      if (__DEV__) {
        logger.info('Transaction status updated successfully', null, 'transactionHistoryService');
      }

      return {
        success: true,
        transactionId
      };

    } catch (error) {
      console.error('❌ TransactionHistoryService: Failed to update transaction status:', error);
      return {
        success: false,
        error: 'Failed to update transaction status: ' + (error as Error).message
      };
    }
  }

  /**
   * Get transaction statistics for a user
   */
  async getUserTransactionStats(userId: string): Promise<{
    success: boolean;
    stats?: {
      totalTransactions: number;
      totalSent: number;
      totalReceived: number;
      totalFees: number;
      successRate: number;
      lastTransactionDate?: string;
    };
    error?: string;
  }> {
    try {
      const result = await this.getUserTransactionHistory(userId);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      const transactions = result.transactions;
      const totalTransactions = transactions.length;
      const completedTransactions = transactions.filter(t => t.status === 'completed').length;
      
      const totalSent = transactions
        .filter(t => t.type === 'send' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalReceived = transactions
        .filter(t => t.type === 'receive' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalFees = transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.company_fee || 0), 0);
      
      const successRate = totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0;
      
      const lastTransactionDate = transactions.length > 0 ? transactions[0].created_at : undefined;

      return {
        success: true,
        stats: {
          totalTransactions,
          totalSent,
          totalReceived,
          totalFees,
          successRate,
          lastTransactionDate
        }
      };

    } catch (error) {
      console.error('❌ TransactionHistoryService: Failed to get transaction stats:', error);
      return {
        success: false,
        error: 'Failed to get transaction stats: ' + (error as Error).message
      };
    }
  }

  /**
   * Create transaction entry from send transaction result
   */
  async createSendTransactionEntry(
    transactionParams: {
      to: string;
      amount: number;
      currency: string;
      note?: string;
    },
    transactionResult: any,
    userId: string,
    recipientName?: string,
    senderName?: string
  ): Promise<SaveTransactionResult> {
    try {
      const transactionEntry: Omit<TransactionHistoryEntry, 'id' | 'created_at' | 'updated_at'> = {
        type: 'send',
        amount: transactionParams.amount,
        currency: transactionParams.currency,
        from_user: userId,
        to_user: transactionParams.to,
        from_wallet: '', // Will be filled by user wallet service
        to_wallet: transactionParams.to,
        tx_hash: transactionResult.signature || transactionResult.txId || '',
        note: transactionParams.note || '',
        status: transactionResult.confirmationStatus === 'confirmed' ? 'completed' : 'pending',
        company_fee: transactionResult.companyFee || 0,
        gas_fee: transactionResult.fee || 0,
        gas_fee_covered_by_company: true,
        recipient_name: recipientName || '',
        sender_name: senderName || '',
        transaction_method: 'app_wallet',
        app_version: '1.0.0',
        device_info: 'mobile'
      };

      return await this.saveTransaction(transactionEntry, userId);

    } catch (error) {
      console.error('❌ TransactionHistoryService: Failed to create send transaction entry:', error);
      return {
        success: false,
        error: 'Failed to create send transaction entry: ' + (error as Error).message
      };
    }
  }

  /**
   * Create transaction entry for received funds
   */
  async createReceiveTransactionEntry(
    transactionParams: {
      from: string;
      amount: number;
      currency: string;
      note?: string;
    },
    transactionResult: any,
    userId: string,
    senderName?: string
  ): Promise<SaveTransactionResult> {
    try {
      const transactionEntry: Omit<TransactionHistoryEntry, 'id' | 'created_at' | 'updated_at'> = {
        type: 'receive',
        amount: transactionParams.amount,
        currency: transactionParams.currency,
        from_user: transactionParams.from,
        to_user: userId,
        from_wallet: transactionParams.from,
        to_wallet: '', // Will be filled by user wallet service
        tx_hash: transactionResult.signature || transactionResult.txId || '',
        note: transactionParams.note || '',
        status: transactionResult.confirmationStatus === 'confirmed' ? 'completed' : 'pending',
        company_fee: 0, // No fee for receiving
        gas_fee: 0, // No gas fee for receiving
        gas_fee_covered_by_company: false,
        recipient_name: '', // This user is the recipient
        sender_name: senderName || '',
        transaction_method: 'app_wallet',
        app_version: '1.0.0',
        device_info: 'mobile'
      };

      return await this.saveTransaction(transactionEntry, userId);

    } catch (error) {
      console.error('❌ TransactionHistoryService: Failed to create receive transaction entry:', error);
      return {
        success: false,
        error: 'Failed to create receive transaction entry: ' + (error as Error).message
      };
    }
  }
}

// Export singleton instance
export const transactionHistoryService = new TransactionHistoryService();
