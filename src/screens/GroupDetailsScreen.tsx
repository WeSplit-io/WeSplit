import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import ExpenseItem from '../components/ExpenseItem';
import AddButton from '../components/AddButton';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { getUserGroups, Group, getGroupMembers, GroupMember } from '../services/groupService';
import { getGroupExpenses, Expense } from '../services/expenseService';
import { formatCryptoAmount } from '../utils/cryptoUtils';
import { getTotalSpendingInUSDC } from '../services/priceService';
import { useFocusEffect } from '@react-navigation/native';
import { getGroupWallet, createGroupWallet, fundGroupWallet, settleGroupExpenses, settleAllGroupExpenses, GroupWallet } from '../services/groupWalletService';
import { sendSettlementRequestNotifications, sendNotification } from '../services/notificationService';
import { useWallet } from '../context/WalletContext';

interface GroupExpense {
  id: number;
  description: string;
  amount: number;
  currency: string;
  paid_by: number;
  group_id: number;
  category: string;
  created_at: string;
  paid_by_name: string;
  splitData?: string; // JSON string containing split information
}

interface ExtendedExpense extends Expense {
  splitData?: string; // JSON string containing split information
}

const GroupDetailsScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const { isConnected, address } = useWallet();
  const groupId = route.params?.groupId;

  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [memberBalances, setMemberBalances] = useState<Record<number, { 
    owes: Record<string, number>; 
    owed: Record<string, number>; 
    netBalance: Record<string, number>;
    totalOwes: number;
    totalOwed: number;
    balance: number;
  }>>({});
  const [groupWallet, setGroupWallet] = useState<GroupWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalUSDC, setTotalUSDC] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(false);

  const fetchData = async () => {
    if (!groupId) {
      setError('No group ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch expenses, members, and group wallet in parallel
      const [expensesData, membersData, walletData] = await Promise.all([
        getGroupExpenses(groupId),
        getGroupMembers(groupId),
        getGroupWallet(groupId).catch(() => null) // Don't fail if wallet doesn't exist
      ]);
      
      setExpenses(expensesData);
      setMembers(membersData);
      setGroupWallet(walletData);
      
      // Calculate member balances
      const balances = calculateMemberBalances(expensesData as ExtendedExpense[], membersData);
      setMemberBalances(balances);
      
      // Set group data
      setGroup({
        id: groupId,
        name: 'Group',
        member_count: membersData.length,
        total_expenses: expensesData.length
      });

      // Calculate total in USDC
      if (expensesData.length > 0) {
        setPriceLoading(true);
        try {
          const allExpenses = expensesData.map(expense => ({
            amount: expense.amount,
            currency: expense.currency || 'USDC'
          }));
          
          const total = await getTotalSpendingInUSDC(allExpenses);
          setTotalUSDC(total);
        } catch (error) {
          console.error('Error calculating total in USDC:', error);
          const fallbackTotal = expensesData.reduce((sum, expense) => {
            return sum + (expense.currency === 'USDC' ? expense.amount : expense.amount);
          }, 0);
          setTotalUSDC(fallbackTotal);
        } finally {
          setPriceLoading(false);
        }
      } else {
        setTotalUSDC(0);
      }
      
    } catch (err) {
      console.error('Error fetching group data:', err);
      setError('Failed to load group data');
    } finally {
      setLoading(false);
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

  const handlePayMember = (member: GroupMember, amount: number) => {
    // This means current user owes money to this member (who paid expenses)
    
    // Find the actual currency breakdown for this member
    const currentUserBalance = memberBalances[Number(currentUser?.id)];
    const memberBalance = memberBalances[member.id];
    
    if (!currentUserBalance || !memberBalance) return;
    
    // Find which currencies the current user owes to this member
    const currenciesOwed = Object.keys(currentUserBalance.netBalance).filter(
      currency => currentUserBalance.netBalance[currency] < 0 && memberBalance.netBalance[currency] > 0
    );
    
    const primaryCurrency = currenciesOwed[0] || 'SOL';
    const actualAmount = Math.abs(currentUserBalance.netBalance[primaryCurrency] || amount);
    
    Alert.alert(
      'Send Payment',
      `Send ${actualAmount.toFixed(4)} ${primaryCurrency} to ${member.name}?\n\nThis will settle your debt for shared expenses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            // Navigate to transaction confirmation
            navigation.navigate('TransactionConfirmation', {
              type: 'payment',
              recipient: member,
              amount: actualAmount,
              currency: primaryCurrency,
              groupId: groupId,
              onSuccess: () => {
                // Refresh the data after successful payment
                fetchData();
              }
            });
          }
        }
      ]
    );
  };

  const handleRequestPayment = (member: GroupMember, amount: number) => {
    // This means this member owes money to current user (who paid expenses)
    
    // Find the actual currency breakdown for this member
    const currentUserBalance = memberBalances[Number(currentUser?.id)];
    const memberBalance = memberBalances[member.id];
    
    if (!currentUserBalance || !memberBalance) return;
    
    // Find which currencies this member owes to current user
    const currenciesOwed = Object.keys(memberBalance.netBalance).filter(
      currency => memberBalance.netBalance[currency] < 0 && currentUserBalance.netBalance[currency] > 0
    );
    
    const primaryCurrency = currenciesOwed[0] || 'SOL';
    const actualAmount = Math.abs(memberBalance.netBalance[primaryCurrency] || amount);
    
    Alert.alert(
      'Request Payment',
      `Request ${actualAmount.toFixed(4)} ${primaryCurrency} from ${member.name}?\n\nThey owe you money for shared expenses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: () => {
            Alert.alert(
              'Payment Request Sent', 
              `Payment request sent to ${member.name}.\n\nThey will be notified to pay you ${actualAmount.toFixed(4)} ${primaryCurrency}.`
            );
          }
        }
      ]
    );
  };

  const handleCreateGroupWallet = async () => {
    if (!currentUser?.id || !groupId) return;
    
    try {
      setWalletLoading(true);
      const wallet = await createGroupWallet(groupId, currentUser.id.toString());
      setGroupWallet(wallet);
      Alert.alert('Success', 'Group wallet created successfully!');
    } catch (error) {
      console.error('Error creating group wallet:', error);
      Alert.alert('Error', 'Failed to create group wallet. Please try again.');
    } finally {
      setWalletLoading(false);
    }
  };

  const handleFundGroupWallet = () => {
    if (!currentUser?.id || !groupWallet || !group) {
      Alert.alert('Error', 'Missing required information for funding');
      return;
    }
    
    // Navigate to DepositScreen with group wallet parameters using the same process as individual wallets
    navigation.navigate('Deposit', {
      targetWallet: {
        address: groupWallet.wallet_address,
        name: `${group?.name || 'Group'} Wallet`,
        type: 'group',
        groupId: groupId
      },
      groupId: groupId,
      isGroupWallet: true,
      onSuccess: async (transactionData?: any) => {
        try {
          // Send notification about successful funding
          await sendNotification(
            Number(currentUser?.id),
            'Group Wallet Funded',
            `You have successfully funded ${group?.name || 'the group'} wallet with ${transactionData?.amount || 'funds'}.`,
            'funding_notification',
            {
              groupId,
              groupName: group?.name,
              transactionData
            }
          );
          
          Alert.alert('Success', 'Group wallet funded successfully!');
          fetchData(); // Refresh data
        } catch (error) {
          console.error('Error sending funding notification:', error);
          // Still show success even if notification fails
          Alert.alert('Success', 'Group wallet funded successfully!');
          fetchData();
        }
      }
    });
  };

  const handleSettleAll = async () => {
    if (!currentUser?.id || !groupWallet || !group) {
      Alert.alert('Error', 'Missing required information for settlement');
      return;
    }

    try {
      // Calculate who owes and who is owed money
      const membersWhoOwe: Array<{ id: number; name: string; amount: number; currency: string }> = [];
      const membersWhoAdvanced: Array<{ id: number; name: string; amount: number; currency: string }> = [];

      members.forEach(member => {
        const balance = memberBalances[member.id];
        if (balance && balance.balance !== 0) {
          if (balance.balance < 0) {
            // Member owes money - sum up amounts across currencies
            let totalOwedUSDC = 0;
            Object.entries(balance.netBalance).forEach(([currency, amount]) => {
              if (amount < 0) {
                // Convert to USDC for simplified display
                const conversionRate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
                totalOwedUSDC += Math.abs(amount) * conversionRate;
              }
            });
            
            if (totalOwedUSDC > 0) {
              membersWhoOwe.push({
                id: member.id,
                name: member.name,
                amount: totalOwedUSDC,
                currency: 'USDC'
              });
            }
          } else {
            // Member is owed money
            let totalOwedUSDC = 0;
            Object.entries(balance.netBalance).forEach(([currency, amount]) => {
              if (amount > 0) {
                const conversionRate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
                totalOwedUSDC += amount * conversionRate;
              }
            });
            
            if (totalOwedUSDC > 0) {
              membersWhoAdvanced.push({
                id: member.id,
                name: member.name,
                amount: totalOwedUSDC,
                currency: 'USDC'
              });
            }
          }
        }
      });

      if (membersWhoOwe.length === 0) {
        Alert.alert(
          'No Settlement Needed',
          'All expenses are already settled in this group.'
        );
        return;
      }

      // Show confirmation dialog
      const totalAmountOwed = membersWhoOwe.reduce((sum, member) => sum + member.amount, 0);
      const membersOwingNames = membersWhoOwe.map(m => m.name).join(', ');
      const membersAdvancedNames = membersWhoAdvanced.map(m => m.name).join(', ');

      Alert.alert(
        'Settle All Expenses',
        `This will send settlement requests to all members:\n\n` +
        `Members who owe money: ${membersOwingNames}\n` +
        `Total amount: $${totalAmountOwed.toFixed(2)} USDC\n\n` +
        `Members who will receive money: ${membersAdvancedNames}\n\n` +
        `All members will be notified about the settlement request. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Requests',
            onPress: async () => {
              try {
                setWalletLoading(true);

                // Send notifications to all affected members
                await sendSettlementRequestNotifications(
                  Number(groupId),
                  group.name,
                  { id: Number(currentUser.id), name: currentUser.name || 'User' },
                  membersWhoOwe,
                  membersWhoAdvanced
                );

                Alert.alert(
                  'Settlement Requests Sent',
                  `All members have been notified about the settlement request. They will receive notifications to either:\n\n` +
                  `• Send money to the group wallet (if they owe)\n` +
                  `• Expect payment once settlement is complete (if they're owed money)\n\n` +
                  `You can check the group wallet status to monitor incoming payments.`
                );

              } catch (error) {
                console.error('Error sending settlement notifications:', error);
                Alert.alert('Error', 'Failed to send settlement notifications. Please try again.');
              } finally {
                setWalletLoading(false);
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error calculating settlement:', error);
      Alert.alert('Error', 'Failed to calculate settlement. Please try again.');
    }
  };

  // Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('GroupDetailsScreen: Screen focused, refreshing data...');
      fetchData();
    }, [groupId, currentUser?.id])
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
  
  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Details</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Icon name="alert-circle" size={64} color="#A89B9B" />
          <Text style={styles.emptyStateText}>Group not found</Text>
          <Text style={styles.emptyStateSubtext}>The group you're looking for doesn't exist</Text>
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

  // Calculate total expenses by currency (for individual expense display)
  const expensesByCurrency = expenses.reduce((acc, expense) => {
    const currency = expense.currency || 'USDC';
    if (!acc[currency]) {
      acc[currency] = 0;
    }
    acc[currency] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  console.log('GroupDetailsScreen: Expenses by currency:', expensesByCurrency);

  const memberCount = group.member_count;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{group.name}</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('GroupSettings', { groupId: group.id })} 
          style={styles.settingsButton}
        >
          <Icon name="settings" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTotal}>Total spending</Text>
          {priceLoading ? (
            <View style={styles.priceLoadingContainer}>
              <ActivityIndicator size="small" color="#212121" />
              <Text style={styles.priceLoadingText}>Loading prices...</Text>
            </View>
          ) : totalUSDC > 0 ? (
            <Text style={styles.summaryAmount}>
              {formatCryptoAmount(totalUSDC, 'USDC')}
            </Text>
          ) : (
            <Text style={styles.summaryAmount}>$0.00 USDC</Text>
          )}
          <Text style={styles.summaryOwed}>
            {memberCount} members • {expenses.length} expenses
          </Text>
        </View>

        {/* Group Wallet Section */}
        <View style={styles.walletSection}>
          <Text style={styles.sectionTitle}>Group Wallet</Text>
          {groupWallet ? (
            <View style={styles.groupWalletCard}>
              <View style={styles.walletHeader}>
                <Icon name="users" size={20} color="#A5EA15" />
                <Text style={styles.walletTitle}>Shared Wallet</Text>
                <Text style={styles.walletBalance}>
                  {formatCryptoAmount(groupWallet.balance || 0, 'USDC')}
                </Text>
              </View>
              <Text style={styles.walletAddress}>
                {groupWallet.wallet_address.slice(0, 12)}...{groupWallet.wallet_address.slice(-12)}
              </Text>
              
              <View style={styles.walletActions}>
                <TouchableOpacity
                  style={[styles.walletActionButton, walletLoading && styles.disabledButton]}
                  onPress={handleFundGroupWallet}
                  disabled={walletLoading}
                >
                  <Icon name="plus" size={16} color="#212121" />
                  <Text style={styles.walletActionText}>Fund Wallet</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.walletActionButton, styles.settleButton, walletLoading && styles.disabledButton]}
                  onPress={handleSettleAll}
                  disabled={walletLoading}
                >
                  <Icon name="zap" size={16} color="#FFF" />
                  <Text style={[styles.walletActionText, { color: '#FFF' }]}>Settle All</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noWalletCard}>
              <Icon name="wallet" size={32} color="#A89B9B" />
              <Text style={styles.noWalletText}>No group wallet yet</Text>
              <Text style={styles.noWalletSubtext}>
                Create a shared wallet to enable automatic expense settlement
              </Text>
              <TouchableOpacity
                style={[styles.createWalletButton, walletLoading && styles.disabledButton]}
                onPress={handleCreateGroupWallet}
                disabled={walletLoading}
              >
                {walletLoading ? (
                  <ActivityIndicator size="small" color="#212121" />
                ) : (
                  <>
                    <Icon name="plus" size={16} color="#212121" />
                    <Text style={styles.createWalletText}>Create Group Wallet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Members & Balances</Text>
          {members.map((member) => {
            const balance = memberBalances[member.id] || { owes: {}, owed: {}, netBalance: {}, totalOwes: 0, totalOwed: 0, balance: 0 };
            const isCurrentUser = member.id.toString() === currentUser?.id?.toString();
            
            return (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.avatarText}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.name} {isCurrentUser && '(You)'}
                    </Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                  </View>
                </View>
                
                {/* Balance Display - Separate section */}
                <View style={styles.balanceSection}>
                  {balance.balance > 0 ? (
                    <Text style={styles.positiveBalance}>
                      Owed: {balance.balance.toFixed(4)} SOL equivalent
                    </Text>
                  ) : balance.balance < 0 ? (
                    <Text style={styles.negativeBalance}>
                      Owes: {Math.abs(balance.balance).toFixed(4)} SOL equivalent
                    </Text>
                  ) : (
                    <Text style={styles.settledBalance}>Settled up</Text>
                  )}
                  
                  {/* Show detailed currency breakdown */}
                  <View style={styles.currencyBreakdown}>
                    {Object.keys(balance.netBalance).map(currency => {
                      const amount = balance.netBalance[currency];
                      if (Math.abs(amount) < 0.0001) return null; // Skip very small amounts
                      
                      return (
                        <Text key={currency} style={styles.currencyDetail}>
                          {amount > 0 ? '+' : ''}{amount.toFixed(4)} {currency}
                        </Text>
                      );
                    })}
                  </View>
                </View>
                
                {/* Action Buttons */}
                {!isCurrentUser && (
                  <View style={styles.memberActions}>
                    {balance.balance < 0 && currentUser && memberBalances[Number(currentUser.id)]?.balance > 0 && (
                      <TouchableOpacity 
                        style={styles.payButton}
                        onPress={() => handleRequestPayment(member, Math.abs(balance.balance))}
                      >
                        <Icon name="arrow-down-left" size={16} color="#FFF" />
                        <Text style={styles.payButtonText}>Request</Text>
          </TouchableOpacity>
                    )}
                    
                    {balance.balance > 0 && currentUser && memberBalances[Number(currentUser.id)]?.balance < 0 && (
                      <TouchableOpacity 
                        style={styles.requestButton}
                        onPress={() => handlePayMember(member, balance.balance)}
                      >
                        <Icon name="arrow-up-right" size={16} color="#FFF" />
                        <Text style={styles.requestButtonText}>Pay</Text>
          </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Back to Dashboard Button */}
        <TouchableOpacity 
          style={styles.backToDashboardButton} 
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Icon name="home" size={20} color="#212121" />
          <Text style={styles.backToDashboardButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>

        {/* Expenses Section */}
        <View style={styles.expensesSection}>
        <Text style={styles.sectionTitle}>Expenses</Text>
          {expenses.length > 0 ? (
            expenses.map((expense, idx) => (
            <TouchableOpacity 
                key={expense.id + '-' + idx}
                style={styles.expenseCard}
                onPress={() => {
                  // Debug logging
                  console.log('Expense creator ID:', expense.paid_by, typeof expense.paid_by);
                  console.log('Current user ID:', currentUser?.id, typeof currentUser?.id);
                  console.log('Comparison result:', expense.paid_by.toString() === currentUser?.id);
                  
                  // Only allow editing if current user is the creator
                  // Convert both to strings for comparison
                  const expenseCreatorId = expense.paid_by.toString();
                  const currentUserId = currentUser?.id?.toString();
                  
                  if (expenseCreatorId === currentUserId) {
                    navigation.navigate('EditExpense', { 
                      expense,
                      onExpenseUpdated: () => {
                        console.log('GroupDetailsScreen: Expense updated callback triggered, refreshing data...');
                        fetchData();
                      }
                    });
                  } else {
                    console.log('User not authorized to edit this expense');
                    console.log('Expense creator ID (string):', expenseCreatorId);
                    console.log('Current user ID (string):', currentUserId);
                  }
                }}
                activeOpacity={expense.paid_by.toString() === currentUser?.id?.toString() ? 0.7 : 1}
            >
                <View style={styles.expenseHeader}>
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                  <Text style={styles.expenseAmount}>
                    {formatCryptoAmount(expense.amount, expense.currency || 'USDC')}
                  </Text>
                </View>
                <View style={styles.expenseDetails}>
                  <Text style={styles.expensePayer}>{expense.paid_by_name} paid</Text>
                  <Text style={styles.expenseDate}>{new Date(expense.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</Text>
                </View>
                {expense.paid_by.toString() === currentUser?.id?.toString() && (
                  <View style={styles.editIndicator}>
                    <Icon name="edit-2" size={12} color="#A5EA15" />
                    <Text style={styles.editText}>Tap to edit</Text>
                  </View>
                )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyExpenses}>
              <Icon name="file-text" size={48} color="#A89B9B" />
            <Text style={styles.emptyExpensesText}>No expenses yet</Text>
            <Text style={styles.emptyExpensesSubtext}>Add your first expense to get started</Text>
          </View>
        )}
        </View>
      </ScrollView>
      
      <AddButton onPress={() => navigation.navigate('AddExpense', { groupId: group.id })} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#212121',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  settingsButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#A5EA15',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  summaryTotal: {
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  summaryOwed: {
    fontWeight: '500',
    fontSize: 16,
    color: '#212121',
  },
  backToDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A5EA15',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  backToDashboardButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  expensesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 16,
  },
  expenseCard: {
    backgroundColor: '#212121',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseDescription: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  expenseAmount: {
    color: '#A5EA15',
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expensePayer: {
    color: '#A89B9B',
    fontSize: 14,
    fontWeight: '400',
  },
  expenseDate: {
    color: '#A89B9B',
    fontSize: 12,
    fontWeight: '400',
  },
  emptyExpenses: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyExpensesText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyExpensesSubtext: {
    fontSize: 14,
    color: '#A89B9B',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A89B9B',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#A5EA15',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyStateButtonText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '600',
  },
  priceLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  priceLoadingText: {
    color: '#212121',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  editIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  editText: {
    color: '#A5EA15',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  membersSection: {
    marginBottom: 24,
  },
  memberCard: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A5EA15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberEmail: {
    color: '#A89B9B',
    fontSize: 12,
  },
  balanceSection: {
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3A',
  },
  positiveBalance: {
    color: '#A5EA15',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  negativeBalance: {
    color: '#FF4D4F',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  settledBalance: {
    color: '#A89B9B',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  currencyBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  currencyDetail: {
    color: '#A89B9B',
    fontSize: 11,
    fontWeight: '400',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memberActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  payButton: {
    backgroundColor: '#A5EA15',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  payButtonText: {
    color: '#212121',
    fontSize: 12,
    fontWeight: '600',
  },
  requestButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  requestButtonText: {
    color: '#212121',
    fontSize: 12,
    fontWeight: '600',
  },
  walletSection: {
    marginBottom: 24,
  },
  groupWalletCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A5EA15',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  walletBalance: {
    color: '#A5EA15',
    fontSize: 16,
    fontWeight: 'bold',
  },
  walletAddress: {
    color: '#A89B9B',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  walletActions: {
    flexDirection: 'row',
    gap: 12,
  },
  walletActionButton: {
    flex: 1,
    backgroundColor: '#A5EA15',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  settleButton: {
    backgroundColor: '#FF6B35',
  },
  walletActionText: {
    color: '#212121',
    fontSize: 14,
    fontWeight: '600',
  },
  noWalletCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderStyle: 'dashed',
  },
  noWalletText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  noWalletSubtext: {
    color: '#A89B9B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createWalletButton: {
    backgroundColor: '#A5EA15',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  createWalletText: {
    color: '#212121',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default GroupDetailsScreen; 