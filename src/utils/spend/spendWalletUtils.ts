/**
 * SPEND Wallet Utilities
 * Centralized functions for wallet creation and management
 */

import { logger } from '../../services/analytics/loggingService';
import { UnifiedSplitCreationService } from '../../services/split/UnifiedSplitCreationService';
import { mapParticipantsToSplitWallet } from '../../services/split/utils/participantMapper';

/**
 * Create split wallet for SPEND split
 * Uses unified creation service for consistency
 */
export async function createSpendSplitWallet(
  splitData: any,
  creatorId: string
): Promise<{ success: boolean; wallet?: any; error?: string }> {
  try {
    // Map participants using participant mapper
    const participants = splitData.participants || [];
    const mappedParticipants = mapParticipantsToSplitWallet(participants.map((p: any) => ({
      userId: p.userId || p.id || '',
      id: p.userId || p.id || '',
      name: p.name || 'Unknown',
      walletAddress: p.walletAddress || p.wallet_address || '',
      amountOwed: p.amountOwed || 0,
    })));

    // Use unified creation service
    const walletResult = await UnifiedSplitCreationService.createSplitWallet({
      billId: splitData.billId,
      creatorId,
      totalAmount: splitData.totalAmount || 0,
      currency: 'USDC',
      splitType: 'spend',
      participants: mappedParticipants,
    });

    if (!walletResult.success || !walletResult.wallet) {
      return {
        success: false,
        error: walletResult.error || 'Failed to create split wallet',
      };
    }

    // Note: Split document sync is handled by UnifiedSplitCreationService
    return {
      success: true,
      wallet: walletResult.wallet,
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

