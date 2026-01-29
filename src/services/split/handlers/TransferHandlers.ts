/**
 * Transfer Handlers
 * Extracted from SplitWalletPayments to reduce bundle size
 *
 * @deprecated Internal handlers used by SplitWalletPayments and the split facade.
 *             Do not import this directly from UI or non-split services.
 */

import { logger } from '../../core';
import type { PaymentResult } from '../types';
import { getAndValidateWallet, validateWalletBalance, saveWithdrawalTransaction } from './SharedPaymentHelpers';

export async function sendToCastAccount(
  splitWalletId: string,
  castAccountAddress: string,
  description: string | undefined,
  getSplitWallet: (id: string) => Promise<any>,
  verifySplitWalletBalance: (id: string) => Promise<any>,
  getFairSplitPrivateKeyPrivate: (id: string, creatorId: string) => Promise<any>
): Promise<PaymentResult> {
  try {
    logger.info('🚀 Sending funds to Cast account', {
      splitWalletId,
      castAccountAddress,
      description
    }, 'TransferHandlers');

    // Get and validate wallet
    const walletValidation = await getAndValidateWallet(getSplitWallet, splitWalletId);
    if (!walletValidation.success) {
      return { success: false, error: walletValidation.error };
    }
    const wallet = walletValidation.wallet;

    // Validate balance
    const balanceValidation = await validateWalletBalance(verifySplitWalletBalance, splitWalletId);
    if (!balanceValidation.success) {
      return { success: false, error: balanceValidation.error };
    }
    const availableBalance = balanceValidation.balance;

    const privateKeyResult = await getFairSplitPrivateKeyPrivate(splitWalletId, wallet.creatorId);
    if (!privateKeyResult.success || !privateKeyResult.privateKey) {
      return {
        success: false,
        error: privateKeyResult.error || 'Failed to retrieve private key',
      };
    }

    const { CentralizedTransactionHandler } = await import('../../transactions/CentralizedTransactionHandler');
    const transactionResult = await CentralizedTransactionHandler.executeTransaction({
      context: 'fair_split_withdrawal',
      userId: wallet.creatorId.toString(),
      amount: availableBalance,
      currency: wallet.currency as 'USDC' | 'SOL',
      splitWalletId,
      destinationAddress: castAccountAddress,
      splitId: wallet.id,
      billId: wallet.billId,
      memo: description || `Cast account transfer for ${wallet.id}`
    });

    if (!transactionResult.success) {
      return {
        success: false,
        error: transactionResult.error || 'Transaction failed',
      };
    }

    // Save transaction using shared helper
    await saveWithdrawalTransaction({
      userId: wallet.creatorId,
      toAddress: castAccountAddress,
      amount: availableBalance,
      signature: transactionResult.transactionSignature!,
      memo: description || `Cast account transfer for ${wallet.id}`,
      currency: wallet.currency as 'USDC' | 'SOL',
    });

    logger.info('✅ Cast account transfer completed successfully', {
      splitWalletId,
      castAccountAddress,
      amount: availableBalance,
      transactionSignature: transactionResult.transactionSignature
    }, 'TransferHandlers');

    return {
      success: true,
      transactionSignature: transactionResult.transactionSignature,
      amount: availableBalance
    };
  } catch (error) {
    logger.error('Failed to send funds to Cast account', error as any, 'TransferHandlers');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function transferToUserWallet(
  splitWalletId: string,
  userId: string,
  amount: number,
  getSplitWallet: (id: string) => Promise<any>,
  getFairSplitPrivateKeyPrivate: (id: string, creatorId: string) => Promise<any>
): Promise<PaymentResult> {
  try {
    logger.info('🚀 Transferring funds to user wallet', {
      splitWalletId,
      userId,
      amount
    }, 'TransferHandlers');
    
    // Get and validate wallet
    const walletValidation = await getAndValidateWallet(getSplitWallet, splitWalletId);
    if (!walletValidation.success) {
      return { success: false, error: walletValidation.error };
    }
    const wallet = walletValidation.wallet;
    // ✅ MEMORY OPTIMIZATION: Use simplifiedWalletService instead of full walletService (720 modules)
    const { simplifiedWalletService } = await import('../../blockchain/wallet/simplifiedWalletService');
    const userWallet = await simplifiedWalletService.getWalletInfo(userId);
    if (!userWallet) {
      return {
        success: false,
        error: 'User wallet not found',
      };
    }

    const privateKeyResult = await getFairSplitPrivateKeyPrivate(splitWalletId, wallet.creatorId);
    if (!privateKeyResult.success || !privateKeyResult.privateKey) {
      return {
        success: false,
        error: privateKeyResult.error || 'Failed to retrieve private key',
      };
    }

    const { UnifiedWithdrawalService } = await import('../../transactions/UnifiedWithdrawalService');
    const transactionResult = await UnifiedWithdrawalService.withdraw({
      sourceType: 'split_wallet',
      sourceId: splitWalletId,
      destinationAddress: userWallet.address,
      userId: userId.toString(),
      amount: amount,
      currency: wallet.currency as 'USDC' | 'SOL',
      memo: `User wallet transfer for ${wallet.id}`,
      splitId: wallet.id,
      billId: wallet.billId
    });

    if (!transactionResult.success) {
      return {
        success: false,
        error: transactionResult.error || 'Transaction failed',
      };
    }

    // Save transaction using shared helper
    await saveWithdrawalTransaction({
      userId: wallet.creatorId,
      toAddress: userWallet.address,
      amount: amount,
      signature: transactionResult.transactionSignature!,
      memo: `User wallet transfer for ${wallet.id}`,
      currency: wallet.currency as 'USDC' | 'SOL',
    });

    logger.info('✅ User wallet transfer completed successfully', {
      splitWalletId,
      userId,
      amount,
      transactionSignature: transactionResult.transactionSignature
    }, 'TransferHandlers');
        
    return {
      success: true,
      transactionSignature: transactionResult.transactionSignature,
      amount
    };
  } catch (error) {
    logger.error('Failed to transfer funds to user wallet', error as any, 'TransferHandlers');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
