/**
 * Multi-Signature State Slice
 * Manages multi-signature wallet state and operations
 */

import { StateCreator } from 'zustand';
import { MultiSignState, MultiSignActions, AppStore } from '../types';
import { multiSignStateService } from '../../services/core';
import { logger } from '../../services/analytics/loggingService';

export const createMultiSignSlice: StateCreator<
  AppStore,
  [],
  [],
  MultiSignState & MultiSignActions
> = (set, get) => ({
  // Initial state
  isEnabled: false,
  remainingDays: 0,
  isActivating: false,
  isDeactivating: false,
  isLoading: false,
  error: null,

  // Actions
  setEnabled: (enabled: boolean) => {
    set((state) => ({
      multiSign: {
        ...state.multiSign,
        isEnabled: enabled,
        error: null,
      },
    }));

    logger.info('Multi-signature status changed', { enabled }, 'MultiSignSlice');
  },

  setRemainingDays: (days: number) => {
    set((state) => ({
      multiSign: {
        ...state.multiSign,
        remainingDays: days,
      },
    }));
  },

  setActivating: (activating: boolean) => {
    set((state) => ({
      multiSign: {
        ...state.multiSign,
        isActivating: activating,
      },
    }));
  },

  setDeactivating: (deactivating: boolean) => {
    set((state) => ({
      multiSign: {
        ...state.multiSign,
        isDeactivating: deactivating,
      },
    }));
  },

  setMultiSignLoading: (loading: boolean) => {
    set((state) => ({
      multiSign: {
        ...state.multiSign,
        isLoading: loading,
      },
    }));
  },

  setMultiSignError: (error: string | null) => {
    set((state) => ({
      multiSign: {
        ...state.multiSign,
        error,
      },
    }));
  },

  clearMultiSignError: () => {
    set((state) => ({
      multiSign: {
        ...state.multiSign,
        error: null,
      },
    }));
  },

  loadMultiSignState: async () => {
    set((state) => ({
      multiSign: {
        ...state.multiSign,
        isLoading: true,
        error: null,
      },
    }));

    try {
      const isEnabled = await MultiSignStateService.loadMultiSignState();
      let remainingDays = 0;
      
      if (isEnabled) {
        remainingDays = await MultiSignStateService.getRemainingDays();
      }
      
      set((state) => ({
        multiSign: {
          ...state.multiSign,
          isEnabled,
          remainingDays,
          isLoading: false,
          error: null,
        },
      }));

      logger.info('Multi-signature state loaded', { 
        isEnabled, 
        remainingDays 
      }, 'MultiSignSlice');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load multi-signature state';
      
      set((state) => ({
        multiSign: {
          ...state.multiSign,
          isLoading: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to load multi-signature state', { error: errorMessage }, 'MultiSignSlice');
    }
  },

  activateMultiSign: async () => {
    set((state) => ({
      multiSign: {
        ...state.multiSign,
        isActivating: true,
        error: null,
      },
    }));

    try {
      await MultiSignStateService.activateMultiSign();
      
      set((state) => ({
        multiSign: {
          ...state.multiSign,
          isEnabled: true,
          isActivating: false,
          remainingDays: 7, // Default activation period
          error: null,
        },
      }));

      logger.info('Multi-signature activated successfully', null, 'MultiSignSlice');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to activate multi-signature';
      
      set((state) => ({
        multiSign: {
          ...state.multiSign,
          isActivating: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to activate multi-signature', { error: errorMessage }, 'MultiSignSlice');
    }
  },

  deactivateMultiSign: async () => {
    set((state) => ({
      multiSign: {
        ...state.multiSign,
        isDeactivating: true,
        error: null,
      },
    }));

    try {
      await MultiSignStateService.deactivateMultiSign();
      
      set((state) => ({
        multiSign: {
          ...state.multiSign,
          isEnabled: false,
          isDeactivating: false,
          remainingDays: 0,
          error: null,
        },
      }));

      logger.info('Multi-signature deactivated successfully', null, 'MultiSignSlice');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate multi-signature';
      
      set((state) => ({
        multiSign: {
          ...state.multiSign,
          isDeactivating: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to deactivate multi-signature', { error: errorMessage }, 'MultiSignSlice');
    }
  },

  refreshRemainingDays: async () => {
    const currentState = get().multiSign;
    if (!currentState.isEnabled) {
      return;
    }

    try {
      const remainingDays = await MultiSignStateService.getRemainingDays();
      
      set((state) => ({
        multiSign: {
          ...state.multiSign,
          remainingDays,
        },
      }));

      logger.info('Multi-signature remaining days refreshed', { remainingDays }, 'MultiSignSlice');
    } catch (error) {
      logger.error('Failed to refresh remaining days', { error }, 'MultiSignSlice');
    }
  },
});
