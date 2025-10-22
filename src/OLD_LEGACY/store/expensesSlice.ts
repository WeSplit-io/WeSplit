/**
 * Expenses State Slice
 * Manages expenses and expense-related state
 */

import { StateCreator } from 'zustand';
import { Expense } from '../../types';
import { ExpensesState, ExpensesActions, AppStore } from '../types';
import { firebaseDataService } from '../../services/firebaseDataService';
import { logger } from '../../services/loggingService';

export const createExpensesSlice: StateCreator<
  AppStore,
  [],
  [],
  ExpensesState & ExpensesActions
> = (set, get) => ({
  // Initial state
  expenses: {},
  isLoading: false,
  error: null,
  lastFetch: {},

  // Actions
  setExpenses: (groupId: string | number, expenses: Expense[]) => {
    const groupIdStr = groupId.toString();
    set((state) => ({
      expenses: {
        ...state.expenses,
        expenses: {
          ...state.expenses.expenses,
          [groupIdStr]: expenses,
        },
        lastFetch: {
          ...state.expenses.lastFetch,
          [groupIdStr]: Date.now(),
        },
        error: null,
      },
    }));
  },

  addExpense: (groupId: string | number, expense: Expense) => {
    const groupIdStr = groupId.toString();
    set((state) => ({
      expenses: {
        ...state.expenses,
        expenses: {
          ...state.expenses.expenses,
          [groupIdStr]: [
            ...(state.expenses.expenses[groupIdStr] || []),
            expense,
          ],
        },
        lastFetch: {
          ...state.expenses.lastFetch,
          [groupIdStr]: Date.now(),
        },
        error: null,
      },
    }));

    logger.info('Expense added', { groupId, expenseId: expense.id }, 'ExpensesSlice');
  },

  updateExpense: (groupId: string | number, expenseId: string | number, updates: Partial<Expense>) => {
    const groupIdStr = groupId.toString();
    set((state) => ({
      expenses: {
        ...state.expenses,
        expenses: {
          ...state.expenses.expenses,
          [groupIdStr]: (state.expenses.expenses[groupIdStr] || []).map(expense =>
            expense.id === expenseId ? { ...expense, ...updates } : expense
          ),
        },
        lastFetch: {
          ...state.expenses.lastFetch,
          [groupIdStr]: Date.now(),
        },
        error: null,
      },
    }));

    logger.info('Expense updated', { groupId, expenseId, updates: Object.keys(updates) }, 'ExpensesSlice');
  },

  deleteExpense: (groupId: string | number, expenseId: string | number) => {
    const groupIdStr = groupId.toString();
    set((state) => ({
      expenses: {
        ...state.expenses,
        expenses: {
          ...state.expenses.expenses,
          [groupIdStr]: (state.expenses.expenses[groupIdStr] || []).filter(
            expense => expense.id !== expenseId
          ),
        },
        lastFetch: {
          ...state.expenses.lastFetch,
          [groupIdStr]: Date.now(),
        },
        error: null,
      },
    }));

    logger.info('Expense deleted', { groupId, expenseId }, 'ExpensesSlice');
  },

  setExpensesLoading: (loading: boolean) => {
    set((state) => ({
      expenses: {
        ...state.expenses,
        isLoading: loading,
      },
    }));
  },

  setExpensesError: (error: string | null) => {
    set((state) => ({
      expenses: {
        ...state.expenses,
        error,
      },
    }));
  },

  clearExpensesError: () => {
    set((state) => ({
      expenses: {
        ...state.expenses,
        error: null,
      },
    }));
  },

  refreshExpenses: async (groupId: string | number) => {
    const currentUser = get().user.currentUser;
    if (!currentUser) {
      set((state) => ({
        expenses: {
          ...state.expenses,
          error: 'No user authenticated',
        },
      }));
      return;
    }

    set((state) => ({
      expenses: {
        ...state.expenses,
        isLoading: true,
        error: null,
      },
    }));

    try {
      const expenses = await firebaseDataService.expense.getGroupExpenses(groupId.toString());
      
      set((state) => ({
        expenses: {
          ...state.expenses,
          expenses: {
            ...state.expenses.expenses,
            [groupId.toString()]: expenses,
          },
          isLoading: false,
          error: null,
          lastFetch: {
            ...state.expenses.lastFetch,
            [groupId.toString()]: Date.now(),
          },
        },
      }));

      logger.info('Expenses refreshed successfully', { 
        userId: currentUser.id,
        groupId,
        expenseCount: expenses.length 
      }, 'ExpensesSlice');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh expenses';
      
      set((state) => ({
        expenses: {
          ...state.expenses,
          isLoading: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to refresh expenses', { 
        userId: currentUser.id,
        groupId,
        error: errorMessage 
      }, 'ExpensesSlice');
    }
  },
});
