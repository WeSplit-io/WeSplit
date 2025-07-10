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
  const [groupAmountsInUSD, setGroupAmountsInUSD] = useState<Record<number, number>>({});
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({
    'SOL': 200,
    'USDC': 1,
    'BTC': 50000
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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

    // For now, return simplified balance based on available summary data
    // TODO: Implement proper balance calculation when full group details are available
    const userId = Number(currentUser.id);
    let totalSpentUSDC = 0;
    const balanceByCurrency: Record<string, number> = {};

    groups.forEach(group => {
      try {
        // Use expenses_by_currency data that's actually available from the backend
        if (group.expenses_by_currency && Array.isArray(group.expenses_by_currency)) {
          group.expenses_by_currency.forEach(expenseByCurrency => {
            const currency = expenseByCurrency.currency || 'SOL';
            const totalAmount = expenseByCurrency.total_amount || 0;
            
            if (totalAmount > 0) {
              // For dashboard display, show total spending across all groups
              const rate = currencyRates[currency] || 1;
              const usdcAmount = totalAmount * rate;
              totalSpentUSDC += usdcAmount;
              
              if (!balanceByCurrency[currency]) {
                balanceByCurrency[currency] = 0;
              }
              balanceByCurrency[currency] += totalAmount;
            }
          });
        }
      } catch (error) {
        console.error(`Error calculating balance for group ${group.id}:`, error);
      }
    });

    return {
      totalOwed: 0, // Will be calculated when individual group details are loaded
      totalOwes: 0, // Will be calculated when individual group details are loaded  
      netBalance: 0, // Simplified for now - shows total spending instead
      totalSpent: totalSpentUSDC,
      balanceByCurrency
    };
  }, [groups, currentUser?.id, currencyRates]);

  // Load notification count
  const loadNotificationCount = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      const notifications = await getUserNotifications(Number(currentUser.id));
      const unreadCount = notifications.filter(n => !n.read).length;
      setUnreadNotifications(unreadCount);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  }, [currentUser?.id]);

  // Remove old balance calculation functions that relied on empty arrays
  // Data will be available when individual group details are loaded

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

  // Load notifications when dashboard loads
  useEffect(() => {
    loadNotificationCount();
  }, [loadNotificationCount]);

    // Convert group amounts to USD for display with proper currency handling
  const convertGroupAmountsToUSD = useCallback(async (groups: GroupWithDetails[]) => {
    try {
      const usdAmounts: Record<number, number> = {};
      
      for (const group of groups) {
        if (group.expenses_by_currency && group.expenses_by_currency.length > 0) {
          console.log(`Converting group "${group.name}" expenses:`, group.expenses_by_currency);
          
          try {
            const expenses = group.expenses_by_currency.map(expense => ({
              amount: expense.total_amount || 0,
              currency: expense.currency || 'SOL'
            }));
            
            console.log(`Calling getTotalSpendingInUSDC with:`, expenses);
            const totalUSD = await getTotalSpendingInUSDC(expenses);
            
            console.log(`Group "${group.name}": Price service returned $${totalUSD.toFixed(2)}`);
            usdAmounts[group.id] = totalUSD;
            
          } catch (error) {
            console.error(`Price service failed for group ${group.id}:`, error);
            
            // Enhanced fallback with better rate handling and debugging
            let fallbackTotal = 0;
            for (const expense of group.expenses_by_currency) {
              const amount = expense.total_amount || 0;
              const currency = (expense.currency || 'SOL').toUpperCase();
              
              // Use current market rates (these should be updated periodically)
              let rate = 1;
              switch (currency) {
                case 'SOL':
                  rate = currencyRates.SOL || 200; // Use dynamic rate if available
                  break;
                case 'USDC':
                case 'USDT':
                  rate = 1;
                  break;
                case 'BTC':
                  rate = currencyRates.BTC || 50000;
                  break;
                default:
                  console.warn(`Unknown currency: ${currency}, using rate 100`);
                  rate = 100; // Default fallback for unknown currencies
              }
              
              const usdValue = amount * rate;
              fallbackTotal += usdValue;
              
              console.log(`Fallback: ${amount} ${currency} × ${rate} = $${usdValue.toFixed(2)}`);
            }
            
            console.log(`Group "${group.name}": Fallback total = $${fallbackTotal.toFixed(2)}`);
            usdAmounts[group.id] = fallbackTotal;
          }
        } else {
          console.log(`Group "${group.name}": No expenses_by_currency data`);
          usdAmounts[group.id] = 0;
        }
      }
      
      console.log('Final USD amounts:', usdAmounts);
      setGroupAmountsInUSD(usdAmounts);
    } catch (error) {
      console.error('Error converting group amounts to USD:', error);
    }
  }, [currencyRates]);

  // Load data using centralized service
  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      await refreshGroups();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, [currentUser?.id]); // Remove refreshGroups from dependencies to prevent infinite loop

  // Load payment requests and notifications
  const loadPaymentRequests = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      // Fix: Convert to number since notificationService expects number
      const notifications = await getUserNotifications(Number(currentUser.id));
      // Fix: Use correct notification type
      setPaymentRequests(notifications.filter(n => n.type === 'payment_request'));
    } catch (error) {
      console.error('Error loading payment requests:', error);
      setPaymentRequests([]);
    }
  }, [currentUser?.id]);

  // Load settlement requests that the current user has sent to others
  const loadOutgoingSettlementRequests = async () => {
    if (!currentUser?.id) return [];
    
    try {
      const requests: any[] = [];
      
      // Simplified: For now, use notification-based requests instead of calculating from expenses
      // since individual expense data is not available in the groups list
      console.log('Loading settlement requests - using notification-based approach');
      
      // This will be populated when full group details are implemented
      // For now, return empty array to prevent errors
      
      return requests;
        
    } catch (error) {
      console.error('Error loading outgoing settlement requests:', error);
      return [];
    }
  };

  // Simplified group summary for dashboard display
  const getGroupSummary = useCallback((group: GroupWithDetails) => {
    try {
      // Use the available summary data from backend
      const totalAmount = group.expenses_by_currency?.reduce((sum, expense) => {
        return sum + (expense.total_amount || 0);
      }, 0) || 0;
      
      const memberCount = group.member_count || 0;
      const expenseCount = group.expense_count || 0;
      
      return {
        totalAmount,
        memberCount,
        expenseCount,
        hasData: totalAmount > 0 || memberCount > 0
      };
    } catch (error) {
      console.error(`Error getting group summary for ${group.id}:`, error);
      return {
        totalAmount: 0,
        memberCount: 0,
        expenseCount: 0,
        hasData: false
      };
    }
  }, []);


  // Convert amounts when groups change (similar to GroupsList)
  useFocusEffect(
    React.useCallback(() => {
      if (groups.length > 0) {
        convertGroupAmountsToUSD(groups);
      }
    }, [groups, convertGroupAmountsToUSD])
  );

  // Load data when component mounts or comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && currentUser?.id) {
        // Load groups first, then payment requests
        loadData().then(() => {
          loadPaymentRequests();
        });
      }
    }, [isAuthenticated, currentUser?.id, loadData])
  );

  useEffect(() => {
    if (isAuthenticated && currentUser?.id && groups.length > 0) {
      // Load payment requests when groups are loaded/updated
      loadPaymentRequests();
    }
  }, [isAuthenticated, currentUser?.id, groups.length, loadPaymentRequests]);

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

      // Fix: Use correct parameter order and types for sendNotification
      const result = await sendNotification(
        request.fromUserId, // to_user_id (the person who will receive the request)
        'Payment Request', // title
        `Payment request for ${request.amount} ${request.currency}`, // message
        'payment_request', // type (correct notification type)
        notificationData // data
      );

      console.log('Send notification result:', result);

      // Fix: sendNotification returns a Notification object, not a success/error response
      if (result && result.id) {
        Alert.alert(
          'Request Sent!', 
          `Payment request for ${request.amount} ${request.currency} has been sent to ${request.fromUser}.`,
          [{ text: 'OK' }]
        );
        
        // Refresh the payment requests
        await loadPaymentRequests();
      } else {
        throw new Error('Failed to send request - no notification ID received');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert(
        'Error', 
        error instanceof Error ? error.message : 'Failed to send payment request. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const onRefresh = async () => {
    if (!isAuthenticated || !currentUser?.id) return;
    
    try {
      await Promise.all([
        refreshGroups(),
        loadPaymentRequests(),
        loadNotificationCount()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    }
  };

  if (!isAuthenticated) {
    return <AuthGuard navigation={navigation}>{null}</AuthGuard>;
  }

  if (groupsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusBar} />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Loading your groups...</Text>
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
            onPress={() => navigation.navigate('Notifications')}
          >
            <Icon
              name="bell"
              style={styles.bellIcon}
            />
            {unreadNotifications > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <TouchableOpacity style={styles.qrCodeIcon} onPress={() => navigation.navigate('Deposit')}>
              <Icon
                name="qr-code"
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
              ${userBalances.totalSpent?.toFixed(2) || '0.00'}
            </Text>
          )}
          
          <Text style={styles.balanceLimitText}>
            Total Spending Across Groups
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
                  name="plus"
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
                  name="x"
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
              {groups
                .sort((a, b) => {
                  // Sort by highest USD value first (same as GroupsList)
                  const aUSD = groupAmountsInUSD[a.id] || 0;
                  const bUSD = groupAmountsInUSD[b.id] || 0;
                  return bUSD - aUSD;
                })
                .slice(0, 2).map((group, index) => {
                try {
                  // Use the new summary function that works with available data
                  const summary = getGroupSummary(group);
                  const isOwner = group.created_by === Number(currentUser?.id);
                  
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
                            name="users"
                            style={styles.groupGridIconSvg}
                          />
                        </View>
                        {/* Show USD-converted total */}
                        <Text style={styles.groupGridAmount}>
                          ${(groupAmountsInUSD[group.id] || 0).toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.groupGridName}>{group.name}</Text>
                      <Text style={styles.groupGridRole}>
                        {isOwner ? '👤 Owner' : '👥 Member'} • {summary.memberCount} members
                      </Text>
                      {summary.hasData ? (
                        <View style={styles.memberAvatars}>
                          {/* Show member count visually */}
                          {Array.from({ length: Math.min(summary.memberCount, 3) }).map((_, i) => (
                            <View key={i} style={styles.memberAvatar} />
                          ))}
                          {summary.memberCount > 3 && (
                            <View style={styles.memberAvatarMore}>
                              <Text style={styles.memberAvatarMoreText}>
                                +{summary.memberCount - 3}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.activityIndicator}>
                            {summary.expenseCount} expense{summary.expenseCount !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.memberAvatars}>
                          <Text style={styles.inactiveText}>No activity yet</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                } catch (error) {
                  console.error(`Error rendering group ${group.id}:`, error);
                  // Return a placeholder if there's an error with this group
                  return (
                    <View key={group.id} style={[
                      styles.groupGridCard, 
                      index === 0 ? styles.groupGridCardLeft : styles.groupGridCardRight
                    ]}>
                      <Text style={styles.errorText}>Error loading group</Text>
                    </View>
                  );
                }
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
            paymentRequests.slice(0, 2).map((request, index) => {
              try {
                return (
                  <View key={request.id || index} style={styles.requestItem}>
                    <View style={styles.requestAvatar} />
                    <View style={styles.requestDetails}>
                      <Text style={styles.requestName}>
                        {request.data?.fromUser || request.title || 'Unknown User'}
                      </Text>
                      <Text style={styles.requestDate}>
                        {request.message || `Owes you from ${request.data?.groupName || 'group activity'}`}
                      </Text>
                    </View>
                    <Text style={styles.requestAmount}>
                      ${request.data?.amount?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                );
              } catch (error) {
                console.error(`Error rendering request ${index}:`, error);
                return (
                  <View key={index} style={styles.requestItem}>
                    <View style={styles.requestAvatar} />
                    <View style={styles.requestDetails}>
                      <Text style={styles.requestName}>Error loading request</Text>
                    </View>
                  </View>
                );
              }
            })
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
              try {
                // Use the new summary function that works with available data
                const summary = getGroupSummary(group);
                const recentDate = group.updated_at || group.created_at || new Date().toISOString();
                
                return (
                  <TouchableOpacity 
                    key={group.id} 
                    style={styles.requestItem}
                    onPress={() => navigation.navigate('GroupDetails', { groupId: group.id })}
                  >
                    <View style={styles.transactionAvatar}>
                      <Text style={styles.balanceAmountText}>
                        {(group.name || 'G').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.requestDetails}>
                      <Text style={styles.requestName}>{group.name || 'Unnamed Group'}</Text>
                      <Text style={styles.requestDate}>
                        {summary.memberCount} members • {summary.expenseCount} expenses • Last activity {new Date(recentDate).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </Text>
                    </View>
                    <Text style={styles.requestAmount}>
                      ${summary.totalAmount.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              } catch (error) {
                console.error(`Error rendering transaction for group ${group.id}:`, error);
                return (
                  <View key={group.id} style={styles.requestItem}>
                    <View style={styles.requestAvatar} />
                    <View style={styles.requestDetails}>
                      <Text style={styles.requestName}>Error loading transaction</Text>
                    </View>
                  </View>
                );
              }
            })
          )}
        </View>
      </ScrollView>

      <NavBar currentRoute="Dashboard" navigation={navigation} />
    </SafeAreaView>
  );
};

export default DashboardScreen; 