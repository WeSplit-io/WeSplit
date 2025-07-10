import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import Icon from '../../components/Icon';
import SlideButton from '../../components/SlideButton';
import { GroupMember, recordPersonalSettlement } from '../../services/groupService';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme';
import { styles } from './styles';

const SendConfirmationScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, amount, description, groupId, isSettlement } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  const { 
    sendTransaction, 
    isConnected, 
    address, 
    balance, 
    isLoading: walletLoading 
  } = useWallet();
  const [sending, setSending] = useState(false);

  const handleConfirmSend = async () => {
    if (!isConnected) {
      Alert.alert('Wallet Error', 'Please connect your wallet first');
      return;
    }

    if (!contact?.wallet_address) {
      Alert.alert('Error', 'Recipient wallet address is missing');
      return;
    }

    if (balance !== null && balance < totalAmount) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance to complete this transaction');
      return;
    }

    setSending(true);
    
    try {
      // Send the actual transaction using wallet context
      const transactionResult = await sendTransaction({
        to: contact.wallet_address,
        amount: amount,
        currency: 'USDC',
        memo: description || (isSettlement ? 'Settlement payment' : 'Payment'),
        groupId: groupId?.toString()
      });

      console.log('Transaction successful:', transactionResult);
      
      // If this is a settlement payment, record the settlement
      if (isSettlement && currentUser?.id && groupId && contact?.id) {
        try {
          await recordPersonalSettlement(
            groupId.toString(),
            currentUser.id.toString(),
            contact.id.toString(),
            amount,
            'USDC'
          );
        } catch (settlementError) {
          console.error('Settlement processing error:', settlementError);
          // Continue to success screen even if settlement processing fails
          // The payment was successful, settlement tracking is secondary
        }
      }
      
      // Navigate to success screen with real transaction data
      navigation.navigate('SendSuccess', {
        contact,
        amount,
        description,
        groupId,
        isSettlement,
        transactionId: transactionResult.signature,
        txId: transactionResult.txId,
      });
    } catch (error) {
      console.error('Send error:', error);
      Alert.alert('Transaction Failed', error instanceof Error ? error.message : 'Failed to send money. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Calculate fees (these should be real fees from the wallet)
  const gasFees = 0.0013; // This should come from wallet estimation
  const transactionFees = 0.03; // This should come from network fees
  const totalAmount = amount + gasFees + transactionFees;

  // Check if user has sufficient balance
  const hasSufficientBalance = balance === null || balance >= totalAmount;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSettlement ? 'Settlement Payment' : 'Send'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Wallet Connection Status */}
        {!isConnected && (
          <View style={styles.alertContainer}>
            <Icon name="alert-triangle" size={20} color="#FFF" />
            <Text style={styles.alertText}>Wallet not connected</Text>
          </View>
        )}

        {/* Balance Warning */}
        {isConnected && !hasSufficientBalance && (
          <View style={styles.alertContainer}>
            <Icon name="alert-triangle" size={20} color="#FFF" />
            <Text style={styles.alertText}>
              Insufficient balance ({balance?.toFixed(4)} USDC available)
            </Text>
          </View>
        )}

        {/* Recipient Card */}
        <View style={styles.mockupRecipientCard}>
          <View style={styles.mockupRecipientAvatar}>
            <Text style={styles.mockupRecipientAvatarText}>
              {contact?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.mockupRecipientInfo}>
            <Text style={styles.mockupRecipientName}>{contact?.name || 'Unknown'}</Text>
            <Text style={styles.mockupRecipientEmail}>{contact?.email || ''}</Text>
            <Text style={styles.walletAddressText} numberOfLines={1} ellipsizeMode="middle">
              {contact?.wallet_address || 'No wallet address'}
            </Text>
          </View>
        </View>

        {/* Sent Amount */}
        <View style={[styles.sentAmountContainer, {
          alignItems: 'center',
          marginBottom: 32,
        }]}>
          <Text style={[styles.sentAmountLabel, styles.centeredAmountLabel]}>
            {isSettlement ? 'Settlement amount' : 'Sent amount'}
          </Text>
          <Text style={[styles.sentAmountValue, styles.largeAmountValue]}>{amount} USDC</Text>
          {isSettlement && (
            <Text style={styles.settlementInfoText}>
              Group expense settlement
            </Text>
          )}
        </View>

        {/* Transaction Details */}
        <View style={styles.mockupTransactionDetails}>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Gas fees</Text>
            <Text style={styles.mockupFeeValue}>{gasFees.toFixed(4)} USDC</Text>
          </View>
          
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Transaction fees</Text>
            <Text style={styles.mockupFeeValue}>{transactionFees.toFixed(2)} USDC</Text>
          </View>
          
          <View style={styles.mockupTotalRow}>
            <Text style={styles.mockupTotalLabel}>Total</Text>
            <Text style={styles.mockupTotalValue}>{totalAmount.toFixed(4)} USDC</Text>
          </View>
        </View>

        {/* Note */}
        {description && (
          <View style={styles.mockupNoteContainer}>
            <Text style={styles.mockupNoteText}>"{description}"</Text>
          </View>
        )}

        {/* Wallet Info */}
        <View style={styles.walletInfoContainer}>
          <Text style={styles.walletInfoText}>
            Double check the person you're sending money to!
          </Text>
          {isConnected && address && (
            <Text style={styles.walletFromText} numberOfLines={1} ellipsizeMode="middle">
              From: {address}
            </Text>
          )}
        </View>

        {/* Slide to Sign Transaction */}
        <SlideButton
          onSlideComplete={handleConfirmSend}
          text={isConnected ? "Slide to sign transaction" : "Connect wallet first"}
          disabled={sending || !isConnected || !hasSufficientBalance || walletLoading}
          loading={sending || walletLoading}
        />
      </View>
    </SafeAreaView>
  );
};

export default SendConfirmationScreen; 