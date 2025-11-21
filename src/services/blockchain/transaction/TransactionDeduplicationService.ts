/**
 * Transaction Deduplication Service
 * Prevents duplicate transaction submissions before Firebase calls
 * 
 * CRITICAL: This service prevents multiple simultaneous transactions with the same parameters
 * from being submitted to Firebase Functions, which can cause duplicate transactions
 * even if the backend processes them correctly.
 */

import { logger } from '../../analytics/loggingService';

interface InFlightTransaction {
  key: string;
  userId: string;
  to: string;
  amount: number;
  timestamp: number;
  promise: Promise<any>;
  signature?: string;
}

/**
 * Generate a unique key for a transaction to detect duplicates
 * Uses: userId + to + amount (rounded to 2 decimals) + 30-second time window
 */
function generateTransactionKey(
  userId: string,
  to: string,
  amount: number,
  timestamp: number
): string {
  // Round amount to 2 decimals to handle floating point precision issues
  const roundedAmount = Math.round(amount * 100) / 100;
  
  // Use 30-second time windows to group similar transactions
  // This prevents duplicates within a short time window
  const timeWindow = Math.floor(timestamp / 30000); // 30-second windows
  
  return `${userId}:${to}:${roundedAmount}:${timeWindow}`;
}

class TransactionDeduplicationService {
  private static instance: TransactionDeduplicationService;
  
  // Track in-flight transactions
  private inFlightTransactions = new Map<string, InFlightTransaction>();
  
  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Transaction timeout (60 seconds)
  private readonly TRANSACTION_TIMEOUT_MS = 60000;
  
  // Time window for duplicate detection (30 seconds)
  private readonly DUPLICATE_WINDOW_MS = 30000;

