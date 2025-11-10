import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/data';
import { Transaction } from '../../types';
import { TransactionModal, TransactionItem } from '../../components/transactions';
import { getUserDisplayName, preloadUserData } from '../../services/shared/dataUtils';
import styles from './styles';
import { colors } from '../../theme/colors';
import { logger } from '../../services/analytics/loggingService';

import { Container, Header, Tabs, ModernLoader } from '../../components/shared';
import type { Tab } from '../../components/shared/Tabs';

type TabType = 'all' | 'income' | 'expenses';

const TransactionHistoryScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Handle transactionId from route params (from notification)
  useEffect(() => {
    if (route?.params?.transactionId && transactions.length > 0) {
      const targetTransaction = transactions.find(t => 
        t.tx_hash === route.params.transactionId || 
        t.id === route.params.transactionId
      );
      
      if (targetTransaction) {
        setSelectedTransaction(targetTransaction);
        setModalVisible(true);
        logger.info('Transaction selected from notification', { 
          transactionId: route.params.transactionId,
          transaction: targetTransaction 
        }, 'TransactionHistoryScreen');
      } else {
        logger.warn('Transaction not found from notification', { 
          transactionId: route.params.transactionId,
          availableTransactions: transactions.map(t => ({ id: t.id, tx_hash: t.tx_hash }))
        }, 'TransactionHistoryScreen');
      }
    }
  }, [route?.params?.transactionId, transactions]);

  const loadTransactions = useCallback(async () => {
    if (!currentUser?.id) {
      logger.warn('No currentUser.id available', null, 'TransactionHistoryScreen');
      return;
    }

    try {
      setLoading(true);
      logger.info('Loading transactions for user', { userId: currentUser.id }, 'TransactionHistoryScreen');
      
      const userTransactions = await firebaseDataService.transaction.getUserTransactions(currentUser.id.toString());
      logger.info('Loaded transactions', { count: userTransactions.length, transactions: userTransactions }, 'TransactionHistoryScreen');
      
      // Preload user data for all transaction participants
      const userIds = new Set<string>();
      userTransactions.forEach(transaction => {
        if (transaction.from_user) {userIds.add(transaction.from_user);}
        if (transaction.to_user) {userIds.add(transaction.to_user);}
      });
      
      if (userIds.size > 0) {
        await preloadUserData(Array.from(userIds));
      }
      
      setTransactions(userTransactions);
    } catch (error) {
      console.error('❌ Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Load user names for transactions
  const loadUserNames = async (transactions: Transaction[]) => {
    const userIds = new Set<string>();
    
    transactions.forEach(transaction => {
      if (transaction.from_user) {userIds.add(transaction.from_user);}
      if (transaction.to_user) {userIds.add(transaction.to_user);}
    });

    const newUserNames = new Map(userNames);
    
    for (const userId of userIds) {
      if (!newUserNames.has(userId)) {
        try {
          const userName = await getUserDisplayName(userId);
          newUserNames.set(userId, userName);
        } catch (error) {
          newUserNames.set(userId, 'Unknown User');
        }
      }
    }
    
    setUserNames(newUserNames);
  };

  // Load user names when transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      loadUserNames(transactions);
    }
  }, [transactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
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


  const getTransactionIcon = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-send.png?alt=media&token=d733fbce-e383-4cae-bd93-2fc16c36a2d9' };
      case 'receive':
        return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-receive.png?alt=media&token=c55d7c97-b027-4841-859e-38c46c2f36c5' };
      case 'deposit':
        return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-deposit.png?alt=media&token=d832bae5-dc8e-4347-bab5-cfa9621a5c55' };
      case 'withdraw':
        return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-withdraw.png?alt=media&token=8c0da99e-287c-4d19-8515-ba422430b71b' };
      default:
        return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-send.png?alt=media&token=d733fbce-e383-4cae-bd93-2fc16c36a2d9' };
    }
  };

  const getTransactionTitle = async (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        // Use stored recipient name if available, otherwise fetch from database
        if (transaction.recipient_name) {
          return `Send to ${transaction.recipient_name}`;
        }
        try {
          const recipientName = await getUserDisplayName(transaction.to_user);
          return `Send to ${recipientName}`;
        } catch (error) {
          return `Send to ${transaction.to_user}`;
        }
      case 'receive':
        // Use stored sender name if available, otherwise fetch from database
        if (transaction.sender_name) {
          return `Received from ${transaction.sender_name}`;
        }
        try {
          const senderName = await getUserDisplayName(transaction.from_user);
          return `Received from ${senderName}`;
        } catch (error) {
          return `Received from ${transaction.from_user}`;
        }
      case 'deposit':
        return 'Deposit';
      case 'withdraw':
        return 'Withdraw';
      default:
        return 'Transaction';
    }
  };

  const getTransactionSource = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        if (transaction.transaction_method === 'external_wallet') {
          return 'External Wallet Transfer';
        }
        if (transaction.group_id) {
          return 'Group Payment';
        }
        return transaction.note || 'Payment';
      case 'receive':
        if (transaction.transaction_method === 'external_wallet') {
          return 'External Wallet Deposit';
        }
        if (transaction.group_id) {
          return 'Group Payment';
        }
        return transaction.note || 'Payment received';
      case 'deposit':
        if (transaction.transaction_method === 'external_wallet') {
          return 'External Wallet';
        }
        return 'MoonPay';
      case 'withdraw':
        if (transaction.transaction_method === 'external_wallet') {
          return 'External Wallet';
        }
        return 'App Wallet';
      default:
        return '';
    }
  };

  const getTransactionAmount = (transaction: Transaction) => {
    if (!transaction || transaction.amount === undefined || transaction.amount === null) {
      return {
        amount: '0.00',
        color: colors.textLight
      };
    }
    
    const amount = transaction.amount;
    const isIncome = transaction.type === 'receive' || transaction.type === 'deposit';
    
    return {
      amount: amount.toFixed(2),
      color: isIncome ? colors.primaryGreen : colors.textLight
    };
  };

  // Filter transactions based on active tab
  const getFilteredTransactions = useCallback(() => {
    let filtered = transactions;
    if (activeTab === 'income') {
      filtered = transactions.filter(transaction => 
        transaction.type === 'receive' || transaction.type === 'deposit'
      );
    } else if (activeTab === 'expenses') {
      filtered = transactions.filter(transaction => 
        transaction.type === 'send' || transaction.type === 'withdraw'
      );
    }
    return filtered;
  }, [transactions, activeTab]);



  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftransactions-empty-state.png?alt=media&token=f0850cc3-9cc3-472a-9ff1-03e3772b5a4b' }} style={styles.emptyStateImage} />
      <Text style={styles.emptyStateTitle}>No transactions</Text>
      <Text style={styles.emptyStateSubtitle}>
        Make your first transactions to see it here
      </Text>
    </View>
  );

  const tabs: Tab[] = [
    { label: 'All', value: 'all' },
    { label: 'Income', value: 'income' },
    { label: 'Expenses', value: 'expenses' }
  ];

  return (
    <Container>
      {/* Header */}
      <Header
        title="History"
        onBackPress={handleBack}
      />
      
      {/* Filter Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabType)}
        enableAnimation={true}
      />

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
            <ModernLoader size="large" text="Loading transactions..." />
          </View>
        ) : getFilteredTransactions().length > 0 ? (
          <View style={styles.transactionsList}>
            {getFilteredTransactions().map(transaction => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                recipientName={userNames.get(transaction.to_user)}
                senderName={userNames.get(transaction.from_user)}
                onPress={handleTransactionPress}
                showTime={true}
              />
            ))}
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
        navigation={navigation}
      />
    </Container>
  );
};

export default TransactionHistoryScreen; 