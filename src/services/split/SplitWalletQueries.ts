/**
 * Split Wallet Queries Service
 * Handles all read operations and queries for split wallets
 * Part of the modularized SplitWalletService
 */

import { logger } from '../loggingService';
import { doc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult } from './types';

export class SplitWalletQueries {
  /**
   * Get split wallet by ID
   */
  static async getSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    try {
      console.log('🔍 SplitWalletQueries: Getting split wallet:', { splitWalletId });

      // Try to get by Firebase document ID first
      const docRef = doc(db, 'splitWallets', splitWalletId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const walletData = docSnap.data() as SplitWallet;
        const wallet: SplitWallet = {
          ...walletData,
          firebaseDocId: docSnap.id,
        };

        console.log('✅ SplitWalletQueries: Split wallet found by Firebase ID:', {
          splitWalletId,
          firebaseDocId: docSnap.id,
          status: wallet.status
        });

        logger.info('Split wallet retrieved by Firebase ID', {
          splitWalletId,
          firebaseDocId: docSnap.id,
          status: wallet.status
        }, 'SplitWalletQueries');

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

        console.log('✅ SplitWalletQueries: Split wallet found by custom ID:', {
          splitWalletId,
          firebaseDocId: doc.id,
          status: wallet.status
        });

        logger.info('Split wallet retrieved by custom ID', {
          splitWalletId,
          firebaseDocId: doc.id,
          status: wallet.status
        }, 'SplitWalletQueries');

        return {
          success: true,
          wallet,
        };
      }

      console.log('❌ SplitWalletQueries: Split wallet not found:', { splitWalletId });
      return {
        success: false,
        error: 'Split wallet not found',
      };

    } catch (error) {
      console.error('🔍 SplitWalletQueries: Error getting split wallet:', error);
      logger.error('Failed to get split wallet', error, 'SplitWalletQueries');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get split wallet by bill ID
   */
  static async getSplitWalletByBillId(billId: string): Promise<SplitWalletResult> {
    try {
      console.log('🔍 SplitWalletQueries: Getting split wallet by bill ID:', { billId });

      const q = query(
        collection(db, 'splitWallets'),
        where('billId', '==', billId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('❌ SplitWalletQueries: No split wallet found for bill ID:', { billId });
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

      console.log('✅ SplitWalletQueries: Split wallet found by bill ID:', {
        billId,
        splitWalletId: wallet.id,
        firebaseDocId: doc.id,
        status: wallet.status
      });

      logger.info('Split wallet retrieved by bill ID', {
        billId,
        splitWalletId: wallet.id,
        firebaseDocId: doc.id,
        status: wallet.status
      }, 'SplitWalletQueries');

      return {
        success: true,
        wallet,
      };

    } catch (error) {
      console.error('🔍 SplitWalletQueries: Error getting split wallet by bill ID:', error);
      logger.error('Failed to get split wallet by bill ID', error, 'SplitWalletQueries');
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
      console.log('🔍 SplitWalletQueries: Locking participant amount:', {
        splitWalletId,
        participantId,
        amount
      });

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
      await updateDoc(doc(db, 'splitWallets', docId), {
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      });

      const updatedWallet: SplitWallet = {
        ...wallet,
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      };

      console.log('✅ SplitWalletQueries: Participant amount locked successfully:', {
        splitWalletId,
        participantId,
        amount
      });

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
      console.error('🔍 SplitWalletQueries: Error locking participant amount:', error);
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
      console.log('🔍 SplitWalletQueries: Getting split wallets by creator:', { creatorId });

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

      console.log('✅ SplitWalletQueries: Split wallets retrieved for creator:', {
        creatorId,
        count: wallets.length
      });

      logger.info('Split wallets retrieved for creator', {
        creatorId,
        count: wallets.length
      }, 'SplitWalletQueries');

      return {
        success: true,
        wallets,
      };

    } catch (error) {
      console.error('🔍 SplitWalletQueries: Error getting split wallets by creator:', error);
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
      console.log('🔍 SplitWalletQueries: Getting split wallets by status:', { status });

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

      console.log('✅ SplitWalletQueries: Split wallets retrieved by status:', {
        status,
        count: wallets.length
      });

      logger.info('Split wallets retrieved by status', {
        status,
        count: wallets.length
      }, 'SplitWalletQueries');

      return {
        success: true,
        wallets,
      };

    } catch (error) {
      console.error('🔍 SplitWalletQueries: Error getting split wallets by status:', error);
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
      console.log('🔍 SplitWalletQueries: Checking if split wallet exists:', { splitWalletId });

      const result = await this.getSplitWallet(splitWalletId);
      
      return {
        success: true,
        exists: result.success,
      };

    } catch (error) {
      console.error('🔍 SplitWalletQueries: Error checking if split wallet exists:', error);
      logger.error('Failed to check if split wallet exists', error, 'SplitWalletQueries');
      return {
        success: false,
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get split wallet completion status
   */
  static async getSplitWalletCompletion(splitWalletId: string): Promise<{
    success: boolean;
    completionPercentage?: number;
    totalAmount?: number;
    collectedAmount?: number;
    remainingAmount?: number;
    error?: string;
  }> {
    try {
      console.log('🔍 SplitWalletQueries: Getting split wallet completion:', { splitWalletId });

      const result = await this.getSplitWallet(splitWalletId);
      if (!result.success || !result.wallet) {
        return {
          success: false,
          error: result.error || 'Split wallet not found',
        };
      }

      const wallet = result.wallet;
      const totalAmount = wallet.totalAmount;
      const collectedAmount = wallet.participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const remainingAmount = totalAmount - collectedAmount;
      const completionPercentage = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;

      console.log('🔍 SplitWalletQueries: getSplitWalletCompletion calculation:', {
        walletId: splitWalletId,
        totalAmount,
        collectedAmount,
        remainingAmount,
        completionPercentage,
        participantsCount: wallet.participants.length
      });

      return {
        success: true,
        completionPercentage: Math.round(completionPercentage * 100) / 100, // Round to 2 decimal places
        totalAmount,
        collectedAmount,
        remainingAmount,
      };

    } catch (error) {
      console.error('🔍 SplitWalletQueries: Error getting split wallet completion:', error);
      logger.error('Failed to get split wallet completion', error, 'SplitWalletQueries');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
