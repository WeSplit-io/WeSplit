import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '../../components/Icon';
import GroupIcon from '../../components/GroupIcon';
import { useApp } from '../../context/AppContext';
import { useGroupData } from '../../hooks/useGroupData';
import { useWallet } from '../../context/WalletContext';
import { firebaseDataService } from '../../services/data';
import { GroupWithDetails, Expense, GroupMember, Balance, Transaction } from '../../types';
import { calculateGroupBalances, CalculatedBalance } from '../../utils/balanceCalculator';
import { getOptimizedSettlementTransactions, getUserSettlementTransactions, getUserTotalOwed, getUserTotalOwedTo } from '../../utils/settlementOptimizer';
import SettleUpModal from '../SettleUp/SettleUpModal';
import TransactionModal from '../../components/transactions';
import { colors } from '../../theme';
import { styles } from './styles';
import UserAvatar from '../../components/UserAvatar';
import { DEFAULT_AVATAR_URL } from '../../../config/constants/constants';
import { logger } from '../../services/core';

const GroupDetailsScreen: React.FC<any> = ({ navigation, route }) => {
  // Validate and extract groupId from route params
  const groupId = route.params?.groupId;

  // Navigation params extracted

  // Early return if groupId is missing
  if (!groupId) {
    console.error('❌ GroupDetailsScreen: No groupId provided in route params');
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

  const { state, getGroupBalances, startGroupListener, stopGroupListener } = useApp();
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
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Check if we should show the settle up modal on load
  const shouldShowSettleUpModal = route.params?.showSettleUpModal;
  const onSettlementComplete = route.params?.onSettlementComplete;
  
  // Check if we should open expense details on load
  const expenseIdToOpen = route.params?.expenseId;
  const fromNotification = route.params?.fromNotification;

  // State for optimized settlement transactions
  const [optimizedSettlementTransactions, setOptimizedSettlementTransactions] = useState<any[]>([]);
  const [userSettlementTransactions, setUserSettlementTransactions] = useState<any[]>([]);
  const [userTotalOwed, setUserTotalOwed] = useState(0);
  const [userTotalOwedTo, setUserTotalOwedTo] = useState(0);

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
        normalizeToUSDC: true,
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
    if (!groupId) {return;}

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

  // Start group listener when component mounts
  useEffect(() => {
    if (groupId) {
      // Group listener started
      startGroupListener(groupId.toString());
      
      // Cleanup function to stop listener when component unmounts
      return () => {
        // Group listener stopped
        stopGroupListener(groupId.toString());
      };
    }
  }, [groupId, startGroupListener, stopGroupListener]);

  // Also load group data if not available
  useEffect(() => {
    if (groupId && !group && !groupLoading) {
      // The useGroupData hook should handle this, but let's ensure it's triggered
    }
  }, [groupId, group, groupLoading]);

  // Track if modal was opened from route params to prevent reopening
  const [modalOpenedFromParams, setModalOpenedFromParams] = useState(false);
  
  // Auto-open settle up modal if requested (only once)
  useEffect(() => {
    if (shouldShowSettleUpModal && !modalOpenedFromParams) {
      setSettleUpModalVisible(true);
      setModalOpenedFromParams(true);
    }
  }, [shouldShowSettleUpModal, modalOpenedFromParams]);

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
    // Only calculate balance when we have complete data and are not loading
    if (!currentUser?.id || realGroupBalances.length === 0 || loadingBalances || loadingExpenses) {
      return null;
    }

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

    // Balance calculation completed

    return balance;
  }, [realGroupBalances, currentUser?.id, currentUser?.name, currentUser?.email, loadingBalances, loadingExpenses]);

  // Calculate optimized settlement transactions
  const calculateOptimizedSettlements = useCallback(() => {
    if (realGroupBalances.length === 0) {return;}

    try {
      // Get all optimized transactions
      const allTransactions = getOptimizedSettlementTransactions(realGroupBalances);
      
      // Get current user's transactions (for one-click payment)
      const currentUserTransactions = currentUser?.id 
        ? getOptimizedSettlementTransactions(realGroupBalances, String(currentUser.id))
        : [];

      setOptimizedSettlementTransactions(allTransactions);

      if (currentUser?.id) {
        const userTransactions = getUserSettlementTransactions(realGroupBalances, String(currentUser.id));
        const totalOwed = getUserTotalOwed(realGroupBalances, String(currentUser.id));
        const totalOwedTo = getUserTotalOwedTo(realGroupBalances, String(currentUser.id));

        setUserSettlementTransactions(userTransactions);
        setUserTotalOwed(totalOwed);
        setUserTotalOwedTo(totalOwedTo);

        // Settlement analysis completed
      }
    } catch (error) {
      console.error('❌ GroupDetailsScreen: Error calculating optimized settlements:', error);
    }
  }, [realGroupBalances, currentUser?.id]);

  // Calculate optimized settlements when balances change
  useEffect(() => {
    if (realGroupBalances.length > 0 && !loadingBalances) {
      calculateOptimizedSettlements();
    }
  }, [realGroupBalances, loadingBalances, calculateOptimizedSettlements]);

  // Function to get user avatar for expense
  const getUserAvatarForExpense = useCallback((expense: Expense) => {
    if (!expense || !expense.paid_by) {return null;}

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
    if (!expense || !expense.paid_by) {return 'Someone';}

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
                      defaultSource={{ uri: DEFAULT_AVATAR_URL }}
        />
      );
    }

    // Fallback to placeholder image
    return (
      <Image
        source={{ uri: DEFAULT_AVATAR_URL }}
        style={styles.expenseAvatarImage}
        resizeMode="cover"
      />
    );
  }, [getUserAvatarForExpense, getUserNameForExpense]);

  // Function to convert expense to transaction format
  const convertExpenseToTransaction = useCallback((expense: Expense): Transaction => {
    const paidByUser = realMembers.find(member => String(member.id) === String(expense.paid_by));
    const paidByName = paidByUser?.name || 'Unknown User';
    
    return {
      id: `group_${groupId}_expense_${expense.id}`,
      type: 'send' as const,
      amount: expense.amount || 0,
      currency: expense.currency || 'USDC',
      from_user: paidByName,
      to_user: 'Group Members',
      from_wallet: paidByUser?.wallet_address || '',
      to_wallet: '',
      tx_hash: expense.id?.toString() || `expense_${expense.id}_${Date.now()}`,
      status: 'completed' as const,
      created_at: expense.created_at || new Date().toISOString(),
      updated_at: expense.updated_at || expense.created_at || new Date().toISOString(),
      note: expense.description || 'Group expense',
      group_id: groupId || null,
      company_fee: 0,
      net_amount: expense.amount || 0,
      gas_fee: 0,
      gas_fee_covered_by_company: false,
      recipient_name: 'Group Members',
      sender_name: paidByName,
      transaction_method: 'app_wallet',
      app_version: '1.0.0',
      device_info: 'mobile'
    };
  }, [realMembers, groupId]);

  // Auto-open expense details if expenseId is provided from notification
  useEffect(() => {
    if (expenseIdToOpen && fromNotification && individualExpenses.length > 0 && !modalOpenedFromParams) {
      logger.info('Auto-opening expense details for expenseId', { expenseId: expenseIdToOpen }, 'GroupDetailsScreen');
      
      // Find the expense in the loaded expenses
      const targetExpense = individualExpenses.find(expense => 
        String(expense.id) === String(expenseIdToOpen)
      );
      
      if (targetExpense) {
        logger.info('Found expense, opening details', { targetExpense }, 'GroupDetailsScreen');
        const transaction = convertExpenseToTransaction(targetExpense);
        setSelectedTransaction(transaction);
        setTransactionModalVisible(true);
        setModalOpenedFromParams(true);
        
        // Clear the route parameters to prevent reopening
        navigation.setParams({
          expenseId: undefined,
          fromNotification: undefined
        });
      } else {
        logger.warn('Expense not found in loaded expenses', { expenseId: expenseIdToOpen }, 'GroupDetailsScreen');
      }
    }
  }, [expenseIdToOpen, fromNotification, individualExpenses, modalOpenedFromParams, convertExpenseToTransaction, navigation]);

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

  // Calculate group summary using unified balance calculation
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
      // Use the unified balance calculation for consistent results
      const currentUserBalanceAmount = currentUserBalance?.amount || 0;
      
      // Calculate total spending from individual expenses for display
      let totalAmountUSD = 0;
      let totalAmountDisplay = '$0.00';

      if (individualExpenses.length > 0) {
        totalAmountUSD = individualExpenses.reduce((sum, expense) => {
          if (!expense || expense.amount === undefined) {return sum;}
          const currency = expense.currency || 'SOL';
          const amount = expense.amount || 0;
          // Use consistent conversion rates
          const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
          return sum + (amount * rate);
        }, 0);
        totalAmountDisplay = `$${totalAmountUSD.toFixed(2)}`;
      }

      // Calculate user-specific amounts based on the unified balance calculation
      let userPaidUSD = 0;
      let userOwesUSD = 0;
      let userOwedUSD = 0; // Amount you're owed

      if (currentUser?.id && currentUserBalance) {
        // Use USD amounts from the balance calculator - this is the final calculated balance
        const userBalanceUSD = (currentUserBalance as any).usdcAmount || currentUserBalance.amount;
        
        // Only calculate user-specific amounts if we have the final balance and it's not loading
        if (!loadingBalances && !loadingExpenses && realGroupBalances.length > 0) {
          const currentUserId = String(currentUser.id);
          
          // Calculate total amount the current user actually paid
          const userPaidExpenses = individualExpenses.filter(expense =>
            expense && String(expense.paid_by) === currentUserId
          );

          userPaidUSD = userPaidExpenses.reduce((sum, expense) => {
            if (!expense || expense.amount === undefined) {return sum;}
            const currency = expense.currency || 'SOL';
            const amount = expense.amount || 0;
            // Use consistent conversion rates
            const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
            return sum + (amount * rate);
          }, 0);

          // Calculate total group expenses and user's share
          const totalGroupExpenses = individualExpenses.reduce((sum, expense) => {
            if (!expense || expense.amount === undefined) {return sum;}
            const currency = expense.currency || 'SOL';
            const amount = expense.amount || 0;
            const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
            return sum + (amount * rate);
          }, 0);

          const memberCount = group.member_count || 1;
          const sharePerPerson = totalGroupExpenses / memberCount;

          if (__DEV__) {
            logger.debug('Balance calculation details', {
              totalGroupExpenses,
              memberCount,
              sharePerPerson,
              userPaidUSD,
              calculation: userPaidUSD < sharePerPerson ? 'OWES' : userPaidUSD > sharePerPerson ? 'OWED' : 'SETTLED'
            });
          }

          // Calculate what the user owes vs what they're owed based on final balance
          if (userBalanceUSD < 0) {
            // User owes money (negative balance)
            userOwesUSD = Math.abs(userBalanceUSD);
            userOwedUSD = 0;
          } else if (userBalanceUSD > 0) {
            // User is owed money (positive balance)
            userOwesUSD = 0;
            userOwedUSD = Math.abs(userBalanceUSD);
          } else {
            // User is settled (zero balance)
            userOwesUSD = 0;
            userOwedUSD = 0;
          }
        } else {
          // During loading, use the calculated balance directly
          if (userBalanceUSD > 0) {
            userOwedUSD = Math.abs(userBalanceUSD);
            userOwesUSD = 0;
          } else if (userBalanceUSD < 0) {
            userOwesUSD = Math.abs(userBalanceUSD);
            userOwedUSD = 0;
          } else {
            userOwesUSD = 0;
            userOwedUSD = 0;
          }
        }
      }

      // Calculate settlement progress based on how many members are settled
      let settlementProgress = 0;
      if (realGroupBalances.length > 0) {
        const totalSettled = realGroupBalances.filter(balance => Math.abs(balance.amount) < 0.01).length;
        settlementProgress = (totalSettled / realGroupBalances.length) * 100;
      }

      // Balance summary calculated

      // Only return final values when not loading to prevent intermediate states
      const isLoading = loadingBalances || loadingExpenses || loadingMembers;
      
      // Summary calculation completed

      return {
        totalAmountUSD,
        totalAmountDisplay,
        memberCount: group.member_count || 0,
        expenseCount: group.expense_count || 0,
        userPaidUSD: isLoading ? 0 : userPaidUSD,
        userOwesUSD: isLoading ? 0 : userOwesUSD,
        userOwedUSD: isLoading ? 0 : userOwedUSD,
        settlementProgress,
        loading: isLoading
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
    group,
    currentUserBalance,
    realGroupBalances,
    individualExpenses,
    loadingBalances,
    loadingExpenses,
    currentUser?.id
  ]);

  // Function to handle expense click
  const handleExpenseClick = useCallback((expense: Expense) => {
    const transaction = convertExpenseToTransaction(expense);
    setSelectedTransaction(transaction);
    setTransactionModalVisible(true);
  }, [convertExpenseToTransaction]);

  // Function to render dynamic balance avatar based on balance status
  const renderBalanceAvatar = useCallback((balance: Balance, isCurrentUser: boolean = false) => {
    const user = realMembers.find(member => String(member.id) === String(balance.userId));
    const userName = user?.name || balance.userName || 'User';

    return (
      <UserAvatar
        userId={balance.userId}
        userName={userName}
        size={40}
        avatarUrl={user?.avatar}
        style={styles.memberBalanceAvatar}
        backgroundColor={colors.surface}
      />
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
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
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
                <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fusdc-logo-black.png?alt=media&token=2b33d108-f3aa-471d-b7fe-6166c53c1d56' }} style={styles.spendingAmountIcon} />
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

        {/* Settlement Cards - Optimized Design */}
        {(userTotalOwed > 0 || userTotalOwedTo > 0) && (
          <View style={styles.settlementCardsContainer}>
            {/* Case 1: Both conditions (You owe AND You're owed) - Show 2 cards side by side */}
            {userTotalOwed > 0 && userTotalOwedTo > 0 ? (
              <View style={styles.settlementCardsRow}>
                {/* Card 1: You owe money */}
                <TouchableOpacity
                  style={styles.settlementCardGreen}
                  onPress={() => setSettleUpModalVisible(true)}
                >
                  <View style={styles.settlementCardInfos}>
                    <View style={styles.settlementCardIcon}>
                      <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-send.png?alt=media&token=d733fbce-e383-4cae-bd93-2fc16c36a2d9' }} style={{ width: 20, height: 20 }} />
                    </View>
                    <View style={styles.settlementCardContent}>
                      <Text style={styles.settlementCardTitleBlack}>
                        You owe ${userTotalOwed.toFixed(2)}
                      </Text>
                      <Text style={styles.settlementCardSubtitleBlack}>
                        {userSettlementTransactions.filter(t => t.fromUserId === currentUser?.id).length} payment{userSettlementTransactions.filter(t => t.fromUserId === currentUser?.id).length !== 1 ? 's' : ''} needed
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.settlementCardButton}
                    onPress={() => setSettleUpModalVisible(true)}
                  >
                    <Text style={styles.settlementCardButtonText}>Settle All</Text>
                    <Icon name="chevron-right" size={16} color="#FFF" />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Card 2: You're owed money */}
                <TouchableOpacity
                  style={styles.settlementCardGrey}
                  onPress={() => setSettleUpModalVisible(true)}
                >
                  <View style={styles.settlementCardInfos}>
                    <View style={styles.settlementCardIcon}>
                      <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-receive.png?alt=media&token=c55d7c97-b027-4841-859e-38c46c2f36c5' }} style={{ width: 20, height: 20 }} />
                    </View>
                    <View style={styles.settlementCardContent}>
                      <Text style={styles.settlementCardTitle}>
                        You're owed ${userTotalOwedTo.toFixed(2)}
                      </Text>
                      <Text style={styles.settlementCardSubtitle}>
                        {userSettlementTransactions.filter(t => t.toUserId === currentUser?.id).length} payment{userSettlementTransactions.filter(t => t.toUserId === currentUser?.id).length !== 1 ? 's' : ''} incoming
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.settlementCardButton}
                    onPress={() => setSettleUpModalVisible(true)}
                  >
                    <Text style={styles.settlementCardButtonText}>View</Text>
                    <Icon name="chevron-right" size={16} color="#FFF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            ) : (
              /* Case 2: Single condition - Use current design */
              <>
                {/* Card 1: You owe money */}
                {userTotalOwed > 0 && (
                  <TouchableOpacity
                    style={styles.settlementCard}
                    onPress={() => setSettleUpModalVisible(true)}
                  >
                    <View style={styles.settlementCardSmallInfos}>
                    <View style={styles.settlementAvatar}>
                      <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-send.png?alt=media&token=d733fbce-e383-4cae-bd93-2fc16c36a2d9' }} style={{ width: 20, height: 20 }} />
                    </View>
                    <View style={styles.settlementInfo}>
                      <Text style={styles.settlementTitleBlack}>
                        You owe ${userTotalOwed.toFixed(2)}
                      </Text>
                      <Text style={styles.settlementSubtitleBlack}>
                        {userSettlementTransactions.filter(t => t.fromUserId === currentUser?.id).length} payment{userSettlementTransactions.filter(t => t.fromUserId === currentUser?.id).length !== 1 ? 's' : ''} needed
                      </Text>
                    </View>
                    </View>

                    <View>
                      <Icon name="chevron-right" size={20} color="#000" />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Card 2: You're owed money */}
                {userTotalOwedTo > 0 && (
                  <TouchableOpacity
                    style={styles.settlementCardSmallGrey}
                    onPress={() => setSettleUpModalVisible(true)}
                  >
                    <View style={styles.settlementCardSmallInfos}>
                      <View style={styles.settlementAvatar}>
                        <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-receive.png?alt=media&token=c55d7c97-b027-4841-859e-38c46c2f36c5' }} style={{ width: 20, height: 20 }} />
                      </View>
                      <View style={styles.settlementInfo}>
                        <Text style={styles.settlementTitle}>
                          You're owed ${userTotalOwedTo.toFixed(2)}
                        </Text>
                        <Text style={styles.settlementSubtitle}>
                          {userSettlementTransactions.filter(t => t.toUserId === currentUser?.id).length} payment{userSettlementTransactions.filter(t => t.toUserId === currentUser?.id).length !== 1 ? 's' : ''} incoming
                        </Text>
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
                    handleExpenseClick(expense);
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
                          {expense.paid_by === currentUser?.id ? 'You paid' : 'Group expense'}
                        </Text>
                        <Text style={[
                          styles.expenseUserAmount,
                          expense.paid_by === currentUser?.id ? styles.positiveAmount : styles.neutralAmount
                        ]}>
                          ${expense.amount.toFixed(2)}
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
                      (currentUserBalance as any).usdcAmount > 0.01 ? styles.memberBalanceAmountPositive :
                      (currentUserBalance as any).usdcAmount < -0.01 ? styles.memberBalanceAmountNegative :
                      styles.memberBalanceAmountNeutral
                    ]}>
                      {(currentUserBalance as any).usdcAmount > 0
                        ? `+$${Math.abs((currentUserBalance as any).usdcAmount).toFixed(2)}`
                        : (currentUserBalance as any).usdcAmount < 0
                          ? `-$${Math.abs((currentUserBalance as any).usdcAmount).toFixed(2)}`
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
                          (balance as any).usdcAmount > 0.01 ? styles.memberBalanceAmountPositive :
                          (balance as any).usdcAmount < -0.01 ? styles.memberBalanceAmountNegative :
                          styles.memberBalanceAmountNeutral
                        ]}>
                          {(balance as any).usdcAmount > 0
                            ? `+$${Math.abs((balance as any).usdcAmount).toFixed(2)}`
                            : (balance as any).usdcAmount < 0
                              ? `-$${Math.abs((balance as any).usdcAmount).toFixed(2)}`
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
        onClose={() => {
          setSettleUpModalVisible(false);
          setModalOpenedFromParams(false);
          // Clear the route parameters to prevent modal from reopening
          navigation.setParams({
            showSettleUpModal: undefined,
            showSettleUpOnLeave: undefined,
            onSettlementComplete: undefined
          });
        }}
        groupId={groupId}
        realBalances={realGroupBalances}
        optimizedTransactions={optimizedSettlementTransactions}
        userTransactions={userSettlementTransactions}
        userTotalOwed={userTotalOwed}
        userTotalOwedTo={userTotalOwedTo}
        navigation={navigation}
        onSettlementComplete={onSettlementComplete}
      />

      {/* Transaction Modal for Expense Details */}
      <TransactionModal
        visible={transactionModalVisible}
        transaction={selectedTransaction}
        onClose={() => {
          setTransactionModalVisible(false);
          setSelectedTransaction(null);
        }}
        navigation={navigation}
      />
    </SafeAreaView>
  );
};

export default GroupDetailsScreen; 