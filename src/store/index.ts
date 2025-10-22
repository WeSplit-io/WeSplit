/**
 * Main Store Configuration
 * Combines all slices into a single Zustand store
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { AppStore, AppStoreState } from './types';
import { createUserSlice } from './slices/userSlice';
import { createWalletSlice } from './slices/walletSlice';
import { createNotificationsSlice } from './slices/notificationsSlice';
import { createUISlice } from './slices/uiSlice';
import { createSplitsSlice } from './slices/splitsSlice';
import { createTransactionsSlice } from './slices/transactionsSlice';
import { createBillProcessingSlice } from './slices/billProcessingSlice';
import { createMultiSignSlice } from './slices/multiSignSlice';
import { logger } from '../services/core';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: AppStoreState = {
  user: {
    currentUser: null,
    isAuthenticated: false,
    authMethod: null,
    isLoading: false,
    error: null,
  },
  wallet: {
    isConnected: false,
    address: null,
    balance: null,
    walletName: null,
    chainId: null,
    appWalletAddress: null,
    appWalletBalance: null,
    appWalletConnected: false,
    isLoading: false,
    error: null,
    availableWallets: [],
    currentWalletId: null,
  },
  notifications: {
    notifications: [],
    isLoading: false,
    error: null,
    lastFetch: 0,
    unreadCount: 0,
  },
  ui: {
    isLoading: false,
    error: null,
    theme: 'dark',
    language: 'en',
    networkStatus: 'online',
  },
  splits: {
    splits: {},
    activeSplit: null,
    isLoading: false,
    error: null,
    lastFetch: 0,
  },
  transactions: {
    transactions: [],
    pendingTransactions: [],
    isLoading: false,
    error: null,
    lastFetch: 0,
  },
  billProcessing: {
    isProcessing: false,
    processingResult: null,
    extractedItems: [],
    totalAmount: 0,
    merchant: '',
    date: '',
    selectedCategory: 'restaurant',
    billName: '',
    isLoading: false,
    error: null,
  },
  multiSign: {
    isEnabled: false,
    remainingDays: 0,
    isActivating: false,
    isDeactivating: false,
    isLoading: false,
    error: null,
  },
};

// ============================================================================
// GLOBAL ACTIONS
// ============================================================================

const globalActions = {
  resetStore: () => {
    useAppStore.setState(initialState);
    logger.info('Store reset to initial state', null, 'Store');
  },

  clearAllErrors: () => {
    useAppStore.setState((state) => ({
      user: { ...state.user, error: null },
      wallet: { ...state.wallet, error: null },
      notifications: { ...state.notifications, error: null },
      ui: { ...state.ui, error: null },
      splits: { ...state.splits, error: null },
      transactions: { ...state.transactions, error: null },
      billProcessing: { ...state.billProcessing, error: null },
      multiSign: { ...state.multiSign, error: null },
    }));
    logger.info('All errors cleared', null, 'Store');
  },
};

// ============================================================================
// STORE CREATION
// ============================================================================

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get, api) => ({
          ...initialState,
          ...globalActions,
          ...createUserSlice(set, get, api),
          ...createWalletSlice(set, get, api),
          ...createNotificationsSlice(set, get, api),
          ...createUISlice(set, get, api),
          ...createSplitsSlice(set, get, api),
          ...createTransactionsSlice(set, get, api),
          ...createBillProcessingSlice(set, get, api),
          ...createMultiSignSlice(set, get, api),
        } as AppStore))
      ),
      {
        name: 'wesplit-store',
        // Only persist certain parts of the state
        partialize: (state) => ({
          user: {
            currentUser: state.user.currentUser,
            isAuthenticated: state.user.isAuthenticated,
            authMethod: state.user.authMethod,
          },
          wallet: {
            isConnected: state.wallet.isConnected,
            address: state.wallet.address,
            walletName: state.wallet.walletName,
            chainId: state.wallet.chainId,
            appWalletAddress: state.wallet.appWalletAddress,
            appWalletConnected: state.wallet.appWalletConnected,
            currentWalletId: state.wallet.currentWalletId,
          },
          ui: {
            theme: state.ui.theme,
            language: state.ui.language,
          },
        }),
        // Custom storage for React Native
        storage: {
          getItem: async (name: string) => {
            try {
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
              const value = await AsyncStorage.getItem(name);
              return value ? JSON.parse(value) : null;
            } catch (error) {
              logger.error('Failed to get item from storage', { name, error }, 'Store');
              return null;
            }
          },
          setItem: async (name: string, value: any) => {
            try {
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
              await AsyncStorage.setItem(name, JSON.stringify(value));
            } catch (error) {
              logger.error('Failed to set item in storage', { name, error }, 'Store');
            }
          },
          removeItem: async (name: string) => {
            try {
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
              await AsyncStorage.removeItem(name);
            } catch (error) {
              logger.error('Failed to remove item from storage', { name, error }, 'Store');
            }
          },
        },
      }
    ),
    {
      name: 'wesplit-store',
      // Only enable devtools in development
      enabled: __DEV__,
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

// User selectors
export const useCurrentUser = () => useAppStore((state) => state.user.currentUser);
export const useIsAuthenticated = () => useAppStore((state) => state.user.isAuthenticated);
export const useAuthMethod = () => useAppStore((state) => state.user.authMethod);

// Wallet selectors
export const useWalletInfo = () => useAppStore((state) => ({
  isConnected: state.wallet.isConnected,
  address: state.wallet.address,
  balance: state.wallet.balance,
  walletName: state.wallet.walletName,
}));

export const useAppWalletInfo = () => useAppStore((state) => ({
  address: state.wallet.appWalletAddress,
  balance: state.wallet.appWalletBalance,
  isConnected: state.wallet.appWalletConnected,
}));

// Notifications selectors
export const useNotifications = () => useAppStore((state) => state.notifications.notifications);
export const useUnreadNotifications = () => 
  useAppStore((state) => state.notifications.notifications.filter(n => !(n as any).read));
export const useUnreadCount = () => useAppStore((state) => state.notifications.unreadCount);

// UI selectors
export const useIsLoading = () => useAppStore((state) => 
  state.user.isLoading || 
  state.wallet.isLoading || 
  state.notifications.isLoading || 
  state.ui.isLoading ||
  state.splits.isLoading ||
  state.transactions.isLoading ||
  state.billProcessing.isLoading ||
  state.multiSign.isLoading
);

export const useError = () => useAppStore((state) => 
  state.user.error || 
  state.wallet.error || 
  state.notifications.error || 
  state.ui.error ||
  state.splits.error ||
  state.transactions.error ||
  state.billProcessing.error ||
  state.multiSign.error
);

export const useTheme = () => useAppStore((state) => state.ui.theme);
export const useLanguage = () => useAppStore((state) => state.ui.language);
export const useNetworkStatus = () => useAppStore((state) => state.ui.networkStatus);

// Splits selectors
export const useSplits = () => useAppStore((state) => state.splits.splits);
export const useActiveSplit = () => useAppStore((state) => state.splits.activeSplit);
export const useSplitById = (splitId: string) => 
  useAppStore((state) => state.splits.splits[splitId]);

// Transactions selectors
export const useTransactions = () => useAppStore((state) => state.transactions.transactions);
export const usePendingTransactions = () => useAppStore((state) => state.transactions.pendingTransactions);

// Bill Processing selectors
export const useBillProcessing = () => useAppStore((state) => state.billProcessing);
export const useIsProcessingBill = () => useAppStore((state) => state.billProcessing.isProcessing);
export const useExtractedItems = () => useAppStore((state) => state.billProcessing.extractedItems);
export const useBillTotalAmount = () => useAppStore((state) => state.billProcessing.totalAmount);

// Multi-Signature selectors
export const useMultiSign = () => useAppStore((state) => state.multiSign);
export const useIsMultiSignEnabled = () => useAppStore((state) => state.multiSign.isEnabled);
export const useMultiSignRemainingDays = () => useAppStore((state) => state.multiSign.remainingDays);

// ============================================================================
// ACTIONS
// ============================================================================

// User actions
export const useUserActions = () => useAppStore((state) => ({
  setCurrentUser: state.setCurrentUser,
  authenticateUser: state.authenticateUser,
  logoutUser: state.logoutUser,
  updateUser: state.updateUser,
  setUserLoading: state.setUserLoading,
  setUserError: state.setUserError,
  clearUserError: state.clearUserError,
}));

// Wallet actions
export const useWalletActions = () => useAppStore((state) => ({
  connectWallet: state.connectWallet,
  disconnectWallet: state.disconnectWallet,
  updateBalance: state.updateBalance,
  setAppWallet: state.setAppWallet,
  updateAppWalletBalance: state.updateAppWalletBalance,
  setWalletLoading: state.setWalletLoading,
  setWalletError: state.setWalletError,
  clearWalletError: state.clearWalletError,
  setAvailableWallets: state.setAvailableWallets,
  setCurrentWalletId: state.setCurrentWalletId,
}));

// Notifications actions
export const useNotificationsActions = () => useAppStore((state) => ({
  setNotifications: state.setNotifications,
  addNotification: state.addNotification,
  updateNotification: state.updateNotification,
  removeNotification: state.removeNotification,
  markAsRead: state.markAsRead,
  markAllAsRead: state.markAllAsRead,
  setNotificationsLoading: state.setNotificationsLoading,
  setNotificationsError: state.setNotificationsError,
  clearNotificationsError: state.clearNotificationsError,
  refreshNotifications: state.refreshNotifications,
}));

// UI actions
export const useUIActions = () => useAppStore((state) => ({
  setLoading: state.setLoading,
  setError: state.setError,
  clearError: state.clearError,
  setTheme: state.setTheme,
  setLanguage: state.setLanguage,
  setNetworkStatus: state.setNetworkStatus,
}));

// Splits actions
export const useSplitsActions = () => useAppStore((state) => ({
  setSplits: state.setSplits,
  addSplit: state.addSplit,
  updateSplit: state.updateSplit,
  deleteSplit: state.deleteSplit,
  setActiveSplit: state.setActiveSplit,
  setSplitsLoading: state.setSplitsLoading,
  setSplitsError: state.setSplitsError,
  clearSplitsError: state.clearSplitsError,
  refreshSplits: state.refreshSplits,
  createSplit: state.createSplit,
}));

// Transactions actions
export const useTransactionsActions = () => useAppStore((state) => ({
  setTransactions: state.setTransactions,
  addTransaction: state.addTransaction,
  updateTransaction: state.updateTransaction,
  removeTransaction: state.removeTransaction,
  addPendingTransaction: state.addPendingTransaction,
  removePendingTransaction: state.removePendingTransaction,
  setTransactionsLoading: state.setTransactionsLoading,
  setTransactionsError: state.setTransactionsError,
  clearTransactionsError: state.clearTransactionsError,
  refreshTransactions: state.refreshTransactions,
  sendTransaction: state.sendTransaction,
}));

// Bill Processing actions
export const useBillProcessingActions = () => useAppStore((state) => ({
  setProcessing: state.setProcessing,
  setProcessingResult: state.setProcessingResult,
  setExtractedItems: state.setExtractedItems,
  addExtractedItem: state.addExtractedItem,
  updateExtractedItem: state.updateExtractedItem,
  removeExtractedItem: state.removeExtractedItem,
  setTotalAmount: state.setTotalAmount,
  setMerchant: state.setMerchant,
  setDate: state.setDate,
  setSelectedCategory: state.setSelectedCategory,
  setBillName: state.setBillName,
  setBillProcessingLoading: state.setBillProcessingLoading,
  setBillProcessingError: state.setBillProcessingError,
  clearBillProcessingError: state.clearBillProcessingError,
  resetBillProcessing: state.resetBillProcessing,
  processBill: state.processBill,
}));

// Multi-Signature actions
export const useMultiSignActions = () => useAppStore((state) => ({
  setEnabled: state.setEnabled,
  setRemainingDays: state.setRemainingDays,
  setActivating: state.setActivating,
  setDeactivating: state.setDeactivating,
  setMultiSignLoading: state.setMultiSignLoading,
  setMultiSignError: state.setMultiSignError,
  clearMultiSignError: state.clearMultiSignError,
  loadMultiSignState: state.loadMultiSignState,
  activateMultiSign: state.activateMultiSign,
  deactivateMultiSign: state.deactivateMultiSign,
  refreshRemainingDays: state.refreshRemainingDays,
}));

// Global actions
export const useGlobalActions = () => useAppStore((state) => ({
  resetStore: state.resetStore,
  clearAllErrors: state.clearAllErrors,
}));

// ============================================================================
// STORE SUBSCRIPTIONS
// ============================================================================

// Subscribe to authentication changes
useAppStore.subscribe(
  (state) => state.user.isAuthenticated,
  (isAuthenticated, previousIsAuthenticated) => {
    if (isAuthenticated !== previousIsAuthenticated) {
      logger.info('Authentication status changed', { 
        isAuthenticated,
        previousIsAuthenticated 
      }, 'Store');
    }
  }
);

// Subscribe to network status changes
useAppStore.subscribe(
  (state) => state.ui.networkStatus,
  (networkStatus, previousNetworkStatus) => {
    if (networkStatus !== previousNetworkStatus) {
      logger.info('Network status changed', { 
        networkStatus,
        previousNetworkStatus 
      }, 'Store');
    }
  }
);

// ============================================================================
// EXPORTS
// ============================================================================

export default useAppStore;
export type { AppStore, AppStoreState } from './types';