/**
 * Custom hook for managing balance in Send flow
 */

import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useApp } from '../context/AppContext';
import { consolidatedTransactionService } from '../services/blockchain/transaction';

export interface UseBalanceResult {
  balance: number | null;
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
}

export const useBalance = (): UseBalanceResult => {
  const { appWalletBalance, appWalletConnected } = useWallet();
  const { state } = useApp();
  const { currentUser } = state;
  
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = async () => {
    if (!currentUser?.id) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const balanceData = await consolidatedTransactionService.getUserWalletBalance(currentUser.id);
      setBalance(balanceData.usdc);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (appWalletConnected && appWalletBalance !== null) {
      setBalance(appWalletBalance);
    } else if (currentUser?.id) {
      refreshBalance();
    }
  }, [appWalletConnected, appWalletBalance, currentUser?.id]);

  return {
    balance,
    isLoading,
    error,
    refreshBalance
  };
};
