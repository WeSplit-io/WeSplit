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
      const updateData: any = {
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
      // Step 1: Update splitWallets collection
      await updateDoc(doc(db, 'splitWallets', firebaseDocId), {
        participants: updatedParticipants,
        lastUpdated: new Date().toISOString()
      });

      // Step 2: Update splits collection with appropriate method
      const { SplitDataSynchronizer } = await import('./SplitDataSynchronizer');
      
      let syncResult;
      if (isDegenSplit) {
        syncResult = await SplitDataSynchronizer.syncDegenSplitParticipant(
          billId,
          participantId,
          updatedParticipant,
          updatedParticipant.amountOwed
        );
      } else {
        syncResult = await SplitDataSynchronizer.syncParticipantFromSplitWalletToSplitStorage(
          billId,
          participantId,
          updatedParticipant
        );
      }

      if (!syncResult.success) {
        logger.error('Failed to sync splits collection', {
          billId,
          participantId,
          error: syncResult.error
        }, 'SplitWalletAtomicUpdates');
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
    updateData: any
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
