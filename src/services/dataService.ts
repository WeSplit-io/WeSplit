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

// Backend URL configuration
const BACKEND_URL = 'http://192.168.1.75:4000';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

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

// Generic API request handler
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  useCache: boolean = true
): Promise<T> => {
  const cacheKey = getCacheKey(endpoint, options.body);
  
  // Check cache for GET requests
  if (options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE' && useCache) {
    const cached = getFromCache<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  const url = `${BACKEND_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Cache successful GET requests
  if (options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE' && useCache) {
    setCache(cacheKey, data);
  }
  
  return data;
};

// User services
export const userService = {
  getCurrentUser: async (userId: string): Promise<User> => {
    return apiRequest<User>(`/api/users/${userId}`);
  },

  createUser: async (userData: Omit<User, 'id' | 'created_at'>): Promise<User> => {
    const result = await apiRequest<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }, false);
    
    invalidateCache('users');
    return result;
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
    const result = await apiRequest<User>(`/api/users/${userId}`, {
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
    const groups = await apiRequest<Group[]>(`/api/groups/${userId}`, {}, !forceRefresh);
    
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
      apiRequest<Group>(`/api/groups/${groupId}`, {}, !forceRefresh),
      groupService.getGroupMembers(groupId, !forceRefresh),
      expenseService.getGroupExpenses(groupId, !forceRefresh)
    ]);
    
    return dataTransformers.transformGroupWithDetails(group, members, expenses);
  },

  getGroupMembers: async (groupId: string, forceRefresh: boolean = false): Promise<GroupMember[]> => {
    return apiRequest<GroupMember[]>(`/api/groups/${groupId}/members`, {}, !forceRefresh);
  },

  createGroup: async (groupData: Omit<Group, 'id' | 'created_at' | 'updated_at' | 'member_count' | 'expense_count' | 'expenses_by_currency'>): Promise<Group> => {
    const result = await apiRequest<Group>('/api/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    }, false);
    
    invalidateCache('groups');
    invalidateCache('users');
    return result;
  },

  updateGroup: async (groupId: string, userId: string, updates: Partial<Group>): Promise<{ message: string; group: Group }> => {
    const result = await apiRequest<{ message: string; group: Group }>(`/api/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...updates }),
    }, false);
    
    invalidateCache('groups');
    invalidateCache(`group_${groupId}`);
    return result;
  },

  deleteGroup: async (groupId: string, userId: string): Promise<{ message: string }> => {
    const result = await apiRequest<{ message: string }>(`/api/groups/${groupId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }, false);
    
    invalidateCache('groups');
    invalidateCache(`group_${groupId}`);
    return result;
  },

  getUserContacts: async (userId: string, forceRefresh: boolean = false): Promise<UserContact[]> => {
    return apiRequest<UserContact[]>(`/api/users/${userId}/contacts`, {}, !forceRefresh);
  },

  generateInviteLink: async (groupId: string, userId: string): Promise<InviteLinkData> => {
    return apiRequest<InviteLinkData>(`/api/groups/${groupId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }, false);
  },

  joinGroupViaInvite: async (inviteCode: string, userId: string): Promise<{ message: string; groupId: number; groupName: string }> => {
    const result = await apiRequest<{ message: string; groupId: number; groupName: string }>(`/api/groups/join/${inviteCode}`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }, false);
    
    invalidateCache('groups');
    invalidateCache('users');
    return result;
  }
};

// Expense services
export const expenseService = {
  getGroupExpenses: async (groupId: string, forceRefresh: boolean = false): Promise<Expense[]> => {
    return apiRequest<Expense[]>(`/api/expenses/${groupId}`, {}, !forceRefresh);
  },

  createExpense: async (expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    const result = await apiRequest<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    }, false);
    
    invalidateCache('expenses');
    invalidateCache('groups');
    invalidateCache(`group_${expenseData.group_id}`);
    return result;
  },

  updateExpense: async (expenseId: number, updates: Partial<Expense>): Promise<Expense> => {
    const result = await apiRequest<Expense>(`/api/expenses/${expenseId}`, {
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
    const result = await apiRequest<{ message: string }>(`/api/expenses/${expenseId}`, {
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
    return apiRequest<SettlementCalculation[]>(`/api/groups/${groupId}/settlement-calculation`);
  },

  settleGroupExpenses: async (groupId: string, userId: string, settlementType: 'individual' | 'full' = 'individual'): Promise<SettlementResult> => {
    const result = await apiRequest<SettlementResult>(`/api/groups/${groupId}/settle`, {
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
    const result = await apiRequest<{ success: boolean; message: string }>(`/api/groups/${groupId}/record-settlement`, {
      method: 'POST',
      body: JSON.stringify({ userId, recipientId, amount, currency }),
    }, false);
    
    invalidateCache('groups');
    invalidateCache(`group_${groupId}`);
    return result;
  },

  getReminderStatus: async (groupId: string, userId: string): Promise<ReminderStatus> => {
    return apiRequest<ReminderStatus>(`/api/groups/${groupId}/reminder-status?userId=${userId}`);
  },

  sendPaymentReminder: async (
    groupId: string,
    senderId: string,
    recipientId: string,
    amount: number
  ): Promise<{ success: boolean; message: string; recipientName: string; amount: number }> => {
    return apiRequest<{ success: boolean; message: string; recipientName: string; amount: number }>(`/api/groups/${groupId}/send-reminder`, {
      method: 'POST',
      body: JSON.stringify({ senderId, recipientId, amount }),
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