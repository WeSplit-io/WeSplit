import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useWalletConnection } from '../utils/useWalletConnection';

interface WalletConnectButtonProps {
  style?: any;
  textStyle?: any;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  style,
  textStyle,
  onConnect,
  onDisconnect,
}) => {
  const { isConnected, connectWallet, disconnectWallet, isLoading, shortAddress } = useWalletConnection();

  const handlePress = async () => {
    try {
      if (isConnected) {
        await disconnectWallet();
        onDisconnect?.();
      } else {
        await connectWallet();
        onConnect?.();
      }
    } catch (error) {
      console.error('Wallet button action failed:', error);
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return isConnected ? 'Disconnecting...' : 'Connecting...';
    }
    
    if (isConnected) {
      return `Disconnect (${shortAddress})`;
    }
    
    return 'Connect Wallet';
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isConnected ? styles.connectedButton : styles.connectButton,
        isLoading && styles.disabledButton,
        style,
      ]}
      onPress={handlePress}
      disabled={isLoading}
    >
      {isLoading && <ActivityIndicator size="small" color="white" style={styles.loader} />}
      <Text style={[styles.text, textStyle]}>
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
    minWidth: 150,
  },
  connectButton: {
    backgroundColor: '#007AFF',
  },
  connectedButton: {
    backgroundColor: '#28a745',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginRight: 8,
  },
}); 