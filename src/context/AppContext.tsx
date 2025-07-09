import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { 
  User, 
  GroupWithDetails, 
  Expense, 
  Balance, 
  AppState, 
  AppAction,
  NavigationParams 
} from '../types';
import { dataService } from '../services/dataService';

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
  }
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
      dataService.cache.clearAll();
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
                expense_count: group.expense_count + 1
              }
            : group
        ),
        selectedGroup: state.selectedGroup?.id === action.payload.groupId 
          ? {
              ...state.selectedGroup,
              expenses: [...state.selectedGroup.expenses, action.payload.expense],
              totalAmount: state.selectedGroup.totalAmount + action.payload.expense.amount,
              expense_count: state.selectedGroup.expense_count + 1
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
  updateGroup: (groupId: number, updates: any) => Promise<void>;
  deleteGroup: (groupId: number) => Promise<void>;
  selectGroup: (group: GroupWithDetails | null) => void;
  
  // Expense operations
  createExpense: (expenseData: any) => Promise<Expense>;
  updateExpense: (groupId: number, expense: Expense) => Promise<void>;
  deleteExpense: (groupId: number, expenseId: number) => Promise<void>;
  
  // User operations
  authenticateUser: (user: User, method: 'wallet' | 'email' | 'guest') => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  logoutUser: () => void;
  
  // Utility functions
  getGroupById: (id: number) => GroupWithDetails | undefined;
  getGroupBalances: (groupId: number) => Balance[];
  getTotalExpenses: (groupId: number) => number;
  getUserBalance: (groupId: number, userId: number) => number;
  clearError: () => void;
  
  // Cache management
  shouldRefreshData: (type: 'groups' | 'expenses' | 'members', groupId?: number) => boolean;
  invalidateCache: (pattern: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

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

  // Data operations
  const loadUserGroups = useCallback(async (forceRefresh: boolean = false) => {
    if (!state.currentUser?.id) return;
    
    if (!forceRefresh && !shouldRefreshData('groups')) {
      return; // Use cached data
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const groups = await dataService.group.getUserGroups(state.currentUser.id.toString(), forceRefresh);
      dispatch({ type: 'SET_GROUPS', payload: groups });
    } catch (error) {
      console.error('Error loading user groups:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load groups' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentUser?.id, shouldRefreshData]);

  const loadGroupDetails = useCallback(async (groupId: number, forceRefresh: boolean = false): Promise<GroupWithDetails> => {
    try {
      const group = await dataService.group.getGroupDetails(groupId.toString(), forceRefresh);
      
      // Update the group in state if it exists
      const existingGroup = state.groups.find(g => g.id === groupId);
      if (existingGroup) {
        dispatch({ type: 'UPDATE_GROUP', payload: group });
      }
      
      return group;
    } catch (error) {
      console.error('Error loading group details:', error);
      throw error;
    }
  }, [state.groups]);

  const refreshGroup = useCallback(async (groupId: number) => {
    try {
      const group = await loadGroupDetails(groupId, true);
      if (state.selectedGroup?.id === groupId) {
        dispatch({ type: 'SELECT_GROUP', payload: group });
      }
    } catch (error) {
      console.error('Error refreshing group:', error);
    }
  }, [loadGroupDetails, state.selectedGroup?.id]);

  // Group operations
  const createGroup = useCallback(async (groupData: any): Promise<GroupWithDetails> => {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const group = await dataService.group.createGroup({
        ...groupData,
        created_by: state.currentUser.id
      });
      
      // Transform to GroupWithDetails
      const groupWithDetails = dataService.transformers.transformGroupWithDetails(
        group, 
        [dataService.transformers.userToGroupMember(state.currentUser)], 
        [], 
        state.currentUser.id
      );
      
      dispatch({ type: 'ADD_GROUP', payload: groupWithDetails });
      return groupWithDetails;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }, [state.currentUser]);

  const updateGroup = useCallback(async (groupId: number, updates: any) => {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const result = await dataService.group.updateGroup(groupId.toString(), state.currentUser.id.toString(), updates);
      const updatedGroup = await loadGroupDetails(groupId, true);
      dispatch({ type: 'UPDATE_GROUP', payload: updatedGroup });
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }, [state.currentUser, loadGroupDetails]);

  const deleteGroup = useCallback(async (groupId: number) => {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await dataService.group.deleteGroup(groupId.toString(), state.currentUser.id.toString());
      dispatch({ type: 'DELETE_GROUP', payload: groupId });
      dataService.cache.clearGroup(groupId);
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }, [state.currentUser]);

  const selectGroup = useCallback((group: GroupWithDetails | null) => {
    dispatch({ type: 'SELECT_GROUP', payload: group });
  }, []);

  // Expense operations
  const createExpense = useCallback(async (expenseData: any): Promise<Expense> => {
    try {
      const expense = await dataService.expense.createExpense(expenseData);
      dispatch({ type: 'ADD_EXPENSE', payload: { groupId: expense.group_id, expense } });
      return expense;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }, []);

  const updateExpense = useCallback(async (groupId: number, expense: Expense) => {
    try {
      const updatedExpense = await dataService.expense.updateExpense(expense.id, expense);
      dispatch({ type: 'UPDATE_EXPENSE', payload: { groupId, expense: updatedExpense } });
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }, []);

  const deleteExpense = useCallback(async (groupId: number, expenseId: number) => {
    try {
      await dataService.expense.deleteExpense(expenseId);
      dispatch({ type: 'DELETE_EXPENSE', payload: { groupId, expenseId } });
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }, []);

  // User operations
  const authenticateUser = useCallback((user: User, method: 'wallet' | 'email' | 'guest') => {
    dispatch({ type: 'AUTHENTICATE_USER', payload: { user, method } });
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const updatedUser = await dataService.user.updateUser(state.currentUser.id.toString(), updates);
      dispatch({ type: 'SET_CURRENT_USER', payload: updatedUser });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [state.currentUser]);

  const logoutUser = useCallback(() => {
    dispatch({ type: 'LOGOUT_USER' });
  }, []);

  // Utility functions
  const getGroupById = useCallback((id: number): GroupWithDetails | undefined => {
    return state.groups.find(group => group.id === id);
  }, [state.groups]);

  const getGroupBalances = useCallback((groupId: number): Balance[] => {
    const group = getGroupById(groupId);
    if (!group) return [];

    // CRITICAL FIX: Handle multi-currency balances properly
    // Calculate balances per currency first, then convert to display currency
    const memberBalances: Record<number, Record<string, number>> = {};
    
    // Initialize balances for all members
    group.members.forEach(member => {
      memberBalances[member.id] = {};
    });

    // Calculate balances by currency
    group.expenses.forEach(expense => {
      const currency = expense.currency || 'SOL';
      const sharePerPerson = expense.amount / group.members.length;
      
      group.members.forEach(member => {
        if (!memberBalances[member.id][currency]) {
          memberBalances[member.id][currency] = 0;
        }
        
        if (expense.paid_by === member.id) {
          memberBalances[member.id][currency] += expense.amount - sharePerPerson;
        } else {
          memberBalances[member.id][currency] -= sharePerPerson;
        }
      });
    });

    // Convert to Balance objects with primary currency for display
    // For now, use the group's default currency or show the largest balance
    return group.members.map(member => {
      const currencies = memberBalances[member.id];
      
      // Find the currency with the largest absolute balance for display
      let primaryCurrency = group.currency || 'SOL';
      let primaryAmount = currencies[primaryCurrency] || 0;
      
      // If the primary currency has no balance, find the largest one
      if (Math.abs(primaryAmount) < 0.01) {
        const balanceEntries = Object.entries(currencies);
        if (balanceEntries.length > 0) {
          const [maxCurrency, maxAmount] = balanceEntries.reduce((max, [curr, amount]) => 
            Math.abs(amount) > Math.abs(max[1]) ? [curr, amount] : max
          );
          primaryCurrency = maxCurrency;
          primaryAmount = maxAmount;
        }
      }

      return {
        userId: member.id,
        userName: member.name,
        userAvatar: member.avatar,
        amount: primaryAmount,
        currency: primaryCurrency, // Add currency to balance
        status: Math.abs(primaryAmount) < 0.01 ? 'settled' : primaryAmount > 0 ? 'gets_back' : 'owes'
      };
    });
  }, [getGroupById]);

  const getTotalExpenses = useCallback((groupId: number): number => {
    const group = getGroupById(groupId);
    return group ? group.totalAmount : 0;
  }, [getGroupById]);

  const getUserBalance = useCallback((groupId: number, userId: number): number => {
    const balances = getGroupBalances(groupId);
    const userBalance = balances.find(b => b.userId === userId);
    return userBalance ? userBalance.amount : 0;
  }, [getGroupBalances]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const invalidateCache = useCallback((pattern: string) => {
    dataService.cache.clearPattern(pattern);
  }, []);

  const value: AppContextType = {
    state,
    dispatch,
    loadUserGroups,
    loadGroupDetails,
    refreshGroup,
    createGroup,
    updateGroup,
    deleteGroup,
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
    invalidateCache
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