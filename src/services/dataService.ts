import { 
  User, 
  Group, 
  GroupWithDetails, 
  GroupMember, 
  UserContact, 
  Expense, 
  ExpenseSplit,
  InviteLinkData,
  SettlementResult,
  SettlementCalculation,
  ReminderStatus,
  ApiResponse 
} from '../types';
import { apiRequest, getBackendURL } from '../config/api';
import { firebaseDataService } from './firebaseDataService';

// Enhanced cache with rate limiting protection
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes instead of 5
const RATE_LIMIT_PROTECTION = 2 * 60 * 1000; // 2 minutes minimum between requests for same endpoint
const cache = new Map<string, { data: any; timestamp: number }>();
const lastRequestTime = new Map<string, number>();

// Cache utilities
const getCacheKey = (endpoint: string, params?: any): string => {
  return params ? `${endpoint}_${JSON.stringify(params)}` : endpoint;
};

const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION;
};

const getFromCache = <T>(key: string): T | null => {
  const cached = cache.get(key);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }
  return null;
};

const setCache = <T>(key: string, data: T): void => {
  cache.set(key, { data, timestamp: Date.now() });
};

const invalidateCache = (pattern: string): void => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

// Data transformation utilities
export const dataTransformers = {
  userToGroupMember: (user: User, joinedAt?: string): GroupMember => ({
    ...user,
    joined_at: joinedAt || new Date().toISOString()
  }),

  groupMemberToUser: (member: GroupMember): User => {
    const { joined_at, ...user } = member;
    return user;
  },

  parseExpenseSplit: (splitData: string | ExpenseSplit): ExpenseSplit => {
    if (typeof splitData === 'string') {
      try {
        return JSON.parse(splitData);
      } catch {
        return { memberIds: [] };
      }
    }
    return splitData;
  },

  stringifyExpenseSplit: (split: ExpenseSplit): string => {
    return JSON.stringify(split);
  },

  // Transform backend group to frontend GroupWithDetails
  transformGroupWithDetails: (
    group: Group, 
    members: GroupMember[], 
    expenses: Expense[], 
    currentUserId?: number
  ): GroupWithDetails => {
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const userBalance = currentUserId ? calculateUserBalance(expenses, members, currentUserId) : 0;
    
    return {
      ...group,
      members,
      expenses,
      totalAmount,
      userBalance
    };
  }
};

// Balance calculation
const calculateUserBalance = (expenses: Expense[], members: GroupMember[], userId: number): number => {
  let balance = 0;
  
  expenses.forEach(expense => {
    const sharePerPerson = expense.amount / members.length; // Simplified equal split
    
    if (expense.paid_by === userId) {
      // User paid, so they should receive money back
      balance += expense.amount - sharePerPerson;
    } else {
      // Someone else paid, user owes their share
      balance -= sharePerPerson;
    }
  });
  
  return balance;
};

// Generic API request handler with enhanced caching and rate limiting
const makeApiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  useCache: boolean = true
): Promise<T> => {
  const cacheKey = getCacheKey(endpoint, options.body);
  const now = Date.now();
  
  // Check if we're making requests too frequently for this endpoint
  const lastRequest = lastRequestTime.get(cacheKey) || 0;
  const timeSinceLastRequest = now - lastRequest;
  
  if (timeSinceLastRequest < RATE_LIMIT_PROTECTION) {
    // Rate limit protection: waiting before next request
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_PROTECTION - timeSinceLastRequest));
  }
  
  // Check cache for GET requests
  if (options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE' && useCache) {
    const cached = getFromCache<T>(cacheKey);
    if (cached) {
      // Using cached data
      return cached;
    }
  }
  
  // Update last request time
  lastRequestTime.set(cacheKey, Date.now());
  
  try {
    const data = await apiRequest<T>(endpoint, options, 3); // Use 3 retries
    
    // Cache successful GET requests
    if (options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE' && useCache) {
      setCache(cacheKey, data);
    }
    
    return data;
  } catch (error) {
    // If we get a 429 error, try to return cached data if available
    if (error instanceof Error && error.message.includes('Rate limit')) {
      const cached = getFromCache<T>(cacheKey);
      if (cached) {
        // Returning cached data due to rate limit
        return cached;
      }
    }
    throw error;
  }
};

// User services
export const userService = {
  getCurrentUser: async (userId: string): Promise<User> => {
    return makeApiRequest<User>(`/api/users/${userId}`);
  },

  createUser: async (userData: Omit<User, 'id' | 'created_at'>): Promise<User> => {
    // Use Firebase's createUserIfNotExists to prevent duplicates
    return await firebaseDataService.user.createUserIfNotExists(userData);
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
    const result = await makeApiRequest<User>(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, false);
    
    invalidateCache('users');
    return result;
  }
};

