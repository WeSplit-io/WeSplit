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
  const [detailedGroupSummaries, setDetailedGroupSummaries] = useState<Record<string, { expenseCount: number; totalAmount: number; memberCount: number }>>({});

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
    let memberCount = group.member_count || 0;
    let expenseCount = group.expense_count || 0;

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
      let memberCount = group.member_count || 0;
      let expenseCount = group.expense_count || 0;

      // First try to use expenses_by_currency data
      if (group.expenses_by_currency && Array.isArray(group.expenses_by_currency) && group.expenses_by_currency.length > 0) {
        totalAmount = group.expenses_by_currency.reduce((sum, expense) => {
          return sum + (expense.total_amount || 0);
        }, 0);
      }

      // If no expenses_by_currency data but we have expense_count, fetch individual expenses
      if (totalAmount === 0 && expenseCount > 0) {
        try {
          const { firebaseDataService } = await import('../../services/firebaseDataService');
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
            
            console.log(`🔧 TransactionHistory: Calculated total from individual expenses for group "${group.name}": $${(totalAmount || 0).toFixed(2)}`);
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

  // Create unified transaction list that includes both real transactions and group transactions
  const createUnifiedTransactionList = useCallback(async () => {
    const unifiedTransactions: Array<{
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
    }> = [];

    // Add real transactions from Firebase
    transactions.forEach(transaction => {
      unifiedTransactions.push({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        title: getTransactionTitle(transaction),
        source: getTransactionSource(transaction),
        time: new Date(transaction.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        isRealTransaction: true,
        originalTransaction: transaction
      });
    });

    // Add ALL individual expenses from ALL groups
    for (const group of groups) {
      try {
        // Get individual expenses for this group
        let individualExpenses: any[] = [];
        try {
          const { firebaseDataService } = await import('../../services/firebaseDataService');
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
                const { firebaseDataService } = await import('../../services/firebaseDataService');
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
  console.log('🔍 Filtered transactions:', filteredTransactions.length, 'Active tab:', activeTab);
  console.log('👥 Groups:', groups.length);

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
              amount: transaction.amount,
              currency: transaction.currency,
              from_user: currentUser?.id?.toString() || '',
              to_user: transaction.originalGroup?.name || '',
              from_wallet: currentUser?.wallet_address || '',
              to_wallet: transaction.originalGroup?.name || '',
              tx_hash: `group_${transaction.originalGroup?.id}_${Date.now()}`,
              note: transaction.source,
              created_at: transaction.originalGroup?.updated_at || transaction.originalGroup?.created_at || new Date().toISOString(),
              updated_at: transaction.originalGroup?.updated_at || transaction.originalGroup?.created_at || new Date().toISOString(),
              status: 'completed'
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
            {transaction.title}
          </Text>
          <Text style={styles.transactionSource}>
            {transaction.source} • {transaction.time}
          </Text>
        </View>
        <View style={styles.transactionAmountContainer}>
          <Text style={[
            styles.transactionAmount,
            isIncome ? styles.transactionAmountIncome : styles.transactionAmountExpense
          ]}>
            {isIncome ? '+' : '-'}{amount}
          </Text>
          <Text style={styles.transactionTime}>
            {transaction.time}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
    </SafeAreaView>
  );
};

export default TransactionHistoryScreen; 