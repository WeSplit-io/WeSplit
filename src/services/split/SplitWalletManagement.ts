/**
 * Split Wallet Management Service
 * Handles updates and modifications to existing split wallets
 * Part of the modularized SplitWalletService
 */

import { logger } from '../loggingService';
import { roundUsdcAmount } from '../../utils/currencyUtils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * Fix data consistency issues in split wallets
 * Checks if participants marked as "paid" actually have funds on-chain
 */
export async function fixSplitWalletDataConsistency(splitWalletId: string): Promise<{ success: boolean; error?: string; fixed?: boolean }> {
  try {
    const { SplitWalletQueries } = await import('./SplitWalletQueries');
    const { consolidatedTransactionService } = await import('../consolidatedTransactionService');
    const walletResult = await SplitWalletQueries.getSplitWallet(splitWalletId);
    
    if (!walletResult.success || !walletResult.wallet) {
      return { success: false, error: 'Split wallet not found' };
    }

    const wallet = walletResult.wallet;
    
    // Check actual on-chain balance
    const balanceResult = await consolidatedTransactionService.getUsdcBalance(wallet.walletAddress);
    if (!balanceResult.success) {
      return { success: false, error: 'Failed to check on-chain balance' };
    }

    const onChainBalance = balanceResult.balance;
    const expectedBalance = wallet.participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    
    logger.info('Data consistency check', {
      splitWalletId,
      onChainBalance,
      expectedBalance,
      difference: Math.abs(onChainBalance - expectedBalance)
    }, 'SplitWalletManagement');

    // If there's a significant difference, fix the participant data
    const tolerance = 0.001; // 0.001 USDC tolerance
    if (Math.abs(onChainBalance - expectedBalance) > tolerance) {
      logger.warn('⚠️ Data inconsistency detected, fixing participant data', {
        splitWalletId,
        onChainBalance,
        expectedBalance,
        difference: Math.abs(onChainBalance - expectedBalance)
      }, 'SplitWalletManagement');

      // Reset participants to reflect actual on-chain balance
      const updatedParticipants = wallet.participants.map(p => {
        // If on-chain balance is 0, reset all participants to unpaid
        if (onChainBalance < tolerance) {
          return {
            ...p,
            amountPaid: 0,
            status: 'pending' as const,
            transactionSignature: null, // Use null instead of undefined for Firebase compatibility
            paidAt: null // Use null instead of undefined for Firebase compatibility
          };
        }
        
        // If on-chain balance is less than expected, we need to determine which participants actually paid
        // For now, we'll use a proportional approach, but this could be improved with transaction verification
        const ratio = onChainBalance / expectedBalance;
        const adjustedAmountPaid = p.amountPaid * ratio;
        const isFullyPaid = adjustedAmountPaid >= p.amountOwed;
        
        // If the adjusted amount is very close to the original amount (within tolerance), keep it
        const amountDifference = Math.abs(adjustedAmountPaid - p.amountPaid);
        const finalAmountPaid = amountDifference < tolerance ? p.amountPaid : roundUsdcAmount(adjustedAmountPaid);
        
        return {
          ...p,
          amountPaid: finalAmountPaid,
          status: isFullyPaid ? 'locked' as const : 'pending' as const, // For degen splits, fully paid means 'locked', not 'paid'
          // Convert undefined to null for Firebase compatibility
          transactionSignature: isFullyPaid ? p.transactionSignature : null,
          paidAt: isFullyPaid ? p.paidAt : null
        };
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

      return { success: true, fixed: true };
    }

    return { success: true, fixed: false };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fix data consistency' 
    };
  }
}

/**
 * Fix precision issues in existing split wallets by rounding participant amountOwed values
 */
export async function fixSplitWalletPrecision(splitWalletId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { SplitWalletQueries } = await import('./SplitWalletQueries');
    const walletResult = await SplitWalletQueries.getSplitWallet(splitWalletId);
    
    if (!walletResult.success || !walletResult.wallet) {
      return { success: false, error: 'Split wallet not found' };
    }

    const wallet = walletResult.wallet;
    
    // Round all participant amountOwed values
    const updatedParticipants = wallet.participants.map(p => ({
      ...p,
      amountOwed: roundUsdcAmount(p.amountOwed)
    }));

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

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fix precision' 
    };
  }
}

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
      
      // Remove any undefined values from the update data
      const cleanedUpdateData = this.removeUndefinedValues(updatedWalletData);
      
      await updateDoc(doc(db, 'splitWallets', docId), cleanedUpdateData);

      // CRITICAL: Also update the splits collection to keep both databases synchronized
      try {
        const { SplitStorageService } = await import('../splitStorageService');
        
        const splitUpdateResult = await SplitStorageService.updateSplitByBillId(currentWallet.billId, {
          totalAmount: roundedAmount,
          currency,
          updatedAt: new Date().toISOString(),
        });
        
        if (splitUpdateResult.success) {
          logger.info('Split database synchronized successfully (amount update)', {
            splitWalletId,
            billId: currentWallet.billId,
            oldAmount: currentWallet.totalAmount,
            newAmount: roundedAmount,
            currency
          }, 'SplitWalletManagement');
        } else {
          logger.error('Failed to synchronize split database (amount update)', {
            splitWalletId,
            billId: currentWallet.billId,
            error: splitUpdateResult.error
          }, 'SplitWalletManagement');
        }
      } catch (syncError) {
        logger.error('Error synchronizing split database during amount update', {
          splitWalletId,
          billId: currentWallet.billId,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        }, 'SplitWalletManagement');
        // Don't fail the update if sync fails, but log the error
      }

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
      
      // Remove any undefined values from the update data
      const cleanedUpdateData = this.removeUndefinedValues(updateData);
      
      await updateDoc(doc(db, 'splitWallets', docId), cleanedUpdateData);

      // CRITICAL: Also update the splits collection to keep both databases synchronized
      try {
        const { SplitStorageService } = await import('../splitStorageService');
        
        // Only sync relevant fields to splits collection
        const splitUpdates: Partial<Split> = {};
        if (updates.status) splitUpdates.status = updates.status;
        if (updates.totalAmount) splitUpdates.totalAmount = updates.totalAmount;
        if (updates.currency) splitUpdates.currency = updates.currency;
        if (updates.updatedAt) splitUpdates.updatedAt = updates.updatedAt;
        
        if (Object.keys(splitUpdates).length > 0) {
          const splitUpdateResult = await SplitStorageService.updateSplitByBillId(currentWallet.billId, splitUpdates);
          
          if (splitUpdateResult.success) {
            logger.info('Split database synchronized successfully (wallet update)', {
              splitWalletId,
              billId: currentWallet.billId,
              updatedFields: Object.keys(splitUpdates)
            }, 'SplitWalletManagement');
          } else {
            logger.error('Failed to synchronize split database (wallet update)', {
              splitWalletId,
              billId: currentWallet.billId,
              error: splitUpdateResult.error
            }, 'SplitWalletManagement');
          }
        }
      } catch (syncError) {
        logger.error('Error synchronizing split database during wallet update', {
          splitWalletId,
          billId: currentWallet.billId,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        }, 'SplitWalletManagement');
        // Don't fail the update if sync fails, but log the error
      }

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
      
      // Remove any undefined values from the update data
      const cleanedUpdateData = this.removeUndefinedValues(updatedWalletData);
      
      await updateDoc(doc(db, 'splitWallets', docId), cleanedUpdateData);

      // CRITICAL: Also update the splits collection to keep both databases synchronized
      try {
        const { SplitDataSynchronizer } = await import('./SplitDataSynchronizer');
        
        const syncResult = await SplitDataSynchronizer.syncAllParticipantsFromSplitWalletToSplitStorage(
          currentWallet.billId, // Use billId to find the split
          updatedParticipants
        );
        
        if (syncResult.success) {
          logger.info('Split database synchronized for all participants', {
            splitWalletId,
            billId: currentWallet.billId,
            synchronizedCount: syncResult.synchronizedCount,
            totalParticipants: updatedParticipants.length
          }, 'SplitWalletManagement');
        } else {
          logger.error('Failed to synchronize split database for participants', {
            splitWalletId,
            billId: currentWallet.billId,
            error: syncResult.error
          }, 'SplitWalletManagement');
        }
      } catch (syncError) {
        logger.error('Error synchronizing split database during participant update', {
          splitWalletId,
          billId: currentWallet.billId,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        }, 'SplitWalletManagement');
        // Don't fail the update if sync fails, but log the error
      }

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
      
      // Remove any undefined values from the update data
      const cleanedUpdateData = this.removeUndefinedValues(updatedWalletData);
      
      await updateDoc(doc(db, 'splitWallets', docId), cleanedUpdateData);

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
    
    // Clean participants data to remove undefined values
    const cleanedParticipants = participants.map(p => ({
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
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }
}
