import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, Alert, ScrollView } from 'react-native';
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

  const [amount, setAmount] = useState('0');
  const [walletAddress, setWalletAddress] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [note, setNote] = useState('');

  // Dev testing: Pre-fill with your wallet address for testing
  useEffect(() => {
    if (__DEV__ && !walletAddress) {
      // You can replace this with your actual test wallet address
      setWalletAddress('B3DR...gtd6'); // Example address from the design
    }
  }, [walletAddress]);

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

  const handleNumberPress = (num: string) => {
    if (amount === '0') {
      setAmount(num);
    } else {
      setAmount((prev: string) => prev + num);
    }
  };

  const handleBackspace = () => {
    if (amount.length === 1) {
      setAmount('0');
    } else {
      setAmount((prev: string) => prev.slice(0, -1));
    }
  };

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

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'backspace']
    ];

    return (
      <View style={[styles.numberPad, { flex: 0 }]}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberPadRow}>
            {row.map((item, itemIndex) => {
              if (item === '') {
                return <View key={itemIndex} style={[styles.numberPadButton, { width: 60, height: 60 }]} />;
              }
              
              if (item === 'backspace') {
                return (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[styles.numberPadButton, { width: 60, height: 60 }]}
                    onPress={handleBackspace}
                  >
                    <Icon name="delete" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={[styles.numberPadButton, { width: 60, height: 60 }]}
                  onPress={() => handleNumberPress(item)}
                >
                  <Text style={[styles.numberPadText, { fontSize: 18 }]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const isAmountValid = parseFloat(amount) > 0 && walletAddress.trim() !== '';

  // Calculate fees
  const withdrawalFee = parseFloat(amount) * 0.03;
  const totalWithdraw = parseFloat(amount) - withdrawalFee;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
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
          <View style={[styles.alertContainer, { backgroundColor: colors.brandGreen }]}>
            <Icon name="code" size={20} color={colors.black} />
            <Text style={[styles.alertText, { color: colors.black }]}>
              🧪 DEV MODE: Testing enabled
            </Text>
          </View>
        )}

        {/* Amount Section */}
        <View style={[styles.amountSection, { marginTop: 10, marginBottom: 20 }]}>
          <Text style={[styles.sectionLabel, { fontSize: 16, marginBottom: 8, color: colors.textSecondary }]}>
            Amount
          </Text>
          <View style={[styles.amountInput, { backgroundColor: colors.darkCard, borderRadius: 12, padding: 16, marginBottom: 8 }]}>
            <Icon name="dollar-sign" size={24} color={colors.textLight} style={{ marginRight: 8 }} />
            <Text style={{
              color: colors.textLight,
              fontSize: 32,
              fontWeight: 'bold',
              flex: 1,
            }}>{amount} USDC</Text>
          </View>
          <Text style={[styles.availableBalance, { fontSize: 14, color: colors.textSecondary }]}>
            Available in your balance: {balance?.toFixed(2) || '0.00'} USDC
          </Text>
          
          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountButtons}>
            <TouchableOpacity 
              style={[styles.quickAmountButton, { backgroundColor: colors.darkCard, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8 }]}
              onPress={() => handlePercentagePress(25)}
            >
              <Text style={[styles.quickAmountText, { fontSize: 12, color: colors.textLight }]}>25%</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickAmountButton, { backgroundColor: colors.darkCard, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8 }]}
              onPress={() => handlePercentagePress(50)}
            >
              <Text style={[styles.quickAmountText, { fontSize: 12, color: colors.textLight }]}>50%</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickAmountButton, { backgroundColor: colors.darkCard, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }]}
              onPress={handleMaxPress}
            >
              <Text style={[styles.quickAmountText, { fontSize: 12, color: colors.textLight }]}>Max</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Address Section */}
        <View style={[styles.walletAddressSection, { marginBottom: 20 }]}>
          <Text style={[styles.sectionLabel, { fontSize: 16, marginBottom: 8, color: colors.textSecondary }]}>
            Wallet Address
          </Text>
          <View style={[styles.walletAddressInput, { backgroundColor: colors.darkCard, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center' }]}>
            <TextInput
              style={{
                flex: 1,
                color: colors.textLight,
                fontSize: 14,
                padding: 0,
              }}
              placeholder="Enter address"
              placeholderTextColor={colors.textSecondary}
              value={walletAddress}
              onChangeText={setWalletAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={{ marginLeft: 8 }}>
              <Icon name="copy" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={{ marginLeft: 8 }}>
              <Icon name="camera" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction Summary */}
        <View style={[styles.transactionSummary, { backgroundColor: colors.darkCard, borderRadius: 12, padding: 16, marginBottom: 20 }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontSize: 14, color: colors.textSecondary }]}>
              Transaction fee (3%)
            </Text>
            <Text style={[styles.summaryValue, { fontSize: 14, color: colors.textLight }]}>
              {withdrawalFee.toFixed(3)} USDC
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontSize: 14, color: colors.textSecondary }]}>
              Total withdraw
            </Text>
            <Text style={[styles.summaryValue, { fontSize: 14, color: colors.textLight, fontWeight: 'bold' }]}>
              {totalWithdraw.toFixed(3)} USDC
            </Text>
          </View>
        </View>

        {/* Number Pad */}
        {renderNumberPad()}

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            isAmountValid && styles.continueButtonActive,
            { marginTop: 20 }
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
    </SafeAreaView>
  );
};

export default WithdrawAmountScreen; 