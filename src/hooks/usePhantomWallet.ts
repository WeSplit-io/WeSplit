/**
 * Phantom Wallet Hook
 *
 * Custom hook that integrates official Phantom React SDK
 * with WeSplit's wallet operations and split creation
 */

import { useCallback } from 'react';
import { usePhantom, useSolana } from '@phantom/react-native-sdk';
import { logger } from '../services/analytics/loggingService';
import { UnifiedWalletService } from '../services/blockchain/wallet/UnifiedWalletService';
import { UnifiedTransactionService } from '../services/blockchain/transaction/UnifiedTransactionService';

export interface UsePhantomWalletReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  user: any;
  walletAddress: string | null;

  // Wallet operations
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;

  // Split operations
  createSplitWallet: (
    splitType: 'degen' | 'spend' | 'fair',
    socialProvider?: 'google' | 'apple'
  ) => Promise<{
    success: boolean;
    walletAddress?: string;
    error?: string;
  }>;

  signTransaction: (transaction: any) => Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }>;

  signMessage: (message: string) => Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }>;

  // Utilities
  switchNetwork: (network: 'mainnet-beta' | 'devnet' | 'testnet') => Promise<void>;
  getBalance: () => Promise<number>;
}

export const usePhantomWallet = (): UsePhantomWalletReturn => {
  // Check if Phantom is enabled via feature flags
  const { isPhantomEnabled } = require('../config/features');
  
  if (!isPhantomEnabled()) {
    return {
      isConnected: false,
      isConnecting: false,
      user: null,
      walletAddress: null,
      connectWallet: async () => {},
      disconnectWallet: async () => {},
      createSplitWallet: async () => ({ success: false, error: 'Phantom integration not configured' }),
      signTransaction: async () => ({ success: false, error: 'Phantom integration not configured' }),
      signMessage: async () => ({ success: false, error: 'Phantom integration not configured' }),
      switchNetwork: async () => {},
      getBalance: async () => 0,
    };
  }

  const { isConnected, user, connect, disconnect } = usePhantom();
  const { solana } = useSolana();

  const unifiedWalletService = UnifiedWalletService.getInstance();
  const unifiedTransactionService = UnifiedTransactionService.getInstance();

  // Get wallet address from Phantom user
  const walletAddress = user?.wallets?.solana?.publicKey || null;

  /**
   * Connect to Phantom wallet
   */
  const connectWallet = useCallback(async () => {
    try {
      logger.info('Connecting to Phantom wallet', null, 'usePhantomWallet');
      await connect();
      logger.info('Successfully connected to Phantom wallet', null, 'usePhantomWallet');
    } catch (error) {
      logger.error('Failed to connect to Phantom wallet', error, 'usePhantomWallet');
      throw error;
    }
  }, [connect]);

  /**
   * Disconnect from Phantom wallet
   */
  const disconnectWallet = useCallback(async () => {
    try {
      logger.info('Disconnecting from Phantom wallet', null, 'usePhantomWallet');
      await disconnect();
      logger.info('Successfully disconnected from Phantom wallet', null, 'usePhantomWallet');
    } catch (error) {
      logger.error('Failed to disconnect from Phantom wallet', error, 'usePhantomWallet');
      throw error;
    }
  }, [disconnect]);

  /**
   * Create wallet for split participation
   */
  const createSplitWallet = useCallback(async (
    splitType: 'degen' | 'spend' | 'fair',
    socialProvider: 'google' | 'apple' = 'google'
  ) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      logger.info('Creating split wallet with Phantom', { splitType, socialProvider }, 'usePhantomWallet');

      // Use our unified service to create wallet for split
      const walletInfo = await unifiedWalletService.ensureWalletForSplit(
        user.id,
        user.name || 'Phantom User',
        user.email || '',
        splitType,
        socialProvider
      );

      if (walletInfo.type === 'none') {
        return { success: false, error: 'Failed to create wallet for split' };
      }

      return {
        success: true,
        walletAddress: walletInfo.address || undefined
      };

    } catch (error) {
      logger.error('Failed to create split wallet', error, 'usePhantomWallet');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create split wallet'
      };
    }
  }, [user]);

  /**
   * Sign transaction using Phantom
   */
  const signTransaction = useCallback(async (transaction: any) => {
    try {
      if (!solana?.isConnected) {
        return { success: false, error: 'Phantom not connected' };
      }

      logger.info('Signing transaction with Phantom', null, 'usePhantomWallet');

      // Use official Phantom SDK to sign and send
      const result = await solana.signAndSendTransaction(transaction);

      logger.info('Transaction signed and sent', { signature: result.hash }, 'usePhantomWallet');

      return {
        success: true,
        signature: result.hash
      };

    } catch (error) {
      logger.error('Failed to sign transaction', error, 'usePhantomWallet');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction signing failed'
      };
    }
  }, [solana]);

  /**
   * Sign message using Phantom
   */
  const signMessage = useCallback(async (message: string) => {
    try {
      if (!solana?.isConnected) {
        return { success: false, error: 'Phantom not connected' };
      }

      logger.info('Signing message with Phantom', null, 'usePhantomWallet');

      const signature = await solana.signMessage(message);

      logger.info('Message signed successfully', null, 'usePhantomWallet');

      return {
        success: true,
        signature: signature.toString()
      };

    } catch (error) {
      logger.error('Failed to sign message', error, 'usePhantomWallet');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Message signing failed'
      };
    }
  }, [solana]);

  /**
   * Switch Solana network
   */
  const switchNetwork = useCallback(async (network: 'mainnet-beta' | 'devnet' | 'testnet') => {
    try {
      if (!solana?.isConnected) {
        throw new Error('Phantom not connected');
      }

      logger.info('Switching Solana network', { network }, 'usePhantomWallet');
      await solana.switchNetwork(network);
      logger.info('Network switched successfully', { network }, 'usePhantomWallet');

    } catch (error) {
      logger.error('Failed to switch network', error, 'usePhantomWallet');
      throw error;
    }
  }, [solana]);

  /**
   * Get SOL balance
   */
  const getBalance = useCallback(async (): Promise<number> => {
    try {
      if (!solana?.isConnected) {
        return 0;
      }

      // This would need to be implemented with Phantom SDK balance checking
      // For now, return 0 as placeholder
      logger.debug('Balance checking not yet implemented', null, 'usePhantomWallet');
      return 0;

    } catch (error) {
      logger.error('Failed to get balance', error, 'usePhantomWallet');
      return 0;
    }
  }, [solana]);

  return {
    // Connection state
    isConnected,
    isConnecting: false, // Could be enhanced with loading state
    user,
    walletAddress,

    // Wallet operations
    connectWallet,
    disconnectWallet,

    // Split operations
    createSplitWallet,
    signTransaction,
    signMessage,

    // Utilities
    switchNetwork,
    getBalance
  };
};
