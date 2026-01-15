/**
 * Centralized Transaction Handler
 * Thin wrapper that delegates to ConsolidatedTransactionService
 * Maintains backward compatibility while centralizing logic
 */

import { logger } from '../analytics/loggingService';
import { FeeService, TransactionType } from '../../config/constants/feeConfig';

// Import types
import {
  TransactionParams,
  TransactionResult
} from './types';

// Centralized Transaction Handler Class
export class CentralizedTransactionHandler {

  /**
   * Execute a transaction based on the provided parameters
   */
  static async executeTransaction(params: TransactionParams): Promise<TransactionResult> {
    // Delegate to ConsolidatedTransactionService for unified transaction handling
    const { consolidatedTransactionService } = await import('../blockchain/transaction');
    return consolidatedTransactionService.executeTransactionByContext(params);
  }

  /**
   * Validate transaction before execution
   */
  static async validateTransaction(params: TransactionParams): Promise<{
    canExecute: boolean;
    error?: string;
    requiredBalance?: number;
    availableBalance?: number;
    fee?: number;
  }> {
    try {
      const { userId, amount, context } = params;

      // Get available balance based on context
      let availableBalance: number;
      let requiredBalance: number;

      // Get balance from consolidated service
      const { consolidatedTransactionService } = await import('../blockchain/transaction');
      const balance = await consolidatedTransactionService.getUserWalletBalance(userId);
      availableBalance = balance.usdc;

      logger.debug('Balance validation for transaction', {
        userId,
        context,
        amount,
        availableBalance,
        currency: params.currency
      }, 'CentralizedTransactionHandler');

      switch (context) {
        case 'send_1to1': {
          const transactionType: TransactionType = (params as any).isSettlement
            ? 'settlement'
            : ((params as any).requestId ? 'payment_request' : 'send');

          const feeCalculation = FeeService.calculateCompanyFee(amount, transactionType);
          requiredBalance = feeCalculation.totalAmount;
          break;
        }

        case 'fair_split_contribution': {
          const feeCalculation = FeeService.calculateCompanyFee(amount, 'split_payment');
          requiredBalance = feeCalculation.totalAmount;
          break;
        }

        case 'fair_split_withdrawal': {
          const feeCalculation = FeeService.calculateCompanyFee(amount, 'withdraw');
          requiredBalance = feeCalculation.totalAmount;
          break;
        }

        case 'degen_split_lock': {
          const feeCalculation = FeeService.calculateCompanyFee(amount, 'split_payment');
          requiredBalance = feeCalculation.totalAmount;
          break;
        }

        case 'spend_split_payment': {
          const feeCalculation = FeeService.calculateCompanyFee(amount, 'external_payment');
          requiredBalance = feeCalculation.totalAmount;
          break;
        }

        case 'shared_wallet_funding': {
          const feeCalculation = FeeService.calculateCompanyFee(amount, 'deposit');
          requiredBalance = feeCalculation.totalAmount;
          break;
        }

        case 'shared_wallet_withdrawal': {
          // For shared wallet withdrawal, we need to validate against the shared wallet balance
          // and the user's available balance within that wallet, not their personal wallet
          const sharedWalletId = (params as any).sharedWalletId;
          if (!sharedWalletId) {
            return {
              canExecute: false,
              error: 'Shared wallet ID is required for withdrawal validation'
            };
          }

          try {
            // Get shared wallet data to check user's available balance
            const { SharedWalletService } = await import('../sharedWallet');
            const walletResult = await SharedWalletService.getSharedWallet(sharedWalletId);

            if (!walletResult.success || !walletResult.wallet) {
              return {
                canExecute: false,
                error: 'Shared wallet not found'
              };
            }

            const wallet = walletResult.wallet;
            const userMember = wallet.members?.find((m) => m.userId === userId);

            if (!userMember) {
              return {
                canExecute: false,
                error: 'User is not a member of this shared wallet'
              };
            }

            // Calculate user's available balance in shared wallet
            let userContributed = userMember.totalContributed || 0;
            const userWithdrawn = userMember.totalWithdrawn || 0;
            let userAvailableBalance = userContributed - userWithdrawn;

            // ✅ FIX: Check for recent funding transactions if balance seems insufficient
            // This handles the race condition where funding transaction completed but Firestore update hasn't propagated
            if (amount > userAvailableBalance && userAvailableBalance >= 0) {
              try {
                const { db } = await import('../../config/firebase/firebase');
                const { collection, query, where, getDocs } = await import('firebase/firestore');
                
                const recentFundingQuery = query(
                  collection(db, 'sharedWalletTransactions'),
                  where('sharedWalletId', '==', sharedWalletId),
                  where('userId', '==', userId),
                  where('type', '==', 'funding'),
                  where('status', '==', 'confirmed')
                );

                const recentFundingSnapshot = await getDocs(recentFundingQuery);
                const thirtySecondsAgo = Date.now() - 30000;
                
                const recentTransactions = recentFundingSnapshot.docs
                  .map(doc => {
                    const txData = doc.data();
                    const createdAt = txData.createdAt?.toDate ? txData.createdAt.toDate() : new Date(txData.createdAt);
                    return {
                      amount: txData.amount || 0,
                      createdAt: createdAt.getTime()
                    };
                  })
                  .filter(tx => tx.createdAt > thirtySecondsAgo)
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .slice(0, 5);
                
                const recentFundingTotal = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
                
                if (recentFundingTotal > 0) {
                  userAvailableBalance += recentFundingTotal;
                  userContributed += recentFundingTotal;
                }
              } catch (recentTxError) {
                // Continue with original balance - don't fail validation if this check fails
                logger.debug('Could not check recent funding transactions during validation', {
                  error: recentTxError instanceof Error ? recentTxError.message : String(recentTxError)
                }, 'CentralizedTransactionHandler');
              }
            }

            // ✅ FIX: Provide more helpful error messages
            if (amount > userAvailableBalance) {
              // Build a more informative error message
              let errorMessage: string;
              
              if (userAvailableBalance <= 0) {
                if (userContributed === 0 && userWithdrawn === 0) {
                  errorMessage = `You haven't contributed any funds to this shared wallet yet. You can only withdraw funds that you've contributed. The wallet shows ${wallet.totalBalance.toFixed(6)} ${wallet.currency || 'USDC'} total, but this includes contributions from other members.`;
                } else if (userContributed > 0 && userWithdrawn >= userContributed) {
                  errorMessage = `You've already withdrawn all of your contributions (${userContributed.toFixed(6)} ${wallet.currency || 'USDC'}). You can only withdraw funds that you've personally contributed to the shared wallet.`;
                } else {
                  errorMessage = `You don't have any available balance to withdraw. Your contributions: ${userContributed.toFixed(6)} ${wallet.currency || 'USDC'}, Already withdrawn: ${userWithdrawn.toFixed(6)} ${wallet.currency || 'USDC'}.`;
                }
              } else {
                errorMessage = `Insufficient balance. You can withdraw up to ${userAvailableBalance.toFixed(6)} ${wallet.currency || 'USDC'} (your contributions: ${userContributed.toFixed(6)}, already withdrawn: ${userWithdrawn.toFixed(6)}). You're trying to withdraw ${amount.toFixed(6)} ${wallet.currency || 'USDC'}.`;
              }
              
              return {
                canExecute: false,
                error: errorMessage,
                availableBalance: userAvailableBalance
              };
            }

            // Check if shared wallet has enough total balance
            if (amount > wallet.totalBalance) {
              return {
                canExecute: false,
                error: 'Insufficient balance in shared wallet'
              };
            }

            // For withdrawal, we need the user's personal wallet to have enough for fees
            // But the main amount comes from the shared wallet
            const feeCalculation = FeeService.calculateCompanyFee(amount, 'withdraw');
            requiredBalance = feeCalculation.fee; // Only fees come from personal wallet
          } catch (error) {
            return {
              canExecute: false,
              error: 'Failed to validate shared wallet withdrawal'
            };
          }
          break;
        }

        default:
          return {
            canExecute: false,
            error: `Unsupported transaction context: ${context}`
          };
      }

      const canExecute = availableBalance >= requiredBalance;

      if (!canExecute) {
        logger.warn('Transaction validation failed - insufficient balance', {
          userId,
          context,
          amount,
          availableBalance,
          requiredBalance,
          fee: requiredBalance - amount
        }, 'CentralizedTransactionHandler');
      }

      return {
        canExecute,
        error: canExecute ? undefined : `Insufficient balance: ${availableBalance.toFixed(6)} USDC available, ${requiredBalance.toFixed(6)} USDC required`,
        requiredBalance,
        availableBalance,
        fee: requiredBalance - amount
      };
    } catch (error) {
      logger.error('Transaction validation failed', {
        context: params.context,
        error: error instanceof Error ? error.message : String(error)
      }, 'CentralizedTransactionHandler');

      return {
        canExecute: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Get transaction fee estimate
   */
  static async getTransactionFeeEstimate(
    amount: number,
    currency: string,
    context: TransactionParams['context'],
    userId: string
  ): Promise<{
    fee: number;
    totalAmount: number;
    netAmount: number;
    blockchainFee: number;
  }> {
    try {
      // Determine transaction type based on context
      let transactionType: TransactionType = 'default';

      switch (context) {
        case 'send_1to1':
          transactionType = 'send';
          break;
        case 'fair_split_contribution':
        case 'degen_split_lock':
          transactionType = 'split_payment'; // 1.5% fee for split contributions
          break;
        case 'shared_wallet_funding':
          transactionType = 'send'; // 0.01% fee for shared wallet funding
          break;
        case 'fair_split_withdrawal':
        case 'shared_wallet_withdrawal':
          transactionType = 'withdraw';
          break;
        case 'spend_split_payment':
          transactionType = 'external_payment';
          break;
        default:
          transactionType = 'send';
      }

      const feeCalculation = FeeService.calculateCompanyFee(amount, transactionType);

      return {
        fee: feeCalculation.fee,
        totalAmount: feeCalculation.totalAmount,
        netAmount: feeCalculation.recipientAmount,
        blockchainFee: 0.00001 // Company covers blockchain fees
      };
    } catch (error) {
      logger.error('Fee estimation failed', {
        amount,
        currency,
        context,
        error: error instanceof Error ? error.message : String(error)
      }, 'CentralizedTransactionHandler');

      // Return zero fees on error
      return {
        fee: 0,
        totalAmount: amount,
        netAmount: amount,
        blockchainFee: 0
      };
    }
  }
}

// Export singleton instance
export const centralizedTransactionHandler = CentralizedTransactionHandler;