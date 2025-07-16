import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  ActivityIndicator 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '../../components/Icon';
import { useGroupData } from '../../hooks/useGroupData';
import { useApp } from '../../context/AppContext';
import { GroupMember, Expense, Balance } from '../../types';
import SettleUpModal from '../SettleUp/SettleUpModal';
import { getTotalSpendingInUSDC, convertToUSDC } from '../../services/priceService';
import { styles } from './styles';

// Helper function to calculate balances from real member and expense data
const calculateRealBalances = (members: any[], expenses: any[], expensesByCurrency: any[]): Balance[] => {
  const balances: Balance[] = [];
  
  if (members.length === 0) return balances;
  
  // If we have individual expenses, calculate based on actual payments
  if (expenses.length > 0) {
    const memberBalances: Record<number, Record<string, number>> = {};
    
    // Initialize balances for all members
    members.forEach((member: any) => {
      memberBalances[member.id] = {};
    });

    // Calculate balances by currency based on actual expenses
    expenses.forEach((expense: any) => {
      const currency = expense.currency || 'SOL';
      const sharePerPerson = expense.amount / members.length;
      
      members.forEach((member: any) => {
        if (!memberBalances[member.id][currency]) {
          memberBalances[member.id][currency] = 0;
        }
        
        if (expense.paid_by === member.id) {
          // Member paid this expense, so they're owed the amount minus their share
          memberBalances[member.id][currency] += expense.amount - sharePerPerson;
        } else {
          // Member didn't pay, so they owe their share
          memberBalances[member.id][currency] -= sharePerPerson;
        }
      });
    });

    // Convert to Balance objects
    members.forEach((member: any) => {
      const currencies = memberBalances[member.id];
      
      // Find the currency with the largest absolute balance
      let primaryCurrency = 'SOL';
      let primaryAmount = 0;
      
      const balanceEntries = Object.entries(currencies);
      if (balanceEntries.length > 0) {
        const [maxCurrency, maxAmount] = balanceEntries.reduce((max, [curr, amount]) => 
          Math.abs(amount) > Math.abs(max[1]) ? [curr, amount] : max
        );
        primaryCurrency = maxCurrency;
        primaryAmount = maxAmount;
      }

      balances.push({
        userId: member.id,
        userName: member.name,
        userAvatar: member.avatar,
        amount: primaryAmount,
        currency: primaryCurrency,
        status: Math.abs(primaryAmount) < 0.01 ? 'settled' : primaryAmount > 0 ? 'gets_back' : 'owes'
      });
    });
  } else if (expensesByCurrency.length > 0) {
    // Use summary data to create equal split scenario
    const primaryCurrency = expensesByCurrency[0].currency;
    const totalAmount = expensesByCurrency.reduce((sum, curr) => sum + curr.total_amount, 0);
    const sharePerPerson = totalAmount / members.length;
    
    // Simple equal split: current user paid everything, others owe exactly their share
    members.forEach((member: any, index: number) => {
      let amount: number;
      
      if (index === 0) {
        // First member (current user) paid everything, is owed their share back
        amount = sharePerPerson;
      } else {
        // Other members owe exactly their share
        amount = -sharePerPerson;
      }
      
      balances.push({
        userId: member.id,
        userName: member.name,
        userAvatar: member.avatar,
        amount: amount,
        currency: primaryCurrency,
        status: Math.abs(amount) < 0.01 ? 'settled' : amount > 0 ? 'gets_back' : 'owes'
      });
    });
  }
  
  return balances;
};

