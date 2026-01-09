/**
 * Fair Split Withdrawal Handler
 * Extracted from SplitWalletPayments to reduce bundle size
 * All heavy imports are dynamically loaded to prevent bundling issues
 */

import { logger } from '../../core';
import type { PaymentResult } from '../types';
import { getAndValidateWallet, validateWalletBalance } from './SharedPaymentHelpers';

export async function extractFairSplitFunds(
  splitWalletId: string,
  recipientAddress: string,
  creatorId: string,
  description: string | undefined,
  getSplitWallet: (id: string) => Promise<any>,
  verifySplitWalletBalance: (id: string) => Promise<any>
): Promise<PaymentResult> {
  try {
    logger.info('🚀 Starting Fair Split funds extraction', {
      splitWalletId,
      recipientAddress,
      creatorId,
      description
    }, 'FairSplitWithdrawalHandler');

    // Get and validate wallet
    const walletValidation = await getAndValidateWallet(getSplitWallet, splitWalletId);
    if (!walletValidation.success) {
      return { success: false, error: walletValidation.error };
    }
    const wallet = walletValidation.wallet;

    // Validate creator
    if (wallet.creatorId !== creatorId) {
      return {
        success: false,
        error: 'Only the split creator can extract funds from a Fair Split',
      };
    }

    // Validate wallet status
    if (wallet.status === 'completed') {
      return {
        success: false,
        error: 'Withdrawal has already been completed. You cannot withdraw funds from this split again.',
      };
    }

    // Validate balance
    const balanceValidation = await validateWalletBalance(verifySplitWalletBalance, splitWalletId);
    if (!balanceValidation.success) {
      return { success: false, error: balanceValidation.error };
    }

    const availableBalance = balanceValidation.balance;
    // Use wallet.totalAmount for merchant payments (SPEND), availableBalance for personal splits
    // For SPEND merchant payments, we want to send the exact totalAmount, not just what's available
    const withdrawalAmount = wallet.totalAmount || Math.floor(availableBalance * Math.pow(10, 6)) / Math.pow(10, 6);
    
    if (withdrawalAmount <= 0) {
      return {
        success: false,
        error: 'Insufficient balance for withdrawal',
      };
    }

    // Dynamically import UnifiedWithdrawalService to reduce bundle size
    const { UnifiedWithdrawalService } = await import('../../transactions/UnifiedWithdrawalService');
    const transactionResult = await UnifiedWithdrawalService.withdraw({
      sourceType: 'split_wallet',
      sourceId: splitWalletId,
      destinationAddress: recipientAddress,
      userId: creatorId.toString(),
      amount: withdrawalAmount,
      currency: wallet.currency as 'USDC' | 'SOL',
      memo: description || `Fair Split funds extraction for bill ${wallet.billId}`,
      splitId: wallet.id,
      billId: wallet.billId
    });
    
    if (!transactionResult.success || !transactionResult.transactionSignature) {
      return {
        success: false,
        error: transactionResult.error || 'Transaction failed',
      };
    }

    // Save transaction using shared helper
    const { saveWithdrawalTransaction } = await import('./SharedPaymentHelpers');
    await saveWithdrawalTransaction({
      userId: creatorId,
      toAddress: recipientAddress,
      amount: withdrawalAmount,
      signature: transactionResult.transactionSignature,
      memo: description || `Fair Split funds extraction for bill ${wallet.billId}`,
      currency: wallet.currency as 'USDC' | 'SOL',
    });

    // CRITICAL FIX: Use atomic update to sync status to splits collection
    // Status update must succeed or operation should fail
    const firebaseDocId = wallet.firebaseDocId || splitWalletId;
    const completedAt = new Date().toISOString();
    const { SplitWalletAtomicUpdates } = await import('../SplitWalletAtomicUpdates');
    const { SplitWalletCache } = await import('../SplitWalletCache');
    
    const statusUpdateResult = await SplitWalletAtomicUpdates.updateWalletStatus(
      firebaseDocId,
      wallet.billId,
      'completed',
      completedAt
    );
    
    if (!statusUpdateResult.success) {
      logger.error('Failed to update wallet status atomically', {
        splitWalletId,
        error: statusUpdateResult.error,
      }, 'FairSplitWithdrawalHandler');
      
      // Retry once with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 500));
      const retryResult = await SplitWalletAtomicUpdates.updateWalletStatus(
        firebaseDocId,
        wallet.billId,
        'completed',
        completedAt
      );

      if (!retryResult.success) {
        return {
          success: false,
          error: `Transaction succeeded but status update failed: ${retryResult.error || 'Unknown error'}. Please refresh the app.`,
          transactionSignature: transactionResult.transactionSignature,
          amount: withdrawalAmount
        };
      }
    }

    // Invalidate cache to ensure fresh data
    SplitWalletCache.invalidate(splitWalletId);
    SplitWalletCache.invalidate(wallet.billId);
    
    // Also update finalTransactionSignature
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../../../config/firebase/firebase');
    await updateDoc(doc(db, 'splitWallets', firebaseDocId), {
      finalTransactionSignature: transactionResult.transactionSignature
    });

    logger.info('✅ Fair split funds extraction completed successfully', {
      splitWalletId,
      recipientAddress,
      amount: withdrawalAmount,
      transactionSignature: transactionResult.transactionSignature
    }, 'FairSplitWithdrawalHandler');

    return {
      success: true,
      transactionSignature: transactionResult.transactionSignature,
      amount: withdrawalAmount
    };
  } catch (error) {
    logger.error('Failed to extract fair split funds', error as any, 'FairSplitWithdrawalHandler');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
