import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { Header } from '../../components/shared';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import MoonPayWidget from '../../components/MoonPayWidget';
import styles from './styles';
import { logger } from '../../services/analytics/loggingService';
import { Container } from '../../components/shared';

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
    ensureAppWallet,
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

  // Ensure app wallet is initialized on mount
  useEffect(() => {
    if (currentUser?.id && !appWalletConnected) {
      ensureAppWallet(currentUser.id.toString());
    }
  }, [currentUser?.id, appWalletConnected, ensureAppWallet]);

  const getHeaderTitle = () => {
    return 'Deposit';
  };

  const handleCreditDebitCard = async () => {
    // DISABLED FOR DEPLOYMENT - MoonPay funding temporarily unavailable
    Alert.alert(
      'Coming Soon',
      'Credit/Debit card funding via MoonPay is currently unavailable. This feature will be available in a future update. Please use Crypto Transfer to deposit funds.'
    );
    return;
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
    <Container>
      {/* Header */}
      <Header
        title={getHeaderTitle()}
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.content}>
        <View style={styles.mainContent}>
       
        
        {/* Payment Method Selection */}
        <View style={styles.paymentMethodsContainer}>
          {/* Credit/Debit Card Option - DISABLED FOR DEPLOYMENT */}
          <TouchableOpacity 
            style={[styles.paymentMethodCard, styles.paymentMethodCardDisabled]}
            onPress={handleCreditDebitCard}
            activeOpacity={0.7}
            disabled={true}
          >
            <Image
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftopup-img-card.png?alt=media&token=b362caf8-0072-4fd7-9542-4ee0751769ea' }}
              style={[styles.paymentMethodIcon, styles.paymentMethodIconDisabled]}
            />
            <Text style={[styles.paymentMethodTitle, styles.paymentMethodTitleDisabled]}>Credit/Debit Card</Text>
            <Text style={styles.paymentMethodDescription}>
              Coming soon - Feature in development
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
    </Container>
  );
};

export default DepositScreen; 