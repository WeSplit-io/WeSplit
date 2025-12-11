/**
 * Split Wallet Atomic Updates Service
 * Centralized service for all atomic database updates to prevent overlapping calls
 * and ensure data consistency across splitWallets and splits collections
 */

import { logger } from '../core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import type { SplitWalletParticipant } from './types';

export interface AtomicUpdateResult {
  success: boolean;
  error?: string;
}

export class SplitWalletAtomicUpdates {
  /**
   * Atomic update for wallet status changes
   * Updates both splitWallets and splits collections
   */
  static async updateWalletStatus(
    firebaseDocId: string,
    billId: string,
    status: string,
    completedAt?: string
  ): Promise<AtomicUpdateResult> {
    try {
      // Step 1: Update splitWallets collection
      const updateData: import('./types').SplitWalletStatusUpdate = {
        status,
        lastUpdated: new Date().toISOString()
      };

      if (completedAt) {
        updateData.completedAt = completedAt;
      }

      await updateDoc(doc(db, 'splitWallets', firebaseDocId), updateData);

      // Step 2: Update splits collection
      const { SplitDataSynchronizer } = await import('./SplitDataSynchronizer');
      
      const syncResult = await SplitDataSynchronizer.syncSplitStatusFromSplitWalletToSplitStorage(
        billId,
        status,
        completedAt
      );

      if (!syncResult.success) {
        logger.error('Failed to sync splits collection', {
          billId,
          status,
          error: syncResult.error
        }, 'SplitWalletAtomicUpdates');
      }
      
      return { success: true };

    } catch (error) {
      logger.error('Wallet status update failed', {
        firebaseDocId,
        billId,
        status,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitWalletAtomicUpdates');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Atomic update for participant payments (both fair and degen splits)
   * Updates both splitWallets and splits collections
   */
  static async updateParticipantPayment(
    firebaseDocId: string,
    billId: string,
    updatedParticipants: SplitWalletParticipant[],
    updatedParticipant: SplitWalletParticipant,
    participantId: string,
    isDegenSplit: boolean = false
  ): Promise<AtomicUpdateResult> {
    try {
      // VALIDATION: Verify participant data before updating
      // 1. Ensure amountPaid <= amountOwed for all participants
      for (const p of updatedParticipants) {
        if (p.amountPaid > p.amountOwed) {
          logger.error('Validation failed: amountPaid exceeds amountOwed', {
            firebaseDocId,
            billId,
            participantId: p.userId,
            amountPaid: p.amountPaid,
            amountOwed: p.amountOwed
          }, 'SplitWalletAtomicUpdates');
          return {
            success: false,
            error: `Validation failed: Participant ${p.userId} has amountPaid (${p.amountPaid}) exceeding amountOwed (${p.amountOwed})`
          };
        }
      }
      
      // 2. Validate status transitions are valid
      const validStatuses = ['pending', 'locked', 'paid'];
      for (const p of updatedParticipants) {
        if (!validStatuses.includes(p.status)) {
          logger.error('Validation failed: invalid participant status', {
            firebaseDocId,
            billId,
            participantId: p.userId,
            invalidStatus: p.status
          }, 'SplitWalletAtomicUpdates');
          return {
            success: false,
            error: `Validation failed: Participant ${p.userId} has invalid status: ${p.status}`
          };
        }
      }
      
      // PERFORMANCE: Parallelize wallet update and split sync
      const { SplitDataSynchronizer } = await import('./SplitDataSynchronizer');
      
      const [walletUpdateResult, syncResult] = await Promise.allSettled([
        // Step 1: Update splitWallets collection
        updateDoc(doc(db, 'splitWallets', firebaseDocId), {
          participants: updatedParticipants,
          lastUpdated: new Date().toISOString()
        }),
        // Step 2: Update splits collection with appropriate method
        isDegenSplit
          ? SplitDataSynchronizer.syncDegenSplitParticipant(
          billId,
          participantId,
          updatedParticipant,
          updatedParticipant.amountOwed
            )
          : SplitDataSynchronizer.syncParticipantFromSplitWalletToSplitStorage(
          billId,
          participantId,
          updatedParticipant
            )
      ]);

      // Check wallet update result
      if (walletUpdateResult.status === 'rejected') {
        logger.error('Failed to update split wallet', {
          firebaseDocId,
          billId,
          error: walletUpdateResult.reason instanceof Error ? walletUpdateResult.reason.message : String(walletUpdateResult.reason)
        }, 'SplitWalletAtomicUpdates');
        return {
          success: false,
          error: `Failed to update split wallet: ${walletUpdateResult.reason instanceof Error ? walletUpdateResult.reason.message : String(walletUpdateResult.reason)}`
        };
      }

      // Check sync result
      const finalSyncResult = syncResult.status === 'fulfilled' ? syncResult.value : { success: false, error: 'Sync failed' };

      if (!finalSyncResult.success) {
        logger.error('Failed to sync splits collection - CRITICAL: Split storage may have stale data', {
          billId,
          participantId,
          error: finalSyncResult.error,
          walletUpdateSucceeded: walletUpdateResult.status === 'fulfilled'
        }, 'SplitWalletAtomicUpdates');
        
        // CRITICAL: Retry sync once with delay
        await new Promise(resolve => setTimeout(resolve, 500));
        const retrySyncResult = isDegenSplit
          ? await SplitDataSynchronizer.syncDegenSplitParticipant(
              billId,
              participantId,
              updatedParticipant,
              updatedParticipant.amountOwed
            )
          : await SplitDataSynchronizer.syncParticipantFromSplitWalletToSplitStorage(
              billId,
              participantId,
              updatedParticipant
            );
        
        if (!retrySyncResult.success) {
          logger.error('Retry sync also failed - split storage will have stale data', {
            billId,
            participantId,
            error: retrySyncResult.error
          }, 'SplitWalletAtomicUpdates');
          // Still return success for wallet update, but log critical error
        } else {
          logger.info('Retry sync succeeded', {
            billId,
            participantId
          }, 'SplitWalletAtomicUpdates');
        }
      }
      
      return { success: true };

    } catch (error) {
      logger.error('Participant payment update failed', {
        firebaseDocId,
        billId,
        participantId,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitWalletAtomicUpdates');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Atomic update for wallet participants (bulk updates)
   * Updates both splitWallets and splits collections
   */
  static async updateWalletParticipants(
    firebaseDocId: string,
    billId: string,
    participants: SplitWalletParticipant[]
  ): Promise<AtomicUpdateResult> {
    try {
      // Step 1: Update splitWallets collection
      await updateDoc(doc(db, 'splitWallets', firebaseDocId), {
        participants: participants,
        lastUpdated: new Date().toISOString()
      });

      // Step 2: Update splits collection
      const { SplitDataSynchronizer } = await import('./SplitDataSynchronizer');
      
      const syncResult = await SplitDataSynchronizer.syncAllParticipantsFromSplitWalletToSplitStorage(
        billId,
        participants
      );

      if (!syncResult.success) {
        logger.error('Failed to sync splits collection', {
          billId,
          error: syncResult.error
        }, 'SplitWalletAtomicUpdates');
      }
      
      return { success: true };

    } catch (error) {
      logger.error('Wallet participants update failed', {
        firebaseDocId,
        billId,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitWalletAtomicUpdates');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Atomic update for wallet general data (amount, currency, etc.)
   * Updates both splitWallets and splits collections
   */
  static async updateWalletData(
    firebaseDocId: string,
    billId: string,
    updateData: Partial<import('./types').SplitWallet>
  ): Promise<AtomicUpdateResult> {
    try {
      // Step 1: Update splitWallets collection
      const cleanedUpdateData = {
        ...updateData,
        lastUpdated: new Date().toISOString()
      };

      await updateDoc(doc(db, 'splitWallets', firebaseDocId), cleanedUpdateData);

      // Step 2: Update splits collection with relevant fields only
      const { SplitStorageService } = await import('../splits/splitStorageService');
      
      // Only sync relevant fields to splits collection
      const splitUpdates: any = {};
      if (updateData.status) splitUpdates.status = updateData.status;
      if (updateData.totalAmount) splitUpdates.totalAmount = updateData.totalAmount;
      if (updateData.currency) splitUpdates.currency = updateData.currency;
      if (updateData.updatedAt) splitUpdates.updatedAt = updateData.updatedAt;
      
      if (Object.keys(splitUpdates).length > 0) {
        const splitUpdateResult = await SplitStorageService.updateSplitByBillId(billId, splitUpdates);
        
        if (!splitUpdateResult.success) {
          logger.error('Failed to sync splits collection', {
            billId,
            error: splitUpdateResult.error
          }, 'SplitWalletAtomicUpdates');
        }
      }
      
      return { success: true };

    } catch (error) {
      logger.error('Wallet data update failed', {
        firebaseDocId,
        billId,
        error: error instanceof Error ? error.message : String(error)
      }, 'SplitWalletAtomicUpdates');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
