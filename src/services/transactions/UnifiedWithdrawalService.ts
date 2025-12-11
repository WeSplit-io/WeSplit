/**
 * Unified Withdrawal Service
 * Centralized withdrawal logic for all wallet types (split wallets, shared wallets)
 * Provides a single, consistent interface for all withdrawal operations
 */

import { logger } from '../analytics/loggingService';
import type { TransactionParams, TransactionResult } from './types';

export interface WithdrawalParams {
  // Source wallet information
  sourceType: 'split_wallet' | 'shared_wallet';
  sourceId: string; // splitWalletId or sharedWalletId
  
  // Destination information
  destinationAddress: string;
  destinationName?: string;
  
  // Transaction details
  userId: string;
  amount: number;
  currency?: 'USDC' | 'SOL';
  memo?: string;
  
  // Optional metadata
  splitId?: string;
  billId?: string;
}

export interface WithdrawalResult {
  success: boolean;
  error?: string;
  transactionSignature?: string;
  transactionId?: string;
  txId?: string;
  fee?: number;
  netAmount?: number;
  blockchainFee?: number;
  message?: string;
  newBalance?: number;
}

/**
 * Unified Withdrawal Service
 * Handles withdrawals from split wallets and shared wallets with a single interface
 */
export class UnifiedWithdrawalService {
  /**
   * Execute withdrawal from any wallet type
   */
  static async withdraw(params: WithdrawalParams): Promise<WithdrawalResult> {
    try {
      logger.info('Executing unified withdrawal', {
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        destinationAddress: params.destinationAddress,
        amount: params.amount,
        userId: params.userId
      }, 'UnifiedWithdrawalService');

      // Validate parameters
      const validation = this.validateWithdrawalParams(params);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Build transaction parameters based on source type
      const transactionParams = this.buildTransactionParams(params);

      // Execute transaction using consolidated service (avoids circular dependency)
      const { consolidatedTransactionService } = await import('../blockchain/transaction');
      const result = await consolidatedTransactionService.executeTransactionByContext(transactionParams);

      if (result.success) {
        logger.info('Withdrawal completed successfully', {
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          transactionSignature: result.transactionSignature
        }, 'UnifiedWithdrawalService');

        return {
          success: true,
          transactionSignature: result.transactionSignature,
          transactionId: result.transactionId || result.txId,
          txId: result.txId || result.transactionId,
          fee: result.fee,
          netAmount: result.netAmount,
          blockchainFee: result.blockchainFee,
          message: result.message || `Successfully withdrew ${params.amount.toFixed(6)} ${params.currency || 'USDC'}`
        };
      } else {
        return {
          success: false,
          error: result.error || 'Withdrawal failed'
        };
      }
    } catch (error) {
      logger.error('Withdrawal execution failed', {
        error: error instanceof Error ? error.message : String(error),
        params
      }, 'UnifiedWithdrawalService');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate withdrawal parameters
   */
  private static validateWithdrawalParams(params: WithdrawalParams): {
    valid: boolean;
    error?: string;
  } {
    if (!params.sourceType || !['split_wallet', 'shared_wallet'].includes(params.sourceType)) {
      return {
        valid: false,
        error: 'Invalid source type. Must be split_wallet or shared_wallet'
      };
    }

    if (!params.sourceId) {
      return {
        valid: false,
        error: 'Source ID is required'
      };
    }

    if (!params.destinationAddress) {
      return {
        valid: false,
        error: 'Destination address is required'
      };
    }

    if (!params.userId) {
      return {
        valid: false,
        error: 'User ID is required'
      };
    }

    if (!params.amount || params.amount <= 0) {
      return {
        valid: false,
        error: 'Amount must be greater than 0'
      };
    }

    return { valid: true };
  }

  /**
   * Build transaction parameters based on source type
   */
  private static buildTransactionParams(params: WithdrawalParams): TransactionParams {
    const baseParams: TransactionParams = {
      context: params.sourceType === 'split_wallet' 
        ? 'fair_split_withdrawal' 
        : 'shared_wallet_withdrawal',
      userId: params.userId,
      amount: params.amount,
      currency: params.currency || 'USDC',
      memo: params.memo,
      destinationAddress: params.destinationAddress
    };

    if (params.sourceType === 'split_wallet') {
      return {
        ...baseParams,
        context: 'fair_split_withdrawal',
        splitWalletId: params.sourceId,
        splitId: params.splitId,
        billId: params.billId
      };
    } else {
      return {
        ...baseParams,
        context: 'shared_wallet_withdrawal',
        sharedWalletId: params.sourceId
      };
    }
  }

  /**
   * Validate withdrawal balance before execution
   */
  static async validateWithdrawalBalance(params: WithdrawalParams): Promise<{
    canWithdraw: boolean;
    error?: string;
    availableBalance?: number;
    requiredBalance?: number;
  }> {
    try {
      // Get available balance based on source type
      let availableBalance: number;

      if (params.sourceType === 'split_wallet') {
        // Get split wallet
        const { SplitWalletService } = await import('../split');
        const walletResult = await SplitWalletService.getSplitWallet(params.sourceId);
        
        if (!walletResult.success || !walletResult.wallet) {
          return {
            canWithdraw: false,
            error: walletResult.error || 'Split wallet not found'
          };
        }

        const wallet = walletResult.wallet;

        // For split wallets, check if user is creator (only creator can withdraw for fair splits)
        // For degen splits, winner/loser can withdraw (handled in handleFairSplitWithdrawal)
        const isDegenSplit = !!wallet.degenLoser || !!wallet.degenWinner;
        if (!isDegenSplit && wallet.creatorId !== params.userId) {
          return {
            canWithdraw: false,
            error: 'Only the split creator can withdraw funds from a fair split'
          };
        }

        // CRITICAL: Use on-chain balance, not database balance
        // Database balance (wallet.totalBalance) may be stale or incorrect
        const { SplitWalletPayments } = await import('../split/SplitWalletPayments');
        const balanceResult = await SplitWalletPayments.verifySplitWalletBalance(params.sourceId);
        
        if (!balanceResult.success) {
          return {
            canWithdraw: false,
            error: balanceResult.error || 'Failed to verify split wallet balance'
          };
        }

        availableBalance = balanceResult.balance || 0;
      } else {
        // DEV FLAG: Shared wallet operations are only available in development
        if (!__DEV__) {
          return {
            canWithdraw: false,
            error: 'Shared wallet operations are only available in development mode'
          };
        }

        // Get shared wallet balance and user's available balance
        const { SharedWalletService } = await import('../sharedWallet');
        const result = await SharedWalletService.getSharedWallet(params.sourceId);

        if (!result.success || !result.wallet) {
          return {
            canWithdraw: false,
            error: 'Shared wallet not found'
          };
        }

        const wallet = result.wallet;
        const userMember = wallet.members?.find((m) => m.userId === params.userId);

        if (!userMember) {
          return {
            canWithdraw: false,
            error: 'User is not a member of this shared wallet'
          };
        }

        // Calculate user's available balance
        const userContributed = userMember.totalContributed || 0;
        const userWithdrawn = userMember.totalWithdrawn || 0;
        availableBalance = userContributed - userWithdrawn;

        // Also check total wallet balance
        if (params.amount > wallet.totalBalance) {
          return {
            canWithdraw: false,
            error: 'Insufficient balance in shared wallet',
            availableBalance: wallet.totalBalance
          };
        }
      }

      if (params.amount > availableBalance) {
        return {
          canWithdraw: false,
          error: `Insufficient balance. Available: ${availableBalance.toFixed(6)} ${params.currency || 'USDC'}, Requested: ${params.amount.toFixed(6)} ${params.currency || 'USDC'}`,
          availableBalance,
          requiredBalance: params.amount
        };
      }

      return {
        canWithdraw: true,
        availableBalance,
        requiredBalance: params.amount
      };
    } catch (error) {
      logger.error('Balance validation failed', {
        error: error instanceof Error ? error.message : String(error),
        params
      }, 'UnifiedWithdrawalService');

      return {
        canWithdraw: false,
        error: error instanceof Error ? error.message : 'Failed to validate balance'
      };
    }
  }
}

