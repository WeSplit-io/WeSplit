/**
 * Simplified Wallet Context for WeSplit
 * Clean, focused wallet state management
 * Keeps frontend interface intact while simplifying backend logic
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { consolidatedWalletService, TransactionParams as ConsolidatedTransactionParams, TransactionResult as ConsolidatedTransactionResult } from '../services/consolidatedWalletService';
import { consolidatedTransactionService } from '../services/consolidatedTransactionService';
import { solanaWalletService } from '../wallet/solanaWallet';

// WalletInfo interface for backward compatibility
interface WalletInfo {
  publicKey: any;
  address: string;
  isConnected: boolean;
  balance?: number;
  walletName?: string;
  secretKey?: string;
}

// External wallet authentication result interface
interface ExternalWalletAuthResult {
  success: boolean;
  walletAddress?: string;
  balance?: number;
  walletName?: string;
  error?: string;
}

// Solana transaction parameters interface
interface SolanaTransactionParams {
  to: string;
  amount: number;
  currency: string;
  memo?: string;
  groupId?: string;
}

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
  isConnected: boolean; // External wallet connection status
  address: string | null; // External wallet address
  balance: number | null; // External wallet balance
  walletInfo: ExtendedWalletInfo | null; // External wallet info
  walletName: string | null; // External wallet name
  chainId: string | null;
  secretKey: string | null;
  isLoading: boolean;
  availableWallets: StoredWallet[];
  currentWalletId: string | null;
  
  // App Wallet State (separate from external wallet)
  appWalletAddress: string | null;
  appWalletBalance: number | null;
  appWalletConnected: boolean;
  
  // Auto-refresh state
  autoRefreshEnabled: boolean;
  lastBalanceCheck: Date;
  
  // Actions
  connectWallet: () => Promise<void>; // Connect external wallet
  connectToExternalWallet: (providerKey: string) => Promise<void>;
  connectExternalWalletWithAuth: (providerName: string) => Promise<ExternalWalletAuthResult>; // New method
  disconnectWallet: () => Promise<void>; // Disconnect external wallet
  switchWallet: (walletId: string) => Promise<void>;
  importNewWallet: (secretKey: string, name?: string) => Promise<void>;
  removeWallet: (walletId: string) => Promise<void>;
  sendTransaction: (params: TransactionParams) => Promise<{ signature: string; txId: string }>;
  refreshBalance: () => Promise<void>;
  
  // App Wallet Actions
  ensureAppWallet: (userId: string) => Promise<void>;
  getAppWalletBalance: (userId: string) => Promise<number>;
  exportAppWallet: (userId: string) => Promise<{
    success: boolean;
    walletAddress?: string;
    seedPhrase?: string;
    privateKey?: string;
    error?: string;
  }>;
  getAppWalletInfo: (userId: string) => Promise<{
    success: boolean;
    walletAddress?: string;
    balance?: any;
    error?: string;
  }>;
  fixAppWalletMismatch: (userId: string) => Promise<{
    success: boolean;
    wallet?: {
      address: string;
      publicKey: string;
      secretKey?: string;
    };
    error?: string;
  }>;
  
  // Auto-refresh Actions
  startBalancePolling: (userId: string) => Promise<void>;
  stopBalancePolling: () => void;
  toggleAutoRefresh: (enabled: boolean) => void;
  
  // User switching
  clearAllWalletStateForUserSwitch: () => void;
  enhancedRefreshBalance: () => Promise<void>;
  
  // Provider methods
  getAvailableProviders: () => any[];
  isProviderAvailable: (providerKey: string) => boolean;
  
  // User logout cleanup
  clearAppWalletState: () => void; // Clear all wallet state for user logout
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
  // External wallet state
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
  
  // App Wallet State (separate from external wallet)
  const [appWalletAddress, setAppWalletAddress] = useState<string | null>(null);
  const [appWalletBalance, setAppWalletBalance] = useState<number | null>(null);
  const [appWalletConnected, setAppWalletConnected] = useState(false);
  
  // Auto-refresh state for balances
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false); // Disabled by default to prevent rate limiting
  const [lastBalanceCheck, setLastBalanceCheck] = useState<Date>(new Date());
  const [balancePollingInterval, setBalancePollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (__DEV__) { console.log('WalletProvider mounted successfully'); }
  }, [address, isConnected, chainId, balance, walletName, currentWalletId]);

  // Load stored wallets from AsyncStorage
  useEffect(() => {
    const loadStoredWallets = async () => {
      try {
        const stored = await AsyncStorage.getItem('storedWallets');
        let wallets: StoredWallet[] = [];
        
        if (stored) {
          wallets = JSON.parse(stored);
        }
        
        // Add test external wallet for design testing
        const testExternalWallet: StoredWallet = {
          id: 'test_external_wallet_001',
          name: 'Test Phantom Wallet',
          address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          secretKey: '', // External wallets don't expose secret keys
          isAppGenerated: false,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString()
        };
        
        // Check if test wallet already exists
        const testWalletExists = wallets.some(w => w.id === testExternalWallet.id);
        if (!testWalletExists) {
          wallets.push(testExternalWallet);
          await saveWalletsToStorage(wallets);
        }
        
        setAvailableWallets(wallets);
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
        const info = await consolidatedWalletService.getWalletInfo();
        setBalance(info.balance || null);
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  // Connect to a specific wallet
  const connectToWallet = async (wallet: StoredWallet) => {
    try {
      setIsLoading(true);
      
      // Import the wallet using the AppKit service
      const walletInfo = await consolidatedWalletService.getWalletInfo();
      
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
        await solanaWalletService.importWallet(wallet.secretKey);
        if (__DEV__) { console.log('Solana blockchain service connected successfully'); }
      } catch (solanaError) {
        console.warn('Failed to connect Solana blockchain service:', solanaError);
      }
      
      // Refresh balance after connecting
      await refreshBalance();
      
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
      const walletInfo = await consolidatedWalletService.connectToProvider(providerKey);
      
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
      
    } catch (error) {
      console.error('Error connecting to external wallet:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get available wallet providers
  const getAvailableProviders = () => {
    return consolidatedWalletService.getAvailableProviders();
  };

  // Check if a provider is available
  const isProviderAvailable = (providerKey: string) => {
    return true; // TODO: Implement provider availability check
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
      const createWalletResult = await consolidatedWalletService.getWalletInfo();
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
          await solanaWalletService.importWallet(wallet.secretKey);
          if (__DEV__) { console.log('Solana blockchain service connected successfully'); }
        } catch (solanaError) {
          console.warn('Failed to connect Solana blockchain service:', solanaError);
        }
      } else {
        setSecretKey(null);
      }
      
      // Refresh balance after connecting
      await refreshBalance();
      
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
      
      await consolidatedWalletService.disconnect();
      
      // Also disconnect from Solana service and AppKit provider
      await solanaWalletService.clearWallet();
      await consolidatedWalletService.disconnect();
      
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
      const walletInfo = await consolidatedWalletService.getWalletInfo();
      
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

  // App wallet methods
  const ensureAppWallet = async (userId: string) => {
    try {
      // Import userWalletService to ensure app wallet
      const { userWalletService } = await import('../services/userWalletService');
      const walletResult = await userWalletService.ensureUserWallet(userId);
      
      if (walletResult.success && walletResult.wallet) {
        setAppWalletAddress(walletResult.wallet.address);
        setAppWalletConnected(true);
      } else {
        console.error('🔍 WalletProvider: Failed to ensure app wallet:', walletResult.error);
        setAppWalletConnected(false);
      }
    } catch (error) {
      console.error('🔍 WalletProvider: Error ensuring app wallet:', error);
      setAppWalletConnected(false);
    }
  };

  const getAppWalletBalance = async (userId: string): Promise<number> => {
    try {
      // Import userWalletService to get app wallet balance
      const { userWalletService } = await import('../services/userWalletService');
      const balance = await userWalletService.getUserWalletBalance(userId);
      
      const totalUSD = balance?.totalUSD || 0;
      setAppWalletBalance(totalUSD);
      
      return totalUSD;
    } catch (error) {
      console.error('🔍 WalletProvider: Error getting app wallet balance:', error);
      return 0;
    }
  };

  const exportAppWallet = async (userId: string) => {
    try {
      // Import userWalletService to export app wallet
      const { userWalletService } = await import('../services/userWalletService');
      const result = await userWalletService.exportWallet(userId);
      
      if (result.success) {
        console.log('🔍 WalletProvider: Successfully exported app wallet:', {
          walletAddress: result.walletAddress,
          hasSeedPhrase: !!result.seedPhrase,
          hasPrivateKey: !!result.privateKey
        });
      } else {
        console.error('🔍 WalletProvider: Failed to export app wallet:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('🔍 WalletProvider: Error exporting app wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export wallet'
      };
    }
  };

  const getAppWalletInfo = async (userId: string) => {
    try {
      // Import userWalletService to get app wallet info
      const { userWalletService } = await import('../services/userWalletService');
      const result = await userWalletService.getWalletInfo(userId);
      
      if (result.success && result.walletAddress) {
        setAppWalletAddress(result.walletAddress);
        setAppWalletConnected(true);
        
        if (result.balance) {
          setAppWalletBalance(result.balance.totalUSD);
        }
      } else {
        console.error('🔍 WalletProvider: Failed to get app wallet info:', result.error);
        setAppWalletConnected(false);
      }
      
      return result;
    } catch (error) {
      console.error('🔍 WalletProvider: Error getting app wallet info:', error);
      setAppWalletConnected(false);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get wallet info'
      };
    }
  };

  const fixAppWalletMismatch = async (userId: string) => {
    try {
      // Import userWalletService to fix wallet mismatch
      const { userWalletService } = await import('../services/userWalletService');
      const result = await userWalletService.fixWalletMismatch(userId);
      
      if (result.success && result.wallet) {
        setAppWalletAddress(result.wallet.address);
        setAppWalletConnected(true);
        
        console.log('🔍 WalletProvider: Successfully fixed wallet mismatch:', {
          walletAddress: result.wallet.address
        });
      } else {
        console.error('🔍 WalletProvider: Failed to fix wallet mismatch:', result.error);
        setAppWalletConnected(false);
      }
      
      return result;
    } catch (error) {
      console.error('🔍 WalletProvider: Error fixing wallet mismatch:', error);
      setAppWalletConnected(false);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fix wallet mismatch'
      };
    }
  };

  // Auto-refresh balance functionality
  const startBalancePolling = useCallback(async (userId: string) => {
    if (!autoRefreshEnabled || balancePollingInterval) return;

    console.log('🔄 WalletProvider: Starting balance polling for user:', userId);
    
    const interval = setInterval(async () => {
      try {
        // Refresh app wallet balance
        if (appWalletConnected) {
          const { userWalletService } = await import('../services/userWalletService');
          const balance = await userWalletService.getUserWalletBalance(userId);
          
          if (balance) {
            setAppWalletBalance(balance.totalUSD);
          }
        }
        
        // Refresh external wallet balance if connected
        if (isConnected && address) {
          await refreshBalance();
        }
        
        setLastBalanceCheck(new Date());
        
      } catch (error) {
        // Handle rate limiting specifically
        if (error instanceof Error && error.message.includes('429')) {
          console.warn('🔄 WalletProvider: Rate limited, will retry later');
        } else {
          console.error('❌ WalletProvider: Error during auto-refresh:', error);
        }
      }
    }, 60000); // Check every 60 seconds to reduce rate limiting

    setBalancePollingInterval(interval);
  }, [autoRefreshEnabled, appWalletConnected, isConnected, address, appWalletBalance, appWalletAddress]);

  const stopBalancePolling = useCallback(() => {
    if (balancePollingInterval) {
      clearInterval(balancePollingInterval);
      setBalancePollingInterval(null);
      console.log('🛑 WalletProvider: Balance polling stopped');
    }
  }, [balancePollingInterval]);

  const toggleAutoRefresh = useCallback((enabled: boolean) => {
    setAutoRefreshEnabled(enabled);
    if (enabled) {
      console.log('✅ WalletProvider: Auto-refresh enabled');
    } else {
      console.log('❌ WalletProvider: Auto-refresh disabled');
      stopBalancePolling();
    }
  }, [stopBalancePolling]);

  // Enhanced refresh balance method with auto-polling
  const enhancedRefreshBalance = useCallback(async () => {
    try {
      if (__DEV__) {
        console.log('🔄 WalletProvider: Manual balance refresh triggered');
      }
      
      // Refresh external wallet balance if connected
      if (isConnected && address) {
        await refreshBalance();
      }
      
      setLastBalanceCheck(new Date());
      
      if (__DEV__) {
        console.log('✅ WalletProvider: Manual balance refresh completed');
      }
    } catch (error) {
      console.error('❌ WalletProvider: Error during manual balance refresh:', error);
    }
  }, [isConnected, address]);

  const handleSendTransaction = async (params: TransactionParams): Promise<{ signature: string; txId: string }> => {
    try {
      if (!isConnected || !address) {
        throw new Error('External wallet not connected');
      }

      if (__DEV__) { console.log('Sending transaction:', params); }
      
      // Try to use real Solana blockchain transaction
      try {
        // Check if Solana service is connected
        if (!solanaWalletService.getPublicKey()) {
          // If not connected, try to connect using the wallet info
          if (walletInfo && (walletInfo as any).secretKey) {
            await solanaWalletService.importWallet((walletInfo as any).secretKey);
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
        
        // Send real blockchain transaction using consolidated transaction service
        const result = await consolidatedTransactionService.sendTransaction({
          to: solanaParams.to,
          amount: solanaParams.amount,
          currency: solanaParams.currency as 'SOL' | 'USDC',
          memo: solanaParams.memo,
          userId: undefined // Will be set by the service
        });
        
        if (__DEV__) { console.log('Real blockchain transaction sent successfully:', result); }
        
        return { 
          signature: result.signature, 
          txId: result.txId 
        };
      } catch (blockchainError) {
        console.error('Blockchain transaction failed:', blockchainError);
        throw new Error(`Transaction failed: ${blockchainError instanceof Error ? blockchainError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  };

  // Clear all wallet state for user logout (but preserve wallet creation state)
  const clearAppWalletState = useCallback(() => {
    try {
      if (__DEV__) { console.log('🔄 WalletProvider: Clearing wallet UI state for user logout (preserving wallet data)'); }
      
      // Stop any active polling
      stopBalancePolling();
      
      // Clear external wallet state
      setIsConnected(false);
      setAddress(null);
      setBalance(null);
      setWalletInfo(null);
      setWalletName(null);
      setChainId(null);
      setSecretKey(null);
      setCurrentWalletId(null);
      
      // Clear app wallet UI state (but don't clear wallet creation state)
      setAppWalletAddress(null);
      setAppWalletBalance(null);
      setAppWalletConnected(false);
      
      // Clear auto-refresh state
      setAutoRefreshEnabled(false);
      setLastBalanceCheck(new Date());
      
      // Clear available wallets (user-specific)
      setAvailableWallets([]);
      
      // NOTE: We intentionally do NOT clear wallet creation state here
      // This allows the wallet to be restored when the user logs back in
      
      if (__DEV__) { console.log('✅ WalletProvider: Wallet UI state cleared for user logout (wallet data preserved)'); }
    } catch (error) {
      console.error('❌ Error clearing wallet state:', error);
    }
  }, [stopBalancePolling]);

  // Clear all wallet state when switching users (including wallet creation state)
  const clearAllWalletStateForUserSwitch = useCallback(() => {
    try {
      if (__DEV__) { console.log('🔄 WalletProvider: Clearing all wallet state for user switch'); }
      
      // Stop any active polling
      stopBalancePolling();
      
      // Clear external wallet state
      setIsConnected(false);
      setAddress(null);
      setBalance(null);
      setWalletInfo(null);
      setWalletName(null);
      setChainId(null);
      setSecretKey(null);
      setCurrentWalletId(null);
      
      // Clear app wallet state
      setAppWalletAddress(null);
      setAppWalletBalance(null);
      setAppWalletConnected(false);
      
      // Clear auto-refresh state
      setAutoRefreshEnabled(false);
      setLastBalanceCheck(new Date());
      
      // Clear available wallets (user-specific)
      setAvailableWallets([]);
      
      if (__DEV__) { console.log('✅ WalletProvider: All wallet state cleared for user switch'); }
    } catch (error) {
      console.error('❌ Error clearing wallet state for user switch:', error);
    }
  }, [stopBalancePolling]);

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
    // App wallet state
    appWalletAddress,
    appWalletBalance,
    appWalletConnected,
    // Auto-refresh state
    autoRefreshEnabled,
    lastBalanceCheck,
    // Actions
    connectWallet: handleConnectWallet,
    connectToExternalWallet,
    connectExternalWalletWithAuth: async (providerName: string) => {
      try {
        setIsLoading(true);
        const result = await consolidatedWalletService.connectToProvider(providerName);
        
        if (result.success && result.walletAddress) {
          setIsConnected(true);
          setAddress(result.walletAddress);
          setBalance(result.balance || null);
          setWalletInfo({
            publicKey: result.walletAddress, // Use address as public key for external wallets
            address: result.walletAddress,
            isConnected: true,
            balance: result.balance,
            walletName: result.walletName || 'External Wallet',
            walletType: 'external'
          });
          setWalletName(result.walletName || 'External Wallet');
          setChainId(process.env.NODE_ENV === 'production' ? 'solana:mainnet' : 'solana:devnet');
          setSecretKey(null); // External wallets don't expose secret keys
          setCurrentWalletId(`external_${providerName}`);
          await refreshBalance();
        }
        
        return result;
      } catch (error) {
        console.error('Error connecting external wallet with auth:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    disconnectWallet: handleDisconnectWallet,
    switchWallet,
    importNewWallet,
    removeWallet,
    sendTransaction: handleSendTransaction,
    refreshBalance,
    // App wallet actions
    ensureAppWallet,
    getAppWalletBalance,
    exportAppWallet,
    getAppWalletInfo,
    fixAppWalletMismatch,
    // Auto-refresh Actions
    startBalancePolling,
    stopBalancePolling,
    toggleAutoRefresh,
    enhancedRefreshBalance,
    
    // User switching
    clearAllWalletStateForUserSwitch,
    // Provider methods
    getAvailableProviders,
    isProviderAvailable,
    // User logout cleanup
    clearAppWalletState,
  };

  // Auto-refresh balance polling effects
  useEffect(() => {
    // Disabled automatic polling to prevent rate limiting and infinite loops
    // Users can manually refresh balances when needed
    console.log('🔄 WalletProvider: Auto-refresh disabled to prevent rate limiting');
    
    return () => {
      // Cleanup polling on unmount
      stopBalancePolling();
    };
  }, []); // Empty dependency array to run only once

  // Cleanup polling when wallet disconnects
  useEffect(() => {
    if (!appWalletConnected && !isConnected) {
      stopBalancePolling();
    }
  }, [appWalletConnected, isConnected, stopBalancePolling]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};