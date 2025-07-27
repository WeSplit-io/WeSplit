import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { firebaseTransactionService } from '../../services/firebaseDataService';
import { firebaseDataService } from '../../services/firebaseDataService';
import { Transaction, Group } from '../../types';
import TransactionModal from '../../components/TransactionModal';
import styles from './styles';
import { colors } from '../../theme/colors';

type TabType = 'all' | 'income' | 'expenses';

const TransactionHistoryScreen: React.FC<any> = ({ navigation }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const { balance } = useWallet();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!currentUser?.id) {
      console.log('❌ No currentUser.id available');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading transactions for user:', currentUser.id);
      
      const userTransactions = await firebaseTransactionService.getUserTransactions(currentUser.id.toString());
      console.log('✅ Loaded transactions:', userTransactions.length, userTransactions);
      
      setTransactions(userTransactions);
    } catch (error) {
      console.error('❌ Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const loadGroups = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const userGroups = await firebaseDataService.group.getUserGroups(currentUser.id.toString());
      setGroups(userGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  }, [currentUser?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadTransactions(), loadGroups()]);
    setRefreshing(false);
  }, [loadTransactions, loadGroups]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      loadGroups();
    }, [loadTransactions, loadGroups])
  );

  const handleBack = () => {
    navigation.goBack();
  };

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedTransaction(null);
  };

  const getGroupSummary = (group: Group) => {
    // Simuler un résumé de groupe (dans une vraie app, ceci viendrait de la base de données)
    return {
      expenseCount: Math.floor(Math.random() * 5) + 1,
      totalAmount: Math.random() * 100 + 10,
      memberCount: group.member_count || 1
    };
  };

  const getTransactionIcon = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        return require('../../../assets/icon-send.png');
      case 'receive':
        return require('../../../assets/icon-receive.png');
      case 'deposit':
        return require('../../../assets/icon-deposit.png');
      case 'withdraw':
        return require('../../../assets/icon-withdraw.png');
      default:
        return require('../../../assets/icon-send.png');
    }
  };

  const getTransactionTitle = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        return `Send to ${transaction.to_user}`;
      case 'receive':
        return `Received from ${transaction.from_user}`;
      case 'deposit':
        return 'Top Up Wallet';
      case 'withdraw':
        return 'Withdraw';
      default:
        return 'Transaction';
    }
  };

  const getTransactionSource = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        return transaction.note || 'Payment';
      case 'receive':
        return transaction.note || 'Payment received';
      case 'deposit':
        return 'MoonPay';
      case 'withdraw':
        return 'Wallet';
      default:
        return '';
    }
  };

  const getTransactionAmount = (transaction: Transaction) => {
    const amount = transaction.amount;
    const isIncome = transaction.type === 'receive' || transaction.type === 'deposit';
    
    return {
      amount: amount.toFixed(2),
      color: isIncome ? colors.primaryGreen : colors.textLight
    };
  };

  const renderTransactionItem = (transaction: Transaction) => {
    const transactionTime = new Date(transaction.created_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const { amount, color } = getTransactionAmount(transaction);
    const isIncome = transaction.type === 'receive' || transaction.type === 'deposit';

    return (
      <TouchableOpacity
        key={transaction.id}
        style={styles.transactionItem}
        onPress={() => handleTransactionPress(transaction)}
      >
        <View style={[
          styles.transactionIconContainer,
          isIncome && styles.transactionIconContainerIncome
        ]}>
          <Image
            source={getTransactionIcon(transaction)}
            style={[
              styles.transactionIcon,
              isIncome && styles.transactionIconIncome
            ]}
          />
        </View>
        <View style={styles.transactionContent}>
          <Text style={styles.transactionTitle}>
            {getTransactionTitle(transaction)}
          </Text>
          <Text style={styles.transactionSource}>
            {getTransactionSource(transaction)}
          </Text>
        </View>
        <View style={styles.transactionAmountContainer}>
          <Text style={[
            styles.transactionAmount,
            isIncome ? styles.transactionAmountIncome : styles.transactionAmountExpense
          ]}>
            {amount}
          </Text>
          <Text style={styles.transactionTime}>
            {transactionTime}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupTransaction = (group: Group) => {
    try {
      const summary = getGroupSummary(group);
      const recentDate = group.updated_at || group.created_at || new Date().toISOString();
      
      const transactionType = summary.expenseCount > 0 ? 'send' : 'request';
      const transactionTitle = summary.expenseCount > 0 ? `Send to ${group.name}` : `Request to ${group.name}`;
      const transactionNote = summary.expenseCount > 0 ? `Group expenses` : `Group activity`;
      const transactionTime = new Date(recentDate).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      return (
        <TouchableOpacity
          key={group.id}
          style={styles.requestItemNew}
          onPress={() => {
            // Open transaction modal for group details without navigation
            const mockTransaction: Transaction = {
              id: group.id.toString(),
              type: transactionType === 'send' ? 'send' : 'receive',
              amount: summary.totalAmount || 0,
              currency: 'USDC',
              from_user: currentUser?.id?.toString() || '',
              to_user: group.name,
              from_wallet: currentUser?.wallet_address || '',
              to_wallet: group.name,
              tx_hash: `group_${group.id}_${Date.now()}`,
              note: transactionNote,
              created_at: recentDate,
              updated_at: recentDate,
              status: 'completed'
            };
            setSelectedTransaction(mockTransaction);
            setModalVisible(true);
          }}
        >
          <View style={styles.transactionAvatarNew}>
            <Image
              source={
                transactionType === 'send' 
                  ? require('../../../assets/icon-send.png')
                  : require('../../../assets/icon-receive.png')
              }
              style={styles.transactionIconNew}
            />
          </View>
          <View style={styles.requestContent}>
            <Text style={styles.requestMessageWithAmount}>
              <Text style={styles.requestSenderName}>{transactionTitle}</Text>
            </Text>
            <Text style={styles.requestSource}>
              {transactionNote} • {transactionTime}
            </Text>
          </View>
          <Text style={styles.requestAmountGreen}>
            {(summary.totalAmount || 0).toFixed(2)} USDC
          </Text>
        </TouchableOpacity>
      );
    } catch (error) {
      console.error(`Error rendering transaction for group ${group.id}:`, error);
      return (
        <View key={group.id} style={styles.requestItemNew}>
          <View style={styles.transactionAvatarNew}>
            <Text style={{ color: colors.white, fontSize: 16, fontWeight: 'bold' }}>E</Text>
          </View>
          <View style={styles.requestContent}>
            <Text style={styles.requestSenderName}>Error loading transaction</Text>
          </View>
        </View>
      );
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image source={require('../../../assets/transactions-empty-state.png')} style={styles.emptyStateImage} />
      <Text style={styles.emptyStateTitle}>No transactions</Text>
      <Text style={styles.emptyStateSubtitle}>
        Make your first transactions to see it here
      </Text>
    </View>
  );

  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Filtrer les transactions selon le tab actif
  const getFilteredTransactions = () => {
    if (activeTab === 'all') return transactions;
    
    return transactions.filter(transaction => {
      if (activeTab === 'income') {
        return transaction.type === 'receive' || transaction.type === 'deposit';
      } else if (activeTab === 'expenses') {
        return transaction.type === 'send' || transaction.type === 'withdraw';
      }
      return true;
    });
  };

  const filteredTransactions = getFilteredTransactions();
  console.log('🔍 Filtered transactions:', filteredTransactions.length, 'Active tab:', activeTab);
  console.log('👥 Groups:', groups.length);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {renderTabButton('all', 'All')}
        {renderTabButton('income', 'Income')}
        {renderTabButton('expenses', 'Expenses')}
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryGreen}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryGreen} />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : filteredTransactions.length > 0 ? (
          <View style={styles.transactionsList}>
            {filteredTransactions.map(renderTransactionItem)}
          </View>
        ) : groups.length > 0 ? (
          <View style={styles.transactionsList}>
            {groups.map(renderGroupTransaction)}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* Transaction Modal */}
      <TransactionModal
        visible={modalVisible}
        transaction={selectedTransaction}
        onClose={handleCloseModal}
      />
    </SafeAreaView>
  );
};

export default TransactionHistoryScreen; 