  private constructor() {
    // Start cleanup interval (runs every 10 seconds)
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTransactions();
    }, 10000);
  }

  public static getInstance(): TransactionDeduplicationService {
    if (!TransactionDeduplicationService.instance) {
      TransactionDeduplicationService.instance = new TransactionDeduplicationService();
    }
    return TransactionDeduplicationService.instance;
  }

  /**
   * Check if a transaction is already in-flight
   * Returns the existing promise if found, null otherwise
   */
  public checkInFlight(
    userId: string,
    to: string,
    amount: number
  ): Promise<any> | null {
    const timestamp = Date.now();
    const key = generateTransactionKey(userId, to, amount, timestamp);
    
    const existing = this.inFlightTransactions.get(key);
    
    if (existing) {
      const age = Date.now() - existing.timestamp;
      
      // If transaction is still within timeout window, return existing promise
      if (age < this.TRANSACTION_TIMEOUT_MS) {
        logger.warn('⚠️ Duplicate transaction attempt detected - transaction already in-flight', {
          key: key.substring(0, 50) + '...',
          age: `${age}ms`,
          userId,
          to: to.substring(0, 8) + '...',
          amount,
          note: 'Returning existing promise to prevent duplicate submission'
        }, 'TransactionDeduplicationService');
        
        return existing.promise;
      } else {
        // Transaction expired, remove it
        logger.debug('Removing expired in-flight transaction', {
          key: key.substring(0, 50) + '...',
          age: `${age}ms`
        }, 'TransactionDeduplicationService');
        
        this.inFlightTransactions.delete(key);
      }
    }
    
    return null;
  }

  /**
   * Register a new in-flight transaction
   * Returns a cleanup function that should be called when transaction completes
   */
  public registerInFlight(
    userId: string,
    to: string,
    amount: number,
    transactionPromise: Promise<any>
  ): () => void {
    const timestamp = Date.now();
    const key = generateTransactionKey(userId, to, amount, timestamp);
    
    // Check if already exists (shouldn't happen if checkInFlight was called first)
    const existing = this.inFlightTransactions.get(key);
    if (existing) {
      logger.warn('⚠️ Transaction key collision - overwriting existing transaction', {
        key: key.substring(0, 50) + '...',
        userId,
        to: to.substring(0, 8) + '...',
        amount
      }, 'TransactionDeduplicationService');
    }
    
    const inFlightTransaction: InFlightTransaction = {
      key,
      userId,
      to,
      amount,
      timestamp,
      promise: transactionPromise
    };
    
    this.inFlightTransactions.set(key, inFlightTransaction);
    
    logger.debug('Registered in-flight transaction', {
      key: key.substring(0, 50) + '...',
      userId,
      to: to.substring(0, 8) + '...',
      amount,
      totalInFlight: this.inFlightTransactions.size
    }, 'TransactionDeduplicationService');
    
    // Return cleanup function
    return () => {
      this.unregisterInFlight(key);
    };
  }

  /**
   * Update transaction with signature when it completes
   */
  public updateTransactionSignature(
    userId: string,
    to: string,
    amount: number,
    signature: string
  ): void {
    const timestamp = Date.now();
    const key = generateTransactionKey(userId, to, amount, timestamp);
    
    // Try to find transaction (might be in a different time window)
    // Check current window and previous window
    const currentWindow = Math.floor(timestamp / 30000);
    const previousWindow = currentWindow - 1;
    
    const currentKey = `${userId}:${to}:${Math.round(amount * 100) / 100}:${currentWindow}`;
    const previousKey = `${userId}:${to}:${Math.round(amount * 100) / 100}:${previousWindow}`;
    
    const transaction = this.inFlightTransactions.get(currentKey) || 
                       this.inFlightTransactions.get(previousKey);
    
    if (transaction) {
      transaction.signature = signature;
      logger.debug('Updated transaction signature', {
        key: transaction.key.substring(0, 50) + '...',
        signature: signature.substring(0, 16) + '...'
      }, 'TransactionDeduplicationService');
    }
  }

  /**
   * Unregister an in-flight transaction
   */
  private unregisterInFlight(key: string): void {
    const removed = this.inFlightTransactions.delete(key);
    
    if (removed) {
      logger.debug('Unregistered in-flight transaction', {
        key: key.substring(0, 50) + '...',
        remainingInFlight: this.inFlightTransactions.size
      }, 'TransactionDeduplicationService');
    }
  }

  /**
   * Cleanup expired transactions
   */
  private cleanupExpiredTransactions(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, transaction] of this.inFlightTransactions.entries()) {
      const age = now - transaction.timestamp;
      
      if (age > this.TRANSACTION_TIMEOUT_MS) {
        expiredKeys.push(key);
      }
    }
    
    if (expiredKeys.length > 0) {
      logger.debug('Cleaning up expired in-flight transactions', {
        count: expiredKeys.length,
        remaining: this.inFlightTransactions.size - expiredKeys.length
      }, 'TransactionDeduplicationService');
      
      expiredKeys.forEach(key => this.inFlightTransactions.delete(key));
    }
  }

  /**
   * Get statistics about in-flight transactions
   */
  public getStats(): {
    totalInFlight: number;
    oldestTransaction: number | null;
    newestTransaction: number | null;
  } {
    if (this.inFlightTransactions.size === 0) {
      return {
        totalInFlight: 0,
        oldestTransaction: null,
        newestTransaction: null
      };
    }
    
    const timestamps = Array.from(this.inFlightTransactions.values())
      .map(t => t.timestamp);
    
    return {
      totalInFlight: this.inFlightTransactions.size,
      oldestTransaction: Math.min(...timestamps),
      newestTransaction: Math.max(...timestamps)
    };
  }

  /**
   * Clear all in-flight transactions (for testing or emergency cleanup)
   */
  public clearAll(): void {
    const count = this.inFlightTransactions.size;
    this.inFlightTransactions.clear();
    logger.info('Cleared all in-flight transactions', {
      count
    }, 'TransactionDeduplicationService');
  }

  /**
   * Cleanup on service destruction
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.inFlightTransactions.clear();
  }
}

// Export singleton instance
export const transactionDeduplicationService = TransactionDeduplicationService.getInstance();

