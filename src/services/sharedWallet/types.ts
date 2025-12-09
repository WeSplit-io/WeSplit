/**
 * Shared Wallet Types
 * Type definitions for shared wallet/account feature
 * Separate from split wallets to maintain clear boundaries
 */

/**
 * Shared Wallet - A persistent shared account for ongoing expenses
 * Unlike splits which are bill-based, shared wallets are long-lived accounts
 */
export interface SharedWallet {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  walletAddress: string;
  publicKey: string;
  // SECURITY: Private key is stored encrypted in Firebase (sharedWalletPrivateKeys collection)
  // All members can access it using the secure encryption system
  totalBalance: number; // Current balance in the shared wallet
  currency: string; // Default: 'USDC'
  status: 'active' | 'paused' | 'archived';
  members: SharedWalletMember[];
  createdAt: string;
  updatedAt: string;
  firebaseDocId?: string; // Firebase document ID for direct access
  settings?: SharedWalletSettings;
  customColor?: string; // Custom color for the wallet (hex)
  customLogo?: string; // Custom logo URL or emoji
}

/**
 * Member permissions for shared wallet operations
 */
export interface SharedWalletMemberPermissions {
  canInviteMembers: boolean; // Can invite new members
  canWithdraw: boolean; // Can withdraw funds
  canManageSettings: boolean; // Can modify wallet settings
  canRemoveMembers: boolean; // Can remove other members
  canViewTransactions: boolean; // Can view transaction history
  canFund: boolean; // Can add funds to wallet
  withdrawalLimit?: number; // Maximum withdrawal amount per transaction (optional)
  dailyWithdrawalLimit?: number; // Maximum withdrawal amount per day (optional)
}

/**
 * Member of a shared wallet
 * Tracks individual contributions and access
 */
export interface SharedWalletMember {
  userId: string;
  name: string;
  walletAddress: string; // User's personal wallet address
  role: 'creator' | 'admin' | 'member';
  totalContributed: number; // Total amount this member has contributed
  totalWithdrawn: number; // Total amount this member has withdrawn
  joinedAt: string;
  status: 'active' | 'invited' | 'left';
  linkedCards?: string[]; // IDs of linked cards this member can use
  permissions?: SharedWalletMemberPermissions; // Custom permissions (overrides role defaults)
}

/**
 * Error handling utilities for shared wallet services
 */
export class SharedWalletError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'SharedWalletError';
  }
}

