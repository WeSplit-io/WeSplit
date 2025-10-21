/**
 * Standardized Data Structures for WeSplit
 * Ensures consistency across all services and components
 */

// ===== PAYMENT REQUEST INTERFACES =====

export interface StandardizedPaymentRequest {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  description?: string;
  groupId?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
  senderName?: string;
  recipientName?: string;
  transactionId?: string;
}

export interface PaymentRequestResult {
  success: boolean;
  requestId?: string;
  transactionId?: string;
  error?: string;
}

// ===== TRANSACTION INTERFACES =====

export interface StandardizedTransaction {
  id: string;
  type: 'send' | 'receive' | 'split_funding' | 'split_withdrawal' | 'settlement';
  amount: number;
  currency: string;
  from_user: string;
  to_user: string;
  from_wallet: string;
  to_wallet: string;
  tx_hash: string;
  note?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  group_id?: string;
  company_fee?: number;
  net_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionResult {
  signature: string;
  txId: string;
  success: boolean;
  error?: string;
  companyFee?: number;
  netAmount?: number;
}

// ===== NOTIFICATION INTERFACES =====

export interface StandardizedNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data: NotificationData;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

export type NotificationType = 
  | 'general'
  | 'payment_received'
  | 'payment_sent'
  | 'split_payment_required'
  | 'split_completed'
  | 'group_invite'
  | 'payment_request'
  | 'settlement_request'
  | 'money_sent'
  | 'money_received'
  | 'split_spin_available'
  | 'split_loser'
  | 'split_winner'
  | 'group_added'
  | 'system_warning'
  | 'payment_reminder'
  | 'split_invite'
  | 'group_payment_request'
  | 'system_notification'
  | 'degen_all_locked'
  | 'degen_ready_to_roll'
  | 'roulette_result'
  | 'split_lock_required'
  | 'contact_added';

export interface NotificationData {
  // Core request data
  requestId?: string;
  expenseId?: string;
  splitId?: string;
  
  // User identification (standardized field names)
  senderId: string;
  senderName: string;
  
  // Payment data
  amount: number;
  currency: string;
  description?: string;
  
  // Group context
  groupId?: string;
  groupName?: string;
  
  // Status
  status?: string;
  
  // Additional context
  [key: string]: any;
}

// ===== WALLET INTERFACES =====

export interface StandardizedWalletInfo {
  address: string;
  publicKey: string;
  secretKey?: string; // Only available in secure contexts
  balance: number;
  currency: string;
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletBalance {
  address: string;
  balance: number;
  currency: string;
  lastUpdated: string;
}

export interface UsdcBalanceResult {
  success: boolean;
  balance: number;
  error?: string;
}

export interface GasCheckResult {
  hasSufficient: boolean;
  currentSol: number;
  requiredSol: number;
}

// ===== SPLIT WALLET INTERFACES =====

export interface StandardizedSplitWallet {
  id: string;
  type: 'fair' | 'degen';
  creatorId: string;
  billId?: string;
  totalAmount: number;
  currency: string;
  status: 'active' | 'completed' | 'cancelled';
  participants: StandardizedSplitParticipant[];
  created_at: string;
  updated_at: string;
  firebaseDocId?: string;
}

export interface StandardizedSplitParticipant {
  userId: string;
  userName: string;
  amountOwed: number;
  amountPaid: number;
  status: 'pending' | 'paid' | 'locked' | 'withdrawn';
  walletAddress?: string;
  joined_at: string;
  updated_at: string;
}

// ===== ERROR INTERFACES =====

export interface StandardizedError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: string;
}

// ===== API RESPONSE INTERFACES =====

export interface StandardizedApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: StandardizedError;
  timestamp: string;
}

// ===== VALIDATION INTERFACES =====

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// ===== UTILITY TYPES =====

export type Currency = 'USDC' | 'SOL';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type PaymentRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type SplitWalletStatus = 'active' | 'completed' | 'cancelled';
export type ParticipantStatus = 'pending' | 'paid' | 'locked' | 'withdrawn';

// ===== EXPORT ALL INTERFACES =====

export * from './standardized';
