/**
 * Notifications State Slice
 * Manages notifications and notification-related state
 */

import { StateCreator } from 'zustand';
import { Notification } from '../../types';
import { NotificationsState, NotificationsActions, AppStore } from '../types';
import { notificationService } from '../../services/notifications';
import { logger } from '../../services/core';

export const createNotificationsSlice: StateCreator<
  AppStore,
  [],
  [],
  NotificationsState & NotificationsActions
> = (set, get) => ({
  // Initial state
  notifications: [],
  isLoading: false,
  error: null,
  lastFetch: 0,
  unreadCount: 0,

  // Actions
  setNotifications: (notifications: Notification[]) => {
    const unreadCount = notifications.filter(n => !n.read).length;
    
    set((state) => ({
      notifications: {
        ...state.notifications,
        notifications,
        unreadCount,
        lastFetch: Date.now(),
        error: null,
      },
    }));
  },

  addNotification: (notification: Notification) => {
    set((state) => {
      const newNotifications = [notification, ...state.notifications.notifications];
      const unreadCount = newNotifications.filter(n => !n.read).length;
      
      return {
        notifications: {
          ...state.notifications,
          notifications: newNotifications,
          unreadCount,
        },
      };
    });

    logger.info('Notification added', { 
      notificationId: notification.id,
      type: notification.type 
    }, 'NotificationsSlice');
  },

  updateNotification: (notificationId: string, updates: Partial<Notification>) => {
    set((state) => {
      const updatedNotifications = state.notifications.notifications.map(notification =>
        notification.id === notificationId 
          ? { ...notification, ...updates }
          : notification
      );
      const unreadCount = updatedNotifications.filter(n => !n.read).length;
      
      return {
        notifications: {
          ...state.notifications,
          notifications: updatedNotifications,
          unreadCount,
        },
      };
    });

    logger.info('Notification updated', { 
      notificationId, 
      updates: Object.keys(updates) 
    }, 'NotificationsSlice');
  },

  removeNotification: (notificationId: string) => {
    set((state) => {
      const filteredNotifications = state.notifications.notifications.filter(
        notification => notification.id !== notificationId
      );
      const unreadCount = filteredNotifications.filter(n => !n.read).length;
      
      return {
        notifications: {
          ...state.notifications,
          notifications: filteredNotifications,
          unreadCount,
        },
      };
    });

    logger.info('Notification removed', { notificationId }, 'NotificationsSlice');
  },

  markAsRead: (notificationId: string) => {
    set((state) => {
      const updatedNotifications = state.notifications.notifications.map(notification =>
        notification.id === notificationId 
          ? { ...notification, read: true, readAt: new Date().toISOString() }
          : notification
      );
      const unreadCount = updatedNotifications.filter(n => !n.read).length;
      
      return {
        notifications: {
          ...state.notifications,
          notifications: updatedNotifications,
          unreadCount,
        },
      };
    });

    logger.info('Notification marked as read', { notificationId }, 'NotificationsSlice');
  },

  markAllAsRead: () => {
    set((state) => {
      const updatedNotifications = state.notifications.notifications.map(notification => ({
        ...notification,
        read: true,
        readAt: new Date().toISOString(),
      }));
      
      return {
        notifications: {
          ...state.notifications,
          notifications: updatedNotifications,
          unreadCount: 0,
        },
      };
    });

    logger.info('All notifications marked as read', null, 'NotificationsSlice');
  },

  setNotificationsLoading: (loading: boolean) => {
    set((state) => ({
      notifications: {
        ...state.notifications,
        isLoading: loading,
      },
    }));
  },

  setNotificationsError: (error: string | null) => {
    set((state) => ({
      notifications: {
        ...state.notifications,
        error,
      },
    }));
  },

  clearNotificationsError: () => {
    set((state) => ({
      notifications: {
        ...state.notifications,
        error: null,
      },
    }));
  },

  refreshNotifications: async () => {
    const currentUser = get().user.currentUser;
    if (!currentUser) {
      set((state) => ({
        notifications: {
          ...state.notifications,
          error: 'No user authenticated',
        },
      }));
      return;
    }

    set((state) => ({
      notifications: {
        ...state.notifications,
        isLoading: true,
        error: null,
      },
    }));

    try {
      const notifications = await notificationService.instance.getUserNotifications(currentUser.id.toString());
      
      set((state) => ({
        notifications: {
          ...state.notifications,
          notifications,
          isLoading: false,
          error: null,
          lastFetch: Date.now(),
          unreadCount: notifications.filter(n => !n.read).length,
        },
      }));

      logger.info('Notifications refreshed successfully', { 
        userId: currentUser.id,
        notificationCount: notifications.length 
      }, 'NotificationsSlice');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh notifications';
      
      set((state) => ({
        notifications: {
          ...state.notifications,
          isLoading: false,
          error: errorMessage,
        },
      }));

      logger.error('Failed to refresh notifications', { 
        userId: currentUser.id,
        error: errorMessage 
      }, 'NotificationsSlice');
    }
  },
});
