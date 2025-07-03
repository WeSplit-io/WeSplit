import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
} from 'react-native';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { useWallet } from '../context/WalletContext';
import { formatCryptoAmount } from '../utils/cryptoUtils';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';

interface TransactionParams {
  type: 'payment' | 'settlement';
  recipient: {
    id: number;
    name: string;
    email: string;
    wallet_address: string;
  };
  amount: number;
  currency: string;
  groupId: string;
  onSuccess?: () => void;
}

const TransactionConfirmationScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const { isConnected, address, sendTransaction, walletName } = useWallet();
  const params: TransactionParams = route.params;

  const [customAmount, setCustomAmount] = useState(params.amount.toString());
  const [memo, setMemo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'confirm' | 'processing' | 'success' | 'error'>('confirm');
  const [errorMessage, setErrorMessage] = useState('');

  const handleConfirmTransaction = async () => {
    try {
      setProcessing(true);
      setStep('processing');

      const amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount');
      }

      // Validate wallet connection
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      // Check balance (simplified check - in real implementation you'd check actual balance)
      if (amount > 1000) { // Placeholder balance check
        throw new Error('Insufficient balance');
      }

      // Simulate transaction processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real implementation, this would:
      // 1. Create a Solana transaction
      // 2. Send USDC tokens to recipient's wallet
      // 3. Record the transaction in the backend
      // 4. Update group balances
      
      const transactionResult = await sendTransaction({
        to: params.recipient.wallet_address,
        amount: amount,
        currency: params.currency,
        memo: memo || `Payment to ${params.recipient.name}`,
        groupId: params.groupId
      });

      console.log('Transaction completed:', transactionResult);
      
      setStep('success');
      
      // Call success callback after a short delay
      setTimeout(() => {
        params.onSuccess?.();
        navigation.goBack();
      }, 2000);

    } catch (error) {
      console.error('Transaction failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
      setStep('error');
    } finally {
      setProcessing(false);
    }
  };

  const renderConfirmStep = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params.type === 'payment' ? 'Send Payment' : 'Settle Balance'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Recipient Info */}
        <View style={styles.recipientCard}>
          <View style={styles.recipientAvatar}>
            <Text style={styles.recipientAvatarText}>
              {params.recipient.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientName}>{params.recipient.name}</Text>
            <Text style={styles.recipientEmail}>{params.recipient.email}</Text>
            <Text style={styles.recipientWallet}>
              {params.recipient.wallet_address.slice(0, 8)}...{params.recipient.wallet_address.slice(-8)}
            </Text>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionTitle}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#A89B9B"
            />
            <Text style={styles.currencyLabel}>{params.currency}</Text>
          </View>
          <Text style={styles.amountUSD}>
            ≈ ${parseFloat(customAmount || '0').toFixed(2)} USD
          </Text>
        </View>

        {/* Memo Input */}
        <View style={styles.memoSection}>
          <Text style={styles.sectionTitle}>Memo (Optional)</Text>
          <TextInput
            style={styles.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder={`Payment to ${params.recipient.name}`}
            placeholderTextColor="#A89B9B"
            maxLength={100}
          />
        </View>

        {/* Wallet Info */}
        <View style={styles.walletInfo}>
          <Text style={styles.sectionTitle}>Paying From</Text>
          <View style={styles.walletCard}>
            <Icon name="wallet" size={20} color="#A5EA15" />
            <View style={styles.walletDetails}>
              <Text style={styles.walletName}>
                {walletName || 'App Wallet'}
              </Text>
              <Text style={styles.walletAddress}>
                {address?.slice(0, 8)}...{address?.slice(-8)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, processing && styles.confirmButtonDisabled]}
          onPress={handleConfirmTransaction}
          disabled={processing}
        >
          <Text style={styles.confirmButtonText}>
            Confirm Payment
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderProcessingStep = () => (
    <View style={styles.statusContainer}>
      <ActivityIndicator size="large" color="#A5EA15" />
      <Text style={styles.statusTitle}>Processing Transaction</Text>
      <Text style={styles.statusSubtitle}>
        Sending {formatCryptoAmount(parseFloat(customAmount), params.currency)} to {params.recipient.name}
      </Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.statusContainer}>
      <View style={styles.successIcon}>
        <Icon name="check" size={32} color="#FFF" />
      </View>
      <Text style={styles.statusTitle}>Payment Sent!</Text>
      <Text style={styles.statusSubtitle}>
        {formatCryptoAmount(parseFloat(customAmount), params.currency)} sent to {params.recipient.name}
      </Text>
    </View>
  );

  const renderErrorStep = () => (
    <View style={styles.statusContainer}>
      <View style={styles.errorIcon}>
        <Icon name="x" size={32} color="#FFF" />
      </View>
      <Text style={styles.statusTitle}>Transaction Failed</Text>
      <Text style={styles.statusSubtitle}>{errorMessage}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => setStep('confirm')}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {step === 'confirm' && renderConfirmStep()}
      {step === 'processing' && renderProcessingStep()}
      {step === 'success' && renderSuccessStep()}
      {step === 'error' && renderErrorStep()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  recipientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#A5EA15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  recipientAvatarText: {
    color: '#212121',
    fontSize: 20,
    fontWeight: 'bold',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipientEmail: {
    color: '#A89B9B',
    fontSize: 14,
    marginBottom: 4,
  },
  recipientWallet: {
    color: '#A5EA15',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  amountSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  amountInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  currencyLabel: {
    color: '#A5EA15',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  amountUSD: {
    color: '#A89B9B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  memoSection: {
    marginBottom: 24,
  },
  memoInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 16,
  },
  walletInfo: {
    marginBottom: 24,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  walletDetails: {
    marginLeft: 12,
  },
  walletName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  walletAddress: {
    color: '#A5EA15',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  confirmButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#212121',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statusTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusSubtitle: {
    color: '#A89B9B',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#A5EA15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF4D4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: '#A5EA15',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransactionConfirmationScreen; 