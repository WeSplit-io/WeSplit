import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { PoolUtils } from '../../utils/poolUtils';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  walletAddress: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  category: string;
  currency: string;
  members: User[];
  expenses: Expense[];
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: User;
  splitBetween: User[];
  groupId: string;
  date: string;
  category: string;
}

export interface Balance {
  userId: string;
  userName: string;
  userAvatar: string;
  amount: number;
  status: 'owes' | 'gets back' | 'settled';
}

export interface AppState {
  currentUser: User | null;
  groups: Group[];
  selectedGroup: Group | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  authMethod: 'wallet' | 'email' | 'guest' | null;
}

// Action Types
type AppAction =
  | { type: 'SET_CURRENT_USER'; payload: User }
  | { type: 'ADD_GROUP'; payload: Group }
  | { type: 'UPDATE_GROUP'; payload: Group }
  | { type: 'DELETE_GROUP'; payload: string }
  | { type: 'SELECT_GROUP'; payload: Group | null }
  | { type: 'ADD_EXPENSE'; payload: { groupId: string; expense: Expense } }
  | { type: 'UPDATE_EXPENSE'; payload: { groupId: string; expense: Expense } }
  | { type: 'DELETE_EXPENSE'; payload: { groupId: string; expenseId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'AUTHENTICATE_USER'; payload: { user: User; method: 'wallet' | 'email' | 'guest' } }
  | { type: 'LOGOUT_USER' };

// Initial State
const initialState: AppState = {
  currentUser: {
    id: '1',
    name: 'Ari Colon',
    email: 'ari.colon@gmail.com',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    walletAddress: '0x1234...5678',
  },
  groups: [
    {
      id: '1',
      name: 'Vacation Trip',
      description: 'Summer vacation expenses',
      category: 'travel',
      currency: 'USD',
      members: [
        {
          id: '1',
          name: 'Ari Colon',
          email: 'ari.colon@gmail.com',
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
          walletAddress: '0x1234...5678',
        },
        {
          id: '2',
          name: 'Bentlee Barrera',
          email: 'bentlee@example.com',
          avatar: 'https://randomuser.me/api/portraits/women/23.jpg',
          walletAddress: '0x2345...6789',
        },
        {
          id: '3',
          name: 'Remi Moore',
          email: 'remi@example.com',
          avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
          walletAddress: '0x3456...7890',
        },
      ],
      expenses: [
        {
          id: '1',
          description: 'Hotel booking',
          amount: 1200,
          paidBy: {
            id: '1',
            name: 'Ari Colon',
            email: 'ari.colon@gmail.com',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            walletAddress: '0x1234...5678',
          },
          splitBetween: [
            {
              id: '1',
              name: 'Ari Colon',
              email: 'ari.colon@gmail.com',
              avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
              walletAddress: '0x1234...5678',
            },
            {
              id: '2',
              name: 'Bentlee Barrera',
              email: 'bentlee@example.com',
              avatar: 'https://randomuser.me/api/portraits/women/23.jpg',
              walletAddress: '0x2345...6789',
            },
            {
              id: '3',
              name: 'Remi Moore',
              email: 'remi@example.com',
              avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
              walletAddress: '0x3456...7890',
            },
          ],
          groupId: '1',
          date: '2024-01-15',
          category: 'accommodation',
        },
        {
          id: '2',
          description: 'Dinner at restaurant',
          amount: 180,
          paidBy: {
            id: '2',
            name: 'Bentlee Barrera',
            email: 'bentlee@example.com',
            avatar: 'https://randomuser.me/api/portraits/women/23.jpg',
            walletAddress: '0x2345...6789',
          },
          splitBetween: [
            {
              id: '1',
              name: 'Ari Colon',
              email: 'ari.colon@gmail.com',
              avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
              walletAddress: '0x1234...5678',
            },
            {
              id: '2',
              name: 'Bentlee Barrera',
              email: 'bentlee@example.com',
              avatar: 'https://randomuser.me/api/portraits/women/23.jpg',
              walletAddress: '0x2345...6789',
            },
            {
              id: '3',
              name: 'Remi Moore',
              email: 'remi@example.com',
              avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
              walletAddress: '0x3456...7890',
            },
          ],
          groupId: '1',
          date: '2024-01-16',
          category: 'food',
        },
      ],
      createdAt: '2024-01-10',
      updatedAt: '2024-01-16',
    },
    {
      id: '2',
      name: 'Atapi Trip',
      description: 'Weekend getaway',
      category: 'travel',
      currency: 'USD',
      members: [
        {
          id: '1',
          name: 'Ari Colon',
          email: 'ari.colon@gmail.com',
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
          walletAddress: '0x1234...5678',
        },
        {
          id: '4',
          name: 'Lyric Moyer',
          email: 'lyric@example.com',
          avatar: 'https://randomuser.me/api/portraits/men/26.jpg',
          walletAddress: '0x4567...8901',
        },
        {
          id: '5',
          name: 'Joyce Paul',
          email: 'joyce@example.com',
          avatar: 'https://randomuser.me/api/portraits/women/25.jpg',
          walletAddress: '0x5678...9012',
        },
      ],
      expenses: [
        {
          id: '3',
          description: 'Gas and parking',
          amount: 85,
          paidBy: {
            id: '1',
            name: 'Ari Colon',
            email: 'ari.colon@gmail.com',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            walletAddress: '0x1234...5678',
          },
          splitBetween: [
            {
              id: '1',
              name: 'Ari Colon',
              email: 'ari.colon@gmail.com',
              avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
              walletAddress: '0x1234...5678',
            },
            {
              id: '4',
              name: 'Lyric Moyer',
              email: 'lyric@example.com',
              avatar: 'https://randomuser.me/api/portraits/men/26.jpg',
              walletAddress: '0x4567...8901',
            },
            {
              id: '5',
              name: 'Joyce Paul',
              email: 'joyce@example.com',
              avatar: 'https://randomuser.me/api/portraits/women/25.jpg',
              walletAddress: '0x5678...9012',
            },
          ],
          groupId: '2',
          date: '2024-01-20',
          category: 'transport',
        },
      ],
      createdAt: '2024-01-18',
      updatedAt: '2024-01-20',
    },
  ],
  selectedGroup: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  authMethod: null,
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    
    case 'ADD_GROUP':
      return { ...state, groups: [...state.groups, action.payload] };
    
    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.id ? action.payload : group
        ),
      };
    
    case 'DELETE_GROUP':
      return {
        ...state,
        groups: state.groups.filter(group => group.id !== action.payload),
        selectedGroup: state.selectedGroup?.id === action.payload ? null : state.selectedGroup,
      };
    
    case 'SELECT_GROUP':
      return { ...state, selectedGroup: action.payload };
    
    case 'ADD_EXPENSE':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.groupId
            ? { ...group, expenses: [...group.expenses, action.payload.expense] }
            : group
        ),
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
      };
    
    case 'DELETE_EXPENSE':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.groupId
            ? {
                ...group,
                expenses: group.expenses.filter(expense => expense.id !== action.payload.expenseId),
              }
            : group
        ),
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'AUTHENTICATE_USER':
      return { ...state, currentUser: action.payload.user, isAuthenticated: true, authMethod: action.payload.method };
    
    case 'LOGOUT_USER':
      return { ...state, currentUser: null, isAuthenticated: false, authMethod: null };
    
    default:
      return state;
  }
};

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Helper functions
  getGroupById: (id: string) => Group | undefined;
  getGroupBalances: (groupId: string) => Balance[];
  getTotalExpenses: (groupId: string) => number;
  getUserBalance: (groupId: string, userId: string) => number;
  addGroup: (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addExpense: (groupId: string, expense: Omit<Expense, 'id'>) => void;
  updateExpense: (groupId: string, expense: Expense) => void;
  deleteExpense: (groupId: string, expenseId: string) => void;
  selectGroup: (group: Group | null) => void;
  clearError: () => void;
  // Authentication methods
  authenticateUser: (user: User, method: 'wallet' | 'email' | 'guest') => void;
  logoutUser: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Helper functions
  const getGroupById = (id: string) => {
    return state.groups.find(group => group.id === id);
  };

  const getGroupBalances = (groupId: string): Balance[] => {
    const group = getGroupById(groupId);
    if (!group) return [];

    const balances: { [userId: string]: number } = {};

    // Initialize balances
    group.members.forEach(member => {
      balances[member.id] = 0;
    });

    // Calculate balances from expenses
    group.expenses.forEach(expense => {
      const paidAmount = expense.amount;
      const splitAmount = paidAmount / expense.splitBetween.length;

      // Add what was paid
      balances[expense.paidBy.id] += paidAmount;

      // Subtract what should be paid
      expense.splitBetween.forEach(member => {
        balances[member.id] -= splitAmount;
      });
    });

    // Convert to Balance objects
    return group.members.map(member => {
      const amount = Math.abs(balances[member.id]);
      const status: 'owes' | 'gets back' | 'settled' = 
        balances[member.id] === 0 ? 'settled' :
        balances[member.id] > 0 ? 'gets back' : 'owes';

      return {
        userId: member.id,
        userName: member.name,
        userAvatar: member.avatar,
        amount,
        status,
      };
    });
  };

  const getTotalExpenses = (groupId: string): number => {
    const group = getGroupById(groupId);
    if (!group) return 0;
    return group.expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const getUserBalance = (groupId: string, userId: string): number => {
    const group = getGroupById(groupId);
    if (!group) return 0;

    let balance = 0;

    group.expenses.forEach(expense => {
      const paidAmount = expense.amount;
      const splitAmount = paidAmount / expense.splitBetween.length;

      if (expense.paidBy.id === userId) {
        balance += paidAmount;
      }

      if (expense.splitBetween.some(member => member.id === userId)) {
        balance -= splitAmount;
      }
    });

    return balance;
  };

  const addGroup = (groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newGroup: Group = {
      ...groupData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_GROUP', payload: newGroup });
  };

  const addExpense = (groupId: string, expenseData: Omit<Expense, 'id'>) => {
    const group = getGroupById(groupId);
    if (!group) return;
    // Use PoolUtils to add the expense and update balances
    const pool = {
      id: group.id,
      name: group.name,
      members: group.members.map(m => ({
        id: m.id,
        address: m.walletAddress,
        name: m.name,
        balance: 0, // You may want to map actual balances if you store them
      })),
      expenses: group.expenses.map(e => ({
        id: e.id,
        amount: e.amount,
        amountUsdc: e.amount, // For now, treat as USDC
        description: e.description,
        paidBy: e.paidBy.walletAddress,
        timestamp: new Date(e.date).getTime(),
        poolId: e.groupId,
      })),
      createdAt: new Date(group.createdAt).getTime(),
    };
    const updatedPool = PoolUtils.addExpense(
      pool,
      expenseData.amount, // in SOL
      expenseData.amount, // as USDC for now
      expenseData.description,
      expenseData.paidBy.walletAddress
    );
    // Convert back to Group shape
    const updatedGroup = {
      ...group,
      expenses: [
        ...group.expenses,
        {
          ...expenseData,
          id: Date.now().toString(),
        },
      ],
      // Optionally update member balances if you store them
    };
    dispatch({ type: 'UPDATE_GROUP', payload: updatedGroup });
  };

  const updateExpense = (groupId: string, expense: Expense) => {
    dispatch({ type: 'UPDATE_EXPENSE', payload: { groupId, expense } });
  };

  const deleteExpense = (groupId: string, expenseId: string) => {
    dispatch({ type: 'DELETE_EXPENSE', payload: { groupId, expenseId } });
  };

  const selectGroup = (group: Group | null) => {
    dispatch({ type: 'SELECT_GROUP', payload: group });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const authenticateUser = (user: User, method: 'wallet' | 'email' | 'guest') => {
    dispatch({ type: 'AUTHENTICATE_USER', payload: { user, method } });
  };

  const logoutUser = () => {
    dispatch({ type: 'LOGOUT_USER' });
  };

  const value: AppContextType = {
    state,
    dispatch,
    getGroupById,
    getGroupBalances,
    getTotalExpenses,
    getUserBalance,
    addGroup,
    addExpense,
    updateExpense,
    deleteExpense,
    selectGroup,
    clearError,
    authenticateUser,
    logoutUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Hook
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 