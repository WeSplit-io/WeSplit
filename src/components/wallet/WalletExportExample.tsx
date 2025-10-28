/**
 * Example component showing how to export wallet information
 * This demonstrates the consolidated wallet export functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';

const WalletExportExample: React.FC = () => {
  const { exportAppWallet, getAppWalletInfo } = useWallet();
  const { state } = useApp();
  const [loading, setLoading] = useState(false);

  const handleExportWallet = async () => {
    if (!state.currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setLoading(true);
      
      const result = await exportAppWallet(state.currentUser.id.toString());
      
      if (result.success) {
        // Show wallet information to user
        const message = `Wallet Address: ${result.walletAddress}\n\n` +
          (result.seedPhrase ? `Seed Phrase: ${result.seedPhrase}\n\n` : '') +
          (result.privateKey ? `Private Key: ${result.privateKey}\n\n` : '') +
          `Export Type: ${result.exportType}\n\n` +
          '⚠️ IMPORTANT: Keep this information safe and never share it with anyone!';
        
        Alert.alert('Wallet Export', message, [
          { text: 'OK', style: 'default' }
        ]);
      } else {
        Alert.alert('Export Failed', result.error || 'Failed to export wallet');
      }
    } catch (error) {
      console.error('Error exporting wallet:', error);
      Alert.alert('Error', 'Failed to export wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleGetWalletInfo = async () => {
    if (!state.currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setLoading(true);
      
      const result = await getAppWalletInfo(state.currentUser.id.toString());
      
      if (result.success) {
        const message = `Wallet Address: ${result.walletAddress}\n\n` +
          `Balance: ${result.balance?.totalUSD || 0} USD\n` +
          `SOL: ${result.balance?.solBalance || 0}\n` +
          `USDC: ${result.balance?.usdcBalance || 0}`;
        
        Alert.alert('Wallet Information', message);
      } else {
        Alert.alert('Error', result.error || 'Failed to get wallet info');
      }
    } catch (error) {
      console.error('Error getting wallet info:', error);
      Alert.alert('Error', 'Failed to get wallet info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Wallet Management</Text>
        <Text style={styles.subtitle}>
          Your wallet is automatically created and preserved across sessions.
          You can export your wallet information to backup or use in external wallets.
        </Text>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleGetWalletInfo}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Get Wallet Info</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, loading && styles.buttonDisabled]}
          onPress={handleExportWallet}
          disabled={loading}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Export Wallet
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            • Your wallet is automatically created when you first sign in{'\n'}
            • The same wallet is preserved when you log out and log back in{'\n'}
            • Your seed phrase and private key are stored securely{'\n'}
            • You can export your wallet to use in external wallets{'\n'}
            • All transactions use your app's built-in wallet
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default WalletExportExample;
