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
import { useWallet } from '../../context/WalletContext';
import { firebaseTransactionService } from '../../services/data';
import { firebaseDataService } from '../../services/data';
import { Transaction, Group } from '../../types';
import { TransactionModal } from '../../components/transactions';
import styles from './styles';
import { colors } from '../../theme/colors';
import { logger } from '../../services/analytics/loggingService';

import { Container, Header } from '../../components/shared';

type TabType = 'all' | 'income' | 'expenses';

const TransactionHistoryScreen: React.FC<any> = ({ navigation, route }) => {
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
  const [detailedGroupSummaries, setDetailedGroupSummaries] = useState<Record<string, { expenseCount: number; totalAmount: number; memberCount: number }>>({});

  // Handle transactionId from route params (from notification)
  useEffect(() => {
    if (route?.params?.transactionId && transactions.length > 0) {
      const targetTransaction = transactions.find(t => 
        t.tx_hash === route.params.transactionId || 
        t.id === route.params.transactionId ||
        t.transactionId === route.params.transactionId
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
      
      const userTransactions = await firebaseTransactionService.getUserTransactions(currentUser.id.toString());
      logger.info('Loaded transactions', { count: userTransactions.length, transactions: userTransactions }, 'TransactionHistoryScreen');
      
      setTransactions(userTransactions);
    } catch (error) {
      console.error('❌ Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const loadGroups = useCallback(async () => {
    if (!currentUser?.id) {return;}

    try {
      const userGroups = await firebaseDataService.group.getUserGroups(currentUser.id.toString());
      setGroups(userGroups);
      
      // Load detailed summaries for groups
      const detailedSummaries: Record<string, { expenseCount: number; totalAmount: number; memberCount: number }> = {};
      
      for (const group of userGroups) {
        try {
          const summary = await getDetailedGroupSummary(group);
          detailedSummaries[group.id.toString()] = summary;
        } catch (error) {
          console.error(`Error loading detailed summary for group ${group.id}:`, error);
          // Use basic summary as fallback
          detailedSummaries[group.id.toString()] = getGroupSummary(group);
        }
      }
      
      setDetailedGroupSummaries(detailedSummaries);
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
    // Use real data from the group instead of random values
    let totalAmount = 0;
    const memberCount = group.member_count || 0;
    const expenseCount = group.expense_count || 0;

    // Calculate total amount from expenses_by_currency
    if (group.expenses_by_currency && Array.isArray(group.expenses_by_currency) && group.expenses_by_currency.length > 0) {
      totalAmount = group.expenses_by_currency.reduce((sum, expense) => {
        return sum + (expense.total_amount || 0);
      }, 0);
    }

    // If expenses_by_currency is empty but we have expense_count, try to fetch individual expenses
    if (totalAmount === 0 && expenseCount > 0) {
      // For now, use a fallback calculation based on expense count
      // In a real implementation, you would fetch individual expenses here
      totalAmount = expenseCount * 25; // Fallback: assume average $25 per expense
    }

    return {
      expenseCount,
      totalAmount,
      memberCount
    };
  };

  // Enhanced function to get detailed group summary with individual expenses
  const getDetailedGroupSummary = async (group: Group) => {
    try {
      let totalAmount = 0;
      const memberCount = group.member_count || 0;
      const expenseCount = group.expense_count || 0;

      // First try to use expenses_by_currency data
      if (group.expenses_by_currency && Array.isArray(group.expenses_by_currency) && group.expenses_by_currency.length > 0) {
        totalAmount = group.expenses_by_currency.reduce((sum, expense) => {
          return sum + (expense.total_amount || 0);
        }, 0);
      }

      // If no expenses_by_currency data but we have expense_count, fetch individual expenses
      if (totalAmount === 0 && expenseCount > 0) {
        try {
          const { firebaseDataService } = await import('../../services/data');
          const individualExpenses = await firebaseDataService.expense.getGroupExpenses(group.id.toString());
          
          if (individualExpenses.length > 0) {
            // Calculate total from individual expenses
            const currencyTotals: Record<string, number> = {};
            
            individualExpenses.forEach(expense => {
              const currency = expense.currency || 'SOL';
              const amount = expense.amount || 0;
              
              if (!currencyTotals[currency]) {
                currencyTotals[currency] = 0;
              }
              currencyTotals[currency] += amount;
            });
            
            // Convert to USD for display
            totalAmount = Object.entries(currencyTotals).reduce((sum, [currency, total]) => {
              const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
              return sum + (total * rate);
            }, 0);
            
            logger.info('Calculated total from individual expenses for group', { groupName: group.name, totalAmount: (totalAmount || 0).toFixed(2) }, 'TransactionHistoryScreen');
          }
        } catch (error) {
          console.error(`Error fetching individual expenses for group ${group.id}:`, error);
          // Fallback to expense count calculation
          totalAmount = expenseCount * 25;
        }
      }

      return {
        expenseCount,
        totalAmount,
        memberCount
      };
    } catch (error) {
      console.error(`Error getting detailed group summary for ${group.id}:`, error);
      return getGroupSummary(group); // Fallback to basic summary
    }
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
        // Use stored recipient name if available, otherwise try to fetch from database
        if (transaction.recipient_name) {
          return `Send to ${transaction.recipient_name}`;
        }
        try {
          const recipient = await firebaseDataService.user.getCurrentUser(transaction.to_user);
          return `Send to ${recipient.name || 'Unknown'}`;
        } catch (error) {
          return `Send to ${transaction.to_user}`;
        }
      case 'receive':
        // Use stored sender name if available, otherwise try to fetch from database
        if (transaction.sender_name) {
          return `Received from ${transaction.sender_name}`;
        }
        try {
          const sender = await firebaseDataService.user.getCurrentUser(transaction.from_user);
          return `Received from ${sender.name || 'Unknown'}`;
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

  // Create unified transaction list that includes both real transactions and group transactions
  const createUnifiedTransactionList = useCallback(async () => {
    const unifiedTransactions: {
      id: string;
      type: 'send' | 'receive' | 'deposit' | 'withdraw';
      amount: number;
      currency: string;
      title: string;
      source: string;
      time: string;
      isRealTransaction: boolean;
      originalTransaction?: Transaction;
      originalGroup?: Group;
    }[] = [];

    // Add real transactions from Firebase
    const realTransactions = await Promise.all(
      transactions.map(async (transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        title: await getTransactionTitle(transaction),
        source: getTransactionSource(transaction),
        time: new Date(transaction.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        isRealTransaction: true,
        originalTransaction: transaction
      }))
    );
    unifiedTransactions.push(...realTransactions);

    // Add ALL individual expenses from ALL groups
    for (const group of groups) {
      try {
        // Get individual expenses for this group
        let individualExpenses: any[] = [];
        try {
          const { firebaseDataService } = await import('../../services/data');
          individualExpenses = await firebaseDataService.expense.getGroupExpenses(group.id.toString());
          
          // Add group info to each expense
          const expensesWithGroupInfo = individualExpenses.map(expense => ({
            ...expense,
            groupName: group.name,
            groupId: group.id,
            groupCategory: group.category,
            groupColor: group.color
          }));
          
          // Add all expenses from this group to unified transactions
          for (const expense of expensesWithGroupInfo) {
            const expenseTime = new Date(expense.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });

            // Get the actual user name who paid this expense
            let payerName = 'Member';
            if (String(expense.paid_by) === String(currentUser?.id)) {
              payerName = 'You';
            } else if (expense.paid_by_name) {
              payerName = expense.paid_by_name;
            } else {
              // Try to get user name from group members or contacts
              try {
                const { firebaseDataService } = await import('../../services/data');
                const groupMembers = await firebaseDataService.group.getGroupMembers(expense.groupId.toString());
                const payerMember = groupMembers.find(member => String(member.id) === String(expense.paid_by));
                if (payerMember) {
                  payerName = payerMember.name || payerMember.email?.split('@')[0] || 'Member';
                }
              } catch (error) {
                console.error(`Error fetching payer details for expense ${expense.id}:`, error);
              }
            }

            // Determine if current user paid this expense
            const isCurrentUserPaid = String(expense.paid_by) === String(currentUser?.id);
            const transactionType = isCurrentUserPaid ? 'send' : 'receive';
            
            // Use "add an expense" for group expenses, "paid" for actual payments
            const actionText = 'add an expense';
            const transactionTitle = isCurrentUserPaid 
              ? `You ${actionText} ${expense.description || 'expense'}`
              : `${payerName} ${actionText} ${expense.description || 'expense'}`;
            
            const transactionSource = `${expense.groupName} • ${expense.currency || 'USDC'}`;

            unifiedTransactions.push({
              id: `expense_${expense.groupId}_${expense.id}`,
              type: transactionType,
              amount: expense.amount || 0,
              currency: expense.currency || 'USDC',
              title: transactionTitle,
              source: transactionSource,
              time: expenseTime,
              isRealTransaction: false,
              originalGroup: group
            });
          }
        } catch (error) {
          console.error(`Error fetching individual expenses for group ${group.id}:`, error);
        }
      } catch (error) {
        console.error(`Error creating unified transaction for group ${group.id}:`, error);
      }
    }

    // Sort by time (most recent first)
    unifiedTransactions.sort((a, b) => {
      const timeA = new Date(a.isRealTransaction ? a.originalTransaction!.created_at : a.originalGroup!.updated_at || a.originalGroup!.created_at).getTime();
      const timeB = new Date(b.isRealTransaction ? b.originalTransaction!.created_at : b.originalGroup!.updated_at || b.originalGroup!.created_at).getTime();
      return timeB - timeA;
    });

    return unifiedTransactions;
  }, [transactions, groups, detailedGroupSummaries]);

  // Filter transactions based on active tab
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loadingFilteredTransactions, setLoadingFilteredTransactions] = useState(true);

  // Load filtered transactions when dependencies change
  useEffect(() => {
    const loadFilteredTransactions = async () => {
      setLoadingFilteredTransactions(true);
      try {
        const unifiedTransactions = await createUnifiedTransactionList();
        
        let filtered = unifiedTransactions;
        if (activeTab === 'income') {
          filtered = unifiedTransactions.filter(transaction => 
            transaction.type === 'receive' || transaction.type === 'deposit'
          );
        } else if (activeTab === 'expenses') {
          filtered = unifiedTransactions.filter(transaction => 
            transaction.type === 'send' || transaction.type === 'withdraw'
          );
        }
        
        setFilteredTransactions(filtered);
      } catch (error) {
        console.error('Error loading filtered transactions:', error);
        setFilteredTransactions([]);
      } finally {
        setLoadingFilteredTransactions(false);
      }
    };

    loadFilteredTransactions();
  }, [createUnifiedTransactionList, activeTab]);
  logger.debug('Filtered transactions and groups', { filteredCount: filteredTransactions.length, activeTab, groupsCount: groups.length }, 'TransactionHistoryScreen');

  // Render unified transaction item
  const renderUnifiedTransactionItem = (transaction: any) => {
    const isIncome = transaction.type === 'receive' || transaction.type === 'deposit';
    const { amount } = getTransactionAmount({
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency
    } as Transaction);

    return (
      <TouchableOpacity
        key={transaction.id}
        style={styles.transactionItem}
        onPress={() => {
          if (transaction.isRealTransaction) {
            handleTransactionPress(transaction.originalTransaction!);
          } else {
            // Create mock transaction for group
            const mockTransaction: Transaction = {
              id: transaction.id,
              type: transaction.type,
              amount: transaction.amount || 0,
              currency: transaction.currency || 'USDC',
              from_user: currentUser?.id?.toString() || '',
              to_user: transaction.originalGroup?.name || 'Group',
              from_wallet: currentUser?.wallet_address || '',
              to_wallet: transaction.originalGroup?.name || 'Group',
              tx_hash: `group_${transaction.originalGroup?.id}_${Date.now()}`,
              note: transaction.source || 'Group transaction',
              created_at: transaction.originalGroup?.updated_at || transaction.originalGroup?.created_at || new Date().toISOString(),
              updated_at: transaction.originalGroup?.updated_at || transaction.originalGroup?.created_at || new Date().toISOString(),
              status: 'completed',
              group_id: transaction.originalGroup?.id || null,
              company_fee: 0,
              net_amount: transaction.amount || 0,
              gas_fee: 0,
              gas_fee_covered_by_company: false,
              recipient_name: transaction.originalGroup?.name || 'Group',
              sender_name: currentUser?.name || currentUser?.email?.split('@')[0] || 'User',
              transaction_method: 'app_wallet',
              app_version: '1.0.0',
              device_info: 'mobile'
            };
            setSelectedTransaction(mockTransaction);
            setModalVisible(true);
          }
        }}
      >
        <View style={[
          styles.transactionIconContainer,
          isIncome && styles.transactionIconContainerIncome
        ]}>
          <Image
            source={getTransactionIcon({
              type: transaction.type,
              amount: transaction.amount,
              currency: transaction.currency
            } as Transaction)}
            style={[
              styles.transactionIcon,
              isIncome && styles.transactionIconIncome
            ]}
          />
        </View>
        <View style={styles.transactionContent}>
          <Text style={styles.transactionTitle}>
            {transaction.title || 'Transaction'}
          </Text>
          <Text style={styles.transactionSource}>
            {transaction.source || 'Unknown'} • {transaction.time || 'N/A'}
          </Text>
        </View>
        <View style={styles.transactionAmountContainer}>
          <Text style={[
            styles.transactionAmount,
            isIncome ? styles.transactionAmountIncome : styles.transactionAmountExpense
          ]}>
            {isIncome ? '+' : '-'}{amount} USDC
          </Text>
          
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftransactions-empty-state.png?alt=media&token=f0850cc3-9cc3-472a-9ff1-03e3772b5a4b' }} style={styles.emptyStateImage} />
      <Text style={styles.emptyStateTitle}>No transactions</Text>
      <Text style={styles.emptyStateSubtitle}>
        Make your first transactions to see it here
      </Text>
    </View>
  );

  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={() => setActiveTab(tab)}
    >
      {activeTab === tab ? (
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.tabGradient}
        >
          <Text style={styles.activeTabButtonText}>{label}</Text>
        </LinearGradient>
      ) : (
        <Text style={styles.tabButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Container>
      {/* Header */}
      <Header
        title="History"
        onBackPress={handleBack}
      />
      
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
        {loading || loadingFilteredTransactions ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryGreen} />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : filteredTransactions.length > 0 ? (
          <View style={styles.transactionsList}>
            {filteredTransactions.map(renderUnifiedTransactionItem)}
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