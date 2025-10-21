/**
 * Split Wallet Cleanup Service
 * Handles cleanup, cancellation, and completion operations for split wallets
 * Part of the modularized SplitWalletService
 */

import { logger } from '../loggingService';
import { doc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult } from './types';

export class SplitWalletCleanup {
  /**
   * Cancel split wallet
   */
  static async cancelSplitWallet(
    splitWalletId: string, 
    reason?: string
  ): Promise<SplitWalletResult> {
    try {

      // Get current wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Check if wallet can be cancelled
      if (wallet.status === 'completed') {
        return {
          success: false,
          error: 'Cannot cancel a completed split wallet',
        };
      }

      if (wallet.status === 'cancelled') {
        return {
          success: false,
          error: 'Split wallet is already cancelled',
        };
      }

      // Update wallet status to cancelled
      const updatedWalletData = {
        status: 'cancelled' as const,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firebase
      const docId = wallet.firebaseDocId || splitWalletId;
      
      // Remove any undefined values from the update data
      const cleanedUpdateData = this.removeUndefinedValues(updatedWalletData);
      
      await updateDoc(doc(db, 'splitWallets', docId), cleanedUpdateData);

      // CRITICAL: Also update the splits collection to keep both databases synchronized
      try {
        const { SplitStorageService } = await import('../splitStorageService');
        
        const splitUpdateResult = await SplitStorageService.updateSplitByBillId(wallet.billId, {
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
        });
        
        if (splitUpdateResult.success) {
          logger.info('Split database synchronized successfully (cancellation)', {
            splitWalletId,
            billId: wallet.billId,
            status: 'cancelled'
          }, 'SplitWalletCleanup');
        } else {
          logger.error('Failed to synchronize split database (cancellation)', {
            splitWalletId,
            billId: wallet.billId,
            error: splitUpdateResult.error
          }, 'SplitWalletCleanup');
        }
      } catch (syncError) {
        logger.error('Error synchronizing split database during cancellation', {
          splitWalletId,
          billId: wallet.billId,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        }, 'SplitWalletCleanup');
        // Don't fail the cancellation if sync fails, but log the error
      }

      const updatedWallet: SplitWallet = {
        ...wallet,
        ...updatedWalletData,
      };


      logger.info('Split wallet cancelled', {
        splitWalletId,
        reason,
        totalAmount: wallet.totalAmount,
        participantsCount: wallet.participants.length
      }, 'SplitWalletCleanup');

      return {
        success: true,
        wallet: updatedWallet,
      };

    } catch (error) {
      console.error('🔍 SplitWalletCleanup: Error cancelling split wallet:', error);
      logger.error('Failed to cancel split wallet', error, 'SplitWalletCleanup');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Complete split wallet - mark as completed and optionally send funds to merchant
   */
  static async completeSplitWallet(
    splitWalletId: string,
    merchantAddress?: string
  ): Promise<SplitWalletResult> {
    try {

      // Get current wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Verify all participants have paid
      const allParticipantsPaid = wallet.participants.every(p => p.status === 'paid');
      if (!allParticipantsPaid) {
        return {
          success: false,
          error: 'Not all participants have paid their shares',
        };
      }

      // If merchant address is provided, send the total amount to the merchant
      if (merchantAddress) {
        const merchantPaymentResult = await this.sendToCastAccount(
          splitWalletId,
          merchantAddress,
          `Payment for bill ${wallet.billId}`
        );

        if (!merchantPaymentResult.success) {
          return {
            success: false,
            error: merchantPaymentResult.error || 'Failed to send payment to merchant',
          };
        }
      }

      // Update wallet status to completed
      const docId = wallet.firebaseDocId || splitWalletId;
      
      const updateData = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Remove any undefined values from the update data
      const cleanedUpdateData = this.removeUndefinedValues(updateData);
      
      await updateDoc(doc(db, 'splitWallets', docId), cleanedUpdateData);

      // CRITICAL: Also update the splits collection to keep both databases synchronized
      try {
        const { SplitDataSynchronizer } = await import('./SplitDataSynchronizer');
        
        const syncResult = await SplitDataSynchronizer.syncSplitStatusFromSplitWalletToSplitStorage(
          wallet.billId,
          'completed',
          new Date().toISOString()
        );
        
        if (syncResult.success) {
          logger.info('Split database synchronized successfully (withdrawal)', {
            splitWalletId,
            billId: wallet.billId,
            status: 'completed'
          }, 'SplitWalletCleanup');
        } else {
          logger.error('Failed to synchronize split database (withdrawal)', {
            splitWalletId,
            billId: wallet.billId,
            error: syncResult.error
          }, 'SplitWalletCleanup');
        }
      } catch (syncError) {
        logger.error('Error synchronizing split database during withdrawal', {
          splitWalletId,
          billId: wallet.billId,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        }, 'SplitWalletCleanup');
        // Don't fail the withdrawal if sync fails, but log the error
      }

      const updatedWallet: SplitWallet = {
        ...wallet,
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };


      logger.info('Split wallet completed successfully', {
        splitWalletId,
        merchantAddress,
        totalAmount: wallet.totalAmount
      }, 'SplitWalletCleanup');

      return {
        success: true,
        wallet: updatedWallet,
      };

    } catch (error) {
      console.error('🔍 SplitWalletCleanup: Error completing split wallet:', error);
      logger.error('Failed to complete split wallet', error, 'SplitWalletCleanup');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Burn split wallet and cleanup (permanent deletion)
   */
  static async burnSplitWalletAndCleanup(
    splitWalletId: string,
    creatorId: string,
    reason?: string
  ): Promise<SplitWalletResult> {
    try {

      // Get current wallet
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Verify creator has permission to burn the wallet
      if (wallet.creatorId !== creatorId) {
        return {
          success: false,
          error: 'Only the split creator can burn the split wallet',
        };
      }

      // Check if wallet can be burned
      if (wallet.status === 'completed') {
        return {
          success: false,
          error: 'Cannot burn a completed split wallet',
        };
      }

      // Burn the actual wallet (send all funds to a burn address or creator)
      const burnResult = await this.burnSplitWallet(splitWalletId, creatorId);
      if (!burnResult.success) {
        return {
          success: false,
          error: burnResult.error || 'Failed to burn split wallet funds',
        };
      }

      // Delete the private key from local storage
      const deleteKeyResult = await this.deleteSplitWalletPrivateKey(splitWalletId, creatorId);
      if (!deleteKeyResult.success) {
        console.warn('⚠️ SplitWalletCleanup: Failed to delete private key:', deleteKeyResult.error);
        // Don't fail the entire operation for this
      }

      // Delete the wallet record from Firebase
      const docId = wallet.firebaseDocId || splitWalletId;
      await deleteDoc(doc(db, 'splitWallets', docId));

      // CRITICAL: Also delete the corresponding split from splits collection
      try {
        const { SplitStorageService } = await import('../splitStorageService');
        
        const splitDeleteResult = await SplitStorageService.deleteSplit(wallet.billId);
        
        if (splitDeleteResult.success) {
          logger.info('Split database synchronized successfully (burn cleanup)', {
            splitWalletId,
            billId: wallet.billId,
            action: 'deleted'
          }, 'SplitWalletCleanup');
        } else {
          logger.error('Failed to synchronize split database (burn cleanup)', {
            splitWalletId,
            billId: wallet.billId,
            error: splitDeleteResult.error
          }, 'SplitWalletCleanup');
        }
      } catch (syncError) {
        logger.error('Error synchronizing split database during burn cleanup', {
          splitWalletId,
          billId: wallet.billId,
          error: syncError instanceof Error ? syncError.message : String(syncError)
        }, 'SplitWalletCleanup');
        // Don't fail the burn if sync fails, but log the error
      }

      logger.info('Split wallet burned and cleaned up', {
        splitWalletId,
        creatorId,
        reason,
        totalAmount: wallet.totalAmount,
        participantsCount: wallet.participants.length
      }, 'SplitWalletCleanup');

      return {
        success: true,
        wallet: {
          ...wallet,
          status: 'cancelled' as const,
        },
      };

    } catch (error) {
      console.error('🔍 SplitWalletCleanup: Error burning split wallet and cleanup:', error);
      logger.error('Failed to burn split wallet and cleanup', error, 'SplitWalletCleanup');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Private method to burn the actual wallet funds
   */
  private static async burnSplitWallet(
    splitWalletId: string,
    creatorId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {

      // Get the private key
      const privateKeyResult = await this.getSplitWalletPrivateKey(splitWalletId, creatorId);
      if (!privateKeyResult.success || !privateKeyResult.privateKey) {
        return {
          success: false,
          error: privateKeyResult.error || 'Failed to retrieve split wallet private key',
        };
      }

      // Get wallet balance
      const walletResult = await this.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      // Get current balance
      const balanceResult = await this.getWalletBalance(wallet.walletAddress);
      if (!balanceResult.success) {
        return {
          success: false,
          error: balanceResult.error || 'Failed to get wallet balance',
        };
      }

      const balance = balanceResult.balance;
      if (balance.usdcBalance <= 0) {
        return { success: true };
      }

      // Send funds to creator's wallet (or burn address)
      const creatorWalletResult = await this.getUserWallet(creatorId);
      if (!creatorWalletResult.success || !creatorWalletResult.wallet) {
        return {
          success: false,
          error: 'Creator wallet not found',
        };
      }

      const creatorWallet = creatorWalletResult.wallet;

      // Create transaction to send funds to creator
      const transactionParams = {
        fromAddress: wallet.walletAddress,
        toAddress: creatorWallet.address,
        amount: balance.usdcBalance,
        currency: wallet.currency,
        description: `Split wallet burn - funds returned to creator`,
        privateKey: privateKeyResult.privateKey,
      };

      // Execute transaction
      const transactionResult = await this.sendTransaction(transactionParams);
      
      if (!transactionResult.success) {
        return {
          success: false,
          error: transactionResult.error || 'Failed to burn split wallet funds',
        };
      }


      return { success: true };

    } catch (error) {
      console.error('🔍 SplitWalletCleanup: Error burning split wallet funds:', error);
      logger.error('Failed to burn split wallet funds', error, 'SplitWalletCleanup');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Helper methods (direct implementations to avoid circular imports)
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

  private static async getSplitWalletPrivateKey(splitWalletId: string, requesterId: string): Promise<{ success: boolean; privateKey?: string; error?: string }> {
    try {
      const SecureStore = await import('expo-secure-store');
      const storageKey = `split_wallet_private_key_${splitWalletId}_${requesterId}`;
      
      const privateKey = await SecureStore.getItemAsync(storageKey, {
        requireAuthentication: false,
        keychainService: 'WeSplitSplitWalletKeys'
      });
      
      if (!privateKey) {
        return {
          success: false,
          error: `Private key not found in local storage for split wallet ${splitWalletId}`,
        };
      }

      return { success: true, privateKey };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private static async deleteSplitWalletPrivateKey(splitWalletId: string, creatorId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const SecureStore = await import('expo-secure-store');
      const storageKey = `split_wallet_private_key_${splitWalletId}_${creatorId}`;
      
      await SecureStore.deleteItemAsync(storageKey);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private static async sendToCastAccount(splitWalletId: string, castAccountAddress: string, description?: string): Promise<{ success: boolean; error?: string; transactionSignature?: string }> {
    // This is a simplified implementation to avoid circular imports
    // In a real scenario, you might want to implement this directly or use a different approach
    return {
      success: false,
      error: 'sendToCastAccount not implemented in cleanup module to avoid circular imports'
    };
  }

  private static async getWalletBalance(walletAddress: string): Promise<{ success: boolean; balance?: { usdcBalance: number; solBalance: number }; error?: string }> {
    const { balanceUtils } = await import('../shared/balanceUtils');
    return balanceUtils.getWalletBalance(walletAddress);
  }

  private static async getUserWallet(userId: string): Promise<{ success: boolean; wallet?: { address: string }; error?: string }> {
    const { walletService } = await import('../WalletService');
    const wallet = await walletService.getUserWallet(userId);
    return {
      success: !!wallet,
      wallet: wallet ? { address: wallet.address } : undefined,
      error: wallet ? undefined : 'User wallet not found'
    };
  }

  private static async sendTransaction(params: any): Promise<{ success: boolean; error?: string; transactionSignature?: string }> {
    const { consolidatedTransactionService } = await import('../transaction/ConsolidatedTransactionService');
    return consolidatedTransactionService.sendTransaction(params);
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
