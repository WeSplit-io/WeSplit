/**
 * Shared Payment Helpers
 * Common functions used across all payment handlers to reduce duplication
 *
 * @deprecated Internal helpers used by SplitWalletPayments and the split facade.
 *             Do not import this directly from UI or non-split services.
 */

import { logger } from '../../core';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult } from '../types';

/**
 * Get and validate split wallet
 * Returns wallet if valid, error result if not
 */
export async function getAndValidateWallet(
  getSplitWallet: (id: string) => Promise<SplitWalletResult>,
  splitWalletId: string
): Promise<{ success: true; wallet: SplitWallet } | { success: false; error: string }> {
  const walletResult = await getSplitWallet(splitWalletId);
  if (!walletResult.success || !walletResult.wallet) {
    return {
      success: false,
      error: walletResult.error || 'Split wallet not found',
    };
  }
  return {
    success: true,
    wallet: walletResult.wallet,
  };
}

/**
 * Find participant in wallet
 * Returns participant if found, error result if not
 */
export function findParticipant(
  wallet: SplitWallet,
  participantId: string
): { success: true; participant: SplitWalletParticipant } | { success: false; error: string } {
  const participant = wallet.participants.find((p) => p.userId === participantId);
  if (!participant) {
    return {
      success: false,
      error: 'Participant not found in split wallet',
    };
  }
  return {
    success: true,
    participant,
  };
}

/**
 * Update participant in participants list
 */
export function updateParticipantInList(
  participants: SplitWalletParticipant[],
  participantId: string,
  updates: {
    status: 'pending' | 'locked' | 'paid';
    amountPaid?: number;
    transactionSignature: string;
    paidAt?: string;
  }
): SplitWalletParticipant[] {
  return participants.map((p) =>
    p.userId === participantId
      ? {
          ...p,
          status: updates.status,
          amountPaid: updates.amountPaid !== undefined ? updates.amountPaid : p.amountPaid,
          transactionSignature: updates.transactionSignature,
          paidAt: updates.paidAt || new Date().toISOString(),
        }
      : p
  );
}

/**
 * Validate wallet balance for withdrawal
 */
export async function validateWalletBalance(
  verifySplitWalletBalance: (id: string) => Promise<{ success: boolean; balance?: number; error?: string }>,
  splitWalletId: string,
  requiredAmount?: number
): Promise<{ success: true; balance: number } | { success: false; error: string }> {
  const balanceResult = await verifySplitWalletBalance(splitWalletId);
  if (!balanceResult.success) {
    return {
      success: false,
      error: `Failed to verify split wallet balance: ${balanceResult.error || 'Unknown error'}`,
    };
  }

  const balance = balanceResult.balance || 0;
  if (balance <= 0) {
    return {
      success: false,
      error: `Split wallet has no funds available (balance: ${balance} USDC)`,
    };
  }

  if (requiredAmount && balance < requiredAmount) {
    return {
      success: false,
      error: `Insufficient balance. Required: ${requiredAmount} USDC, Available: ${balance} USDC`,
    };
  }

  return {
    success: true,
    balance,
  };
}

/**
 * Save withdrawal transaction
 */
export async function saveWithdrawalTransaction(params: {
  userId: string;
  toAddress: string;
  amount: number;
  signature: string;
  memo: string;
  currency: 'USDC' | 'SOL';
}): Promise<void> {
  // PERF: For split wallet withdrawals we skip post-processing to avoid
  // heavy Firestore work and OOMs. The on-chain tx is already confirmed.
  if (params.memo?.toLowerCase().includes('split') || params.currency === 'USDC') {
    logger.info('Skipping post-processing for split withdrawal (lightweight path)', {
      userId: params.userId,
      signature: params.signature,
    }, 'SharedPaymentHelpers');
    return;
  }
  try {
    const { saveTransactionAndAwardPoints } = await import('../../shared/transactionPostProcessing');
    await saveTransactionAndAwardPoints({
      userId: params.userId,
      toAddress: params.toAddress,
      amount: params.amount,
      signature: params.signature,
      transactionType: 'split_wallet_withdrawal',
      companyFee: 0,
      netAmount: params.amount,
      memo: params.memo,
      currency: params.currency,
    });
  } catch (saveError) {
    logger.error('❌ Failed to save withdrawal transaction', {
      error: saveError instanceof Error ? saveError.message : String(saveError),
      userId: params.userId,
      signature: params.signature,
    }, 'SharedPaymentHelpers');
  }
}

/**
 * Update wallet status and sync to splits collection
 */
export async function updateWalletStatusAndSync(
  wallet: SplitWallet,
  splitWalletId: string,
  updateData: {
    participants?: SplitWalletParticipant[];
    status?: string;
    completedAt?: string;
    finalTransactionSignature?: string;
    lastUpdated?: string;
  },
  shouldCloseWallet: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // Dynamically import Firebase to reduce bundle size
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../../../config/firebase/firebase');

    const firebaseDocId = wallet.firebaseDocId || splitWalletId;
    const finalUpdateData: any = {
      ...updateData,
      lastUpdated: updateData.lastUpdated || new Date().toISOString(),
    };

    if (shouldCloseWallet) {
      finalUpdateData.status = 'closed';
      finalUpdateData.completedAt = finalUpdateData.completedAt || new Date().toISOString();
    }

    await updateDoc(doc(db, 'splitWallets', firebaseDocId), finalUpdateData);

    // CRITICAL FIX: Always sync status to splits collection, not just when closing
    // This ensures split document stays in sync with wallet status changes
    if (updateData.status) {
      try {
        const { SplitDataSynchronizer } = await import('../SplitDataSynchronizer');
        await SplitDataSynchronizer.syncSplitStatusFromSplitWalletToSplitStorage(
          wallet.billId,
          updateData.status,
          updateData.completedAt || finalUpdateData.completedAt
        );
      } catch (syncError) {
        logger.error('❌ Failed to sync split storage status', {
          splitWalletId,
          billId: wallet.billId,
          status: updateData.status,
          error: syncError instanceof Error ? syncError.message : String(syncError),
        }, 'SharedPaymentHelpers');
        // Don't fail the operation if sync fails, but log the error
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to update wallet status', {
      splitWalletId,
      error: error instanceof Error ? error.message : String(error),
    }, 'SharedPaymentHelpers');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if wallet should be closed (balance is 0 and status is spinning_completed)
 */
export async function shouldCloseWallet(
  verifySplitWalletBalance: (id: string) => Promise<{ success: boolean; balance?: number; error?: string }>,
  splitWalletId: string,
  walletStatus: string
): Promise<boolean> {
  if (walletStatus !== 'spinning_completed') {
    return false;
  }

  const balanceResult = await verifySplitWalletBalance(splitWalletId);
  if (!balanceResult.success) {
    return false;
  }

  const balance = balanceResult.balance || 0;
  return balance === 0 || balance < 0.000001;
}