const GroupDetailsScreen: React.FC<any> = ({ navigation, route }) => {
  const { groupId } = route.params;
  const { state, getGroupBalances } = useApp();
  const { currentUser } = state;
  
  const {
    group,
    loading,
    error,
    refresh,
    totalExpenses,
    totalAmount,
    memberCount
  } = useGroupData(groupId);

  const [activeTab, setActiveTab] = useState<'expenses' | 'settleup'>('expenses');
  const [settleUpModalVisible, setSettleUpModalVisible] = useState(false);

  // State for real member balances
  const [realGroupBalances, setRealGroupBalances] = useState<Balance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);

  // Load actual group members and calculate real balances
  useEffect(() => {
    const loadRealBalances = async () => {
      if (!groupId || !group) return;
      
      setLoadingBalances(true);
      try {
        // Load real member data from backend
        const [members, expenses] = await Promise.all([
          fetch(`http://192.168.1.75:4000/api/groups/${groupId}/members`).then(res => res.json()),
          fetch(`http://192.168.1.75:4000/api/expenses/${groupId}`).then(res => res.json())
        ]);

        if (members.length > 0) {
          // Calculate real balances based on actual member data and expenses
          const balances = calculateRealBalances(members, expenses, group.expenses_by_currency || []);
          setRealGroupBalances(balances);
        } else {
          // Fallback to summary calculation
          const balances = getGroupBalances(groupId);
          setRealGroupBalances(balances);
        }
      } catch (error) {
        console.error('Error loading real member data:', error);
        // Fallback to existing method
        const balances = getGroupBalances(groupId);
        setRealGroupBalances(balances);
      } finally {
        setLoadingBalances(false);
      }
    };

    loadRealBalances();
  }, [groupId]); // Only depend on groupId to prevent infinite loops

  const currentUserBalance = useMemo(() => 
    realGroupBalances.find((balance: Balance) => balance.userId === currentUser?.id), 
    [realGroupBalances, currentUser?.id]
  );

  // Calculate totals using available summary data with USDC conversion for display
  const getGroupSummary = useMemo(() => {
    if (!group) {
      return {
        totalAmountUSD: 0,
        totalAmountDisplay: '$0.00',
        memberCount: 0,
        expenseCount: 0,
        userPaidUSD: 0,
        userOwesUSD: 0,
        loading: false
      };
    }

    const memberCount = group.member_count || group.members?.length || 0;
    const expenseCount = group.expense_count || group.expenses?.length || 0;

    // For now, return a promise-based calculation that will be handled by the component
    return {
      memberCount,
      expenseCount,
      loading: true
    };
  }, [group, currentUserBalance]);

  // State for group summary
  const [groupSummary, setGroupSummary] = useState({
    totalAmountUSD: 0,
    totalAmountDisplay: '$0.00',
    memberCount: 0,
    expenseCount: 0,
    userPaidUSD: 0,
    userOwesUSD: 0,
    loading: true
  });

  // Load group summary when component mounts or group changes
  useEffect(() => {
    const loadSummary = async () => {
      if (!group) return;

    try {
      let totalAmountUSD = 0;

      // Convert all expenses to USD for display
      if (group.expenses_by_currency && group.expenses_by_currency.length > 0) {
        const expenses = group.expenses_by_currency.map(expense => ({
          amount: expense.total_amount || 0,
          currency: expense.currency || 'SOL'
        }));

        totalAmountUSD = await getTotalSpendingInUSDC(expenses);
      }

      // For user balance calculations, convert to USD as well
      const userBalance = currentUserBalance?.amount || 0;
      const userCurrency = currentUserBalance?.currency || 'USDC';
      
      let userBalanceUSD = Math.abs(userBalance);
      if (userCurrency !== 'USDC') {
        userBalanceUSD = await convertToUSDC(Math.abs(userBalance), userCurrency);
      }

      const userPaidUSD = userBalance > 0 ? userBalanceUSD : 0;
      const userOwesUSD = userBalance < 0 ? userBalanceUSD : 0;

        setGroupSummary({
        totalAmountUSD,
        totalAmountDisplay: `$${totalAmountUSD.toFixed(2)}`,
          memberCount: group.member_count || group.members?.length || 0,
          expenseCount: group.expense_count || group.expenses?.length || 0,
        userPaidUSD,
        userOwesUSD,
        loading: false
        });
    } catch (error) {
      console.error('Error calculating group summary:', error);
      
      // Fallback calculations with estimated rates
      let totalAmountUSD = 0;
      if (group.expenses_by_currency && group.expenses_by_currency.length > 0) {
        totalAmountUSD = group.expenses_by_currency.reduce((sum, expense) => {
          const amount = expense.total_amount || 0;
          const currency = expense.currency || 'SOL';
          const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
          return sum + (amount * rate);
        }, 0);
      }

      const userBalance = currentUserBalance?.amount || 0;
      const userCurrency = currentUserBalance?.currency || 'USDC';
      const rate = userCurrency === 'SOL' ? 200 : (userCurrency === 'USDC' ? 1 : 100);
      const userBalanceUSD = Math.abs(userBalance) * rate;

        setGroupSummary({
        totalAmountUSD,
        totalAmountDisplay: `$${totalAmountUSD.toFixed(2)}`,
          memberCount: group.member_count || group.members?.length || 0,
          expenseCount: group.expense_count || group.expenses?.length || 0,
        userPaidUSD: userBalance > 0 ? userBalanceUSD : 0,
        userOwesUSD: userBalance < 0 ? userBalanceUSD : 0,
        loading: false
        });
      }
    };
    
    if (group) {
      loadSummary();
    }
  }, [group, currentUserBalance]);

  // Get computed values from available data
  const expenses = group?.expenses || []; // Will be empty but keeping for compatibility
  const members = group?.members || []; // Will be empty but keeping for compatibility

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (groupId) {
        refresh();
      }
    }, [groupId, refresh])
  );

  // Show error state if there's an error
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Error: {error}</Text>
          <TouchableOpacity 
            style={styles.addExpenseButton}
            onPress={() => refresh()}
          >
            <Text style={styles.addExpenseButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading group details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Icon name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group details</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('GroupSettings', { groupId })}
        >
          <Icon name="settings" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Group Info */}
      <View style={styles.groupInfo}>
        <View style={styles.groupIconContainer}>
          <Icon name="people" style={styles.groupIcon} />
        </View>
        <Text style={styles.groupName}>{group?.name || 'Group'}</Text>
      </View>

      {/* Total Spending Card */}
      <View style={styles.totalSpendingCard}>
        <View style={styles.spendingHeader}>
          <Text style={styles.spendingLabel}>Total spending</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Open</Text>
          </View>
        </View>
        <Text style={styles.spendingAmount}>
          {groupSummary.totalAmountDisplay}
        </Text>
      </View>

      {/* Balance Cards */}
      <View style={styles.balanceCards}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total you paid</Text>
          <Text style={styles.balanceAmount}>
            ${groupSummary.userPaidUSD.toFixed(2)}
          </Text>
        </View>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>You owe</Text>
          <Text style={styles.balanceAmount}>
            ${groupSummary.userOwesUSD.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'expenses' && styles.activeTab]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.activeTabText]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'settleup' && styles.activeTab]}
          onPress={() => setActiveTab('settleup')}
        >
          <Text style={[styles.tabText, activeTab === 'settleup' && styles.activeTabText]}>
            Settleup
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView 
        style={styles.tabContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'expenses' ? (
          <View style={styles.expensesContent}>
            <Text style={styles.todayLabel}>Expenses</Text>
            
            {/* Show individual expenses if available, otherwise show summary */}
            {expenses && expenses.length > 0 ? (
              <View>
                {expenses.map((expense, index) => (
                  <View key={expense.id || index} style={styles.expenseItem}>
                    <View style={styles.expenseAvatar} />
                    <View style={styles.expenseDetails}>
                      <Text style={styles.expenseDescription}>
                        {expense.description || 'Expense'}
                      </Text>
                      <Text style={styles.expenseCategory}>
                        Paid by {expense.paid_by_name || 'Someone'} • {expense.category || 'Other'}
                      </Text>
                    </View>
                    <View style={styles.expenseAmounts}>
                      <Text style={styles.expenseLentAmount}>
                        {expense.currency} {expense.amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : groupSummary.expenseCount > 0 ? (
              <View>
                <View style={styles.expenseItem}>
                  <View style={styles.expenseAvatar} />
                  <View style={styles.expenseDetails}>
                    <Text style={styles.expenseDescription}>
                      {groupSummary.expenseCount} expense{groupSummary.expenseCount !== 1 ? 's' : ''} in this group
                    </Text>
                    <Text style={styles.expenseCategory}>
                      Total: {groupSummary.totalAmountDisplay} • {groupSummary.memberCount} member{groupSummary.memberCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.expenseAmounts}>
                    <Text style={styles.expenseLentAmount}>
                      Summary view
                    </Text>
                  </View>
                </View>
                {group?.expenses_by_currency && group.expenses_by_currency.length > 0 && (
                  <View style={styles.currencyBreakdown}>
                    <Text style={styles.expenseCategory}>By currency:</Text>
                    {group.expenses_by_currency.map((currencyData, index) => (
                      <Text key={index} style={styles.expenseCategory}>
                        • {currencyData.currency}: {currencyData.total_amount.toFixed(2)}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyExpenses}>
                <Text style={styles.emptyExpensesText}>No expenses yet</Text>
                <Text style={styles.expenseCategory}>
                  Add an expense to get started with splitting costs
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.addExpenseButton}
              onPress={() => navigation.navigate('AddExpense', { groupId })}
            >
              <Text style={styles.addExpenseButtonText}>Add expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.settleupContent}>
            {/* Settlement content based on balance - show USD amounts */}
            {groupSummary.userOwesUSD > 0 ? (
              <TouchableOpacity 
                style={styles.settlementCard}
                onPress={() => setSettleUpModalVisible(true)}
              >
                <View style={styles.settlementAvatar} />
                <View style={styles.settlementInfo}>
                  <Text style={styles.settlementTitle}>
                    You owe ${groupSummary.userOwesUSD.toFixed(2)}
                  </Text>
                  <Text style={styles.settlementSubtitle}>Tap to see settlement options</Text>
                </View>
                <View>
                  <Icon name="chevron-right" size={20} color="#FFF" />
                </View>
              </TouchableOpacity>
            ) : groupSummary.userPaidUSD > 0 ? (
              <TouchableOpacity 
                style={styles.settlementCard}
                onPress={() => setSettleUpModalVisible(true)}
              >
                <View style={styles.settlementAvatar} />
                <View style={styles.settlementInfo}>
                  <Text style={styles.settlementTitle}>
                    You're owed ${groupSummary.userPaidUSD.toFixed(2)}
                  </Text>
                  <Text style={styles.settlementSubtitle}>Tap to send payment reminders</Text>
                </View>
                <View>
                  <Icon name="chevron-right" size={20} color="#FFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.settledState}>
                <Text style={styles.settledText}>All settled up!</Text>
                <Text style={styles.expenseCategory}>
                  {groupSummary.expenseCount > 0 
                    ? 'No outstanding balances in this group' 
                    : 'Add some expenses to see settlement options'}
                </Text>
              </View>
            )}

            {/* Balance Section */}
            <View style={styles.balanceSection}>
              <Text style={styles.balanceSectionTitle}>Balance</Text>
              
              {/* Show current user's balance in USD */}
              <View style={styles.memberBalanceItem}>
                <View style={styles.memberBalanceAvatar} />
                <View style={styles.memberBalanceInfo}>
                  <Text style={styles.memberBalanceName}>You</Text>
                </View>
                <Text style={styles.memberBalanceAmount}>
                  {groupSummary.userPaidUSD > 0 
                    ? `+$${groupSummary.userPaidUSD.toFixed(2)}` 
                    : groupSummary.userOwesUSD > 0 
                    ? `-$${groupSummary.userOwesUSD.toFixed(2)}` 
                    : '$0.00'}
                </Text>
              </View>
              
              {/* Show other members' balances in USD */}
              {realGroupBalances
                .filter((balance: Balance) => balance.userId !== currentUser?.id)
                .map((balance: Balance, index: number) => {
                  // Convert balance to USD for display using the same rate as group total
                  let balanceUSD = Math.abs(balance.amount);
                  if (balance.currency !== 'USDC' && group?.expenses_by_currency) {
                    // Calculate the actual conversion rate from group data
                    const currencyData = group.expenses_by_currency.find(exp => exp.currency === balance.currency);
                    if (currencyData && currencyData.total_amount > 0) {
                      // Use the real rate from the total spending conversion
                      const realRate = groupSummary.totalAmountUSD / currencyData.total_amount;
                      balanceUSD = Math.abs(balance.amount) * realRate;
                    } else {
                      // Fallback to market rate
                      const rate = balance.currency === 'SOL' ? 200 : 1;
                      balanceUSD = Math.abs(balance.amount) * rate;
                    }
                  }
                  
                  return (
                    <View key={balance.userId || index} style={styles.memberBalanceItem}>
                      <View style={styles.memberBalanceAvatar} />
                      <View style={styles.memberBalanceInfo}>
                        <Text style={styles.memberBalanceName}>{balance.userName}</Text>
                        <Text style={styles.expenseCategory}>
                          {balance.status === 'owes' ? 'Owes money' : 
                           balance.status === 'gets_back' ? 'Is owed money' : 
                           'Settled up'}
                        </Text>
                      </View>
                      <Text style={styles.memberBalanceAmount}>
                        {balance.amount > 0 
                          ? `+$${balanceUSD.toFixed(2)}` 
                          : balance.amount < 0 
                          ? `-$${balanceUSD.toFixed(2)}` 
                          : '$0.00'}
                      </Text>
                    </View>
                  );
                })}

              {/* Group summary info */}
              {groupSummary.expenseCount > 0 && (
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#333' }}>
                  <Text style={styles.expenseCategory}>
                    Total group spending: {groupSummary.totalAmountDisplay}
                  </Text>
                  <Text style={styles.expenseCategory}>
                    {groupSummary.expenseCount} expense{groupSummary.expenseCount !== 1 ? 's' : ''} • {groupSummary.memberCount} member{groupSummary.memberCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Quick settle action button */}
            <TouchableOpacity 
              style={styles.addExpenseButton}
              onPress={() => setSettleUpModalVisible(true)}
            >
              <Text style={styles.addExpenseButtonText}>
                {groupSummary.userOwesUSD > 0 
                  ? 'Settle up now' 
                  : groupSummary.userPaidUSD > 0 
                  ? 'Send payment reminders' 
                  : 'View settlement details'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* SettleUp Modal */}
      <SettleUpModal
        visible={settleUpModalVisible}
        onClose={() => setSettleUpModalVisible(false)}
        groupId={groupId}
        navigation={navigation}
        realBalances={realGroupBalances} // Pass real member balances
        onSettlementComplete={() => {
          // Refresh group data when settlement is completed
          refresh();
          setSettleUpModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

export default GroupDetailsScreen; 