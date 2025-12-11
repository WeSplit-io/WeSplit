/**
 * Unified Split Creation Service
 * Single source of truth for all split wallet creation
 * Prevents duplication and ensures consistency across fair/degen/spend splits
 */

import { logger } from '../core';
import { validateCreationParams, validateWalletAddress } from './SplitValidationService';
import { RequestDeduplicator } from './utils/debounceUtils';
import { ERROR_MESSAGES } from './constants/splitConstants';
import type { SplitWalletResult } from './types';
import type { CreationParams } from './SplitValidationService';

export interface UnifiedCreationParams extends CreationParams {
  splitType: 'fair' | 'degen' | 'spend';
  creatorName?: string; // Required for degen splits
}

/**
 * Unified Split Creation Service
 */
export class UnifiedSplitCreationService {
  private static creationDeduplicator = new RequestDeduplicator<
    (params: UnifiedCreationParams) => Promise<SplitWalletResult>
  >();

  /**
   * Create split wallet with deduplication and proper error handling
   * 
   * @param params - Creation parameters including billId, creatorId, totalAmount, currency, participants, and splitType
   * @returns Promise resolving to SplitWalletResult with success status and wallet or error
   * 
   * @example
   * ```typescript
   * const result = await UnifiedSplitCreationService.createSplitWallet({
   *   billId: 'bill_123',
   *   creatorId: 'user_456',
   *   totalAmount: 100,
   *   currency: 'USDC',
   *   participants: [{ userId: 'user_789', walletAddress: '...', amountOwed: 50 }],
   *   splitType: 'fair'
   * });
   * ```
   */
  static async createSplitWallet(params: UnifiedCreationParams): Promise<SplitWalletResult> {
    const deduplicationKey = `${params.billId}-${params.splitType}`;

    // Check if creation is already in progress
    if (this.creationDeduplicator.isInProgress(deduplicationKey)) {
      logger.warn('Split wallet creation already in progress', {
        billId: params.billId,
        splitType: params.splitType,
      }, 'UnifiedSplitCreationService');
      return {
        success: false,
        error: 'Split wallet creation is already in progress for this bill',
      };
    }

    // Execute with deduplication
    return this.creationDeduplicator.execute(
      deduplicationKey,
      this._createSplitWallet.bind(this),
      params
    );
  }

  /**
   * Internal creation method
   */
  private static async _createSplitWallet(
    params: UnifiedCreationParams
  ): Promise<SplitWalletResult> {
    try {
      logger.info('Creating split wallet via unified service', {
        billId: params.billId,
        splitType: params.splitType,
        creatorId: params.creatorId,
        totalAmount: params.totalAmount,
        participantsCount: params.participants.length,
      }, 'UnifiedSplitCreationService');

      // Validate parameters
      const validation = await validateCreationParams(params);
      if (!validation.isValid) {
        logger.error('Validation failed for split creation', {
          billId: params.billId,
          errors: validation.errors,
        }, 'UnifiedSplitCreationService');
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Validate wallet addresses
      for (const participant of params.participants) {
        const addressValidation = validateWalletAddress(participant.walletAddress);
        if (!addressValidation.isValid) {
          return {
            success: false,
            error: `Invalid wallet address for participant ${participant.userId}: ${addressValidation.errors.join(', ')}`,
          };
        }
      }

      // Check if wallet already exists (using cache)
      const { SplitWalletCache } = await import('./SplitWalletCache');
      const existingCached = await SplitWalletCache.getWalletByBillId(params.billId);
      if (existingCached) {
        logger.warn('Split wallet already exists (from cache)', {
          billId: params.billId,
          existingWalletId: existingCached.id,
        }, 'UnifiedSplitCreationService');
        return {
          success: false,
          error: ERROR_MESSAGES.WALLET_EXISTS,
          wallet: existingCached,
        };
      }

      // Double-check with database query
      const { SplitWalletQueries } = await import('./SplitWalletQueries');
      const existingWalletResult = await SplitWalletQueries.getSplitWalletByBillId(params.billId);
      if (existingWalletResult.success && existingWalletResult.wallet) {
        logger.warn('Split wallet already exists (from database)', {
          billId: params.billId,
          existingWalletId: existingWalletResult.wallet.id,
        }, 'UnifiedSplitCreationService');
        return {
          success: false,
          error: ERROR_MESSAGES.WALLET_EXISTS,
          wallet: existingWalletResult.wallet,
        };
      }

      // Create wallet based on type
      const { SplitWalletCreation } = await import('./SplitWalletCreation');
      let walletResult: SplitWalletResult;

      switch (params.splitType) {
        case 'fair':
        case 'spend':
          walletResult = await SplitWalletCreation.createSplitWallet(
            params.billId,
            params.creatorId,
            params.totalAmount,
            params.currency || 'USDC',
            params.participants
          );
          break;

        case 'degen':
          if (!params.creatorName) {
            return {
              success: false,
              error: 'Creator name is required for degen splits',
            };
          }
          walletResult = await SplitWalletCreation.createDegenSplitWallet(
            params.billId,
            params.creatorId,
            params.creatorName,
            params.totalAmount,
            params.currency || 'USDC',
            params.participants.map(p => ({
              userId: p.userId,
              name: p.name || 'Unknown',
              walletAddress: p.walletAddress,
              amountOwed: p.amountOwed,
            }))
          );
          break;

        default:
          return {
            success: false,
            error: `Unsupported split type: ${params.splitType}`,
          };
      }

      if (!walletResult.success) {
        logger.error('Failed to create split wallet', {
          billId: params.billId,
          splitType: params.splitType,
          error: walletResult.error,
        }, 'UnifiedSplitCreationService');
        return walletResult;
      }

      // Wallet creation succeeded - split document sync is handled by SplitWalletCreation
      logger.info('Split wallet created successfully via unified service', {
        billId: params.billId,
        splitType: params.splitType,
        walletId: walletResult.wallet?.id,
      }, 'UnifiedSplitCreationService');

      return walletResult;
    } catch (error) {
      logger.error('Unexpected error in unified split creation', {
        billId: params.billId,
        splitType: params.splitType,
        error: error instanceof Error ? error.message : String(error),
      }, 'UnifiedSplitCreationService');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if creation is in progress for a given bill and split type
   * 
   * @param billId - The bill ID to check
   * @param splitType - The split type ('fair', 'degen', or 'spend')
   * @returns true if creation is currently in progress, false otherwise
   */
  static isCreationInProgress(billId: string, splitType: 'fair' | 'degen' | 'spend'): boolean {
    const key = `${billId}-${splitType}`;
    return this.creationDeduplicator.isInProgress(key);
  }

  /**
   * Clear all in-progress creations (for testing/cleanup)
   * 
   * This method should primarily be used for testing or emergency cleanup scenarios.
   * In production, it's better to let creations complete naturally.
   */
  static clearInProgress(): void {
    this.creationDeduplicator.clear();
  }
}
