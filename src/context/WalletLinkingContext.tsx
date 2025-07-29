import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { walletConnectionService } from '../services/walletConnectionService';
import { Alert } from 'react-native';

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
      // In a real app, you would load this from secure storage
      // For now, we'll use a simple approach
      const connectedWallet = await walletConnectionService.getConnectedWalletInfo();
      if (connectedWallet) {
        const linkedWallet: LinkedWallet = {
          address: connectedWallet.address,
          name: connectedWallet.walletName || 'External Wallet',
          provider: 'Unknown', // We'd need to track this
          balance: connectedWallet.balance,
          isConnected: true,
          linkedAt: new Date()
        };
        setLinkedWallets([linkedWallet]);
      }
    } catch (error) {
      console.error('Error loading linked wallets:', error);
    }
  };

  const connectWallet = async (provider: string): Promise<boolean> => {
    try {
      setIsConnecting(true);

      const result = await walletConnectionService.connectWallet({
        provider,
        showInstallPrompt: true
      });

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
      await walletConnectionService.disconnectWallet();
      
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