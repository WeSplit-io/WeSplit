/**
 * Unified Type Definitions for WeSplit
 * Consolidates all duplicate interfaces and types into a single source of truth
 */

// ============================================================================
// BILL SPLITTING TYPES
// ============================================================================

/**
 * Unified BillItem interface - consolidates all BillItem definitions
 */
export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
  participants: string[]; // User IDs who are splitting this item
}

/**
 * Unified BillParticipant interface - consolidates all BillParticipant definitions
 */
export interface BillParticipant {
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  walletAddress: string;
  status: 'pending' | 'accepted' | 'declined';
  amountOwed: number;
  items: string[]; // Bill item IDs this participant is responsible for
  joinedAt?: string;
  respondedAt?: string;
}

/**
 * Bill Split Settings
 */
export interface BillSplitSettings {
  allowPartialPayments: boolean;
  requireAllAccept: boolean;
  autoCalculate: boolean;
  splitMethod: 'equal' | 'by_items' | 'manual' | 'custom';
  taxIncluded: boolean;
}

/**
 * Processed Bill Data for split creation
 */
export interface ProcessedBillData {
  id: string;
  title: string;
  merchant: string;
  location: string;
  date: string;
  time: string;
  currency: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  items: BillItem[];
  participants: BillParticipant[];
  settings: BillSplitSettings;
  originalAnalysis?: any;
}

/**
 * Bill Analysis Result
 */
export interface BillAnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  confidence: number;
  rawText?: string;
}

// ============================================================================
// WALLET TYPES
// ============================================================================

/**
 * Unified WalletInfo interface - consolidates all WalletInfo definitions
 */
export interface WalletInfo {
  address: string;
  publicKey: string;
  secretKey?: string;
  balance?: number;
  usdcBalance?: number;
  walletName?: string;
  walletType?: 'app-generated' | 'external' | 'migrated';
  isConnected?: boolean;
}

/**
 * User Wallet Balance
 */
export interface UserWalletBalance {
  solBalance: number;
  usdcBalance: number;
  totalUSD: number;
  address: string;
  isConnected: boolean;
}

/**
 * Wallet Provider Interface
 */
export interface WalletProvider {
  name: string;
  icon: string;
  logoUrl: string;
  isAvailable: boolean;
  connect(): Promise<WalletInfo>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

/**
 * Transaction Parameters
 */
export interface TransactionParams {
  to: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  memo?: string;
  priority?: 'low' | 'medium' | 'high';
  userId?: string;
  transactionType?: 'send' | 'receive' | 'split' | 'settlement' | 'default';
}

/**
 * Transaction Result
 */
export interface TransactionResult {
  signature: string;
  txId: string;
  success: boolean;
  error?: string;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * Notification Data
 */
export interface NotificationData {
  id: string;
  type: 'settlement_request' | 'settlement_notification' | 'funding_notification' | 
        'payment_request' | 'payment_reminder' | 'general' | 'expense_added' | 
        'group_invite' | 'split_invite' | 'split_confirmed' | 'payment_received' | 
        'group_payment_request' | 'group_added' | 'system_warning' | 
        'system_notification' | 'money_sent' | 'money_received' | 
        'group_payment_sent' | 'group_payment_received' | 'split_completed' | 
        'degen_all_locked' | 'degen_ready_to_roll' | 'roulette_result' | 
        'contact_added' | 'split_spin_available' | 'split_winner' | 
        'split_loser' | 'split_lock_required';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  status?: 'pending' | 'paid' | 'cancelled';
  data?: {
    amount?: number;
    currency?: string;
    sender?: string;
    requester?: string;
    senderAvatar?: string;
    requesterAvatar?: string;
    groupName?: string;
    groupId?: string;
    addedBy?: string;
    addedByAvatar?: string;
    inviteLink?: string;
    invitedBy?: string;
    invitedByName?: string;
    expiresAt?: string;
    transactionId?: string;
    senderName?: string;
    recipientName?: string;
    status?: string;
    warningType?: string;
    severity?: string;
    splitWalletId?: string;
    billName?: string;
    splitId?: string;
    totalAmount?: number;
    inviterName?: string;
    inviterId?: string;
    participantAmount?: number;
    creatorName?: string;
    creatorId?: string;
    splitWalletAddress?: string;
    loserId?: string;
    loserName?: string;
    addedByName?: string;
    addedAt?: string;
    type?: string;
  };
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

/**
 * Unified Bill Data for Navigation
 */
export interface UnifiedBillData {
  id: string;
  title: string;
  totalAmount: number;
  currency: string;
  date: string;
  merchant?: string;
  location?: string;
  items?: BillItem[];
  participants?: BillParticipant[];
  billImageUrl?: string;
  settings?: BillSplitSettings;
}

/**
 * Unified Participant Data
 */
export interface UnifiedParticipant {
  id: string;
  userId: string;
  name: string;
  email: string;
  walletAddress: string;
  amountOwed: number;
  status: 'pending' | 'accepted' | 'declined';
}

// ============================================================================
// COMMON UTILITY TYPES
// ============================================================================

/**
 * Data Source Result
 */
export interface DataSourceResult<T> {
  data: T;
  source: string;
  isFallback: boolean;
}

/**
 * API Response
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Loading State
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Pagination
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
