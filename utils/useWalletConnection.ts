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
    walletName
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
    
    // Actions
    connectWallet: handleConnect,
    disconnectWallet: handleDisconnect,
    
    // Utilities
    getShortAddress,
    
    // Computed
    shortAddress: getShortAddress(address),
  };
}; 