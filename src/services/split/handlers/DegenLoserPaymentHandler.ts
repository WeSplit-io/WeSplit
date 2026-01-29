/**
 * Degen Loser Payment Handler
 * Extracted from SplitWalletPayments to reduce bundle size
 * All heavy imports are dynamically loaded to prevent bundling issues
 *
 * @deprecated Internal handler used by SplitWalletPayments and the split facade.
 *             Do not import this directly from UI or non-split services.
 */

import { logger } from '../../core';
import type { PaymentResult } from '../types';
import { getAndValidateWallet, findParticipant, validateWalletBalance, saveWithdrawalTransaction, updateWalletStatusAndSync, shouldCloseWallet } from './SharedPaymentHelpers';

export async function processDegenLoserPayment(
  splitWalletId: string,
  loserUserId: string,
  totalAmount: number,
  description: string | undefined,
  cardId: string | undefined,
  getSplitWallet: (id: string) => Promise<any>,
  getSplitWalletPrivateKeyPrivate: (id: string, userId: string) => Promise<any>,
  verifySplitWalletBalance: (id: string) => Promise<any>,
  cleanupSharedPrivateKeyIfAllSettled: (id: string, participants: any[]) => Promise<void>
): Promise<PaymentResult> {
  try {
    logger.info('🚀 Processing degen loser payment to external card/wallet', {
      splitWalletId,
      loserUserId,
      totalAmount,
      description,
      cardId
    }, 'DegenLoserPaymentHandler');

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

    if (loserInfo.userId !== loserUserId) {
      return {
        success: false,
        error: `You are not the loser of this degen split. The loser is ${loserInfo.name}. Winners should use the "Claim" option to withdraw funds to their in-app wallet.`,
      };
    }

    // Find participant
    const participantValidation = findParticipant(wallet, loserUserId);
    if (!participantValidation.success) {
      return { success: false, error: participantValidation.error };
    }
    const loserParticipant = participantValidation.participant;

    // CRITICAL: Check both status and amountPaid to prevent double withdrawals
    // Status might not be updated yet due to race conditions, so also check amountPaid
    const isAlreadyPaid = loserParticipant.status === 'paid' || 
      (loserParticipant.amountPaid && loserParticipant.amountOwed && 
       loserParticipant.amountPaid >= loserParticipant.amountOwed);
    
    if (isAlreadyPaid) {
      return {
        success: false,
        error: 'You have already transferred your funds to your external card or wallet',
      };
    }

    // CRITICAL FIX: For degen splits, loser should withdraw their amountOwed (what they locked)
    // NOT amountPaid (which might be incorrect due to rounding or partial payments)
    // The amountOwed represents the full amount they locked in the degen split
    const loserLockedAmount = loserParticipant.amountOwed || totalAmount;
    
    // Validate that amountOwed is present
    if (!loserParticipant.amountOwed || loserParticipant.amountOwed <= 0) {
      return {
        success: false,
        error: 'Invalid amount owed. Please contact support.',
      };
    }
    
    // Validate balance
    const balanceValidation = await validateWalletBalance(verifySplitWalletBalance, splitWalletId, loserLockedAmount);
    if (!balanceValidation.success) {
      return { success: false, error: balanceValidation.error };
    }

    // Get destination address
    let destinationAddress: string;
    
    if (cardId) {
      const { ExternalCardService } = await import('../../integrations/external/ExternalCardService');
      const cardInfo = await ExternalCardService.getCardInfo(cardId);
      
      if (!cardInfo.success || !cardInfo.card) {
        return {
          success: false,
          error: 'External card not found. Please link a KAST card first.',
        };
      }
      
      destinationAddress = cardInfo.card.identifier;
    } else {
      const { LinkedWalletService } = await import('../../blockchain/wallet/LinkedWalletService');
      const linkedDestinations = await LinkedWalletService.getLinkedDestinations(loserUserId);
      
      let selectedDestination: { address: string; id: string; type: string; name?: string } | null = null;
      
      if (linkedDestinations.kastCards.length > 0) {
        const firstCard = linkedDestinations.kastCards[0];
        if (firstCard) {
          const cardAddress = firstCard.address || firstCard.identifier;
          if (cardAddress) {
            selectedDestination = {
              address: cardAddress,
              id: firstCard.id,
              type: 'kast',
              name: firstCard.label || 'KAST Card'
            };
          }
        }
      } else if (linkedDestinations.externalWallets.length > 0) {
        const firstWallet = linkedDestinations.externalWallets[0];
        if (firstWallet) {
          const walletAddress = firstWallet.address || firstWallet.identifier;
          if (walletAddress) {
            selectedDestination = {
              address: walletAddress,
              id: firstWallet.id,
              type: 'external',
              name: firstWallet.label || 'External Wallet'
            };
          }
        }
      }
      
      if (!selectedDestination) {
        return {
          success: false,
          error: 'No external card or wallet linked. Please link a KAST card or external wallet in Settings to transfer your funds.',
        };
      }
      
      destinationAddress = selectedDestination.address;
    }

    const privateKeyResult = await getSplitWalletPrivateKeyPrivate(splitWalletId, loserUserId);
    
    if (!privateKeyResult.success || !privateKeyResult.privateKey) {
      return {
        success: false,
        error: privateKeyResult.error || 'Failed to retrieve private key for degen split withdrawal',
      };
    }

    const { CentralizedTransactionHandler } = await import('../../transactions/CentralizedTransactionHandler');
    const transactionResult = await CentralizedTransactionHandler.executeTransaction({
      context: 'fair_split_withdrawal',
      userId: loserUserId.toString(),
      amount: loserLockedAmount,
      currency: wallet.currency as 'USDC' | 'SOL',
      splitWalletId: splitWalletId,
      destinationAddress: destinationAddress,
      splitId: wallet.id,
      billId: wallet.billId,
      memo: description || `Degen Split loser transfer to external card/wallet for ${loserUserId}`
    });
    
    const transactionSignature = transactionResult.transactionSignature;
    
    if (!transactionResult.success || !transactionSignature) {
      return {
        success: false,
        error: transactionResult.error || 'Transaction failed',
      };
    }

    // 🚫 Skip transaction post-processing for degen loser flow to avoid heavy imports (OOM)
    // We don't award points for this flow; on-chain success is sufficient
    logger.info('Skipping transaction post-processing for degen loser payment to reduce memory usage', null, 'DegenLoserPaymentHandler');

    // Update participant status using shared helper
    // CRITICAL: Set amountPaid to amountOwed to mark as fully paid
    const { updateParticipantInList } = await import('./SharedPaymentHelpers');
    const updatedParticipants = updateParticipantInList(
      wallet.participants,
      loserUserId,
      {
        status: 'paid',
        amountPaid: loserParticipant.amountOwed, // Use amountOwed to ensure full payment is recorded
        transactionSignature: transactionSignature,
        paidAt: new Date().toISOString(),
      }
    );

    // Check if wallet should be closed and update status
    const walletShouldClose = await shouldCloseWallet(verifySplitWalletBalance, splitWalletId, wallet.status);
    const updateResult = await updateWalletStatusAndSync(
      wallet,
      splitWalletId,
      {
        participants: updatedParticipants,
        finalTransactionSignature: transactionSignature,
      },
      walletShouldClose
    );

    if (!updateResult.success) {
      logger.warn('Failed to update wallet status, but transaction succeeded', {
        splitWalletId,
        error: updateResult.error,
      }, 'DegenLoserPaymentHandler');
    }

    // ✅ CRITICAL: Invalidate cache to ensure UI shows updated status immediately
    const { SplitWalletCache } = await import('../SplitWalletCache');
    SplitWalletCache.invalidate(splitWalletId);
    if (wallet.billId) {
      SplitWalletCache.invalidate(wallet.billId);
    }

    await cleanupSharedPrivateKeyIfAllSettled(splitWalletId, updatedParticipants);

    logger.info('✅ Degen loser payment completed successfully', {
      splitWalletId,
      loserUserId,
      amount: loserLockedAmount,
      transactionSignature: transactionSignature,
      walletClosed: shouldCloseWallet
    }, 'DegenLoserPaymentHandler');

    return {
      success: true,
      transactionSignature: transactionSignature,
      amount: loserLockedAmount
    };
  } catch (error) {
    logger.error('Failed to process degen loser payment', error as any, 'DegenLoserPaymentHandler');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
