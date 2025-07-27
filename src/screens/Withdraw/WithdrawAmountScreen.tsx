import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, Alert, ScrollView, Image } from 'react-native';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme';
import { styles } from './styles';

const WithdrawAmountScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const { 
    isConnected, 
    address, 
    balance, 
    isLoading: walletLoading,
    connectWallet
  } = useWallet();

  const amountInputRef = useRef<TextInput>(null);
  const [amount, setAmount] = useState('0');
  const [walletAddress, setWalletAddress] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [note, setNote] = useState('');

  // Check wallet connection on mount
  useEffect(() => {
    if (!isConnected && !__DEV__) {
      Alert.alert(
        'Wallet Not Connected',
        'Please connect your external wallet to withdraw funds.',
        [
          {
            text: 'Connect Wallet',
            onPress: () => {
              connectWallet();
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
  }, [isConnected, navigation]);

  const handlePercentagePress = (percentage: number) => {
    if (balance !== null) {
      const calculatedAmount = (balance * percentage) / 100;
      setAmount(calculatedAmount.toFixed(2));
    }
  };

  const handleMaxPress = () => {
    if (balance !== null) {
      setAmount(balance.toFixed(2));
    }
  };

  const handleSendToConnectedWallet = () => {
    if (address) {
      setWalletAddress(address);
    } else {
      Alert.alert('Error', 'No connected wallet address available');
    }
  };

  // Function to format wallet address for display
  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 10) return address;
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

    if (balance !== null && numAmount > balance) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance to withdraw this amount');
      return;
    }

    // Calculate fees (3% withdrawal fee)
    const withdrawalFee = numAmount * 0.03;
    const totalWithdraw = numAmount - withdrawalFee;

    navigation.navigate('WithdrawConfirmation', {
      amount: numAmount,
      withdrawalFee,
      totalWithdraw,
      walletAddress: walletAddress.trim(),
      description: note.trim(),
    });
  };

  const isAmountValid = parseFloat(amount) > 0 && walletAddress.trim() !== '';

  // Calculate fees
  const withdrawalFee = parseFloat(amount) * 0.03 || 0;
  const totalWithdraw = parseFloat(amount) - withdrawalFee || 0;

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
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.mainContainer}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Wallet Connection Status */}
          {!isConnected && (
            <View style={styles.alertContainer}>
              <Icon name="alert-triangle" size={20} color="#FFF" />
              <Text style={styles.alertText}>
                {__DEV__ ? 'Wallet not connected (DEV MODE - can still test)' : 'Wallet not connected'}
              </Text>
            </View>
          )}

          {/* Dev Mode Indicator */}
          {__DEV__ && (
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
                source={require('../../../assets/usdc-logo-white.png')}
                style={styles.usdcLogo}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.availableBalance}>
              Available in your balance: {balance?.toFixed(2) || '0.00'} USDC
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
            {isConnected && address && (
              <TouchableOpacity 
                style={styles.sendToConnectedWalletButton}
                onPress={handleSendToConnectedWallet}
              >
                <Icon name="send" size={16} color={colors.black} style={{ marginRight: 8 }} />
                <Text style={styles.sendToConnectedWalletText}>
                  Send to Connected Wallet ({formatWalletAddress(address)})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Transaction Summary */}
          <View style={styles.transactionSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Transaction fee (3%)
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

          {/* Dev Testing Section */}
          {__DEV__ && (
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
        </ScrollView>

        {/* Continue Button - Fixed at bottom */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              isAmountValid && styles.continueButtonActive,
            ]}
            onPress={handleContinue}
            disabled={!isAmountValid || (!isConnected && !__DEV__)}
          >
            <Text style={[
              styles.continueButtonText,
              isAmountValid && styles.continueButtonTextActive,
            ]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default WithdrawAmountScreen; 