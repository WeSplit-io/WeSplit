/**
 * Split Roulette Service
 * Centralizes deterministic, auditable loser selection for Degen splits.
 */

import { logger } from '../analytics/loggingService';
import type { SplitWallet, SplitWalletParticipant, SplitWalletResult, DegenRouletteAuditEntry } from './types';
// CRITICAL: Dynamic imports to prevent early bundling and memory exhaustion during degen split creation
// import { SplitWalletQueries } from './SplitWalletQueries';
// import { SplitWalletManagement } from './SplitWalletManagement';
import { getSecureRandomInt } from '../../utils/crypto/secureRandom';

const AUDIT_HISTORY_LIMIT = 10;

interface RouletteValidationResult {
  isValid: boolean;
  errors: string[];
}

const validateParticipants = (wallet: SplitWallet): RouletteValidationResult => {
  const errors: string[] = [];

  if (!wallet.participants || wallet.participants.length === 0) {
    errors.push('No participants available for roulette');
    return { isValid: false, errors };
  }

  const unlockedParticipants = wallet.participants.filter(
    participant =>
      participant.status !== 'locked' ||
      participant.amountPaid < participant.amountOwed ||
      !participant.transactionSignature
  );

  if (unlockedParticipants.length > 0) {
    errors.push(
      `All participants must be locked before spinning. Pending: ${unlockedParticipants
        .map(p => `${p.name || p.userId}`)
        .join(', ')}`
    );
  }

  if (wallet.degenLoser && wallet.status === 'spinning_completed') {
    errors.push('Roulette has already been completed for this split wallet');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const sanitizeParticipants = (participants: SplitWalletParticipant[]) =>
  participants.map(participant => ({
    userId: participant.userId,
    name: participant.name,
    status: participant.status,
    amountPaid: participant.amountPaid,
    amountOwed: participant.amountOwed,
    transactionSignature: participant.transactionSignature || null,
  }));

export interface DegenRouletteExecutionResult {
  success: boolean;
  loserUserId?: string;
  loserName?: string;
  loserIndex?: number;
  winners?: { userId: string; name: string }[];
  updatedWallet?: SplitWallet;
  auditEntry?: DegenRouletteAuditEntry;
  error?: string;
  validationErrors?: string[];
}

export class SplitRouletteService {
  static async executeDegenRoulette(
    splitWalletId: string,
    requestedByUserId?: string
  ): Promise<DegenRouletteExecutionResult> {
    try {
      // Dynamic import to prevent early bundling and memory exhaustion
      const { SplitWalletQueries } = await import('./SplitWalletQueries');
      const walletResult = await SplitWalletQueries.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        return {
          success: false,
          error: walletResult.error || 'Split wallet not found',
        };
      }

      const wallet = walletResult.wallet;

      if (wallet.status === 'cancelled' || wallet.status === 'completed') {
        return {
          success: false,
          error: 'This split is no longer active.',
        };
      }

      const validation = validateParticipants(wallet);
      if (!validation.isValid) {
        logger.warn('Degen roulette validation failed', {
          splitWalletId,
          errors: validation.errors,
        }, 'SplitRouletteService');
        return {
          success: false,
          error: validation.errors[0],
          validationErrors: validation.errors,
        };
      }

      const participantCount = wallet.participants.length;
      const secureRandom = await getSecureRandomInt(participantCount);
      const loserIndex = secureRandom.value;
      const loserParticipant = wallet.participants[loserIndex];

      if (!loserParticipant) {
        return {
          success: false,
          error: 'Could not determine loser participant',
        };
      }

      const losersSnapshot = {
        userId: loserParticipant.userId,
        name: loserParticipant.name,
        selectedAt: new Date().toISOString(),
        requestedByUserId: requestedByUserId || 'unknown',
        entropySource: secureRandom.source,
        seed: secureRandom.seedHex,
      };

      const auditEntry: DegenRouletteAuditEntry = {
        selectedAt: losersSnapshot.selectedAt,
        requestedByUserId: losersSnapshot.requestedByUserId,
        entropySource: secureRandom.source,
        seed: secureRandom.seedHex,
        participantIds: wallet.participants.map(participant => participant.userId),
        lockedParticipantIds: wallet.participants
          .filter(participant => participant.status === 'locked')
          .map(participant => participant.userId),
        loserUserId: loserParticipant.userId,
        totalParticipants: participantCount,
      };

      const previousAudit = Array.isArray((wallet as any).rouletteAudit)
        ? ((wallet as any).rouletteAudit as DegenRouletteAuditEntry[])
        : [];
      const updatedAudit = [...previousAudit.slice(-(AUDIT_HISTORY_LIMIT - 1)), auditEntry];

      // Dynamic import to prevent early bundling and memory exhaustion
      const { SplitWalletManagement } = await import('./SplitWalletManagement');
      const updateResult = await SplitWalletManagement.updateSplitWallet(splitWalletId, {
        degenLoser: losersSnapshot,
        degenWinner: losersSnapshot, // Backward compatibility with legacy clients
        rouletteAudit: updatedAudit,
        status: 'spinning_completed',
      } as Partial<SplitWallet>);

      if (!updateResult.success || !updateResult.wallet) {
        return {
          success: false,
          error: updateResult.error || 'Failed to persist roulette result',
        };
      }

      // CRITICAL FIX: Explicitly sync roulette result to splits collection
      // This ensures split document has degenLoser, degenWinner, rouletteAudit, and status
      try {
        const { SplitStorageService } = await import('../splits/splitStorageService');
        const { SplitDataSynchronizer } = await import('./SplitDataSynchronizer');
        
        // Sync status
        await SplitDataSynchronizer.syncSplitStatusFromSplitWalletToSplitStorage(
          wallet.billId,
          'spinning_completed',
          new Date().toISOString()
        );
        
        // Sync degenLoser, degenWinner, and rouletteAudit
        const syncResult = await SplitStorageService.updateSplitByBillId(wallet.billId, {
          degenLoser: losersSnapshot,
          degenWinner: losersSnapshot,
          rouletteAudit: updatedAudit,
          status: 'completed', // Map spinning_completed to completed in splits collection
        });
        
        if (!syncResult.success) {
          logger.error('Failed to sync roulette result to splits collection', {
            splitWalletId,
            billId: wallet.billId,
            error: syncResult.error,
          }, 'SplitRouletteService');
          // Don't fail the roulette execution if sync fails, but log the error
        } else {
          logger.info('Roulette result synced to splits collection', {
            splitWalletId,
            billId: wallet.billId,
            loserUserId: loserParticipant.userId,
          }, 'SplitRouletteService');
        }
      } catch (syncError) {
        logger.error('Error syncing roulette result to splits collection', {
          splitWalletId,
          billId: wallet.billId,
          error: syncError instanceof Error ? syncError.message : String(syncError),
        }, 'SplitRouletteService');
        // Don't fail the roulette execution if sync fails, but log the error
      }

      const winners = wallet.participants
        .filter(participant => participant.userId !== loserParticipant.userId)
        .map(participant => ({
          userId: participant.userId,
          name: participant.name,
        }));

      logger.info('Degen roulette executed', {
        splitWalletId,
        loserUserId: loserParticipant.userId,
        entropySource: secureRandom.source,
        requestedByUserId,
      }, 'SplitRouletteService');

      return {
        success: true,
        loserUserId: loserParticipant.userId,
        loserName: loserParticipant.name,
        loserIndex,
        winners,
        updatedWallet: updateResult.wallet,
        auditEntry,
      };
    } catch (error) {
      logger.error('Failed to execute degen roulette', {
        splitWalletId,
        error: error instanceof Error ? error.message : String(error),
      }, 'SplitRouletteService');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

