import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Share, SafeAreaView, Image, TextInput, ScrollView } from 'react-native';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import { QrCodeView } from '@features/qr';
import Icon from '../../components/Icon';
import { Clipboard } from 'react-native';
import styles from './styles';
import { colors } from '../../theme';
import { generateTransferLink } from '../../services/deepLinkHandler';

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
    console.log('🔐 CryptoTransfer: External wallet connected successfully:', result);
    
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
            <Icon name="arrow-left" size={24} color="#212121" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crypto Transfer</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* External Wallet Section */}
          {!externalWalletConnected && (
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
          )}

          {/* Divider */}
          {externalWalletConnected && <View style={styles.divider} />}

          {/* QR Code Section for External Wallet Transfers */}
          <View style={styles.qrSection}>
            <Text style={styles.sectionTitle}>External Wallet Transfer</Text>
            <Text style={styles.sectionDescription}>
              Share this QR code to trigger external wallet transfers (Phantom, Metamask, etc.) to your app wallet
            </Text>
            
            {depositAddress ? (
              <View style={styles.qrContainer}>
                <QrCodeView
                  value={depositAddress}
                  address={depositAddress}
                  useSolanaPay={true}
                  amount={transferAmount ? parseFloat(transferAmount) : undefined}
                  label="WeSplit Deposit"
                  message={`Deposit to ${currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}`}
                  size={200}
                  backgroundColor={colors.white}
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

          {/* Wallet Address Display */}
          {depositAddress && (
            <View style={styles.addressDisplay}>
              <Text style={styles.addressLabel}>App Wallet Address</Text>
              <Text style={styles.addressValue} numberOfLines={2} ellipsizeMode="middle">
                {depositAddress}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          {depositAddress && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
                <Icon name="copy" size={18} color="#212121" />
                <Text style={styles.actionButtonText}>Copy Address</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Icon name="share-2" size={18} color="#212121" />
                <Text style={styles.actionButtonText}>Share Address</Text>
              </TouchableOpacity>
            </View>
          )}



          {/* Tip Section */}
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Tip</Text>
            <Text style={styles.tipText}>
              {isGroupWallet
                ? 'Share this QR code to trigger external wallet transfers to the shared group wallet.'
                : 'Share this QR code to trigger external wallet transfers (Phantom, Metamask, etc.) to your app wallet. Only send Solana (SOL) or Solana-based tokens.'
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