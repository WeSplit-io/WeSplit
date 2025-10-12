/**
 * Transaction Configuration
 * Centralized transaction settings for Solana operations
 */

export interface TransactionConfig {
  retry: {
    maxRetries: number;
    retryDelay: number;
  };
  priorityFees: {
    low: number;
    medium: number;
    high: number;
  };
  computeUnits: {
    simpleTransfer: number;
    tokenTransfer: number;
    multiSigTransfer: number;
  };
  timeout: {
    connection: number;
    transaction: number;
    confirmation: number;
  };
}

export const TRANSACTION_CONFIG: TransactionConfig = {
  retry: {
    maxRetries: 3,
    retryDelay: 1000
  },
  priorityFees: {
    low: 1000,
    medium: 5000,
    high: 10000
  },
  computeUnits: {
    simpleTransfer: 200000,
    tokenTransfer: 300000,
    multiSigTransfer: 500000,
  },
  timeout: {
    connection: 30000,
    transaction: 60000,
    confirmation: 120000
  }
};
