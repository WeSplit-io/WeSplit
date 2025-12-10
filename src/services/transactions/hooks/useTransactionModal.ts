/**
 * Unified Transaction Modal Hook
 * Provides a consistent interface for using transaction modals across all screens
 */

import { useState, useCallback } from 'react';
import { TransactionModalConfig } from '../../../components/shared/CentralizedTransactionModal';
import {
  FairSplitTransactionConfig,
  DegenSplitTransactionConfig,
  SpendSplitTransactionConfig
} from '../configs/splitTransactionConfigs';
import { SharedWalletTransactionConfig } from '../configs/sharedWalletTransactionConfigs';
import { SendTransactionConfig } from '../configs/sendTransactionConfigs';

export interface UseTransactionModalReturn {
  transactionModalConfig: TransactionModalConfig | null;
  setTransactionModalConfig: (config: TransactionModalConfig | null) => void;
  showTransactionModal: (config: TransactionModalConfig) => void;
  hideTransactionModal: () => void;
  // Helper methods for common transaction types
  showFairSplitContribution: (params: any) => void;
  showFairSplitWithdrawal: (params: any) => void;
  showDegenSplitLock: (params: any) => void;
  showSpendSplitPayment: (params: any) => void;
  showSharedWalletFunding: (params: any) => void;
  showSharedWalletWithdrawal: (params: any) => void;
  showSendTransaction: (params: any) => void;
}

/**
 * Hook for managing transaction modal state
 * Provides helper methods for common transaction types
 */
export function useTransactionModal(): UseTransactionModalReturn {
  const [transactionModalConfig, setTransactionModalConfig] = useState<TransactionModalConfig | null>(null);

  const showTransactionModal = useCallback((config: TransactionModalConfig) => {
    setTransactionModalConfig(config);
  }, []);

  const hideTransactionModal = useCallback(() => {
    setTransactionModalConfig(null);
  }, []);

  // Helper methods for split transactions
  const showFairSplitContribution = useCallback((params: any) => {
    const config = FairSplitTransactionConfig.contribution(params);
    setTransactionModalConfig(config);
  }, []);

  const showFairSplitWithdrawal = useCallback((params: any) => {
    const config = FairSplitTransactionConfig.withdrawal(params);
    setTransactionModalConfig(config);
  }, []);

  const showDegenSplitLock = useCallback((params: any) => {
    const config = DegenSplitTransactionConfig.lock(params);
    setTransactionModalConfig(config);
  }, []);

  const showSpendSplitPayment = useCallback((params: any) => {
    const config = SpendSplitTransactionConfig.payment(params);
    setTransactionModalConfig(config);
  }, []);

  // Helper methods for shared wallet transactions
  const showSharedWalletFunding = useCallback((params: any) => {
    const config = SharedWalletTransactionConfig.funding(params);
    setTransactionModalConfig(config);
  }, []);

  const showSharedWalletWithdrawal = useCallback((params: any) => {
    const config = SharedWalletTransactionConfig.withdrawal(params);
    setTransactionModalConfig(config);
  }, []);

  // Helper method for send transactions
  const showSendTransaction = useCallback((params: any) => {
    const config = SendTransactionConfig.send(params);
    setTransactionModalConfig(config);
  }, []);

  return {
    transactionModalConfig,
    setTransactionModalConfig,
    showTransactionModal,
    hideTransactionModal,
    showFairSplitContribution,
    showFairSplitWithdrawal,
    showDegenSplitLock,
    showSpendSplitPayment,
    showSharedWalletFunding,
    showSharedWalletWithdrawal,
    showSendTransaction
  };
}

