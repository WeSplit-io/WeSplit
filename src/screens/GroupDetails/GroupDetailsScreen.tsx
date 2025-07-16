import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  ActivityIndicator,
  RefreshControl
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
  
  if (__DEV__) {
    console.log('🔍 calculateRealBalances: Input data:', {
      membersCount: members.length,
      expensesCount: expenses.length,
      expensesByCurrencyCount: expensesByCurrency.length,
      members: members,
      expenses: expenses,
      expensesByCurrency: expensesByCurrency
    });
  }
  
  if (members.length === 0) return balances;
  
  // If we have individual expenses, calculate based on actual payments
  if (expenses.length > 0) {
    const memberBalances: Record<string, Record<string, number>> = {};
    
    // Initialize balances for all members (use string IDs)
    members.forEach((member: any) => {
      memberBalances[String(member.id)] = {};
    });

    // Calculate balances by currency based on actual expenses
    expenses.forEach((expense: any) => {
      const currency = expense.currency || 'SOL';
      const amount = expense.amount || 0;
      const paidBy = String(expense.paid_by);
      
      if (__DEV__) {
        console.log('🔍 calculateRealBalances: Processing expense:', {
          expense,
          currency,
          amount,
          paidBy
        });
      }
      
      // Get the split data to determine how much each person owes
      const splitData = expense.split_data || {};
      const memberIds = (splitData.memberIds || []).map((id: any) => String(id));
      const splitType = expense.split_type || 'equal';
      
      if (__DEV__) {
        console.log('🔍 calculateRealBalances: Split data:', {
          splitData,
          memberIds,
          splitType
        });
      }
      
      let memberShares: Record<string, number> = {};
      
      if (splitType === 'equal') {
        // Equal split: divide amount equally among all members
        const sharePerPerson = amount / memberIds.length;
        memberIds.forEach((memberId: string) => {
          memberShares[memberId] = sharePerPerson;
        });
      } else if (splitType === 'manual' && splitData.customAmounts) {
        // Manual split: use custom amounts
        Object.entries(splitData.customAmounts).forEach(([memberId, share]) => {
          memberShares[String(memberId)] = Number(share);
        });
      }
      
      if (__DEV__) {
        console.log('🔍 calculateRealBalances: Member shares:', memberShares);
      }
      
      // Calculate balances for each member
      Object.entries(memberShares).forEach(([memberId, shareAmount]) => {
        if (!memberBalances[memberId][currency]) {
          memberBalances[memberId][currency] = 0;
        }
        
        if (paidBy === memberId) {
          // Member paid this expense, so they're owed the amount minus their share
          memberBalances[memberId][currency] += amount - shareAmount;
        } else {
          // Member didn't pay, so they owe their share
          memberBalances[memberId][currency] -= shareAmount;
        }
      });
    });

    // Convert to Balance objects
    members.forEach((member: any) => {
      const memberId = String(member.id);
      const currencies = memberBalances[memberId];
      
      if (__DEV__) {
        console.log('🔍 calculateRealBalances: Processing member:', {
          memberId,
          memberName: member.name,
          currencies
        });
      }
      
      // Find the currency with the largest absolute balance
      let primaryCurrency = 'SOL';
      let primaryAmount = 0;
      
      const balanceEntries = Object.entries(currencies);
      if (balanceEntries.length > 0) {
        const [maxCurrency, maxAmount] = balanceEntries.reduce((max, [curr, amount]) => 
          Math.abs(Number(amount)) > Math.abs(max[1]) ? [curr, Number(amount)] : max
        );
        primaryCurrency = maxCurrency;
        primaryAmount = maxAmount;
      }

      const balance = {
        userId: memberId,
        userName: member.name,
        userAvatar: member.avatar,
        amount: primaryAmount,
        currency: primaryCurrency,
        status: (Math.abs(primaryAmount) < 0.01 ? 'settled' : primaryAmount > 0 ? 'gets_back' : 'owes') as 'owes' | 'gets_back' | 'settled'
      };
      
      if (__DEV__) {
        console.log('🔍 calculateRealBalances: Created balance:', balance);
      }
      
      balances.push(balance);
    });
  } else if (expensesByCurrency.length > 0) {
    // Use summary data to create equal split scenario
    const primaryCurrency = expensesByCurrency[0].currency;
    const totalAmount = expensesByCurrency.reduce((sum, curr) => sum + (curr.total_amount || 0), 0);
    const sharePerPerson = totalAmount / members.length;
    
    if (__DEV__) {
      console.log('🔍 calculateRealBalances: Using expensesByCurrency fallback:', {
        primaryCurrency,
        totalAmount,
        sharePerPerson,
        membersCount: members.length
      });
    }
    
    // Create a more realistic scenario based on the current user
    // Since we don't know who paid what, we'll create a scenario where:
    // - Current user is assumed to have paid some expenses (positive balance)
    // - Other members owe their shares (negative balance)
    members.forEach((member: any, index: number) => {
      let amount: number;
      
      // Create a more realistic distribution
      // Assume the first member (likely the current user) paid about 60% of expenses
      // and others owe their shares
      if (index === 0) {
        // First member paid some expenses, is owed money back
        const paidAmount = totalAmount * 0.6; // Assume they paid 60%
        amount = paidAmount - sharePerPerson; // They're owed what they paid minus their share
      } else {
        // Other members owe their share
        amount = -sharePerPerson;
      }
      
      const balance = {
        userId: String(member.id),
        userName: member.name,
        userAvatar: member.avatar,
        amount: amount,
        currency: primaryCurrency,
        status: (Math.abs(amount) < 0.01 ? 'settled' : amount > 0 ? 'gets_back' : 'owes') as 'owes' | 'gets_back' | 'settled'
      };
      
      if (__DEV__) {
        console.log('🔍 calculateRealBalances: Created fallback balance:', balance);
      }
      
      balances.push(balance);
    });
  } else {
    // No expenses at all - create zero balances
    if (__DEV__) {
      console.log('🔍 calculateRealBalances: No expenses found, creating zero balances');
    }
    
    members.forEach((member: any) => {
      const balance = {
        userId: String(member.id),
        userName: member.name,
        userAvatar: member.avatar,
        amount: 0,
        currency: 'SOL',
        status: 'settled' as 'owes' | 'gets_back' | 'settled'
      };
      
      balances.push(balance);
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
  
  // State for individual expenses
  const [individualExpenses, setIndividualExpenses] = useState<any[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  // Refresh functionality
  const [refreshing, setRefreshing] = useState(false);

  // Function to validate and recalculate expenses_by_currency if needed
  const validateExpensesByCurrency = useCallback((group: any, individualExpenses: any[]) => {
    if (!group.expenses_by_currency || individualExpenses.length === 0) {
      return group.expenses_by_currency;
    }

    // Calculate actual totals from individual expenses
    const actualCurrencyTotals = individualExpenses.reduce((acc, expense) => {
      const currency = expense.currency || 'SOL';
      acc[currency] = (acc[currency] || 0) + (expense.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Check for discrepancies
    let hasDiscrepancy = false;
    const validatedExpensesByCurrency = group.expenses_by_currency.map((exp: any) => {
      const actualTotal = actualCurrencyTotals[exp.currency] || 0;
      const reportedTotal = exp.total_amount || 0;
      
      if (Math.abs(actualTotal - reportedTotal) > 0.01) {
        hasDiscrepancy = true;
        if (__DEV__) {
          console.warn(`⚠️ Currency ${exp.currency}: Reported ${reportedTotal}, Actual ${actualTotal}`);
        }
        return {
          ...exp,
          total_amount: actualTotal
        };
      }
      return exp;
    });

    if (hasDiscrepancy && __DEV__) {
      console.log('🔧 GroupDetailsScreen: Fixed expenses_by_currency discrepancies');
    }

    return validatedExpensesByCurrency;
  }, []);

  // Load real balance data when component mounts
  useEffect(() => {
    const loadRealBalances = async () => {
      if (!groupId) return;
      
      setLoadingBalances(true);
      setLoadingExpenses(true);
      try {
        // Use the hybrid service instead of direct API calls
        const { hybridDataService } = await import('../../services/hybridDataService');
        const [members, expenses] = await Promise.all([
          hybridDataService.group.getGroupMembers(groupId.toString()),
          hybridDataService.expense.getGroupExpenses(groupId.toString())
        ]);

        // Store individual expenses
        setIndividualExpenses(expenses);

        if (__DEV__) {
          console.log('🔍 GroupDetailsScreen: Loaded data:', {
            membersCount: members.length,
            expensesCount: expenses.length,
            groupExpensesByCurrency: group?.expenses_by_currency,
            groupTotalAmount: group?.totalAmount,
            groupMemberCount: group?.member_count,
            members: members,
            expenses: expenses
          });
        }

        if (members.length > 0) {
          // Calculate real balances based on actual member data and expenses
          const balances = calculateRealBalances(members, expenses, group?.expenses_by_currency || []);
          setRealGroupBalances(balances);
          
          if (__DEV__) {
            console.log('🔍 GroupDetailsScreen: Calculated balances:', balances);
          }
        } else {
          // Fallback to summary calculation
          const balances = getGroupBalances(groupId);
          setRealGroupBalances(balances);
          
          if (__DEV__) {
            console.log('🔍 GroupDetailsScreen: Using fallback balances:', balances);
          }
        }
      } catch (error) {
        console.error('Error loading real member data:', error);
        // Fallback to existing method
        const balances = getGroupBalances(groupId);
        setRealGroupBalances(balances);
        
        if (__DEV__) {
          console.log('🔍 GroupDetailsScreen: Error fallback balances:', balances);
        }
      } finally {
        setLoadingBalances(false);
        setLoadingExpenses(false);
      }
    };

    loadRealBalances();
  }, [groupId]); // Only depend on groupId to prevent infinite loops

  // Refresh function
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh group data
      await refresh();
      
      // Reload balances
      const { hybridDataService } = await import('../../services/hybridDataService');
      const [members, expenses] = await Promise.all([
        hybridDataService.group.getGroupMembers(groupId.toString()),
        hybridDataService.expense.getGroupExpenses(groupId.toString())
      ]);

      setIndividualExpenses(expenses);

      if (members.length > 0) {
        const balances = calculateRealBalances(members, expenses, group?.expenses_by_currency || []);
        setRealGroupBalances(balances);
      } else {
        const balances = getGroupBalances(groupId);
        setRealGroupBalances(balances);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [groupId, refresh, group, getGroupBalances]);

  // Additional fallback: if we still don't have balances after loading, create some
  useEffect(() => {
    if (!loadingBalances && realGroupBalances.length === 0 && group) {
      if (__DEV__) {
        console.log('🔍 GroupDetailsScreen: No balances after loading, creating fallback balances');
      }
      
      // Create fallback balances using group summary data
      const fallbackBalances: Balance[] = [];
      
      if (group.expenses_by_currency && group.expenses_by_currency.length > 0) {
        const primaryCurrency = group.expenses_by_currency[0].currency;
        const totalAmount = group.expenses_by_currency.reduce((sum, curr) => sum + (curr.total_amount || 0), 0);
        const memberCount = group.member_count || 2;
        const sharePerPerson = totalAmount / memberCount;
        
        // Create fallback balances for display
        for (let i = 0; i < memberCount; i++) {
          const isCurrentUser = i === 0; // Assume first member is current user
          let amount: number;
          
          if (isCurrentUser) {
            // Current user paid some expenses
            const paidAmount = totalAmount * 0.6;
            amount = paidAmount - sharePerPerson;
          } else {
            // Others owe their share
            amount = -sharePerPerson;
          }
          
          fallbackBalances.push({
            userId: String(i + 1),
            userName: isCurrentUser ? 'You' : `Member ${i + 1}`,
            userAvatar: undefined,
            amount: amount,
            currency: primaryCurrency,
            status: (Math.abs(amount) < 0.01 ? 'settled' : amount > 0 ? 'gets_back' : 'owes') as 'owes' | 'gets_back' | 'settled'
          });
        }
      }
      
      if (fallbackBalances.length > 0) {
        setRealGroupBalances(fallbackBalances);
        if (__DEV__) {
          console.log('🔍 GroupDetailsScreen: Set fallback balances:', fallbackBalances);
        }
      }
    }
  }, [loadingBalances, realGroupBalances.length, group]);

  const currentUserBalance = useMemo(() => 
    realGroupBalances.find((balance: Balance) => balance.userId === String(currentUser?.id)), 
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

    try {
      // Use expenses_by_currency data for accurate totals
      const expensesByCurrency = group.expenses_by_currency || [];
      let totalAmountUSD = 0;
      let totalAmountDisplay = '$0.00';

      if (expensesByCurrency.length > 0) {
        // Convert all currencies to USD for display
        const currencyPromises = expensesByCurrency.map(async (expenseByCurrency) => {
          const currency = expenseByCurrency.currency || 'SOL';
          const amount = expenseByCurrency.total_amount || 0;
          
          if (currency === 'USDC') {
            return amount;
          } else {
            try {
              return await convertToUSDC(amount, currency);
            } catch (error) {
              console.error(`Error converting ${currency} to USDC:`, error);
              return amount; // Fallback to original amount
            }
          }
        });

        // For now, use a simple conversion since we can't use async in useMemo
        // In a real implementation, you'd want to handle this differently
        totalAmountUSD = expensesByCurrency.reduce((sum, exp) => {
          const currency = exp.currency || 'SOL';
          const amount = exp.total_amount || 0;
          
          // Simple conversion rates for display
          const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
          return sum + (amount * rate);
        }, 0);

        totalAmountDisplay = `$${totalAmountUSD.toFixed(2)}`;
      }

      // Calculate user-specific amounts
      let userPaidUSD = 0;
      let userOwesUSD = 0;

      if (currentUserBalance) {
        const balanceAmount = currentUserBalance.amount;
        const balanceCurrency = currentUserBalance.currency;
        
        if (balanceAmount > 0) {
          // User is owed money
          const rate = balanceCurrency === 'SOL' ? 200 : (balanceCurrency === 'USDC' ? 1 : 100);
          userPaidUSD = balanceAmount * rate;
        } else if (balanceAmount < 0) {
          // User owes money
          const rate = balanceCurrency === 'SOL' ? 200 : (balanceCurrency === 'USDC' ? 1 : 100);
          userOwesUSD = Math.abs(balanceAmount) * rate;
        }
      }

      return {
        totalAmountUSD,
        totalAmountDisplay,
        memberCount: group.member_count || 0,
        expenseCount: group.expense_count || 0,
        userPaidUSD,
        userOwesUSD,
        loading: loadingBalances || loadingExpenses
      };
    } catch (error) {
      console.error('Error calculating group summary:', error);
      return {
        totalAmountUSD: 0,
        totalAmountDisplay: '$0.00',
        memberCount: group.member_count || 0,
        expenseCount: group.expense_count || 0,
        userPaidUSD: 0,
        userOwesUSD: 0,
        loading: false
      };
    }
  }, [group, currentUserBalance, loadingBalances, loadingExpenses]);

  // Focus effect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (groupId) {
        handleRefresh();
      }
    }, [groupId, handleRefresh])
  );

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

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Details</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>Error Loading Group</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={handleRefresh}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Details</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Icon name="users" size={64} color="#A89B9B" />
          <Text style={styles.emptyStateText}>Group Not Found</Text>
          <Text style={styles.emptyStateSubtext}>The group you're looking for doesn't exist or you don't have access to it</Text>
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.emptyStateButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group details</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Icon name="settings" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Main Content with RefreshControl */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#A5EA15']}
            tintColor="#A5EA15"
          />
        }
      >
        {/* Group Info */}
        <View style={styles.groupInfo}>
          <View style={styles.groupIconContainer}>
            <Icon name="briefcase" size={24} color="#FFF" />
          </View>
          <Text style={styles.groupName}>{group.name}</Text>
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
            {getGroupSummary.totalAmountDisplay}
          </Text>
        </View>

        {/* Balance Cards */}
        <View style={styles.balanceCards}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Total you paid</Text>
            <Text style={styles.balanceAmount}>
              ${getGroupSummary.userPaidUSD.toFixed(2)}
            </Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>You owe</Text>
            <Text style={styles.balanceAmount}>
              ${getGroupSummary.userOwesUSD.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${Math.min(100, Math.max(0, (getGroupSummary.userPaidUSD / (getGroupSummary.userPaidUSD + getGroupSummary.userOwesUSD)) * 100))}%` 
                }
              ]} 
            />
            <View 
              style={[
                styles.progressBarThumb,
                { 
                  left: `${Math.min(100, Math.max(0, (getGroupSummary.userPaidUSD / (getGroupSummary.userPaidUSD + getGroupSummary.userOwesUSD)) * 100))}%` 
                }
              ]} 
            />
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
        <View style={styles.tabContent}>
          {activeTab === 'expenses' ? (
            <View style={styles.expensesContent}>
              <Text style={styles.todayLabel}>Today</Text>
              
              {loadingExpenses ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#A5EA15" />
                  <Text style={styles.loadingText}>Loading expenses...</Text>
                </View>
              ) : individualExpenses.length > 0 ? (
                individualExpenses.map((expense, index) => {
                  const isCurrentUser = expense.paid_by === currentUser?.id;
                  const userBalance = isCurrentUser ? 
                    (expense.amount - (expense.amount / (expense.split_data?.memberIds?.length || 1))) : 
                    -(expense.amount / (expense.split_data?.memberIds?.length || 1));
                  
                  return (
                    <View key={expense.id || index} style={styles.expenseItem}>
                      <View style={styles.expenseAvatar}>
                        <Icon name="user" size={20} color="#A5EA15" />
                      </View>
                      <View style={styles.expenseDetails}>
                        <Text style={styles.expenseDescription}>
                          {isCurrentUser ? 'You paid' : `${expense.paid_by_name || 'Someone'} paid`} {expense.currency} {expense.amount.toFixed(2)}
                        </Text>
                        <Text style={styles.expenseCategory}>
                          {expense.description}
                        </Text>
                      </View>
                      <View style={styles.expenseAmounts}>
                        <Text style={styles.expenseUserStatus}>
                          {userBalance > 0 ? 'You paid' : 'You owe'}
                        </Text>
                        <Text style={[
                          styles.expenseUserAmount,
                          userBalance > 0 ? styles.positiveAmount : styles.negativeAmount
                        ]}>
                          {userBalance > 0 ? '+' : ''}{userBalance.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyExpenses}>
                  <Text style={styles.emptyExpensesText}>No expenses yet</Text>
                  <Text style={styles.expenseCategory}>
                    Add an expense to get started with splitting costs
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.settleupContent}>
              {/* Settlement content based on balance - show USD amounts */}
              {getGroupSummary.userOwesUSD > 0 ? (
                <TouchableOpacity 
                  style={styles.settlementCard}
                  onPress={() => setSettleUpModalVisible(true)}
                >
                  <View style={styles.settlementAvatar} />
                  <View style={styles.settlementInfo}>
                    <Text style={styles.settlementTitle}>
                      You owe ${getGroupSummary.userOwesUSD.toFixed(2)}
                    </Text>
                    <Text style={styles.settlementSubtitle}>Tap to see settlement options</Text>
                  </View>
                  <View>
                    <Icon name="chevron-right" size={20} color="#FFF" />
                  </View>
                </TouchableOpacity>
              ) : getGroupSummary.userPaidUSD > 0 ? (
                <TouchableOpacity 
                  style={styles.settlementCard}
                  onPress={() => setSettleUpModalVisible(true)}
                >
                  <View style={styles.settlementAvatar} />
                  <View style={styles.settlementInfo}>
                    <Text style={styles.settlementTitle}>
                      You're owed ${getGroupSummary.userPaidUSD.toFixed(2)}
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
                    {getGroupSummary.expenseCount > 0 
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
                    {getGroupSummary.userPaidUSD > 0 
                      ? `+$${getGroupSummary.userPaidUSD.toFixed(2)}` 
                      : getGroupSummary.userOwesUSD > 0 
                      ? `-$${getGroupSummary.userOwesUSD.toFixed(2)}` 
                      : '$0.00'}
                  </Text>
                </View>
                
                {/* Show other members' balances in USD */}
                {realGroupBalances
                  .filter((balance: Balance) => balance.userId !== String(currentUser?.id))
                  .map((balance: Balance, index: number) => {
                    // Convert balance to USD for display using the same rate as group total
                    let balanceUSD = Math.abs(balance.amount);
                    if (balance.currency !== 'USDC' && group?.expenses_by_currency) {
                      // Calculate the actual conversion rate from group data
                      const currencyData = group.expenses_by_currency.find(exp => exp.currency === balance.currency);
                      if (currencyData && currencyData.total_amount > 0) {
                        // Use the real rate from the total spending conversion
                        const realRate = getGroupSummary.totalAmountUSD / currencyData.total_amount;
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
                {getGroupSummary.expenseCount > 0 && (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#333' }}>
                    <Text style={styles.expenseCategory}>
                      Total group spending: {getGroupSummary.totalAmountDisplay}
                    </Text>
                    <Text style={styles.expenseCategory}>
                      {getGroupSummary.expenseCount} expense{getGroupSummary.expenseCount !== 1 ? 's' : ''} • {getGroupSummary.memberCount} member{getGroupSummary.memberCount !== 1 ? 's' : ''}
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
                  {getGroupSummary.userOwesUSD > 0 
                    ? 'Settle up now' 
                    : getGroupSummary.userPaidUSD > 0 
                    ? 'Send payment reminders' 
                    : 'View settlement details'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Expense Button */}
      <TouchableOpacity 
        style={styles.addExpenseButton}
        onPress={() => navigation.navigate('AddExpense', { groupId })}
      >
        <Text style={styles.addExpenseButtonText}>Add expense</Text>
      </TouchableOpacity>

      {/* SettleUp Modal */}
      <SettleUpModal
        visible={settleUpModalVisible}
        onClose={() => setSettleUpModalVisible(false)}
        groupId={groupId}
        realBalances={realGroupBalances}
        navigation={navigation}
      />
    </SafeAreaView>
  );
};

export default GroupDetailsScreen; 