/**
 * SPEND Wallet Utilities
 * Centralized functions for wallet creation and management
 */

import { SplitWalletService } from '../../services/split';
import { SplitStorageService } from '../../services/splits';
import { logger } from '../../services/analytics/loggingService';

/**
 * Create split wallet for SPEND split
 * Handles participant mapping and split update
 */
export async function createSpendSplitWallet(
  splitData: any,
  creatorId: string
): Promise<{ success: boolean; wallet?: any; error?: string }> {
  try {
    // Map participants for wallet creation
    const participants = splitData.participants || [];
    const participantsForWallet = participants.map((p: any) => ({
      userId: p.userId || p.id || '',
      name: p.name || 'Unknown',
      walletAddress: p.walletAddress || p.wallet_address || '',
      amountOwed: p.amountOwed || 0,
    }));

    // Create wallet
    const walletResult = await SplitWalletService.createSplitWallet(
      splitData.billId,
      creatorId,
      splitData.totalAmount || 0,
      'USDC',
      participantsForWallet
    );

    if (!walletResult.success || !walletResult.wallet) {
      return {
        success: false,
        error: walletResult.error || 'Failed to create split wallet',
      };
    }

    const wallet = walletResult.wallet;

    // Update split document with wallet information
    try {
      await SplitStorageService.updateSplit(splitData.id, {
        walletId: wallet.id,
        walletAddress: wallet.walletAddress,
        status: 'active',
      });
      logger.info('Split updated with wallet information', {
        splitId: splitData.id,
        walletId: wallet.id,
      }, 'createSpendSplitWallet');
    } catch (updateError) {
      logger.warn('Failed to update split with wallet information', {
        splitId: splitData.id,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      }, 'createSpendSplitWallet');
      // Don't fail if update fails - wallet is created
    }

    return {
      success: true,
      wallet,
    };
  } catch (error) {
    logger.error('Error creating SPEND split wallet', {
      error: error instanceof Error ? error.message : String(error),
      splitId: splitData.id,
    }, 'createSpendSplitWallet');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

