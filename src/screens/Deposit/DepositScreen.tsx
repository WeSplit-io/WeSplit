import React from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, Image } from 'react-native';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import Icon from '../../components/Icon';
import { createMoonPayURL } from '../../services/moonpayService';
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
  const { address } = useWallet();
  const { state } = useApp();
  const { currentUser } = state;
  
  const params: DepositParams = route?.params || {};
  const isGroupWallet = params.targetWallet?.type === 'group';
  
  // Use target wallet if provided, otherwise use user's personal wallet
  const depositAddress = params.targetWallet?.address || 
                         currentUser?.wallet_address || 
                         address;
  
  const walletName = params.targetWallet?.name || 'Your Wallet';

  const getHeaderTitle = () => {
    return 'Top Up';
  };

  const handleCreditDebitCard = async () => {
    if (!depositAddress) {
      Alert.alert('Error', 'No wallet address available for funding.');
      return;
    }

    try {
      const amount = params.prefillAmount;
      const moonpayResponse = await createMoonPayURL(depositAddress, amount);
      
      // Navigate to MoonPay WebView
      navigation.navigate('MoonPayWebView', {
        url: moonpayResponse.url,
        targetWallet: params.targetWallet,
        onSuccess: params.onSuccess
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to open MoonPay. Please try again.');
    }
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
            source={require('../../../assets/arrow-left.png')}
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
                source={require('../../../assets/topup-img-card.png')}
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
                source={require('../../../assets/topup-img-wallet.png')}
                style={styles.paymentMethodIcon}
              />
            
            <Text style={styles.paymentMethodTitle}>Crypto Transfer</Text>
            <Text style={styles.paymentMethodDescription}>
              Receive crypto from an external wallet
            </Text>
          </TouchableOpacity>
        </View>
        </View>
        
       
      </View>
    </SafeAreaView>
  );
};

export default DepositScreen; 