/**
 * Unified Transaction Configuration
 * A clean, reusable configuration system for all transaction types
 * Supports both incoming (funding) and outgoing (withdrawal/transfer) flows
 */

export type TransactionFlow = 'incoming' | 'outgoing';
export type TransactionType = 'funding' | 'withdrawal' | 'transfer';
export type SourceType = 'user_wallet' | 'split_wallet' | 'shared_wallet';
export type DestinationType = 'user_wallet' | 'split_wallet' | 'shared_wallet' | 'external' | 'friend';

/**
 * Unified Transaction Configuration
 * This is the single source of truth for transaction configuration
 */
export interface UnifiedTransactionConfig {
  // Flow Configuration
  flow: TransactionFlow; // 'incoming' = funding, 'outgoing' = withdrawal/transfer
  type: TransactionType; // 'funding' | 'withdrawal' | 'transfer'
  
  // Source Configuration (where funds come from)
  source: {
    type: SourceType;
    id?: string; // splitWalletId, sharedWalletId, or userId
    address?: string; // Optional: direct address override
  };
  
  // Destination Configuration (where funds go to)
  destination: {
    type: DestinationType;
    id?: string; // recipientId, splitWalletId, sharedWalletId
    address?: string; // Optional: direct address override
    name?: string; // Display name for recipient
    avatar?: string; // Avatar URL
  };
  
  // Transaction Details
  amount?: number; // Prefilled amount (optional)
  currency?: 'USDC' | 'SOL';
  memo?: string; // Prefilled memo (optional)
  
  // UI Configuration
  ui: {
    title: string;
    subtitle?: string;
    showAmountInput: boolean;
    showMemoInput: boolean;
    showQuickAmounts: boolean;
    allowExternalDestinations: boolean;
    allowFriendDestinations: boolean;
  };
  
  // Optional Metadata
  metadata?: {
    splitId?: string;
    billId?: string;
    requestId?: string;
    isSettlement?: boolean;
    merchantAddress?: string; // For spend split payments
  };
  
  // Callbacks
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

/**
 * Transaction Config Builder
 * Helper functions to create common transaction configurations
 */
export class TransactionConfigBuilder {
  /**
   * Create a 1:1 transfer configuration
   */
  static transfer(params: {
    recipientId?: string;
    recipientAddress: string;
    recipientName: string;
    recipientAvatar?: string;
    amount?: number;
    memo?: string;
    requestId?: string;
    isSettlement?: boolean;
  }): UnifiedTransactionConfig {
    return {
      flow: 'outgoing',
      type: 'transfer',
      source: {
        type: 'user_wallet'
      },
      destination: {
        type: params.recipientId ? 'friend' : 'external',
        id: params.recipientId,
        address: params.recipientAddress,
        name: params.recipientName,
        avatar: params.recipientAvatar
      },
      amount: params.amount,
      currency: 'USDC',
      memo: params.memo,
      ui: {
        title: 'Send Payment',
        subtitle: `Send to ${params.recipientName}`,
        showAmountInput: true,
        showMemoInput: true,
        showQuickAmounts: true,
        allowExternalDestinations: true,
        allowFriendDestinations: true
      },
      metadata: {
        requestId: params.requestId,
        isSettlement: params.isSettlement
      }
    };
  }

  /**
   * Create a split wallet funding configuration
   */
  static fundSplit(params: {
    splitWalletId: string;
    splitId?: string;
    billId?: string;
    splitType: 'fair' | 'degen' | 'spend';
    amount?: number;
    memo?: string;
    walletAddress: string;
  }): UnifiedTransactionConfig {
    const splitTypeNames = {
      fair: 'Fair Split',
      degen: 'Degen Split',
      spend: 'Spend Split'
    };

    return {
      flow: 'incoming',
      type: 'funding',
      source: {
        type: 'user_wallet'
      },
      destination: {
        type: 'split_wallet',
        id: params.splitWalletId,
        address: params.walletAddress,
        name: `${splitTypeNames[params.splitType]} Wallet`
      },
      amount: params.amount,
      currency: 'USDC',
      memo: params.memo,
      ui: {
        title: params.splitType === 'degen' ? 'Lock Funds' : 'Contribute to Split',
        subtitle: `Pay your share to the ${splitTypeNames[params.splitType].toLowerCase()}`,
        showAmountInput: params.splitType !== 'degen', // Degen split has fixed amount
        showMemoInput: false,
        showQuickAmounts: false,
        allowExternalDestinations: false,
        allowFriendDestinations: false
      },
      metadata: {
        splitId: params.splitId,
        billId: params.billId
      }
    };
  }

  /**
   * Create a split wallet withdrawal configuration
   */
  static withdrawFromSplit(params: {
    splitWalletId: string;
    splitId?: string;
    billId?: string;
    destinationAddress: string;
    destinationName?: string;
    amount?: number;
    memo?: string;
  }): UnifiedTransactionConfig {
    return {
      flow: 'outgoing',
      type: 'withdrawal',
      source: {
        type: 'split_wallet',
        id: params.splitWalletId
      },
      destination: {
        type: 'user_wallet',
        address: params.destinationAddress,
        name: params.destinationName || 'Your Wallet'
      },
      amount: params.amount,
      currency: 'USDC',
      memo: params.memo,
      ui: {
        title: 'Withdraw from Split',
        subtitle: 'Withdraw funds from the completed split',
        showAmountInput: true,
        showMemoInput: true,
        showQuickAmounts: false,
        allowExternalDestinations: true,
        allowFriendDestinations: false
      },
      metadata: {
        splitId: params.splitId,
        billId: params.billId
      }
    };
  }

