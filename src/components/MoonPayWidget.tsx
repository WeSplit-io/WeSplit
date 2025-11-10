import React, { useState } from 'react';
import { View, Text, Alert, Clipboard, Linking, StyleSheet } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useWallet } from '../context/WalletContext';
import { firebaseMoonPayService } from '../services/integrations/external';
import { colors } from '../theme/colors';
import { logger } from '../services/core';
import CustomModal from './shared/Modal';
import { Input, Button } from './shared';

interface MoonPayWidgetProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  amount?: number;
  navigation?: NavigationContainerRef<Record<string, object | undefined>> | { navigate: (route: string, params?: object) => void };
}

const MoonPayWidget: React.FC<MoonPayWidgetProps> = ({
  isVisible,
  onClose,
  onError,
  amount: initialAmount,
  navigation
}) => {
  const { state } = useApp();
  const { appWalletAddress } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState(initialAmount?.toString() || '100');

  const handleOpenMoonPay = async () => {
    try {
      setIsLoading(true);
      logger.info('Opening purchase flow', null, 'MoonPayWidget');
      
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Verify app wallet is available and log details
      logger.info('App wallet verification', {
        appWalletAddress,
        appWalletConnected: !!appWalletAddress,
        addressLength: appWalletAddress?.length,
        addressFormat: appWalletAddress ? 'Solana (base58)' : 'Not available'
      });

      logger.debug('Config', {
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
        logger.info('App wallet address copied to clipboard', { appWalletAddress }, 'MoonPayWidget');
      } catch (clipboardError) {
        console.warn('🔍 MoonPay Widget: Failed to copy wallet address to clipboard:', clipboardError);
      }

      logger.info('Calling Firebase function with app wallet', {
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

      // Validate the response
      if (!moonpayResponse || !moonpayResponse.url) {
        throw new Error('Invalid response from MoonPay service');
      }

      logger.info('Created URL via Firebase', {
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

      // Open MoonPay URL directly without showing popup
      logger.info('Opening purchase URL', { url: moonpayResponse.url }, 'MoonPayWidget');
      
      if (navigation) {
        // Close the widget first to free up memory
        onClose();
        
        // Add a small delay to ensure the widget is closed before navigation
        setTimeout(() => {
          try {
            // Navigate to WebView screen with the MoonPay URL (without callback function)
            navigation.navigate('MoonPayWebView', {
              url: moonpayResponse.url,
              isAppWallet: true,
              userId: currentUser.id
            });
          } catch (navError) {
            console.error('🔍 MoonPayWidget: Navigation error:', navError);
            // Fallback to external browser if navigation fails
            Linking.openURL(moonpayResponse.url);
          }
        }, 100); // Small delay to ensure smooth transition
      } else {
        // Fallback: Open in external browser
        Linking.openURL(moonpayResponse.url);
        onClose();
      }

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
    <CustomModal
      visible={isVisible}
      onClose={handleClose}
      title="Deposit Crypto"
      description="Purchase USDC using your credit or debit card"
      showHandle={true}
      closeOnBackdrop={true}
    >
      <View style={styles.content}>
        <View style={styles.walletInfo}>
          <Input
            label="Wallet Address"
            value={appWalletAddress ? `${appWalletAddress.slice(0, 8)}...${appWalletAddress.slice(-8)}` : 'Not available'}
            editable={false}
            inputStyle={styles.walletAddressInput}
          />
        </View>

        <View style={styles.amountInput}>
          <Input
            label="Amount (USDC)"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>

        <Button
          title={isLoading ? 'Processing...' : `Purchase ${amount} USDC`}
          onPress={handleOpenMoonPay}
          variant="primary"
          disabled={isLoading}
          loading={isLoading}
          fullWidth={true}
          style={styles.purchaseButton}
        />

        <Text style={styles.disclaimer}>
          By proceeding, you agree to MoonPay&apos;s terms of service and privacy policy.
        </Text>
      </View>
    </CustomModal>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
  walletInfo: {
    width: '100%',
    marginBottom: 15,
  },
  walletAddressInput: {
    opacity: 0.7, // Indique visuellement que c'est en lecture seule
  },
  amountInput: {
    width: '100%',
    marginBottom: 25,
  },
  purchaseButton: {
    marginBottom: 10,
    width: '100%',
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