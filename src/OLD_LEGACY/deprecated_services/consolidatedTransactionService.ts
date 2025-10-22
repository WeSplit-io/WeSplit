/**
 * Consolidated Transaction Service for WeSplit
 * 
 * @deprecated This file has been refactored into modular components.
 * Use the new transaction service from './transaction/' instead.
 * 
 * This file is kept for backward compatibility and will be removed in a future version.
 */

// Re-export the new modular service for backward compatibility
export { 
  consolidatedTransactionService,
  type TransactionParams,
  type TransactionResult,
  type PaymentRequest,
  type PaymentRequestResult,
  type WalletInfo,
  type WalletBalance,
  type UsdcBalanceResult,
  type GasCheckResult
} from './transaction';