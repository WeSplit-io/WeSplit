/**
 * Transaction Configuration
 * Centralized transaction settings for Solana operations with iOS-specific optimizations
 */

import { getNetworkConfig } from '../network/networkConfig';

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

// Get platform-specific network configuration
const networkConfig = getNetworkConfig();

export const TRANSACTION_CONFIG: TransactionConfig = {
  retry: {
    maxRetries: networkConfig.retries.maxRetries, // Platform-specific retry count
    retryDelay: networkConfig.retries.retryDelay // Platform-specific retry delay
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
    connection: networkConfig.timeout.connection, // Platform-specific connection timeout
    transaction: 60000, // Keep transaction timeout consistent
    confirmation: 120000 // Keep confirmation timeout consistent
  }
};
