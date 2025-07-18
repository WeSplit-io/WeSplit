import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { userWalletService, WalletCreationResult } from '../services/userWalletService';

export interface UseWalletCreationResult {
  walletExists: boolean;
  walletAddress: string | null;
  isLoading: boolean;
  error: string | null;
  ensureWallet: () => Promise<WalletCreationResult>;
}

export const useWalletCreation = (): UseWalletCreationResult => {
  const { state } = useApp();
  const currentUser = state.currentUser;
  const [walletExists, setWalletExists] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure wallet exists when user changes
  useEffect(() => {
    const checkAndEnsureWallet = async () => {
      if (!currentUser?.id) {
        setWalletExists(false);
        setWalletAddress(null);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const walletResult = await userWalletService.ensureUserWallet(currentUser.id.toString());
        
        if (walletResult.success && walletResult.wallet) {
          setWalletExists(true);
          setWalletAddress(walletResult.wallet.address);
          if (__DEV__) { console.log('✅ Wallet ensured via hook:', walletResult.wallet.address); }
        } else {
          setWalletExists(false);
          setWalletAddress(null);
          setError(walletResult.error || 'Failed to ensure wallet');
          if (__DEV__) { console.log('❌ Failed to ensure wallet via hook:', walletResult.error); }
        }
      } catch (err) {
        setWalletExists(false);
        setWalletAddress(null);
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error in useWalletCreation:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAndEnsureWallet();
  }, [currentUser?.id]);

  // Manual wallet creation function
  const ensureWallet = async (): Promise<WalletCreationResult> => {
    if (!currentUser?.id) {
      return {
        success: false,
        error: 'No user logged in'
      };
    }

    try {
      setIsLoading(true);
      setError(null);

      const walletResult = await userWalletService.ensureUserWallet(currentUser.id.toString());
      
      if (walletResult.success && walletResult.wallet) {
        setWalletExists(true);
        setWalletAddress(walletResult.wallet.address);
      } else {
        setWalletExists(false);
        setWalletAddress(null);
        setError(walletResult.error || 'Failed to ensure wallet');
      }

      return walletResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setWalletExists(false);
      setWalletAddress(null);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    walletExists,
    walletAddress,
    isLoading,
    error,
    ensureWallet
  };
}; 