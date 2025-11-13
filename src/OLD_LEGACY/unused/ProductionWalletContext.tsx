/**
 * Production Wallet Context
 * Optimized for mainnet deployment with enhanced transaction handling
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { consolidatedTransactionService, TransactionParams, TransactionResult } from '../services/blockchain/transaction';
import { Keypair } from '@solana/web3.js';
import { walletService } from '../services/blockchain/wallet';
import { logger } from '../services/core';

interface ProductionWalletState {
  isConnected: boolean;
  address: string | null;
  publicKey: string | null;
  walletName: string;
  balance: {
    sol: number;
    usdc: number;
  };
  isProduction: boolean;
  networkInfo: {
    name: string;
    rpcUrl: string;
    isProduction: boolean;
  };
}

interface ProductionWalletContextType extends ProductionWalletState {
  connectWallet: (keypair: Keypair, walletName?: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  sendTransaction: (params: TransactionParams) => Promise<TransactionResult>;
  refreshBalance: () => Promise<void>;
  isReadyForProduction: () => boolean;
}

const ProductionWalletContext = createContext<ProductionWalletContextType | undefined>(undefined);

interface ProductionWalletProviderProps {
  children: React.ReactNode;
}

export const ProductionWalletProvider: React.FC<ProductionWalletProviderProps> = ({ children }) => {
  const [state, setState] = useState<ProductionWalletState>({
    isConnected: false,
    address: null,
    publicKey: null,
    walletName: 'App Wallet',
    balance: { sol: 0, usdc: 0 },
    isProduction: false,
    networkInfo: {
      name: 'mainnet',
      rpcUrl: '',
      isProduction: false,
    },
  });

  // Initialize wallet on mount
  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      // Get network info
      const networkInfo = consolidatedTransactionService.getNetworkInfo();
      
      setState(prev => ({
        ...prev,
        isProduction: networkInfo.isProduction,
        networkInfo,
      }));

      // Try to restore wallet from secure storage
      // Note: This context should be used with a specific user ID
      // SECURITY: Secret keys must NOT be stored in AsyncStorage
      // Secret keys should only be stored in SecureStore
      const currentUserId = 'production-user'; // This should be passed from the parent component
      const storedWallet = await walletService.getUserWallet(currentUserId);
      // SECURITY: Secret keys must not be accessed from stored wallet metadata
      // Secret keys should only be retrieved from SecureStore when needed
      if (storedWallet) {
        // Note: Secret key operations should be performed through secure storage
        // This legacy code should not be used in production
        console.warn('⚠️ ProductionWalletContext is legacy code and should not be used in production');
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
    }
  };

  const connectWallet = useCallback(async (keypair: Keypair, walletName: string = 'App Wallet') => {
    try {
      // Set wallet in transaction service
      consolidatedTransactionService.setWallet(keypair);
      
      // Get wallet info
      const walletInfo = consolidatedTransactionService.getWalletInfo();
      if (!walletInfo) {
        throw new Error('Failed to get wallet info');
      }

      // Get initial balance
      const balance = await consolidatedTransactionService.getWalletBalance();

      // Store wallet securely
      // SECURITY: Secret keys must NOT be stored in AsyncStorage
      // Secret keys should only be stored in SecureStore
      await walletService.storeWalletSecurelyPublic('current', {
        address: walletInfo.address,
        publicKey: walletInfo.publicKey,
        // SECURITY: secretKey removed - must NEVER be stored in AsyncStorage
        // Secret keys should only be stored in SecureStore
        walletName,
      });

      setState(prev => ({
        ...prev,
        isConnected: true,
        address: walletInfo.address,
        publicKey: walletInfo.publicKey,
        walletName,
        balance,
      }));

      if (__DEV__) {
        logger.info('Production wallet connected', {
          address: walletInfo.address,
          walletName,
          balance,
          isProduction: state.isProduction,
        });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw new Error('Failed to connect wallet: ' + (error as Error).message);
    }
  }, [state.isProduction]);

  const disconnectWallet = useCallback(async () => {
    try {
      // Clear secure storage
      const currentUserId = 'production-user'; // This should be passed from the parent component
      await walletService.clearWalletDataForUser(currentUserId);
      
      // Clear transaction service wallet
      consolidatedTransactionService.setWallet(null as any);

      setState(prev => ({
        ...prev,
        isConnected: false,
        address: null,
        publicKey: null,
        walletName: 'App Wallet',
        balance: { sol: 0, usdc: 0 },
      }));

      if (__DEV__) {
        logger.info('Production wallet disconnected', null, 'ProductionWalletContext');
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, []);

  const sendTransaction = useCallback(async (params: TransactionParams): Promise<TransactionResult> => {
    try {
      if (!state.isConnected || !state.address) {
        throw new Error('Wallet not connected');
      }

      if (!consolidatedTransactionService.isReadyForProduction()) {
        throw new Error('Service not ready for production');
      }

      if (__DEV__) {
        logger.info('Sending production transaction', {
          to: params.to,
          amount: params.amount,
          currency: params.currency,
          priority: params.priority,
          isProduction: state.isProduction,
        });
      }

      // Send transaction - WeSplit only supports USDC transfers
      let result: TransactionResult;
      
      if (params.currency === 'USDC') {
        result = await consolidatedTransactionService.sendUsdcTransaction(params);
      } else {
        throw new Error(`WeSplit only supports USDC transfers. SOL transfers are not supported within the app.`);
      }

      // Refresh balance after successful transaction
      await refreshBalance();

      if (__DEV__) {
        logger.info('Production transaction successful', {
          signature: result.signature,
          txId: result.txId,
          fee: result.fee,
          computeUnitsUsed: result.computeUnitsUsed,
        });
      }

      return result;
    } catch (error) {
      console.error('Production transaction failed:', error);
      throw new Error('Transaction failed: ' + (error as Error).message);
    }
  }, [state.isConnected, state.address, state.isProduction]);

  const refreshBalance = useCallback(async () => {
    try {
      if (!state.isConnected) {
        return;
      }

      const balance = await consolidatedTransactionService.getWalletBalance();
      
      setState(prev => ({
        ...prev,
        balance,
      }));

      if (__DEV__) {
        logger.info('Balance refreshed', { balance }, 'ProductionWalletContext');
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  }, [state.isConnected]);

  const isReadyForProduction = useCallback(() => {
    return consolidatedTransactionService.isReadyForProduction() && state.isProduction;
  }, [state.isProduction]);

  const contextValue: ProductionWalletContextType = {
    ...state,
    connectWallet,
    disconnectWallet,
    sendTransaction,
    refreshBalance,
    isReadyForProduction,
  };

  return (
    <ProductionWalletContext.Provider value={contextValue}>
      {children}
    </ProductionWalletContext.Provider>
  );
};

export const useProductionWallet = (): ProductionWalletContextType => {
  const context = useContext(ProductionWalletContext);
  if (context === undefined) {
    throw new Error('useProductionWallet must be used within a ProductionWalletProvider');
  }
  return context;
};

// Export for backward compatibility
export { ProductionWalletContext };
