import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert, ScrollView, Image, Animated, PanResponder } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme';
import { styles } from './styles';

// --- AppleSlider adapted from SendConfirmationScreen ---
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

const WithdrawConfirmationScreen: React.FC<any> = ({ navigation, route }) => {
  const { amount, withdrawalFee, totalWithdraw, walletAddress, description } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  const { 
    // External wallet state (for destination)
    isConnected: externalWalletConnected,
    address: externalWalletAddress, 
    balance: externalWalletBalance,
    // App wallet state (for sending)
    appWalletAddress,
    appWalletBalance,
    appWalletConnected,
    ensureAppWallet,
    getAppWalletBalance,
    sendTransaction,
    isLoading: walletLoading
  } = useWallet();
  
  const [signing, setSigning] = useState(false);

  // Generate transaction ID
  const transactionId = Math.random().toString(36).substring(2, 15).toUpperCase();

  // Ensure withdrawalFee and totalWithdraw have default values
  const safeWithdrawalFee = withdrawalFee || 0;
  const safeTotalWithdraw = totalWithdraw || 0;

  const handleSignTransaction = async () => {
    if (!appWalletConnected && !__DEV__) {
      Alert.alert('App Wallet Error', 'Please ensure your app wallet is connected first');
      return;
    }

    if (!externalWalletConnected && !__DEV__) {
      Alert.alert('External Wallet Error', 'Please connect your external wallet to receive the withdrawal');
      return;
    }

    if (appWalletBalance !== null && amount > appWalletBalance && !__DEV__) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance in your app wallet to complete this withdrawal');
      return;
    }

    setSigning(true);
    
    try {
      let transactionResult;
      
      if (__DEV__ && !appWalletConnected) {
        // Dev mode: Simulate transaction for testing
        console.log('🧪 DEV MODE: Simulating withdrawal transaction from app wallet to external wallet');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate 2 second delay
        
        transactionResult = {
          signature: `DEV_${transactionId}`,
          txId: `DEV_${transactionId}`
        };
      } else {
        // Send the actual withdrawal transaction from app wallet to external wallet
        console.log('🔍 WithdrawConfirmation: Sending from app wallet to external wallet:', {
          from: appWalletAddress,
          to: externalWalletAddress || walletAddress,
          amount: safeTotalWithdraw
        });

        transactionResult = await sendTransaction({
          to: externalWalletAddress || walletAddress, // Send to external wallet
          amount: safeTotalWithdraw, // Send the amount after fees
          currency: 'USDC',
          memo: description || 'Withdrawal from WeSplit app wallet'
        });
      }

      console.log('Withdrawal transaction successful:', transactionResult);
      
      // Navigate to success screen with transaction data
      navigation.navigate('WithdrawSuccess', {
        amount: safeTotalWithdraw,
        withdrawalFee: safeWithdrawalFee,
        totalWithdraw: safeTotalWithdraw,
        walletAddress: externalWalletAddress || walletAddress,
        description,
        transactionId: transactionResult.signature || transactionId,
        txId: transactionResult.txId || transactionId,
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

  // Check if user has sufficient balance
  const hasSufficientBalance = appWalletBalance === null || appWalletBalance >= amount;

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
        <Text style={styles.headerTitle}>Withdraw</Text>
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
        {/* Wallet Connection Status */}
        {!appWalletConnected && (
          <View style={styles.alertContainer}>
            <Icon name="alert-triangle" size={20} color="#FFF" />
            <Text style={styles.alertText}>
              {__DEV__ ? 'Wallet not connected (DEV MODE - can still test)' : 'Wallet not connected'}
            </Text>
          </View>
        )}

        {/* Dev Mode Indicator */}
        {__DEV__ && (
          <View style={styles.devAlertContainer}>
            <Icon name="code" size={20} color={colors.black} />
            <Text style={styles.devAlertText}>
              🧪 DEV MODE: Testing enabled
            </Text>
          </View>
        )}

        {/* Balance Warning */}
        {appWalletConnected && appWalletBalance !== null && amount > appWalletBalance && (
          <View style={styles.alertContainer}>
            <Icon name="alert-triangle" size={20} color="#FFF" />
            <Text style={styles.alertText}>
              Insufficient balance ({appWalletBalance.toFixed(4)} USDC available)
            </Text>
          </View>
        )}

        {/* Withdrawal Amount Display */}
        <View style={styles.sentAmountContainer}>
          <Text style={styles.sentAmountLabel}>Withdraw amount</Text>
          <View style={styles.sentAmountValueContainer}>
            <Image source={require('../../../assets/usdc-logo-white.png')} style={{ width: 32, height: 32, marginRight: 8 }} />
            <Text style={styles.sentAmountValue}>{amount}</Text>
          </View>

        </View>

        {/* Transaction Details */}
        <View style={styles.mockupTransactionDetails}>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Withdrawal fee (3%)</Text>
            <Text style={styles.mockupFeeValue}>{safeWithdrawalFee.toFixed(3)} USDC</Text>
          </View>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Total sent</Text>
            <Text style={styles.mockupFeeValue}>{safeTotalWithdraw.toFixed(3)} USDC</Text>
          </View>
          <View style={styles.mockupFeeRowSeparator} />
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Destination account</Text>
            <Text style={styles.mockupFeeValue}>{formatWalletAddress(walletAddress)}</Text>
          </View>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Transaction ID</Text>
            <Text style={styles.mockupFeeValue}>{transactionId}</Text>
          </View>
        </View>

        {/* Wallet Info */}
        {appWalletConnected && appWalletAddress && (
          <View style={styles.walletInfoContainer}>
            <Text style={styles.walletInfoText}>
              From App Wallet: {formatWalletAddress(appWalletAddress)}
            </Text>
            {externalWalletConnected && externalWalletAddress && (
              <Text style={styles.walletInfoText}>
                To External Wallet: {formatWalletAddress(externalWalletAddress)}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* AppleSlider for confirmation */}
      <View style={styles.appleSliderContainerWrapper}>
        <Text style={styles.walletInfoText}>
          Double check the person you're sending money to!
        </Text>
        <AppleSlider
          onSlideComplete={handleSignTransaction}
          disabled={signing || !appWalletConnected || !hasSufficientBalance || walletLoading}
          loading={signing || walletLoading}
          text="Sign transaction"
        />
      </View>
    </SafeAreaView>
  );
};

export default WithdrawConfirmationScreen; 