/**
 * Transaction Service Types
 * Centralized type definitions for transaction-related functionality
 */

import { TransactionResult as UnifiedTransactionResult } from '../../types/unified';
import { TransactionType } from '../../config/feeConfig';

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

export interface PaymentRequest {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  description?: string;
  groupId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface PaymentRequestResult {
  success: boolean;
  requestId?: string;
  transactionId?: string;
  error?: string;
}

export interface WalletInfo {
  address: string;
  publicKey: string;
}

export interface WalletBalance {
  usdc: number;
  sol: number;
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
