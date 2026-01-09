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
  status?: 'active' | 'deleted' | 'suspended'; // User account status
  
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
  
  // Phone authentication fields
  phone?: string; // Phone number in E.164 format
  phoneVerified?: boolean; // Phone verification status
  primary_phone?: string; // Primary phone for identification (similar to primary_email)
  
  // Reward system fields
  points?: number; // Total points accumulated
  total_points_earned?: number; // Lifetime points (for stats)
  points_last_updated?: string; // Timestamp when points were last updated
  is_partnership?: boolean; // Partnership status for enhanced rewards
  referral_code?: string; // User's referral code
  referred_by?: string; // User ID who referred this user (internal tracking only, not displayed)
  referral_count?: number; // Total number of successful referrals (for referring user)
  referral_code_last_used_at?: string; // Timestamp when referral code was last used
  
  // Christmas calendar rewards
  badges?: string[]; // Array of badge IDs earned
  active_badge?: string; // Currently active badge ID
  profile_assets?: string[]; // Array of profile asset IDs owned
  active_profile_asset?: string; // Currently active profile asset ID
  profile_borders?: string[]; // Array of profile border asset IDs owned
  active_profile_border?: string; // Currently active profile border asset ID
  wallet_backgrounds?: string[]; // Array of wallet background asset IDs owned
  active_wallet_background?: string; // Currently active wallet background asset ID
  show_badges_on_profile?: boolean; // Whether to show badges on profile (default: true)
}

// User contact includes relationship metadata
export interface UserContact extends User {
  first_met_at: string;
  isFavorite?: boolean;
}

// Currency information
export interface Currency {
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId?: string;
  color?: string;
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
  company_fee?: number;
  net_amount?: number;
  gas_fee?: number;
  blockchain_network?: string;
  confirmation_count?: number;
  block_height?: number;
  // User-friendly display names
  recipient_name?: string;
  sender_name?: string;
  // Additional transaction metadata
  group_id?: string;
  transaction_method?: string;
  app_version?: string;
  device_info?: string;
  gas_fee_covered_by_company?: boolean;
}

// Transaction summary for UI display
export interface TransactionSummary {
  total_sent: number;
  total_received: number;
  total_amount: number;
}

// Navigation parameter types
export interface NavigationParams {
  // Transaction-related navigation
  transactionId?: string;
  amount?: number;
  currency?: string;
  recipientId?: string;
  recipientName?: string;
  recipientWallet?: string;
  note?: string;
  description?: string;
  
  // Contact-related navigation
  contact?: UserContact;
  selectedContacts?: string[];
  
  // Split-related navigation
  splitId?: string;
  splitData?: any;
  
  // General navigation
  screen?: string;
  params?: any;
}

// App state interface
export interface AppState {
  // User state
  currentUser: User | null;
  isAuthenticated: boolean;
  authMethod: 'wallet' | 'email' | 'phone' | 'guest' | 'social' | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Cache timestamps for invalidation
  lastDataFetch: Record<string, number>;
  
  // Notifications
  notifications: NotificationData[];
  lastNotificationsFetch: number;
}

// App action types
export type AppAction =
  | { type: 'SET_CURRENT_USER'; payload: User }
  | { type: 'AUTHENTICATE_USER'; payload: { user: User; method: 'wallet' | 'email' | 'phone' | 'guest' | 'social' } }
  | { type: 'LOGOUT_USER' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_CACHE_TIMESTAMP'; payload: { type: string; timestamp: number } }
  | { type: 'SET_NOTIFICATIONS'; payload: { notifications: NotificationData[]; timestamp: number } };

// Re-export unified notification types
export { NotificationType, NotificationData as Notification, NotificationPayload } from './notifications';

// Data transformers interface
export interface DataTransformers {
  userToContact: (user: User, firstMetAt?: string) => UserContact;
  contactToUser: (contact: UserContact) => User;
}

// Export all types
export * from './unified';
export { 
  BillParticipant, BillItem, OCRProcessingResult, BillSplitCreationData,
  ProcessedBillData, BillAnalysisData, BillSettings, BillSplitSummary
} from './billSplitting';
export type { NotificationData } from './notificationTypes';
export type { BillAnalysisResult } from './billAnalysis';