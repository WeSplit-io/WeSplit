import React, { useState, useCallback, useEffect } from 'react';
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
import { GroupMember, Expense } from '../../types';
import SettleUpModal from '../SettleUp/SettleUpModal';
import { styles } from './styles';

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

  // Get balances using centralized method for proper multi-currency support
  const groupBalances = getGroupBalances(groupId);
  const currentUserBalance = groupBalances.find(balance => balance.userId === currentUser?.id);

  // Calculate user payment totals for display
  const calculateUserPaymentTotals = (expenses: Expense[], userId: number) => {
    if (!userId || expenses.length === 0) {
      return { paid: 0, owes: 0 };
    }

    let totalPaid = 0;
    let totalOwes = 0;

    expenses.forEach(expense => {
      const sharePerPerson = expense.amount / (group?.members.length || 1);
      
      if (expense.paid_by === userId) {
        totalPaid += expense.amount;
      }
      
      totalOwes += sharePerPerson;
    });

    return {
      paid: totalPaid,
      owes: totalOwes
    };
  };

  // Get computed values from group data
  const expenses = group?.expenses || [];
  const members = group?.members || [];
  const currentUserPaymentData = currentUser?.id ? 
    calculateUserPaymentTotals(expenses, Number(currentUser.id)) : 
    { paid: 0, owes: 0 };

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
          ${totalAmount.toFixed(2)}
        </Text>
      </View>

      {/* Balance Cards */}
      <View style={styles.balanceCards}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total you paid</Text>
          <Text style={styles.balanceAmount}>
            ${currentUserPaymentData.paid.toFixed(2)}
          </Text>
        </View>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>You owe</Text>
          <Text style={styles.balanceAmount}>
            ${currentUserPaymentData.owes.toFixed(2)}
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
            <Text style={styles.todayLabel}>Today</Text>
            
            {expenses.length > 0 ? (
              expenses.map((expense) => (
                <View key={expense.id} style={styles.expenseItem}>
                  <View style={styles.expenseAvatar} />
                  <View style={styles.expenseDetails}>
                    <Text style={styles.expenseDescription}>
                      {expense.paid_by === Number(currentUser?.id) ? `You paid $${expense.amount.toFixed(2)}` : `${expense.paid_by_name} paid $${expense.amount.toFixed(2)}`}
                    </Text>
                    <Text style={styles.expenseCategory}>
                      {expense.description}
                    </Text>
                  </View>
                  <View style={styles.expenseAmounts}>
                    {expense.paid_by === Number(currentUser?.id) ? (
                      <Text style={styles.expenseLentAmount}>
                        You lent ${(expense.amount - (expense.amount / members.length)).toFixed(2)}
                      </Text>
                    ) : (
                      <Text style={styles.expenseOwedAmount}>
                        You owe ${(expense.amount / members.length).toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyExpenses}>
                <Text style={styles.emptyExpensesText}>No expenses yet</Text>
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
            {/* Settlement content based on balance */}
            {currentUserBalance && currentUserBalance.status === 'owes' ? (
              <TouchableOpacity 
                style={styles.settlementCard}
                onPress={() => setSettleUpModalVisible(true)}
              >
                <View style={styles.settlementAvatar} />
                <View style={styles.settlementInfo}>
                  <Text style={styles.settlementTitle}>
                    You owe {currentUserBalance.currency} {Math.abs(currentUserBalance.amount).toFixed(2)}
                  </Text>
                  <Text style={styles.settlementSubtitle}>See how you need to settle</Text>
                </View>
                <View>
                  <Icon name="chevron-right" size={20} color="#FFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.settledState}>
                <Text style={styles.settledText}>All settled up!</Text>
              </View>
            )}

            {/* Balance Section */}
            <View style={styles.balanceSection}>
              <Text style={styles.balanceSectionTitle}>Balance</Text>
              
              {members.map((member) => {
                const memberBalance = groupBalances.find(b => b.userId === member.id);
                const isCurrentUser = member.id === Number(currentUser?.id);
                return (
                  <View key={member.id} style={styles.memberBalanceItem}>
                    <View style={styles.memberBalanceAvatar} />
                    <View style={styles.memberBalanceInfo}>
                      <Text style={styles.memberBalanceName}>
                        {isCurrentUser ? 'You' : member.name}
                      </Text>
                    </View>
                    <Text style={styles.memberBalanceAmount}>
                      {memberBalance ? (
                        memberBalance.amount > 0 
                          ? `+${memberBalance.currency} ${memberBalance.amount.toFixed(2)}` 
                          : memberBalance.amount < 0 
                          ? `-${memberBalance.currency} ${Math.abs(memberBalance.amount).toFixed(2)}` 
                          : `${memberBalance.currency} 0.00`
                      ) : '$0.00'}
                    </Text>
                  </View>
                );
              })}

              {/* Recent expense at bottom */}
              {expenses.length > 0 && (
                <View style={styles.recentExpenseItem}>
                  <View style={styles.expenseAvatar} />
                  <View style={styles.expenseDetails}>
                    <Text style={styles.expenseDescription}>
                      {expenses[expenses.length - 1].paid_by_name} paid ${expenses[expenses.length - 1].amount.toFixed(2)}
                    </Text>
                    <Text style={styles.expenseCategory}>{expenses[expenses.length - 1].description}</Text>
                  </View>
                  <View style={styles.expenseAmounts}>
                    <Text style={styles.expenseOwedAmount}>
                      You owe ${(expenses[expenses.length - 1].amount / members.length).toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* SettleUp Modal */}
      <SettleUpModal
        visible={settleUpModalVisible}
        onClose={() => setSettleUpModalVisible(false)}
        groupId={groupId}
        navigation={navigation}
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