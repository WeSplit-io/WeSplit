/**
 * Splits State Slice
 * Manages split wallets and split-related state
 */

import { StateCreator } from 'zustand';
import { SplitsState, SplitsActions, AppStore } from '../types';
import { SplitWallet } from '../../services/split';
import { logger } from '../../services/core';

export const createSplitsSlice: StateCreator<
  AppStore,
  [],
  [],
  SplitsState & SplitsActions
> = (set, get) => ({
  // Initial state
  splits: {},
  activeSplit: null,
  isLoading: false,
  error: null,
  lastFetch: {},

  // Actions
  setSplits: (splits: Record<string, SplitWallet>) => {
    set((state) => ({
      splits: {
        ...state.splits,
        splits,
        lastFetch: Date.now(),
        error: null,
      },
    }));
  },

  addSplit: (splitId: string, split: SplitWallet) => {
    set((state) => ({
      splits: {
        ...state.splits,
        splits: {
          ...state.splits.splits,
          [splitId]: split,
        },
        lastFetch: Date.now(),
        error: null,
      },
    }));

    logger.info('Split added', { splitId, status: split.status }, 'SplitsSlice');
  },

  updateSplit: (splitId: string, updates: Partial<SplitWallet>) => {
    set((state) => ({
      splits: {
        ...state.splits,
        splits: {
          ...state.splits.splits,
          [splitId]: {
            ...state.splits.splits[splitId],
            ...updates,
          },
        },
        activeSplit: state.splits.activeSplit?.id === splitId 
          ? { ...state.splits.activeSplit, ...updates }
          : state.splits.activeSplit,
        lastFetch: Date.now(),
        error: null,
      },
    }));

    logger.info('Split updated', { splitId, updates: Object.keys(updates) }, 'SplitsSlice');
  },

  deleteSplit: (splitId: string) => {
    set((state) => ({
      splits: {
        ...state.splits,
        splits: Object.fromEntries(
          Object.entries(state.splits.splits).filter(([id]) => id !== splitId)
        ),
        activeSplit: state.splits.activeSplit?.id === splitId 
          ? null 
          : state.splits.activeSplit,
        lastFetch: Date.now(),
        error: null,
      },
    }));

    logger.info('Split deleted', { splitId }, 'SplitsSlice');
  },

  setActiveSplit: (split: SplitWallet | null) => {
    set((state) => ({
      splits: {
        ...state.splits,
        activeSplit: split,
      },
    }));

    logger.info('Active split set', { 
      splitId: split?.id || null, 
      status: split?.status || null 
    }, 'SplitsSlice');
  },

  setSplitsLoading: (loading: boolean) => {
    set((state) => ({
      splits: {
        ...state.splits,
        isLoading: loading,
      },
    }));
  },

  setSplitsError: (error: string | null) => {
    set((state) => ({
      splits: {
        ...state.splits,
        error,
      },
    }));
  },

  clearSplitsError: () => {
    set((state) => ({
      splits: {
        ...state.splits,
        error: null,
      },
    }));
  },

  refreshSplits: async () => {
    const currentUser = get().user.currentUser;
    if (!currentUser) {
      set((state) => ({
        splits: {
          ...state.splits,
          error: 'No user authenticated',
        },
      }));
      return;
    }

    set((state) => ({
      splits: {
        ...state.splits,
        isLoading: true,
        error: null,
      },
    }));

    try {
      // This would need to be implemented based on your split service
      // const splits = await splitService.getUserSplits(currentUser.id.toString());
      const splits: Record<string, SplitWallet> = {};
      
      set((state) => ({
        splits: {
          ...state.splits,
          splits,
          isLoading: false,
          error: null,
          lastFetch: Date.now(),
        },
      }));

      logger.info('Splits refreshed successfully', { 
        userId: currentUser.id,
        splitCount: Object.keys(splits).length 
      }, 'SplitsSlice');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh splits';
      
      set((state) => ({
        splits: {
          ...state.splits,
          isLoading: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to refresh splits', { 
        userId: currentUser.id,
        error: errorMessage 
      }, 'SplitsSlice');
    }
  },

  createSplit: async (splitData: any) => {
    const currentUser = get().user.currentUser;
    if (!currentUser) {
      set((state) => ({
        splits: {
          ...state.splits,
          error: 'No user authenticated',
        },
      }));
      return null;
    }

    set((state) => ({
      splits: {
        ...state.splits,
        isLoading: true,
        error: null,
      },
    }));

    try {
      // This would need to be implemented based on your split service
      // const newSplit = await splitService.createSplit(currentUser.id.toString(), splitData);
      const newSplit: SplitWallet = {
        id: Date.now().toString(),
        ...splitData,
        status: 'draft',
        createdAt: new Date().toISOString(),
      };
      
      set((state) => ({
        splits: {
          ...state.splits,
          splits: {
            ...state.splits.splits,
            [newSplit.id]: newSplit,
          },
          isLoading: false,
          error: null,
          lastFetch: Date.now(),
        },
      }));

      logger.info('Split created successfully', { 
        userId: currentUser.id,
        splitId: newSplit.id 
      }, 'SplitsSlice');

      return newSplit;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create split';
      
      set((state) => ({
        splits: {
          ...state.splits,
          isLoading: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to create split', { 
        userId: currentUser.id,
        error: errorMessage 
      }, 'SplitsSlice');

      return null;
    }
  },
});
