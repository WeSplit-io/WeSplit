import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, StyleSheet, TextInput, Clipboard, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { Animated } from 'react-native';
import { useApp } from '../context/AppContext';
import { useWallet } from '../context/WalletContext';
import { firebaseMoonPayService } from '../services/firebaseMoonPayService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface MoonPayWidgetProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  amount?: number;
  navigation?: any; // Add navigation prop for WebView navigation
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MoonPayWidget: React.FC<MoonPayWidgetProps> = ({
  isVisible,
  onClose,
  onSuccess,
  onError,
  amount: initialAmount,
  navigation
}) => {
  const { state } = useApp();
  const { appWalletAddress, getAppWalletBalance } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState(initialAmount?.toString() || '100');

  // Animation refs
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, state } = event.nativeEvent;

    if (state === 2) { // BEGAN
      // Reset opacity animation
      opacity.setValue(1);
    } else if (state === 4 || state === 5) { // END or CANCELLED
      if (translationY > 100) { // Threshold to close modal
        // Close modal
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
          // Reset values
          translateY.setValue(0);
          opacity.setValue(0);
        });
      } else {
        // Reset to original position
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // Animate in when modal becomes visible
  React.useEffect(() => {
    if (isVisible) {
      opacity.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const handleOpenMoonPay = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 MoonPay Widget: Opening purchase flow...');
      
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Verify app wallet is available and log details
      console.log('🔍 MoonPay Widget: App wallet verification:', {
        appWalletAddress,
        appWalletConnected: !!appWalletAddress,
        addressLength: appWalletAddress?.length,
        addressFormat: appWalletAddress ? 'Solana (base58)' : 'Not available'
      });

      console.log('🔍 MoonPay Widget: Config:', {
        amount: amountValue,
        walletAddress: appWalletAddress,
        currency: 'usdc_sol',
        userId: state.currentUser?.id
      });

      if (!appWalletAddress) {
        throw new Error('App wallet address not available. Please ensure your app wallet is initialized.');
      }

      // Validate Solana address format
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(appWalletAddress)) {
        throw new Error('Invalid app wallet address format. Please check your wallet configuration.');
      }

      const currentUser = state.currentUser;
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      // Copy app wallet address to clipboard for easy pasting in MoonPay
      try {
        await Clipboard.setString(appWalletAddress);
        console.log('🔍 MoonPay Widget: App wallet address copied to clipboard:', appWalletAddress);
      } catch (clipboardError) {
        console.warn('🔍 MoonPay Widget: Failed to copy wallet address to clipboard:', clipboardError);
      }

      console.log('🔍 MoonPay Widget: Calling Firebase function with app wallet:', {
        walletAddress: appWalletAddress,
        amount: amountValue,
        currency: 'usdc_sol',
        userId: currentUser.id
      });

      // Create MoonPay URL using Firebase Functions
      const moonpayResponse = await firebaseMoonPayService.createMoonPayURL(
        appWalletAddress,
        amountValue,
        'usdc_sol' // Use Solana USDC currency code
      );

      console.log('🔍 MoonPay Widget: Created URL via Firebase:', {
        url: moonpayResponse.url,
        walletAddress: moonpayResponse.walletAddress,
        currency: moonpayResponse.currency,
        amount: moonpayResponse.amount
      });

      // Verify the response contains the correct app wallet address
      if (moonpayResponse.walletAddress !== appWalletAddress) {
        console.warn('🔍 MoonPay Widget: Warning - Response wallet address differs from app wallet:', {
          expected: appWalletAddress,
          received: moonpayResponse.walletAddress
        });
      }

      // Show instructions to user before opening MoonPay
      Alert.alert(
        'Wallet Address Copied',
        `Your app wallet address has been copied to clipboard:\n\n${appWalletAddress}\n\nWhen MoonPay opens, you can paste this address into the wallet field if it's not pre-filled.`,
        [
          {
            text: 'Continue to MoonPay',
            onPress: () => {
              // Open MoonPay URL in WebView
              console.log('🔍 MoonPay Widget: Opening purchase URL:', moonpayResponse.url);
              
              if (navigation) {
                // Navigate to WebView screen with the MoonPay URL
                navigation.navigate('MoonPayWebView', {
                  url: moonpayResponse.url,
                  isAppWallet: true,
                  userId: currentUser.id,
                  onSuccess: () => {
                    console.log('🔍 MoonPay Widget: Purchase completed via WebView');
                    onSuccess?.();
                  }
                });
                onClose(); // Close the widget
              } else {
                // Fallback to alert if navigation is not available
                Alert.alert(
                  'MoonPay Purchase',
                  `Purchase ${amountValue} USDC for your app wallet?\n\nWallet: ${appWalletAddress.slice(0, 8)}...${appWalletAddress.slice(-8)}\n\nURL: ${moonpayResponse.url}`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Purchase', 
                      onPress: () => {
                        // Simulate successful purchase after delay
                        setTimeout(async () => {
                          try {
                            await getAppWalletBalance(currentUser.id.toString());
                            console.log('🔍 MoonPay Widget: Balance refreshed successfully');
                            onSuccess?.();
                          } catch (balanceError) {
                            console.error('🔍 MoonPay Widget: Error refreshing balance:', balanceError);
                          }
                        }, 3000);
                      }
                    }
                  ]
                );
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );

    } catch (error) {
      console.error('🔍 MoonPay Widget: Error opening purchase flow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError?.(errorMessage);
      Alert.alert('Error', `Failed to open MoonPay: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <Animated.View style={[styles.modalOverlay, { opacity }]}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            activeOpacity={1}
            onPress={handleClose}
          />
          
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleStateChange}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* Handle bar for slide down */}
              <View style={styles.handle} />

              {/* Title */}
              <Text style={styles.title}>Deposit Crypto</Text>

              <View style={styles.content}>
                <Text style={styles.description}>
                  Purchase USDC using your credit or debit card
                </Text>

                <View style={styles.walletInfo}>
                  <Text style={styles.walletLabel}>Wallet Address</Text>
                  <Text style={styles.input}>
                    {appWalletAddress ? `${appWalletAddress.slice(0, 8)}...${appWalletAddress.slice(-8)}` : 'Not available'}
                  </Text>
                </View>

                <View style={styles.amountInput}>
                  <Text style={styles.amountLabel}>Amount (USDC)</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.purchaseButton, isLoading && styles.purchaseButtonDisabled]}
                  onPress={handleOpenMoonPay}
                  disabled={isLoading}
                >
                  <Text style={styles.purchaseButtonText}>
                    {isLoading ? 'Processing...' : `Purchase ${amount} USDC`}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                  By proceeding, you agree to MoonPay's terms of service and privacy policy.
                </Text>
              </View>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.blackWhite5,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingTop: 16,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.white70,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  content: {
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.white70,
    textAlign: 'center',
    marginBottom: 25,
  },
  walletInfo: {
    width: '100%',
    marginBottom: 15,
  },
  walletLabel: {
    fontSize: 16,
    color: colors.white,
    marginBottom: 10,
  },
  walletAddress: {
    fontSize: 12,
    color: colors.white,
    backgroundColor: colors.white10,
    padding: 8,
    borderRadius: 4,
  },
  amountInput: {
    width: '100%',
    marginBottom: 25,
  },
  amountLabel: {
    fontSize: 16,
    color: colors.white,
    marginBottom: 10,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.white,
    backgroundColor: colors.white5,
  },
  purchaseButton: {
    backgroundColor: colors.green,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 10,
    width: '100%',
  },
  purchaseButtonDisabled: {
    backgroundColor: colors.white10,
  },
  purchaseButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 12,
    color: colors.white70,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
});

export default MoonPayWidget; 