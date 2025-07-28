import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '../../components/Icon';
import GroupIcon from '../../components/GroupIcon';
import { useApp } from '../../context/AppContext';
import { useGroupData } from '../../hooks/useGroupData';
import { useWallet } from '../../context/WalletContext';
import { getTotalSpendingInUSDC, convertToUSDC } from '../../services/priceService';
import { firebaseDataService } from '../../services/firebaseDataService';
import { GroupWithDetails, Expense, GroupMember, Balance } from '../../types';
import { calculateGroupBalances, CalculatedBalance } from '../../utils/balanceCalculator';
import SettleUpModal from '../SettleUp/SettleUpModal';
import { colors } from '../../theme';
import { styles } from './styles';

const GroupDetailsScreen: React.FC<any> = ({ navigation, route }) => {
  // Validate and extract groupId from route params
  const groupId = route.params?.groupId;

  // Early return if groupId is missing
  if (!groupId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Invalid Group</Text>
          <Text style={styles.errorMessage}>Group ID is missing. Please try navigating back and selecting a group again.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { state, getGroupBalances } = useApp();
  const { currentUser } = state;

  const {
    group,
    loading: groupLoading,
    error: groupError,
    refresh,
    totalExpenses,
    totalAmount,
    memberCount
  } = useGroupData(groupId);

  const [activeTab, setActiveTab] = useState<'expenses' | 'settleup'>('expenses');
  const [settleUpModalVisible, setSettleUpModalVisible] = useState(false);

  // State for real member balances
  const [realGroupBalances, setRealGroupBalances] = useState<Balance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  // State for individual expenses (sorted by date)
  const [individualExpenses, setIndividualExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // State for real members
  const [realMembers, setRealMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Refresh functionality
  const [refreshing, setRefreshing] = useState(false);

  // Error state
  const [dataError, setDataError] = useState<string | null>(null);

  // Prevent infinite loops by tracking if we've already loaded data
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Load real balance data function with comprehensive error handling
  const loadRealBalances = useCallback(async () => {
    if (!groupId) {
      setDataError('Group ID is missing');
      return;
    }

    // Prevent multiple simultaneous loads
    if (loadingBalances || loadingExpenses || loadingMembers) {
      return;
    }

    setLoadingBalances(true);
    setLoadingExpenses(true);
    setLoadingMembers(true);
    setDataError(null);

    try {
      // Load members and expenses in parallel
      const [members, expenses] = await Promise.all([
        firebaseDataService.group.getGroupMembers(groupId.toString(), false, currentUser?.id ? String(currentUser.id) : undefined),
        firebaseDataService.expense.getGroupExpenses(groupId.toString())
      ]);

      // Validate and sort expenses by date (newest first)
      const sortedExpenses = expenses
        .filter((expense: Expense) => expense && expense.id && expense.amount !== undefined)
        .sort((a: Expense, b: Expense) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Newest first
        });

      setIndividualExpenses(sortedExpenses);
      setRealMembers(members);

      // Handle case where group has 0 members or expenses
      if (members.length === 0) {
        setRealGroupBalances([]);
        setHasLoadedData(true);
        return;
      }

      if (sortedExpenses.length === 0) {
        const zeroBalances = members.map(member => ({
          userId: member.id,
          userName: member.name,
          userAvatar: member.avatar,
          amount: 0,
          currency: group?.currency || 'SOL',
          status: 'settled' as const
        }));
        setRealGroupBalances(zeroBalances);
        setHasLoadedData(true);
        return;
      }

      // Create a group object for the unified calculator
      const groupForCalculation: GroupWithDetails = {
        id: group?.id || groupId,
        name: group?.name || '',
        description: group?.description || '',
        category: group?.category || 'general',
        currency: group?.currency || 'SOL',
        icon: group?.icon || 'people',
        color: group?.color || '#A5EA15',
        created_by: group?.created_by || '',
        created_at: group?.created_at || new Date().toISOString(),
        updated_at: group?.updated_at || new Date().toISOString(),
        member_count: group?.member_count || members.length,
        expense_count: group?.expense_count || sortedExpenses.length,
        expenses_by_currency: group?.expenses_by_currency || [],
        members,
        expenses: sortedExpenses,
        totalAmount: group?.totalAmount || 0,
        userBalance: group?.userBalance || 0
      };

      const balances = await calculateGroupBalances(groupForCalculation, {
        normalizeToUSDC: false,
        includeZeroBalances: true,
        currentUserId: currentUser?.id?.toString()
      });

      setRealGroupBalances(balances);
      setHasLoadedData(true);


    } catch (error) {
      console.error('❌ GroupDetailsScreen: Error loading real balances:', error);
      setDataError('Failed to load group data. Please try again.');

      // Fallback to context balances
      try {
        const balances = await getGroupBalances(groupId);
        setRealGroupBalances(balances);
        setHasLoadedData(true);
      } catch (fallbackError) {
        console.error('❌ GroupDetailsScreen: Fallback balance loading failed:', fallbackError);
        setRealGroupBalances([]);
        setDataError('Unable to load group data. Please refresh the screen.');
        setHasLoadedData(true);
      }
    } finally {
      setLoadingBalances(false);
      setLoadingExpenses(false);
      setLoadingMembers(false);
    }
  }, [groupId, currentUser?.id, group, getGroupBalances, loadingBalances, loadingExpenses, loadingMembers]);

  // Handle refresh with proper error handling
  const handleRefresh = useCallback(async () => {
    if (!groupId) return;

    setRefreshing(true);
    setDataError(null);
    setHasLoadedData(false);

    try {
      // Refresh group data
      await refresh();

      // Load real balances
      await loadRealBalances();

    } catch (error) {
      console.error('❌ GroupDetailsScreen: Error during refresh:', error);
      setDataError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [groupId, refresh]); // Removed loadRealBalances from dependencies

  // Load data on mount only once
  useEffect(() => {
    if (groupId && !hasLoadedData && !groupLoading) {
      loadRealBalances();
    }
  }, [groupId, hasLoadedData, groupLoading]); // Removed loadRealBalances from dependencies

  // Also load group data if not available
  useEffect(() => {
    if (groupId && !group && !groupLoading) {
      // The useGroupData hook should handle this, but let's ensure it's triggered
    }
  }, [groupId, group, groupLoading]);

  // Refresh group data when screen comes into focus (e.g., after accepting invitation)
  useFocusEffect(
    useCallback(() => {
      if (groupId && !groupLoading) {
        // Only refresh if we don't have data yet or if group is not loaded
        if (!hasLoadedData || !group) {
          refresh();
        }
      }
    }, [groupId, groupLoading, hasLoadedData, group, refresh])
  );

  // Calculate current user balance
  const currentUserBalance = useMemo(() => {
    if (!currentUser?.id || realGroupBalances.length === 0) return null;

    // Try multiple ways to find the current user's balance
    const currentUserId = String(currentUser.id);
    let balance = realGroupBalances.find((b: Balance) => b.userId === currentUserId);

    if (!balance) {
      // Try with numeric ID
      balance = realGroupBalances.find((b: Balance) => b.userId === String(Number(currentUserId)));
    }

    if (!balance) {
      // Try finding by user name if it contains "You" or matches current user name
      balance = realGroupBalances.find((b: Balance) =>
        b.userName === 'You' || b.userName === currentUser.name || b.userName === currentUser.email
      );
    }

    return balance;
  }, [realGroupBalances, currentUser?.id, currentUser?.name, currentUser?.email]);

  // Calculate group summary
  const getGroupSummary = useMemo(() => {
    if (!group) {
      return {
        totalAmountUSD: 0,
        totalAmountDisplay: '$0.00',
        memberCount: 0,
        expenseCount: 0,
        userPaidUSD: 0,
        userOwesUSD: 0,
        settlementProgress: 0,
        loading: false
      };
    }

    try {
      // Use expenses_by_currency data for accurate totals
      let expensesByCurrency = group.expenses_by_currency || [];
      let totalAmountUSD = 0;
      let totalAmountDisplay = '0.00';

      // If expenses_by_currency is empty but we have individual expenses, calculate from them
      if (expensesByCurrency.length === 0 && individualExpenses.length > 0) {
        const currencyTotals = individualExpenses.reduce((acc, expense) => {
          if (!expense || expense.amount === undefined) return acc;
          const currency = expense.currency || 'SOL';
          acc[currency] = (acc[currency] || 0) + (expense.amount || 0);
          return acc;
        }, {} as Record<string, number>);

        expensesByCurrency = Object.entries(currencyTotals).map(([currency, total]) => ({
          currency,
          total_amount: total as number
        }));
      }

      if (expensesByCurrency.length > 0) {
        // Convert all currencies to USD for display
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

      // Calculate total amount the current user actually paid
      if (currentUser?.id && individualExpenses.length > 0) {
        const currentUserId = String(currentUser.id);
        const userPaidExpenses = individualExpenses.filter(expense =>
          expense && String(expense.paid_by) === currentUserId
        );

        userPaidUSD = userPaidExpenses.reduce((sum, expense) => {
          if (!expense || expense.amount === undefined) return sum;
          const currency = expense.currency || 'SOL';
          const amount = expense.amount || 0;

          // Convert to USD for display
          const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
          return sum + (amount * rate);
        }, 0);
      }

      // Calculate how much the user owes based on their share vs what they paid
      if (currentUser?.id && individualExpenses.length > 0) {
        const totalExpenseAmount = individualExpenses.reduce((sum, expense) => {
          if (!expense || expense.amount === undefined) return sum;
          const currency = expense.currency || 'SOL';
          const amount = expense.amount || 0;
          const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
          return sum + (amount * rate);
        }, 0);

        const memberCount = group.member_count || 1;
        const sharePerPerson = totalExpenseAmount / memberCount;

        // If user paid more than their share, they don't owe anything
        if (userPaidUSD > sharePerPerson) {
          userOwesUSD = 0;
        } else {
          // User owes the difference
          userOwesUSD = sharePerPerson - userPaidUSD;
        }
      }

      // Calculate settlement progress based on how much has been settled vs total
      let settlementProgress = 0;
      if (realGroupBalances.length > 0) {
        const totalSettled = realGroupBalances.filter(balance => Math.abs(balance.amount) < 0.01).length;
        settlementProgress = (totalSettled / realGroupBalances.length) * 100;
      } else if (totalAmountUSD > 0) {
        // Fallback: assume some progress based on total amount
        settlementProgress = Math.min(50, (totalAmountUSD / 1000) * 100); // Assume 50% max for demo
      }

      return {
        totalAmountUSD,
        totalAmountDisplay,
        memberCount: group.member_count || 0,
        expenseCount: group.expense_count || 0,
        userPaidUSD,
        userOwesUSD,
        settlementProgress,
        loading: loadingBalances || loadingExpenses
      };
    } catch (error) {
      console.error('❌ GroupDetailsScreen: Error calculating group summary:', error);
      return {
        totalAmountUSD: 0,
        totalAmountDisplay: '$0.00',
        memberCount: group?.member_count || 0,
        expenseCount: group?.expense_count || 0,
        userPaidUSD: 0,
        userOwesUSD: 0,
        settlementProgress: 0,
        loading: false
      };
    }
  }, [
    group?.expenses_by_currency,
    group?.member_count,
    group?.expense_count,
    currentUserBalance?.amount,
    currentUserBalance?.currency,
    loadingBalances,
    loadingExpenses,
    realGroupBalances.length,
    currentUser?.id,
    currentUser?.name,
    individualExpenses
  ]);

  // Function to get user avatar for expense
  const getUserAvatarForExpense = useCallback((expense: Expense) => {
    if (!expense || !expense.paid_by) return null;

    // First, try to find the user in realMembers
    const paidByUser = realMembers.find(member => String(member.id) === String(expense.paid_by));
    if (paidByUser && paidByUser.avatar && paidByUser.avatar.trim() !== '') {
      return paidByUser.avatar;
    }

    // If not found in realMembers, try to find in group members
    if (group?.members) {
      const groupMember = group.members.find(member => String(member.id) === String(expense.paid_by));
      if (groupMember && groupMember.avatar && groupMember.avatar.trim() !== '') {
        return groupMember.avatar;
      }
    }

    return null;
  }, [realMembers, group?.members]);

  // Function to get user name for expense
  const getUserNameForExpense = useCallback((expense: Expense) => {
    if (!expense || !expense.paid_by) return 'Someone';

    // First, try to find the user in realMembers
    const paidByUser = realMembers.find(member => String(member.id) === String(expense.paid_by));
    if (paidByUser) {
      return paidByUser.name || 'Someone';
    }

    // If not found in realMembers, try to find in group members
    if (group?.members) {
      const groupMember = group.members.find(member => String(member.id) === String(expense.paid_by));
      if (groupMember) {
        return groupMember.name || 'Someone';
      }
    }

    return expense.paid_by_name || 'Someone';
  }, [realMembers, group?.members]);

  // Function to render avatar for expense
  const renderExpenseAvatar = useCallback((expense: Expense) => {
    const avatar = getUserAvatarForExpense(expense);
    const userName = getUserNameForExpense(expense);

    if (avatar) {
      return (
        <Image
          source={{ uri: avatar }}
          style={styles.expenseAvatarImage}
          defaultSource={require('../../../assets/user.png')}
        />
      );
    }

    // Fallback to icon with user initial
    return (
      <View style={styles.expenseAvatar}>
        <Text style={styles.expenseAvatarText}>
          {userName.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }, [getUserAvatarForExpense, getUserNameForExpense]);

  // Function to render dynamic balance avatar based on balance status
  const renderBalanceAvatar = useCallback((balance: Balance, isCurrentUser: boolean = false) => {
    // Get user avatar if available
    const user = realMembers.find(member => String(member.id) === String(balance.userId));
    const avatar = user?.avatar;
    const userName = user?.name || balance.userName || 'User';

    if (avatar && avatar.trim() !== '') {
      return (
        <View style={styles.memberBalanceAvatar}>
          <Image
            source={{ uri: avatar }}
            style={styles.memberBalanceAvatarImage}
            defaultSource={require('../../../assets/user.png')}
          />
        </View>
      );
    }

    // Fallback to initial with neutral color
    return (
      <View style={styles.memberBalanceAvatar}>
        <Text style={styles.memberBalanceAvatarText}>
          {userName.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }, [realMembers]);

  // Show loading state while group is loading or if we don't have group data yet
  if (groupLoading || !group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>
            {groupLoading ? 'Loading group details...' : 'Loading group data...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if group failed to load
  if (groupError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Failed to Load Group</Text>
          <Text style={styles.errorMessage}>{groupError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setHasLoadedData(false);
              setDataError(null);
              refresh();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if group is not found
  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Group Not Found</Text>
          <Text style={styles.errorMessage}>The group you're looking for doesn't exist or you don't have access to it.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Handle case where group has no members
  if (realMembers.length === 0 && !loadingMembers) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="people" size={48} color="#A89B9B" />
          <Text style={styles.errorTitle}>No Members Found</Text>
          <Text style={styles.errorMessage}>
            This group has no members. Please add members to get started.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.navigate('AddMembers', { groupId })}
          >
            <Text style={styles.retryButtonText}>Add Members</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={styles.backButton}>
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group details</Text>
        <TouchableOpacity onPress={() => navigation.navigate('GroupSettings', { groupId })}>
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


        {/* Total Spending Card */}
        <View style={styles.totalSpendingCard}>
          {/* Active Status Badge */}
          <View style={styles.activeStatusContainer}>
            <View style={styles.activeStatusDot} />
            <Text style={styles.activeStatusText}>Active</Text>
          </View>

          {/* Group Icon Badge */}
          <View style={styles.groupIconBadgeContainer}>
            <GroupIcon
              category={group?.category || 'trip'}
              color={group?.color || '#A5EA15'}
              size={48}
            />
          </View>

          {/* Event Name */}
          <Text style={styles.eventName}>{group.name}</Text>

          {/* Spending and Progress Row */}
          <View style={styles.spendingProgressRow}>
            {/* Left side - Total spending */}
            <View style={styles.spendingInfo}>
              <Text style={styles.spendingLabel}>Total spending</Text>
              <View style={styles.spendingAmountContainer}>
                <Image source={require('../../../assets/usdc-logo-black.png')} style={styles.spendingAmountIcon} />
                <Text style={styles.spendingAmount}>
                  {getGroupSummary.totalAmountDisplay || '$0.00'}
                </Text>
              </View>
            </View>

            {/* Right side - Circular progress */}
            <View style={styles.circularProgressContainer}>
              <View style={styles.circularProgress}>
                <View style={[
                  styles.circularProgressFill,
                  {
                    transform: [
                      { rotate: `${Math.min(360, Math.max(0, (getGroupSummary.settlementProgress || 0) * 3.6))}deg` }
                    ]
                  }
                ]} />
                <Text style={styles.circularProgressText}>
                  {Math.round(getGroupSummary.settlementProgress || 0)}%
                </Text>
              </View>
              <Text style={styles.circularProgressLabel}>Settlement progress</Text>
            </View>
          </View>
        </View>

        {/* Balance Cards and Progress Bar - Unified Design */}
        <View style={styles.balanceProgressContainer}>
          <View style={styles.balanceCards}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Total you paid</Text>
              <Text style={styles.balanceAmount}>
                ${(getGroupSummary.userPaidUSD || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.balanceCardLeft}>
              <Text style={styles.balanceLabel}>You owe</Text>
              <Text style={styles.balanceAmount}>
                ${(getGroupSummary.userOwesUSD || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              {/* Green section for "Total you paid" */}
              {getGroupSummary.userPaidUSD > 0 && (
                <View
                  style={[
                    styles.progressBarFillGreen,
                    {
                      width: `${Math.min(100, Math.max(0, (getGroupSummary.userPaidUSD / Math.max(1, getGroupSummary.userPaidUSD + getGroupSummary.userOwesUSD)) * 100)) || 0}%`
                    }
                  ]}
                />
              )}
              {/* Red section for "You owe" */}
              {getGroupSummary.userOwesUSD > 0 && (
                <View
                  style={[
                    styles.progressBarFillRed,
                    {
                      width: `${Math.min(100, Math.max(0, (getGroupSummary.userOwesUSD / Math.max(1, getGroupSummary.userPaidUSD + getGroupSummary.userOwesUSD)) * 100)) || 0}%`,
                      left: `${Math.min(100, Math.max(0, (getGroupSummary.userPaidUSD / Math.max(1, getGroupSummary.userPaidUSD + getGroupSummary.userOwesUSD)) * 100)) || 0}%`
                    }
                  ]}
                />
              )}
              {/* White slider positioned at the boundary between green and red */}
              {(getGroupSummary.userPaidUSD > 0 || getGroupSummary.userOwesUSD > 0) && (
                <View
                  style={[
                    styles.progressBarThumb,
                    {
                      left: `${Math.min(100, Math.max(0, (getGroupSummary.userPaidUSD / Math.max(1, getGroupSummary.userPaidUSD + getGroupSummary.userOwesUSD)) * 100)) || 0}%`
                    }
                  ]}
                />
              )}
            </View>
          </View>
        </View>

        {/* Settlement Cards - New Design */}
        {(getGroupSummary.userOwesUSD > 0 || getGroupSummary.userPaidUSD > 0) && (
          <View style={styles.settlementCardsContainer}>
            {/* Case 1: Both conditions (You owe AND We owe you) - Show 2 cards side by side */}
            {getGroupSummary.userOwesUSD > 0 && getGroupSummary.userPaidUSD > 0 ? (
              <View style={styles.settlementCardsRow}>
                {/* Card 1: You owe money */}
                <TouchableOpacity
                  style={styles.settlementCardGreen}
                  onPress={() => setSettleUpModalVisible(true)}
                >
                  <View style={styles.settlementCardInfos}>
                    <View style={styles.settlementCardIcon}>
                      <Image source={require('../../../assets/icon-send.png')} style={{ width: 20, height: 20 }} />

                    </View>
                    <View style={styles.settlementCardContent}>
                      <Text style={styles.settlementCardTitleBlack}>
                        You owe ${getGroupSummary.userOwesUSD.toFixed(2)}
                      </Text>
                      <Text style={styles.settlementCardSubtitleBlack}>
                        See how you need to settle
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.settlementCardButton}
                    onPress={() => setSettleUpModalVisible(true)}
                  >
                    <Text style={styles.settlementCardButtonText}>Settle</Text>
                    <Icon name="chevron-right" size={16} color="#FFF" />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Card 2: We owe you money */}
                <TouchableOpacity
                  style={styles.settlementCardGrey}
                  onPress={() => setSettleUpModalVisible(true)}
                >
                  <View style={styles.settlementCardInfos}>
                    <View style={styles.settlementCardIcon}>
                      <Image source={require('../../../assets/icon-receive.png')} style={{ width: 20, height: 20 }} />

                    </View>
                    <View style={styles.settlementCardContent}>
                      <Text style={styles.settlementCardTitle}>
                        We owe you ${getGroupSummary.userPaidUSD.toFixed(2)}
                      </Text>
                      <Text style={styles.settlementCardSubtitle}>
                        Remind your friends
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.settlementCardButton}
                    onPress={() => setSettleUpModalVisible(true)}
                  >
                    <Text style={styles.settlementCardButtonText}>Settle</Text>
                    <Icon name="chevron-right" size={16} color="#FFF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            ) : (
              /* Case 2: Single condition - Use current design */
              <>
                {/* Card 1: You owe money */}
                {getGroupSummary.userOwesUSD > 0 && (
                  <TouchableOpacity
                    style={styles.settlementCard}
                    onPress={() => setSettleUpModalVisible(true)}
                  >
                    <View style={styles.settlementCardSmallInfos}>
                    <View style={styles.settlementAvatar}>
                      <Image source={require('../../../assets/icon-send.png')} style={{ width: 20, height: 20 }} />
                    </View>
                    <View style={styles.settlementInfo}>
                      <Text style={styles.settlementTitleBlack}>
                        You owe ${getGroupSummary.userOwesUSD.toFixed(2)}
                      </Text>
                      <Text style={styles.settlementSubtitleBlack}>Tap to see settlement options</Text>
                    </View>
                    </View>

                    <View>
                      <Icon name="chevron-right" size={20} color="#000" />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Card 2: We owe you money */}
                {getGroupSummary.userPaidUSD > 0 && (
                  <TouchableOpacity
                    style={styles.settlementCardSmallGrey}
                    onPress={() => setSettleUpModalVisible(true)}
                  >
                    <View style={styles.settlementCardSmallInfos}>
                      <View style={styles.settlementAvatar}>
                        <Image source={require('../../../assets/icon-receive.png')} style={{ width: 20, height: 20 }} />
                      </View>
                      <View style={styles.settlementInfo}>
                        <Text style={styles.settlementTitle}>
                          You're owed ${getGroupSummary.userPaidUSD.toFixed(2)}
                        </Text>
                        <Text style={styles.settlementSubtitle}>Tap to send payment reminders</Text>
                      </View>
                    </View>

                    <View>
                      <Icon name="chevron-right" size={20} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

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
              Balance
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
                individualExpenses.map((expense, index) => (
                  <TouchableOpacity key={expense.id || index} onPress={() => {
                    if (__DEV__) {
                      console.log('🔍 Expense clicked:', {
                        expenseId: expense.id,
                        groupId,
                        expense: {
                          id: expense.id,
                          description: expense.description,
                          amount: expense.amount,
                          currency: expense.currency
                        }
                      });
                    }
                    navigation.navigate('EditExpense', { groupId, expenseId: expense.id });
                  }}>
                    <View style={styles.expenseItem}>
                      {renderExpenseAvatar(expense)}
                      <View style={styles.expenseDetails}>
                        <Text style={styles.expenseDescription}>
                          {getUserNameForExpense(expense)} paid {expense.currency} {expense.amount.toFixed(2)}
                        </Text>
                        <Text style={styles.expenseCategory}>
                          {expense.description}
                        </Text>
                      </View>
                      <View style={styles.expenseAmounts}>
                        <Text style={styles.expenseUserStatus}>
                          {expense.paid_by === currentUser?.id ? 'You paid' : 'You owe'}
                        </Text>
                        <Text style={[
                          styles.expenseUserAmount,
                          expense.paid_by === currentUser?.id ? styles.positiveAmount : styles.negativeAmount
                        ]}>
                          {expense.paid_by === currentUser?.id ? '$' : '$'}{expense.amount.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
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
              {/* Debug info in development */}


              {/* Balance Section */}
              <View style={styles.balanceSection}>
                {/* Show current user's balance in USD */}
                {currentUserBalance && (
                  <View style={styles.memberBalanceItem}>
                    {renderBalanceAvatar(currentUserBalance, true)}
                    <View style={styles.memberBalanceInfo}>
                      <Text style={styles.memberBalanceName}>You</Text>
                    </View>
                    <Text style={[
                      styles.memberBalanceAmount,
                      currentUserBalance.amount > 0.01 ? styles.memberBalanceAmountPositive :
                      currentUserBalance.amount < -0.01 ? styles.memberBalanceAmountNegative :
                      styles.memberBalanceAmountNeutral
                    ]}>
                      {currentUserBalance.amount > 0
                        ? `+$${Math.abs(currentUserBalance.amount).toFixed(2)}`
                        : currentUserBalance.amount < 0
                          ? `-$${Math.abs(currentUserBalance.amount).toFixed(2)}`
                          : '$0.00'}
                    </Text>
                  </View>
                )}

                {/* Show other members' balances in USD */}
                {realGroupBalances
                  .filter((balance: Balance) => balance.userId !== String(currentUser?.id))
                  .map((balance: Balance, index: number) => {
                    return (
                      <View key={balance.userId || index} style={styles.memberBalanceItem}>
                        {renderBalanceAvatar(balance)}
                        <View style={styles.memberBalanceInfo}>
                          <Text style={styles.memberBalanceName}>{balance.userName}</Text>
                        </View>
                        <Text style={[
                          styles.memberBalanceAmount,
                          balance.amount > 0.01 ? styles.memberBalanceAmountPositive :
                          balance.amount < -0.01 ? styles.memberBalanceAmountNegative :
                          styles.memberBalanceAmountNeutral
                        ]}>
                          {balance.amount > 0
                            ? `+$${Math.abs(balance.amount).toFixed(2)}`
                            : balance.amount < 0
                              ? `-$${Math.abs(balance.amount).toFixed(2)}`
                              : '$0.00'}
                        </Text>
                      </View>
                    );
                  })}
              </View>
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