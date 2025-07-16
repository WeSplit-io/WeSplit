import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';

const WithdrawSuccessScreen: React.FC<any> = ({ navigation, route }) => {
  const { 
    amount, 
    withdrawalFee, 
    totalWithdraw, 
    walletAddress, 
    description, 
    transactionId, 
    onchainId 
  } = route.params || {};

  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 8) return address;
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  const handleGoBack = () => {
    // Navigate back to dashboard
    navigation.navigate('Dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Indicator */}
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Icon name="check" size={40} color={colors.textLight} />
          </View>
          
          <Text style={styles.successAmount}>
            $ {totalWithdraw.toFixed(2)}
          </Text>
          
          <Text style={styles.successLabel}>
            Withdraw from your account
          </Text>
        </View>

        {/* Transaction Details */}
        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Withdrawal fee (3%)</Text>
            <Text style={styles.detailValue}>{withdrawalFee.toFixed(3)} USDC</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total sent</Text>
            <Text style={styles.detailValue}>{totalWithdraw.toFixed(3)} USDC</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Destination account</Text>
            <Text style={styles.detailValue}>{formatWalletAddress(walletAddress)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>{transactionId}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Onchain ID</Text>
            <Text style={styles.detailValue}>{onchainId}</Text>
          </View>
        </View>

        {/* Go Back Button */}
        <TouchableOpacity
          style={styles.goBackButton}
          onPress={handleGoBack}
        >
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WithdrawSuccessScreen; 