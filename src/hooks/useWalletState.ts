/**
 * Unified Wallet State Management Hook
 * Provides consistent wallet state across all screens
 * Eliminates duplicate wallet creation and state management
 */

import { useState, useEffect, useCallback } from 'react';
import { walletService, UserWalletBalance } from '../services/blockchain/wallet';
import { balanceManagementService } from '../services/blockchain/wallet/balanceManagementService';
import { logger } from '../services/analytics/loggingService';

export interface WalletState {
  // Wallet info
  address: string | null;
  publicKey: string | null;
  isConnected: boolean;

  // Balance info
  balance: UserWalletBalance | null;
  totalUSD: number;

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;

  // Recovery state
  needsRecovery?: boolean;

  // Error state
  error: string | null;
}

export interface WalletActions {
  refreshWallet: () => Promise<void>;
  ensureWallet: (userId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useWalletState = (userId?: string) => {
  const [state, setState] = useState<WalletState>({
    address: null,
    publicKey: null,
    isConnected: false,
    balance: null,
    totalUSD: 0,
    isLoading: false,
    isInitialized: false,
    error: null
  });

  const ensureWallet = useCallback(async (userId: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      logger.info('Ensuring wallet for user', { userId }, 'useWalletState');
      
      const walletResult = await walletService.ensureUserWallet(userId);

      if (walletResult.success && walletResult.wallet) {
        // Check if wallet needs recovery
        if (walletResult.needsRecovery || walletResult.wallet.walletType === 'recovery-needed') {
          logger.warn('Wallet needs recovery', {
            userId,
            address: walletResult.wallet.address,
            walletType: walletResult.wallet.walletType
          }, 'useWalletState');

          setState(prev => ({
            ...prev,
            address: walletResult.wallet!.address,
            publicKey: walletResult.wallet!.publicKey,
            isConnected: false, // Cannot perform transactions without keys
            balance: null,
            totalUSD: 0,
            isInitialized: true,
            needsRecovery: true,
            error: 'Wallet needs recovery. Please restore from seed phrase.'
          }));

          return true;
        }

        // Get balance for functional wallet
        const balance = await walletService.getUserWalletBalance(userId);

        setState(prev => ({
          ...prev,
          address: walletResult.wallet!.address,
          publicKey: walletResult.wallet!.publicKey,
          isConnected: true,
          balance,
          totalUSD: balance?.totalUSD || 0,
          isInitialized: true,
          error: null
        }));

        logger.info('Wallet ensured successfully', {
          userId,
          address: walletResult.wallet.address,
          totalUSD: balance?.totalUSD || 0
        }, 'useWalletState');

        return true;
      } else {
        setState(prev => ({
          ...prev,
          error: walletResult.error || 'Failed to ensure wallet',
          isInitialized: true
        }));
        
        logger.error('Failed to ensure wallet', { 
          userId, 
          error: walletResult.error 
        }, 'useWalletState');
        
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isInitialized: true
      }));
      
      logger.error('Error ensuring wallet', { error }, 'useWalletState');
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const refreshWallet = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Use balance management service to prevent excessive calls
      const balanceState = await balanceManagementService.getBalance(userId, true);
      
      setState(prev => ({
        ...prev,
        balance: balanceState.balance,
        totalUSD: balanceState.balance?.totalUSD || 0,
        error: balanceState.error,
        isLoading: balanceState.isLoading
      }));
      
      logger.info('Wallet refreshed successfully', { 
        userId, 
        totalUSD: balanceState.balance?.totalUSD || 0
      }, 'useWalletState');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      logger.error('Error refreshing wallet', { error }, 'useWalletState');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-ensure wallet when userId changes
  useEffect(() => {
    if (userId && !state.isInitialized) {
      ensureWallet(userId);
    }
  }, [userId, ensureWallet, state.isInitialized]);

  const actions: WalletActions = {
    refreshWallet,
    ensureWallet,
    clearError
  };

  return { ...state, ...actions };
};
