import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react';
import { 
  User, 
  AppState, 
  AppAction,
  NavigationParams,
  Notification
} from '../types';
import { firebaseDataService } from '../services/data';
import { i18nService } from '../services/core';
import { notificationService } from '../services/notifications';
import { multiSignStateService } from '../services/core';
import { logger } from '../services/analytics/loggingService';
import { SplitInvitationService } from '../services/splits/splitInvitationService';

// Initial State - clean without group-related data
const initialState: AppState = {
  // User state
  currentUser: null,
  isAuthenticated: false,
  authMethod: null,
  
  // UI state
  isLoading: false,
  error: null,
  
  // Cache timestamps
  lastDataFetch: {},
  notifications: [],
  lastNotificationsFetch: 0,
};

// Reducer with minimal state management
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { 
        ...state, 
        currentUser: action.payload,
        isAuthenticated: true 
      };
    
    case 'AUTHENTICATE_USER':
      return {
        ...state,
        currentUser: action.payload.user,
        authMethod: action.payload.method,
        isAuthenticated: true,
        error: null
      };

    case 'LOGOUT_USER':
      return {
        ...initialState
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload.notifications,
        lastNotificationsFetch: action.payload.timestamp
      };
    
    default:
      return state;
  }
};

// Context Type - minimal interface
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // User operations
  authenticateUser: (user: User, method: 'wallet' | 'email' | 'guest' | 'social') => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  logoutUser: () => void;
  
  // Utility functions
  clearError: () => void;

  // Notifications
  notifications: Notification[];
  loadNotifications: (forceRefresh?: boolean) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  
  // Split invitation handling
  acceptSplitInvitation: (notificationId: string, splitId: string) => Promise<any>;
  
  removeNotification: (notificationId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Initialize tracking services safely
  const initializeTrackingSafely = useCallback(() => {
    try {
      const globalAny = global as any;
      
      if (globalAny.stopTracking && typeof globalAny.stopTracking === 'function') {
        try {
          globalAny.stopTracking();
        } catch (stopError) {
          // Ignore stopTracking errors
        }
      }
      
      if (globalAny.startTracking && typeof globalAny.startTracking === 'function') {
        try {
          globalAny.startTracking();
        } catch (startError) {
          // Ignore startTracking errors
        }
      }
    } catch (error) {
      // Ignore all tracking initialization errors
    }
  }, []);

  // Initialize tracking on mount
  useEffect(() => {
        initializeTrackingSafely();
  }, [initializeTrackingSafely]);

  // Load notifications
  const loadNotifications = useCallback(async (forceRefresh: boolean = false) => {
    if (!state.currentUser?.id) {return;}

    try {
      const now = Date.now();
      const shouldRefresh = forceRefresh || (now - state.lastNotificationsFetch > 5 * 60 * 1000); // 5 minutes

      if (shouldRefresh) {
        const notifications = await notificationService.instance.getUserNotifications(state.currentUser.id.toString());
        dispatch({
          type: 'SET_NOTIFICATIONS',
          payload: {
            notifications: notifications as Notification[],
            timestamp: now
          }
        });
      }
    } catch (error) {
      logger.error('Failed to load notifications:', error, 'AppContext');
    }
  }, [state.currentUser?.id]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await loadNotifications(true);
  }, [loadNotifications]);

  // Remove notification
  const removeNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      dispatch({
        type: 'SET_NOTIFICATIONS',
        payload: {
          notifications: state.notifications.filter(n => n.id !== notificationId),
          timestamp: Date.now()
        }
      });
    } catch (error) {
      logger.error('Failed to remove notification:', error, 'AppContext');
    }
  }, [state.notifications]);

  // Accept split invitation
  const acceptSplitInvitation = useCallback(async (notificationId: string, splitId: string) => {
    try {
      if (!state.currentUser?.id) {
        throw new Error('User not authenticated');
      }

      // Find the notification
      const notification = state.notifications.find(n => n.id === notificationId);
      if (!notification || !notification.data?.splitId) {
        throw new Error('Invalid notification or missing split data');
      }

      // Create invitation data from notification
      const invitationData = {
        type: 'split_invitation' as const,
        splitId: notification.data.splitId,
        billName: notification.data.billName || 'Split Bill',
        totalAmount: notification.data.totalAmount || 0,
        currency: notification.data.currency || 'USDC',
        creatorId: notification.data.creatorId || '',
        timestamp: notification.timestamp || new Date().toISOString(),
      };

      // Use SplitInvitationService to actually join the split
      logger.info('About to call SplitInvitationService.joinSplit', { splitId, notificationId }, 'AppContext');
      const joinResult = await SplitInvitationService.joinSplit(invitationData, state.currentUser.id);
      
      logger.info('joinSplit result', { 
        success: joinResult.success, 
        message: joinResult.message,
        error: joinResult.error 
      }, 'AppContext');
      
      // Only throw error if the user is not already a participant
      if (!joinResult.success && !joinResult.message?.includes('already a participant')) {
        logger.error('joinSplit failed', { 
          success: joinResult.success, 
          error: joinResult.error,
          message: joinResult.message
        }, 'AppContext');
        throw new Error(joinResult.error || 'Failed to join split');
      }

      // Remove the notification after successful join (or if already joined)
      logger.info('Removing notification after successful join', { notificationId }, 'AppContext');
      await removeNotification(notificationId);
      
      logger.info('Split invitation accepted and user joined split', {
        splitId,
        userId: state.currentUser.id,
        joinResult
      }, 'AppContext');

      return { success: true, splitId, joinResult };
    } catch (error) {
      logger.error('Failed to accept split invitation:', error, 'AppContext');
      // Check if it's an "already participant" error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already a participant')) {
        logger.info('User already participant - not throwing error', null, 'AppContext');
        return { success: true, splitId, joinResult: { success: true, message: 'User already a participant' } };
      }
      throw error;
    }
  }, [state.currentUser, state.notifications, removeNotification]);

  // User operations
  const authenticateUser = useCallback(async (user: User, method: 'wallet' | 'email' | 'guest' | 'social') => {
    try {
      dispatch({
        type: 'AUTHENTICATE_USER',
        payload: { user, method }
      });

      // Load notifications after authentication
      await loadNotifications(true);
      } catch (error) {
      logger.error('Failed to authenticate user:', error, 'AppContext');
      throw error;
    }
  }, [loadNotifications]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await firebaseDataService.user.updateUser(state.currentUser.id.toString(), updates);
      
      dispatch({
        type: 'SET_CURRENT_USER',
        payload: { ...state.currentUser, ...updates }
      });
    } catch (error) {
      logger.error('Failed to update user:', error, 'AppContext');
      throw error;
    }
  }, [state.currentUser]);

  const logoutUser = useCallback(() => {
    dispatch({ type: 'LOGOUT_USER' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Load notifications when user is authenticated
  useEffect(() => {
    if (state.currentUser?.id) {
      loadNotifications();
    }
  }, [state.currentUser?.id]);

  const value: AppContextType = {
    state,
    dispatch,
    authenticateUser,
    updateUser,
    logoutUser,
    clearError,
    notifications: state.notifications ?? [],
    loadNotifications,
    refreshNotifications,
    acceptSplitInvitation,
    removeNotification,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 