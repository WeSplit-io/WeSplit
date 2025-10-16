// Core entity types for Firebase-only architecture
export interface User {
  id: string; // Firebase document ID
  name: string;
  email: string;
  wallet_address: string;
  wallet_public_key?: string;
  // ❌ REMOVED: wallet_secret_key - Private keys should NEVER be stored in database
  created_at: string;
  avatar?: string; // For UI purposes, can be generated or uploaded
  hasCompletedOnboarding?: boolean; // Track if user has completed onboarding flow
  
  // Wallet management tracking
  wallet_status?: 'healthy' | 'needs_fix' | 'no_wallet' | 'fixing' | 'error';
  wallet_created_at?: string;
  wallet_last_fixed_at?: string;
  wallet_fix_attempts?: number;
  wallet_has_private_key?: boolean; // Boolean flag only - actual private key stored on device
  wallet_has_seed_phrase?: boolean;
  wallet_type?: 'app-generated' | 'external' | 'migrated';
  wallet_migration_status?: 'none' | 'in_progress' | 'completed' | 'failed';
  
  // Migration and consistency tracking
  firebase_uid?: string; // Track Firebase UID for consistency
  primary_email?: string; // Primary email for identification
  email_verified?: boolean;
  migration_completed?: string; // Timestamp when migration was completed
  migration_version?: string; // Migration version
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
  id: string; // Firebase document ID
  description: string;
  amount: number;
  currency: string;
  paid_by: string; // Firebase user ID
  group_id: string; // Firebase group ID
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
  // Additional fields for enhanced transaction tracking
  group_id?: string | null;
  company_fee?: number;
  net_amount?: number;
  gas_fee?: number;
  gas_fee_covered_by_company?: boolean;
  recipient_name?: string;
  sender_name?: string;
  transaction_method?: 'app_wallet' | 'external_wallet';
  app_version?: string;
  device_info?: string;
}

// Expense summary by currency
export interface ExpenseByCurrency {
  currency: string;
  total_amount: number;
}

// Core group entity
export interface Group {
  id: string; // Firebase document ID
  name: string;
  description: string;
  category: string;
  currency: string;
  icon: string;
  color: string;
  created_by: string; // Firebase user ID
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
  userId: string; // Firebase user ID
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
  userId: string; // Firebase user ID
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
  inviteId: string;
  groupName: string;
  expiresAt: string;
}

// Notification types
export interface Notification {
  id: string; // Firebase document ID
  userId: string; // Firebase user ID
  type: 'payment_reminder' | 'payment_request' | 'general' | 'payment_received' | 'system_warning' | 'system_notification' | 'money_sent' | 'money_received' | 'split_invite' | 'split_completed' | 'split_winner' | 'split_loser' | 'split_spin_available' | 'split_lock_required' | 'degen_all_locked' | 'degen_ready_to_roll' | 'roulette_result' | 'contact_added';
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
  authMethod: 'wallet' | 'email' | 'guest' | 'social' | null;
  
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
  | { type: 'AUTHENTICATE_USER'; payload: { user: User; method: 'wallet' | 'email' | 'guest' | 'social' } }
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