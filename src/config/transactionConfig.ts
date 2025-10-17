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
    maxRetries: 2, // Reduced from 3 to 2 for faster failure detection
    retryDelay: 500 // Reduced from 1000ms to 500ms for faster retries
  },
  priorityFees: {
    low: 1000,
    medium: 5000,
    high: 15000 // Increased high priority fee for faster processing
  },
  computeUnits: {
    simpleTransfer: 200000,
    tokenTransfer: 300000,
    multiSigTransfer: 500000,
  },
  timeout: {
    connection: 30000, // Increased to 30s for better reliability
    transaction: 60000, // Increased to 60s for better reliability
    confirmation: 120000 // Increased to 120s for better reliability
  }
};
