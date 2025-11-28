/**
 * Legacy Hooks for Migration
 * Provides backward-compatible hooks that match the old context API
 * This allows gradual migration from context to Zustand store
 */

import { useAppStore, useCurrentUser, useIsAuthenticated, useGroups, useSelectedGroup } from '../index';
import { useUserActions, useGroupsActions, useWalletActions, useNotificationsActions } from '../index';
import { User, GroupWithDetails, Expense, Balance, Notification } from '../../types';

// ============================================================================
// LEGACY APP CONTEXT COMPATIBILITY
// ============================================================================

/**
 * Legacy useApp hook that provides the same interface as the old AppContext
 * This allows existing components to work without modification
 */
export const useApp = () => {
  const state = useAppStore();
  
  return {
    // State (matches old AppContext.state)
    state: {
      currentUser: state.user.currentUser,
      isAuthenticated: state.user.isAuthenticated,
      authMethod: state.user.authMethod,
      groups: state.groups.groups,
      selectedGroup: state.groups.selectedGroup,
      notifications: state.notifications.notifications,
      isLoading: state.user.isLoading || state.groups.isLoading || state.wallet.isLoading,
      error: state.user.error || state.groups.error || state.wallet.error,
    },
    
    // Actions (matches old AppContext methods)
    dispatch: (action: any) => {
      // Legacy dispatch support - convert to new actions
      switch (action.type) {
        case 'SET_CURRENT_USER':
          state.setCurrentUser(action.payload);
          break;
        case 'AUTHENTICATE_USER':
          state.authenticateUser(action.payload.user, action.payload.method);
          break;
        case 'LOGOUT_USER':
          state.logoutUser();
          break;
        case 'SET_GROUPS':
          state.setGroups(action.payload);
          break;
        case 'ADD_GROUP':
          state.addGroup(action.payload);
          break;
        case 'UPDATE_GROUP':
          state.updateGroup(action.payload.id, action.payload);
          break;
        case 'DELETE_GROUP':
          state.deleteGroup(action.payload);
          break;
        case 'SELECT_GROUP':
          state.selectGroup(action.payload);
          break;
        default:
          console.warn('Unknown action type:', action.type);
      }
    },
    
    // Data operations
    loadUserGroups: async (forceRefresh?: boolean) => {
      if (forceRefresh || !state.groups.lastFetch) {
        await state.refreshGroups();
      }
    },
    
    loadGroupDetails: async (groupId: number, forceRefresh?: boolean) => {
      // This would need to be implemented based on your data service
      const group = state.groups.groups.find(g => g.id === groupId);
      if (!group && forceRefresh) {
        await state.refreshGroups();
        return state.groups.groups.find(g => g.id === groupId);
      }
      return group;
    },
    
    refreshGroup: async (groupId: number) => {
      await state.refreshGroups();
    },
    
    // Group operations
    createGroup: async (groupData: any) => {
      // This would need to be implemented based on your data service
      const newGroup: GroupWithDetails = {
        id: Date.now(), // Temporary ID
        ...groupData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      state.addGroup(newGroup);
      return newGroup;
    },
    
    updateGroup: async (groupId: number | string, updates: any) => {
      state.updateGroup(groupId, updates);
    },
    
    deleteGroup: async (groupId: number | string) => {
      state.deleteGroup(groupId);
    },
    
    leaveGroup: async (groupId: number | string) => {
      // Implementation would depend on your data service
      // Legacy implementation - replaced with logger
      console.warn('Legacy leaveGroup called - not implemented', { groupId });
    },
    
    selectGroup: (group: GroupWithDetails | null) => {
      state.selectGroup(group);
    },
    
    // Expense operations
    createExpense: async (expenseData: any) => {
      // Implementation would depend on your data service
      const newExpense: Expense = {
        id: Date.now(),
        ...expenseData,
        created_at: new Date().toISOString(),
      };
      return newExpense;
    },
    
    updateExpense: async (groupId: number, expense: Expense) => {
      // Implementation would depend on your data service
      console.warn('Legacy updateExpense called - not implemented', { groupId, expenseId: expense?.id });
    },
    
    deleteExpense: async (groupId: number, expenseId: number) => {
      // Implementation would depend on your data service
      console.warn('Legacy deleteExpense called - not implemented', { groupId, expenseId });
    },
    
    // User operations
    authenticateUser: (user: User, method: 'wallet' | 'email' | 'guest' | 'social') => {
      state.authenticateUser(user, method);
    },
    
    updateUser: async (updates: Partial<User>) => {
      await state.updateUser(updates);
    },
    
    logoutUser: () => {
      state.logoutUser();
    },
    
    // Utility functions
    getGroupById: (id: number | string) => {
      return state.groups.groups.find(group => group.id === id);
    },
    
    getGroupBalances: async (groupId: number | string) => {
      // Implementation would depend on your data service
      return [];
    },
    
    getTotalExpenses: (groupId: number | string) => {
      // Implementation would depend on your data service
      return 0;
    },
    
    getUserBalance: async (groupId: number | string, userId: number | string) => {
      // Implementation would depend on your data service
      return 0;
    },
    
    clearError: () => {
      state.clearAllErrors();
    },
    
    // Cache management
    shouldRefreshData: (type: 'groups' | 'expenses' | 'members', groupId?: number) => {
      const now = Date.now();
      const cacheTimeout = 5 * 60 * 1000; // 5 minutes
      
      switch (type) {
        case 'groups':
          return now - state.groups.lastFetch > cacheTimeout;
        case 'expenses':
          return groupId ? (now - (state.expenses.lastFetch[groupId] || 0)) > cacheTimeout : true;
        default:
          return true;
      }
    },
    
    invalidateCache: (pattern: string) => {
      console.warn('Legacy invalidateCache called - not implemented', { pattern });
    },
    
    invalidateGroupsCache: () => {
      state.setGroups([]);
    },
    
    isGroupsCacheValid: () => {
      const now = Date.now();
      const cacheTimeout = 5 * 60 * 1000; // 5 minutes
      return now - state.groups.lastFetch < cacheTimeout;
    },
    
    // Notifications
    notifications: state.notifications.notifications,
    loadNotifications: async (forceRefresh?: boolean) => {
      if (forceRefresh || !state.notifications.lastFetch) {
        await state.refreshNotifications();
      }
    },
    
    refreshNotifications: async () => {
      await state.refreshNotifications();
    },
    
    acceptGroupInvitation: async (notificationId: string, groupId: string) => {
      // Implementation would depend on your data service
      console.warn('Legacy acceptGroupInvitation called - not implemented', { notificationId, groupId });
    },
    
    acceptSplitInvitation: async (notificationId: string, splitId: string) => {
      // Implementation would depend on your data service
      console.warn('Legacy acceptSplitInvitation called - not implemented', { notificationId, splitId });
    },
  };
};

// ============================================================================
// LEGACY WALLET CONTEXT COMPATIBILITY
// ============================================================================

/**
 * Legacy useWallet hook that provides the same interface as the old WalletContext
 */
export const useWallet = () => {
  const state = useAppStore();
  
  return {
    // State
    isConnected: state.wallet.isConnected,
    address: state.wallet.address,
    balance: state.wallet.balance,
    walletName: state.wallet.walletName,
    chainId: state.wallet.chainId,
    isLoading: state.wallet.isLoading,
    error: state.wallet.error,
    availableWallets: state.wallet.availableWallets,
    currentWalletId: state.wallet.currentWalletId,
    
    // App wallet state
    appWalletAddress: state.wallet.appWalletAddress,
    appWalletBalance: state.wallet.appWalletBalance,
    appWalletConnected: state.wallet.appWalletConnected,
    
    // Actions
    connectWallet: (address: string, walletName: string, chainId?: string) => {
      state.connectWallet(address, walletName, chainId);
    },
    
    disconnectWallet: () => {
      state.disconnectWallet();
    },
    
    updateBalance: (balance: number) => {
      state.updateBalance(balance);
    },
    
    setAppWallet: (address: string, balance: number) => {
      state.setAppWallet(address, balance);
    },
    
    updateAppWalletBalance: (balance: number) => {
      state.updateAppWalletBalance(balance);
    },
    
    setWalletLoading: (loading: boolean) => {
      state.setWalletLoading(loading);
    },
    
    setWalletError: (error: string | null) => {
      state.setWalletError(error);
    },
    
    clearWalletError: () => {
      state.clearWalletError();
    },
    
    setAvailableWallets: (wallets: any[]) => {
      state.setAvailableWallets(wallets);
    },
    
    setCurrentWalletId: (walletId: string | null) => {
      state.setCurrentWalletId(walletId);
    },
  };
};

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

/**
 * Hook to check if a component is using the new store or old context
 */
export const useStoreVersion = () => {
  try {
    useAppStore();
    return 'zustand';
  } catch {
    return 'context';
  }
};

/**
 * Hook to gradually migrate from old context to new store
 * Returns both old and new APIs for comparison
 */
export const useMigrationHelper = () => {
  const storeVersion = useStoreVersion();
  
  return {
    storeVersion,
    isUsingNewStore: storeVersion === 'zustand',
    migrationGuide: {
      oldContext: 'useApp() from AppContext',
      newStore: 'useAppStore() or specific selectors',
      benefits: [
        'Better performance with selective subscriptions',
        'Type-safe state management',
        'Persistent state across app restarts',
        'DevTools integration',
        'Simplified testing',
      ],
    },
  };
};
