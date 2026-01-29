/**
 * Split Wallet Queries Service
 * Handles all read operations and queries for split wallets
 * Part of the modularized SplitWalletService
 */

import { logger } from '../core';
import { doc, getDoc, getDocs, query, where, updateDoc, collection } from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult } from './types';
// CRITICAL: Dynamic import to prevent early bundling and memory exhaustion
// import { SplitWalletCache } from './SplitWalletCache';
import { RequestDeduplicator } from './utils/debounceUtils';

// Dev-only verbose logging flag for split wallet queries.
// This mirrors the pattern used in split-focused hooks and prevents
// large payloads from being logged in production.
const ENABLE_VERBOSE_SPLIT_LOGS =
  __DEV__ && (process.env.ENABLE_VERBOSE_SPLIT_LOGS === '1' || process.env.ENABLE_VERBOSE_SPLIT_LOGS === 'true');

export class SplitWalletQueries {
  // Request deduplication to prevent multiple simultaneous calls for the same wallet
  private static walletDeduplicator = new RequestDeduplicator<(id: string) => Promise<SplitWalletResult>>();
  private static walletByBillIdDeduplicator = new RequestDeduplicator<(billId: string) => Promise<SplitWalletResult>>();

  /**
   * Get split wallet by ID (with caching and deduplication)
   */
  static async getSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    // Use deduplication to prevent multiple simultaneous calls
    return this.walletDeduplicator.execute(
      splitWalletId,
      this._getSplitWallet.bind(this),
      splitWalletId
    );
  }

  /**
   * Internal method to get split wallet (without deduplication)
   */
  private static async _getSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    try {
      // Check cache first (dynamic import to prevent early bundling)
      const { SplitWalletCache } = await import('./SplitWalletCache');
      const cached = await SplitWalletCache.getWalletById(splitWalletId);
      if (cached) {
        return {
          success: true,
          wallet: cached,
        };
      }

      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.debug('Getting split wallet', { splitWalletId }, 'SplitWalletQueries');
      }

      // Try to get by Firebase document ID first
      const docRef = doc(db, 'splitWallets', splitWalletId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const walletData = docSnap.data() as SplitWallet;
        const wallet: SplitWallet = {
          ...walletData,
          firebaseDocId: docSnap.id,
        };

        logger.info('Split wallet retrieved by Firebase ID', {
          splitWalletId,
          firebaseDocId: docSnap.id,
          status: wallet.status
        }, 'SplitWalletQueries');

        // Cache the wallet (dynamic import to prevent early bundling)
        const { SplitWalletCache } = await import('./SplitWalletCache');
        SplitWalletCache.setWallet(wallet);

      // CRITICAL: Sync split storage from split wallet to fix stale data (non-blocking)
      if (wallet.billId) {
        // Run sync asynchronously to not block the query
        (async () => {
          try {
            const { SplitWalletService } = await import('./index');
            await SplitWalletService.syncAllParticipantsFromSplitWalletToSplitStorage(
              wallet.billId,
              wallet.participants
            );
          } catch (syncError) {
            // Don't fail the query if sync fails, but log it
            logger.warn('Failed to sync split storage from wallet', {
              splitWalletId,
              billId: wallet.billId,
              error: syncError instanceof Error ? syncError.message : String(syncError)
            }, 'SplitWalletQueries');
          }
        })();
      }

        return {
          success: true,
          wallet,
        };
      }

      // If not found by Firebase ID, try to find by custom ID
      const q = query(
        collection(db, 'splitWallets'),
        where('id', '==', splitWalletId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const walletData = doc.data() as SplitWallet;
        const wallet: SplitWallet = {
          ...walletData,
          firebaseDocId: doc.id,
        };

        logger.info('Split wallet retrieved by custom ID', {
          splitWalletId,
          firebaseDocId: doc.id,
          status: wallet.status
        }, 'SplitWalletQueries');

        // Cache the wallet (dynamic import to prevent early bundling)
        const { SplitWalletCache } = await import('./SplitWalletCache');
        SplitWalletCache.setWallet(wallet);

        // CRITICAL: Sync split storage from split wallet to fix stale data (non-blocking)
        // This ensures split storage always has the latest payment data
        if (wallet.billId) {
          // Run sync asynchronously to not block the query
          (async () => {
            try {
              const { SplitWalletService } = await import('./index');
              await SplitWalletService.syncAllParticipantsFromSplitWalletToSplitStorage(
                wallet.billId,
                wallet.participants
              );
            } catch (syncError) {
              // Don't fail the query if sync fails, but log it
              logger.warn('Failed to sync split storage from wallet', {
                splitWalletId,
                billId: wallet.billId,
                error: syncError instanceof Error ? syncError.message : String(syncError)
              }, 'SplitWalletQueries');
            }
          })();
        }

        return {
          success: true,
          wallet,
        };
      }

      logger.error('Split wallet not found', { splitWalletId }, 'SplitWalletQueries');
      return {
        success: false,
        error: 'Split wallet not found',
      };

    } catch (error) {
      logger.error('Failed to get split wallet', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletQueries');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get split wallet by bill ID (with caching and deduplication)
   */
  static async getSplitWalletByBillId(billId: string): Promise<SplitWalletResult> {
    // Use deduplication to prevent multiple simultaneous calls
    return this.walletByBillIdDeduplicator.execute(
      billId,
      this._getSplitWalletByBillId.bind(this),
      billId
    );
  }

  /**
   * Internal method to get split wallet by bill ID (without deduplication)
   */
  private static async _getSplitWalletByBillId(billId: string): Promise<SplitWalletResult> {
    try {
      // Check cache first (dynamic import to prevent early bundling)
      const { SplitWalletCache } = await import('./SplitWalletCache');
      const cached = await SplitWalletCache.getWalletByBillId(billId);
      if (cached) {
        return {
          success: true,
          wallet: cached,
        };
      }

      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.debug('Getting split wallet by bill ID', { billId }, 'SplitWalletQueries');
      }

      const q = query(
        collection(db, 'splitWallets'),
        where('billId', '==', billId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        logger.error('No split wallet found for bill ID', { billId }, 'SplitWalletQueries');
        return {
          success: false,
          error: 'No split wallet found for this bill',
        };
      }

      // Get the first (and should be only) split wallet for this bill
      const doc = querySnapshot.docs[0];
      const walletData = doc.data() as SplitWallet;
      const wallet: SplitWallet = {
        ...walletData,
        firebaseDocId: doc.id,
      };

      logger.info('Split wallet retrieved by bill ID', {
        billId,
        splitWalletId: wallet.id,
        firebaseDocId: doc.id,
        status: wallet.status
      }, 'SplitWalletQueries');

      // Cache the wallet (dynamic import to prevent early bundling)
      const { SplitWalletCache: SplitWalletCacheForSet } = await import('./SplitWalletCache');
      SplitWalletCacheForSet.setWallet(wallet);

      // CRITICAL: Sync split storage from split wallet to fix stale data (non-blocking)
      if (wallet.billId) {
        // Run sync asynchronously to not block the query
        (async () => {
          try {
            const { SplitWalletService } = await import('./index');
            await SplitWalletService.syncAllParticipantsFromSplitWalletToSplitStorage(
              wallet.billId,
              wallet.participants
            );
          } catch (syncError) {
            // Don't fail the query if sync fails, but log it
            logger.warn('Failed to sync split storage from wallet', {
              billId,
              error: syncError instanceof Error ? syncError.message : String(syncError)
            }, 'SplitWalletQueries');
          }
        })();
      }

      return {
        success: true,
        wallet,
      };

    } catch (error) {
      logger.error('Failed to get split wallet by bill ID', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletQueries');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Lock participant amount in split wallet
   */
  static async lockParticipantAmount(
    splitWalletId: string, 
    participantId: string, 
    amount: number
  ): Promise<SplitWalletResult> {
    try {
      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.debug('Locking participant amount', {
          splitWalletId,
          participantId,
          amount
        }, 'SplitWalletQueries');
      }

      // Get current wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Find participant
      const participant = wallet.participants.find(p => p.userId === participantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet',
        };
      }

      // Update participant status to locked
      const updatedParticipants = wallet.participants.map(p => {
        if (p.userId === participantId) {
          return {
            ...p,
            status: 'locked' as const,
          };
        }
        return p;
      });

      // Update wallet in Firebase
      const docId = wallet.firebaseDocId || splitWalletId;
      
      // Clean participants data to remove undefined values
      const cleanedParticipants = updatedParticipants.map(p => ({
        ...p,
        // Convert undefined to null for Firebase compatibility
        transactionSignature: p.transactionSignature || null,
        paidAt: p.paidAt || null,
      }));
      
      const updateData = {
        participants: cleanedParticipants,
        updatedAt: new Date().toISOString(),
      };
      
      // Remove any undefined values from the update data
      const cleanedUpdateData = this.removeUndefinedValues(updateData);
      
      await updateDoc(doc(db, 'splitWallets', docId), cleanedUpdateData);

      const updatedWallet: SplitWallet = {
        ...wallet,
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      };

      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.debug('Participant amount locked successfully', {
          splitWalletId,
          participantId,
          amount
        }, 'SplitWalletQueries');
      }

      logger.info('Participant amount locked', {
        splitWalletId,
        participantId,
        amount
      }, 'SplitWalletQueries');

      return {
        success: true,
        wallet: updatedWallet,
      };

    } catch (error) {
      logger.error('Error locking participant amount', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletQueries');
      logger.error('Failed to lock participant amount', error, 'SplitWalletQueries');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get all split wallets for a creator
   */
  static async getSplitWalletsByCreator(creatorId: string): Promise<{ success: boolean; wallets: SplitWallet[]; error?: string }> {
    try {
      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info('Getting split wallets by creator', { creatorId }, 'SplitWalletQueries');
      }

      const q = query(
        collection(db, 'splitWallets'),
        where('creatorId', '==', creatorId)
      );
      const querySnapshot = await getDocs(q);

      const wallets: SplitWallet[] = querySnapshot.docs.map(doc => {
        const walletData = doc.data() as SplitWallet;
        return {
          ...walletData,
          firebaseDocId: doc.id,
        };
      });

      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info('Split wallets retrieved for creator', {
          creatorId,
          count: wallets.length
        }, 'SplitWalletQueries');
      }

      return {
        success: true,
        wallets,
      };

    } catch (error) {
      logger.error('Error getting split wallets by creator', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletQueries');
      logger.error('Failed to get split wallets by creator', error, 'SplitWalletQueries');
      return {
        success: false,
        wallets: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get split wallets by status
   */
  static async getSplitWalletsByStatus(status: SplitWallet['status']): Promise<{ success: boolean; wallets: SplitWallet[]; error?: string }> {
    try {
      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info('Getting split wallets by status', { status }, 'SplitWalletQueries');
      }

      const q = query(
        collection(db, 'splitWallets'),
        where('status', '==', status)
      );
      const querySnapshot = await getDocs(q);

      const wallets: SplitWallet[] = querySnapshot.docs.map(doc => {
        const walletData = doc.data() as SplitWallet;
        return {
          ...walletData,
          firebaseDocId: doc.id,
        };
      });

      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info('Split wallets retrieved by status', {
          status,
          count: wallets.length
        }, 'SplitWalletQueries');
      }

      return {
        success: true,
        wallets,
      };

    } catch (error) {
      logger.error('Error getting split wallets by status', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletQueries');
      logger.error('Failed to get split wallets by status', error, 'SplitWalletQueries');
      return {
        success: false,
        wallets: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if split wallet exists
   */
  static async splitWalletExists(splitWalletId: string): Promise<{ success: boolean; exists: boolean; error?: string }> {
    try {
      logger.info('Checking if split wallet exists', { splitWalletId }, 'SplitWalletQueries');

      const result = await this.getSplitWallet(splitWalletId);
      
      return {
        success: true,
        exists: result.success,
      };

    } catch (error) {
      logger.error('Error checking if split wallet exists', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletQueries');
      logger.error('Failed to check if split wallet exists', error, 'SplitWalletQueries');
      return {
        success: false,
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get participant payment status
   */
  static async getParticipantPaymentStatus(splitWalletId: string, participantId: string): Promise<{
    success: boolean;
    participant?: SplitWalletParticipant;
    error?: string;
  }> {
    try {
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found'
        };
      }

      const participant = walletResult.wallet.participants.find(p => p.userId === participantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found in split wallet'
        };
      }

      return {
        success: true,
        participant
      };
    } catch (error) {
      logger.error('Failed to get participant payment status', error, 'SplitWalletQueries');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Request deduplication for completion checks to prevent memory exhaustion
  private static completionDeduplicator = new RequestDeduplicator<(id: string) => Promise<{
    success: boolean;
    completionPercentage?: number;
    totalAmount?: number;
    collectedAmount?: number;
    remainingAmount?: number;
    participantsPaid?: number;
    totalParticipants?: number;
    error?: string;
  }>>();

  /**
   * Get split wallet completion status (with deduplication)
   */
  static async getSplitWalletCompletion(splitWalletId: string): Promise<{
    success: boolean;
    completionPercentage?: number;
    totalAmount?: number;
    collectedAmount?: number;
    remainingAmount?: number;
    participantsPaid?: number;
    totalParticipants?: number;
    error?: string;
  }> {
    // Use deduplication to prevent multiple simultaneous calls
    return this.completionDeduplicator.execute(
      splitWalletId,
      this._getSplitWalletCompletion.bind(this),
      splitWalletId
    );
  }

  /**
   * Internal method to get split wallet completion (without deduplication)
   */
  private static async _getSplitWalletCompletion(splitWalletId: string): Promise<{
    success: boolean;
    completionPercentage?: number;
    totalAmount?: number;
    collectedAmount?: number;
    remainingAmount?: number;
    participantsPaid?: number;
    totalParticipants?: number;
    error?: string;
  }> {
    try {
      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info('Getting split wallet completion', { splitWalletId }, 'SplitWalletQueries');
      }

      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;
      const totalAmount = wallet.totalAmount;
      
      // Get actual on-chain balance to verify against database values
      let actualOnChainBalance = 0;
      try {
        const { consolidatedTransactionService } = await import('../blockchain/transaction/ConsolidatedTransactionService');
        const balanceResult = await consolidatedTransactionService.getUsdcBalance(wallet.walletAddress);
        if (balanceResult.success) {
          actualOnChainBalance = balanceResult.balance;
        }
      } catch (error) {
        logger.warn('Could not get on-chain balance for completion calculation', { error }, 'SplitWalletQueries');
      }
      
      // Calculate database-based completion
      const databaseCollectedAmount = wallet.participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      
      // CRITICAL: Use the maximum of database amount and on-chain balance
      // This handles cases where:
      // 1. Transaction succeeded on-chain but database wasn't updated (verification timeout)
      // 2. Database is out of sync with blockchain state
      // We always want to use the actual funds available on-chain
      const { VALIDATION_TOLERANCE } = await import('./constants/splitConstants');
      const tolerance = VALIDATION_TOLERANCE.BALANCE;
      const isSingleParticipant = wallet.participants.length === 1;
      const isAmountClose = Math.abs(databaseCollectedAmount - actualOnChainBalance) <= tolerance;
      
      let collectedAmount: number;
      if (isAmountClose) {
        // When amounts are very close, use database amount (prevents rounding issues)
        collectedAmount = databaseCollectedAmount;
      } else if (actualOnChainBalance > databaseCollectedAmount) {
        // If on-chain balance is higher, use it (transaction succeeded but DB not updated)
        collectedAmount = actualOnChainBalance;
        logger.info('Using on-chain balance (higher than database)', {
          splitWalletId,
          databaseCollectedAmount,
          actualOnChainBalance,
          difference: actualOnChainBalance - databaseCollectedAmount
        }, 'SplitWalletQueries');
      } else {
        // If database amount is higher, use the more conservative value
        // This prevents showing more funds than actually available
        collectedAmount = Math.min(databaseCollectedAmount, actualOnChainBalance);
      }
      
      const remainingAmount = Math.max(0, totalAmount - collectedAmount);
      // CRITICAL: Cap completion at 100% to prevent showing >100% when participant paid more than owed
      const rawCompletionPercentage = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;
      const completionPercentage = Math.min(100, Math.max(0, rawCompletionPercentage));

      // Calculate participants paid and total participants
      const totalParticipants = wallet.participants.length;
      let participantsPaid = wallet.participants.filter(p => p.status === 'paid').length;
      
      // DIAGNOSTIC: Check if we have a data consistency issue
      // If funds are collected on-chain but database doesn't reflect it, try to fix it
      const hasOnChainFunds = actualOnChainBalance > 0;
      const hasDatabaseFunds = databaseCollectedAmount > 0;
      const onChainBalanceHigher = actualOnChainBalance > databaseCollectedAmount + tolerance;
      
      if (hasOnChainFunds && (participantsPaid === 0 || onChainBalanceHigher)) {
      // Log a compact diagnostic payload to avoid large arrays in logs
      logger.warn('Data consistency issue detected: on-chain funds exist but database not updated', {
        splitWalletId,
        actualOnChainBalance,
        databaseCollectedAmount,
        collectedAmount,
        totalParticipants,
        participantsPaid,
        onChainBalanceHigher,
        sampleParticipants: wallet.participants.slice(0, 3).map(p => ({
          userId: p.userId,
          name: p.name,
          status: p.status,
          amountPaid: p.amountPaid,
          amountOwed: p.amountOwed
        }))
      }, 'SplitWalletQueries');
        
        // Auto-fix: If on-chain balance >= total amount, mark all participants as paid
        // This handles cases where transaction succeeded but database wasn't updated
        if (actualOnChainBalance >= totalAmount - tolerance) {
      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info('Auto-fixing participant status: on-chain balance covers full amount', {
          splitWalletId,
          actualOnChainBalance,
          totalAmount,
          totalParticipants
        }, 'SplitWalletQueries');
      }
          
          // Update the participant status in the database
          try {
            const { fixSplitWalletDataConsistency } = await import('./SplitWalletManagement');
            const fixResult = await fixSplitWalletDataConsistency(splitWalletId);
            
            if (fixResult.success && fixResult.fixed) {
              logger.info('Successfully auto-fixed participant status from on-chain balance', { 
                splitWalletId,
                actualOnChainBalance,
                totalAmount
              }, 'SplitWalletQueries');
              // Recalculate participants paid after fix
              const updatedWalletResult = await this.getSplitWallet(splitWalletId);
              if (updatedWalletResult.success && updatedWalletResult.wallet) {
                participantsPaid = updatedWalletResult.wallet.participants.filter(p => p.status === 'paid').length;
              }
            }
          } catch (error) {
            logger.error('Failed to auto-fix participant status from on-chain balance', { 
              error, 
              splitWalletId 
            }, 'SplitWalletQueries');
          }
        } else if (totalParticipants === 1 && collectedAmount >= wallet.participants[0].amountOwed) {
          // Fallback: For single participant splits, mark as paid if collected amount covers their share
      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info('Auto-fixing single participant status: collected amount covers share', {
          splitWalletId,
          participantId: wallet.participants[0].userId,
          collectedAmount,
          amountOwed: wallet.participants[0].amountOwed
        }, 'SplitWalletQueries');
      }
          
          try {
            const { fixSplitWalletDataConsistency } = await import('./SplitWalletManagement');
            const fixResult = await fixSplitWalletDataConsistency(splitWalletId);
            
            if (fixResult.success && fixResult.fixed) {
              logger.info('Successfully auto-fixed single participant status', { splitWalletId }, 'SplitWalletQueries');
              participantsPaid = 1; // Update the count
            }
          } catch (error) {
            logger.error('Failed to auto-fix participant status', { error, splitWalletId }, 'SplitWalletQueries');
          }
        }
      }

      // Fallback guarantee: if collected/on-chain funds cover the full amount,
      // treat all participants as paid for completion/eligibility calculations
      // even if participant status fields weren't updated yet.
      if (collectedAmount >= totalAmount - tolerance && participantsPaid < totalParticipants) {
      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.info('Applying fallback paid count from collected amount coverage', {
          splitWalletId,
          collectedAmount,
          totalAmount,
          tolerance,
          participantsPaidBefore: participantsPaid,
          totalParticipants
        }, 'SplitWalletQueries');
      }
        participantsPaid = totalParticipants;
      }

      if (ENABLE_VERBOSE_SPLIT_LOGS) {
        logger.debug('getSplitWalletCompletion calculation', {
          walletId: splitWalletId,
          totalAmount,
          databaseCollectedAmount,
          actualOnChainBalance,
          finalCollectedAmount: collectedAmount,
          remainingAmount,
          completionPercentage,
          participantsCount: wallet.participants.length,
          participantsPaid,
          totalParticipants,
          isSingleParticipant,
          isAmountClose,
          tolerance,
          dataConsistencyIssue: Math.abs(databaseCollectedAmount - actualOnChainBalance) > tolerance
        }, 'SplitWalletQueries');
      }

      return {
        success: true,
        completionPercentage: Math.round(completionPercentage * 100) / 100, // Round to 2 decimal places
        totalAmount,
        collectedAmount,
        remainingAmount,
        participantsPaid,
        totalParticipants,
      };

    } catch (error) {
      logger.error('Error getting split wallet completion', { error: error instanceof Error ? error.message : String(error) }, 'SplitWalletQueries');
      logger.error('Failed to get split wallet completion', error, 'SplitWalletQueries');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
  
  /**
   * Remove undefined values from an object (Firebase doesn't allow undefined values)
   */
  private static removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: Partial<T> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          (cleaned as Record<string, unknown>)[key] = this.removeUndefinedValues(value as T);
        }
      }
      return cleaned;
    }
    
    return obj;
  }
}
