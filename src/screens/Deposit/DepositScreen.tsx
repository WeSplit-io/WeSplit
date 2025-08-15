import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, Image } from 'react-native';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import MoonPayWidget from '../../components/MoonPayWidget';
import styles from './styles';

interface DepositParams {
  targetWallet?: {
    address: string;
    name: string;
    type: 'personal' | 'group';
  };
  groupId?: string;
  prefillAmount?: number;
  onSuccess?: () => void;
}

const DepositScreen: React.FC<any> = ({ navigation, route }) => {
  const { 
    // App wallet state (for deposits)
    appWalletAddress,
    appWalletConnected,
    // External wallet state (for fallback)
    address: externalWalletAddress 
  } = useWallet();
  const { state } = useApp();
  const { currentUser } = state;
  const [showMoonPayWidget, setShowMoonPayWidget] = useState(false);
  
  const params: DepositParams = route?.params || {};
  const isGroupWallet = params.targetWallet?.type === 'group';
  
  // Use target wallet if provided, otherwise use app wallet (not external wallet)
  const depositAddress = params.targetWallet?.address || 
                         appWalletAddress || 
                         currentUser?.wallet_address || 
                         externalWalletAddress;
  
  const walletName = params.targetWallet?.name || 'Your Wallet';

  const getHeaderTitle = () => {
    return 'Top Up';
  };

  const handleCreditDebitCard = () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'Please log in to fund your wallet.');
      return;
    }

    // Verify app wallet is available
    console.log('🔍 DepositScreen: Checking app wallet availability:', {
      appWalletAddress,
      appWalletConnected: !!appWalletAddress,
      currentUserWallet: currentUser?.wallet_address,
      depositAddress
    });

    if (!appWalletAddress) {
      Alert.alert(
        'App Wallet Not Available', 
        'Your app wallet is not initialized. Please ensure your app wallet is set up before funding.'
      );
      return;
    }

    if (!depositAddress) {
      Alert.alert('Error', 'No app wallet address available for funding. Please ensure your app wallet is initialized.');
      return;
    }

    // Verify we're using the app wallet (not external wallet)
    if (depositAddress !== appWalletAddress) {
      console.warn('🔍 DepositScreen: Warning - Using non-app wallet for deposit:', {
        appWalletAddress,
        depositAddress,
        isAppWallet: depositAddress === appWalletAddress
      });
    }

    console.log('🔍 DepositScreen: Opening MoonPay widget with app wallet:', {
      appWalletAddress,
      depositAddress,
      userId: currentUser.id
    });
    setShowMoonPayWidget(true);
  };

  const handleCryptoTransfer = () => {
    navigation.navigate('CryptoTransfer', {
      targetWallet: params.targetWallet,
      groupId: params.groupId,
      prefillAmount: params.prefillAmount,
      onSuccess: params.onSuccess
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            style={{ width: 24, height: 24 }}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.mainContent}>
        <Text style={styles.instructions}>
          Choose how you want to fund {isGroupWallet ? walletName : 'your wallet'}
        </Text>
        
        {/* Payment Method Selection */}
        <View style={styles.paymentMethodsContainer}>
          {/* Credit/Debit Card Option */}
          <TouchableOpacity 
            style={styles.paymentMethodCard}
            onPress={handleCreditDebitCard}
          >
           
              <Image
                source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftopup-img-card.png?alt=media&token=b362caf8-0072-4fd7-9542-4ee0751769ea' }}
                style={styles.paymentMethodIcon}
              />
        
            <Text style={styles.paymentMethodTitle}>Credit/Debit Card</Text>
            <Text style={styles.paymentMethodDescription}>
              Use your Visa or Mastercard to buy crypto via Moonpay
            </Text>
          </TouchableOpacity>



          {/* Crypto Transfer Option */}
          <TouchableOpacity 
            style={styles.paymentMethodCard}
            onPress={handleCryptoTransfer}
          >
            
              <Image
                source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftopup-img-wallet.png?alt=media&token=844d9b87-eb25-44ad-bc13-3ff85313cb50' }}
                style={styles.paymentMethodIcon}
              />
            
            <Text style={styles.paymentMethodTitle}>Crypto Transfer</Text>
            <Text style={styles.paymentMethodDescription}>
              Receive crypto from an external wallet
            </Text>
          </TouchableOpacity>
        </View>
        </View>
        
        {/* MoonPay Widget */}
        <MoonPayWidget
          isVisible={showMoonPayWidget}
          onClose={() => setShowMoonPayWidget(false)}
          onSuccess={() => {
            setShowMoonPayWidget(false);
            params.onSuccess?.();
          }}
          onError={(error) => {
            console.error('🔍 DepositScreen: MoonPay error:', error);
          }}
          amount={params.prefillAmount}
          navigation={navigation}
        />
      </View>
    </SafeAreaView>
  );
};

export default DepositScreen; 