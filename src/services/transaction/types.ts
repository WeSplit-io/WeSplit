/**
 * Transaction Service Types
 * Centralized type definitions for transaction-related functionality
 */

import { TransactionResult as UnifiedTransactionResult } from '../../types/unified';
import { TransactionType } from '../../config/feeConfig';
import { 
  StandardizedPaymentRequest, 
  PaymentRequestResult as StandardizedPaymentRequestResult,
  StandardizedWalletInfo,
  WalletBalance as StandardizedWalletBalance,
  UsdcBalanceResult as StandardizedUsdcBalanceResult,
  GasCheckResult as StandardizedGasCheckResult
} from '../../types/standardized';

export interface TransactionParams {
  to: string;
  amount: number;
  currency: 'SOL' | 'USDC';
  memo?: string;
  priority?: 'low' | 'medium' | 'high';
  userId?: string;
  transactionType?: TransactionType;
}

export interface TransactionResult extends UnifiedTransactionResult {
  companyFee?: number;
  netAmount?: number;
}

// Legacy interfaces for backward compatibility
export interface PaymentRequest extends StandardizedPaymentRequest {}
export interface PaymentRequestResult extends StandardizedPaymentRequestResult {}
export interface WalletInfo extends StandardizedWalletInfo {}
export interface WalletBalance extends StandardizedWalletBalance {}
export interface UsdcBalanceResult extends StandardizedUsdcBalanceResult {}
export interface GasCheckResult extends StandardizedGasCheckResult {}

// Re-export standardized types
export type {
  StandardizedPaymentRequest,
  StandardizedPaymentRequestResult,
  StandardizedWalletInfo,
  StandardizedWalletBalance,
  StandardizedUsdcBalanceResult,
  StandardizedGasCheckResult
};
