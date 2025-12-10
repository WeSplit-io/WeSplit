/**
 * Shared Wallet Transaction Configurations
 * Centralized configuration builders for all shared wallet transactions
 */

import { TransactionModalConfig } from '../../../components/shared/CentralizedTransactionModal';

export interface SharedWalletFundingParams {
  sharedWalletId: string;
  walletAddress: string;
  currentUser: any;
  amount?: number;
  memo?: string;
}

export interface SharedWalletWithdrawalParams {
  sharedWalletId: string;
  destinationAddress: string;
  destinationName?: string;
  currentUser: any;
  amount?: number;
  memo?: string;
}

/**
 * Shared Wallet Transaction Config Builder
 */
export class SharedWalletTransactionConfig {
  /**
   * Create configuration for funding a shared wallet
   */
  static funding(params: SharedWalletFundingParams): TransactionModalConfig {
    return {
      title: 'Fund Shared Wallet',
      subtitle: 'Add funds to the shared wallet',
      showAmountInput: true,
      showMemoInput: true,
      showQuickAmounts: false,
      allowExternalDestinations: false,
      allowFriendDestinations: false,
      context: 'shared_wallet_funding',
      prefilledAmount: params.amount,
      prefilledNote: params.memo,
      sharedWalletId: params.sharedWalletId,
      customRecipientInfo: {
        name: 'Shared Wallet',
        address: params.walletAddress,
        type: 'shared'
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
   * Create configuration for withdrawing from a shared wallet
   */
  static withdrawal(params: SharedWalletWithdrawalParams): TransactionModalConfig {
    return {
      title: 'Withdraw from Shared Wallet',
      subtitle: 'Withdraw your funds from the shared wallet',
      showAmountInput: true,
      showMemoInput: true,
      showQuickAmounts: false,
      allowExternalDestinations: true,
      allowFriendDestinations: false,
      context: 'shared_wallet_withdrawal',
      prefilledAmount: params.amount,
      prefilledNote: params.memo,
      sharedWalletId: params.sharedWalletId,
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

