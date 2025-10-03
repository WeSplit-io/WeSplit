import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert, ScrollView, Image, Animated, PanResponder } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { consolidatedTransactionService } from '../../services/consolidatedTransactionService';
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

  // Debug logging for slider props
  console.log('🔍 AppleSlider: Props debug:', {
    disabled,
    loading,
    text,
    onSlideComplete: !!onSlideComplete
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => {
      console.log('🔍 AppleSlider: onStartShouldSetPanResponder called, disabled:', disabled, 'loading:', loading);
      return !disabled && !loading;
    },
    onMoveShouldSetPanResponder: () => {
      console.log('🔍 AppleSlider: onMoveShouldSetPanResponder called, disabled:', disabled, 'loading:', loading);
      return !disabled && !loading;
    },
    onPanResponderGrant: () => {
      console.log('🔍 AppleSlider: onPanResponderGrant - slider activated');
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
          console.log('🔍 AppleSlider: Slide completed, calling onSlideComplete');
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
  const [sending, setSending] = useState(false);

  const handleConfirmSend = async () => {
    try {
      if (!currentUser?.id) {
        Alert.alert('Wallet Error', 'User not authenticated');
        return;
      }

      if (!contact?.wallet_address) {
        Alert.alert('Error', 'Recipient wallet address is missing');
        return;
      }

      // Check balance using existing wallet service - check total amount including fees
      const balance = await consolidatedTransactionService.getUserWalletBalance(currentUser.id);
      const totalAmountToPay = amount + (amount * 0.03); // Amount + 3% fee
      if (balance.usdc < totalAmountToPay) {
        Alert.alert('Insufficient Balance', `You do not have enough USDC balance. Required: ${totalAmountToPay.toFixed(2)} USDC (including fees), Available: ${balance.usdc.toFixed(2)} USDC`);
        return;
      }

      if (__DEV__) {
        console.log('💰 SendConfirmation: Balance check passed:', {
          amountToRecipient: amount,
          totalAmountToPay: totalAmountToPay,
          available: balance.usdc,
          remaining: balance.usdc - totalAmountToPay
        });
      }

      setSending(true);

      // Get fee estimate for display
      const feeEstimate = await consolidatedTransactionService.getTransactionFeeEstimate(amount, 'USDC', 'medium');
      
      console.log('💰 Transaction fee estimate:', feeEstimate);

      // Send transaction using existing wallet service
      const transactionResult = await consolidatedTransactionService.sendUsdcTransaction(
        contact.wallet_address,
        amount,
        currentUser.id,
        description || (isSettlement ? 'Settlement payment' : 'Payment'),
        groupId?.toString(),
        'medium'
      );

      console.log('✅ Transaction successful:', {
        signature: transactionResult.signature,
        txId: transactionResult.txId,
        companyFee: transactionResult.companyFee,
        netAmount: transactionResult.netAmount,
        blockchainFee: transactionResult.fee,
      });

      // If this is a settlement payment, record the settlement
      if (isSettlement && currentUser?.id && groupId && contact?.id) {
        try {
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
        companyFee: transactionResult.companyFee,
        netAmount: transactionResult.netAmount,
        blockchainFee: transactionResult.fee,
        fromNotification: route.params?.fromNotification,
        notificationId: route.params?.notificationId,
      });
    } catch (error) {
      console.error('Send error:', error);
      Alert.alert('Transaction Failed', error instanceof Error ? error.message : 'Failed to send money. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // State for fee calculation
  const [feeEstimate, setFeeEstimate] = useState<{
    companyFee: number;
    blockchainFee: number;
    totalFee: number;
    netAmount: number;
    totalAmount?: number;
  } | null>(null);

  // Calculate fees using existing wallet service - NEW APPROACH
  useEffect(() => {
    const calculateFees = async () => {
      try {
        if (amount > 0) {
          // Use the new fee calculation approach
          const feeCalculation = consolidatedTransactionService.calculateCompanyFee(amount);
          const blockchainFee = 0.00001; // Company covers blockchain fees
          
          setFeeEstimate({
            companyFee: feeCalculation.fee,
            blockchainFee: blockchainFee,
            totalFee: feeCalculation.fee + blockchainFee,
            netAmount: feeCalculation.recipientAmount, // Recipient gets full amount
            totalAmount: feeCalculation.totalAmount, // Sender pays amount + fees
          });
        }
      } catch (error) {
        console.error('Failed to calculate fee estimate:', error);
        // Fallback to new calculation approach
        const companyFee = amount * 0.03; // 3% company fee
        const blockchainFee = 0.00001;
        setFeeEstimate({
          companyFee: companyFee,
          blockchainFee: blockchainFee,
          totalFee: companyFee + blockchainFee,
          netAmount: amount, // Recipient gets full amount
          totalAmount: amount + companyFee, // Sender pays amount + fees
        });
      }
    };

    calculateFees();
  }, [amount]);

  // Use calculated fees or fallback - NEW APPROACH
  const companyFee = feeEstimate?.companyFee || amount * 0.03; // 3% company fee
  const blockchainFee = feeEstimate?.blockchainFee || 0.00001;
  const totalFee = feeEstimate?.totalFee || companyFee + blockchainFee;
  const netAmount = feeEstimate?.netAmount || amount; // Recipient gets full amount
  const totalAmount = feeEstimate?.totalAmount || amount + companyFee; // Sender pays amount + fees
  const destinationAccount = contact?.wallet_address || '';

  // Check if user has existing wallet and sufficient balance
  const [hasExistingWallet, setHasExistingWallet] = useState(false);
  const [existingWalletBalance, setExistingWalletBalance] = useState<{ sol: number; usdc: number } | null>(null);
  const [hasSufficientSol, setHasSufficientSol] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    const checkExistingWallet = async () => {
      if (!currentUser?.id) {
        setWalletLoading(false);
        return;
      }

      try {
        setWalletLoading(true);
        setWalletError(null);
        
        console.log('🔍 SendConfirmation: Starting wallet validation checks...');
        
        // Check wallet address
        const walletAddress = await consolidatedTransactionService.getUserWalletAddress(currentUser.id);
        console.log('🔍 SendConfirmation: Wallet address check result:', walletAddress);
        
        if (!walletAddress) {
          throw new Error('No wallet address found for user');
        }
        
        // Check balance
        const balance = await consolidatedTransactionService.getUserWalletBalance(currentUser.id);
        console.log('🔍 SendConfirmation: Balance check result:', balance);
        
        // Check SOL for gas
        const solCheck = await consolidatedTransactionService.hasSufficientSolForGas(currentUser.id);
        console.log('🔍 SendConfirmation: SOL check result:', solCheck);
        
        // Set states
        setHasExistingWallet(true);
        setExistingWalletBalance(balance);
        setHasSufficientSol(solCheck.hasSufficient);
        setWalletError(null);
        
        console.log('🔍 SendConfirmation: Wallet validation completed successfully:', {
          walletAddress,
          balance,
          hasWallet: true,
          solCheck
        });
        
      } catch (error) {
        console.error('🔍 SendConfirmation: Wallet validation failed:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown wallet error';
        setWalletError(errorMessage);
        setHasExistingWallet(false);
        setExistingWalletBalance(null);
        setHasSufficientSol(false);
        
        // Show user-friendly error message
        Alert.alert(
          'Wallet Error',
          `Unable to access your wallet: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
          [{ text: 'OK' }]
        );
      } finally {
        setWalletLoading(false);
      }
    };

    checkExistingWallet();
  }, [currentUser?.id]);

  // Check if user has sufficient balance using existing wallet balance - check total amount including fees
  const totalAmountToPay = amount + (amount * 0.03); // Amount + 3% fee
  const hasSufficientBalance = existingWalletBalance === null || existingWalletBalance.usdc >= totalAmountToPay;

  // Debug logging for slider state
  console.log('🔍 SendConfirmation: Slider state debug:', {
    sending,
    hasExistingWallet,
    hasSufficientBalance,
    hasSufficientSol,
    existingWalletBalance,
    amount,
    walletLoading,
    walletError,
    disabled: walletLoading || sending || !hasExistingWallet || !hasSufficientBalance || !hasSufficientSol || !!walletError
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
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
          paddingBottom: 150,
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
                          <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fusdc-logo-white.png?alt=media&token=fb534b70-6bb8-4803-8bea-e8e60b1cd0cc' }} style={{ width: 32, height: 32, marginRight: 8 }} />
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
            <Text style={styles.mockupFeeLabel}>Amount to recipient</Text>
            <Text style={styles.mockupFeeValue}>{netAmount.toFixed(2)} USDC</Text>
          </View>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Company fee ({consolidatedTransactionService.getCompanyFeeStructure().percentage * 100}%)</Text>
            <Text style={styles.mockupFeeValue}>{companyFee.toFixed(2)} USDC</Text>
          </View>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Blockchain fee (Company covered)</Text>
            <Text style={styles.mockupFeeValue}>Free</Text>
          </View>
          <View style={styles.mockupFeeRowSeparator} />
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Total you'll pay</Text>
            <Text style={[styles.mockupFeeValue, { color: colors.brandGreen, fontWeight: 'bold' }]}>{totalAmount.toFixed(2)} USDC</Text>
          </View>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Destination account</Text>
            <Text style={styles.mockupFeeValue}>{destinationAccount ? `${destinationAccount.substring(0, 4)}...${destinationAccount.slice(-4)}` : ''}</Text>
          </View>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Network</Text>
            <Text style={styles.mockupFeeValue}>Solana Mainnet (Helius)</Text>
          </View>
        </View>




      </ScrollView>
      {/* AppleSlider for confirmation */}
      <View style={styles.appleSliderContainerWrapper}>
        <Text style={styles.walletInfoText}>
          Double check the person you're sending money to!
        </Text>
        
        {/* Wallet Error Display */}
        {walletError && (
          <View style={{ 
            backgroundColor: '#FF5252', 
            padding: 12, 
            borderRadius: 8, 
            marginBottom: 16,
            marginHorizontal: 20
          }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
              ⚠️ Wallet Error
            </Text>
            <Text style={{ color: 'white', textAlign: 'center', marginTop: 4, fontSize: 12 }}>
              {walletError}
            </Text>
            <TouchableOpacity 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                padding: 8, 
                borderRadius: 4, 
                marginTop: 8 
              }}
              onPress={() => {
                setWalletError(null);
                // Retry wallet check
                const checkExistingWallet = async () => {
                  if (!currentUser?.id) return;
                  try {
                    setWalletLoading(true);
                    const walletAddress = await consolidatedTransactionService.getUserWalletAddress(currentUser.id);
                    const balance = await consolidatedTransactionService.getUserWalletBalance(currentUser.id);
                    const solCheck = await consolidatedTransactionService.hasSufficientSolForGas(currentUser.id);
                    
                    setHasExistingWallet(!!walletAddress);
                    setExistingWalletBalance(balance);
                    setHasSufficientSol(solCheck.hasSufficient);
                    setWalletError(null);
                  } catch (error) {
                    setWalletError(error instanceof Error ? error.message : 'Unknown error');
                  } finally {
                    setWalletLoading(false);
                  }
                };
                checkExistingWallet();
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Company Gas Coverage Info */}
        {hasExistingWallet && !walletError && (
          <View style={{ 
            backgroundColor: '#4CAF50', 
            padding: 12, 
            borderRadius: 8, 
            marginBottom: 16,
            marginHorizontal: 20
          }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
              🏦 Gas Fees Covered by Company
            </Text>
            <Text style={{ color: 'white', textAlign: 'center', marginTop: 4, fontSize: 12 }}>
              We cover all blockchain transaction fees for you
            </Text>
          </View>
        )}
        
        <AppleSlider
          onSlideComplete={handleConfirmSend}
          disabled={walletLoading || sending || !hasExistingWallet || !hasSufficientBalance || !hasSufficientSol || !!walletError}
          loading={walletLoading || sending}
          text={walletLoading ? "Loading wallet..." : walletError ? "Wallet Error" : "Sign transaction"}
        />
      </View>
    </SafeAreaView>
  );
};

export default SendConfirmationScreen; 