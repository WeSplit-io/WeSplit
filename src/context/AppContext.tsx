import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react';
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
import { i18nService } from '../services/i18nService';
import { getUserNotifications } from '../services/firebaseNotificationService';

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
  updateGroup: (groupId: number, updates: any) => Promise<void>;
  deleteGroup: (groupId: number) => Promise<void>;
  leaveGroup: (groupId: number) => Promise<void>;
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
  invalidateGroupsCache: () => void;
  isGroupsCacheValid: () => boolean;

  // Notifications
  notifications: Notification[];
  loadNotifications: (forceRefresh?: boolean) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper function to calculate balances when we have actual member data
const calculateBalancesFromMembers = (group: GroupWithDetails, currentUserId?: number): Balance[] => {
  const balances: Balance[] = [];
  
  if (!group.members || group.members.length === 0) return balances;
  
  if (__DEV__) {
    console.log('🔍 calculateBalancesFromMembers: Input data:', {
      groupName: group.name,
      membersCount: group.members.length,
      expensesCount: group.expenses?.length || 0,
      currentUserId,
      currentUserType: typeof currentUserId
    });
  }
  
  // If we have individual expenses, calculate based on actual payments
  if (group.expenses && group.expenses.length > 0) {
    const memberBalances: Record<string, Record<string, number>> = {};
    
    // Initialize balances for all members (use string IDs)
    group.members.forEach(member => {
      memberBalances[String(member.id)] = {};
    });

    // Calculate balances by currency based on actual expenses
    group.expenses.forEach(expense => {
      const currency = expense.currency || 'SOL';
      
      // Parse split data to get actual splits
      let splitData: any = null;
      try {
        if (typeof expense.splitData === 'string') {
          splitData = JSON.parse(expense.splitData);
        } else if (expense.splitData) {
          splitData = expense.splitData;
        }
      } catch (e) {
        console.warn('Failed to parse split data:', expense.splitData);
        splitData = null;
      }
      
      // Determine who owes what based on split type
      let membersInSplit: string[] = [];
      let amountPerPerson = 0;
      
      if (splitData && splitData.memberIds && Array.isArray(splitData.memberIds) && splitData.memberIds.length > 0) {
        // Use the specific member IDs from split data (convert to strings)
        membersInSplit = splitData.memberIds.map((id: any) => String(id));
        amountPerPerson = splitData.amountPerPerson || (expense.amount / membersInSplit.length);
      } else {
        // Fallback: split equally among all group members
        membersInSplit = group.members.map(m => String(m.id));
        amountPerPerson = expense.amount / membersInSplit.length;
      }
      
      // Initialize currency tracking if not exists
      group.members.forEach(member => {
        const memberId = String(member.id);
        if (!memberBalances[memberId]) {
          memberBalances[memberId] = {};
        }
        if (!memberBalances[memberId][currency]) {
          memberBalances[memberId][currency] = 0;
        }
      });
      
      // The person who paid should be reimbursed by the selected members
      const paidById = expense.paid_by ? String(expense.paid_by) : null;
      
      if (paidById && membersInSplit.length > 0) {
        membersInSplit.forEach(memberId => {
          if (memberId !== paidById) {
            // Each selected member owes their share to the payer
            memberBalances[memberId][currency] -= amountPerPerson;
            // The payer is owed this amount from each selected member
            memberBalances[paidById][currency] += amountPerPerson;
          }
        });
      } else {
        // Fallback: if no payer or no members, skip this expense
        if (__DEV__) {
          console.log('🔍 calculateBalancesFromMembers: Skipping expense due to missing paid_by or members:', {
            expenseId: expense.id,
            paid_by: expense.paid_by,
            membersInSplit: membersInSplit
          });
        }
      }
    });

    // Convert to Balance objects
    group.members.forEach(member => {
      const memberId = String(member.id);
      const currencies = memberBalances[memberId] || {};
      
      // Find the currency with the largest absolute balance
      let primaryCurrency = group.currency || 'SOL';
      let primaryAmount = currencies[primaryCurrency] || 0;
      
      const balanceEntries = Object.entries(currencies);
      if (balanceEntries.length > 0) {
        const [maxCurrency, maxAmount] = balanceEntries.reduce((max, [curr, amount]) => 
          Math.abs(amount) > Math.abs(max[1]) ? [curr, amount] : max
        );
        if (Math.abs(maxAmount) > Math.abs(primaryAmount)) {
          primaryCurrency = maxCurrency;
          primaryAmount = maxAmount;
        }
      }

      balances.push({
        userId: memberId,
        userName: member.name,
        userAvatar: member.avatar,
        amount: primaryAmount,
        currency: primaryCurrency,
        status: Math.abs(primaryAmount) < 0.01 ? 'settled' : primaryAmount > 0 ? 'gets_back' : 'owes'
      });
    });
  } else {
    // No individual expenses or all expenses had missing data, create fallback scenario
    const primaryCurrency = group.expenses_by_currency?.[0]?.currency || 'SOL';
    const totalAmount = group.expenses_by_currency?.reduce((sum, curr) => sum + curr.total_amount, 0) || 0;
    
    if (totalAmount > 0 && group.members.length > 0) {
      const sharePerPerson = totalAmount / group.members.length;
      
      // Fallback scenario: assume current user paid 60% of expenses, others owe their shares
      group.members.forEach(member => {
        const isCurrentUser = String(member.id) === String(currentUserId);
        let amount: number;
        
        if (isCurrentUser) {
          // Current user paid some expenses and is owed by others
          const paidAmount = totalAmount * 0.6; // Assume they paid 60%
          amount = paidAmount - sharePerPerson;
        } else {
          // Others owe their share
          amount = -sharePerPerson;
        }
        
        balances.push({
          userId: String(member.id),
          userName: member.name,
          userAvatar: member.avatar,
          amount: amount,
          currency: primaryCurrency,
          status: Math.abs(amount) < 0.01 ? 'settled' : amount > 0 ? 'gets_back' : 'owes'
        });
      });
      
      if (__DEV__) {
        console.log('🔍 calculateBalancesFromMembers: Using fallback balance calculation:', {
          totalAmount,
          sharePerPerson,
          memberCount: group.members.length
        });
      }
    }
  }
  
  if (__DEV__) {
    console.log('🔍 calculateBalancesFromMembers: Final balances:', balances);
  }
  
  return balances;
};

