/**
 * @deprecated This hook is deprecated and should no longer be used.
 * 
 * The wallet connection functionality has been migrated to use the WalletContext
 * directly in `src/context/WalletContext.tsx`.
 * 
 * Please use the useWallet() hook directly instead:
 * - import { useWallet } from '../src/context/WalletContext';
 * - const { connectWallet, disconnectWallet, isConnected, address, balance } = useWallet();
 * 
 * This hook is kept for backward compatibility but will be removed in a future version.
 */

import { useCallback } from 'react';
import { useWallet } from '../src/context/WalletContext';
import { Alert } from 'react-native';

export const useWalletConnection = () => {
  const { 
    isConnected, 
    address, 
    connectWallet, 
    disconnectWallet, 
    isLoading, 
    chainId,
    walletName,
    balance,
    refreshBalance
  } = useWallet();

  const handleConnect = useCallback(async () => {
    try {
      if (__DEV__) { console.log('useWalletConnection: Initiating wallet connection...'); }
      await connectWallet();
    } catch (error) {
      console.error('useWalletConnection: Connection failed:', error);
      // Error handling is already done in WalletContext
    }
  }, [connectWallet]);

  const handleDisconnect = useCallback(async () => {
    try {
      if (__DEV__) { console.log('useWalletConnection: Disconnecting wallet...'); }
      await disconnectWallet();
    } catch (error) {
      console.error('useWalletConnection: Disconnect failed:', error);
      Alert.alert('Error', 'Failed to disconnect wallet');
    }
  }, [disconnectWallet]);

  const getShortAddress = useCallback((address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  return {
    // State
    isConnected,
    address,
    isLoading,
    chainId,
    walletName,
    balance,
    
    // Actions
    connectWallet: handleConnect,
    disconnectWallet: handleDisconnect,
    refreshBalance,
    
    // Utilities
    getShortAddress,
    
    // Computed
    shortAddress: getShortAddress(address),
  };
}; 