import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect, useRef } from 'react';
import { 
  User, 
  GroupWithDetails, 
  Expense, 
  Balance, 
  AppState, 
  AppAction,
  NavigationParams,
  Notification
} from '../types';
import { firebaseDataService } from '../services/firebaseDataService';
import { hybridDataService } from '../services/hybridDataService';
import { i18nService } from '../services/i18nService';
import { notificationService } from '../services/notificationService';
import { MultiSignStateService } from '../services/multiSignStateService';
import { calculateGroupBalances, CalculatedBalance } from '../utils/balanceCalculator';
import { logger } from '../services/loggingService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

// Initial State - now clean without mock data
const initialState: AppState = {
  // User state
  currentUser: null,
  isAuthenticated: false,
  authMethod: null,
  
  // Data state
  groups: [],
  selectedGroup: null,
  
  // UI state
  isLoading: false,
  error: null,
  
  // Cache timestamps
  lastDataFetch: {
    groups: 0,
    expenses: {},
    members: {}
  },
  notifications: [],
  lastNotificationsFetch: 0,
};

// Reducer with improved state management
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
      // Clear any cached data
      return {
        ...initialState
      };
    
    case 'SET_GROUPS':
      return { 
        ...state, 
        groups: action.payload,
        lastDataFetch: {
          ...state.lastDataFetch,
          groups: Date.now()
        }
      };
    
    case 'ADD_GROUP':
      return { 
        ...state, 
        groups: [...state.groups, action.payload],
        lastDataFetch: {
          ...state.lastDataFetch,
          groups: Date.now()
        }
      };
    
    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.id ? action.payload : group
        ),
        selectedGroup: state.selectedGroup?.id === action.payload.id ? action.payload : state.selectedGroup,
        lastDataFetch: {
          ...state.lastDataFetch,
          groups: Date.now()
        }
      };
    
    case 'DELETE_GROUP':
      return {
        ...state,
        groups: state.groups.filter(group => group.id !== action.payload),
        selectedGroup: state.selectedGroup?.id === action.payload ? null : state.selectedGroup,
        lastDataFetch: {
          ...state.lastDataFetch,
          groups: Date.now()
        }
      };
    
    case 'SELECT_GROUP':
      return { ...state, selectedGroup: action.payload };
    
    case 'ADD_EXPENSE':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.groupId
            ? { 
                ...group, 
                expenses: [...group.expenses, action.payload.expense],
                totalAmount: group.totalAmount + action.payload.expense.amount,
                expense_count: group.expense_count + 1,
                // Update expenses_by_currency properly
                expenses_by_currency: (() => {
                  const existingCurrency = group.expenses_by_currency?.find(currency => 
                    currency.currency === action.payload.expense.currency
                  );
                  
                  if (existingCurrency) {
                    // Update existing currency entry
                    return group.expenses_by_currency.map(currency => 
                      currency.currency === action.payload.expense.currency
                        ? { ...currency, total_amount: currency.total_amount + action.payload.expense.amount }
                        : currency
                    );
                  } else {
                    // Add new currency entry
                    const newCurrencyEntry = { 
                      currency: action.payload.expense.currency, 
                      total_amount: action.payload.expense.amount 
                    };
                    return [...(group.expenses_by_currency || []), newCurrencyEntry];
                  }
                })()
              }
            : group
        ),
        selectedGroup: state.selectedGroup?.id === action.payload.groupId 
          ? {
              ...state.selectedGroup,
              expenses: [...state.selectedGroup.expenses, action.payload.expense],
              totalAmount: state.selectedGroup.totalAmount + action.payload.expense.amount,
              expense_count: state.selectedGroup.expense_count + 1,
              // Update expenses_by_currency for selected group too
              expenses_by_currency: (() => {
                const existingCurrency = state.selectedGroup.expenses_by_currency?.find(currency => 
                  currency.currency === action.payload.expense.currency
                );
                
                if (existingCurrency) {
                  // Update existing currency entry
                  return state.selectedGroup.expenses_by_currency.map(currency => 
                    currency.currency === action.payload.expense.currency
                      ? { ...currency, total_amount: currency.total_amount + action.payload.expense.amount }
                      : currency
                  );
                } else {
                  // Add new currency entry
                  const newCurrencyEntry = { 
                    currency: action.payload.expense.currency, 
                    total_amount: action.payload.expense.amount 
                  };
                  return [...(state.selectedGroup.expenses_by_currency || []), newCurrencyEntry];
                }
              })()
            }
          : state.selectedGroup,
        lastDataFetch: {
          ...state.lastDataFetch,
          expenses: {
            ...state.lastDataFetch.expenses,
            [action.payload.groupId]: Date.now()
          }
        }
      };
    
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.groupId
            ? {
                ...group,
                expenses: group.expenses.map(expense =>
                  expense.id === action.payload.expense.id ? action.payload.expense : expense
                ),
              }
            : group
        ),
        selectedGroup: state.selectedGroup?.id === action.payload.groupId
          ? {
              ...state.selectedGroup,
              expenses: state.selectedGroup.expenses.map(expense =>
                expense.id === action.payload.expense.id ? action.payload.expense : expense
              ),
            }
          : state.selectedGroup,
        lastDataFetch: {
          ...state.lastDataFetch,
          expenses: {
            ...state.lastDataFetch.expenses,
            [action.payload.groupId]: Date.now()
          }
        }
      };
    
    case 'DELETE_EXPENSE':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.groupId
            ? {
                ...group,
                expenses: group.expenses.filter(expense => expense.id !== action.payload.expenseId),
                expense_count: Math.max(0, group.expense_count - 1)
              }
            : group
        ),
        selectedGroup: state.selectedGroup?.id === action.payload.groupId
          ? {
              ...state.selectedGroup,
              expenses: state.selectedGroup.expenses.filter(expense => expense.id !== action.payload.expenseId),
              expense_count: Math.max(0, state.selectedGroup.expense_count - 1)
            }
          : state.selectedGroup,
        lastDataFetch: {
          ...state.lastDataFetch,
          expenses: {
            ...state.lastDataFetch.expenses,
            [action.payload.groupId]: Date.now()
          }
        }
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'UPDATE_CACHE_TIMESTAMP':
      const { type, groupId, timestamp } = action.payload;
      if (type === 'groups') {
        return {
          ...state,
          lastDataFetch: {
            ...state.lastDataFetch,
            groups: timestamp
          }
        };
      } else if (type === 'expenses' && groupId) {
        return {
          ...state,
          lastDataFetch: {
            ...state.lastDataFetch,
            expenses: {
              ...state.lastDataFetch.expenses,
              [groupId]: timestamp
            }
          }
        };
      } else if (type === 'members' && groupId) {
        return {
          ...state,
          lastDataFetch: {
            ...state.lastDataFetch,
            members: {
              ...state.lastDataFetch.members,
              [groupId]: timestamp
            }
          }
        };
      }
      return state;
    
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

