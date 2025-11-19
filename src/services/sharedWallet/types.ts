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
 * Member of a shared wallet
 * Tracks individual contributions and access
 */
export interface SharedWalletMember {
  userId: string;
  name: string;
  walletAddress: string; // User's personal wallet address
  role: 'creator' | 'member';
  totalContributed: number; // Total amount this member has contributed
  totalWithdrawn: number; // Total amount this member has withdrawn
  joinedAt: string;
  status: 'active' | 'invited' | 'left';
  linkedCards?: string[]; // IDs of linked cards this member can use
}

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

