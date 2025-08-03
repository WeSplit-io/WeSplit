import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useWallet } from '../context/WalletContext';

interface WalletConnectButtonProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
  style?: any;
  textStyle?: any;
  showWalletName?: boolean;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  onConnect,
  onDisconnect,
  style,
  textStyle,
  showWalletName = true,
}) => {
  const {
    isConnected,
    address,
    walletName,
    isLoading,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const getShortAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const shortAddress = getShortAddress(address);

  const handlePress = async () => {
    if (isLoading) return;

    try {
      if (isConnected) {
        await disconnectWallet();
        onDisconnect?.();
      } else {
        await connectWallet();
        onConnect?.();
      }
    } catch (error) {
      console.error('Wallet button error:', error);
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return isConnected ? 'Disconnecting...' : 'Connecting...';
    }
    
    if (isConnected) {
      return showWalletName && walletName 
        ? `${walletName} (${shortAddress})`
        : shortAddress;
    }
    
    return 'Connect Wallet';
  };

  const getButtonStyle = () => {
    if (isLoading) {
      return [styles.button, styles.buttonLoading, style];
    }
    
    if (isConnected) {
      return [styles.button, styles.buttonConnected, style];
    }
    
    return [styles.button, styles.buttonDisconnected, style];
  };

  const getTextStyle = () => {
    if (isLoading) {
      return [styles.text, styles.textLoading, textStyle];
    }
    
    if (isConnected) {
      return [styles.text, styles.textConnected, textStyle];
    }
    
    return [styles.text, styles.textDisconnected, textStyle];
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      {isLoading && (
        <ActivityIndicator 
          size="small" 
          color={isConnected ? "#ffffff" : "#007AFF"} 
          style={styles.loader}
        />
      )}
      <Text style={getTextStyle()}>
        {getButtonText()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 48,
    minWidth: 140,
  },
  buttonDisconnected: {
    backgroundColor: '#007AFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonConnected: {
    backgroundColor: '#34C759',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  buttonLoading: {
    backgroundColor: '#E5E5EA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  textDisconnected: {
    color: '#FFFFFF',
  },
  textConnected: {
    color: '#FFFFFF',
  },
  textLoading: {
    color: '#8E8E93',
  },
  loader: {
    marginRight: 8,
  },
}); 