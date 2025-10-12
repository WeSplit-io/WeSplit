/**
 * Split Wallet Management Service
 * Handles updates and modifications to existing split wallets
 * Part of the modularized SplitWalletService
 */

import { logger } from '../loggingService';
import { roundUsdcAmount } from '../../utils/currencyUtils';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult } from './types';

export class SplitWalletManagement {
  /**
   * Update split wallet amount
   */
  static async updateSplitWalletAmount(
    splitWalletId: string, 
    newTotalAmount: number, 
    currency: string = 'USDC'
  ): Promise<SplitWalletResult> {
    try {

      // Get current wallet
      const currentWalletResult = await this.getSplitWallet(splitWalletId);
      if (!currentWalletResult.success || !currentWalletResult.wallet) {
        return {
          success: false,
          error: currentWalletResult.error || 'Split wallet not found',
        };
      }

      const currentWallet = currentWalletResult.wallet;
      const roundedAmount = roundUsdcAmount(newTotalAmount);

      // Update wallet data
      const updatedWalletData = {
        totalAmount: roundedAmount,
        currency,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firebase
      const docId = currentWallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), updatedWalletData);

      const updatedWallet: SplitWallet = {
        ...currentWallet,
        ...updatedWalletData,
      };


      logger.info('Split wallet amount updated', {
        splitWalletId,
        oldAmount: currentWallet.totalAmount,
        newAmount: roundedAmount,
        currency
      }, 'SplitWalletManagement');

      return {
        success: true,
        wallet: updatedWallet,
      };

    } catch (error) {
      console.error('🔍 SplitWalletManagement: Error updating split wallet amount:', error);
      logger.error('Failed to update split wallet amount', error, 'SplitWalletManagement');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update split wallet with partial data
   */
  static async updateSplitWallet(
    splitWalletId: string, 
    updates: Partial<SplitWallet>
  ): Promise<SplitWalletResult> {
    try {

      // Get current wallet
      const currentWalletResult = await this.getSplitWallet(splitWalletId);
      if (!currentWalletResult.success || !currentWalletResult.wallet) {
        return {
          success: false,
          error: currentWalletResult.error || 'Split wallet not found',
        };
      }

      const currentWallet = currentWalletResult.wallet;

      // Prepare update data
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.firebaseDocId;
      delete updateData.createdAt;

      // Update in Firebase
      const docId = currentWallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), updateData);

      const updatedWallet: SplitWallet = {
        ...currentWallet,
        ...updateData,
      };


      logger.info('Split wallet updated', {
        splitWalletId,
        updatedFields: Object.keys(updates)
      }, 'SplitWalletManagement');

      return {
        success: true,
        wallet: updatedWallet,
      };

    } catch (error) {
      console.error('🔍 SplitWalletManagement: Error updating split wallet:', error);
      logger.error('Failed to update split wallet', error, 'SplitWalletManagement');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update split wallet participants
   */
  static async updateSplitWalletParticipants(
    splitWalletId: string, 
    participants: Omit<SplitWalletParticipant, 'amountPaid' | 'status' | 'transactionSignature' | 'paidAt'>[]
  ): Promise<SplitWalletResult> {
    try {

      // Get current wallet
      const currentWalletResult = await this.getSplitWallet(splitWalletId);
      if (!currentWalletResult.success || !currentWalletResult.wallet) {
        return {
          success: false,
          error: currentWalletResult.error || 'Split wallet not found',
        };
      }

      const currentWallet = currentWalletResult.wallet;

      // Map participants with default values
      const updatedParticipants: SplitWalletParticipant[] = participants.map(p => ({
        ...p,
        amountPaid: 0,
        status: 'pending' as const,
      }));

      // Update wallet data
      const updatedWalletData = {
        participants: updatedParticipants,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firebase
      const docId = currentWallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), updatedWalletData);

      const updatedWallet: SplitWallet = {
        ...currentWallet,
        ...updatedWalletData,
      };


      logger.info('Split wallet participants updated', {
        splitWalletId,
        oldParticipantsCount: currentWallet.participants.length,
        newParticipantsCount: updatedParticipants.length
      }, 'SplitWalletManagement');

      return {
        success: true,
        wallet: updatedWallet,
      };

    } catch (error) {
      console.error('🔍 SplitWalletManagement: Error updating split wallet participants:', error);
      logger.error('Failed to update split wallet participants', error, 'SplitWalletManagement');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Lock split wallet (prevent further modifications)
   */
  static async lockSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    try {

      // Get current wallet
      const currentWalletResult = await this.getSplitWallet(splitWalletId);
      if (!currentWalletResult.success || !currentWalletResult.wallet) {
        return {
          success: false,
          error: currentWalletResult.error || 'Split wallet not found',
        };
      }

      const currentWallet = currentWalletResult.wallet;

      // Check if wallet is already locked
      if (currentWallet.status === 'locked') {
        return {
          success: false,
          error: 'Split wallet is already locked',
        };
      }

      // Update wallet status to locked
      const updatedWalletData = {
        status: 'locked' as const,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firebase
      const docId = currentWallet.firebaseDocId || splitWalletId;
      await updateDoc(doc(db, 'splitWallets', docId), updatedWalletData);

      const updatedWallet: SplitWallet = {
        ...currentWallet,
        ...updatedWalletData,
      };


      logger.info('Split wallet locked', {
        splitWalletId,
        totalAmount: updatedWallet.totalAmount,
        participantsCount: updatedWallet.participants.length
      }, 'SplitWalletManagement');

      return {
        success: true,
        wallet: updatedWallet,
      };

    } catch (error) {
      console.error('🔍 SplitWalletManagement: Error locking split wallet:', error);
      logger.error('Failed to lock split wallet', error, 'SplitWalletManagement');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Debug USDC balance
   */
  static async debugUsdcBalance(walletAddress: string): Promise<{
    success: boolean;
    results: any;
    error?: string;
  }> {
    try {

      // This is a placeholder implementation
      // In a real implementation, you would check the actual USDC balance
      const results = {
        walletAddress,
        timestamp: new Date().toISOString(),
        balance: 0, // Placeholder
        tokenAccounts: [], // Placeholder
      };

      return {
        success: true,
        results,
      };

    } catch (error) {
      console.error('🔍 SplitWalletManagement: Error debugging USDC balance:', error);
      logger.error('Failed to debug USDC balance', error, 'SplitWalletManagement');
      return {
        success: false,
        results: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Repair split wallet data
   */
  static async repairSplitWalletData(splitWalletId: string): Promise<{
    success: boolean;
    error?: string;
    repaired?: boolean;
  }> {
    try {

      // Get current wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
          repaired: false,
        };
      }

      const wallet = walletResult.wallet;
      let repaired = false;

      // Check and repair participant data
      const repairedParticipants = wallet.participants.map(p => {
        const repairedParticipant = { ...p };
        
        // Ensure required fields exist
        if (!repairedParticipant.amountPaid) {
          repairedParticipant.amountPaid = 0;
          repaired = true;
        }
        
        if (!repairedParticipant.status) {
          repairedParticipant.status = 'pending';
          repaired = true;
        }

        return repairedParticipant;
      });

      // Update wallet if repairs were made
      if (repaired) {
        const docId = wallet.firebaseDocId || splitWalletId;
        await this.updateWalletParticipants(docId, repairedParticipants);
      }


      return {
        success: true,
        repaired,
      };

    } catch (error) {
      console.error('🔍 SplitWalletManagement: Error repairing split wallet data:', error);
      logger.error('Failed to repair split wallet data', error, 'SplitWalletManagement');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        repaired: false,
      };
    }
  }

  /**
   * Repair split wallet synchronization
   */
  static async repairSplitWalletSynchronization(
    splitWalletId: string,
    creatorId: string
  ): Promise<{ success: boolean; repaired: boolean; error?: string }> {
    try {

      // This is a placeholder implementation
      // In a real implementation, you would synchronize the wallet data
      

      return {
        success: true,
        repaired: true,
      };

    } catch (error) {
      console.error('🔍 SplitWalletManagement: Error repairing split wallet synchronization:', error);
      logger.error('Failed to repair split wallet synchronization', error, 'SplitWalletManagement');
      return {
        success: false,
        repaired: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Helper method to get split wallet (direct Firebase query to avoid circular imports)
   */
  private static async getSplitWallet(splitWalletId: string): Promise<SplitWalletResult> {
    try {
      const { getDoc, doc, getDocs, query, where, collection } = await import('firebase/firestore');
      
      // Try to get by Firebase document ID first
      const docRef = doc(db, 'splitWallets', splitWalletId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const walletData = docSnap.data() as SplitWallet;
        const wallet: SplitWallet = {
          ...walletData,
          firebaseDocId: docSnap.id,
        };
        return { success: true, wallet };
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
        return { success: true, wallet };
      }

      return { success: false, error: 'Split wallet not found' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private static async updateWalletParticipants(docId: string, participants: SplitWalletParticipant[]): Promise<void> {
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../../config/firebase');
    await updateDoc(doc(db, 'splitWallets', docId), {
      participants,
      updatedAt: new Date().toISOString(),
    });
  }
}
