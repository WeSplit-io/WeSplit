import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme';
import { styles } from './styles';

const WithdrawConfirmationScreen: React.FC<any> = ({ navigation, route }) => {
  const { amount, withdrawalFee, totalWithdraw, walletAddress, description } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  const { 
    sendTransaction, 
    isConnected, 
    address, 
    balance, 
    isLoading: walletLoading,
    connectWallet
  } = useWallet();
  
  const [signing, setSigning] = useState(false);

  // Generate mock transaction data
  const transactionId = Math.random().toString(36).substring(2, 15).toUpperCase();
  const onchainId = Math.random().toString(36).substring(2, 15);

  const handleSignTransaction = async () => {
    if (!isConnected && !__DEV__) {
      Alert.alert('Wallet Error', 'Please connect your wallet first');
      return;
    }

    if (balance !== null && amount > balance && !__DEV__) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance to complete this withdrawal');
      return;
    }

    setSigning(true);
    
    try {
      let transactionResult;
      
      if (__DEV__ && !isConnected) {
        // Dev mode: Simulate transaction for testing
        console.log('🧪 DEV MODE: Simulating withdrawal transaction');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate 2 second delay
        
        transactionResult = {
          signature: `DEV_${transactionId}`,
          txId: `DEV_${onchainId}`
        };
      } else {
        // Send the actual withdrawal transaction using wallet context
        transactionResult = await sendTransaction({
          to: walletAddress,
          amount: totalWithdraw, // Send the amount after fees
          currency: 'USDC',
          memo: description || 'Withdrawal from WeSplit'
        });
      }

      console.log('Withdrawal transaction successful:', transactionResult);
      
      // Navigate to success screen with transaction data
      navigation.navigate('WithdrawSuccess', {
        amount: totalWithdraw,
        withdrawalFee,
        totalWithdraw,
        walletAddress,
        description,
        transactionId: transactionResult.signature || transactionId,
        onchainId: transactionResult.txId || onchainId,
      });
    } catch (error) {
      console.error('Withdrawal error:', error);
      Alert.alert('Transaction Failed', error instanceof Error ? error.message : 'Failed to process withdrawal. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 8) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Wallet Connection Status */}
        {!isConnected && (
          <View style={styles.alertContainer}>
            <Icon name="alert-triangle" size={20} color="#FFF" />
            <Text style={styles.alertText}>
              {__DEV__ ? 'Wallet not connected (DEV MODE - can still test)' : 'Wallet not connected'}
            </Text>
          </View>
        )}

        {/* Dev Mode Indicator */}
        {__DEV__ && (
          <View style={[styles.alertContainer, { backgroundColor: colors.brandGreen }]}>
            <Icon name="code" size={20} color={colors.black} />
            <Text style={[styles.alertText, { color: colors.black }]}>
              🧪 DEV MODE: Testing enabled
            </Text>
          </View>
        )}

        {/* Balance Warning */}
        {isConnected && balance !== null && amount > balance && (
          <View style={styles.alertContainer}>
            <Icon name="alert-triangle" size={20} color="#FFF" />
            <Text style={styles.alertText}>
              Insufficient balance ({balance.toFixed(4)} USDC available)
            </Text>
          </View>
        )}

        {/* Withdrawal Amount Display */}
        <View style={styles.withdrawalAmountDisplay}>
          <Text style={styles.withdrawalAmountLabel}>Withdraw amount</Text>
          <Text style={styles.withdrawalAmountValue}>{amount} USDC</Text>
        </View>

        {/* Transaction Details */}
        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Withdrawal fee (3%)</Text>
            <Text style={styles.detailValue}>{withdrawalFee.toFixed(3)} USDC</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total sent</Text>
            <Text style={styles.detailValue}>{totalWithdraw.toFixed(3)} USDC</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Destination account</Text>
            <Text style={styles.detailValue}>{formatWalletAddress(walletAddress)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>{transactionId}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Onchain ID</Text>
            <Text style={styles.detailValue}>{onchainId}</Text>
          </View>
        </View>

        {/* Warning Message */}
        <Text style={styles.warningMessage}>
          Double check the person you're sending money to!
        </Text>

        {/* Wallet Info */}
        {isConnected && address && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.warningMessage, { marginBottom: 8 }]}>
              From: {formatWalletAddress(address)}
            </Text>
          </View>
        )}

        {/* Sign Transaction Button */}
        <TouchableOpacity
          style={[
            styles.signTransactionButton,
            (!isConnected || signing || (balance !== null && amount > balance)) && { opacity: 0.5 }
          ]}
          onPress={handleSignTransaction}
          disabled={!isConnected || signing || (balance !== null && amount > balance)}
        >
          <Icon name="arrow-right" size={20} color={colors.textLight} />
          <Text style={styles.signTransactionButtonText}>
            {signing ? 'Signing...' : 'Sign transaction'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WithdrawConfirmationScreen; 