// Helper function to calculate balances from summary data
const calculateBalancesFromSummary = (group: GroupWithDetails, currentUser?: any): Balance[] => {
  const balances: Balance[] = [];
  
  if (!group.expenses_by_currency || group.expenses_by_currency.length === 0) return balances;
  
  if (__DEV__) {
    console.log('🔍 calculateBalancesFromSummary: Input data:', {
      groupName: group.name,
      expensesByCurrency: group.expenses_by_currency,
      memberCount: group.member_count,
      currentUserId: currentUser?.id,
      currentUserType: typeof currentUser?.id
    });
  }
  
  // Get primary currency (largest amount)
  const primaryCurrencyEntry = group.expenses_by_currency.reduce((max, curr) => 
    curr.total_amount > max.total_amount ? curr : max
  );
  
  const totalAmount = primaryCurrencyEntry.total_amount;
  const actualMemberCount = group.member_count || 2;
  const sharePerPerson = totalAmount / actualMemberCount;
  
  if (__DEV__) {
    console.log('🔍 calculateBalancesFromSummary: Calculation data:', {
      primaryCurrency: primaryCurrencyEntry.currency,
      totalAmount,
      actualMemberCount,
      sharePerPerson
    });
  }
  
  // Current user paid everything, others owe their shares
  const currentUserOwedAmount = totalAmount - sharePerPerson;
  
  // Current user balance - ensure ID is a string for consistency
  const currentUserId = String(currentUser?.id || 1);
  balances.push({
    userId: currentUserId,
    userName: currentUser?.name || 'You',
    userAvatar: undefined,
    amount: currentUserOwedAmount,
    currency: primaryCurrencyEntry.currency,
    status: 'gets_back'
  });
  
  // Other members owe their shares
  for (let i = 1; i < actualMemberCount; i++) {
    balances.push({
      userId: String(100 + i), // Use string IDs for consistency
      userName: `Member ${i + 1}`,
      userAvatar: undefined,
      amount: -sharePerPerson,
      currency: primaryCurrencyEntry.currency,
      status: 'owes'
    });
  }
  
  if (__DEV__) {
    console.log('🔍 calculateBalancesFromSummary: Final balances:', balances);
  }
  
  return balances;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize i18n service
  useEffect(() => {
    const initializeI18n = async () => {
      try {
        await i18nService.initialize();
        console.log('i18n service initialized');
      } catch (error) {
        console.error('Failed to initialize i18n service:', error);
      }
    };

    initializeI18n();
  }, []);

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
    
    // Enhanced cache check with proper timestamp validation
    if (!forceRefresh && state.groups.length > 0 && state.lastDataFetch.groups > 0) {
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes cache duration
      const timeSinceLastFetch = now - state.lastDataFetch.groups;
      
      if (timeSinceLastFetch < maxAge) {
        if (__DEV__) { console.log('🔄 AppContext: Using cached groups (age:', Math.round(timeSinceLastFetch / 1000), 's)'); }
        return; // Use cached data
      }
    }

    try {
      if (__DEV__) { console.log('🔄 AppContext: Loading user groups for user:', state.currentUser.id); }
      dispatch({ type: 'SET_LOADING', payload: true });
      const groups = await firebaseDataService.group.getUserGroups(state.currentUser.id.toString(), forceRefresh);
      if (__DEV__) { console.log('🔄 AppContext: Received groups from hybrid service:', groups.length, 'groups'); }
      if (__DEV__) { console.log('🔄 AppContext: Groups data source:', groups.length > 0 ? 'Firebase' : 'SQLite fallback'); }
      dispatch({ type: 'SET_GROUPS', payload: groups });
    } catch (error) {
      console.error('❌ AppContext: Error loading user groups:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load groups' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentUser?.id, state.groups.length, state.lastDataFetch.groups]);

  const loadGroupDetails = useCallback(async (groupId: number, forceRefresh: boolean = false): Promise<GroupWithDetails> => {
    try {
      const group = await firebaseDataService.group.getGroupDetails(groupId.toString(), forceRefresh);
      
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
  }, []); // Remove state.groups dependency to prevent infinite loops

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

    try {
      const group = await firebaseDataService.group.createGroup({
        ...groupData,
        created_by: state.currentUser.id
      });
      
      // Transform to GroupWithDetails
      const groupWithDetails = firebaseDataService.transformers.transformGroupWithDetails(
        group, 
        [firebaseDataService.transformers.userToGroupMember(state.currentUser)], 
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
      const result = await firebaseDataService.group.updateGroup(groupId.toString(), state.currentUser.id.toString(), updates);
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
      await firebaseDataService.group.deleteGroup(groupId.toString(), state.currentUser.id.toString());
      dispatch({ type: 'DELETE_GROUP', payload: groupId });
      firebaseDataService.cache.clearGroup(groupId);
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }, [state.currentUser]);

  const leaveGroup = useCallback(async (groupId: number) => {
    if (!state.currentUser?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await firebaseDataService.group.leaveGroup(groupId.toString(), state.currentUser.id.toString());
      dispatch({ type: 'DELETE_GROUP', payload: groupId }); // Assuming leaving a group is effectively deleting it from the user's list
      firebaseDataService.cache.clearGroup(groupId);
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }, [state.currentUser]);

  const selectGroup = useCallback((group: GroupWithDetails | null) => {
    dispatch({ type: 'SELECT_GROUP', payload: group });
  }, []);

  // Expense operations
  const createExpense = useCallback(async (expenseData: any): Promise<Expense> => {
    try {
      console.log('🔍 AppContext: Starting expense creation...');
      console.log('🔍 AppContext: Expense data:', expenseData);
      console.log('🔍 AppContext: Current user:', state.currentUser);
      console.log('🔍 AppContext: Current groups:', state.groups.length);
      
      const expense = await firebaseDataService.expense.createExpense(expenseData);
      
      console.log('🔍 AppContext: Expense created successfully:', expense);
      console.log('🔍 AppContext: Adding expense to state...');
      
      dispatch({ type: 'ADD_EXPENSE', payload: { groupId: Number(expense.group_id), expense } });
      
      console.log('🔍 AppContext: Expense added to state');
      
      return expense;
    } catch (error) {
      console.error('❌ AppContext: Error creating expense:', error);
      console.error('❌ AppContext: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      throw error;
    }
  }, [state.currentUser, state.groups.length]);

  const updateExpense = useCallback(async (groupId: number, expense: Expense) => {
    try {
      const updatedExpense = await firebaseDataService.expense.updateExpense(expense.id, expense);
      dispatch({ type: 'UPDATE_EXPENSE', payload: { groupId, expense: updatedExpense } });
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }, []);

  const deleteExpense = useCallback(async (groupId: number, expenseId: number) => {
    try {
      await firebaseDataService.expense.deleteExpense(expenseId);
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
      const updatedUser = await firebaseDataService.user.updateUser(state.currentUser.id.toString(), updates);
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
    try {
      const group = getGroupById(groupId);
      
      if (__DEV__) {
        console.log('🔍 getGroupBalances: Processing group:', {
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
          console.log('🔍 getGroupBalances: Group not found, returning empty array');
        }
        return [];
      }

      // Use summary data from the basic group (synchronous)
      if (group.expenses_by_currency && group.expenses_by_currency.length > 0 && group.member_count > 0) {
        try {
          const balances = calculateBalancesFromSummary(group, state.currentUser);
          if (__DEV__) {
            console.log('🔍 getGroupBalances: Calculated balances from summary:', balances);
          }
          return balances;
        } catch (error) {
          console.error('Error calculating balances from summary:', error);
        }
      }
      
      // If group has detailed member/expense data, use that
      if (group.members && group.members.length > 0 && group.expenses && group.expenses.length > 0) {
        try {
          const balances = calculateBalancesFromMembers(group, state.currentUser?.id);
          if (__DEV__) {
            console.log('🔍 getGroupBalances: Calculated balances from members:', balances);
          }
          return balances;
        } catch (error) {
          console.error('Error calculating balances from members:', error);
        }
      }
      
      // Return empty array silently for groups without data
      if (__DEV__) {
        console.log('🔍 getGroupBalances: No data available, returning empty array');
      }
      return [];
    } catch (error) {
      console.error(`getGroupBalances: Error processing group ${groupId}:`, error);
      return [];
    }
  }, [getGroupById, state.currentUser]);

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
    firebaseDataService.cache.clearPattern(pattern);
  }, []);

  // Add specific cache invalidation for groups
  const invalidateGroupsCache = useCallback(() => {
    dispatch({ type: 'SET_GROUPS', payload: [] });
    dispatch({ 
      type: 'UPDATE_CACHE_TIMESTAMP', 
      payload: { type: 'groups', timestamp: 0 } 
    });
    if (__DEV__) { console.log('🔄 AppContext: Groups cache invalidated'); }
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

  // Notifications logic
  const NOTIFICATIONS_CACHE_AGE = 2 * 60 * 1000; // 2 minutes
  const loadNotifications = useCallback(async (forceRefresh: boolean = false) => {
    if (!state.currentUser?.id) return;
    const now = Date.now();
    if (!forceRefresh && state.notifications && state.lastNotificationsFetch && (now - state.lastNotificationsFetch < NOTIFICATIONS_CACHE_AGE)) {
      return; // Use cached notifications
    }
    try {
      if (__DEV__) { console.log('🔥 Loading notifications for user:', state.currentUser.id); }
      const notifications = await getUserNotifications(state.currentUser.id);
      if (__DEV__) { console.log('🔥 Loaded notifications:', notifications.length); }
      dispatch({ type: 'SET_NOTIFICATIONS', payload: { notifications, timestamp: now } });
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Set empty notifications to prevent infinite loading
      dispatch({ type: 'SET_NOTIFICATIONS', payload: { notifications: [], timestamp: now } });
    }
  }, [state.currentUser?.id, state.notifications, state.lastNotificationsFetch]);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications(true);
  }, [loadNotifications]);

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