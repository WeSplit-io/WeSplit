import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert, ScrollView, Image, Animated, PanResponder } from 'react-native';
import Icon from '../../components/Icon';
import SlideButton from '../../components/SlideButton';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { GroupMember } from '../../types';
import { colors } from '../../theme';
import { styles } from './styles';

// --- AppleSlider adapted from WalletManagementScreen ---
interface AppleSliderProps {
  onSlideComplete: () => void;
  disabled: boolean;
  loading: boolean;
  text?: string;
}

const AppleSlider: React.FC<AppleSliderProps> = ({ onSlideComplete, disabled, loading, text = 'Sign transaction' }) => {
  const maxSlideDistance = 300;
  const sliderValue = useRef(new Animated.Value(0)).current;
  const [isSliderActive, setIsSliderActive] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !loading,
    onMoveShouldSetPanResponder: () => !disabled && !loading,
    onPanResponderGrant: () => {
      setIsSliderActive(true);
    },
    onPanResponderMove: (_, gestureState) => {
      const newValue = Math.max(0, Math.min(gestureState.dx, maxSlideDistance));
      sliderValue.setValue(newValue);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > maxSlideDistance * 0.6) {
        Animated.timing(sliderValue, {
          toValue: maxSlideDistance,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          if (onSlideComplete) onSlideComplete();
          setTimeout(() => {
            sliderValue.setValue(0);
            setIsSliderActive(false);
          }, 1000);
        });
      } else {
        Animated.timing(sliderValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setIsSliderActive(false);
        });
      }
    },
  });

  return (
    <View style={[styles.appleSliderContainer, disabled && { opacity: 0.5 }]} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.appleSliderTrack,
          {
            backgroundColor: sliderValue.interpolate({
              inputRange: [0, maxSlideDistance],
              outputRange: [colors.green10, colors.brandGreen],
            }),
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.appleSliderText,
            {
              color: sliderValue.interpolate({
                inputRange: [0, maxSlideDistance],
                outputRange: [colors.white50, colors.black],
              }),
            },
          ]}
        >
          {loading ? 'Signing...' : text}
        </Animated.Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.appleSliderThumb,
          {
            transform: [{ translateX: sliderValue }],
          },
        ]}
      >
        <Icon name="chevron-right" size={20} color={colors.black} />
      </Animated.View>
    </View>
  );
};
// --- End AppleSlider ---

const SendConfirmationScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, amount, description, groupId, isSettlement } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;

  // Debug logging to ensure contact data is passed correctly
  useEffect(() => {
    console.log('💰 SendConfirmation: Contact data received:', {
      name: contact?.name || 'No name',
      email: contact?.email,
      wallet: contact?.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'No wallet',
      fullWallet: contact?.wallet_address,
      id: contact?.id
    });
    console.log('💰 SendConfirmation: Transaction details:', {
      amount,
      description,
      groupId,
      isSettlement
    });
  }, [contact, amount, description, groupId, isSettlement]);
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

    if (balance !== null && balance < amount) {
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
          // Use hybrid service instead of direct service call
          const { firebaseDataService } = await import('../../services/firebaseDataService');
          await firebaseDataService.settlement.recordPersonalSettlement(
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
  const transactionFee = amount * 0.03; // 3% fee
  const totalSent = amount * 1.03; // montant entré + 3%
  const destinationAccount = contact?.wallet_address || '';
  const transactionId = 'ZIEZHFIZENBAO'; // Replace with real tx id if available

  // Check if user has sufficient balance
  const hasSufficientBalance = balance === null || balance >= amount;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSettlement ? 'Settlement Payment' : 'Send'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recipient Card */}
        <View style={styles.mockupRecipientCard}>
          <View style={styles.mockupRecipientAvatar}>
            <Text style={styles.mockupRecipientAvatarText}>
              {contact?.name ? contact.name.charAt(0).toUpperCase() : (contact?.wallet_address ? contact.wallet_address.substring(0, 1).toUpperCase() : 'U')}
            </Text>
          </View>
          <View style={styles.mockupRecipientInfo}>
            <Text style={styles.mockupRecipientName}>
              {contact?.name || (contact?.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'Unknown')}
            </Text>
            {contact?.wallet_address ? (
              <Text style={styles.walletAddressText} numberOfLines={1} ellipsizeMode="middle">
                {`${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.slice(-4)}`}
              </Text>
            ) : contact?.email ? (
              <Text style={styles.mockupRecipientEmail}>{contact.email}</Text>
            ) : null}
          </View>
        </View>

        {/* Sent Amount Card */}
        <View style={styles.sentAmountContainer}>
          <Text style={styles.sentAmountLabel}>Sent amount</Text>
          <View style={styles.sentAmountValueContainer}>
          <Image source={require('../../../assets/usdc-logo-white.png')} style={{ width: 32, height: 32, marginRight: 8 }} />
            <Text style={styles.sentAmountValue}>{amount}</Text>
          </View>
          {description && (
            <View style={[styles.mockupNoteContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }] }>
              <Icon name="message-circle" size={16} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.mockupNoteText}>{description}</Text>
            </View>
          )}
        </View>

        {/* Transaction Details Card (mockup style) */}
        <View style={styles.mockupTransactionDetails}>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Transaction fee (3%)</Text>
            <Text style={styles.mockupFeeValue}>{transactionFee.toFixed(2)} USDC</Text>
          </View>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Total sent</Text>
            <Text style={styles.mockupFeeValue}>{totalSent.toFixed(3)} USDC</Text>
          </View>
          <View style={styles.mockupFeeRowSeparator} />
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Destination account</Text>
            <Text style={styles.mockupFeeValue}>{destinationAccount ? `${destinationAccount.substring(0, 4)}...${destinationAccount.slice(-4)}` : ''}</Text>
          </View>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Transaction ID</Text>
            <Text style={styles.mockupFeeValue}>{transactionId}</Text>
          </View>
        </View>




      </ScrollView>
      {/* AppleSlider for confirmation */}
      <View style={styles.appleSliderContainerWrapper}>
        <Text style={styles.walletInfoText}>
          Double check the person you're sending money to!
        </Text>
        <AppleSlider
          onSlideComplete={handleConfirmSend}
          disabled={sending || !isConnected || !hasSufficientBalance || walletLoading}
          loading={sending || walletLoading}
          text="Sign transaction"
        />
      </View>
    </SafeAreaView>
  );
};

export default SendConfirmationScreen; 