import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, StyleSheet, TextInput, Clipboard } from 'react-native';
import { useApp } from '../context/AppContext';
import { useWallet } from '../context/WalletContext';
import { firebaseMoonPayService } from '../services/firebaseMoonPayService';

interface MoonPayWidgetProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  amount?: number;
  navigation?: any; // Add navigation prop for WebView navigation
}

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
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Top Up Your Wallet</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>
              Purchase USDC using your credit or debit card
            </Text>

            <View style={styles.walletInfo}>
              <Text style={styles.walletLabel}>Wallet Address:</Text>
              <Text style={styles.walletAddress}>
                {appWalletAddress ? `${appWalletAddress.slice(0, 8)}...${appWalletAddress.slice(-8)}` : 'Not available'}
              </Text>
            </View>

            <View style={styles.amountInput}>
              <Text style={styles.amountLabel}>Amount (USDC):</Text>
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
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  walletInfo: {
    width: '100%',
    marginBottom: 15,
  },
  walletLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  walletAddress: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
  },
  amountInput: {
    width: '100%',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  purchaseButton: {
    backgroundColor: '#A5EA15',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default MoonPayWidget; 