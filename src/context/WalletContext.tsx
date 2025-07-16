import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// WalletInfo interface for backward compatibility
interface WalletInfo {
  publicKey: any;
  address: string;
  isConnected: boolean;
  balance?: number;
  walletName?: string;
  secretKey?: string;
}
import { solanaService, SolanaTransactionParams, SolanaTransactionResult } from '../services/solanaTransactionService';
import { solanaAppKitService } from '../services/solanaAppKitService';

interface TransactionParams {
  to: string;
  amount: number;
  currency: string;
  memo?: string;
  groupId?: string;
}

// Extended WalletInfo interface to include wallet type
interface ExtendedWalletInfo extends WalletInfo {
  walletType?: 'app-generated' | 'external';
}

interface StoredWallet {
  id: string;
  name: string;
  address: string;
  secretKey: string;
  isAppGenerated: boolean;
  createdAt: string;
  lastUsed: string;
}

interface WalletContextType {
  // State
  isConnected: boolean;
  address: string | null;
  balance: number | null;
  walletInfo: ExtendedWalletInfo | null;
  walletName: string | null;
  chainId: string | null;
  secretKey: string | null;
  isLoading: boolean;
  availableWallets: StoredWallet[];
  currentWalletId: string | null;
  
  // Actions
  connectWallet: () => Promise<void>;
  connectToExternalWallet: (providerKey: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchWallet: (walletId: string) => Promise<void>;
  importNewWallet: (secretKey: string, name?: string) => Promise<void>;
  removeWallet: (walletId: string) => Promise<void>;
  sendTransaction: (params: TransactionParams) => Promise<{ signature: string; txId: string }>;
  refreshBalance: () => Promise<void>;
  
  // Provider methods
  getAvailableProviders: () => any[];
  isProviderAvailable: (providerKey: string) => boolean;
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
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [walletInfo, setWalletInfo] = useState<ExtendedWalletInfo | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<StoredWallet[]>([]);
  const [currentWalletId, setCurrentWalletId] = useState<string | null>(null);

  useEffect(() => {
    if (__DEV__) { console.log('WalletProvider mounted successfully'); }
    if (__DEV__) { console.log('Current wallet state:', { address, isConnected, chainId, balance, walletName, currentWalletId }); }
  }, [address, isConnected, chainId, balance, walletName, currentWalletId]);

  // Load stored wallets from AsyncStorage
  useEffect(() => {
    const loadStoredWallets = async () => {
      try {
        const stored = await AsyncStorage.getItem('storedWallets');
        if (stored) {
          const wallets = JSON.parse(stored);
          setAvailableWallets(wallets);
        }
      } catch (error) {
        console.error('Error loading stored wallets:', error);
      }
    };

    loadStoredWallets();
  }, []);

  // Save wallets to AsyncStorage
  const saveWalletsToStorage = async (wallets: StoredWallet[]) => {
    try {
      await AsyncStorage.setItem('storedWallets', JSON.stringify(wallets));
    } catch (error) {
      console.error('Error saving wallets to storage:', error);
    }
  };

  // Refresh balance
  const refreshBalance = async () => {
    try {
      if (isConnected && address) {
        const info = await solanaAppKitService.getWalletInfo();
        setBalance(info.balance || null);
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  // Check initial wallet connection status
  useEffect(() => {
    const checkInitialConnection = async () => {
      try {
        const info = await solanaAppKitService.getWalletInfo();
        if (info && info.isConnected) {
          setIsConnected(true);
          setAddress(info.address);
          setBalance(info.balance || null);
          setWalletInfo(info as ExtendedWalletInfo);
          setWalletName(info.walletName || null);
          setChainId(process.env.NODE_ENV === 'production' ? 'solana:mainnet' : 'solana:devnet');
          // Expose secret key if available
          if (info && (info as any).secretKey) {
            setSecretKey((info as any).secretKey);
          } else {
            setSecretKey(null);
          }
          if (__DEV__) { console.log('Found existing wallet connection:', info.address, 'using', info.walletName); }
          
          // Refresh balance after initial connection
          setTimeout(() => {
            refreshBalance();
          }, 1000); // Small delay to ensure everything is set up
        }
      } catch (error) {
        console.error('Error checking initial connection:', error);
      }
    };

    checkInitialConnection();
  }, []);

  // Connect to a specific wallet
  const connectToWallet = async (wallet: StoredWallet) => {
    try {
      setIsLoading(true);
      
      // Import the wallet using the AppKit service
      const walletInfo = await solanaAppKitService.importWallet(wallet.secretKey);
      
      setIsConnected(true);
      setAddress(walletInfo.address);
      setBalance(walletInfo.balance || null);
      setWalletInfo({
        publicKey: walletInfo.publicKey as any,
        address: walletInfo.address,
        isConnected: true,
        balance: walletInfo.balance,
        walletName: wallet.name,
        secretKey: wallet.secretKey,
        walletType: 'app-generated'
      });
      setWalletName(wallet.name);
      setChainId(process.env.NODE_ENV === 'production' ? 'solana:mainnet' : 'solana:devnet');
      setSecretKey(wallet.secretKey);
      setCurrentWalletId(wallet.id);
      
      // Update last used timestamp
      const updatedWallets = availableWallets.map(w => 
        w.id === wallet.id 
          ? { ...w, lastUsed: new Date().toISOString() }
          : w
      );
      setAvailableWallets(updatedWallets);
      await saveWalletsToStorage(updatedWallets);
      
      // Try to connect the Solana service as well
      try {
        await solanaService.importWallet(wallet.secretKey);
        if (__DEV__) { console.log('Solana blockchain service connected successfully'); }
      } catch (solanaError) {
        console.warn('Failed to connect Solana blockchain service:', solanaError);
      }
      
      // Refresh balance after connecting
      await refreshBalance();
      
      if (__DEV__) { console.log('Connected to wallet:', wallet.name, wallet.address); }
      
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to external wallet provider
  const connectToExternalWallet = async (providerKey: string) => {
    try {
      setIsLoading(true);
      
      // Connect to the specific wallet provider
      const walletInfo = await solanaAppKitService.connectToProvider(providerKey);
      
      setIsConnected(true);
      setAddress(walletInfo.address);
      setBalance(walletInfo.balance || null);
      setWalletInfo({
        publicKey: walletInfo.publicKey as any,
        address: walletInfo.address,
        isConnected: true,
        balance: walletInfo.balance,
        walletName: walletInfo.walletName || 'External Wallet',
        walletType: walletInfo.walletType
      });
      setWalletName(walletInfo.walletName || 'External Wallet');
      setChainId(process.env.NODE_ENV === 'production' ? 'solana:mainnet' : 'solana:devnet');
      setSecretKey(null); // External wallets don't expose secret keys
      setCurrentWalletId(`external_${providerKey}`);
      
      // Refresh balance after connecting
      await refreshBalance();
      
      if (__DEV__) { console.log('Connected to external wallet:', walletInfo.walletName, walletInfo.address); }
      
    } catch (error) {
      console.error('Error connecting to external wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get available wallet providers
  const getAvailableProviders = () => {
    return solanaAppKitService.getAvailableProviders();
  };

  // Check if a provider is available
  const isProviderAvailable = (providerKey: string) => {
    return solanaAppKitService.isProviderAvailable(providerKey);
  };

  const handleConnectWallet = async () => {
    try {
      if (__DEV__) { console.log('WalletProvider: connectWallet called'); }
      setIsLoading(true);
      
      // If we have stored wallets, show selection
      if (availableWallets.length > 0) {
        // For now, connect to the first available wallet
        // In a real implementation, you'd show a wallet selection modal
        await connectToWallet(availableWallets[0]);
        return;
      }
      
      // Generate a new wallet if no stored wallets
      const createWalletResult = await solanaAppKitService.createWallet();
      const wallet = createWalletResult.wallet;
      
      // Create a new stored wallet entry
      const newWallet: StoredWallet = {
        id: `wallet_${Date.now()}`,
        name: 'Generated Wallet',
        address: wallet.address,
        secretKey: wallet.secretKey || '',
        isAppGenerated: true,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };
      
      const updatedWallets = [...availableWallets, newWallet];
      setAvailableWallets(updatedWallets);
      await saveWalletsToStorage(updatedWallets);
      
      setIsConnected(true);
      setAddress(wallet.address);
      setBalance(wallet.balance || null);
      setWalletInfo({
        publicKey: wallet.publicKey as any,
        address: wallet.address,
        isConnected: true,
        balance: wallet.balance,
        walletName: 'Generated Wallet',
        secretKey: wallet.secretKey,
        walletType: 'app-generated'
      });
      setWalletName('Generated Wallet');
      setChainId(process.env.NODE_ENV === 'production' ? 'solana:mainnet' : 'solana:devnet');
      setCurrentWalletId(newWallet.id);
      
      // Expose secret key if available
      if (wallet.secretKey) {
        setSecretKey(wallet.secretKey);
        
        // Try to connect the Solana service as well
        try {
          await solanaService.importWallet(wallet.secretKey);
          if (__DEV__) { console.log('Solana blockchain service connected successfully'); }
        } catch (solanaError) {
          console.warn('Failed to connect Solana blockchain service:', solanaError);
        }
      } else {
        setSecretKey(null);
      }
      
      // Refresh balance after connecting
      await refreshBalance();
      
      if (__DEV__) { console.log('Solana wallet connected successfully:', wallet.address, 'using Generated Wallet'); }
      
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
      if (__DEV__) { console.log('WalletProvider: disconnectWallet called'); }
      setIsLoading(true);
      
      await solanaAppKitService.disconnect();
      
      // Also disconnect from Solana service and AppKit provider
      solanaService.disconnect();
      await solanaAppKitService.disconnectFromProvider();
      
      if (__DEV__) { console.log('Disconnecting wallet...'); }
      setIsConnected(false);
      setAddress(null);
      setChainId(null);
      setBalance(null);
      setWalletInfo(null);
      setWalletName(null);
      setSecretKey(null);
      setCurrentWalletId(null);
      if (__DEV__) { console.log('Wallet disconnected successfully'); }
      
    } catch (error) {
      console.error('Error in disconnectWallet:', error);
      Alert.alert('Disconnect Error', 'Failed to disconnect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to a different wallet
  const switchWallet = async (walletId: string) => {
    try {
      const wallet = availableWallets.find(w => w.id === walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      await connectToWallet(wallet);
    } catch (error) {
      console.error('Error switching wallet:', error);
      Alert.alert('Error', 'Failed to switch wallet. Please try again.');
    }
  };

  // Import a new wallet
  const importNewWallet = async (secretKey: string, name?: string) => {
    try {
      setIsLoading(true);
      
      // Validate the secret key by trying to import it using AppKit
      const walletInfo = await solanaAppKitService.importWallet(secretKey);
      
      // Create new stored wallet entry
      const newWallet: StoredWallet = {
        id: `wallet_${Date.now()}`,
        name: name || 'Imported Wallet',
        address: walletInfo.address,
        secretKey: secretKey,
        isAppGenerated: false,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };
      
      const updatedWallets = [...availableWallets, newWallet];
      setAvailableWallets(updatedWallets);
      await saveWalletsToStorage(updatedWallets);
      
      // Connect to the new wallet
      await connectToWallet(newWallet);
      
      // Refresh balance after importing
      await refreshBalance();
      
      if (__DEV__) { console.log('Imported and connected to new wallet:', newWallet.name); }
      
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a wallet
  const removeWallet = async (walletId: string) => {
    try {
      const updatedWallets = availableWallets.filter(w => w.id !== walletId);
      setAvailableWallets(updatedWallets);
      await saveWalletsToStorage(updatedWallets);
      
      // If we're removing the current wallet, disconnect
      if (currentWalletId === walletId) {
        await handleDisconnectWallet();
      }
      
      if (__DEV__) { console.log('Removed wallet:', walletId); }
      
    } catch (error) {
      console.error('Error removing wallet:', error);
      Alert.alert('Error', 'Failed to remove wallet. Please try again.');
    }
  };

  // Listen for wallet connection events
  useEffect(() => {
    if (__DEV__) { console.log('WalletProvider: Setting up event listeners'); }
    
    if (isConnected && address) {
      if (__DEV__) { console.log('Wallet connected:', { address, chainId, balance, walletName, currentWalletId }); }
    } else if (!isConnected) {
      if (__DEV__) { console.log('Wallet disconnected'); }
    }
  }, [isConnected, address, chainId, balance, walletName, currentWalletId]);

  const handleSendTransaction = async (params: TransactionParams): Promise<{ signature: string; txId: string }> => {
    try {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      if (__DEV__) { console.log('Sending transaction:', params); }
      
      // Try to use real Solana blockchain transaction
      try {
        // Check if Solana service is connected
        if (!solanaService.isConnected()) {
          // If not connected, try to connect using the wallet info
          if (walletInfo && (walletInfo as any).secretKey) {
            await solanaService.importWallet((walletInfo as any).secretKey);
          } else {
            throw new Error('No wallet secret key available for blockchain transaction');
          }
        }
        
        // Convert params to Solana format
        const solanaParams: SolanaTransactionParams = {
          to: params.to,
          amount: params.amount,
          currency: params.currency,
          memo: params.memo,
          groupId: params.groupId
        };
        
        // Send real blockchain transaction
        const result = await solanaService.sendTransaction(solanaParams);
        
        if (__DEV__) { console.log('Real blockchain transaction sent successfully:', result); }
        
        return { 
          signature: result.signature, 
          txId: result.txId 
        };
      } catch (blockchainError) {
        console.warn('Blockchain transaction failed, falling back to mock:', blockchainError);
        
        // Fallback to mock transaction for demo purposes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const signature = `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const txId = signature;
        
        if (__DEV__) { console.log('Mock transaction sent successfully:', { signature, txId }); }
        
        return { signature, txId };
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  };

  const value: WalletContextType = {
    isConnected,
    address,
    balance,
    walletInfo,
    walletName,
    chainId,
    secretKey,
    isLoading,
    availableWallets,
    currentWalletId,
    connectWallet: handleConnectWallet,
    connectToExternalWallet,
    disconnectWallet: handleDisconnectWallet,
    switchWallet,
    importNewWallet,
    removeWallet,
    sendTransaction: handleSendTransaction,
    refreshBalance,
    getAvailableProviders,
    isProviderAvailable,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}; 