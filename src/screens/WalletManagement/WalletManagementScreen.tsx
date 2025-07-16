import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { styles } from './styles';

const WalletManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { state } = useApp();
  const { currentUser } = state;
  const { 
    isConnected, 
    address, 
    balance, 
    walletName, 
    availableWallets,
    currentWalletId 
  } = useWallet();
  
  const [multiSignEnabled, setMultiSignEnabled] = useState(false);
  const [transactions, setTransactions] = useState([
    {
      id: '1',
      type: 'send',
      recipient: 'Haxoloto',
      note: 'pay for pic...',
      amount: 999.08,
      date: new Date().toISOString(),
    }
  ]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChangeExternalWallet = () => {
    // This will open the wallet selector modal
    // For now, just show an alert
    Alert.alert('Change External Wallet', 'This will open wallet selection');
  };

  const handleLinkExternalWallet = () => {
    // This will open wallet connection flow
    Alert.alert('Link External Wallet', 'This will open wallet connection');
  };

  const handleSeedPhrase = () => {
    navigation.navigate('SeedPhraseView');
  };

  const handleMultiSignToggle = (value: boolean) => {
    if (value) {
      // Show multi-sign explanation modal
      navigation.navigate('MultiSignExplanation');
    } else {
      setMultiSignEnabled(false);
    }
  };

  const handleViewTransactions = () => {
    navigation.navigate('TransactionsList');
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const getCurrentWallet = () => {
    return availableWallets.find(w => w.id === currentWalletId);
  };

  const currentWallet = getCurrentWallet();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <Icon name="network" size={24} color={colors.black} />
          </View>
          <Text style={styles.balanceAmount}>
            ${balance !== null ? balance.toFixed(2) : '0.00'}
          </Text>
          <Text style={styles.balanceLimitText}>Balance Limit $1000</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('SendContacts')}
            >
              <View style={styles.actionButtonCircle}>
                <Icon name="send" size={24} color={colors.textLight} />
              </View>
              <Text style={styles.actionButtonText}>Send to</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('RequestContacts')}
            >
              <View style={styles.actionButtonCircle}>
                <Icon name="download" size={24} color={colors.textLight} />
              </View>
              <Text style={styles.actionButtonText}>Request</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Deposit')}
            >
              <View style={styles.actionButtonCircle}>
                <Icon name="plus" size={24} color={colors.textLight} />
              </View>
              <Text style={styles.actionButtonText}>Top up</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('WithdrawAmount')}
            >
              <View style={styles.actionButtonCircle}>
                <Icon name="minus" size={24} color={colors.textLight} />
              </View>
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* External Wallet Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>External wallet</Text>
            <TouchableOpacity onPress={handleChangeExternalWallet}>
              <Text style={styles.changeButton}>Change</Text>
            </TouchableOpacity>
          </View>
          
          {isConnected && currentWallet ? (
            <TouchableOpacity style={styles.externalWalletButton}>
              <Icon name="monster" size={20} color={colors.primaryGreen} />
              <Text style={styles.externalWalletText}>
                {formatAddress(currentWallet.address)}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.linkWalletButton}
              onPress={handleLinkExternalWallet}
            >
              <Text style={styles.linkWalletText}>Link external wallet</Text>
              <Icon name="chevron-right" size={16} color={colors.primaryGreen} />
            </TouchableOpacity>
          )}
        </View>

        {/* Wallet Management Options */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={handleSeedPhrase}
          >
            <Text style={styles.optionText}>Seed phrase</Text>
            <Icon name="chevron-right" size={16} color={colors.textLightSecondary} />
          </TouchableOpacity>
          
          <View style={styles.optionRow}>
            <Text style={styles.optionText}>Multi-sign</Text>
            <Switch
              value={multiSignEnabled}
              onValueChange={handleMultiSignToggle}
              trackColor={{ false: colors.border, true: colors.primaryGreen }}
              thumbColor={multiSignEnabled ? colors.white : colors.textLightSecondary}
            />
          </View>
        </View>

        {/* Transactions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <TouchableOpacity onPress={handleViewTransactions}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          
          {transactions.length > 0 ? (
            transactions.slice(0, 3).map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    Send to {transaction.recipient}
                  </Text>
                  <Text style={styles.transactionNote}>
                    Note: {transaction.note}
                  </Text>
                </View>
                <Text style={styles.transactionAmount}>
                  {transaction.amount.toFixed(2)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No transactions yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalletManagementScreen; 