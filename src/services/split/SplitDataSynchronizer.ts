/**
 * Split Data Synchronizer
 * Centralizes all data synchronization between split storage and split wallet collections
 * Prevents data inconsistencies and overlapping synchronization code
 */

import { logger } from '../loggingService';
import { SplitStorageService } from '../splitStorageService';
import type { SplitWalletParticipant } from './types';

export interface SynchronizationResult {
  success: boolean;
  error?: string;
  synchronizedCount?: number;
}

export class SplitDataSynchronizer {
  /**
   * Map split wallet participant status to split storage status
   */
  private static mapSplitWalletStatusToSplitStorage(splitWalletStatus: string): string {
    switch (splitWalletStatus) {
      case 'pending':
        return 'pending';
      case 'locked':
        return 'accepted'; // For degen splits, 'locked' means 'accepted' in split storage
      case 'paid':
        return 'paid';
      case 'failed':
        return 'pending'; // Failed payments reset to pending
      default:
        return 'pending';
    }
  }

  /**
   * Map split storage participant status to split wallet status
   */
  private static mapSplitStorageStatusToSplitWallet(splitStorageStatus: string): string {
    switch (splitStorageStatus) {
      case 'pending':
        return 'pending';
      case 'accepted':
        return 'locked'; // For degen splits, 'accepted' means 'locked' in split wallet
      case 'paid':
        return 'paid';
      case 'invited':
        return 'pending'; // Invited users are pending in split wallet
      default:
        return 'pending';
    }
  }

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

      const splitStorageStatus = this.mapSplitWalletStatusToSplitStorage(splitWalletParticipant.status);
      
      const result = await SplitStorageService.updateParticipantStatus(
        billId,
        participantId,
        splitStorageStatus,
        splitWalletParticipant.amountPaid,
        splitWalletParticipant.transactionSignature
      );

      if (result.success) {
        logger.info('Participant synchronized from split wallet to split storage', {
          billId,
          participantId,
          splitWalletStatus: splitWalletParticipant.status,
          splitStorageStatus,
          amountPaid: splitWalletParticipant.amountPaid
        }, 'SplitDataSynchronizer');
      } else {
        logger.error('Failed to synchronize participant from split wallet to split storage', {
          billId,
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
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitDataSynchronizer');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Synchronize all participants from split wallet to split storage
   */
  static async syncAllParticipantsFromSplitWalletToSplitStorage(
    billId: string,
    splitWalletParticipants: SplitWalletParticipant[]
  ): Promise<SynchronizationResult> {
    try {
      logger.debug('Synchronizing all participants from split wallet to split storage', {
        billId,
        participantsCount: splitWalletParticipants.length
      }, 'SplitDataSynchronizer');

      let synchronizedCount = 0;
      const errors: string[] = [];

      for (const participant of splitWalletParticipants) {
        const result = await this.syncParticipantFromSplitWalletToSplitStorage(
          billId,
          participant.userId,
          participant
        );

        if (result.success) {
          synchronizedCount++;
        } else {
          errors.push(`Participant ${participant.userId}: ${result.error}`);
        }
      }

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
        default:
          splitStorageStatus = 'active';
      }

      const updateData: any = {
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
      return this.mapSplitStorageStatusToSplitWallet(splitStorageStatus);
    }
    
    return 'pending';
  }

  /**
   * Validate data consistency between split wallet and split storage
   */
  static validateDataConsistency(
    splitWalletParticipants: SplitWalletParticipant[],
    splitStorageParticipants: any[]
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
      const expectedStorageStatus = this.mapSplitWalletStatusToSplitStorage(walletParticipant.status);
      if (storageParticipant.status !== expectedStorageStatus) {
        inconsistencies.push(`Participant ${walletParticipant.userId} status mismatch: split wallet has '${walletParticipant.status}', split storage has '${storageParticipant.status}', expected '${expectedStorageStatus}'`);
      }

      // Check amount consistency
      if (Math.abs((walletParticipant.amountPaid || 0) - (storageParticipant.amountPaid || 0)) > 0.001) {
        inconsistencies.push(`Participant ${walletParticipant.userId} amount mismatch: split wallet has ${walletParticipant.amountPaid}, split storage has ${storageParticipant.amountPaid}`);
      }
    }

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies
    };
  }
}
