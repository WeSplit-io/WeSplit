/**
 * Custom hook for managing shared wallet transaction modals
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { logger } from '../../../services/analytics/loggingService';
import type { TransactionModalConfig } from '../../../components/shared/CentralizedTransactionModal';

export interface UseTransactionModalResult {
  transactionModalConfig: TransactionModalConfig | null;
  isProcessingTransaction: boolean;
  setTransactionModalConfig: (config: TransactionModalConfig | null) => void;
  showFundingModal: (walletId: string, userWalletAddress: string) => void;
  showWithdrawalModal: (wallet: any, userWalletAddress: string) => void;
  handleTransactionSuccess: (callback?: () => Promise<void>) => (result: any) => Promise<void>;
  handleTransactionError: (error: string) => void;
}

export const useTransactionModal = (): UseTransactionModalResult => {
  const [transactionModalConfig, setTransactionModalConfig] = useState<TransactionModalConfig | null>(null);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);

  const showFundingModal = useCallback((walletId: string, userWalletAddress: string) => {
    const modalConfig: TransactionModalConfig = {
      title: 'Top Up Shared Wallet',
      subtitle: 'Add funds to the shared wallet from your personal wallet',
      showAmountInput: true,
      showMemoInput: true,
      showQuickAmounts: true,
      allowExternalDestinations: false,
      allowFriendDestinations: false,
      context: 'shared_wallet_funding',
      customRecipientInfo: {
        name: 'Shared Wallet',
        address: walletId,
        type: 'shared_wallet'
      },
      onSuccess: async (result) => {
        logger.info('Shared wallet funding successful - starting UI refresh', {
          result,
          walletId
        }, 'useTransactionModal');

        setIsProcessingTransaction(true);
        try {
          // Success callback will be handled by the parent component
          setTransactionModalConfig(null);
        } finally {
          setIsProcessingTransaction(false);
        }
      },
      onError: (error) => {
        logger.error('Shared wallet funding failed', { error, walletId });
        Alert.alert('Top Up Failed', error);
        setTransactionModalConfig(null);
        setIsProcessingTransaction(false);
      },
      onClose: () => {
        setTransactionModalConfig(null);
      },
    };

    setTransactionModalConfig(modalConfig);
  }, []);

  const showWithdrawalModal = useCallback((wallet: any, userWalletAddress: string) => {
    const modalConfig: TransactionModalConfig = {
      title: 'Withdraw from Shared Wallet',
      subtitle: 'Transfer funds from the shared wallet to your personal wallet',
      showAmountInput: true,
      showMemoInput: true,
      showQuickAmounts: false,
      allowExternalDestinations: false,
      allowFriendDestinations: false,
      context: 'shared_wallet_withdrawal',
      prefilledAmount: (() => {
        const currentUserMember = wallet.members?.find((m: any) => m.userId === 'currentUserId');
        if (currentUserMember) {
          const availableBalance = (currentUserMember.totalContributed || 0) - (currentUserMember.totalWithdrawn || 0);
          return Math.max(0, availableBalance);
        }
        return 0;
      })(),
      customRecipientInfo: {
        name: 'Your Personal Wallet',
        address: userWalletAddress || 'Your Wallet',
        type: 'personal'
      },
      onSuccess: async (result) => {
        logger.info('Shared wallet withdrawal successful', { result });
        setIsProcessingTransaction(true);
        try {
          // Success callback will be handled by the parent component
          setTransactionModalConfig(null);
        } finally {
          setIsProcessingTransaction(false);
        }
      },
      onError: (error) => {
        logger.error('Shared wallet withdrawal failed', { error });
        Alert.alert('Withdrawal Failed', error);
        setTransactionModalConfig(null);
        setIsProcessingTransaction(false);
      },
      onClose: () => {
        setTransactionModalConfig(null);
      },
    };

    setTransactionModalConfig(modalConfig);
  }, []);

  const handleTransactionSuccess = useCallback((callback?: () => Promise<void>) => {
    return async (result: any) => {
      setIsProcessingTransaction(true);
      try {
        if (callback) {
          await callback();
        }
        setTransactionModalConfig(null);
      } finally {
        setIsProcessingTransaction(false);
      }
    };
  }, []);

  const handleTransactionError = useCallback((error: string) => {
    Alert.alert('Transaction Failed', error);
    setTransactionModalConfig(null);
    setIsProcessingTransaction(false);
  }, []);

  return {
    transactionModalConfig,
    isProcessingTransaction,
    setTransactionModalConfig,
    showFundingModal,
    showWithdrawalModal,
    handleTransactionSuccess,
    handleTransactionError,
  };
};

