/**
 * User State Slice
 * Manages user authentication and profile state
 */

import { StateCreator } from 'zustand';
import { User } from '../../types';
import { UserState, UserActions, AppStore } from '../types';
import { firebaseDataService } from '../../services/data';
import { logger } from '../../services/analytics/loggingService';

export const createUserSlice: StateCreator<
  AppStore,
  [],
  [],
  UserState & UserActions
> = (set, get) => ({
  // Initial state
  currentUser: null,
  isAuthenticated: false,
  authMethod: null,
  isLoading: false,
  error: null,

  // Actions
  setCurrentUser: (user: User | null) => {
    set((state) => ({
      user: {
        ...state.user,
        currentUser: user,
        isAuthenticated: !!user,
        error: null,
      },
    }));
  },

  authenticateUser: (user: User, method: 'wallet' | 'email' | 'guest' | 'social') => {
    set((state) => ({
      user: {
        ...state.user,
        currentUser: user,
        isAuthenticated: true,
        authMethod: method,
        error: null,
        isLoading: false,
      },
    }));

    logger.info('User authenticated', { 
      userId: user.id, 
      method,
      email: user.email 
    }, 'UserSlice');
  },

  logoutUser: () => {
    set((state) => ({
      user: {
        currentUser: null,
        isAuthenticated: false,
        authMethod: null,
        isLoading: false,
        error: null,
      },
    }));

    logger.info('User logged out', null, 'UserSlice');
  },

  updateUser: async (updates: Partial<User>) => {
    const currentUser = get().user.currentUser;
    if (!currentUser) {
      set((state) => ({
        user: {
          ...state.user,
          error: 'No user to update',
        },
      }));
      return;
    }

    set((state) => ({
      user: {
        ...state.user,
        isLoading: true,
        error: null,
      },
    }));

    try {
      const updatedUser = await firebaseDataService.updateUser(currentUser.id.toString(), updates);
      
      set((state) => ({
        user: {
          ...state.user,
          currentUser: updatedUser,
          isLoading: false,
          error: null,
        },
      }));

      logger.info('User updated successfully', { 
        userId: currentUser.id,
        updates: Object.keys(updates)
      }, 'UserSlice');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      
      set((state) => ({
        user: {
          ...state.user,
          isLoading: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to update user', { 
        userId: currentUser.id,
        error: errorMessage 
      }, 'UserSlice');
    }
  },

  setUserLoading: (loading: boolean) => {
    set((state) => ({
      user: {
        ...state.user,
        isLoading: loading,
      },
    }));
  },

  setUserError: (error: string | null) => {
    set((state) => ({
      user: {
        ...state.user,
        error,
      },
    }));
  },

  clearUserError: () => {
    set((state) => ({
      user: {
        ...state.user,
        error: null,
      },
    }));
  },
});
