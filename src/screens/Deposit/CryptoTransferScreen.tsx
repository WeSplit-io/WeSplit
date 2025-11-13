import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Share, Image, TextInput, ScrollView } from 'react-native';
import { Header } from '../../components/shared';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import QrCodeView from '../../services/core/QrCodeView';
import Icon from '../../components/Icon';
import { Clipboard } from 'react-native';
import styles from './styles';
import { colors } from '../../theme';
import { createUsdcRequestUri } from '../../services/core/solanaPay';
import { logger } from '../../services/analytics/loggingService';
import { Container, Button } from '../../components/shared';

interface CryptoTransferParams {
  targetWallet?: {
    address: string;
    name: string;
    type: 'personal' | 'group';
  };
  groupId?: string;
  prefillAmount?: number;
  onSuccess?: () => void;
}

const CryptoTransferScreen: React.FC<any> = ({ navigation, route }) => {
  const { 
    // External wallet state (for sending)
    isConnected: externalWalletConnected,
    address: externalWalletAddress,
    balance: externalWalletBalance,
    sendTransaction,
    // App wallet state (for receiving)
    appWalletAddress,
    appWalletBalance,
    appWalletConnected,
    ensureAppWallet
  } = useWallet();
  const { state } = useApp();
  const { currentUser } = state;

  const params: CryptoTransferParams = route?.params || {};
  const isGroupWallet = params.targetWallet?.type === 'group';

  // Use target wallet if provided, otherwise use user's app wallet
  const depositAddress = params.targetWallet?.address ||
    appWalletAddress ||
    currentUser?.wallet_address;

  const walletName = params.targetWallet?.name || 'Your App Wallet';

  // Ensure app wallet is initialized on mount
  useEffect(() => {
    if (currentUser?.id && !appWalletConnected) {
      ensureAppWallet(currentUser.id.toString());
    }
  }, [currentUser?.id, appWalletConnected, ensureAppWallet]);

  // Transfer state
  const [transferAmount, setTransferAmount] = useState(params.prefillAmount?.toString() || '');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleExternalWalletConnectionSuccess = (result: any) => {
    logger.info('External wallet connected successfully', { result }, 'CryptoTransferScreen');
    
    Alert.alert(
      'External Wallet Connected',
      `Successfully connected to your external wallet!\n\nYou can now transfer funds to your app wallet.`,
      [{ text: 'OK' }]
    );
  };

  const handleConnectExternalWallet = () => {
    navigation.navigate('ExternalWalletConnection', {
      onSuccess: handleExternalWalletConnectionSuccess
    });
  };

  const handleCopy = () => {
    if (depositAddress) {
      Clipboard.setString(depositAddress);
      Alert.alert('Copied', 'Wallet address copied to clipboard!');
    }
  };

  const handleShare = async () => {
    if (depositAddress) {
      try {
        await Share.share({
          message: `${isGroupWallet ? 'Our group' : 'My'} wallet address: ${depositAddress}`,
        });
      } catch (e) {
        Alert.alert('Error', 'Could not share wallet address.');
      }
    }
  };

  const handleTransferFromExternalWallet = async () => {
    if (!externalWalletConnected || !externalWalletAddress) {
      Alert.alert(
        'External Wallet Not Connected',
        'Please connect your external wallet (like Phantom) to transfer funds to your app wallet.'
      );
      return;
    }

    // If app wallet is not available, try to initialize it
    if (!appWalletAddress) {
      try {
        logger.info('App wallet not available, attempting to initialize...');
        await ensureAppWallet(currentUser.id.toString());
        
        // Check again after initialization attempt
        if (!appWalletAddress) {
          Alert.alert(
            'App Wallet Not Available',
            'Your app wallet is not initialized. Please ensure your app wallet is set up.'
          );
          return;
        }
      } catch (error) {
        logger.error('Failed to initialize app wallet', error);
        Alert.alert(
          'App Wallet Error',
          'Failed to initialize your app wallet. Please try again or contact support.'
        );
        return;
      }
    }

    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to transfer.');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (externalWalletBalance !== null && amount > externalWalletBalance) {
      Alert.alert(
        'Insufficient Balance',
        `Your external wallet only has ${externalWalletBalance.toFixed(4)} SOL. Please enter a smaller amount.`
      );
      return;
    }

    try {
      setIsTransferring(true);
      
      const result = await sendTransaction({
        to: appWalletAddress,
        amount: amount,
        currency: 'SOL'
      });

      // Check if result has success property or if it's a successful transaction
      if (result && result.signature) {
        // Save deposit transaction to database for history
        if (currentUser?.id) {
          try {
            // Use firebaseDataService.transaction instead of firebaseTransactionService
            const { firebaseDataService } = await import('../../services/data');
            
            const transactionData = {
              type: 'deposit' as const,
              amount: amount,
              currency: 'SOL',
              from_user: externalWalletAddress || 'External Wallet',
              to_user: currentUser.id.toString(),
              from_wallet: externalWalletAddress || '',
              to_wallet: appWalletAddress || '',
              tx_hash: result.signature,
              note: 'Deposit from external wallet',
              status: 'completed' as const,
              transaction_method: 'external_wallet' as const,
              recipient_name: currentUser.name || 'You',
              sender_name: 'External Wallet'
            };
            
            await firebaseDataService.transaction.createTransaction(transactionData);
            logger.info('✅ Deposit transaction saved to database', {
              signature: result.signature,
              amount: amount,
              currency: 'SOL'
            }, 'CryptoTransferScreen');
          } catch (saveError) {
            logger.error('❌ Failed to save deposit transaction to database', saveError, 'CryptoTransferScreen');
            // Don't fail the transaction if database save fails
          }
        }
        
        Alert.alert(
          'Transfer Successful',
          `Successfully transferred ${amount.toFixed(4)} SOL from your external wallet to your app wallet!`,
          [{ text: 'OK' }]
        );
        
        // Clear the amount field
        setTransferAmount('');
        
        // Call success callback if provided
        if (params.onSuccess) {
          params.onSuccess();
        }
      } else {
        Alert.alert('Transfer Failed', 'Failed to transfer funds.');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      Alert.alert(
        'Transfer Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred during transfer.'
      );
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDone = () => {
    navigation.goBack();
  };



  return (
    <Container>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Header
          title="Crypto Transfer"
          onBackPress={() => navigation.goBack()}
        />

        <View style={styles.content}>
          {/* External Wallet Section */}
          {/* {!externalWalletConnected && ( *
            <View style={styles.transferSection}>
              <Text style={styles.sectionTitle}>Connect External Wallet</Text>
              <Text style={styles.sectionDescription}>
                Connect your external wallet to transfer funds to your app wallet
              </Text>
              
              <TouchableOpacity
                style={styles.transferButton}
                onPress={handleConnectExternalWallet}
              >
                <Text style={styles.transferButtonText}>
                  Connect External Wallet
                </Text>
              </TouchableOpacity>
            </View>
          )} */}

          {/* Divider */}
          {externalWalletConnected && <View style={styles.divider} />}

          {/* QR Code Section for External Wallet Transfers */}
          <View style={styles.qrSection}>
            {/*<Text style={styles.sectionTitle}>External Wallet Transfer</Text>
            <Text style={styles.sectionDescription}>
              Share this QR code to trigger external wallet transfers (Phantom, Metamask, etc.) to your app wallet
            </Text>*/}
            
            {depositAddress ? (
              <View style={styles.qrContainer}>
                <QrCodeView
                  value={depositAddress}
                  address={depositAddress}
                  useSolanaPay={true}
                  amount={transferAmount ? parseFloat(transferAmount) : undefined}
                  label="WeSplit Deposit"
                  message={`Deposit to ${currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}`}
                  size={250}
                  color="#000"
                  caption="Scan to deposit USDC"
                  showButtons={true}
                />
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.errorText}>No wallet address found.</Text>
                <TouchableOpacity style={styles.createWalletBtn} onPress={() => navigation.navigate('Profile')}>
                  <Icon name="log-in" size={18} color="#A5EA15" />
                  <Text style={styles.createWalletText}>Import or Create Wallet</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          



          {/* Tip Section */}
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Tip</Text>
            <Text style={styles.tipText}>
              {isGroupWallet
                ? 'Only send USDC Solana-based to the shared group wallet.'
                : 'Only send USDC Solana-based to your app wallet.'
              }
            </Text>
          </View>
        </View>

        {/* Done Button */}
        <Button
          title="Done"
          onPress={handleDone}
          variant="primary"
          fullWidth={true}
        />
      </ScrollView>
    </Container>
  );
};

export default CryptoTransferScreen; 