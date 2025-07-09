import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import AuthGuard from '../../components/AuthGuard';
import Icon from '../../components/Icon';
import NavBar from '../../components/NavBar';
import { useApp } from '../../context/AppContext';
import { useGroupList } from '../../hooks/useGroupData';
import { GroupWithDetails, Expense, GroupMember } from '../../types';
import { formatCryptoAmount } from '../../utils/cryptoUtils';
import { getTotalSpendingInUSDC } from '../../services/priceService';
import { getUserNotifications, sendNotification } from '../../services/notificationService';

const DashboardScreen: React.FC<any> = ({ navigation }) => {
  const { state } = useApp();
  const { currentUser, isAuthenticated } = state;
  
  // Use efficient group list hook
  const { 
    groups, 
    loading: groupsLoading, 
    refreshing, 
    refresh: refreshGroups 
  } = useGroupList();

  const [priceLoading, setPriceLoading] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({
    'SOL': 200,
    'USDC': 1,
    'BTC': 50000
  });

  // Memoized balance calculations to avoid expensive recalculations
  const userBalances = useMemo(() => {
    if (!currentUser?.id || groups.length === 0) {
      return {
        totalOwed: 0,
        totalOwes: 0,
        netBalance: 0,
        balanceByCurrency: {}
      };
    }

    const userId = Number(currentUser.id);
    let totalOwedUSDC = 0;
    let totalOwesUSDC = 0;
    const balanceByCurrency: Record<string, number> = {};

    groups.forEach(group => {
      if (group.expenses.length === 0) return;

      // Calculate user's balance for this group using simplified logic
      const memberBalance = calculateUserBalanceForGroup(group, userId);
      
      // Process each currency
      Object.entries(memberBalance.netBalance).forEach(([currency, netAmount]) => {
        if (netAmount !== 0) {
          const rate = currencyRates[currency] || 1;
          const usdcAmount = Math.abs(netAmount) * rate;
          
          if (!balanceByCurrency[currency]) {
            balanceByCurrency[currency] = 0;
          }
          balanceByCurrency[currency] += netAmount;
          
          if (netAmount > 0) {
            totalOwedUSDC += usdcAmount;
          } else {
            totalOwesUSDC += usdcAmount;
          }
        }
      });
    });

    return {
      totalOwed: totalOwedUSDC,
      totalOwes: totalOwesUSDC,
      netBalance: totalOwedUSDC - totalOwesUSDC,
      balanceByCurrency
    };
  }, [groups, currentUser?.id, currencyRates]);

  // Simplified balance calculation for a single group
  const calculateUserBalanceForGroup = useCallback((group: GroupWithDetails, userId: number) => {
    const netBalance: Record<string, number> = {};
    
    group.expenses.forEach(expense => {
      const currency = expense.currency || 'SOL';
      const sharePerPerson = expense.amount / group.members.length;
      
      if (!netBalance[currency]) {
        netBalance[currency] = 0;
      }
      
      if (expense.paid_by === userId) {
        // User paid, so they should receive money back
        netBalance[currency] += expense.amount - sharePerPerson;
      } else {
        // Someone else paid, user owes their share
        netBalance[currency] -= sharePerPerson;
      }
    });

    return { netBalance };
  }, []);

  // Background currency rate updates
  const updateCurrencyRates = useCallback(async () => {
    try {
      // Only update rates if there are actual expenses with different currencies
      const currencies = new Set<string>();
      groups.forEach(group => {
        group.expenses.forEach(expense => {
          currencies.add(expense.currency || 'SOL');
        });
      });

      if (currencies.size === 0) return;

      // Batch convert small amounts to get rates
      const rateUpdates: Record<string, number> = {};
      for (const currency of currencies) {
        if (currency === 'USDC') {
          rateUpdates[currency] = 1;
        } else {
          try {
            const rate = await getTotalSpendingInUSDC([{ amount: 1, currency }]);
            rateUpdates[currency] = rate;
          } catch (error) {
            console.error(`Failed to get rate for ${currency}:`, error);
            // Keep existing rate or use fallback
            rateUpdates[currency] = currencyRates[currency] || (currency === 'SOL' ? 200 : 100);
          }
        }
      }
      
      setCurrencyRates(prev => ({ ...prev, ...rateUpdates }));
    } catch (error) {
      console.error('Error updating currency rates:', error);
    }
  }, [groups, currencyRates]);

  // Update currency rates periodically in background
  useEffect(() => {
    if (groups.length > 0) {
      updateCurrencyRates();
      
      // Update rates every 5 minutes
      const interval = setInterval(updateCurrencyRates, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [groups.length, updateCurrencyRates]);

  // Calculate total balance across all groups by currency (simplified)
  const totalBalanceByCurrency = useMemo(() => {
    return groups.reduce((acc, group) => {
      group.expenses.forEach(expense => {
        const currency = expense.currency || 'SOL';
        if (!acc[currency]) {
          acc[currency] = 0;
        }
        acc[currency] += expense.amount;
      });
      return acc;
    }, {} as Record<string, number>);
  }, [groups]);

  // Convert group amounts to USD for display
  const convertGroupAmountsToUSD = async (groups: GroupWithDetails[]) => {
    try {
      const usdAmounts: Record<number, number> = {};
      
      for (const group of groups) {
        if (group.expenses_by_currency && group.expenses_by_currency.length > 0) {
          try {
            const totalUSD = await getTotalSpendingInUSDC(
              group.expenses_by_currency.map(expense => ({
                amount: expense.total_amount,
                currency: expense.currency
              }))
            );
            usdAmounts[group.id] = totalUSD;
          } catch (error) {
            console.error(`Error converting group ${group.id} amounts:`, error);
            // Use fallback conversion if price service fails
            const fallbackTotal = group.expenses_by_currency.reduce((sum, expense) => {
              const rate = expense.currency === 'SOL' ? 200 : (expense.currency === 'USDC' ? 1 : 100);
              return sum + (expense.total_amount * rate);
            }, 0);
            usdAmounts[group.id] = fallbackTotal;
          }
        } else {
          usdAmounts[group.id] = 0;
        }
      }
      
      // This state is no longer needed as groupAmountsInUSD is removed
      // setGroupAmountsInUSD(usdAmounts); 
    } catch (error) {
      console.error('Error converting group amounts to USD:', error);
    }
  };

  // Load data using centralized service
  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      await refreshGroups();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, [currentUser?.id, refreshGroups]);

  // Load payment requests and notifications
  const loadPaymentRequests = async () => {
    if (!currentUser?.id) return;
    
    try {
      const notifications = await getUserNotifications(currentUser.id.toString());
      setPaymentRequests(notifications.filter(n => n.type === 'payment_reminder'));
    } catch (error) {
      console.error('Error loading payment requests:', error);
      setPaymentRequests([]);
    }
  };

  // Load settlement requests that the current user has sent to others
  const loadOutgoingSettlementRequests = async () => {
    if (!currentUser?.id) return [];
    
    try {
      const requests: any[] = [];
      
      // For each group, check if there are members who owe money to the current user
      for (const group of groups) {
        try {
          const expenses = group.expenses;
          const members = group.members;

          // Calculate member balances for this group
          const memberBalances = calculateMemberBalances(expenses, members);
          const currentUserBalance = memberBalances[Number(currentUser.id)];

          if (currentUserBalance) {
            // Find members who owe money to the current user
            Object.entries(memberBalances).forEach(([memberId, balance]) => {
              const memberIdNum = Number(memberId);
              
              // Skip the current user
              if (memberIdNum === Number(currentUser.id)) return;
              
              // Check if this member owes money to the current user
              Object.entries(balance.netBalance).forEach(([currency, amount]) => {
                if (amount < 0 && currentUserBalance.netBalance[currency] > 0) {
                  // This member owes money in this currency to the current user
                  const member = members.find(m => m.id === memberIdNum);
                  if (member) {
                    requests.push({
                      id: `${group.id}-${memberId}-${currency}`,
                      type: 'settlement_request',
                      amount: Math.abs(amount),
                      currency: currency,
                      fromUser: member.name || member.email || 'Unknown User',
                      fromUserId: memberIdNum,
                      groupId: group.id,
                      groupName: group.name,
                      message: `Settlement request for ${group.name}`,
                      created_at: new Date().toISOString(),
                      status: 'pending'
                    });
                  }
                }
              });
            });
          }
        } catch (error) {
          console.error(`Error processing group ${group.id}:`, error);
        }
      }

      // Sort by most recent and limit to show most relevant requests
      return requests
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5); // Show up to 5 most recent requests
        
    } catch (error) {
      console.error('Error loading outgoing settlement requests:', error);
      return [];
    }
  };



  // Load data when component mounts or comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && currentUser?.id) {
        // Load groups first, then payment requests (which depend on groups)
        loadData().then(() => {
          loadPaymentRequests();
        });
      }
    }, [isAuthenticated, currentUser?.id])
  );

  useEffect(() => {
    if (isAuthenticated && currentUser?.id && groups.length > 0) {
      // calculateUserBalanceAcrossGroups(groups); // This line is no longer needed
      // Also load payment requests when groups are loaded/updated
      loadPaymentRequests();
    }
  }, [isAuthenticated, currentUser?.id, groups]);

  // Helper function to calculate member balances for dashboard display
  const calculateMemberBalances = (expenses: Expense[], members: GroupMember[]) => {
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
        splitData = expense.splitData ? 
          (typeof expense.splitData === 'string' ? JSON.parse(expense.splitData) : expense.splitData) 
          : null;
      } catch (e) {
        console.warn('Failed to parse split data:', expense.splitData);
        splitData = null;
      }
      
      // Determine who owes what based on split type
      if (splitData && splitData.shares) {
        // Use split data if available
        splitData.shares.forEach((share: any) => {
          const memberId = share.userId;
          const shareAmount = share.amount;

          if (!balances[memberId]) return;

          // Member owes this amount
          if (!balances[memberId].owes[currency]) {
            balances[memberId].owes[currency] = 0;
          }
          balances[memberId].owes[currency] += shareAmount;
        });
      } else {
        // Equal split among all members
        const shareAmount = amount / members.length;
        members.forEach(member => {
          if (!balances[member.id].owes[currency]) {
            balances[member.id].owes[currency] = 0;
          }
          balances[member.id].owes[currency] += shareAmount;
        });
      }

      // Person who paid is owed the amount
      if (!balances[paidBy].owed[currency]) {
        balances[paidBy].owed[currency] = 0;
      }
      balances[paidBy].owed[currency] += amount;
    });

    // Calculate net balances
    Object.keys(balances).forEach(memberIdStr => {
      const memberId = Number(memberIdStr);
      const memberBalance = balances[memberId];
      
      // Get all currencies this member has transactions in
      const currencies = new Set([
        ...Object.keys(memberBalance.owes),
        ...Object.keys(memberBalance.owed)
      ]);
      
      currencies.forEach(currency => {
        const owed = memberBalance.owed[currency] || 0;
        const owes = memberBalance.owes[currency] || 0;
        const net = owed - owes;
        
        memberBalance.netBalance[currency] = net;
        
        // Add to totals (simplified calculation)
        if (net > 0) {
          memberBalance.totalOwed += net;
        } else {
          memberBalance.totalOwes += Math.abs(net);
        }
      });
      
      memberBalance.balance = memberBalance.totalOwed - memberBalance.totalOwes;
    });

    return balances;
  };

  const handleSendRequestFromDashboard = async (request: any) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      console.log('Sending request from dashboard:', request);
      
      // Create notification data
      const notificationData = {
        type: 'payment_request',
        amount: request.amount,
        currency: request.currency,
        fromUser: currentUser.name || currentUser.email,
        fromUserId: currentUser.id,
        message: request.message,
        status: 'pending',
        request_id: request.request_id || Date.now().toString()
      };

      console.log('Notification data:', notificationData);

      // Send notification to the user who owes money
      const result = await sendNotification(
        request.fromUserId.toString(), // to_user_id (the person who will receive the request)
        currentUser.id.toString(), // from_user_id (current user)
        'payment_request',
        `Payment request for ${request.amount} ${request.currency}`,
        JSON.stringify(notificationData)
      );

      console.log('Send notification result:', result);

      if (result.success) {
        Alert.alert(
          'Request Sent!', 
          `Payment request for ${request.amount} ${request.currency} has been sent to ${request.fromUser}.`,
          [{ text: 'OK' }]
        );
        
        // Refresh the payment requests
        await loadPaymentRequests();
      } else {
        throw new Error(result.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert(
        'Error', 
        'Failed to send payment request. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const onRefresh = async () => {
    if (!isAuthenticated || !currentUser?.id) return;
    
    try {
      await Promise.all([
        refreshGroups(),
        loadPaymentRequests()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    }
  };

  const renderBalanceDisplay = () => {
    if (priceLoading) {
      return (
        <View style={styles.priceLoadingContainer}>
          <ActivityIndicator size="small" color={BG_COLOR} />
          <Text style={styles.priceLoadingText}>Calculating balance...</Text>
        </View>
      );
    }

    const balanceText = userBalances.netBalance >= 0 
      ? `+$${userBalances.netBalance.toFixed(2)}`
      : `-$${Math.abs(userBalances.netBalance).toFixed(2)}`;

    return (
      <Text style={styles.balanceAmount}>
        {balanceText}
      </Text>
    );
  };

  const getBalanceCardStyle = () => {
    if (userBalances.netBalance > 0) {
      return [styles.balanceCard, { backgroundColor: GREEN }]; // Owed money - green
    } else if (userBalances.netBalance < 0) {
      return [styles.balanceCard, { backgroundColor: '#FF6B6B' }]; // Owes money - red
    } else {
      return [styles.balanceCard, { backgroundColor: GRAY }]; // Even - gray
    }
  };

  if (!isAuthenticated) {
    return <AuthGuard navigation={navigation}>{null}</AuthGuard>;
  }

  if (groupsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusBar} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={{ color: '#FFF', marginTop: 16, fontSize: 16 }}>Loading your groups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar} />
      
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Image
                source={
                  currentUser?.avatar
                    ? { uri: currentUser.avatar }
                    : require('../../../assets/user.png')
                }
                style={styles.profileImage}
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>
                {currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}!
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.bellContainer}
            onPress={() => {
              // Handle notifications tap
              console.log('Notifications tapped');
            }}
          >
            <Icon
              name="notifications-outline"
              style={styles.bellIcon}
            />
            {paymentRequests.length > 0 && (
              <View style={styles.bellDot} />
            )}
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <TouchableOpacity style={styles.qrCodeIcon} onPress={() => navigation.navigate('Deposit')}>
              <Icon
                name="qr-code-outline"
                style={styles.qrCodeIconSvg}
              />
            </TouchableOpacity>
          </View>
          
          {priceLoading ? (
            <View style={styles.priceLoadingContainer}>
              <ActivityIndicator size="small" color={BG_COLOR} />
              <Text style={styles.priceLoadingText}>Loading balance...</Text>
            </View>
          ) : (
            <Text style={styles.balanceAmount}>
              ${Math.abs(userBalances.netBalance).toFixed(2)}
            </Text>
          )}
          
          <Text style={styles.balanceLimitText}>
            Balance Limit $1000
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('SendContacts')}
            >
              <View style={styles.actionButtonCircle}>
                <Icon
                  name="arrow-up-right"
                  style={styles.actionButtonIcon}
                />
              </View>
              <Text style={styles.actionButtonText}>Send to</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('RequestContacts')}
            >
              <View style={[styles.actionButtonCircle, styles.actionButtonCircleRequest]}>
                <Icon
                  name="arrow-down-left"
                  style={styles.actionButtonIconRequest}
                />
              </View>
              <Text style={styles.actionButtonText}>Request</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Deposit')}
            >
              <View style={styles.actionButtonCircle}>
                <Icon
                  name="add"
                  style={styles.actionButtonIcon}
                />
              </View>
              <Text style={styles.actionButtonText}>Top up</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                // TODO: Implement withdraw functionality
                console.log('Withdraw tapped');
              }}
            >
              <View style={styles.actionButtonCircle}>
                <Icon
                  name="remove"
                  style={styles.actionButtonIcon}
                />
              </View>
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Groups Section */}
        <View style={styles.groupsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Groups</Text>
            <TouchableOpacity onPress={() => navigation.navigate('GroupsList')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No groups yet</Text>
              <Text style={styles.emptyStateSubtext}>Create a group to start splitting expenses</Text>
              <TouchableOpacity 
                style={styles.createGroupButton}
                onPress={() => navigation.navigate('CreateGroup')}
              >
                <Text style={styles.createGroupButtonText}>Create Your First Group</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.groupsGrid}>
              {groups.slice(0, 2).map((group, index) => {
                // Calculate total amount from expenses_by_currency  
                const totalAmount = group.expenses_by_currency?.reduce((sum, expense) => sum + (expense.total_amount || 0), 0) || 0;
                const isOwner = group.created_by === Number(currentUser?.id);
                const memberCount = group.member_count || 0;
                
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupGridCard, 
                      index === 0 ? styles.groupGridCardLeft : styles.groupGridCardRight
                    ]}
                    onPress={() => navigation.navigate('GroupDetails', { groupId: group.id })}
                  >
                    <View style={styles.groupGridHeader}>
                      <View style={styles.groupGridIcon}>
                        <Icon
                          name="people"
                          style={styles.groupGridIconSvg}
                        />
                      </View>
                      {/* Always show amount, even if 0 */}
                      <Text style={styles.groupGridAmount}>
                        ${totalAmount.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.groupGridName}>{group.name}</Text>
                    <Text style={styles.groupGridRole}>
                      {isOwner ? '👤 Owner' : '👥 Member'} • {memberCount} members
                    </Text>
                    <View style={styles.memberAvatars}>
                      {/* Show member count visually */}
                      {Array.from({ length: Math.min(memberCount, 3) }).map((_, i) => (
                        <View key={i} style={[styles.memberAvatar, {
                          backgroundColor: '#A5EA15',
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          marginRight: 4,
                          borderWidth: 2,
                          borderColor: '#FFF'
                        }]} />
                      ))}
                      {memberCount > 3 && (
                        <View style={[styles.memberAvatarMore, {
                          backgroundColor: '#666',
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }]}>
                          <Text style={[styles.memberAvatarMoreText, {
                            color: '#FFF',
                            fontSize: 10,
                            fontWeight: 'bold'
                          }]}>
                            +{memberCount - 3}
                          </Text>
                        </View>
                      )}
                      {memberCount === 0 && (
                        <Text style={{color: '#999', fontSize: 12}}>No members</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Requests Section */}
        <View style={styles.requestsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Requests</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RequestContacts')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {paymentRequests.length === 0 ? (
            <View style={styles.emptyRequestsState}>
              <Text style={styles.emptyRequestsText}>No payment requests</Text>
            </View>
          ) : (
            paymentRequests.slice(0, 2).map((request, index) => (
              <View key={request.id || index} style={styles.requestItem}>
                <View style={styles.requestAvatar} />
                <View style={styles.requestDetails}>
                  <Text style={styles.requestName}>
                    {request.fromUser || 'Unknown User'}
                  </Text>
                  <Text style={styles.requestDate}>
                    Owes you from {request.groupName || 'group activity'}
                  </Text>
                </View>
                <Text style={styles.requestAmount}>
                  ${request.amount?.toFixed(2) || '0.00'}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Transactions Section */}
        <View style={styles.requestsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Balance')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* Show recent transactions from groups if any */}
          {groups.length === 0 ? (
            <View style={styles.emptyRequestsState}>
              <Text style={styles.emptyRequestsText}>No recent transactions</Text>
            </View>
          ) : (
            groups.slice(0, 2).map((group, index) => {
              // Calculate total amount from expenses_by_currency
              const totalAmount = group.expenses_by_currency?.reduce((sum, expense) => sum + (expense.total_amount || 0), 0) || 0;
              const recentDate = group.updated_at || group.created_at || new Date().toISOString();
              
              return (
                <TouchableOpacity 
                  key={group.id} 
                  style={styles.requestItem}
                  onPress={() => navigation.navigate('GroupDetails', { groupId: group.id })}
                >
                  <View style={[styles.requestAvatar, {
                    backgroundColor: '#A5EA15',
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }]}>
                    <Text style={{color: '#000', fontWeight: 'bold', fontSize: 16}}>
                      {group.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.requestDetails}>
                    <Text style={styles.requestName}>{group.name}</Text>
                    <Text style={styles.requestDate}>
                      {group.member_count} members • {group.expense_count} expenses • Last activity {new Date(recentDate).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </Text>
                  </View>
                  <Text style={styles.requestAmount}>
                    ${totalAmount.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <NavBar currentRoute="Dashboard" navigation={navigation} />
    </SafeAreaView>
  );
};

export default DashboardScreen; 