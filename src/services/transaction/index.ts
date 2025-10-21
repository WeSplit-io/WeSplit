/**
 * Transaction Service Module
 * Exports all transaction-related functionality
 */

export { consolidatedTransactionService } from './ConsolidatedTransactionService';
export { TransactionWalletManager } from './TransactionWalletManager';
export { TransactionProcessor } from './TransactionProcessor';
export { BalanceManager } from './BalanceManager';

export type {
  TransactionParams,
  TransactionResult,
  PaymentRequest,
  PaymentRequestResult,
  WalletInfo,
  WalletBalance,
  UsdcBalanceResult,
  GasCheckResult
} from './types';