// Group services
export const groupService = {
  getUserGroups: async (userId: string, forceRefresh: boolean = false): Promise<GroupWithDetails[]> => {
    const groups = await makeApiRequest<Group[]>(`/api/groups/${userId}`, {}, !forceRefresh);
    
    // Transform backend groups to GroupWithDetails, preserving all backend data
    const groupsWithDetails = groups.map((group) => {
      // Calculate total amount from expenses_by_currency if available
      const totalAmount = group.expenses_by_currency?.reduce((sum, expense) => sum + (expense.total_amount || 0), 0) || 0;
      
      // Create GroupWithDetails preserving ALL backend fields
      const groupWithDetails: GroupWithDetails = {
        id: group.id,
        name: group.name || 'Unnamed Group',
        description: group.description || '',
        category: group.category || 'general',
        currency: group.currency || 'USDC',
        icon: group.icon || 'people',
        color: group.color || '#A5EA15',
        created_by: group.created_by,
        created_at: group.created_at,
        updated_at: group.updated_at,
        
        // Preserve backend aggregated data
        member_count: group.member_count || 0,
        expense_count: group.expense_count || 0,
        expenses_by_currency: group.expenses_by_currency || [],
        
        // Add computed fields
        totalAmount,
        userBalance: 0, // Will be calculated when needed
        
        // Initialize empty arrays that will be populated on-demand
        members: [],
        expenses: []
      };
      
      return groupWithDetails;
    });
    
    return groupsWithDetails;
  },

  getGroupDetails: async (groupId: string, forceRefresh: boolean = false): Promise<GroupWithDetails> => {
    const [group, members, expenses] = await Promise.all([
      makeApiRequest<Group>(`/api/groups/${groupId}`, {}, !forceRefresh),
      groupService.getGroupMembers(groupId, !forceRefresh),
      expenseService.getGroupExpenses(groupId, !forceRefresh)
    ]);
    
    return dataTransformers.transformGroupWithDetails(group, members, expenses);
  },

  getGroupMembers: async (groupId: string, forceRefresh: boolean = false): Promise<GroupMember[]> => {
    return makeApiRequest<GroupMember[]>(`/api/groups/${groupId}/members`, {}, !forceRefresh);
  },

  createGroup: async (groupData: Omit<Group, 'id' | 'created_at' | 'updated_at' | 'member_count' | 'expense_count' | 'expenses_by_currency'>): Promise<Group> => {
    const result = await makeApiRequest<Group>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    }, false);
    
    invalidateCache('groups');
    invalidateCache('users');
    return result;
  },

  updateGroup: async (groupId: string, userId: string, updates: Partial<Group>): Promise<{ message: string; group: Group }> => {
    const result = await makeApiRequest<{ message: string; group: Group }>(`/api/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...updates }),
    }, false);
    
    invalidateCache('groups');
    invalidateCache(`group_${groupId}`);
    return result;
  },

  deleteGroup: async (groupId: string, userId: string): Promise<{ message: string }> => {
    const result = await makeApiRequest<{ message: string }>(`/api/groups/${groupId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }, false);
    
    invalidateCache('groups');
    invalidateCache(`group_${groupId}`);
    return result;
  },

  getUserContacts: async (userId: string, forceRefresh: boolean = false): Promise<UserContact[]> => {
    return makeApiRequest<UserContact[]>(`/api/users/${userId}/contacts`, {}, !forceRefresh);
  },

  generateInviteLink: async (groupId: string, userId: string): Promise<InviteLinkData> => {
    return makeApiRequest<InviteLinkData>(`/api/groups/${groupId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }, false);
  },

  joinGroupViaInvite: async (inviteCode: string, userId: string): Promise<{ message: string; groupId: number; groupName: string }> => {
    const result = await makeApiRequest<{ message: string; groupId: number; groupName: string }>(`/api/groups/join/${inviteCode}`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }, false);
    
    invalidateCache('groups');
    return result;
  },

  leaveGroup: async (groupId: string, userId: string): Promise<{ message: string }> => {
    const result = await makeApiRequest<{ message: string }>(`/api/groups/${groupId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }, false);
    
    invalidateCache('groups');
    invalidateCache(`group_${groupId}`);
    return result;
  }
};

