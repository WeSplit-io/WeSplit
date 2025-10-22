import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';
import { spacing } from '../../theme/spacing';
import { FeeService, TransactionType } from '../../config/feeConfig';
import { logger } from '../../services/loggingService';

const WithdrawAmountScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const { 
    // External wallet state (for destination)
    isConnected: externalWalletConnected,
    address: externalWalletAddress, 
    // App wallet state (for sending)
    appWalletAddress,
    appWalletBalance,
    appWalletConnected,
    ensureAppWallet,
    getAppWalletBalance,
    isLoading: walletLoading
  } = useWallet();

  const amountInputRef = useRef<TextInput>(null);
  const [amount, setAmount] = useState('0');
  const [walletAddress, setWalletAddress] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [note, setNote] = useState('');

  // Check wallet connection on mount
  useEffect(() => {
    if (!appWalletConnected && !__DEV__) {
      Alert.alert(
        'App Wallet Not Connected',
        'Please connect your app wallet to withdraw funds.',
        [
          {
            text: 'Connect Wallet',
            onPress: () => {
              if (currentUser?.id) {
                ensureAppWallet(currentUser.id.toString());
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  }, [appWalletConnected, navigation]);

  const handlePercentagePress = (percentage: number) => {
    if (appWalletBalance !== null) {
      const calculatedAmount = (appWalletBalance * percentage) / 100;
      setAmount(calculatedAmount.toFixed(2));
    }
  };

  const handleMaxPress = () => {
    if (appWalletBalance !== null) {
      setAmount(appWalletBalance.toFixed(2));
    }
  };

  const handleSendToConnectedWallet = () => {
    if (externalWalletAddress) {
      setWalletAddress(externalWalletAddress);
    } else {
      Alert.alert('Error', 'No external wallet connected. Please connect your external wallet to receive the withdrawal.');
    }
  };

  const handleExternalWalletConnectionSuccess = (result: any) => {
    logger.info('External wallet connected successfully', { result }, 'WithdrawAmountScreen');
    
    Alert.alert(
      'External Wallet Connected',
      `Successfully connected to your external wallet!\n\nYou can now withdraw funds to your external wallet.`,
      [{ text: 'OK' }]
    );
  };

  const handleConnectExternalWallet = () => {
    navigation.navigate('ExternalWalletConnection', {
      onSuccess: handleExternalWalletConnectionSuccess
    });
  };

  // Function to format wallet address for display
  const formatWalletAddress = (address: string) => {
    if (!address) {return '';}
    if (address.length <= 10) {return address;}
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleContinue = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!walletAddress.trim()) {
      Alert.alert('Error', 'Please enter a destination wallet address');
      return;
    }

    if (appWalletBalance !== null && numAmount > appWalletBalance) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance to withdraw this amount');
      return;
    }

    // Calculate fees using centralized service
    const feeCalculation = FeeService.calculateCompanyFee(numAmount);
    const withdrawalFee = feeCalculation.fee;
    const totalWithdraw = feeCalculation.totalAmount; // User pays amount + fee

    navigation.navigate('WithdrawConfirmation', {
      amount: numAmount,
      withdrawalFee,
      totalWithdraw,
      walletAddress: walletAddress.trim(),
      description: note.trim(),
    });
  };

  const isAmountValid = parseFloat(amount) > 0 && walletAddress.trim() !== '';

  // Calculate fees using centralized service with transaction type
  const feeCalculation = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    return FeeService.calculateCompanyFee(numAmount, 'withdraw');
  }, [amount]);

  const withdrawalFee = feeCalculation.fee;
  const totalWithdraw = feeCalculation.totalAmount; // User pays amount + fee

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
          flexGrow: 1,
          minHeight: '100%'
        }}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        alwaysBounceVertical={true}
      >
          {/* Wallet Connection Status */}
          {!appWalletConnected && (
            <View style={styles.alertContainer}>
              <Icon name="alert-triangle" size={20} color="#FFF" />
              <Text style={styles.alertText}>
                App Wallet not connected
              </Text>
            </View>
          )}

          {/* Dev Mode Indicator - Hidden */}
          {false && __DEV__ && (
            <View style={styles.devAlertContainer}>
              <Icon name="code" size={20} color={colors.black} />
              <Text style={styles.devAlertText}>
                🧪 DEV MODE: Testing enabled
              </Text>
            </View>
          )}

          {/* Amount Section */}
          <View style={styles.amountSection}>
            <Text style={styles.sectionLabel}>
              Amount
            </Text>
            <TouchableOpacity 
              style={styles.amountInput}
              onPress={() => {
                // Focus the TextInput when the container is pressed
                if (amountInputRef.current) {
                  amountInputRef.current.focus();
                }
              }}
            >
              <TextInput
                ref={amountInputRef}
                style={styles.amountTextInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                autoFocus={false}
              />
              <Image
                source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fusdc-logo-white.png?alt=media&token=fb534b70-6bb8-4803-8bea-e8e60b1cd0cc' }}
                style={styles.usdcLogo}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.availableBalance}>
              Available in your app wallet: {appWalletBalance?.toFixed(2) || '0.00'} USDC
            </Text>
            
            {/* Quick Amount Buttons */}
            <View style={styles.quickAmountButtons}>
              <TouchableOpacity 
                style={styles.quickAmountButton}
                onPress={() => handlePercentagePress(25)}
              >
                <Text style={styles.quickAmountText}>25%</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAmountButton}
                onPress={() => handlePercentagePress(50)}
              >
                <Text style={styles.quickAmountText}>50%</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAmountButton}
                onPress={handleMaxPress}
              >
                <Text style={styles.quickAmountText}>Max</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Wallet Address Section */}
          <View style={styles.walletAddressSection}>
            <Text style={styles.sectionLabel}>
              Wallet Address
            </Text>
            <View style={styles.walletAddressInput}>
              <TextInput
                style={styles.walletAddressTextInput}
                placeholder="Enter address"
                placeholderTextColor={colors.white50}
                value={walletAddress}
                onChangeText={setWalletAddress}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={{ marginLeft: 8 }}>
                <Icon name="copy" size={20} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={{ marginLeft: 8 }}>
                <Icon name="camera" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
            
            {/* Send to Connected Wallet Button */}
            {appWalletConnected && appWalletAddress && (
              externalWalletConnected && externalWalletAddress ? (
                <TouchableOpacity 
                  style={styles.sendToConnectedWalletButton}
                  onPress={handleSendToConnectedWallet}
                >
                  <Icon name="send" size={16} color={colors.black} style={{ marginRight: 8 }} />
                  <Text style={styles.sendToConnectedWalletText}>
                    Send to External Wallet ({formatWalletAddress(externalWalletAddress)})
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.sendToConnectedWalletButton}
                  onPress={handleConnectExternalWallet}
                >
                  <Icon name="link" size={16} color={colors.black} style={{ marginRight: 8 }} />
                  <Text style={styles.sendToConnectedWalletText}>
                    Connect External Wallet
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Transaction Summary */}
          <View style={styles.transactionSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Transaction fee ({FeeService.getCompanyFeeStructure('withdraw').percentage * 100}%)
              </Text>
              <Text style={styles.summaryValue}>
                {withdrawalFee.toFixed(3)} USDC
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Total withdraw
              </Text>
              <Text style={styles.summaryValueBold}>
                {totalWithdraw.toFixed(3)} USDC
              </Text>
            </View>
          </View>

          {/* Dev Testing Section - Hidden */}
          {false && __DEV__ && (
            <View style={styles.devTestingSection}>
              <Text style={styles.devTestingTitle}>🧪 Dev Testing</Text>
              
              <View style={styles.devTestingRow}>
                <TouchableOpacity 
                  style={styles.devTestingButton}
                  onPress={() => setAmount('10')}
                >
                  <Text style={styles.devTestingButtonText}>Set $10</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.devTestingButton}
                  onPress={() => setAmount('50')}
                >
                  <Text style={styles.devTestingButtonText}>Set $50</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.devTestingButton}
                  onPress={() => setAmount('100')}
                >
                  <Text style={styles.devTestingButtonText}>Set $100</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.devTestingRow}>
                <TouchableOpacity 
                  style={styles.devTestingButton}
                  onPress={() => setWalletAddress('B3DR...gtd6')}
                >
                  <Text style={styles.devTestingButtonText}>Test Address 1</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.devTestingButton}
                  onPress={() => setWalletAddress('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM')}
                >
                  <Text style={styles.devTestingButtonText}>Test Address 2</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.devTestingRow}>
                <TouchableOpacity 
                  style={styles.devTestingButton}
                  onPress={() => {
                    setAmount('10');
                    setWalletAddress('B3DR...gtd6');
                  }}
                >
                  <Text style={styles.devTestingButtonText}>Quick Test Setup</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Spacer to ensure scrolling works */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Continue Button - Fixed at bottom */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              isAmountValid && styles.continueButtonActive,
            ]}
            onPress={handleContinue}
            disabled={!isAmountValid || (!appWalletConnected && !__DEV__)}
          >
            <Text style={[
              styles.continueButtonText,
              isAmountValid && styles.continueButtonTextActive,
            ]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
};

export default WithdrawAmountScreen; 