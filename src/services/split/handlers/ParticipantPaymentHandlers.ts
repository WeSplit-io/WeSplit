/**
 * Participant Payment Handlers
 * Extracted from SplitWalletPayments to reduce bundle size
 *
 * @deprecated Internal handlers used by SplitWalletPayments and the split facade.
 *             Do not import this directly from UI or non-split services.
 */

import { logger } from '../../core';
import { roundUsdcAmount } from '../../../utils/ui/format';
import type { PaymentResult } from '../types';
import { getAndValidateWallet, findParticipant, updateParticipantInList } from './SharedPaymentHelpers';

export async function processDegenFundLocking(
  splitWalletId: string,
  participantId: string,
  amount: number,
  transactionSignature: string | undefined,
  getSplitWallet: (id: string) => Promise<any>,
  checkUserBalance: (userId: string, walletAddress: string, amount: number, context: string) => Promise<string | null>,
  executePaymentTransaction: (params: any) => Promise<any>,
  savePaymentTransaction: (params: any) => Promise<void>
): Promise<PaymentResult> {
  const startTime = Date.now();
  try {
    logger.info('Processing degen split fund locking', {
      splitWalletId,
      participantId,
      amount,
      hasTransactionSignature: !!transactionSignature
    });

    // Get and validate wallet
    const walletValidation = await getAndValidateWallet(getSplitWallet, splitWalletId);
    if (!walletValidation.success) {
      return { success: false, error: walletValidation.error };
    }
    const wallet = walletValidation.wallet;

    // Find participant
    const participantValidation = findParticipant(wallet, participantId);
    if (!participantValidation.success) {
      return { success: false, error: participantValidation.error };
    }
    const participant = participantValidation.participant;

    const roundedAmount = roundUsdcAmount(amount);
    if (roundedAmount <= 0) {
      return {
        success: false,
        error: 'Invalid payment amount',
      };
    }

    if (participant.status === 'locked' || participant.amountPaid >= participant.amountOwed) {
      return {
        success: false,
        error: 'Participant has already locked their funds',
      };
    }

    // ✅ MEMORY OPTIMIZATION: Use simplifiedWalletService instead of full walletService (720 modules)
    const { simplifiedWalletService } = await import('../../blockchain/wallet/simplifiedWalletService');
    const userWallet = await simplifiedWalletService.getWalletInfo(participantId);
    if (!userWallet) {
      return {
        success: false,
        error: 'User wallet not found. Please ensure you have a wallet set up.',
      };
    }

    const balanceError = await checkUserBalance(participantId, userWallet.address, roundedAmount, 'degen split funding');
    if (balanceError) {
      return { success: false, error: balanceError };
    }

    if (!(userWallet.secretKey || (userWallet as any).privateKey)) {
      return {
        success: false,
        error: 'User wallet secret key is missing. Please ensure your wallet is properly set up.'
      };
    }

    const transactionResult = await executePaymentTransaction({
      userId: participantId,
      context: 'degen_split_lock',
      amount: roundedAmount,
      splitWalletId: wallet.id,
      billId: wallet.billId,
      memo: `Degen Split fund locking - ${wallet.id}`
    });

    if (!transactionResult.success || !transactionResult.transactionSignature) {
      return {
        success: false,
        error: transactionResult.error || 'Transaction failed',
      };
    }

    await savePaymentTransaction({
      userId: participantId,
      toAddress: wallet.walletAddress,
      amount: roundedAmount,
      signature: transactionResult.transactionSignature,
      memo: `Degen Split fund locking - ${wallet.id}`,
      transactionType: 'split_payment'
    });

    const finalTransactionSignature = transactionResult.transactionSignature || transactionSignature;
    // CRITICAL FIX: Accumulate amountPaid instead of overwriting
    const newAmountPaid = roundUsdcAmount((participant.amountPaid || 0) + roundedAmount);
    // VALIDATION: Ensure amountPaid doesn't exceed amountOwed
    const finalAmountPaid = Math.min(newAmountPaid, participant.amountOwed);
    
    // VALIDATION: Warn if payment would exceed amountOwed
    if (newAmountPaid > participant.amountOwed) {
      logger.warn('Payment amount would exceed amountOwed, capping to amountOwed', {
        splitWalletId,
        participantId,
        newAmountPaid,
        amountOwed: participant.amountOwed,
        cappedAmount: finalAmountPaid
      }, 'ParticipantPaymentHandlers');
    }
    
    // VALIDATION: Status transition validation - only allow valid transitions
    // pending -> locked (degen) or pending -> paid (fair)
    const currentStatus = participant.status;
    let newStatus: 'pending' | 'locked' = currentStatus;
    
    if (finalAmountPaid >= participant.amountOwed) {
      // Fully paid - can transition to 'locked'
      if (currentStatus === 'pending') {
        newStatus = 'locked';
      } else if (currentStatus === 'locked') {
        // Already locked, keep status
        newStatus = 'locked';
      } else {
        // Invalid state - log warning but allow transition
        logger.warn('Invalid status transition detected', {
          splitWalletId,
          participantId,
          currentStatus,
          newStatus: 'locked'
        }, 'ParticipantPaymentHandlers');
        newStatus = 'locked';
      }
    } else {
      // Not fully paid - keep current status (should be 'pending')
      if (currentStatus !== 'pending' && currentStatus !== 'locked') {
        logger.warn('Unexpected status for partially paid participant', {
          splitWalletId,
          participantId,
          currentStatus,
          amountPaid: finalAmountPaid,
          amountOwed: participant.amountOwed
        }, 'ParticipantPaymentHandlers');
      }
      newStatus = currentStatus;
    }
    
    const updatedParticipants = updateParticipantInList(
      wallet.participants,
      participantId,
      {
        status: newStatus,
        amountPaid: finalAmountPaid,
        transactionSignature: finalTransactionSignature,
      }
    );

    const firebaseDocId = wallet.firebaseDocId || splitWalletId;
    const updatedParticipant = updatedParticipants.find((p: any) => p.userId === participantId);
    
    if (!updatedParticipant) {
      return {
        success: false,
        error: 'Updated participant data not found'
      };
    }

    const { SplitWalletAtomicUpdates } = await import('../SplitWalletAtomicUpdates');
    const dbUpdateResult = await SplitWalletAtomicUpdates.updateParticipantPayment(
      firebaseDocId,
      wallet.billId,
      updatedParticipants,
      updatedParticipant,
      participantId,
      true
    );

    if (!dbUpdateResult.success) {
      return {
        success: false,
        error: dbUpdateResult.error || 'Database update failed'
      };
    }

    logger.info('Degen split fund locking completed successfully', {
      splitWalletId,
      participantId,
      amount: roundedAmount,
      transactionSignature: finalTransactionSignature,
      transactionTime: Date.now() - startTime
    }, 'ParticipantPaymentHandlers');

    return {
      success: true,
      transactionSignature: finalTransactionSignature,
      amount: roundedAmount
    };
  } catch (error) {
    logger.error('Failed to process degen split fund locking', { error: error instanceof Error ? error.message : String(error) } as any, 'ParticipantPaymentHandlers');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function processParticipantPayment(
  splitWalletId: string,
  participantId: string,
  amount: number,
  transactionSignature: string | undefined,
  getSplitWallet: (id: string) => Promise<any>,
  checkUserBalance: (userId: string, walletAddress: string, amount: number, context: string) => Promise<string | null>,
  executePaymentTransaction: (params: any) => Promise<any>
): Promise<PaymentResult> {
  try {
    // Get and validate wallet
    const walletValidation = await getAndValidateWallet(getSplitWallet, splitWalletId);
    if (!walletValidation.success) {
      return { success: false, error: walletValidation.error };
    }
    const wallet = walletValidation.wallet;

    // Find participant
    const participantValidation = findParticipant(wallet, participantId);
    if (!participantValidation.success) {
      return { success: false, error: participantValidation.error };
    }
    const participant = participantValidation.participant;

    const roundedAmount = roundUsdcAmount(amount);
    if (roundedAmount <= 0) {
      return {
        success: false,
        error: 'Invalid payment amount',
      };
    }

    if (participant.status === 'paid' || participant.amountPaid >= participant.amountOwed) {
      return {
        success: false,
        error: 'Participant has already paid their full share',
      };
    }

    // ✅ MEMORY OPTIMIZATION: Use simplifiedWalletService instead of full walletService (720 modules)
    const { simplifiedWalletService } = await import('../../blockchain/wallet/simplifiedWalletService');
    const userWallet = await simplifiedWalletService.getWalletInfo(participantId);
    if (!userWallet || !(userWallet.secretKey || (userWallet as any).privateKey)) {
      return {
        success: false,
        error: 'User wallet not found or missing private key. Please ensure you have a wallet set up.',
      };
    }

    const balanceError = await checkUserBalance(participantId, userWallet.address, roundedAmount, 'fair split funding');
    if (balanceError) {
      return { success: false, error: balanceError };
    }

    const transactionResult = await executePaymentTransaction({
      userId: participantId,
      context: 'fair_split_contribution',
      amount: roundedAmount,
      splitWalletId: wallet.id,
      billId: wallet.billId,
      memo: `Fair Split participant payment - ${wallet.id}`
    });

    if (!transactionResult.success || !transactionResult.transactionSignature) {
      return {
        success: false,
        error: transactionResult.error || 'Transaction failed',
      };
    }

    // CRITICAL FIX: Accumulate amountPaid instead of overwriting
    const newAmountPaid = roundUsdcAmount((participant.amountPaid || 0) + roundedAmount);
    // VALIDATION: Ensure amountPaid doesn't exceed amountOwed
    const finalAmountPaid = Math.min(newAmountPaid, participant.amountOwed);
    
    // VALIDATION: Warn if payment would exceed amountOwed
    if (newAmountPaid > participant.amountOwed) {
      logger.warn('Payment amount would exceed amountOwed, capping to amountOwed', {
        splitWalletId,
        participantId,
        newAmountPaid,
        amountOwed: participant.amountOwed,
        cappedAmount: finalAmountPaid
      }, 'ParticipantPaymentHandlers');
    }
    
    // VALIDATION: Status transition validation - only allow valid transitions
    // pending -> paid (fair split)
    const currentStatus = participant.status;
    let newStatus: 'pending' | 'paid' = currentStatus;
    
    if (finalAmountPaid >= participant.amountOwed) {
      // Fully paid - can transition to 'paid'
      if (currentStatus === 'pending') {
        newStatus = 'paid';
      } else if (currentStatus === 'paid') {
        // Already paid, keep status
        newStatus = 'paid';
      } else {
        // Invalid state - log warning but allow transition
        logger.warn('Invalid status transition detected', {
          splitWalletId,
          participantId,
          currentStatus,
          newStatus: 'paid'
        }, 'ParticipantPaymentHandlers');
        newStatus = 'paid';
      }
    } else {
      // Not fully paid - keep current status (should be 'pending')
      if (currentStatus !== 'pending' && currentStatus !== 'paid') {
        logger.warn('Unexpected status for partially paid participant', {
          splitWalletId,
          participantId,
          currentStatus,
          amountPaid: finalAmountPaid,
          amountOwed: participant.amountOwed
        }, 'ParticipantPaymentHandlers');
      }
      newStatus = currentStatus;
    }

    const updatedParticipants = updateParticipantInList(
      wallet.participants,
      participantId,
      {
        status: newStatus,
        amountPaid: finalAmountPaid,
        transactionSignature: transactionResult.transactionSignature,
      }
    );

    try {
      const { splitRewardsService } = await import('../../../services/rewards/splitRewardsService');
      const { SplitStorageService } = await import('../../splits/splitStorageService');
      
      const splitResult = await SplitStorageService.getSplitByBillId(wallet.billId);
      if (splitResult.success && splitResult.split) {
        const split = splitResult.split;
        if (split.splitType === 'fair') {
          await splitRewardsService.awardFairSplitParticipation({
            userId: participantId,
            splitId: split.id,
            splitType: 'fair',
            splitAmount: roundedAmount,
            isOwner: false
          });
        }
      }
    } catch (rewardError) {
      logger.error('Failed to award Fair Split participation reward', {
        participantId,
        splitWalletId,
        rewardError
      }, 'ParticipantPaymentHandlers');
    }

    const firebaseDocId = wallet.firebaseDocId || splitWalletId;
    const updatedParticipant = updatedParticipants.find((p: any) => p.userId === participantId);
    
    if (!updatedParticipant) {
      return {
        success: false,
        error: 'Updated participant data not found'
      };
    }

    const { SplitWalletAtomicUpdates } = await import('../SplitWalletAtomicUpdates');
    const dbUpdateResult = await SplitWalletAtomicUpdates.updateParticipantPayment(
      firebaseDocId,
      wallet.billId,
      updatedParticipants,
      updatedParticipant,
      participantId,
      false
    );

    if (!dbUpdateResult.success) {
      return {
        success: false,
        error: dbUpdateResult.error || 'Database update failed'
      };
    }

    return {
      success: true,
      transactionSignature: transactionResult.transactionSignature,
      amount: roundedAmount
    };
  } catch (error) {
    logger.error('Failed to process participant payment', error as any, 'ParticipantPaymentHandlers');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