// Expense services
export const expenseService = {
  getGroupExpenses: async (groupId: string, forceRefresh: boolean = false): Promise<Expense[]> => {
    return makeApiRequest<Expense[]>(`/api/expenses/${groupId}`, {}, !forceRefresh);
  },

  createExpense: async (expenseData: any): Promise<Expense> => {
    // Transform snake_case to camelCase for backend API
    const backendData = {
      description: expenseData.description,
      amount: expenseData.amount,
      currency: expenseData.currency,
      paidBy: expenseData.paidBy || expenseData.paid_by,
      groupId: expenseData.groupId || expenseData.group_id,
      category: expenseData.category,
      splitType: expenseData.splitType,
      splitData: expenseData.splitData
    };
    
    const result = await makeApiRequest<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(backendData),
    }, false);
    
    invalidateCache('expenses');
    invalidateCache('groups');
    invalidateCache(`group_${backendData.groupId}`);
    return result;
  },

  updateExpense: async (expenseId: number, updates: Partial<Expense>): Promise<Expense> => {
    const result = await makeApiRequest<Expense>(`/api/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, false);
    
    invalidateCache('expenses');
    invalidateCache('groups');
    if (result.group_id) {
      invalidateCache(`group_${result.group_id}`);
    }
    return result;
  },

  deleteExpense: async (expenseId: number): Promise<{ message: string }> => {
    const result = await makeApiRequest<{ message: string }>(`/api/expenses/${expenseId}`, {
      method: 'DELETE',
    }, false);
    
    invalidateCache('expenses');
    invalidateCache('groups');
    return result;
  }
};

// Settlement services
export const settlementService = {
  getSettlementCalculation: async (groupId: string): Promise<SettlementCalculation[]> => {
    return makeApiRequest<SettlementCalculation[]>(`/api/groups/${groupId}/settlement-calculation`);
  },

  settleGroupExpenses: async (groupId: string, userId: string, settlementType: 'individual' | 'full' = 'individual'): Promise<SettlementResult> => {
    const result = await makeApiRequest<SettlementResult>(`/api/groups/${groupId}/settle`, {
      method: 'POST',
      body: JSON.stringify({ userId, settlementType }),
    }, false);
    
    invalidateCache('groups');
    invalidateCache(`group_${groupId}`);
    return result;
  },

  recordPersonalSettlement: async (
    groupId: string,
    userId: string,
    recipientId: string,
    amount: number,
    currency: string = 'USDC'
  ): Promise<{ success: boolean; message: string }> => {
    const result = await makeApiRequest<{ success: boolean; message: string }>(`/api/groups/${groupId}/record-settlement`, {
      method: 'POST',
      body: JSON.stringify({ userId, recipientId, amount, currency }),
    }, false);
    
    invalidateCache('groups');
    invalidateCache(`group_${groupId}`);
    return result;
  },

  getReminderStatus: async (groupId: string, userId: string): Promise<ReminderStatus> => {
    return makeApiRequest<ReminderStatus>(`/api/groups/${groupId}/reminder-status?userId=${userId}`);
  },

  sendPaymentReminder: async (
    groupId: string,
    senderId: string,
    recipientId: string,
    amount: number
  ): Promise<{ success: boolean; message: string; recipientName: string; amount: number }> => {
    return makeApiRequest<{ success: boolean; message: string; recipientName: string; amount: number }>(`/api/groups/${groupId}/send-reminder`, {
      method: 'POST',
      body: JSON.stringify({ senderId, recipientId, amount }),
    }, false);
  },

  sendBulkPaymentReminders: async (
    groupId: string,
    senderId: string,
    debtors: { recipientId: string; amount: number; name: string }[]
  ): Promise<{ 
    success: boolean; 
    message: string; 
    results: { recipientId: string; recipientName: string; amount: number; success: boolean }[];
    totalAmount: number;
  }> => {
    return makeApiRequest<{ 
      success: boolean; 
      message: string; 
      results: { recipientId: string; recipientName: string; amount: number; success: boolean }[];
      totalAmount: number;
    }>(`/api/groups/${groupId}/send-reminder-all`, {
      method: 'POST',
      body: JSON.stringify({ senderId, debtors }),
    }, false);
  }
};

// Cache management utilities
export const cacheManager = {
  clearAll: (): void => {
    cache.clear();
  },

  clearPattern: (pattern: string): void => {
    invalidateCache(pattern);
  },

  clearGroup: (groupId: number): void => {
    invalidateCache(`group_${groupId}`);
    invalidateCache('groups');
  },

  clearUser: (userId: number): void => {
    invalidateCache(`user_${userId}`);
    invalidateCache('users');
  },

  getCacheStats: (): { size: number; keys: string[] } => {
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    };
  }
};

// Export centralized data service
export const dataService = {
  user: userService,
  group: groupService,
  expense: expenseService,
  settlement: settlementService,
  cache: cacheManager,
  transformers: dataTransformers
}; 