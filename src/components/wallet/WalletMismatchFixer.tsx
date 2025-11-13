/**
 * Component to fix wallet mismatch issues
 * This component can be used to resolve the current wallet mismatch problem
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';

const WalletMismatchFixer: React.FC = () => {
  const { fixAppWalletMismatch, exportAppWallet } = useWallet();
  const { state } = useApp();
  const [loading, setLoading] = useState(false);

  const handleFixMismatch = async () => {
    if (!state.currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setLoading(true);
      
      const result = await fixAppWalletMismatch(state.currentUser.id.toString());
      
      if (result.success) {
        Alert.alert(
          'Wallet Fixed!', 
          `Your wallet has been fixed successfully.\n\nWallet Address: ${result.wallet?.address}\n\nYou can now export your wallet information.`,
          [
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        Alert.alert('Fix Failed', result.error || 'Failed to fix wallet mismatch');
      }
    } catch (error) {
      console.error('Error fixing wallet mismatch:', error);
      Alert.alert('Error', 'Failed to fix wallet mismatch');
    } finally {
      setLoading(false);
    }
  };

  const handleExportWallet = async () => {
    if (!state.currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setLoading(true);
      
      const result = await exportAppWallet(state.currentUser.id.toString());
      
      if (result.success) {
        const message = `Wallet Address: ${result.walletAddress}\n\n` +
          (result.seedPhrase ? `Seed Phrase: ${result.seedPhrase}\n\n` : '') +
          (result.privateKey ? `Private Key: ${result.privateKey}\n\n` : '') +
          `Export Type: ${result.exportType || 'both'}\n\n` +
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet Mismatch Fixer</Text>
      <Text style={styles.subtitle}>
        It looks like there&apos;s a mismatch between your stored wallet information. 
        This can happen when multiple wallet creation processes run simultaneously.
      </Text>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleFixMismatch}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Fix Wallet Mismatch</Text>
        )}
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
        <Text style={styles.infoTitle}>What this does:</Text>
        <Text style={styles.infoText}>
          • Analyzes your stored wallet credentials{'\n'}
          • Determines the correct wallet address{'\n'}
          • Updates Firebase with the correct information{'\n'}
          • Ensures your wallet is properly synchronized{'\n'}
          • Allows you to export your wallet information
        </Text>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>⚠️ Important:</Text>
        <Text style={styles.warningText}>
          This will fix the mismatch between your stored wallet information and ensure you have access to your funds. 
          After fixing, you&apos;ll be able to export your wallet information for backup.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
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
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#856404',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});

export default WalletMismatchFixer;
