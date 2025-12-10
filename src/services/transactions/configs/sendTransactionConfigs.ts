/**
 * Send (1:1) Transaction Configurations
 * Centralized configuration builders for 1:1 transfer transactions
 */

import { TransactionModalConfig } from '../../../components/shared/CentralizedTransactionModal';
import type { UserContact } from '../../../types';

export interface SendTransactionParams {
  contact?: UserContact;
  recipientAddress: string;
  recipientName: string;
  recipientId?: string;
  recipientAvatar?: string;
  currentUser: any;
  amount?: number;
  memo?: string;
  requestId?: string;
  isSettlement?: boolean;
}

/**
 * Send Transaction Config Builder
 */
export class SendTransactionConfig {
  /**
   * Create configuration for a 1:1 send transaction
   */
  static send(params: SendTransactionParams): TransactionModalConfig {
    const isFriend = !!params.recipientId || !!params.contact;
    
    return {
      title: 'Send Payment',
      subtitle: `Send to ${params.recipientName}`,
      showAmountInput: true,
      showMemoInput: true,
      showQuickAmounts: true,
      allowExternalDestinations: !isFriend,
      allowFriendDestinations: isFriend,
      context: 'send_1to1',
      prefilledAmount: params.amount,
      prefilledNote: params.memo,
      recipientAddress: params.recipientAddress,
      customRecipientInfo: {
        name: params.recipientName,
        address: params.recipientAddress,
        avatar: params.recipientAvatar || params.contact?.avatar,
        type: isFriend ? 'wallet' : 'wallet'
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

