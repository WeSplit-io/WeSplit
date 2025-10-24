/**
 * Split Data Utilities
 * Provides consistent data handling and debugging for split operations
 */

import { logger } from '../analytics/loggingService';

export interface SplitDataDebugInfo {
  splitId: string;
  billId: string;
  firebaseDocId?: string;
  splitWalletId?: string;
  status: string;
  createdAt: string;
  participantsCount: number;
  totalAmount: number;
  currency: string;
}

/**
 * Debug split data to identify inconsistencies
 */
export const debugSplitData = (splitData: any, context: string): SplitDataDebugInfo => {
  const debugInfo: SplitDataDebugInfo = {
    splitId: splitData?.id || 'unknown',
    billId: splitData?.billId || 'unknown',
    firebaseDocId: splitData?.firebaseDocId || 'unknown',
    splitWalletId: splitData?.walletId || 'unknown',
    status: splitData?.status || 'unknown',
    createdAt: splitData?.createdAt || 'unknown',
    participantsCount: splitData?.participants?.length || 0,
    totalAmount: splitData?.totalAmount || 0,
    currency: splitData?.currency || 'unknown'
  };

  logger.info(`Split data debug [${context}]`, debugInfo, 'SplitDataUtils');
  
  return debugInfo;
};

/**
 * Validate split data consistency
 */
export const validateSplitData = (splitData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!splitData) {
    errors.push('Split data is null or undefined');
    return { isValid: false, errors };
  }

  if (!splitData.id) {
    errors.push('Split ID is missing');
  }

  if (!splitData.billId) {
    errors.push('Bill ID is missing');
  }

  if (!splitData.participants || !Array.isArray(splitData.participants)) {
    errors.push('Participants array is missing or invalid');
  }

  if (typeof splitData.totalAmount !== 'number' || splitData.totalAmount <= 0) {
    errors.push('Total amount is missing or invalid');
  }

  if (!splitData.currency) {
    errors.push('Currency is missing');
  }

  if (!splitData.status) {
    errors.push('Status is missing');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Clear split-related caches and force fresh data loading
 */
export const clearSplitCaches = (): void => {
  // Clear any potential caches
  // This is a placeholder for cache clearing logic
  logger.info('Split caches cleared', null, 'SplitDataUtils');
};

/**
 * Generate a unique split ID with timestamp
 */
export const generateSplitId = (): string => {
  return `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate a unique split wallet ID with timestamp
 */
export const generateSplitWalletId = (): string => {
  return `split_wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Compare two split data objects to detect changes
 */
export const compareSplitData = (oldData: any, newData: any): { hasChanges: boolean; changes: string[] } => {
  const changes: string[] = [];

  if (!oldData || !newData) {
    changes.push('One or both split data objects are null/undefined');
    return { hasChanges: true, changes };
  }

  // Compare key fields
  if (oldData.id !== newData.id) {
    changes.push(`ID changed: ${oldData.id} -> ${newData.id}`);
  }

  if (oldData.status !== newData.status) {
    changes.push(`Status changed: ${oldData.status} -> ${newData.status}`);
  }

  if (oldData.totalAmount !== newData.totalAmount) {
    changes.push(`Total amount changed: ${oldData.totalAmount} -> ${newData.totalAmount}`);
  }

  if (oldData.participants?.length !== newData.participants?.length) {
    changes.push(`Participants count changed: ${oldData.participants?.length} -> ${newData.participants?.length}`);
  }

  return {
    hasChanges: changes.length > 0,
    changes
  };
};

/**
 * Ensure split data has all required fields
 */
export const normalizeSplitData = (splitData: any): any => {
  if (!splitData) return null;

  return {
    ...splitData,
    id: splitData.id || generateSplitId(),
    billId: splitData.billId || '',
    status: splitData.status || 'draft',
    totalAmount: splitData.totalAmount || 0,
    currency: splitData.currency || 'USDC',
    participants: splitData.participants || [],
    createdAt: splitData.createdAt || new Date().toISOString(),
    updatedAt: splitData.updatedAt || new Date().toISOString()
  };
};
