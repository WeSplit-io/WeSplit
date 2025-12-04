/**
 * Transaction Service Module
 * Exports all transaction-related functionality
 */

export { consolidatedTransactionService } from './ConsolidatedTransactionService';
export { TransactionProcessor } from './TransactionProcessor';
export { PaymentRequestManager } from './PaymentRequestManager';
export { transactionHistoryService } from './transactionHistoryService';

// Transfer services
export { externalTransferService } from './sendExternal';
export { internalTransferService } from './sendInternal';

export type {
  TransactionParams,
  TransactionResult,
  PaymentRequest,
  PaymentRequestResult,
  WalletBalance,
  UsdcBalanceResult,
  GasCheckResult
} from './types';
