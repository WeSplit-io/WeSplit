import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, StatusBar } from 'react-native';
import { useWallet } from '../context/WalletContext';

const WelcomeScreen = ({ navigation }: any) => {
  const { isConnected, address, connectWallet } = useWallet();

  useEffect(() => {
    console.log('WelcomeScreen mounted successfully');
  }, []);

  const handleConnectWallet = async () => {
    try {
      console.log('Attempting to connect wallet...');
      await connectWallet();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };

  const handleCreatePool = () => {
    try {
      console.log('Navigating to CreatePool screen...');
      if (!isConnected) {
        Alert.alert('Wallet Required', 'Please connect your wallet first');
        return;
      }
      navigation.navigate('CreatePool');
    } catch (error) {
      console.error('Error navigating to CreatePool:', error);
      Alert.alert('Error', 'Failed to navigate to Create Pool');
    }
  };

  const handleViewDashboard = () => {
    try {
      console.log('Attempting to navigate to Dashboard...');
      navigation.navigate('Dashboard');
    } catch (error) {
      console.error('Error navigating to Dashboard:', error);
      Alert.alert('Error', 'Dashboard not available yet');
    }
  };

  const getShortAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>WeSplit</Text>
          <Text style={styles.subtitle}>Web3 Expense Sharing on Solana</Text>
          {isConnected && address && (
            <Text style={styles.walletAddress}>{getShortAddress(address)}</Text>
          )}
        </View>

        <View style={styles.actions}>
          {!isConnected ? (
            <View style={styles.connectState}>
              <Text style={styles.connectText}>Connect your wallet to start</Text>
              <TouchableOpacity style={styles.button} onPress={handleConnectWallet}>
                <Text style={styles.buttonText}>Connect Wallet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.connectedState}>
              <Text style={styles.connectedText}>Wallet Connected!</Text>
              <Text style={styles.walletInfo}>{getShortAddress(address)}</Text>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.button} onPress={handleViewDashboard}>
                  <Text style={styles.buttonText}>View Dashboard</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleCreatePool}>
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>Create Pool</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 14,
    color: '#007AFF',
    fontFamily: 'monospace',
    marginTop: 8,
  },
  actions: {
    width: '100%',
    maxWidth: 300,
  },
  connectState: {
    alignItems: 'center',
  },
  connectText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  connectedState: {
    alignItems: 'center',
  },
  connectedText: {
    fontSize: 20,
    color: '#28a745',
    fontWeight: '600',
    marginBottom: 8,
  },
  walletInfo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    fontFamily: 'monospace',
  },
  actionButtons: {
    width: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
});

export default WelcomeScreen; 