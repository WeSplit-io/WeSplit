import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { connectWallet, disconnectWallet, getWalletInfo, WalletInfo, getCurrentWalletName } from '../../utils/walletService';

interface TransactionParams {
  to: string;
  amount: number;
  currency: string;
  memo?: string;
  groupId?: string;
}

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
  sendTransaction: (params: TransactionParams) => Promise<{ signature: string; txId: string }>;
  isLoading: boolean;
  chainId: string | null;
  balance: number | null;
  walletInfo: WalletInfo | null;
  walletName: string | null;
  secretKey: string | null;
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
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);

  useEffect(() => {
    console.log('WalletProvider mounted successfully');
    console.log('Current wallet state:', { address, isConnected, chainId, balance, walletName });
  }, [address, isConnected, chainId, balance, walletName]);

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
          setWalletName(info.walletName || null);
          setChainId('solana:devnet');
          // Expose secret key if available
          if (info && (info as any).secretKey) {
            setSecretKey((info as any).secretKey);
          } else {
            setSecretKey(null);
          }
          console.log('Found existing wallet connection:', info.address, 'using', info.walletName);
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
      setWalletName(walletInfo.walletName || null);
      setChainId('solana:devnet');
      // Expose secret key if available
      if (walletInfo && (walletInfo as any).secretKey) {
        setSecretKey((walletInfo as any).secretKey);
      } else {
        setSecretKey(null);
      }
      console.log('Solana wallet connected successfully:', walletInfo.address, 'using', walletInfo.walletName);
      
    } catch (error) {
      console.error('Error in connectWallet:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      
      // Don't show alert for user cancellation
      if (!errorMessage.includes('cancelled') && !errorMessage.includes('user rejected')) {
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
      setWalletName(null);
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
      console.log('Wallet connected:', { address, chainId, balance, walletName });
    } else if (!isConnected) {
      console.log('Wallet disconnected');
    }
  }, [isConnected, address, chainId, balance, walletName]);

  const handleSendTransaction = async (params: TransactionParams): Promise<{ signature: string; txId: string }> => {
    try {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      console.log('Sending transaction:', params);
      
      // Simulate transaction processing for now
      // In a real implementation, this would create and send a Solana transaction
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a mock transaction signature
      const signature = `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const txId = signature;
      
      console.log('Transaction sent successfully:', { signature, txId });
      
      return { signature, txId };
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  };

  const value: WalletContextType = {
    isConnected: isConnected || false,
    address: address || null,
    connectWallet: handleConnectWallet,
    disconnectWallet: handleDisconnectWallet,
    sendTransaction: handleSendTransaction,
    isLoading,
    chainId: chainId || null,
    balance: balance || null,
    walletInfo: walletInfo || null,
    walletName: walletName || null,
    secretKey,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}; 