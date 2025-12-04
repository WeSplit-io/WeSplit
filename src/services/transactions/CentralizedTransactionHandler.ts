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
          const feeCalculation = FeeService.calculateCompanyFee(amount, 'send');
          requiredBalance = feeCalculation.totalAmount;
          break;
        }

        case 'shared_wallet_withdrawal': {
          const feeCalculation = FeeService.calculateCompanyFee(amount, 'withdraw');
          requiredBalance = feeCalculation.totalAmount;
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