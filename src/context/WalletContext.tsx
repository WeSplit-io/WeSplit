import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { connectWallet, disconnectWallet, getWalletInfo, WalletInfo } from '../../utils/walletService';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
  isLoading: boolean;
  chainId: string | null;
  balance: number | null;
  walletInfo: WalletInfo | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
  appKitInstance?: any; // Keep for backward compatibility
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);

  useEffect(() => {
    console.log('WalletProvider mounted successfully');
    console.log('Current wallet state:', { address, isConnected, chainId, balance });
  }, [address, isConnected, chainId, balance]);

  // Check initial wallet connection status
  useEffect(() => {
    const checkInitialConnection = async () => {
      try {
        const info = await getWalletInfo();
        if (info && info.isConnected) {
          setIsConnected(true);
          setAddress(info.address);
          setBalance(info.balance || null);
          setWalletInfo(info);
          setChainId('solana:devnet');
          console.log('Found existing wallet connection:', info.address);
        }
      } catch (error) {
        console.error('Error checking initial connection:', error);
      }
    };

    checkInitialConnection();
  }, []);

  const handleConnectWallet = async () => {
    try {
      console.log('WalletProvider: connectWallet called');
      setIsLoading(true);
      
      // Connect to Solana wallet
      const walletInfo = await connectWallet();
      
      setIsConnected(true);
      setAddress(walletInfo.address);
      setBalance(walletInfo.balance || null);
      setWalletInfo(walletInfo);
      setChainId('solana:devnet');
      console.log('Solana wallet connected successfully:', walletInfo.address);
      
    } catch (error) {
      console.error('Error in connectWallet:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      
      // Don't show alert for user cancellation
      if (!errorMessage.includes('cancelled')) {
        Alert.alert('Connection Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      console.log('WalletProvider: disconnectWallet called');
      setIsLoading(true);
      
      await disconnectWallet();
      
      console.log('Disconnecting wallet...');
      setIsConnected(false);
      setAddress(null);
      setChainId(null);
      setBalance(null);
      setWalletInfo(null);
      console.log('Wallet disconnected successfully');
      
    } catch (error) {
      console.error('Error in disconnectWallet:', error);
      Alert.alert('Disconnect Error', 'Failed to disconnect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for wallet connection events
  useEffect(() => {
    console.log('WalletProvider: Setting up event listeners');
    
    if (isConnected && address) {
      console.log('Wallet connected:', { address, chainId, balance });
    } else if (!isConnected) {
      console.log('Wallet disconnected');
    }
  }, [isConnected, address, chainId, balance]);

  const value: WalletContextType = {
    isConnected: isConnected || false,
    address: address || null,
    connectWallet: handleConnectWallet,
    disconnectWallet: handleDisconnectWallet,
    isLoading,
    chainId: chainId || null,
    balance: balance || null,
    walletInfo: walletInfo || null,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}; 