/**
 * Split Transaction Configurations
 * Centralized configuration builders for all split-related transactions
 */

import { TransactionModalConfig } from '../../../components/shared/CentralizedTransactionModal';

export interface SplitTransactionParams {
  splitWalletId: string;
  splitId?: string;
  billId?: string;
  walletAddress: string;
  currentUser: any;
  amount?: number;
  memo?: string;
}

export interface SplitWithdrawalParams {
  splitWalletId: string;
  splitId?: string;
  billId?: string;
  destinationAddress: string;
  destinationName?: string;
  currentUser: any;
  amount?: number;
  memo?: string;
}

/**
 * Fair Split Transaction Config Builder
 */
export class FairSplitTransactionConfig {
  /**
   * Create configuration for contributing to a fair split
   */
  static contribution(params: SplitTransactionParams): TransactionModalConfig {
    return {
      title: 'Contribute to Fair Split',
      subtitle: 'Pay your share to the fair split',
      showAmountInput: true,
      showMemoInput: false,
      showQuickAmounts: false,
      allowExternalDestinations: false,
      allowFriendDestinations: false,
      context: 'fair_split_contribution',
      prefilledAmount: params.amount,
      prefilledNote: params.memo,
      splitWalletId: params.splitWalletId,
      splitId: params.splitId,
      billId: params.billId,
      customRecipientInfo: {
        name: 'Fair Split Wallet',
        address: params.walletAddress,
        type: 'split'
      },
      onSuccess: (_result) => {
        // Success handled by screen
      },
      onError: (_error) => {
        // Error handled by screen
      }
    };
  }

  /**
   * Create configuration for withdrawing from a fair split
   */
  static withdrawal(params: SplitWithdrawalParams): TransactionModalConfig {
    return {
      title: 'Withdraw from Fair Split',
      subtitle: 'Withdraw funds from the completed split',
      showAmountInput: true,
      showMemoInput: true,
      showQuickAmounts: false,
      allowExternalDestinations: true,
      allowFriendDestinations: false,
      context: 'fair_split_withdrawal',
      prefilledAmount: params.amount,
      prefilledNote: params.memo,
      splitWalletId: params.splitWalletId,
      splitId: params.splitId,
      billId: params.billId,
      recipientAddress: params.destinationAddress,
      customRecipientInfo: {
        name: params.destinationName || 'Your Wallet',
        address: params.destinationAddress,
        type: 'wallet'
      },
      onSuccess: (_result) => {
        // Success handled by screen
      },
      onError: (_error) => {
        // Error handled by screen
      }
    };
  }
}

/**
 * Degen Split Transaction Config Builder
 */
export class DegenSplitTransactionConfig {
  /**
   * Create configuration for locking funds in a degen split
   */
  static lock(params: SplitTransactionParams): TransactionModalConfig {
    return {
      title: `Lock ${params.amount ? params.amount.toFixed(6) : ''} USDC to split the Bill`,
      subtitle: 'Lock your funds to participate in the degen split roulette!',
      showAmountInput: false, // Amount is fixed for degen split
      showMemoInput: false,
      showQuickAmounts: false,
      allowExternalDestinations: false,
      allowFriendDestinations: false,
      context: 'degen_split_lock',
      prefilledAmount: params.amount,
      splitWalletId: params.splitWalletId,
      splitId: params.splitId,
      billId: params.billId,
      customRecipientInfo: {
        name: 'Degen Split Wallet',
        address: params.walletAddress,
        type: 'split'
      },
      onSuccess: (_result) => {
        // Success handled by screen
      },
      onError: (_error) => {
        // Error handled by screen
      }
    };
  }
}

/**
 * Spend Split Transaction Config Builder
 */
export class SpendSplitTransactionConfig {
  /**
   * Create configuration for paying a merchant from a spend split
   */
  static payment(params: {
    splitWalletId: string;
    splitId: string;
    merchantAddress: string;
    merchantName: string;
    currentUser: any;
    amount?: number;
    memo?: string;
  }): TransactionModalConfig {
    return {
      title: 'Pay Merchant',
      subtitle: `Pay ${params.merchantName} from split wallet`,
      showAmountInput: true,
      showMemoInput: true,
      showQuickAmounts: false,
      allowExternalDestinations: false,
      allowFriendDestinations: false,
      context: 'spend_split_payment',
      prefilledAmount: params.amount,
      prefilledNote: params.memo,
      splitWalletId: params.splitWalletId,
      splitId: params.splitId,
      recipientAddress: params.merchantAddress,
      customRecipientInfo: {
        name: params.merchantName,
        address: params.merchantAddress,
        type: 'merchant'
      },
      onSuccess: (_result) => {
        // Success handled by screen
      },
      onError: (_error) => {
        // Error handled by screen
      }
    };
  }
}