// Enhanced Context Type with data operations
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Data operations
  loadUserGroups: (forceRefresh?: boolean) => Promise<void>;
  loadGroupDetails: (groupId: number, forceRefresh?: boolean) => Promise<GroupWithDetails>;
  refreshGroup: (groupId: number) => Promise<void>;
  
  // Group operations
  createGroup: (groupData: any) => Promise<GroupWithDetails>;
  updateGroup: (groupId: number | string, updates: any) => Promise<void>;
  deleteGroup: (groupId: number | string) => Promise<void>;
  leaveGroup: (groupId: number | string) => Promise<void>;
  selectGroup: (group: GroupWithDetails | null) => void;
  
  // Expense operations
  createExpense: (expenseData: any) => Promise<Expense>;
  updateExpense: (groupId: number, expense: Expense) => Promise<void>;
  deleteExpense: (groupId: number, expenseId: number) => Promise<void>;
  
  // User operations
  authenticateUser: (user: User, method: 'wallet' | 'email' | 'guest' | 'social') => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  logoutUser: () => void;
  
  // Utility functions
  getGroupById: (id: number | string) => GroupWithDetails | undefined;
  getGroupBalances: (groupId: number | string) => Promise<Balance[]>;
  getTotalExpenses: (groupId: number | string) => number;
  getUserBalance: (groupId: number | string, userId: number | string) => Promise<number>;
  clearError: () => void;
  
  // Cache management
  shouldRefreshData: (type: 'groups' | 'expenses' | 'members', groupId?: number) => boolean;
  invalidateCache: (pattern: string) => void;
  invalidateGroupsCache: () => void;
  isGroupsCacheValid: () => boolean;

  // Notifications
  notifications: Notification[];
  loadNotifications: (forceRefresh?: boolean) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  
  // Group invitation handling
  acceptGroupInvitation: (notificationId: string, groupId: string) => Promise<void>;
  
  // Split invitation handling
  acceptSplitInvitation: (notificationId: string, splitId: string) => Promise<any>;
  
  removeNotification: (notificationId: string) => Promise<void>;
  
  // Real-time listener management
  startGroupListener: (groupId: string) => void;
  stopGroupListener: (groupId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Unified balance calculation using the new utility
const calculateGroupBalancesUnified = async (group: GroupWithDetails, currentUserId?: number | string): Promise<Balance[]> => {
  try {
    const calculatedBalances = await calculateGroupBalances(group, {
      normalizeToUSDC: false, // Keep original currency for display
      includeZeroBalances: true,
      currentUserId: currentUserId ? String(currentUserId) : undefined
    });
    
    // Convert CalculatedBalance to Balance for backward compatibility
    return calculatedBalances.map(balance => ({
      userId: balance.userId,
      userName: balance.userName,
      userAvatar: balance.userAvatar,
      amount: balance.amount,
      currency: balance.currency,
      status: balance.status
    }));
  } catch (error) {
    console.error('Error calculating group balances:', error);
    return [];
      }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Refs for managing real-time listeners
  const userGroupsListenerRef = useRef<(() => void) | null>(null);
  const groupListenersRef = useRef<Map<string, () => void>>(new Map());

  // Initialize tracking services safely to prevent stopTracking errors
  const initializeTrackingSafely = useCallback(() => {
    try {
      const globalAny = global as any;
      
      // Simple analytics initialization - no complex overrides
      if (!globalAny.analytics) {
        globalAny.analytics = {
          stopTracking: () => {
            logger.debug('Analytics tracking stopped (safe mode)', null, 'AppContext');
          },
          startTracking: () => {
            logger.debug('Analytics tracking started (safe mode)', null, 'AppContext');
          },
          trackEvent: (event: string, data?: any) => {
            logger.debug('Analytics event tracked (safe mode)', { event, data }, 'AppContext');
          }
        };
      }
      
      // Ensure stopTracking method exists
      if (!globalAny.analytics.stopTracking) {
        globalAny.analytics.stopTracking = () => {
          logger.debug('Analytics tracking stopped (fallback)', null, 'AppContext');
        };
      }

      // Handle Firebase Analytics
      if (globalAny.firebase && globalAny.firebase.analytics) {
        try {
          if (!globalAny.firebase.analytics.stopTracking) {
            globalAny.firebase.analytics.stopTracking = () => {
              logger.debug('Firebase Analytics tracking stopped (safe mode)', null, 'AppContext');
            };
          }
        } catch (firebaseError) {
          console.warn('Firebase Analytics initialization error:', firebaseError);
        }
      }

    } catch (error) {
      console.warn('Failed to initialize tracking services safely:', error);
    }
  }, []);

  // Initialize app services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize tracking services safely first
        initializeTrackingSafely();
        
        // Initialize i18n service
        await i18nService.initialize();
        logger.debug('i18n service initialized', null, 'AppContext');
        
        // Initialize multi-sign state service
        await MultiSignStateService.initialize();
        logger.debug('multi-sign state service initialized', null, 'AppContext');
        
        // Fix any users with invalid lastVerifiedAt dates
        const { firestoreService } = await import('../config/firebase');
        const fixedCount = await firestoreService.fixInvalidLastVerifiedAt();
        if (fixedCount > 0) {
          logger.debug('Fixed users with invalid lastVerifiedAt dates during app initialization', { fixedCount }, 'AppContext');
        }
        
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };

    initializeServices();
  }, [initializeTrackingSafely]);

  // Add global error handler for stopTracking errors
  useEffect(() => {
    const globalAny = global as any;
    const originalErrorHandler = globalAny.ErrorUtils?.setGlobalHandler;
    if (originalErrorHandler) {
      const customErrorHandler = (error: Error, isFatal?: boolean) => {
        // Check if this is a stopTracking error
        if (error.message && error.message.includes('stopTracking')) {
          console.warn('AppContext: Caught stopTracking error (handled gracefully):', error.message);
          // Don't re-throw the error, just log it
          return;
        }
        
        // For other errors, use the original handler
        if (originalErrorHandler) {
          originalErrorHandler(error, isFatal);
        }
      };
      
      globalAny.ErrorUtils?.setGlobalHandler(customErrorHandler);
      
      // Cleanup on unmount
      return () => {
        if (originalErrorHandler) {
          globalAny.ErrorUtils?.setGlobalHandler(originalErrorHandler);
        }
      };
    }
  }, []);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      // Cleanup user groups listener
      if (userGroupsListenerRef.current) {
        userGroupsListenerRef.current();
        userGroupsListenerRef.current = null;
        }
      
      // Cleanup individual group listeners
      groupListenersRef.current.forEach(unsubscribe => unsubscribe());
      groupListenersRef.current.clear();
    };
  }, []);

  // Start real-time listener when user is authenticated
  useEffect(() => {
    if (!state.currentUser?.id) {
      if (userGroupsListenerRef.current) {
        userGroupsListenerRef.current();
        userGroupsListenerRef.current = null;
      }
      return;
        }
    const unsubscribe = firebaseDataService.group.listenToUserGroups(
      state.currentUser.id.toString(),
      (groups: GroupWithDetails[]) => {
        dispatch({ type: 'SET_GROUPS', payload: groups });
      },
      (error: any) => {
        if (__DEV__) { console.error('❌ AppContext: Real-time listener error:', error); }
        // Don't dispatch error to avoid UI crashes
      }
    );
    userGroupsListenerRef.current = unsubscribe;
    return () => {
      if (userGroupsListenerRef.current) {
        userGroupsListenerRef.current();
        userGroupsListenerRef.current = null;
      }
    };
  }, [state.currentUser?.id]);

  // Listen for group membership changes
  useEffect(() => {
    if (!state.currentUser?.id) return;

    const groupMembersRef = collection(db, 'groupMembers');
    const membershipQuery = query(
      groupMembersRef,
      where('user_id', '==', state.currentUser?.id?.toString() || '')
    );

    const unsubscribe = onSnapshot(membershipQuery, (snapshot) => {
      const changes = snapshot.docChanges();
      let hasChanges = false;

      changes.forEach((change) => {
        if (change.type === 'added' || change.type === 'removed') {
          hasChanges = true;
                  // Removed excessive logging for cleaner console
  }
      });

      if (hasChanges && state.currentUser?.id) {
        // Removed excessive logging for cleaner console
        // Force refresh user groups to reflect membership changes
        if (userGroupsListenerRef.current) {
          userGroupsListenerRef.current();
          userGroupsListenerRef.current = null;
        }
        
        // Restart the user groups listener
        try {
          const newUnsubscribe = firebaseDataService.group.listenToUserGroups(
            state.currentUser.id.toString(),
            (groups: GroupWithDetails[]) => {
              dispatch({ type: 'SET_GROUPS', payload: groups });
            },
            (error: any) => {
              if (__DEV__) { console.error('❌ AppContext: Real-time listener error:', error); }
              // Don't dispatch error to avoid UI crashes
            }
          );
          userGroupsListenerRef.current = newUnsubscribe;
      } catch (error) {
          if (__DEV__) { console.error('❌ AppContext: Error setting up real-time listener:', error); }
        }
      }
    }, (error) => {
      console.error('❌ AppContext: Error listening to group membership changes:', error);
    });

    return () => {
      unsubscribe();
    };
  }, [state.currentUser?.id]);

  // Cache management
  const shouldRefreshData = useCallback((type: 'groups' | 'expenses' | 'members', groupId?: number): boolean => {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (type === 'groups') {
      return now - state.lastDataFetch.groups > maxAge;
    } else if (type === 'expenses' && groupId) {
      const lastFetch = state.lastDataFetch.expenses[groupId] || 0;
      return now - lastFetch > maxAge;
    } else if (type === 'members' && groupId) {
      const lastFetch = state.lastDataFetch.members[groupId] || 0;
      return now - lastFetch > maxAge;
    }
    
    return true;
  }, [state.lastDataFetch]);

  // Data operations - Updated to use real-time listeners
  const loadUserGroups = useCallback(async (forceRefresh: boolean = false) => {
    if (!state.currentUser?.id) {
      if (__DEV__) { logger.debug('No current user, skipping group load', null, 'AppContext'); }
      return;
    }
    
    // Removed excessive logging for cleaner console
    
    try {
      // Actually load groups from Firebase if real-time listeners aren't working
      const userGroups = await firebaseDataService.group.getUserGroups(state.currentUser.id.toString(), forceRefresh);
      
      // Removed excessive logging for cleaner console
      
      // Update state with loaded groups
      dispatch({ type: 'SET_GROUPS', payload: userGroups });
      
      // Also ensure real-time listeners are started
      if (userGroupsListenerRef.current) {
        // Real-time listener is already active
        // Removed excessive logging for cleaner console
      } else {
        // Start real-time listener
        // Removed excessive logging for cleaner console
        try {
          firebaseDataService.group.listenToUserGroups(state.currentUser.id.toString(), (updatedGroups: GroupWithDetails[]) => {
            // Removed excessive logging for cleaner console
            dispatch({ type: 'SET_GROUPS', payload: updatedGroups });
          }, (error: any) => {
            if (__DEV__) { console.error('❌ AppContext: Real-time listener error:', error); }
          });
        } catch (error) {
          if (__DEV__) { console.error('❌ AppContext: Error setting up real-time listener:', error); }
        }
      }
    } catch (error) {
      console.error('❌ AppContext: Error loading user groups:', error);
      throw error;
    }
  }, [state.currentUser?.id]);

  const loadGroupDetails = useCallback(async (groupId: number, forceRefresh: boolean = false): Promise<GroupWithDetails> => {
    try {
      // Try to find the group in the current state first
      const existingGroup = state.groups.find(g => g.id === groupId || g.id === groupId.toString());
      if (existingGroup && !forceRefresh) {
        if (__DEV__) { logger.debug('Using cached group details for', { groupId }, 'AppContext'); }
        return existingGroup;
      }
      
      const group = await firebaseDataService.group.getGroupDetails(groupId.toString(), forceRefresh);
      
      // Update the group in state if it exists
      if (existingGroup) {
        dispatch({ type: 'UPDATE_GROUP', payload: group });
      }
      
      return group;
    } catch (error) {
      console.error('Error loading group details:', error);
      throw error;
    }
  }, [state.groups]); // Add state.groups back for caching

  const refreshGroup = useCallback(async (groupId: number) => {
    try {
      const group = await loadGroupDetails(groupId, true);
      if (state.selectedGroup?.id === groupId) {
        dispatch({ type: 'SELECT_GROUP', payload: group });
      }
    } catch (error) {
      console.error('Error refreshing group:', error);
    }
  }, []); // Remove dependencies to prevent infinite loops

  // Group operations
  const createGroup = useCallback(async (groupData: any): Promise<GroupWithDetails> => {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

    // Validate required fields
    if (!groupData.name || groupData.name.trim().length === 0) {
      throw new Error('Group name is required');
    }

    if (!groupData.created_by) {
      throw new Error('Group creator ID is required');
    }

    try {
      logger.debug('Creating group with data', {
        name: groupData.name,
        created_by: groupData.created_by,
        category: groupData.category,
        currency: groupData.currency
      });

      // Ensure proper data structure
      const validatedGroupData = {
        name: groupData.name.trim(),
        description: groupData.description?.trim() || '',
        category: groupData.category || 'general',
        currency: groupData.currency || 'USDC',
        icon: groupData.icon || 'people',
        color: groupData.color || '#A5EA15',
        created_by: groupData.created_by.toString()
      };

      const group = await firebaseDataService.group.createGroup(validatedGroupData);
      
      logger.debug('Group created successfully', { groupId: group.id }, 'AppContext');
      
      // Real-time listener will automatically update the groups state
      // But we can also manually add the group to state for immediate feedback
      const groupWithDetails: GroupWithDetails = {
        ...group,
        members: [{
          id: state.currentUser.id,
          name: state.currentUser.name,
          email: state.currentUser.email,
          wallet_address: state.currentUser.wallet_address,
          wallet_public_key: state.currentUser.wallet_public_key,
          created_at: state.currentUser.created_at,
          joined_at: new Date().toISOString(),
          avatar: state.currentUser.avatar,
          invitation_status: 'accepted' as const,
          invited_at: new Date().toISOString(),
          invited_by: state.currentUser.id.toString()
        }],
        expenses: [],
        totalAmount: 0,
        userBalance: 0
      };
      
      // Add to state immediately for better UX
      dispatch({ type: 'ADD_GROUP', payload: groupWithDetails });
      
      return groupWithDetails;
      
    } catch (error) {
      console.error('🔄 AppContext: Error creating group:', error);
      
      // Re-throw with user-friendly error message
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to create group. Please try again.');
      }
    }
  }, [state.currentUser]);

  const updateGroup = useCallback(async (groupId: number | string, updates: any): Promise<void> => {
    try {
      await firebaseDataService.group.updateGroup(String(groupId), state.currentUser?.id?.toString() || '', updates);
      
      // Real-time listener will automatically update the groups state
      logger.debug('Group updated, real-time listener will update state', null, 'AppContext');
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }, [state.currentUser]);

  const deleteGroup = useCallback(async (groupId: number | string): Promise<void> => {
    try {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

      await firebaseDataService.group.deleteGroup(String(groupId), String(state.currentUser.id));
      
      // Remove the group from local state immediately
      const updatedGroups = state.groups.filter(group => group.id !== groupId);
      dispatch({ type: 'SET_GROUPS', payload: updatedGroups });
      
      // Stop the group listener since group is deleted
      const unsubscribe = groupListenersRef.current.get(String(groupId));
      if (unsubscribe) {
        unsubscribe();
        groupListenersRef.current.delete(String(groupId));
      }
      
      logger.debug('Group deleted, removed from local state and stopped listener', null, 'AppContext');
      
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }, [state.currentUser, state.groups]);

  const leaveGroup = useCallback(async (groupId: number | string): Promise<void> => {
    try {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

      await firebaseDataService.group.leaveGroup(String(groupId), String(state.currentUser.id));
      
      // Remove the group from local state immediately
      const updatedGroups = state.groups.filter(group => group.id !== groupId);
      dispatch({ type: 'SET_GROUPS', payload: updatedGroups });
      
      // Stop the group listener since user is no longer a member
      const unsubscribe = groupListenersRef.current.get(String(groupId));
      if (unsubscribe) {
        unsubscribe();
        groupListenersRef.current.delete(String(groupId));
      }
      
      logger.debug('User left group, removed from local state and stopped listener', null, 'AppContext');
      
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }, [state.currentUser, state.groups]);

  const selectGroup = useCallback((group: GroupWithDetails | null) => {
    dispatch({ type: 'SELECT_GROUP', payload: group });
  }, []);

  // Expense operations
  const createExpense = useCallback(async (expenseData: any): Promise<Expense> => {
    try {
      if (!state.currentUser?.id) {
        throw new Error('User not authenticated');
      }

      const expense = await firebaseDataService.expense.createExpense(expenseData);
      
      // Real-time listener will automatically update the groups state
      logger.debug('Expense created, real-time listener will update state', null, 'AppContext');
      
      return expense;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }, [state.currentUser]);

  const updateExpense = useCallback(async (groupId: number, expense: Expense) => {
    try {
      const updatedExpense = await firebaseDataService.expense.updateExpense(expense.id.toString(), expense);
      dispatch({ type: 'UPDATE_EXPENSE', payload: { groupId, expense: updatedExpense } });
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }, []);

  const deleteExpense = useCallback(async (groupId: number, expenseId: number) => {
    try {
      await firebaseDataService.expense.deleteExpense(expenseId.toString(), groupId.toString());
      dispatch({ type: 'DELETE_EXPENSE', payload: { groupId, expenseId } });
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }, []);

  // Real-time listener management
  const stopGroupListener = useCallback((groupId: string) => {
    try {
      // Ensure tracking services are safely initialized before stopping listeners
      initializeTrackingSafely();
      
      const unsubscribe = groupListenersRef.current.get(groupId);
      if (unsubscribe) {
        logger.debug('Stopping listener for group', { groupId }, 'AppContext');
        unsubscribe();
        groupListenersRef.current.delete(groupId);
      }
    } catch (error) {
      console.error('Error stopping group listener:', error);
      // Even if there's an error, try to clean up the listener reference
      groupListenersRef.current.delete(groupId);
    }
  }, [initializeTrackingSafely]);

  const startGroupListener = useCallback((groupId: string) => {
    try {
      // Ensure tracking services are safely initialized before starting listeners
      initializeTrackingSafely();
      
      // Stop existing listener if any
      stopGroupListener(groupId);
      
      logger.debug('Starting listener for group', { groupId }, 'AppContext');
      
      const unsubscribe = firebaseDataService.group.listenToGroup(
        groupId,
        (group) => {
          logger.debug('Real-time group update', { groupId }, 'AppContext');
          dispatch({ type: 'UPDATE_GROUP', payload: group });
        },
        (error) => {
          console.error('🔄 AppContext: Real-time group listener error:', error);
          dispatch({ type: 'SET_ERROR', payload: error.message });
        }
      );
      
      groupListenersRef.current.set(groupId, unsubscribe);
    } catch (error) {
      console.error('Error starting group listener:', error);
    }
  }, [initializeTrackingSafely, stopGroupListener]);

  // User operations
  const authenticateUser = useCallback(async (user: User, method: 'wallet' | 'email' | 'guest' | 'social') => {
    // Only clear wallet data if this is a DIFFERENT user (different email)
    // This prevents wallet loss when users switch authentication methods but are the same person
    if (state.currentUser && state.currentUser.email !== user.email) {
      logger.info('Different user detected (different email), clearing wallet data', null, 'AppContext');
      
      try {
        // Import services
        const { walletService } = await import('../services/WalletService');
        
        // Clear current user's wallet data
        await walletService.clearWalletDataForUser(state.currentUser.id.toString());
        
        // Also clear any generic wallet data that might be stored
        // Wallet data clearing is now handled by walletService
        
        logger.info('Cleared wallet data for different user', null, 'AppContext');
      } catch (error) {
        console.warn('⚠️ AppContext: Failed to clear current user wallet data:', error);
        // Continue with authentication even if clearing fails
      }
    } else if (state.currentUser && state.currentUser.email === user.email) {
      logger.info('Same user detected (same email), preserving wallet data', null, 'AppContext');
    }
    
    dispatch({ type: 'AUTHENTICATE_USER', payload: { user, method } });
  }, [state.currentUser]);

  const updateUser = useCallback(async (updates: Partial<User>): Promise<void> => {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await firebaseDataService.user.updateUser(state.currentUser.id.toString(), updates);
      dispatch({ type: 'SET_CURRENT_USER', payload: { ...state.currentUser, ...updates } });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [state.currentUser]);

  const logoutUser = useCallback(() => {
    // Cleanup all listeners
    if (userGroupsListenerRef.current) {
      userGroupsListenerRef.current();
      userGroupsListenerRef.current = null;
    }
    
    groupListenersRef.current.forEach(unsubscribe => unsubscribe());
    groupListenersRef.current.clear();
    
    dispatch({ type: 'LOGOUT_USER' });
  }, []);

  // Utility functions
  const getGroupById = useCallback((id: number | string): GroupWithDetails | undefined => {
    return state.groups.find(group => group.id === id);
  }, [state.groups]);

    const getGroupBalances = useCallback(async (groupId: number | string): Promise<Balance[]> => {
    try {
      const group = getGroupById(groupId);
      
      if (__DEV__) {
        logger.debug('Processing group', {
          groupId,
          groupExists: !!group,
          groupName: group?.name,
          expensesByCurrency: group?.expenses_by_currency,
          memberCount: group?.member_count,
          currentUserId: state.currentUser?.id,
          currentUserType: typeof state.currentUser?.id
        });
      }
      
      if (!group) {
        if (__DEV__) {
          logger.warn('Group not found, returning empty array', null, 'AppContext');
        }
        return [];
      }

      // Use the unified balance calculator
      const balances = await calculateGroupBalancesUnified(group, state.currentUser?.id);
          if (__DEV__) {
        logger.debug('Calculated balances', { balances }, 'AppContext');
          }
          return balances;
    } catch (error) {
      console.error(`getGroupBalances: Error processing group ${groupId}:`, error);
      return [];
    }
  }, [getGroupById, state.currentUser]);

  const getTotalExpenses = useCallback((groupId: number | string): number => {
    const group = getGroupById(groupId);
    return group ? group.totalAmount : 0;
  }, [getGroupById]);

  const getUserBalance = useCallback(async (groupId: number | string, userId: number | string): Promise<number> => {
    const balances = await getGroupBalances(groupId);
    const userBalance = balances.find(b => b.userId === userId);
    return userBalance ? userBalance.amount : 0;
  }, [getGroupBalances]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const invalidateCache = useCallback((pattern: string) => {
    // Cache invalidation is handled by the invalidateGroupsCache function
    logger.info('Cache invalidation requested for pattern', { pattern }, 'AppContext');
  }, []);

  // Add specific cache invalidation for groups
  const invalidateGroupsCache = useCallback(() => {
    dispatch({ type: 'SET_GROUPS', payload: [] });
    dispatch({ 
      type: 'UPDATE_CACHE_TIMESTAMP', 
      payload: { type: 'groups', timestamp: 0 } 
    });
    if (__DEV__) { logger.info('Groups cache invalidated', null, 'AppContext'); }
  }, []);

  // Add function to check if groups cache is valid
  const isGroupsCacheValid = useCallback(() => {
    if (state.groups.length === 0 || state.lastDataFetch.groups === 0) {
      return false;
    }
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return (now - state.lastDataFetch.groups) < maxAge;
  }, [state.groups.length, state.lastDataFetch.groups]);

  // Note: Group loading is now handled by useGroupList hook to prevent infinite loops

  // Notifications logic
  const NOTIFICATIONS_CACHE_AGE = 2 * 60 * 1000; // 2 minutes
  const loadNotifications = useCallback(async (forceRefresh: boolean = false) => {
    if (!state.currentUser?.id) return;
    const now = Date.now();
    if (!forceRefresh && state.notifications && state.lastNotificationsFetch && (now - state.lastNotificationsFetch < NOTIFICATIONS_CACHE_AGE)) {
      return; // Use cached notifications
    }
    try {
      logger.info('Loading notifications for user', { userId: state.currentUser.id }, 'AppContext');
      const notifications = await notificationService.getUserNotifications(state.currentUser.id);
      logger.info('Loaded notifications', { 
        count: notifications.length, 
        types: notifications.map(n => n.type),
        splitInvites: notifications.filter(n => n.type === 'split_invite').length
      }, 'AppContext');
      dispatch({ type: 'SET_NOTIFICATIONS', payload: { notifications, timestamp: now } });
    } catch (error) {
      console.error('Error loading notifications:', error);
      logger.error('Failed to load notifications', error, 'AppContext');
      // Set empty notifications to prevent infinite loading
      dispatch({ type: 'SET_NOTIFICATIONS', payload: { notifications: [], timestamp: now } });
    }
  }, [state.currentUser?.id, state.notifications, state.lastNotificationsFetch]);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications(true);
  }, [loadNotifications]);

  const removeNotification = useCallback(async (notificationId: string) => {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

    try {
      logger.info('Starting removeNotification', { notificationId, userId: state.currentUser.id }, 'AppContext');

      // Remove notification from Firebase
      await firebaseDataService.notification.deleteNotification(notificationId);
      logger.info('Notification removed from Firebase', null, 'AppContext');

      // Remove from state
      const updatedNotifications = state.notifications?.filter(n => n.id !== notificationId) || [];
      dispatch({ type: 'SET_NOTIFICATIONS', payload: { notifications: updatedNotifications, timestamp: Date.now() } });
      logger.info('Notification removed from state', null, 'AppContext');

    } catch (error) {
      console.error('❌ AppContext: Error removing notification:', error);
      console.error('❌ AppContext: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      throw error;
    }
  }, [state.currentUser, state.notifications]);

  // Split invitation handling
  const acceptSplitInvitation = useCallback(async (notificationId: string, splitId: string) => {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

    try {
      logger.info('Starting acceptSplitInvitation', { notificationId, splitId, userId: state.currentUser.id }, 'AppContext');

      // Find the notification
      const notification = state.notifications?.find(n => n.id === notificationId);
      if (!notification || !notification.data?.splitId) {
        throw new Error('Invalid notification or missing split data');
      }

      logger.debug('Notification data structure', {
        notificationId,
        notificationData: notification.data,
        hasInviterId: !!notification.data.inviterId,
        hasCreatorId: !!notification.data.creatorId,
        inviterId: notification.data.inviterId,
        creatorId: notification.data.creatorId
      });

      // Import SplitInvitationService
      const { SplitInvitationService } = await import('../services/splitInvitationService');
      
      // Create invitation data from notification
      const invitationData = {
        type: 'split_invitation' as const,
        splitId: notification.data.splitId,
        billName: notification.data.billName || 'Unknown Bill',
        totalAmount: notification.data.totalAmount || 0,
        currency: notification.data.currency || 'USDC',
        creatorId: notification.data.inviterId || notification.data.creatorId || '',
        timestamp: new Date().toISOString(),
      };

      logger.info('Created invitation data', { invitationData }, 'AppContext');

      // Join the split
      const result = await SplitInvitationService.joinSplit(invitationData, state.currentUser.id.toString());
      logger.info('Split invitation accepted successfully', { result }, 'AppContext');

      if (result.success) {
        // Remove the notification
        await removeNotification(notificationId);
        logger.info('Notification removed from state', null, 'AppContext');
      }

      return result;
    } catch (error) {
      console.error('🔄 AppContext: Error accepting split invitation:', error);
      throw error;
    }
  }, [state.currentUser, state.notifications, removeNotification]);

  // Group invitation handling
  const acceptGroupInvitation = useCallback(async (notificationId: string, groupId: string) => {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

    try {
      logger.info('Starting acceptGroupInvitation', { notificationId, groupId, userId: state.currentUser.id }, 'AppContext');

      // Find the notification
      const notification = state.notifications?.find(n => n.id === notificationId);
      if (!notification || !notification.data?.inviteId) {
        throw new Error('Invalid notification or missing invite data');
      }

      // Join the group via invite
      const result = await firebaseDataService.group.joinGroupViaInvite(
        notification.data.inviteId, 
        state.currentUser.id.toString()
      );
      logger.info('Group invitation accepted successfully', { result }, 'AppContext');

      // Remove the notification
      await removeNotification(notificationId);
      logger.info('Notification removed from state', null, 'AppContext');

      // Start real-time listener for the new group
      startGroupListener(groupId);
      logger.info('Started real-time listener for group', { groupId }, 'AppContext');

      // Force refresh user groups to include the new group
      // The real-time listener will handle updates, but we can also force a refresh
      if (__DEV__) {
        logger.info('Real-time listener will handle group updates automatically', null, 'AppContext');
      }

    } catch (error) {
      console.error('❌ AppContext: Error accepting group invitation:', error);
      console.error('❌ AppContext: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      throw error;
    }
  }, [state.currentUser, state.notifications, removeNotification, startGroupListener]);

  const value: AppContextType = {
    state,
    dispatch,
    loadUserGroups,
    loadGroupDetails,
    refreshGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    leaveGroup,
    selectGroup,
    createExpense,
    updateExpense,
    deleteExpense,
    authenticateUser,
    updateUser,
    logoutUser,
    getGroupById,
    getGroupBalances,
    getTotalExpenses,
    getUserBalance,
    clearError,
    shouldRefreshData,
    invalidateCache,
    invalidateGroupsCache,
    isGroupsCacheValid,
    notifications: state.notifications ?? [],
    loadNotifications,
    refreshNotifications,
    acceptGroupInvitation,
    acceptSplitInvitation,
    removeNotification,
    startGroupListener,
    stopGroupListener,
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