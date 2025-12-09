import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Image, Animated, PanResponder } from 'react-native';
import { Header } from '../../components/shared';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme';
import { styles } from './styles';
import { FeeService } from '../../config/constants/feeConfig';
import { logger } from '../../services/analytics/loggingService';

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
          if (onSlideComplete) {onSlideComplete();}
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
              outputRange: [colors.white5, colors.green],
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
    if (!appWalletConnected) {
      Alert.alert('App Wallet Error', 'Please ensure your app wallet is connected first');
      return;
    }

    if (!externalWalletConnected) {
      Alert.alert('External Wallet Error', 'Please connect your external wallet to receive the withdrawal');
      return;
    }

    if (appWalletBalance !== null && amount > appWalletBalance) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance in your app wallet to complete this withdrawal');
      return;
    }

    setSigning(true);
    
    try {
      let transactionResult;
      
      if (!appWalletConnected) {
        throw new Error('App wallet not connected. Please ensure your app wallet is properly initialized.');
      } else {
        // Send the actual withdrawal transaction from app wallet to external wallet
        logger.info('Sending from app wallet to external wallet', {
          from: appWalletAddress,
          to: externalWalletAddress || walletAddress,
          amount: safeTotalWithdraw
        });

        // Use consolidatedTransactionService directly with 'withdraw' transaction type
        // This ensures proper fee calculation and transaction type mapping
        const { consolidatedTransactionService } = await import('../../services/blockchain/transaction');
        
        // ✅ CRITICAL: Use production-aware timeout (120s for production mainnet, 90s otherwise)
        // Detect production using same logic as centralized components
        const buildProfile = process.env.EAS_BUILD_PROFILE;
        const appEnv = process.env.APP_ENV;
        const isProduction = buildProfile === 'production' || 
                            appEnv === 'production' ||
                            process.env.NODE_ENV === 'production' ||
                            !__DEV__;
        
        const networkEnv = process.env.EXPO_PUBLIC_NETWORK || process.env.EXPO_PUBLIC_DEV_NETWORK || '';
        const isMainnet = isProduction 
          ? true  // Production always mainnet
          : (networkEnv.toLowerCase() === 'mainnet');
        
        const timeoutMs = (isProduction && isMainnet) ? 120000 : 90000; // 120s for production mainnet, 90s otherwise
        
        const transactionPromise = consolidatedTransactionService.sendUSDCTransaction({
          to: externalWalletAddress || walletAddress, // Send to external wallet
          amount: safeTotalWithdraw, // Send the amount after fees
          currency: 'USDC',
          userId: currentUser.id.toString(),
          memo: description || 'Withdrawal from WeSplit app wallet',
          priority: 'medium',
          transactionType: 'withdraw' // Use 'withdraw' type for proper fee calculation and transaction saving
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Transaction timeout - please check transaction history')), timeoutMs);
        });
        
        try {
          transactionResult = await Promise.race([transactionPromise, timeoutPromise]);
        } catch (timeoutError) {
          // Timeout occurred - verify on-chain if transaction succeeded
          const isTimeout = timeoutError instanceof Error && 
            (timeoutError.message.includes('timeout') || timeoutError.message.includes('Transaction timeout'));
          
          if (isTimeout) {
            // ✅ CRITICAL: Timeout error - transaction may have succeeded
            const timeoutMessage = 'Transaction processing timed out. The transaction may have succeeded on the blockchain. Please check your transaction history before trying again.';
            logger.warn('Timeout detected, verifying withdrawal transaction on-chain', {
              to: externalWalletAddress || walletAddress,
              amount: safeTotalWithdraw,
              note: 'Transaction may have succeeded despite timeout'
            }, 'WithdrawConfirmationScreen');
            
            try {
              // Wait a moment for blockchain to update
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Check balances to verify transaction
              const recipientBalanceResult = await consolidatedTransactionService.getUsdcBalance(externalWalletAddress || walletAddress);
              const senderBalanceResult = await consolidatedTransactionService.getUserWalletBalance(currentUser.id);
              
              logger.info('On-chain balance verification after timeout', {
                recipientBalance: recipientBalanceResult.balance,
                senderBalance: senderBalanceResult.usdc,
                expectedAmount: safeTotalWithdraw,
                note: 'Checking if transaction actually succeeded despite timeout'
              }, 'WithdrawConfirmationScreen');
              
              // Try to get result from original promise if it completed
              try {
                transactionResult = await transactionPromise;
                if (transactionResult.success && transactionResult.signature) {
                  logger.info('Withdrawal transaction completed after timeout wrapper', {
                    success: transactionResult.success,
                    signature: transactionResult.signature
                  }, 'WithdrawConfirmationScreen');
                  // Continue with success handling below
                } else {
                  throw timeoutError; // Re-throw original timeout error
                }
              } catch (promiseError) {
                // Promise also failed - show timeout message with guidance
                logger.warn('Withdrawal transaction promise also failed after timeout', {
                  error: promiseError instanceof Error ? promiseError.message : String(promiseError)
                }, 'WithdrawConfirmationScreen');
                
                isProcessingRef.current = false;
                setSigning(false);
                
                Alert.alert(
                  'Transaction Processing',
                  'The withdrawal is being processed. It may have succeeded on the blockchain.\n\nPlease check your transaction history. If you don\'t see the transaction, wait a moment and try again.',
                  [
                    { text: 'Check History', onPress: () => { navigation.navigate('TransactionHistory'); } },
                    { text: 'OK', style: 'cancel', onPress: () => { } }
                  ]
                );
                return;
              }
            } catch (verificationError) {
              logger.warn('Failed to verify withdrawal transaction on-chain after timeout', {
                error: verificationError instanceof Error ? verificationError.message : String(verificationError)
              }, 'WithdrawConfirmationScreen');
              
              // Fallback to original timeout message if verification fails
              isProcessingRef.current = false;
              setSigning(false);
              
              Alert.alert(
                'Transaction Processing',
                'The withdrawal is being processed. It may have succeeded on the blockchain.\n\nPlease check your transaction history. If you don\'t see the transaction, wait a moment and try again.',
                [
                  { text: 'Check History', onPress: () => { navigation.navigate('TransactionHistory'); } },
                  { text: 'OK', style: 'cancel', onPress: () => { } }
                ]
              );
              return;
            }
          } else {
            // Not a timeout error - re-throw
            throw timeoutError;
          }
        }
      }

      // Check if transaction actually succeeded
      if (!transactionResult.success) {
        throw new Error(transactionResult.error || 'Transaction failed');
      }

      logger.info('Withdrawal transaction successful', { transactionResult }, 'WithdrawConfirmationScreen');
      
      // NOTE: Transaction is already saved by consolidatedTransactionService.sendUSDCTransaction
      // which uses the centralized saveTransactionAndAwardPoints helper.
      // No need to save again here - that would create duplicate transaction records.
      // The centralized helper handles:
      // - Transaction saving to Firestore
      // - Fee calculation consistency
      // - Point attribution (withdrawals don't award points, which is correct)
      
      logger.info('✅ Withdrawal transaction processed', {
        signature: transactionResult.signature,
        userId: currentUser.id,
        amount: amount,
        note: 'Transaction saved by centralized helper in consolidatedTransactionService'
      }, 'WithdrawConfirmationScreen');
      
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
      // ✅ CRITICAL: Always reset both ref and state
      isProcessingRef.current = false;
      setSigning(false);
    }
  };

  const formatWalletAddress = (address: string) => {
    if (!address) {return '';}
    if (address.length <= 8) {return address;}
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  // Check if user has sufficient balance
  const hasSufficientBalance = appWalletBalance === null || appWalletBalance >= amount;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header
        title="Withdraw"
        onBackPress={() => navigation.goBack()}
      />

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
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fusdc-logo-white.png?alt=media&token=fb534b70-6bb8-4803-8bea-e8e60b1cd0cc' }} style={{ width: 32, height: 32, marginRight: 8 }} />
            <Text style={styles.sentAmountValue}>{amount}</Text>
          </View>

        </View>

        {/* Transaction Details */}
        <View style={styles.mockupTransactionDetails}>
          <View style={styles.mockupFeeRow}>
            <Text style={styles.mockupFeeLabel}>Withdrawal fee ({FeeService.getCompanyFeeStructure('withdraw').percentage * 100}%)</Text>
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