  /**
   * Create a shared wallet funding configuration
   */
  static fundSharedWallet(params: {
    sharedWalletId: string;
    walletAddress: string;
    amount?: number;
    memo?: string;
  }): UnifiedTransactionConfig {
    return {
      flow: 'incoming',
      type: 'funding',
      source: {
        type: 'user_wallet'
      },
      destination: {
        type: 'shared_wallet',
        id: params.sharedWalletId,
        address: params.walletAddress,
        name: 'Shared Wallet'
      },
      amount: params.amount,
      currency: 'USDC',
      memo: params.memo,
      ui: {
        title: 'Fund Shared Wallet',
        subtitle: 'Add funds to the shared wallet',
        showAmountInput: true,
        showMemoInput: true,
        showQuickAmounts: false,
        allowExternalDestinations: false,
        allowFriendDestinations: false
      }
    };
  }

  /**
   * Create a shared wallet withdrawal configuration
   */
  static withdrawFromSharedWallet(params: {
    sharedWalletId: string;
    destinationAddress: string;
    destinationName?: string;
    amount?: number;
    memo?: string;
  }): UnifiedTransactionConfig {
    return {
      flow: 'outgoing',
      type: 'withdrawal',
      source: {
        type: 'shared_wallet',
        id: params.sharedWalletId
      },
      destination: {
        type: 'user_wallet',
        address: params.destinationAddress,
        name: params.destinationName || 'Your Wallet'
      },
      amount: params.amount,
      currency: 'USDC',
      memo: params.memo,
      ui: {
        title: 'Withdraw from Shared Wallet',
        subtitle: 'Withdraw your funds from the shared wallet',
        showAmountInput: true,
        showMemoInput: true,
        showQuickAmounts: false,
        allowExternalDestinations: true,
        allowFriendDestinations: false
      }
    };
  }

  /**
   * Create a spend split payment configuration (to merchant)
   */
  static payMerchant(params: {
    splitWalletId: string;
    splitId: string;
    merchantAddress: string;
    merchantName: string;
    amount?: number;
    memo?: string;
  }): UnifiedTransactionConfig {
    return {
      flow: 'outgoing',
      type: 'transfer',
      source: {
        type: 'split_wallet',
        id: params.splitWalletId
      },
      destination: {
        type: 'external',
        address: params.merchantAddress,
        name: params.merchantName
      },
      amount: params.amount,
      currency: 'USDC',
      memo: params.memo,
      ui: {
        title: 'Pay Merchant',
        subtitle: `Pay ${params.merchantName} from split wallet`,
        showAmountInput: true,
        showMemoInput: true,
        showQuickAmounts: false,
        allowExternalDestinations: false,
        allowFriendDestinations: false
      },
      metadata: {
        splitId: params.splitId,
        merchantAddress: params.merchantAddress
      }
    };
  }
}

/**
 * Convert UnifiedTransactionConfig to legacy TransactionContext
 * This allows the new system to work with existing handlers
 */
export function convertToLegacyContext(config: UnifiedTransactionConfig): {
  context: string;
  params: any;
} {
  const { flow, type, source, destination, amount, currency, memo, metadata } = config;

  // Map to legacy context
  if (flow === 'outgoing' && type === 'transfer' && source.type === 'user_wallet') {
    // 1:1 transfer
    return {
      context: 'send_1to1',
      params: {
        destinationType: destination.type === 'friend' ? 'friend' : 'external',
        recipientAddress: destination.address,
        recipientId: destination.id,
        amount,
        currency: currency || 'USDC',
        memo,
        requestId: metadata?.requestId,
        isSettlement: metadata?.isSettlement
      }
    };
  }

  if (flow === 'incoming' && type === 'funding' && destination.type === 'split_wallet') {
    // Split funding
    if (metadata?.merchantAddress) {
      // Spend split payment
      return {
        context: 'spend_split_payment',
        params: {
          splitWalletId: destination.id,
          splitId: metadata.splitId,
          merchantAddress: metadata.merchantAddress,
          amount,
          currency: currency || 'USDC',
          memo
        }
      };
    }
    
    // Check if it's a degen split (usually has fixed amount)
    // This would need to be determined from the split data
    return {
      context: 'fair_split_contribution', // Default, can be overridden to 'degen_split_lock'
      params: {
        splitWalletId: destination.id,
        splitId: metadata?.splitId,
        billId: metadata?.billId,
        amount,
        currency: currency || 'USDC',
        memo
      }
    };
  }

  if (flow === 'outgoing' && type === 'withdrawal' && source.type === 'split_wallet') {
    // Split withdrawal
    return {
      context: 'fair_split_withdrawal',
      params: {
        splitWalletId: source.id,
        splitId: metadata?.splitId,
        billId: metadata?.billId,
        destinationAddress: destination.address,
        amount,
        currency: currency || 'USDC',
        memo
      }
    };
  }

  if (flow === 'incoming' && type === 'funding' && destination.type === 'shared_wallet') {
    // Shared wallet funding
    return {
      context: 'shared_wallet_funding',
      params: {
        sharedWalletId: destination.id,
        amount,
        currency: currency || 'USDC',
        memo
      }
    };
  }

  if (flow === 'outgoing' && type === 'withdrawal' && source.type === 'shared_wallet') {
    // Shared wallet withdrawal
    return {
      context: 'shared_wallet_withdrawal',
      params: {
        sharedWalletId: source.id,
        destinationAddress: destination.address,
        amount,
        currency: currency || 'USDC',
        memo
      }
    };
  }

  throw new Error(`Unsupported transaction configuration: ${flow}/${type}/${source.type}/${destination.type}`);
}

