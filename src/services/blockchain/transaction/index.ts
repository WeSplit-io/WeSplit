/**
 * Transaction Service Module
 * Exports all transaction-related functionality
 */

export { consolidatedTransactionService } from './ConsolidatedTransactionService';
export { TransactionWalletManager } from './TransactionWalletManager';
export { TransactionProcessor } from './TransactionProcessor';
export { PaymentRequestManager } from './PaymentRequestManager';
export { BalanceManager } from './BalanceManager';
export { transactionHistoryService } from './transactionHistoryService';

// Transfer services
export { externalTransferService } from './sendExternal';
export { internalTransferService } from './sendInternal';
export { default as usdcTransfer } from './usdcTransfer';

export type {
  TransactionParams,
  TransactionResult,
  PaymentRequest,
  PaymentRequestResult,
  WalletBalance,
  UsdcBalanceResult,
  GasCheckResult
} from './types';
