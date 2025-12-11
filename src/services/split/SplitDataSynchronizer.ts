/**
 * Split Data Synchronizer
 * Centralizes all data synchronization between split storage and split wallet collections
 * Prevents data inconsistencies and overlapping synchronization code
 */

import { logger } from '../core';
import { SplitStorageService } from '../splits/splitStorageService';
import { mapSplitWalletStatusToSplitStorage, mapSplitStorageStatusToSplitWallet } from './utils/statusMapper';
import { VALIDATION_TOLERANCE } from './constants/splitConstants';
import { db } from '../../config/firebase/firebase';
import type { SplitWalletParticipant } from './types';

export interface SynchronizationResult {
  success: boolean;
  error?: string;
  synchronizedCount?: number;
}

export class SplitDataSynchronizer {

  /**
   * Synchronize participant status from split wallet to split storage
   */
  static async syncParticipantFromSplitWalletToSplitStorage(
    billId: string,
    participantId: string,
    splitWalletParticipant: SplitWalletParticipant
  ): Promise<SynchronizationResult> {
    try {
      logger.debug('Synchronizing participant from split wallet to split storage', {
        billId,
        participantId,
        splitWalletStatus: splitWalletParticipant.status,
        amountPaid: splitWalletParticipant.amountPaid
      }, 'SplitDataSynchronizer');

      const splitStorageStatus = mapSplitWalletStatusToSplitStorage(splitWalletParticipant.status);
      
      // CRITICAL: Try to find split by billId first, then by splitId if needed
      let splitResult = await SplitStorageService.getSplitByBillId(billId);
      
      // If not found by billId, try to get splitId from split wallet
      if (!splitResult.success) {
        logger.warn('Split not found by billId, attempting to find via split wallet', {
          billId,
          participantId
        }, 'SplitDataSynchronizer');
        
        // Try to get split wallet to find splitId
        const { SplitWalletQueries } = await import('./SplitWalletQueries');
        const walletResult = await SplitWalletQueries.getSplitWalletByBillId(billId);
        
        if (walletResult.success && walletResult.wallet && walletResult.wallet.walletId) {
          // Try to find split by checking if walletId is stored in split
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const splitsRef = collection(db, 'splits');
          const q = query(splitsRef, where('walletId', '==', walletResult.wallet.walletId || walletResult.wallet.id));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const splitDoc = snapshot.docs[0];
            const splitData = splitDoc.data();
            splitData.firebaseDocId = splitDoc.id;
            splitResult = { success: true, split: splitData };
          }
        }
      }
      
      if (!splitResult.success || !splitResult.split) {
        logger.error('Failed to find split for synchronization', {
          billId,
          participantId,
          error: splitResult.error
        }, 'SplitDataSynchronizer');
        return {
          success: false,
          error: `Split not found: ${splitResult.error || 'Unknown error'}`
        };
      }

      // Use the split's ID (not billId) for update
      const splitId = splitResult.split.id || splitResult.split.firebaseDocId;
      
      const result = await SplitStorageService.updateParticipantStatus(
        splitId,
        participantId,
        splitStorageStatus as "pending" | "locked" | "paid" | "accepted" | "invited" | "declined",
        splitWalletParticipant.amountPaid,
        splitWalletParticipant.transactionSignature
      );

      if (result.success) {
        logger.info('Participant synchronized from split wallet to split storage', {
          billId,
          splitId,
          participantId,
          splitWalletStatus: splitWalletParticipant.status,
          splitStorageStatus,
          amountPaid: splitWalletParticipant.amountPaid
        }, 'SplitDataSynchronizer');
      } else {
        logger.error('Failed to synchronize participant from split wallet to split storage', {
          billId,
          splitId,
          participantId,
          error: result.error
        }, 'SplitDataSynchronizer');
      }

      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      logger.error('Error synchronizing participant from split wallet to split storage', {
        billId,
        participantId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, 'SplitDataSynchronizer');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Request deduplication for sync operations to prevent memory exhaustion
  private static syncDeduplicator = new Map<string, Promise<SynchronizationResult>>();

  /**
   * Synchronize all participants from split wallet to split storage (with deduplication)
   */
  static async syncAllParticipantsFromSplitWalletToSplitStorage(
    billId: string,
    splitWalletParticipants: SplitWalletParticipant[]
  ): Promise<SynchronizationResult> {
    // CRITICAL: Deduplicate sync operations for same billId to prevent memory exhaustion
    const syncKey = `sync_${billId}`;
    if (this.syncDeduplicator.has(syncKey)) {
      logger.debug('Sync already in progress for billId, reusing existing promise', { billId }, 'SplitDataSynchronizer');
      return this.syncDeduplicator.get(syncKey)!;
    }

    const syncPromise = this._syncAllParticipantsFromSplitWalletToSplitStorage(billId, splitWalletParticipants)
      .finally(() => {
        // Clean up after sync completes
        this.syncDeduplicator.delete(syncKey);
      });

    this.syncDeduplicator.set(syncKey, syncPromise);
    return syncPromise;
  }

  /**
   * Internal method to sync all participants (without deduplication)
   */
  private static async _syncAllParticipantsFromSplitWalletToSplitStorage(
    billId: string,
    splitWalletParticipants: SplitWalletParticipant[]
  ): Promise<SynchronizationResult> {
    try {
      logger.debug('Synchronizing all participants from split wallet to split storage', {
        billId,
        participantsCount: splitWalletParticipants.length
      }, 'SplitDataSynchronizer');

      // PERFORMANCE: Parallelize participant syncs instead of sequential
      const syncPromises = splitWalletParticipants.map(participant =>
        this.syncParticipantFromSplitWalletToSplitStorage(
          billId,
          participant.userId,
          participant
        ).then(result => ({ participantId: participant.userId, result }))
          .catch(error => ({ 
            participantId: participant.userId, 
            result: { success: false, error: error instanceof Error ? error.message : String(error) } 
          }))
      );

      const syncResults = await Promise.allSettled(syncPromises);
      
      let synchronizedCount = 0;
      const errors: string[] = [];

      syncResults.forEach((settledResult) => {
        if (settledResult.status === 'fulfilled') {
          const { participantId, result } = settledResult.value;
        if (result.success) {
          synchronizedCount++;
          } else {
            errors.push(`Participant ${participantId}: ${result.error || 'Unknown error'}`);
          }
        } else {
          errors.push(`Error syncing participant: ${settledResult.reason instanceof Error ? settledResult.reason.message : String(settledResult.reason)}`);
        }
      });

      const success = synchronizedCount === splitWalletParticipants.length;
      const error = errors.length > 0 ? errors.join('; ') : undefined;

      logger.info('Bulk participant synchronization completed', {
        billId,
        totalParticipants: splitWalletParticipants.length,
        synchronizedCount,
        success,
        errorCount: errors.length
      }, 'SplitDataSynchronizer');

      return {
        success,
        error,
        synchronizedCount
      };
    } catch (error) {
      logger.error('Error in bulk participant synchronization', {
        billId,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitDataSynchronizer');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Synchronize split status from split wallet to split storage
   */
  static async syncSplitStatusFromSplitWalletToSplitStorage(
    billId: string,
    splitWalletStatus: string,
    completedAt?: string
  ): Promise<SynchronizationResult> {
    try {
      logger.debug('Synchronizing split status from split wallet to split storage', {
        billId,
        splitWalletStatus,
        completedAt
      }, 'SplitDataSynchronizer');

      // Map split wallet status to split storage status
      let splitStorageStatus: string;
      switch (splitWalletStatus) {
        case 'active':
          splitStorageStatus = 'active';
          break;
        case 'locked':
          splitStorageStatus = 'active'; // Split wallet 'locked' means active in split storage
          break;
        case 'completed':
          splitStorageStatus = 'completed';
          break;
        case 'cancelled':
          splitStorageStatus = 'cancelled';
          break;
        case 'spinning_completed':
          splitStorageStatus = 'completed'; // Spinning completed means the split is done
          break;
        case 'closed':
          splitStorageStatus = 'completed'; // Closed wallet means the split is fully completed
          break;
        default:
          splitStorageStatus = 'active';
      }

      const updateData: import('./types').SplitStorageUpdate = {
        status: splitStorageStatus,
        updatedAt: new Date().toISOString()
      };

      if (completedAt) {
        updateData.completedAt = completedAt;
      }

      const result = await SplitStorageService.updateSplitByBillId(billId, updateData);

      if (result.success) {
        logger.info('Split status synchronized from split wallet to split storage', {
          billId,
          splitWalletStatus,
          splitStorageStatus,
          completedAt
        }, 'SplitDataSynchronizer');
      } else {
        logger.error('Failed to synchronize split status from split wallet to split storage', {
          billId,
          splitWalletStatus,
          error: result.error
        }, 'SplitDataSynchronizer');
      }

      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      logger.error('Error synchronizing split status from split wallet to split storage', {
        billId,
        splitWalletStatus,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitDataSynchronizer');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get consistent participant status across both databases
   */
  static getConsistentParticipantStatus(
    splitWalletStatus?: string,
    splitStorageStatus?: string
  ): string {
    // Prioritize split wallet status as it's more up-to-date for degen splits
    if (splitWalletStatus) {
      return splitWalletStatus;
    }
    
    if (splitStorageStatus) {
      return mapSplitStorageStatusToSplitWallet(splitStorageStatus);
    }
    
    return 'pending';
  }

  /**
   * Synchronize degen split participant with proper amount handling
   * For degen splits, each participant pays the full bill amount
   */
  static async syncDegenSplitParticipant(
    billId: string,
    participantId: string,
    splitWalletParticipant: SplitWalletParticipant,
    totalBillAmount: number
  ): Promise<SynchronizationResult> {
    try {
      // Synchronizing degen split participant

      // For degen splits, ensure amountOwed is the full bill amount
      const correctedParticipant = {
        ...splitWalletParticipant,
        amountOwed: totalBillAmount // Each participant owes the full bill amount in degen splits
      };

      // Map status appropriately for degen splits
      const splitStorageStatus = mapSplitWalletStatusToSplitStorage(splitWalletParticipant.status);
      
      const updateData: import('./types').DegenSplitParticipantUpdate = {
        status: splitStorageStatus,
        amountPaid: splitWalletParticipant.amountPaid,
        amountOwed: totalBillAmount, // Ensure amountOwed is correct for degen splits
        updatedAt: new Date().toISOString()
      };

      // Add transaction signature if available
      if (splitWalletParticipant.transactionSignature) {
        updateData.transactionSignature = splitWalletParticipant.transactionSignature;
      }

      // Add paidAt timestamp if participant has paid
      if (splitWalletParticipant.paidAt) {
        updateData.paidAt = splitWalletParticipant.paidAt;
      }

      // First, find the split by billId to get the splitId
      const splitResult = await SplitStorageService.getSplitByBillId(billId);
      
      if (!splitResult.success || !splitResult.split) {
        logger.error('Split not found for degen split participant synchronization', {
          billId,
          participantId
        }, 'SplitDataSynchronizer');
        return {
          success: false,
          error: 'Split not found'
        };
      }
      
      const result = await SplitStorageService.updateParticipantStatus(
        splitResult.split.id, // Use splitId instead of billId
        participantId,
        splitStorageStatus as "pending" | "locked" | "paid" | "accepted" | "invited" | "declined",
        splitWalletParticipant.amountPaid,
        splitWalletParticipant.transactionSignature
      );

      if (result.success) {
        logger.info('Degen split participant synchronized successfully', {
          billId,
          participantId,
          splitId: splitResult.split.id,
          splitStorageStatus,
          amountPaid: splitWalletParticipant.amountPaid,
          amountOwed: totalBillAmount
        }, 'SplitDataSynchronizer');
        
        return { success: true };
      } else {
        logger.error('Failed to synchronize degen split participant', {
          billId,
          participantId,
          splitId: splitResult.split.id,
          error: result.error
        }, 'SplitDataSynchronizer');
        
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      logger.error('Error synchronizing degen split participant', {
        billId,
        participantId,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitDataSynchronizer');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate data consistency between split wallet and split storage
   */
  static validateDataConsistency(
    splitWalletParticipants: SplitWalletParticipant[],
    splitStorageParticipants: import('./types').SplitStorageParticipant[]
  ): { isConsistent: boolean; inconsistencies: string[] } {
    const inconsistencies: string[] = [];

    // Check if participant counts match
    if (splitWalletParticipants.length !== splitStorageParticipants.length) {
      inconsistencies.push(`Participant count mismatch: split wallet has ${splitWalletParticipants.length}, split storage has ${splitStorageParticipants.length}`);
    }

    // Check individual participant consistency
    for (const walletParticipant of splitWalletParticipants) {
      const storageParticipant = splitStorageParticipants.find(p => p.userId === walletParticipant.userId);
      
      if (!storageParticipant) {
        inconsistencies.push(`Participant ${walletParticipant.userId} not found in split storage`);
        continue;
      }

      // Check status consistency
      const expectedStorageStatus = mapSplitWalletStatusToSplitStorage(walletParticipant.status);
      if (storageParticipant.status !== expectedStorageStatus) {
        inconsistencies.push(`Participant ${walletParticipant.userId} status mismatch: split wallet has '${walletParticipant.status}', split storage has '${storageParticipant.status}', expected '${expectedStorageStatus}'`);
      }

      // Check amount consistency
      if (Math.abs((walletParticipant.amountPaid || 0) - (storageParticipant.amountPaid || 0)) > VALIDATION_TOLERANCE.BALANCE) {
        inconsistencies.push(`Participant ${walletParticipant.userId} amount mismatch: split wallet has ${walletParticipant.amountPaid}, split storage has ${storageParticipant.amountPaid}`);
      }
    }

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies
    };
  }
}
