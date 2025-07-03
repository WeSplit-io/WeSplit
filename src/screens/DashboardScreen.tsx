import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './DashboardScreen.styles';
import AuthGuard from '../components/AuthGuard';
import Icon from '../components/Icon';
import NavBar from '../components/NavBar';
import { useApp } from '../context/AppContext';
import { getUserGroups, Group, getGroupMembers, GroupMember } from '../services/groupService';
import { getGroupExpenses, Expense } from '../services/expenseService';
import { formatCryptoAmount } from '../utils/cryptoUtils';
import { getTotalSpendingInUSDC } from '../services/priceService';

interface ExtendedExpense extends Expense {
  splitData?: string; // JSON string containing split information
}

const DashboardScreen: React.FC<any> = ({ navigation }) => {
  const { state, logoutUser } = useApp();
  const { currentUser } = state;
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userBalance, setUserBalance] = useState<{
    totalOwed: number;
    totalOwes: number;
    netBalance: number;
    balanceByCurrency: Record<string, number>;
  }>({
    totalOwed: 0,
    totalOwes: 0,
    netBalance: 0,
    balanceByCurrency: {}
  });
  const [priceLoading, setPriceLoading] = useState(false);

  // Calculate total balance across all groups by currency
  const totalBalanceByCurrency = groups.reduce((acc, group) => {
    group.expenses_by_currency?.forEach(expense => {
      const currency = expense.currency;
      if (!acc[currency]) {
        acc[currency] = 0;
      }
      acc[currency] += expense.total_amount;
    });
    return acc;
  }, {} as Record<string, number>);

  const calculateUserBalanceAcrossGroups = async (userGroups: Group[]) => {
    if (!currentUser?.id || userGroups.length === 0) {
      setUserBalance({
        totalOwed: 0,
        totalOwes: 0,
        netBalance: 0,
        balanceByCurrency: {}
      });
      return;
    }

    try {
      setPriceLoading(true);
      
      let totalOwedUSDC = 0;
      let totalOwesUSDC = 0;
      const balanceByCurrency: Record<string, number> = {};

      // Process each group to calculate user's balance
      for (const group of userGroups) {
        try {
          // Fetch group expenses and members
          const [expenses, members] = await Promise.all([
            getGroupExpenses(group.id.toString()),
            getGroupMembers(group.id.toString())
          ]);

          // Calculate member balances for this group
          const memberBalances = calculateMemberBalances(expenses as ExtendedExpense[], members);
          const userMemberBalance = memberBalances[Number(currentUser.id)];

          if (userMemberBalance) {
            // Convert each currency balance to USDC
            for (const [currency, netAmount] of Object.entries(userMemberBalance.netBalance)) {
              if (netAmount !== 0) {
                try {
                  // Convert to USDC using price service
                  const usdcAmount = await getTotalSpendingInUSDC([{
                    amount: Math.abs(netAmount),
                    currency: currency
                  }]);
                  
                  // Maintain the sign (positive if owed, negative if owes)
                  const signedUSDCAmount = netAmount > 0 ? usdcAmount : -usdcAmount;
                  
                  if (!balanceByCurrency[currency]) {
                    balanceByCurrency[currency] = 0;
                  }
                  balanceByCurrency[currency] += netAmount;
                  
                  // Add to total USDC amounts
                  if (signedUSDCAmount > 0) {
                    totalOwedUSDC += signedUSDCAmount;
                  } else {
                    totalOwesUSDC += Math.abs(signedUSDCAmount);
                  }
                } catch (error) {
                  console.error(`Error converting ${currency} to USDC:`, error);
                  // Fallback conversion rates
                  const fallbackRate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
                  const usdcAmount = Math.abs(netAmount) * fallbackRate;
                  const signedUSDCAmount = netAmount > 0 ? usdcAmount : -usdcAmount;
                  
                  if (signedUSDCAmount > 0) {
                    totalOwedUSDC += signedUSDCAmount;
                  } else {
                    totalOwesUSDC += Math.abs(signedUSDCAmount);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error processing group ${group.id}:`, error);
        }
      }

      const netBalanceUSDC = totalOwedUSDC - totalOwesUSDC;

      setUserBalance({
        totalOwed: totalOwedUSDC,
        totalOwes: totalOwesUSDC,
        netBalance: netBalanceUSDC,
        balanceByCurrency
      });

    } catch (error) {
      console.error('Error calculating user balance:', error);
      setUserBalance({
        totalOwed: 0,
        totalOwes: 0,
        netBalance: 0,
        balanceByCurrency: {}
      });
    } finally {
      setPriceLoading(false);
    }
  };

  const calculateMemberBalances = (expenses: ExtendedExpense[], members: GroupMember[]) => {
    const balances: Record<number, { 
      owes: Record<string, number>; 
      owed: Record<string, number>; 
      netBalance: Record<string, number>;
      totalOwes: number;
      totalOwed: number;
      balance: number;
    }> = {};
    
    // Initialize balances for all members
    members.forEach(member => {
      balances[member.id] = { 
        owes: {}, 
        owed: {}, 
        netBalance: {},
        totalOwes: 0,
        totalOwed: 0,
        balance: 0
      };
    });
    
    // Calculate what each member owes and is owed based on split data
    expenses.forEach(expense => {
      const paidBy = expense.paid_by;
      const currency = expense.currency || 'SOL';
      const amount = expense.amount;
      
      // Parse split data if it exists
      let splitData;
      try {
        splitData = expense.splitData ? JSON.parse(expense.splitData) : null;
      } catch (e) {
        console.warn('Failed to parse split data:', expense.splitData);
        splitData = null;
      }
      
      // Determine who owes what based on split type
      let membersInSplit = [];
      let amountPerPerson = 0;
      
      if (splitData && splitData.memberIds) {
        // Use the specific member IDs from split data
        membersInSplit = splitData.memberIds;
        amountPerPerson = splitData.amountPerPerson || (amount / membersInSplit.length);
      } else {
        // Fallback: split equally among all group members
        membersInSplit = members.map(m => m.id);
        amountPerPerson = amount / membersInSplit.length;
      }
      
      // Initialize currency tracking if not exists
      members.forEach(member => {
        if (!balances[member.id].owes[currency]) {
          balances[member.id].owes[currency] = 0;
          balances[member.id].owed[currency] = 0;
          balances[member.id].netBalance[currency] = 0;
        }
      });
      
      // The person who paid should be reimbursed by the selected members
      membersInSplit.forEach((memberId: number) => {
        if (memberId !== paidBy) {
          // Each selected member owes their share to the payer
          balances[memberId].owes[currency] += amountPerPerson;
          // The payer is owed this amount from each selected member
          balances[paidBy].owed[currency] += amountPerPerson;
        }
      });
    });
    
    // Calculate net balances and totals (converting to SOL for display)
    Object.keys(balances).forEach(memberId => {
      const id = parseInt(memberId);
      let totalOwes = 0;
      let totalOwed = 0;
      
      Object.keys(balances[id].owes).forEach(currency => {
        const owes = balances[id].owes[currency] || 0;
        const owed = balances[id].owed[currency] || 0;
        balances[id].netBalance[currency] = owed - owes;
        
        // For display purposes, convert to SOL (simplified - in real app you'd use exchange rates)
        const conversionRate = currency === 'SOL' ? 1 : (currency === 'USDC' ? 0.005 : 1); // Example rates
        totalOwes += owes * conversionRate;
        totalOwed += owed * conversionRate;
      });
      
      balances[id].totalOwes = totalOwes;
      balances[id].totalOwed = totalOwed;
      balances[id].balance = totalOwed - totalOwes; // Positive = owed money, negative = owes money
    });
    
    return balances;
  };

  const loadGroups = async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoading(true);
      const userGroups = await getUserGroups(currentUser.id);
      setGroups(userGroups);
      
      // Calculate user's personal balance across all groups
      await calculateUserBalanceAcrossGroups(userGroups);
      
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  useEffect(() => {
    loadGroups();
  }, [currentUser?.id]);

  // Refresh groups when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser?.id) {
        loadGroups();
      }
    }, [currentUser?.id])
  );

  const renderBalanceDisplay = () => {
    if (priceLoading) {
      return (
        <View style={styles.priceLoadingContainer}>
          <ActivityIndicator size="small" color="#212121" />
          <Text style={styles.priceLoadingText}>Calculating balance...</Text>
        </View>
      );
    }

    const { netBalance } = userBalance;
    
    if (netBalance === 0) {
      return <Text style={[styles.balanceAmount, { color: '#212121' }]}>Settled up! 🎉</Text>;
    } else if (netBalance > 0) {
      // User is owed money - dark text on green background
      return (
        <View>
          <Text style={[styles.balanceAmount, { color: '#212121' }]}>
            +{formatCryptoAmount(netBalance, 'USDC')}
          </Text>
          <Text style={[styles.balanceLabel, { fontSize: 12, marginTop: 4, color: '#212121' }]}>
            You are owed money
          </Text>
        </View>
      );
    } else {
      // User owes money - white text, card background will be red
      return (
        <View>
          <Text style={[styles.balanceAmount, { color: '#fff' }]}>
            {formatCryptoAmount(netBalance, 'USDC')}
          </Text>
          <Text style={[styles.balanceLabel, { fontSize: 12, marginTop: 4, color: '#fff' }]}>
            You owe money
          </Text>
        </View>
      );
    }
  };

  const getBalanceCardStyle = () => {
    const { netBalance } = userBalance;
    
    if (netBalance < 0) {
      // Red background for negative balance
      return [styles.balanceCard, { backgroundColor: '#F44336' }];
    } else {
      // Green background for positive or zero balance
      return styles.balanceCard;
    }
  };

  return (
    <AuthGuard navigation={navigation}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome</Text>
            <Text style={styles.userName}>{currentUser?.name || 'User'}!</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={styles.bellContainer}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Image source={require('../../assets/mail.png')} style={styles.bellIcon} />
              <View style={styles.bellDot} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ marginLeft: 16, padding: 8 }}
              onPress={() => {
                logoutUser();
                navigation.replace('Auth');
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14 }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <View style={getBalanceCardStyle()}>
          <Text style={[styles.balanceLabel, { color: userBalance.netBalance < 0 ? '#fff' : '#212121' }]}>
            Your Balance
          </Text>
          {renderBalanceDisplay()}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.depositButton} onPress={() => navigation.navigate('Deposit')}>
            <Text style={styles.depositText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.withdrawButton} onPress={() => navigation.navigate('Balance')}>
            <Text style={styles.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* Groups Header */}
        <View style={styles.groupsHeader}>
          <Text style={styles.groupsLabel}>Groups</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateGroup')}>
            <Text style={styles.addGroupText}>+ Add Group</Text>
          </TouchableOpacity>
        </View>

        {/* Groups List */}
        <ScrollView 
          style={styles.groupsList} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading groups...</Text>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No groups yet</Text>
              <Text style={styles.emptyStateSubtext}>Create your first group to get started</Text>
            </View>
          ) : (
            groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                onPress={() => navigation.navigate('GroupDetails', { groupId: group.id })}
                activeOpacity={0.8}
              >
                <View style={styles.groupTitleRow}>
                  <View style={styles.groupCheckbox} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupTitle}>{group.name}</Text>
                    <Text style={styles.groupDate}>{new Date(group.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</Text>
                  </View>
                  <View style={styles.groupCheckboxRight} />
                </View>
                <View style={styles.groupDivider} />
                <View style={styles.groupCostRow}>
                  <Text style={styles.groupCostLabel}>Total Cost :</Text>
                  {group.expenses_by_currency && group.expenses_by_currency.length > 0 ? (
                    group.expenses_by_currency.map((expense, index) => (
                      <Text key={expense.currency} style={styles.groupCostValue}>
                        {formatCryptoAmount(expense.total_amount, expense.currency)}
                        {index < group.expenses_by_currency.length - 1 ? ' + ' : ''}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.groupCostValue}>$0.00 USDC</Text>
                  )}
                </View>
                <View style={styles.groupCostRow}>
                  <Text style={styles.groupCostLabel}>Members :</Text>
                  <Text style={styles.groupCostValueGreen}>{group.member_count} people</Text>
                </View>
                <View style={styles.avatarsRow}>
                  <Text style={styles.morePeopleText}>{group.expense_count} expenses</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateGroup')}>
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Navigation Bar */}
        <NavBar onNavigate={(screen) => navigation.navigate(screen)} />
      </SafeAreaView>
    </AuthGuard>
  );
};

export default DashboardScreen;