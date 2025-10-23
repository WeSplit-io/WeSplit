import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { walletService } from '../services/blockchain/wallet';
import { Alert } from 'react-native';
import { logger } from '../services/core';

export interface LinkedWallet {
  address: string;
  name: string;
  provider: string;
  balance: number;
  isConnected: boolean;
  linkedAt: Date;
}

interface WalletLinkingContextType {
  linkedWallets: LinkedWallet[];
  isConnecting: boolean;
  connectWallet: (provider: string) => Promise<boolean>;
  disconnectWallet: (address: string) => Promise<void>;
  refreshWallets: () => Promise<void>;
  getConnectedWallet: () => LinkedWallet | null;
  isWalletLinked: (address: string) => boolean;
}

const WalletLinkingContext = createContext<WalletLinkingContextType | undefined>(undefined);

interface WalletLinkingProviderProps {
  children: ReactNode;
}

export const WalletLinkingProvider: React.FC<WalletLinkingProviderProps> = ({ children }) => {
  const [linkedWallets, setLinkedWallets] = useState<LinkedWallet[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load previously linked wallets on app start
  useEffect(() => {
    loadLinkedWallets();
  }, []);

  const loadLinkedWallets = async () => {
    try {
      // Check if wallet service is available and has a wallet loaded
      if (!walletService || !walletService.isConnected()) {
        logger.info('No wallet connected, skipping linked wallets load', null, 'WalletLinkingContext');
        return;
      }

      // Get the current user ID from the wallet service
      const walletInfo = await walletService.getWalletInfo();
      if (!walletInfo?.userId) {
        logger.info('No user ID available, skipping linked wallets load', null, 'WalletLinkingContext');
        return;
      }

      // Load linked wallets from the centralized service
      const { LinkedWalletService } = await import('../services/LinkedWalletService');
      const linkedWalletsData = await LinkedWalletService.getLinkedWallets(walletInfo.userId);
      
      // Transform the data to match the context interface
      const transformedWallets: LinkedWallet[] = linkedWalletsData.map(wallet => ({
        address: wallet.address || '',
        name: wallet.label,
        provider: wallet.chain || 'Unknown',
        balance: wallet.balance || 0,
        isConnected: wallet.isActive,
        linkedAt: new Date(wallet.createdAt)
      }));

      setLinkedWallets(transformedWallets);
      logger.info('Linked wallets loaded successfully', { count: transformedWallets.length }, 'WalletLinkingContext');
    } catch (error) {
      console.error('Error loading linked wallets:', error);
      logger.error('Failed to load linked wallets', error, 'WalletLinkingContext');
      // Don't throw the error, just log it and continue
    }
  };

  const connectWallet = async (provider: string): Promise<boolean> => {
    try {
      setIsConnecting(true);

      const result = await walletService.connectToProvider(provider);

      if (!result.success) {
        Alert.alert('Connection Failed', result.error || 'Failed to connect wallet');
        return false;
      }

      // Create linked wallet object
      const linkedWallet: LinkedWallet = {
        address: result.walletAddress!,
        name: result.walletName || 'External Wallet',
        provider: result.provider || provider,
        balance: result.balance || 0,
        isConnected: true,
        linkedAt: new Date()
      };

      // Add to linked wallets (avoid duplicates)
      setLinkedWallets(prev => {
        const existing = prev.find(w => w.address === linkedWallet.address);
        if (existing) {
          return prev.map(w => 
            w.address === linkedWallet.address 
              ? { ...linkedWallet, linkedAt: existing.linkedAt }
              : w
          );
        }
        return [...prev, linkedWallet];
      });

      Alert.alert(
        'Wallet Connected',
        `Successfully connected to ${provider}!\n\nAddress: ${result.walletAddress?.slice(0, 8)}...${result.walletAddress?.slice(-8)}\nBalance: $${(result.balance || 0).toFixed(2)} USDC`
      );

      return true;

    } catch (error) {
      console.error('Error connecting wallet:', error);
      Alert.alert('Connection Failed', 'Failed to connect wallet');
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async (address: string): Promise<void> => {
    try {
      await walletService.disconnect();
      
      setLinkedWallets(prev => 
        prev.map(wallet => 
          wallet.address === address 
            ? { ...wallet, isConnected: false }
            : wallet
        )
      );

      Alert.alert('Wallet Disconnected', 'Wallet has been disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      Alert.alert('Disconnect Failed', 'Failed to disconnect wallet');
    }
  };

  const refreshWallets = async (): Promise<void> => {
    try {
      await loadLinkedWallets();
    } catch (error) {
      console.error('Error refreshing wallets:', error);
    }
  };

  const getConnectedWallet = (): LinkedWallet | null => {
    return linkedWallets.find(wallet => wallet.isConnected) || null;
  };

  const isWalletLinked = (address: string): boolean => {
    return linkedWallets.some(wallet => wallet.address === address);
  };

  const value: WalletLinkingContextType = {
    linkedWallets,
    isConnecting,
    connectWallet,
    disconnectWallet,
    refreshWallets,
    getConnectedWallet,
    isWalletLinked
  };

  return (
    <WalletLinkingContext.Provider value={value}>
      {children}
    </WalletLinkingContext.Provider>
  );
};

export const useWalletLinking = (): WalletLinkingContextType => {
  const context = useContext(WalletLinkingContext);
  if (context === undefined) {
    throw new Error('useWalletLinking must be used within a WalletLinkingProvider');
  }
  return context;
}; 