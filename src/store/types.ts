/**
 * Centralized State Management Types
 * Defines all state interfaces and types for the Zustand store
 */

import { User, GroupWithDetails, Expense, Balance, Notification } from '../types';

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

export interface GroupsState {
  groups: GroupWithDetails[];
  selectedGroup: GroupWithDetails | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: number;
}

export interface ExpensesState {
  expenses: Record<string, Expense[]>; // groupId -> expenses[]
  isLoading: boolean;
  error: string | null;
  lastFetch: Record<string, number>; // groupId -> timestamp
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
  splits: Record<string, any>; // SplitWallet[]
  activeSplit: any | null; // SplitWallet | null
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
// MAIN STORE STATE
// ============================================================================

export interface AppStoreState {
  user: UserState;
  groups: GroupsState;
  expenses: ExpensesState;
  wallet: WalletState;
  notifications: NotificationsState;
  ui: UIState;
  splits: SplitsState;
  transactions: TransactionsState;
  billProcessing: BillProcessingState;
  multiSign: MultiSignState;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export interface UserActions {
  setCurrentUser: (user: User | null) => void;
  authenticateUser: (user: User, method: 'wallet' | 'email' | 'guest' | 'social') => void;
  logoutUser: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setUserLoading: (loading: boolean) => void;
  setUserError: (error: string | null) => void;
  clearUserError: () => void;
}

export interface GroupsActions {
  setGroups: (groups: GroupWithDetails[]) => void;
  addGroup: (group: GroupWithDetails) => void;
  updateGroup: (groupId: string | number, updates: Partial<GroupWithDetails>) => void;
  deleteGroup: (groupId: string | number) => void;
  selectGroup: (group: GroupWithDetails | null) => void;
  setGroupsLoading: (loading: boolean) => void;
  setGroupsError: (error: string | null) => void;
  clearGroupsError: () => void;
  refreshGroups: () => Promise<void>;
}

export interface ExpensesActions {
  setExpenses: (groupId: string | number, expenses: Expense[]) => void;
  addExpense: (groupId: string | number, expense: Expense) => void;
  updateExpense: (groupId: string | number, expenseId: string | number, updates: Partial<Expense>) => void;
  deleteExpense: (groupId: string | number, expenseId: string | number) => void;
  setExpensesLoading: (loading: boolean) => void;
  setExpensesError: (error: string | null) => void;
  clearExpensesError: () => void;
  refreshExpenses: (groupId: string | number) => Promise<void>;
}

export interface WalletActions {
  // External wallet
  connectWallet: (address: string, walletName: string, chainId?: string) => void;
  disconnectWallet: () => void;
  updateBalance: (balance: number) => void;
  
  // App wallet
  setAppWallet: (address: string, balance: number) => void;
  updateAppWalletBalance: (balance: number) => void;
  
  // State management
  setWalletLoading: (loading: boolean) => void;
  setWalletError: (error: string | null) => void;
  clearWalletError: () => void;
  setAvailableWallets: (wallets: any[]) => void;
  setCurrentWalletId: (walletId: string | null) => void;
}

export interface NotificationsActions {
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  updateNotification: (notificationId: string, updates: Partial<Notification>) => void;
  removeNotification: (notificationId: string) => void;
  markAsRead: (notificationId: string) => void;
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
  addSplit: (splitId: string, split: any) => void;
  updateSplit: (splitId: string, updates: any) => void;
  deleteSplit: (splitId: string) => void;
  setActiveSplit: (split: any | null) => void;
  setSplitsLoading: (loading: boolean) => void;
  setSplitsError: (error: string | null) => void;
  clearSplitsError: () => void;
  refreshSplits: () => Promise<void>;
  createSplit: (splitData: any) => Promise<any | null>;
}

export interface TransactionsActions {
  setTransactions: (transactions: any[]) => void;
  addTransaction: (transaction: any) => void;
  updateTransaction: (transactionId: string, updates: any) => void;
  removeTransaction: (transactionId: string) => void;
  addPendingTransaction: (transaction: any) => void;
  removePendingTransaction: (transactionId: string) => void;
  setTransactionsLoading: (loading: boolean) => void;
  setTransactionsError: (error: string | null) => void;
  clearTransactionsError: () => void;
  refreshTransactions: () => Promise<void>;
  sendTransaction: (transactionData: any) => Promise<any>;
}

export interface BillProcessingActions {
  setProcessing: (processing: boolean) => void;
  setProcessingResult: (result: any) => void;
  setExtractedItems: (items: any[]) => void;
  addExtractedItem: (item: any) => void;
  updateExtractedItem: (itemId: string, updates: any) => void;
  removeExtractedItem: (itemId: string) => void;
  setTotalAmount: (amount: number) => void;
  setMerchant: (merchant: string) => void;
  setDate: (date: string) => void;
  setSelectedCategory: (category: string) => void;
  setBillName: (name: string) => void;
  setBillProcessingLoading: (loading: boolean) => void;
  setBillProcessingError: (error: string | null) => void;
  clearBillProcessingError: () => void;
  resetBillProcessing: () => void;
  processBill: (imageUri: string, processingMethod?: 'ai' | 'mock') => Promise<any>;
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

// ============================================================================
// COMBINED ACTIONS
// ============================================================================

export interface AppStoreActions extends 
  UserActions, 
  GroupsActions, 
  ExpensesActions, 
  WalletActions, 
  NotificationsActions, 
  UIActions,
  SplitsActions,
  TransactionsActions,
  BillProcessingActions,
  MultiSignActions {
  // Global actions
  resetStore: () => void;
  clearAllErrors: () => void;
}

// ============================================================================
// STORE TYPE
// ============================================================================

export type AppStore = AppStoreState & AppStoreActions;

// ============================================================================
// SELECTOR TYPES
// ============================================================================

export interface AppSelectors {
  // User selectors
  getCurrentUser: () => User | null;
  isUserAuthenticated: () => boolean;
  getUserAuthMethod: () => string | null;
  
  // Groups selectors
  getAllGroups: () => GroupWithDetails[];
  getSelectedGroup: () => GroupWithDetails | null;
  getGroupById: (id: string | number) => GroupWithDetails | undefined;
  
  // Expenses selectors
  getExpensesByGroup: (groupId: string | number) => Expense[];
  getTotalExpenses: (groupId: string | number) => number;
  
  // Wallet selectors
  getWalletInfo: () => { address: string | null; balance: number | null; isConnected: boolean };
  getAppWalletInfo: () => { address: string | null; balance: number | null; isConnected: boolean };
  
  // Notifications selectors
  getAllNotifications: () => Notification[];
  getUnreadNotifications: () => Notification[];
  getUnreadCount: () => number;
  
  // UI selectors
  getLoadingState: () => boolean;
  getErrorState: () => string | null;
  getTheme: () => 'light' | 'dark';
  getLanguage: () => string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type StoreSlice<T> = (
  set: (partial: Partial<AppStoreState> | ((state: AppStoreState) => Partial<AppStoreState>)) => void,
  get: () => AppStoreState
) => T;

export interface AsyncAction<T = any> {
  (): Promise<T>;
}

export interface AsyncActionWithParams<T = any, P = any> {
  (params: P): Promise<T>;
}