export const SHARED_WALLET_ERROR_CODES = {
  // Validation errors
  INVALID_PARAMS: 'INVALID_PARAMS',
  NAME_TOO_LONG: 'NAME_TOO_LONG',
  NAME_REQUIRED: 'NAME_REQUIRED',
  CREATOR_REQUIRED: 'CREATOR_REQUIRED',
  MEMBERS_REQUIRED: 'MEMBERS_REQUIRED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  NOT_A_MEMBER: 'NOT_A_MEMBER',
  NOT_ACTIVE_MEMBER: 'NOT_ACTIVE_MEMBER',

  // Transaction errors
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  BLOCKCHAIN_ERROR: 'BLOCKCHAIN_ERROR',

  // Access errors
  PRIVATE_KEY_ACCESS_DENIED: 'PRIVATE_KEY_ACCESS_DENIED',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',

  // Permission errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // System errors
  FIRESTORE_ERROR: 'FIRESTORE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Utility functions for consistent error handling
 */
export const SharedWalletErrors = {
  /**
   * Create a standardized error result
   */
  createError: (
    code: keyof typeof SHARED_WALLET_ERROR_CODES,
    message: string,
    context?: Record<string, any>
  ): ErrorResult => ({
    success: false,
    error: message,
    code: SHARED_WALLET_ERROR_CODES[code],
    context,
  }),

  /**
   * Create a standardized success result
   */
  createSuccess: <T>(data: T): SuccessResult<T> => ({
    success: true,
    data,
  }),

};

/**
 * Standard error response interface
 */
export interface ErrorResult {
  success: false;
  error: string;
  code?: string;
  context?: Record<string, any>;
}

/**
 * Success response interface
 */
export interface SuccessResult<T = any> {
  success: true;
  data: T;
}

/**
 * Standard result type that can be either success or error
 */
export type ServiceResult<T = any> = SuccessResult<T> | ErrorResult;

/**
 * Shared wallet constants and limits
 */
export const SHARED_WALLET_CONSTANTS = {
  // Name limits
  MAX_WALLET_NAME_LENGTH: 100,
  MIN_WALLET_NAME_LENGTH: 1,

  // Balance and transaction limits
  MAX_TRANSACTION_HISTORY_LIMIT: 100,
  RECENT_WALLETS_LIMIT: 100,
  USDC_DECIMALS: 6,

  // Default values
  DEFAULT_CURRENCY: 'USDC' as const,
  DEFAULT_ALLOW_MEMBER_INVITES: true,
  DEFAULT_REQUIRE_APPROVAL_FOR_WITHDRAWALS: false,

  // Status values
  MEMBER_STATUS_ACTIVE: 'active' as const,
  MEMBER_STATUS_INVITED: 'invited' as const,
  MEMBER_STATUS_LEFT: 'left' as const,

  // Role values
  ROLE_CREATOR: 'creator' as const,
  ROLE_ADMIN: 'admin' as const,
  ROLE_MEMBER: 'member' as const,

  // Transaction types
  TRANSACTION_TYPE_FUNDING: 'funding' as const,
  TRANSACTION_TYPE_WITHDRAWAL: 'withdrawal' as const,

  // Status values
  WALLET_STATUS_ACTIVE: 'active' as const,
  WALLET_STATUS_PAUSED: 'paused' as const,
  WALLET_STATUS_ARCHIVED: 'archived' as const,
} as const;

/**
 * Shared wallet settings
 */
export interface SharedWalletSettings {
  allowMemberInvites: boolean; // Whether members can invite others
  requireApprovalForWithdrawals: boolean; // Whether withdrawals need creator approval
  maxMembers?: number; // Maximum number of members allowed
  autoTopUpEnabled?: boolean; // Whether to enable automatic top-up
  autoTopUpThreshold?: number; // Balance threshold for auto top-up
  autoTopUpAmount?: number; // Amount to top up when threshold is reached
  goalAmount?: number; // Target amount for shared wallet goal
  goalReachedAt?: string; // Timestamp when goal was reached
  goalNotificationSent?: boolean; // Whether goal reached notification was sent
  defaultMemberPermissions?: Partial<SharedWalletMemberPermissions>; // Default permissions for new members
  enableCustomPermissions?: boolean; // Whether to allow custom permissions per member
}

/**
 * Shared wallet creation parameters
 */
export interface CreateSharedWalletParams {
  name: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  creatorWalletAddress: string;
  initialMembers: Omit<SharedWalletMember, 'totalContributed' | 'totalWithdrawn' | 'joinedAt' | 'status'>[];
  currency?: string;
  settings?: Partial<SharedWalletSettings>;
}

/**
 * Shared wallet creation result
 */
export interface SharedWalletResult {
  success: boolean;
  wallet?: SharedWallet;
  error?: string;
}

/**
 * Shared wallet funding source
 */
export type SharedWalletFundingSource = 
  | 'in-app-wallet' 
  | 'external-wallet' 
  | 'moonpay';

/**
 * Shared wallet funding parameters
 */
export interface FundSharedWalletParams {
  sharedWalletId: string;
  userId: string;
  amount: number;
  source: SharedWalletFundingSource;
  sourceAddress?: string; // For external wallet transfers
  memo?: string;
}

/**
 * Shared wallet funding result
 */
export interface FundSharedWalletResult {
  success: boolean;
  transactionSignature?: string;
  newBalance?: number;
  error?: string;
  message?: string;
}

/**
 * Shared wallet withdrawal parameters
 */
export interface WithdrawFromSharedWalletParams {
  sharedWalletId: string;
  userId: string;
  amount: number;
  destination: 'linked-card' | 'personal-wallet';
  destinationId?: string; // Card ID or wallet address
  memo?: string;
}

/**
 * Shared wallet withdrawal result
 */
export interface WithdrawFromSharedWalletResult {
  success: boolean;
  transactionSignature?: string;
  newBalance?: number;
  error?: string;
  message?: string;
}

/**
 * Shared wallet invitation parameters
 */
export interface InviteToSharedWalletParams {
  sharedWalletId: string;
  inviterId: string;
  inviteeIds: string[]; // Array of user IDs to invite
}

/**
 * Shared wallet invitation result
 */
export interface InviteToSharedWalletResult {
  success: boolean;
  invitedCount?: number;
  error?: string;
  message?: string;
}

/**
 * Update shared wallet settings parameters
 */
export interface UpdateSharedWalletSettingsParams {
  sharedWalletId: string;
  userId: string;
  customColor?: string;
  customLogo?: string;
  settings?: Partial<SharedWalletSettings>;
}

/**
 * Update shared wallet settings result
 */
export interface UpdateSharedWalletSettingsResult {
  success: boolean;
  error?: string;
}

/**
 * Shared wallet transaction
 * Tracks all transactions (funding, withdrawals, transfers)
 */
export interface SharedWalletTransaction {
  id: string;
  sharedWalletId: string;
  type: 'funding' | 'withdrawal' | 'transfer' | 'fee';
  userId: string;
  userName: string;
  amount: number;
  currency: string;
  transactionSignature: string;
  status: 'pending' | 'confirmed' | 'failed';
  memo?: string;
  createdAt: string;
  confirmedAt?: string;
  source?: SharedWalletFundingSource;
  destination?: string;
  firebaseDocId?: string;
}

/**
 * Result type for getSharedWalletTransactions
 */
export interface GetSharedWalletTransactionsResult {
  success: boolean;
  transactions?: SharedWalletTransaction[];
  error?: string;
}

