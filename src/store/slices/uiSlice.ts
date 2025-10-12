/**
 * UI State Slice
 * Manages UI-related state like loading, errors, theme, etc.
 */

import { StateCreator } from 'zustand';
import { UIState, UIActions, AppStore } from '../types';
import { logger } from '../../services/loggingService';

export const createUISlice: StateCreator<
  AppStore,
  [],
  [],
  UIState & UIActions
> = (set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  theme: 'dark', // Default to dark theme for WeSplit
  language: 'en',
  networkStatus: 'online',

  // Actions
  setLoading: (loading: boolean) => {
    set((state) => ({
      ui: {
        ...state.ui,
        isLoading: loading,
      },
    }));
  },

  setError: (error: string | null) => {
    set((state) => ({
      ui: {
        ...state.ui,
        error,
      },
    }));

    if (error) {
      logger.error('UI Error set', { error }, 'UISlice');
    }
  },

  clearError: () => {
    set((state) => ({
      ui: {
        ...state.ui,
        error: null,
      },
    }));
  },

  setTheme: (theme: 'light' | 'dark') => {
    set((state) => ({
      ui: {
        ...state.ui,
        theme,
      },
    }));

    logger.info('Theme changed', { theme }, 'UISlice');
  },

  setLanguage: (language: string) => {
    set((state) => ({
      ui: {
        ...state.ui,
        language,
      },
    }));

    logger.info('Language changed', { language }, 'UISlice');
  },

  setNetworkStatus: (status: 'online' | 'offline') => {
    set((state) => ({
      ui: {
        ...state.ui,
        networkStatus: status,
      },
    }));

    logger.info('Network status changed', { status }, 'UISlice');
  },
});
