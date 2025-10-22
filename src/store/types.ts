/**
 * Centralized State Management Types
 * Defines all state interfaces and types for the Zustand store
 */

import { User, Notification } from '../types';

// ============================================================================
// CORE STATE INTERFACES
// ============================================================================

export interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
  authMethod: 'wallet' | 'email' | 'guest' | 'social' | null;
  isLoading: boolean;
  error: string | null;
}

export interface WalletState {
  // External wallet
  isConnected: boolean;
  address: string | null;
  balance: number | null;
  walletName: string | null;
  chainId: string | null;
  
  // App wallet
  appWalletAddress: string | null;
  appWalletBalance: number | null;
  appWalletConnected: boolean;
  
  // State
  isLoading: boolean;
  error: string | null;
  availableWallets: any[];
  currentWalletId: string | null;
}

export interface NotificationsState {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number;
  unreadCount: number;
}

export interface UIState {
  isLoading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  language: string;
  networkStatus: 'online' | 'offline';
}

export interface SplitsState {
  splits: Record<string, any>;
  activeSplit: any | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: number;
}

export interface TransactionsState {
  transactions: any[];
  pendingTransactions: any[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number;
}

export interface BillProcessingState {
  isProcessing: boolean;
  processingResult: any | null;
  extractedItems: any[];
  totalAmount: number;
  merchant: string;
  date: string;
  selectedCategory: string;
  billName: string;
  isLoading: boolean;
  error: string | null;
}

export interface MultiSignState {
  isEnabled: boolean;
  remainingDays: number;
  isActivating: boolean;
  isDeactivating: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// COMBINED STATE INTERFACE
// ============================================================================

export interface AppStoreState {
  user: UserState;
  wallet: WalletState;
  notifications: NotificationsState;
  ui: UIState;
  splits: SplitsState;
  transactions: TransactionsState;
  billProcessing: BillProcessingState;
  multiSign: MultiSignState;
}

// ============================================================================
// ACTION INTERFACES
// ============================================================================

export interface UserActions {
  setCurrentUser: (user: User | null) => void;
  authenticateUser: (user: User, method: 'wallet' | 'email' | 'guest' | 'social') => void;
  logoutUser: () => void;
  updateUser: (updates: Partial<User>) => void;
  setUserLoading: (loading: boolean) => void;
  setUserError: (error: string | null) => void;
  clearUserError: () => void;
}

export interface WalletActions {
  connectWallet: (wallet: any) => void;
  disconnectWallet: () => void;
  updateBalance: (balance: number) => void;
  setAppWallet: (address: string, balance: number) => void;
  updateAppWalletBalance: (balance: number) => void;
  setWalletLoading: (loading: boolean) => void;
  setWalletError: (error: string | null) => void;
  clearWalletError: () => void;
  setAvailableWallets: (wallets: any[]) => void;
  setCurrentWalletId: (walletId: string | null) => void;
}

export interface NotificationsActions {
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setNotificationsLoading: (loading: boolean) => void;
  setNotificationsError: (error: string | null) => void;
  clearNotificationsError: () => void;
  refreshNotifications: () => Promise<void>;
}

export interface UIActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: string) => void;
  setNetworkStatus: (status: 'online' | 'offline') => void;
}

export interface SplitsActions {
  setSplits: (splits: Record<string, any>) => void;
  addSplit: (split: any) => void;
  updateSplit: (splitId: string, updates: Partial<any>) => void;
  deleteSplit: (splitId: string) => void;
  setActiveSplit: (split: any | null) => void;
  setSplitsLoading: (loading: boolean) => void;
  setSplitsError: (error: string | null) => void;
  clearSplitsError: () => void;
  refreshSplits: () => Promise<void>;
  createSplit: (splitData: any) => Promise<void>;
}

export interface TransactionsActions {
  setTransactions: (transactions: any[]) => void;
  addTransaction: (transaction: any) => void;
  updateTransaction: (id: string, updates: Partial<any>) => void;
  removeTransaction: (id: string) => void;
  addPendingTransaction: (transaction: any) => void;
  removePendingTransaction: (id: string) => void;
  setTransactionsLoading: (loading: boolean) => void;
  setTransactionsError: (error: string | null) => void;
  clearTransactionsError: () => void;
  refreshTransactions: () => Promise<void>;
  sendTransaction: (transactionData: any) => Promise<void>;
}

export interface BillProcessingActions {
  setProcessing: (processing: boolean) => void;
  setProcessingResult: (result: any | null) => void;
  setExtractedItems: (items: any[]) => void;
  addExtractedItem: (item: any) => void;
  updateExtractedItem: (index: number, updates: Partial<any>) => void;
  removeExtractedItem: (index: number) => void;
  setTotalAmount: (amount: number) => void;
  setMerchant: (merchant: string) => void;
  setDate: (date: string) => void;
  setSelectedCategory: (category: string) => void;
  setBillName: (name: string) => void;
  setBillProcessingLoading: (loading: boolean) => void;
  setBillProcessingError: (error: string | null) => void;
  clearBillProcessingError: () => void;
  resetBillProcessing: () => void;
  processBill: (billData: any) => Promise<void>;
}

export interface MultiSignActions {
  setEnabled: (enabled: boolean) => void;
  setRemainingDays: (days: number) => void;
  setActivating: (activating: boolean) => void;
  setDeactivating: (deactivating: boolean) => void;
  setMultiSignLoading: (loading: boolean) => void;
  setMultiSignError: (error: string | null) => void;
  clearMultiSignError: () => void;
  loadMultiSignState: () => Promise<void>;
  activateMultiSign: () => Promise<void>;
  deactivateMultiSign: () => Promise<void>;
  refreshRemainingDays: () => Promise<void>;
}

export interface GlobalActions {
  resetStore: () => void;
  clearAllErrors: () => void;
}

// ============================================================================
// COMBINED STORE INTERFACE
// ============================================================================

export interface AppStore extends 
  AppStoreState,
  UserActions,
  WalletActions,
  NotificationsActions,
  UIActions,
  SplitsActions,
  TransactionsActions,
  BillProcessingActions,
  MultiSignActions,
  GlobalActions {}

// ============================================================================
// SLICE CREATOR TYPES
// ============================================================================

export type SliceCreator<T> = (
  set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
  get: () => T,
  api: any
) => T;