  /**
 * Simplified Wallet Context for WeSplit
 * Clean, focused wallet state management
 * Keeps frontend interface intact while simplifying backend logic
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { walletService, walletExportService } from '../services/blockchain/wallet';
import { consolidatedTransactionService } from '../services/blockchain/transaction';
import { solanaWalletService } from '../services/blockchain/wallet';
import { logger } from '../services/analytics/loggingService';
import WalletRecoveryModal from '../components/wallet/WalletRecoveryModal';
import { getConfig } from '../config/unified';
import { useApp } from './AppContext';

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

// SECURITY: StoredWallet does NOT include secretKey
// Secret keys must NEVER be stored in AsyncStorage
// Only store non-sensitive wallet metadata
interface StoredWallet {
  id: string;
  name: string;
  address: string;
  // secretKey removed - must NEVER be stored in AsyncStorage
  // Secret keys should only be stored in SecureStore
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
  appWalletMnemonic: string | null;
  
  // Auto-refresh state
  autoRefreshEnabled: boolean;
  lastBalanceCheck: Date;
  
  // Wallet recovery state
  showRecoveryModal: boolean;
  recoveryUserId: string | null;
  recoveryExpectedAddress: string | null;
  
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
  hydrateAppWalletSecrets: (userId: string) => Promise<void>;
  
  // App Wallet Actions - Updated return type
  ensureAppWallet: (userId: string) => Promise<{ success: boolean; wallet?: any; error?: string }>;
  getAppWalletBalance: (userId: string) => Promise<number>;
  exportAppWallet: (userId: string) => Promise<{
    success: boolean;
    walletAddress?: string;
    seedPhrase?: string;
    privateKey?: string;
    exportType?: 'seed_phrase' | 'private_key' | 'both';
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
  
  // Wallet recovery actions
  showWalletRecovery: (userId: string, expectedAddress: string) => void;
  hideWalletRecovery: () => void;
  
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
  // Get app state for current user
  const { state } = useApp();
  
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
  const [appWalletMnemonic, setAppWalletMnemonic] = useState<string | null>(null);
  
  // Auto-refresh state for balances
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false); // Disabled by default to prevent rate limiting
  const [lastBalanceCheck, setLastBalanceCheck] = useState<Date>(new Date());
  const [balancePollingInterval, setBalancePollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  
  // Wallet recovery state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);
  const [recoveryExpectedAddress, setRecoveryExpectedAddress] = useState<string | null>(null);

  useEffect(() => {
    // WalletProvider mounted
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
        // SECURITY: StoredWallet does NOT include secretKey
        const testExternalWallet: StoredWallet = {
          id: 'test_external_wallet_001',
          name: 'Test Phantom Wallet',
          address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
          // secretKey removed - must NEVER be stored in AsyncStorage
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
        if (!state.currentUser?.id) {
          return;
        }
        const info = await walletService.getWalletInfo(state.currentUser.id);
        if (info) {
          setBalance(info.balance || null);
        }
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  const hydrateAppWalletSecrets = async (userId: string) => {
    try {
      const { walletService } = await import('../services/blockchain/wallet');
      const mnemonic = await walletService.getSeedPhrase(userId);
      if (mnemonic) {
        setAppWalletMnemonic(mnemonic);
      }
    } catch (error) {
      // ignore hydration failures
    }
  };

  // Connect to a specific wallet
  const connectToWallet = async (wallet: StoredWallet) => {
    try {
      setIsLoading(true);
      
      // Import the wallet using the AppKit service
      if (!state.currentUser?.id) {
        throw new Error('User ID is required');
      }
      const walletInfo = await walletService.getWalletInfo(state.currentUser.id);
      
      if (!walletInfo) {
        throw new Error('Failed to get wallet info');
      }
      
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
      const config = getConfig();
      setChainId(`solana:${config.blockchain.network}`);
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
        // solanaWalletService doesn't have importWallet, use loadWallet instead
        if (wallet.secretKey && state.currentUser?.id) {
          await solanaWalletService.loadWallet(state.currentUser.id, wallet.address);
        if (__DEV__) { logger.info('Solana blockchain service connected successfully', null, 'WalletContext'); }
        }
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
      // walletService doesn't have connectToProvider, use ensureUserWallet instead
      // const walletInfo = await walletService.connectToProvider(providerKey);
      // For now, return an error or use a different approach
      throw new Error('connectToProvider not implemented in walletService');
      
      // Code below is unreachable but kept for reference
      // if (walletInfo) {
      //   setIsConnected(true);
      //   setAddress(walletInfo.address);
      //   setBalance(walletInfo.balance || null);
      //   setWalletInfo({
      //     publicKey: walletInfo.publicKey as any,
      //     address: walletInfo.address,
      //     isConnected: true,
      //     balance: walletInfo.balance,
      //     walletName: walletInfo.walletName || 'External Wallet',
      //     walletType: walletInfo.walletType
      //   });
      //   setWalletName(walletInfo.walletName || 'External Wallet');
      // }
      const config = getConfig();
      setChainId(`solana:${config.blockchain.network}`);
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
    // walletService doesn't have getAvailableProviders, return empty array for now
    // return walletService.getAvailableProviders();
    return [];
  };

  // Check if a provider is available
  const isProviderAvailable = (providerKey: string) => {
    // Check if the provider is in the available providers list
    return availableWallets.some(wallet => wallet.name === providerKey);
  };

  const handleConnectWallet = async () => {
    try {
      if (__DEV__) { logger.info('WalletProvider: connectWallet called', null, 'WalletContext'); }
      setIsLoading(true);
      
      // If we have stored wallets, show selection
      if (availableWallets.length > 0) {
        // For now, connect to the first available wallet
        // In a real implementation, you'd show a wallet selection modal
        const wallet = availableWallets[0];
        if (wallet) {
          await connectToWallet(wallet);
        }
        return;
      }
      
      // Generate a new wallet if no stored wallets
      if (!state.currentUser?.id) {
        throw new Error('User not authenticated');
      }
      const createWalletResult = await walletService.ensureUserWallet(state.currentUser.id);
      // ensureUserWallet returns WalletCreationResult
      const wallet = createWalletResult.wallet;
      
      if (!wallet) {
        throw new Error('Failed to create wallet');
      }
      
      // Create a new stored wallet entry
      // SECURITY: Do NOT store secretKey in AsyncStorage
      // Secret keys must only be stored in SecureStore
      const newWallet: StoredWallet = {
        id: `wallet_${Date.now()}`,
        name: 'Generated Wallet',
        address: wallet.address,
        // secretKey removed - must NEVER be stored in AsyncStorage
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
      const config = getConfig();
      setChainId(`solana:${config.blockchain.network}`);
      setCurrentWalletId(newWallet.id);
      
      // Expose secret key if available
      if (wallet.secretKey) {
        setSecretKey(wallet.secretKey);
        
        // Try to connect the Solana service as well
        try {
          // solanaWalletService doesn't have importWallet, use loadWallet instead
          if (state.currentUser?.id) {
            await solanaWalletService.loadWallet(state.currentUser.id, wallet.address);
          if (__DEV__) { logger.info('Solana blockchain service connected successfully', null, 'WalletContext'); }
          }
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
      if (__DEV__) { logger.info('WalletProvider: disconnectWallet called', null, 'WalletContext'); }
      setIsLoading(true);
      
      // walletService doesn't have disconnect, clear state manually
      // await walletService.disconnect();
      
      // Also disconnect from Solana service and AppKit provider
      await solanaWalletService.clearWallet();
      // walletService doesn't have disconnect, clear state manually
      // await walletService.disconnect();
      
      if (__DEV__) { logger.info('Disconnecting wallet', null, 'WalletContext'); }
      setIsConnected(false);
      setAddress(null);
      setChainId(null);
      setBalance(null);
      setWalletInfo(null);
      setWalletName(null);
      setSecretKey(null);
      setCurrentWalletId(null);
      if (__DEV__) { logger.info('Wallet disconnected successfully', null, 'WalletContext'); }
      
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
      if (!state.currentUser?.id) {
        throw new Error('User not authenticated');
      }
      const walletInfo = await walletService.getWalletInfo(state.currentUser.id);
      
      if (!walletInfo) {
        throw new Error('Failed to get wallet info');
      }
      
      // Create new stored wallet entry
      // SECURITY: Do NOT store secretKey in AsyncStorage
      // Secret keys must only be stored in SecureStore
      const newWallet: StoredWallet = {
        id: `wallet_${Date.now()}`,
        name: name || 'Imported Wallet',
        address: walletInfo.address,
        // secretKey removed - must NEVER be stored in AsyncStorage
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
      
      if (__DEV__) { logger.info('Removed wallet', { walletId }, 'WalletContext'); }
      
    } catch (error) {
      console.error('Error removing wallet:', error);
      Alert.alert('Error', 'Failed to remove wallet. Please try again.');
    }
  };

  // App wallet methods
  const ensureAppWallet = async (userId: string): Promise<{ success: boolean; wallet?: any; error?: string }> => {
    try {
      console.log('🔍 WalletProvider: Starting ensureAppWallet...');
      // Import userWalletService to ensure app wallet
      const { walletService } = await import('../services/blockchain/wallet');
      console.log('🔍 WalletProvider: walletService imported:', !!walletService);
      console.log('🔍 WalletProvider: walletService.ensureUserWallet method:', typeof walletService?.ensureUserWallet);
      
      const walletResult = await walletService.ensureUserWallet(userId);
      
      if (walletResult.success && walletResult.wallet) {
        setAppWalletAddress(walletResult.wallet.address);
        setAppWalletConnected(true);
        return walletResult;
      } else {
        console.error('🔍 WalletProvider: Failed to ensure app wallet:', walletResult.error);
        setAppWalletConnected(false);
        
        // Check if this is a wallet data loss issue
        if (walletResult.error && walletResult.error.includes('mismatch')) {
          logger.warn('Wallet data loss detected, triggering recovery', { 
            userId, 
            error: walletResult.error 
          }, 'WalletContext');
          
          // Get the expected wallet address from database
          try {
            const { firebaseDataService } = await import('../services/data/firebaseDataService');
            const userData = await firebaseDataService.user.getCurrentUser(userId);
            
            if (userData?.wallet_address) {
              // Show wallet recovery modal
              showWalletRecovery(userId, userData.wallet_address);
            }
          } catch (error) {
            logger.error('Failed to get user data for recovery', error as Record<string, unknown>, 'WalletContext');
          }
        }
        return walletResult;
      }
    } catch (error) {
      console.error('🔍 WalletProvider: Error ensuring app wallet:', error);
      setAppWalletConnected(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  };

  const getAppWalletBalance = async (userId: string): Promise<number> => {
    try {
      // Import userWalletService to get app wallet balance
      const { walletService } = await import('../services/blockchain/wallet');
      const balance = await walletService.getUserWalletBalance(userId);
      
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
      // Use the consolidated wallet export service directly
      const result = await walletExportService.exportWallet(userId);
      
      if (result.success) {
        logger.info('Successfully exported app wallet', {
          walletAddress: result.walletAddress,
          hasSeedPhrase: !!result.seedPhrase,
          hasPrivateKey: !!result.privateKey,
          exportType: result.exportType
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
      const { walletService } = await import('../services/blockchain/wallet');
      // walletService doesn't have getWalletInfoForUser, use getWalletInfo instead
      const walletInfo = await walletService.getWalletInfo(userId);
      const result = walletInfo ? { success: true, walletAddress: walletInfo.address } : { success: false, walletAddress: undefined };
      
      if (result.success && result.walletAddress) {
        setAppWalletAddress(result.walletAddress);
        setAppWalletConnected(true);
        
        // Get balance separately
        const balance = await walletService.getUserWalletBalance(userId);
        setAppWalletBalance(balance?.totalUSD || 0);
      } else {
        console.error('🔍 WalletProvider: Failed to get app wallet info');
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
      const { walletService } = await import('../services/blockchain/wallet');
      // walletService doesn't have fixWalletMismatch, use ensureUserWallet instead
      const walletResult = await walletService.ensureUserWallet(userId);
      const result = walletResult.success && walletResult.wallet ? {
        success: true,
        wallet: {
          address: walletResult.wallet.address,
          publicKey: walletResult.wallet.publicKey,
          secretKey: walletResult.wallet.secretKey
        }
      } : { success: false, wallet: undefined };
      
      if (result.success && result.wallet) {
        setAppWalletAddress(result.wallet.address);
        setAppWalletConnected(true);
        
        logger.info('Successfully fixed wallet mismatch', {
          walletAddress: result.wallet.address
        });
      } else {
        console.error('🔍 WalletProvider: Failed to fix wallet mismatch');
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

  // Wallet recovery functions
  const showWalletRecovery = useCallback((userId: string, expectedAddress: string) => {
    setRecoveryUserId(userId);
    setRecoveryExpectedAddress(expectedAddress);
    setShowRecoveryModal(true);
    
    logger.info('Showing wallet recovery modal', { 
      userId, 
      expectedAddress 
    }, 'WalletContext');
  }, []);

  const hideWalletRecovery = useCallback(() => {
    setShowRecoveryModal(false);
    setRecoveryUserId(null);
    setRecoveryExpectedAddress(null);
    
    logger.info('Hiding wallet recovery modal', null, 'WalletContext');
  }, []);

  const handleRecoverySuccess = useCallback((wallet: {
    address: string;
    publicKey: string;
    privateKey: string;
    recoveryMethod: string;
  }) => {
    logger.info('Wallet recovery successful', {
      address: wallet.address,
      recoveryMethod: wallet.recoveryMethod
    }, 'WalletContext');
    
    // Update app wallet state
    setAppWalletAddress(wallet.address);
    setAppWalletConnected(true);
    
    // Hide recovery modal
    hideWalletRecovery();
    
    // Show success message
    Alert.alert(
      'Wallet Recovered! 🎉',
      `Your wallet has been successfully recovered using ${wallet.recoveryMethod}.`
    );
  }, [hideWalletRecovery]);

  const handleRecoveryFailed = useCallback((error: string) => {
    logger.error('Wallet recovery failed', { error }, 'WalletContext');
    
    // Hide recovery modal
    hideWalletRecovery();
    
    // Show error message
    Alert.alert(
      'Recovery Failed',
      `Unable to recover your wallet: ${error}\n\nPlease try manual recovery or contact support.`
    );
  }, [hideWalletRecovery]);

  // Auto-refresh balance functionality - DISABLED to prevent excessive calls
  const startBalancePolling = useCallback(async (userId: string) => {
    // DISABLED: Auto-refresh is causing excessive API calls
    // Balance updates are now handled by useWalletState hook and manual refresh
    logger.info('Balance polling disabled - using manual refresh only', { userId }, 'WalletContext');
    return;
  }, []);

  const stopBalancePolling = useCallback(() => {
    if (balancePollingInterval) {
      clearInterval(balancePollingInterval);
      setBalancePollingInterval(null);
      logger.info('Balance polling stopped', null, 'WalletContext');
    }
  }, [balancePollingInterval]);

  const toggleAutoRefresh = useCallback((enabled: boolean) => {
    setAutoRefreshEnabled(enabled);
    if (enabled) {
      logger.info('Auto-refresh enabled', null, 'WalletContext');
    } else {
      // Auto-refresh disabled
      stopBalancePolling();
    }
  }, [stopBalancePolling]);

  // Enhanced refresh balance method with auto-polling
  const enhancedRefreshBalance = useCallback(async () => {
    try {
      if (__DEV__) {
        logger.info('Manual balance refresh triggered', null, 'WalletContext');
      }
      
      // Refresh external wallet balance if connected
      if (isConnected && address) {
        await refreshBalance();
      }
      
      setLastBalanceCheck(new Date());
      
      if (__DEV__) {
        logger.info('Manual balance refresh completed', null, 'WalletContext');
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

      if (__DEV__) { logger.info('Sending transaction', { params }, 'WalletContext'); }
      
      // Try to use real Solana blockchain transaction
      try {
        // Check if Solana service is connected
        // solanaWalletService doesn't have getPublicKey or importWallet
        // Use loadWallet instead if needed
        if (walletInfo && (walletInfo as any).secretKey && state?.currentUser?.id) {
          try {
            await solanaWalletService.loadWallet(state.currentUser.id, walletInfo.address);
          } catch (loadError) {
            // If loadWallet fails, continue anyway
            logger.warn('Failed to load wallet in Solana service', { error: loadError }, 'WalletContext');
          }
          } else {
            throw new Error('No wallet secret key available for blockchain transaction');
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
        // consolidatedTransactionService doesn't have sendTransaction, use sendSolTransaction instead
        const result = await consolidatedTransactionService.sendSolTransaction({
          to: solanaParams.to,
          amount: solanaParams.amount,
          currency: solanaParams.currency as 'SOL' | 'USDC',
          memo: solanaParams.memo,
          userId: undefined // Will be set by the service
        });
        
        if (__DEV__) { logger.info('Real blockchain transaction sent successfully', { result }, 'WalletContext'); }
        
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
      if (__DEV__) { logger.info('Clearing wallet UI state for user logout (preserving wallet data)', null, 'WalletContext'); }
      
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
      
      if (__DEV__) { logger.info('Wallet UI state cleared for user logout (wallet data preserved)', null, 'WalletContext'); }
    } catch (error) {
      console.error('❌ Error clearing wallet state:', error);
    }
  }, [stopBalancePolling]);

  // Clear all wallet state when switching users (including wallet creation state)
  const clearAllWalletStateForUserSwitch = useCallback(() => {
    try {
      if (__DEV__) { logger.info('Clearing all wallet state for user switch', null, 'WalletContext'); }
      
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
      
      if (__DEV__) { logger.info('All wallet state cleared for user switch', null, 'WalletContext'); }
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
    appWalletMnemonic,
    // Auto-refresh state
    autoRefreshEnabled,
    lastBalanceCheck,
    // Wallet recovery state
    showRecoveryModal,
    recoveryUserId,
    recoveryExpectedAddress,
    // Actions
    connectWallet: handleConnectWallet,
    connectToExternalWallet,
    connectExternalWalletWithAuth: async (_providerName: string) => {
      try {
        setIsLoading(true);
        // walletService doesn't have connectToProvider, throw error for now
        // const result = await walletService.connectToProvider(providerName);
        throw new Error('connectToProvider not implemented in walletService');
        
        // Code below is unreachable but kept for reference
        // if (result.success && result.walletAddress) {
        //   setIsConnected(true);
        //   setAddress(result.walletAddress);
        //   setBalance(result.balance || null);
        //   setWalletInfo({
        //     publicKey: result.walletAddress, // Use address as public key for external wallets
        //     address: result.walletAddress,
        //     isConnected: true,
        //     balance: result.balance,
        //     walletName: result.walletName || 'External Wallet',
        //     walletType: 'external'
        //   });
        //   setWalletName(result.walletName || 'External Wallet');
        //   const config = getConfig();
        //   setChainId(`solana:${config.blockchain.network}`);
        //   setSecretKey(null); // External wallets don't expose secret keys
        //   setCurrentWalletId(`external_${providerName}`);
        //   await refreshBalance();
        // }
        // 
        // return result;
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
    hydrateAppWalletSecrets,
    // App wallet actions
    ensureAppWallet,
    getAppWalletBalance,
    exportAppWallet,
    getAppWalletInfo,
    fixAppWalletMismatch,
    // Wallet recovery actions
    showWalletRecovery,
    hideWalletRecovery,
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
    // Auto-refresh disabled to prevent rate limiting
    
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
      <WalletRecoveryModal
        visible={showRecoveryModal}
        userId={recoveryUserId || ''}
        expectedWalletAddress={recoveryExpectedAddress || ''}
        onRecoverySuccess={handleRecoverySuccess}
        onRecoveryFailed={handleRecoveryFailed}
        onClose={hideWalletRecovery}
      />
    </WalletContext.Provider>
  );
};