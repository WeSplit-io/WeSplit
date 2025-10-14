import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Share, Image, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import { QrCodeView } from '@features/qr';
import Icon from '../../components/Icon';
import { Clipboard } from 'react-native';
import styles from './styles';
import { colors } from '../../theme';
import { generateTransferLink } from '../../services/deepLinkHandler';
import { logger } from '../../services/loggingService';

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
    appWalletConnected
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

    if (!appWalletAddress) {
      Alert.alert(
        'App Wallet Not Available',
        'Your app wallet is not initialized. Please ensure your app wallet is set up.'
      );
      return;
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
            const { firebaseTransactionService } = await import('../../services/firebaseDataService');
            
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
            
            await firebaseTransactionService.createTransaction(transactionData);
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image source={require('../../../assets/chevron-left.png')} style={styles.iconWrapper} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crypto Transfer</Text>
          <View style={{ width: 24 }} />
        </View>

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
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CryptoTransferScreen; 