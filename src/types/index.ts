// Core entity types that match the backend database schema
// Support both SQLite (number) and Firebase (string) user IDs
export interface User {
  id: number | string; // Support both SQLite (number) and Firebase (string) IDs
  name: string;
  email: string;
  wallet_address: string;
  wallet_public_key?: string;
  wallet_secret_key?: string;
  created_at: string;
  avatar?: string; // For UI purposes, can be generated or uploaded
  hasCompletedOnboarding?: boolean; // Track if user has completed onboarding flow
}

// Group member is essentially a User but with group-specific metadata
export interface GroupMember extends User {
  joined_at: string;
  invitation_status?: 'pending' | 'accepted' | 'declined';
  invited_at?: string;
  invited_by?: string;
}

// User contact includes relationship metadata
export interface UserContact extends GroupMember {
  first_met_at: string;
  mutual_groups_count: number;
  isFavorite?: boolean;
}

// Currency information for expenses
export interface Currency {
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId?: string;
  color?: string;
}

// Expense split information
export interface ExpenseSplit {
  memberIds: number[];
  amountPerPerson?: number;
  customAmounts?: { [memberId: number]: number };
}

// Core expense entity
export interface Expense {
  id: number | string; // Support both SQLite (number) and Firebase (string) IDs
  description: string;
  amount: number;
  currency: string;
  paid_by: number | string; // Support both SQLite (number) and Firebase (string) IDs
  group_id: number | string; // Support both SQLite (number) and Firebase (string) IDs
  category: string;
  created_at: string;
  updated_at?: string;
  
  // Additional fields for UI display
  paid_by_name?: string;
  paid_by_wallet?: string;
  splitType?: 'equal' | 'manual';
  splitData?: ExpenseSplit | string; // Can be parsed JSON
}

// Transaction entity for crypto transfers
export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'deposit' | 'withdraw';
  amount: number;
  currency: string;
  from_user: string;
  to_user: string;
  from_wallet: string;
  to_wallet: string;
  tx_hash: string;
  note?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

// Expense summary by currency
export interface ExpenseByCurrency {
  currency: string;
  total_amount: number;
}

// Core group entity
export interface Group {
  id: number | string; // Support both SQLite (number) and Firebase (string) IDs
  name: string;
  description: string;
  category: string;
  currency: string;
  icon: string;
  color: string;
  created_by: number | string; // Support both SQLite (number) and Firebase (string) IDs
  created_at: string;
  updated_at: string;
  
  // Computed fields
  member_count: number;
  expense_count: number;
  expenses_by_currency: ExpenseByCurrency[];
}

// Group with additional computed data for UI
export interface GroupWithDetails extends Group {
  members: GroupMember[];
  expenses: Expense[];
  totalAmount: number;
  userBalance: number;
}

// Balance calculation result
export interface Balance {
  userId: number | string; // Support both SQLite (number) and Firebase (string) IDs
  userName: string;
  userAvatar?: string;
  amount: number;
  currency: string; // Add currency field for multi-currency support
  status: 'owes' | 'gets_back' | 'settled';
}

// Settlement calculation
export interface SettlementCalculation {
  from: string;
  to: string;
  amount: number;
  fromName: string;
  toName: string;
}

// Settlement transaction
export interface SettlementTransaction {
  userId: number | string; // Support both SQLite (number) and Firebase (string) IDs
  amount: number;
  currency: string;
  address: string;
  name: string;
}

// Settlement result
export interface SettlementResult {
  message: string;
  amountSettled?: number;
  settlements: SettlementTransaction[];
}

// Invite link data
export interface InviteLinkData {
  inviteLink: string;
  inviteCode: string;
  groupName: string;
  expiresAt: string;
}

// Notification types
export interface Notification {
  id: string | number; // Support both SQLite (number) and Firebase (string) IDs
  user_id?: number | string; // Legacy field for SQLite compatibility
  userId?: string; // Firebase field
  type: 'expense_added' | 'payment_reminder' | 'settlement_request' | 'settlement_notification' | 'funding_notification' | 'payment_request' | 'general' | 'group_invite';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

// Reminder cooldown information
export interface ReminderCooldown {
  nextAllowedAt: string;
  timeRemainingMinutes?: number;
  formattedTimeRemaining?: string;
}

// Reminder status
export interface ReminderStatus {
  individualCooldowns: { [recipientId: string]: ReminderCooldown };
  bulkCooldown: ReminderCooldown | null;
}

// Navigation parameter types
export interface NavigationParams {
  // Group-related navigation
  groupId?: number;
  groupName?: string;
  groupIcon?: string;
  groupColor?: string;
  groupData?: Partial<Group>;
  fromCreation?: boolean;
  
  // Expense-related navigation
  expense?: Expense;
  expenseId?: number;
  amount?: number;
  currency?: string;
  description?: string;
  
  // Member-related navigation
  contact?: GroupMember;
  selectedContacts?: number[];
  
  // Transaction-related navigation
  isSettlement?: boolean;
  prefilledAmount?: number;
  prefilledNote?: string;
  
  // Callbacks
  onExpenseUpdated?: () => void;
  onSettlementComplete?: () => void;
}

// API Response wrapper
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  success: boolean;
}

export interface AppState {
  // User state
  currentUser: User | null;
  isAuthenticated: boolean;
  authMethod: 'wallet' | 'email' | 'guest' | null;
  
  // Data state
  groups: GroupWithDetails[];
  selectedGroup: GroupWithDetails | null;
  notifications?: Notification[]; // Add notifications to state
  lastNotificationsFetch?: number; // Timestamp for notifications cache
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Cache timestamps for invalidation
  lastDataFetch: {
    groups: number;
    expenses: { [groupId: number]: number };
    members: { [groupId: number]: number };
  };
}

export type AppAction =
  | { type: 'SET_CURRENT_USER'; payload: User }
  | { type: 'AUTHENTICATE_USER'; payload: { user: User; method: 'wallet' | 'email' | 'guest' } }
  | { type: 'LOGOUT_USER' }
  | { type: 'SET_GROUPS'; payload: GroupWithDetails[] }
  | { type: 'ADD_GROUP'; payload: GroupWithDetails }
  | { type: 'UPDATE_GROUP'; payload: GroupWithDetails }
  | { type: 'DELETE_GROUP'; payload: number | string }
  | { type: 'SELECT_GROUP'; payload: GroupWithDetails | null }
  | { type: 'ADD_EXPENSE'; payload: { groupId: number; expense: Expense } }
  | { type: 'UPDATE_EXPENSE'; payload: { groupId: number; expense: Expense } }
  | { type: 'DELETE_EXPENSE'; payload: { groupId: number; expenseId: number } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_CACHE_TIMESTAMP'; payload: { type: 'groups' | 'expenses' | 'members'; groupId?: number; timestamp: number } }
  | { type: 'SET_NOTIFICATIONS'; payload: { notifications: Notification[]; timestamp: number } };

export interface DataTransformers {
  userToGroupMember: (user: User, joinedAt?: string) => GroupMember;
  groupMemberToUser: (member: GroupMember) => User;
  parseExpenseSplit: (splitData: string | ExpenseSplit) => ExpenseSplit;
  stringifyExpenseSplit: (split: ExpenseSplit) => string;
} 