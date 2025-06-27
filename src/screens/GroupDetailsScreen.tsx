import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import ExpenseItem from '../components/ExpenseItem';
import AddButton from '../components/AddButton';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';

const GroupDetailsScreen: React.FC<any> = ({ navigation, route }) => {
  const { state, getGroupById, getGroupBalances, getUserBalance, getTotalExpenses } = useApp();
  const { currentUser } = state;
  const groupId = route.params?.groupId;

  const group = getGroupById(groupId);
  
  if (!group) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Details</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Icon name="alert-circle" size={64} color={colors.gray} />
          <Text style={styles.emptyStateText}>Group not found</Text>
          <Text style={styles.emptyStateSubtext}>The group you're looking for doesn't exist</Text>
          <TouchableOpacity 
            style={styles.emptyStateButton} 
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.emptyStateButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const balances = getGroupBalances(group.id);
  const userBalance = getUserBalance(group.id, currentUser?.id || '');
  const totalExpenses = getTotalExpenses(group.id);
  const totalPaid = group.expenses
    .filter(expense => expense.paidBy.id === currentUser?.id)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const totalShare = group.expenses
    .filter(expense => expense.splitBetween.some(member => member.id === currentUser?.id))
    .reduce((sum, expense) => sum + (expense.amount / expense.splitBetween.length), 0);

  const handleAddExpense = () => {
    navigation.navigate('AddExpense');
  };

  const handleViewBalance = () => {
    navigation.navigate('Balance', { groupId: group.id });
  };

  const handleSettleUp = () => {
    navigation.navigate('SettleUpModal', { groupId: group.id });
  };

  const handleGroupSettings = () => {
    navigation.navigate('GroupSettings', { groupId: group.id });
  };

  const handleExpensePress = (expenseId: string) => {
    Alert.alert('Expense Details', 'View and edit expense details');
  };

  // Transform expenses for ExpenseItem component
  const transformedExpenses = group.expenses.map(expense => ({
    id: expense.id,
    payer: expense.paidBy.name,
    payerAvatar: expense.paidBy.avatar,
    description: expense.description,
    date: new Date(expense.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    amount: `${group.currency} ${expense.amount.toFixed(2)}`,
    youLent: expense.paidBy.id === currentUser?.id,
    youOwe: expense.splitBetween.some(member => member.id === currentUser?.id) && expense.paidBy.id !== currentUser?.id,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{group.name}</Text>
        <TouchableOpacity onPress={handleGroupSettings} style={styles.settingsButton}>
          <Icon name="settings" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTotal}>Total spending</Text>
          <Text style={styles.summaryAmount}>{group.currency} {totalExpenses.toFixed(2)}</Text>
          <Text style={[
            styles.summaryOwed,
            { color: userBalance >= 0 ? colors.green : colors.red }
          ]}>
            {userBalance >= 0 ? 'You are owed' : 'You owe'} {group.currency} {Math.abs(userBalance).toFixed(2)} overall
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>You paid</Text>
              <Text style={styles.summaryValue}>{group.currency} {totalPaid.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Your share</Text>
              <Text style={styles.summaryValue}>{group.currency} {totalShare.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleViewBalance}>
            <Icon name="dollar-sign" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>View Balance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleSettleUp}>
            <Icon name="check-circle" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Settle Up</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.backToDashboardButton} 
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Icon name="home" size={20} color={colors.background} />
          <Text style={styles.backToDashboardButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Expenses</Text>
        {transformedExpenses.length > 0 ? (
          transformedExpenses.map((expense, idx) => (
            <TouchableOpacity 
              key={expense.id + idx} 
              onPress={() => handleExpensePress(expense.id)}
              activeOpacity={0.7}
            >
              <ExpenseItem {...expense} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyExpenses}>
            <Icon name="receipt" size={48} color={colors.gray} />
            <Text style={styles.emptyExpensesText}>No expenses yet</Text>
            <Text style={styles.emptyExpensesSubtext}>Add your first expense to get started</Text>
          </View>
        )}
      </ScrollView>
      
      <AddButton onPress={handleAddExpense} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: colors.background,
    borderRadius: radii.card,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryTotal: {
    fontSize: fontSizes.md,
    color: colors.gray,
    fontWeight: fontWeights.medium as any,
  },
  summaryAmount: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginVertical: 4,
  },
  summaryOwed: {
    fontWeight: fontWeights.medium as any,
    fontSize: fontSizes.md,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.gray,
    fontSize: fontSizes.sm,
    marginBottom: 2,
  },
  summaryValue: {
    color: colors.text,
    fontWeight: fontWeights.bold as any,
    fontSize: fontSizes.md,
  },
  actionsRow: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.input,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
  },
  actionButtonText: {
    fontSize: fontSizes.md,
    color: colors.text,
    marginLeft: spacing.sm,
    fontWeight: fontWeights.medium as any,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyExpenses: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyExpensesText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyExpensesSubtext: {
    fontSize: fontSizes.md,
    color: colors.gray,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: fontSizes.md,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
  },
  backToDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.input,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  backToDashboardButtonText: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold as any,
    marginLeft: spacing.sm,
  },
});

export default GroupDetailsScreen; 