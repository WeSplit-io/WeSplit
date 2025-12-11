/**
 * Degen Winner Payout Handler
 * Extracted from SplitWalletPayments to reduce bundle size
 */

import { logger } from '../../core';
import type { PaymentResult } from '../types';
import { getAndValidateWallet, findParticipant, validateWalletBalance, saveWithdrawalTransaction, updateWalletStatusAndSync, shouldCloseWallet } from './SharedPaymentHelpers';

export async function processDegenWinnerPayout(
  splitWalletId: string,
  winnerUserId: string,
  winnerAddress: string,
  totalAmount: number,
  description: string | undefined,
  getSplitWallet: (id: string) => Promise<any>,
  getSplitWalletPrivateKeyPrivate: (id: string, userId: string) => Promise<any>,
  verifySplitWalletBalance: (id: string) => Promise<any>
): Promise<PaymentResult> {
  try {
    logger.info('🚀 Processing degen winner payout', {
      splitWalletId,
      winnerUserId,
      winnerAddress,
      totalAmount,
      description
    }, 'DegenWinnerPayoutHandler');

    // Get and validate wallet
    const walletValidation = await getAndValidateWallet(getSplitWallet, splitWalletId);
    if (!walletValidation.success) {
      return { success: false, error: walletValidation.error };
    }
    const wallet = walletValidation.wallet;
    const loserInfo = wallet.degenLoser || wallet.degenWinner;
    
    if (!loserInfo) {
      return {
        success: false,
        error: 'No loser has been selected for this degen split yet. Please wait for the roulette to complete.',
      };
    }

    if (loserInfo.userId === winnerUserId) {
      return {
        success: false,
        error: `You are the loser of this degen split. Please use the "Transfer to External Card" option to transfer your funds.`,
      };
    }

    // Find participant
    const participantValidation = findParticipant(wallet, winnerUserId);
    if (!participantValidation.success) {
      return { success: false, error: 'You are not a participant in this degen split.' };
    }
    const userParticipant = participantValidation.participant;

    // Check if winner has already been paid
    if (userParticipant.status === 'paid') {
      return {
        success: false,
        error: 'Winner has already claimed their funds',
      };
    }

    // Check if another participant has already been marked as winner
    const existingPaidParticipants = wallet.participants.filter(p => p.status === 'paid' && p.userId !== winnerUserId);
    if (existingPaidParticipants.length > 0) {
      const paidParticipant = existingPaidParticipants[0];
      return {
        success: false,
        error: `Another participant (${paidParticipant.name}) has already been marked as the winner.`,
      };
    }

    const actualTotalAmount = wallet.participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    
    // Validate balance
    const balanceValidation = await validateWalletBalance(verifySplitWalletBalance, splitWalletId, actualTotalAmount);
    if (!balanceValidation.success) {
      return { success: false, error: balanceValidation.error };
    }

    const privateKeyResult = await getSplitWalletPrivateKeyPrivate(splitWalletId, winnerUserId);
    
    if (!privateKeyResult.success || !privateKeyResult.privateKey) {
      return {
        success: false,
        error: privateKeyResult.error || 'Failed to retrieve private key for degen split withdrawal',
      };
    }

    const { CentralizedTransactionHandler } = await import('../../transactions/CentralizedTransactionHandler');
    const transactionResult = await CentralizedTransactionHandler.executeTransaction({
      context: 'fair_split_withdrawal',
      userId: winnerUserId.toString(),
      amount: actualTotalAmount,
      currency: wallet.currency as 'USDC' | 'SOL',
      splitWalletId: splitWalletId,
      destinationAddress: winnerAddress,
      splitId: wallet.id,
      billId: wallet.billId,
      memo: description || `Degen Split winner payout for ${winnerUserId}`
    });
    
    const transactionSignature = transactionResult.transactionSignature;
    
    if (!transactionResult.success) {
      return {
        success: false,
        error: transactionResult.error || 'Transaction failed',
      };
    }

    if (!transactionSignature) {
      return {
        success: false,
        error: 'Transaction succeeded but no signature was returned',
      };
    }

    // Save transaction using shared helper
    await saveWithdrawalTransaction({
      userId: winnerUserId,
      toAddress: winnerAddress,
      amount: actualTotalAmount,
      signature: transactionSignature,
      memo: description || `Degen Split winner payout for ${winnerUserId}`,
      currency: wallet.currency as 'USDC' | 'SOL',
    });

    // Update participant status
    const updatedParticipants = wallet.participants.map((p: any) => {
      if (p.userId === winnerUserId) {
        return {
          ...p,
          status: 'paid' as const,
          amountPaid: actualTotalAmount,
          transactionSignature: transactionSignature,
          paidAt: new Date().toISOString(),
        };
      } else {
        return {
          ...p,
          status: p.status === 'paid' ? 'locked' as const : p.status
        };
      }
    });
    
    // Check if wallet should be closed and update status
    const walletShouldClose = await shouldCloseWallet(verifySplitWalletBalance, splitWalletId, wallet.status);
    const updateResult = await updateWalletStatusAndSync(
      wallet,
      splitWalletId,
      {
        participants: updatedParticipants,
        status: walletShouldClose ? 'closed' : 'completed',
        completedAt: new Date().toISOString(),
        finalTransactionSignature: transactionSignature,
      },
      walletShouldClose
    );

    if (!updateResult.success) {
      logger.warn('Failed to update wallet status, but transaction succeeded', {
        splitWalletId,
        error: updateResult.error,
      }, 'DegenWinnerPayoutHandler');
    }

    logger.info('✅ Degen winner payout completed successfully', {
      splitWalletId,
      winnerUserId,
      amount: actualTotalAmount,
      transactionSignature
    }, 'DegenWinnerPayoutHandler');

    return {
      success: true,
      transactionSignature: transactionSignature,
      amount: actualTotalAmount
    };
  } catch (error) {
    logger.error('Failed to process degen winner payout', error as any, 'DegenWinnerPayoutHandler');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
