/**
 * Centralized Transaction Types
 * Types for context-based transaction handling
 */

export type TransactionContext =
  | 'send_1to1'
  | 'fair_split_contribution'
  | 'fair_split_withdrawal'
  | 'degen_split_lock'
  | 'spend_split_payment'
  | 'shared_wallet_funding'
  | 'shared_wallet_withdrawal';

export interface TransactionParams {
  context: TransactionContext;
  userId: string;
  amount: number;
  currency?: 'USDC' | 'SOL';
  // Context-specific parameters
  destinationType?: 'external' | 'friend' | 'split_wallet';
  recipientAddress?: string;
  recipientId?: string;
  memo?: string;
  requestId?: string;
  isSettlement?: boolean;
  splitId?: string;
  splitWalletId?: string;
  billId?: string;
  sharedWalletId?: string;
  destinationAddress?: string;
  destinationId?: string;
  contact?: any;
  wallet?: any;
  request?: any;
  split?: any;
  sharedWallet?: any;
}

export interface TransactionResult {
  success: boolean;
  error?: string;
  /**
   * High-level classification of the error, when present.
   * - 'definite_failure': we are confident the transaction failed.
   * - 'transient': temporary backend/network issue, safe to retry later.
   * - 'uncertain_success': backend could not confirm; transaction may have succeeded.
   */
  errorKind?: 'definite_failure' | 'transient' | 'uncertain_success';
  transactionSignature?: string;
  transactionId?: string;
  txId?: string;
  /**
   * Optional explorer URL (e.g. Solscan) for the transaction, when known.
   */
  explorerUrl?: string;
  fee?: number;
  netAmount?: number;
  blockchainFee?: number;
  message?: string;
  newBalance?: number;
}

// Specific parameter types for each context
export interface SendTransactionParams extends TransactionParams {
  context: 'send_1to1';
  destinationType: 'external' | 'friend';
  recipientAddress: string;
  memo?: string;
  requestId?: string;
  isSettlement?: boolean;
}

export interface FairSplitContributionParams extends TransactionParams {
  context: 'fair_split_contribution';
  splitWalletId: string;
  splitId?: string;
  billId?: string;
  memo?: string;
}

export interface FairSplitWithdrawalParams extends TransactionParams {
  context: 'fair_split_withdrawal';
  splitWalletId: string;
  splitId?: string;
  billId?: string;
  memo?: string;
}

export interface DegenSplitLockParams extends TransactionParams {
  context: 'degen_split_lock';
  splitWalletId: string;
  splitId?: string;
  billId?: string;
  memo?: string;
}

export interface SpendSplitPaymentParams extends TransactionParams {
  context: 'spend_split_payment';
  splitId: string;
  splitWalletId: string;
  memo?: string;
}

export interface SharedWalletFundingParams extends TransactionParams {
  context: 'shared_wallet_funding';
  sharedWalletId: string;
  memo?: string;
}

export interface SharedWalletWithdrawalParams extends TransactionParams {
  context: 'shared_wallet_withdrawal';
  sharedWalletId: string;
  destinationAddress: string;
  destinationId?: string;
  memo?: string;
}
