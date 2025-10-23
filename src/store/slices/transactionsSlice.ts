/**
 * Transactions State Slice
 * Manages transaction history and processing state
 */

import { StateCreator } from 'zustand';
import { TransactionsState, TransactionsActions, AppStore } from '../types';
import { logger } from '../../services/analytics/loggingService';

export const createTransactionsSlice: StateCreator<
  AppStore,
  [],
  [],
  TransactionsState & TransactionsActions
> = (set, get) => ({
  // Initial state
  transactions: [],
  pendingTransactions: [],
  isLoading: false,
  error: null,
  lastFetch: 0,

  // Actions
  setTransactions: (transactions: any[]) => {
    set((state) => ({
      transactions: {
        ...state.transactions,
        transactions,
        lastFetch: Date.now(),
        error: null,
      },
    }));
  },

  addTransaction: (transaction: any) => {
    set((state) => ({
      transactions: {
        ...state.transactions,
        transactions: [transaction, ...state.transactions.transactions],
        lastFetch: Date.now(),
        error: null,
      },
    }));

    logger.info('Transaction added', { 
      transactionId: transaction.id || transaction.signature,
      type: transaction.type 
    }, 'TransactionsSlice');
  },

  updateTransaction: (transactionId: string, updates: any) => {
    set((state) => ({
      transactions: {
        ...state.transactions,
        transactions: state.transactions.transactions.map(transaction =>
          (transaction.id === transactionId || transaction.signature === transactionId)
            ? { ...transaction, ...updates }
            : transaction
        ),
        lastFetch: Date.now(),
        error: null,
      },
    }));

    logger.info('Transaction updated', { 
      transactionId, 
      updates: Object.keys(updates) 
    }, 'TransactionsSlice');
  },

  removeTransaction: (transactionId: string) => {
    set((state) => ({
      transactions: {
        ...state.transactions,
        transactions: state.transactions.transactions.filter(transaction =>
          transaction.id !== transactionId && transaction.signature !== transactionId
        ),
        lastFetch: Date.now(),
        error: null,
      },
    }));

    logger.info('Transaction removed', { transactionId }, 'TransactionsSlice');
  },

  addPendingTransaction: (transaction: any) => {
    set((state) => ({
      transactions: {
        ...state.transactions,
        pendingTransactions: [...state.transactions.pendingTransactions, transaction],
        error: null,
      },
    }));

    logger.info('Pending transaction added', { 
      transactionId: transaction.id || transaction.signature 
    }, 'TransactionsSlice');
  },

  removePendingTransaction: (transactionId: string) => {
    set((state) => ({
      transactions: {
        ...state.transactions,
        pendingTransactions: state.transactions.pendingTransactions.filter(transaction =>
          transaction.id !== transactionId && transaction.signature !== transactionId
        ),
      },
    }));

    logger.info('Pending transaction removed', { transactionId }, 'TransactionsSlice');
  },

  setTransactionsLoading: (loading: boolean) => {
    set((state) => ({
      transactions: {
        ...state.transactions,
        isLoading: loading,
      },
    }));
  },

  setTransactionsError: (error: string | null) => {
    set((state) => ({
      transactions: {
        ...state.transactions,
        error,
      },
    }));
  },

  clearTransactionsError: () => {
    set((state) => ({
      transactions: {
        ...state.transactions,
        error: null,
      },
    }));
  },

  refreshTransactions: async () => {
    const currentUser = get().user.currentUser;
    if (!currentUser) {
      set((state) => ({
        transactions: {
          ...state.transactions,
          error: 'No user authenticated',
        },
      }));
      return;
    }

    set((state) => ({
      transactions: {
        ...state.transactions,
        isLoading: true,
        error: null,
      },
    }));

    try {
      // This would need to be implemented based on your transaction service
      // const transactions = await transactionService.getUserTransactions(currentUser.id.toString());
      const transactions: any[] = [];
      
      set((state) => ({
        transactions: {
          ...state.transactions,
          transactions,
          isLoading: false,
          error: null,
          lastFetch: Date.now(),
        },
      }));

      logger.info('Transactions refreshed successfully', { 
        userId: currentUser.id,
        transactionCount: transactions.length 
      }, 'TransactionsSlice');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh transactions';
      
      set((state) => ({
        transactions: {
          ...state.transactions,
          isLoading: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to refresh transactions', { 
        userId: currentUser.id,
        error: errorMessage 
      }, 'TransactionsSlice');
    }
  },

  sendTransaction: async (transactionData: any) => {
    const currentUser = get().user.currentUser;
    if (!currentUser) {
      set((state) => ({
        transactions: {
          ...state.transactions,
          error: 'No user authenticated',
        },
      }));
      return null;
    }

    set((state) => ({
      transactions: {
        ...state.transactions,
        isLoading: true,
        error: null,
      },
    }));

    try {
      // This would need to be implemented based on your transaction service
      // const result = await transactionService.sendTransaction(transactionData);
      const result = {
        success: true,
        signature: 'mock-signature-' + Date.now(),
        transaction: {
          id: Date.now().toString(),
          ...transactionData,
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      };
      
      if (result.success) {
        set((state) => ({
          transactions: {
            ...state.transactions,
            pendingTransactions: [...state.transactions.pendingTransactions, result.transaction],
            isLoading: false,
            error: null,
          },
        }));

        logger.info('Transaction sent successfully', { 
          userId: currentUser.id,
          signature: result.signature 
        }, 'TransactionsSlice');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send transaction';
      
      set((state) => ({
        transactions: {
          ...state.transactions,
          isLoading: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to send transaction', { 
        userId: currentUser.id,
        error: errorMessage 
      }, 'TransactionsSlice');

      return { success: false, error: errorMessage };
    }
  },
});
