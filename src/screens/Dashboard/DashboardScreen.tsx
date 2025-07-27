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
// import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import { colors } from '../../theme';
import AuthGuard from '../../components/AuthGuard';
import Icon from '../../components/Icon';
import NavBar from '../../components/NavBar';
import WalletSelectorModal from '../../components/WalletSelectorModal';
import QRCodeModal from '../../components/QRCodeModal';
import GroupIcon from '../../components/GroupIcon';
import TransactionModal from '../../components/TransactionModal';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { useGroupList } from '../../hooks/useGroupData';
import { GroupWithDetails, Expense, GroupMember, Transaction } from '../../types';
import { formatCryptoAmount } from '../../utils/cryptoUtils';
import { getTotalSpendingInUSDC } from '../../services/priceService';
import { getUserNotifications, sendNotification } from '../../services/firebaseNotificationService';
import { createPaymentRequest, getReceivedPaymentRequests } from '../../services/firebasePaymentRequestService';
import { userWalletService, UserWalletBalance } from '../../services/userWalletService';
import { firebaseTransactionService } from '../../services/firebaseDataService';


const DashboardScreen: React.FC<any> = ({ navigation }) => {
  const { state, notifications, loadNotifications, refreshNotifications } = useApp();
  const { currentUser, isAuthenticated } = state;
  const { balance: walletBalance, isConnected: walletConnected, connectWallet, walletName, refreshBalance } = useWallet();

  // Use efficient group list hook
  const {
    groups,
    loading: groupsLoading,
    refreshing,
    refresh: refreshGroups
  } = useGroupList();

  // Debug logging - only log when data actually changes
  useEffect(() => {
    if (__DEV__) {
      console.log('📊 Dashboard: Current user:', currentUser);
      console.log('📊 Dashboard: Groups loaded:', groups.length);
      console.log('📊 Dashboard: Loading state:', groupsLoading);
      console.log('📊 Dashboard: Is authenticated:', isAuthenticated);
    }
  }, [currentUser?.id, groups.length, groupsLoading, isAuthenticated]);

  const [priceLoading, setPriceLoading] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [groupAmountsInUSD, setGroupAmountsInUSD] = useState<Record<string | number, number>>({});
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [userCreatedWalletBalance, setUserCreatedWalletBalance] = useState<UserWalletBalance | null>(null);
  const [loadingUserWallet, setLoadingUserWallet] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [walletSelectorVisible, setWalletSelectorVisible] = useState(false);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [groupSummaries, setGroupSummaries] = useState<Record<string, { totalAmount: number; memberCount: number; expenseCount: number; hasData: boolean }>>({});
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);


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
              // Use simple fallback rates for now since we have proper price service
              const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
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
  }, [groups, currentUser?.id]);

  // Load notification count from context notifications
  useEffect(() => {
    if (notifications) {
      const unreadCount = notifications.filter(n => !n.is_read).length;
      setUnreadNotifications(unreadCount);
    }
  }, [notifications]);

  // Load user's created wallet balance (always load, even when external wallet is connected)
  const loadUserCreatedWalletBalance = useCallback(async () => {
    if (!currentUser?.id) {
      setUserCreatedWalletBalance(null);
      return;
    }

    try {
      setLoadingUserWallet(true);
      const balance = await userWalletService.getUserWalletBalance(currentUser.id.toString());
      setUserCreatedWalletBalance(balance);

      if (__DEV__) {
        console.log('📊 User created wallet balance loaded:', balance);
      }
    } catch (error) {
      console.error('Error loading user created wallet balance:', error);
      setUserCreatedWalletBalance(null);
    } finally {
      setLoadingUserWallet(false);
    }
  }, [currentUser?.id]);

  // Load user wallet balance when component mounts or wallet connection changes
  useEffect(() => {
    loadUserCreatedWalletBalance();
  }, [loadUserCreatedWalletBalance]);

  // Reload app wallet balance when external wallet connects/disconnects (for consistency)
  useEffect(() => {
    loadUserCreatedWalletBalance();
  }, [walletConnected, loadUserCreatedWalletBalance]);

  // Convert group amounts to USD for display with proper currency handling
  const convertGroupAmountsToUSD = useCallback(async (groups: GroupWithDetails[]) => {
    try {
      const usdAmounts: Record<string | number, number> = {};

      for (const group of groups) {
        try {
          let totalUSD = 0;

          // Check if we have expenses_by_currency data
          if (group.expenses_by_currency && Array.isArray(group.expenses_by_currency) && group.expenses_by_currency.length > 0) {
            const expenses = group.expenses_by_currency.map(expense => ({
              amount: expense.total_amount || 0,
              currency: expense.currency || 'SOL'
            }));

            // Filter out zero amounts
            const validExpenses = expenses.filter(exp => exp.amount > 0);

            if (validExpenses.length > 0) {
              try {
                totalUSD = await getTotalSpendingInUSDC(validExpenses);
                if (__DEV__) {
                  console.log(`Group "${group.name}": Price service returned $${totalUSD.toFixed(2)} for ${validExpenses.length} expenses`);
                }
              } catch (error) {
                console.error(`Price service failed for group ${group.id}:`, error);

                // Enhanced fallback with better rate handling
                for (const expense of validExpenses) {
                  const currency = (expense.currency || 'SOL').toUpperCase();

                  let rate = 1;
                  switch (currency) {
                    case 'SOL':
                      rate = 200;
                      break;
                    case 'USDC':
                    case 'USDT':
                      rate = 1;
                      break;
                    case 'BTC':
                      rate = 50000;
                      break;
                    default:
                      console.warn(`Unknown currency: ${currency}, using rate 100`);
                      rate = 100;
                  }

                  totalUSD += expense.amount * rate;
                }

                if (__DEV__) {
                  console.log(`Group "${group.name}": Fallback calculation returned $${totalUSD.toFixed(2)}`);
                }
              }
            } else {
              if (__DEV__) { console.log(`Group "${group.name}": No valid expenses found`); }
            }
          } else {
            if (__DEV__) { console.log(`Group "${group.name}": No expenses_by_currency data available`); }
          }

          usdAmounts[group.id] = totalUSD;

        } catch (error) {
          console.error(`Error processing group ${group.id}:`, error);
          usdAmounts[group.id] = 0;
        }
      }

      setGroupAmountsInUSD(usdAmounts);

      if (__DEV__) {
        console.log('📊 Group USD amounts calculated:', usdAmounts);
      }

    } catch (error) {
      console.error('Error converting group amounts to USD:', error);
    }
  }, []);

  // Load payment requests and notifications from context
  const loadPaymentRequests = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      // Get actual payment requests from Firebase
      const actualPaymentRequests = await getReceivedPaymentRequests(currentUser.id, 10);

      // Also include notifications of type 'settlement_request' and 'payment_reminder'
      const notificationRequests = notifications ? notifications.filter(n =>
        n.type === 'settlement_request' ||
        n.type === 'payment_reminder'
      ) : [];

      // Combine both types of requests
      const allRequests = [
        ...actualPaymentRequests.map(req => ({
          id: req.id,
          type: 'payment_request' as const,
          title: 'Payment Request',
          message: `${req.senderName} has requested ${req.amount} ${req.currency}${req.description ? ` for ${req.description}` : ''}`,
          data: {
            requestId: req.id,
            senderId: req.senderId,
            senderName: req.senderName,
            amount: req.amount,
            currency: req.currency,
            description: req.description,
            groupId: req.groupId,
            status: req.status
          },
          is_read: false,
          created_at: req.created_at
        })),
        ...notificationRequests
      ];

      if (__DEV__) {
        console.log('🔥 Loading payment requests:', {
          actualPaymentRequests: actualPaymentRequests.length,
          notificationRequests: notificationRequests.length,
          totalRequests: allRequests.length
        });
      }

      setPaymentRequests(allRequests);
    } catch (error) {
      console.error('Error loading payment requests:', error);
      // Fallback to notifications only
      if (notifications) {
        const requests = notifications.filter(n =>
          n.type === 'settlement_request' ||
          n.type === 'payment_reminder' ||
          n.type === 'payment_request'
        );
        setPaymentRequests(requests);
      }
    }
  }, [notifications, currentUser?.id]);

  // Load settlement requests that the current user has sent to others
  const loadOutgoingSettlementRequests = async () => {
    if (!currentUser?.id) return [];

    try {
      const requests: any[] = [];

      // Simplified: For now, use notification-based requests instead of calculating from expenses
      // since individual expense data is not available in the groups list
      if (__DEV__) { console.log('Loading settlement requests - using notification-based approach'); }

      // This will be populated when full group details are implemented
      // For now, return empty array to prevent errors

      return requests;

    } catch (error) {
      console.error('Error loading outgoing settlement requests:', error);
      return [];
    }
  };

  // Improved group summary for dashboard display
  const getGroupSummary = useCallback((group: GroupWithDetails) => {
    try {
      let totalAmount = 0;
      let memberCount = 0;
      let expenseCount = 0;

      // Use cached summary if available
      const cachedSummary = groupSummaries[group.id];
      if (cachedSummary) {
        return cachedSummary;
      }

      // Calculate total amount from expenses_by_currency
      if (group.expenses_by_currency && Array.isArray(group.expenses_by_currency) && group.expenses_by_currency.length > 0) {
        totalAmount = group.expenses_by_currency.reduce((sum, expense) => {
          return sum + (expense.total_amount || 0);
        }, 0);
      }

      // Get member count from group data
      memberCount = group.member_count || group.members?.length || 0;

      // Get expense count from group data
      expenseCount = group.expense_count || group.expenses?.length || 0;

      // Check if group has any meaningful data
      const hasData = totalAmount > 0 || memberCount > 0 || expenseCount > 0;

      if (__DEV__) {
        console.log(`📊 Group "${group.name}" summary:`, {
          totalAmount,
          memberCount,
          expenseCount,
          hasData,
          expensesByCurrency: group.expenses_by_currency?.length || 0
        });
      }

      return {
        totalAmount,
        memberCount,
        expenseCount,
        hasData
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
  }, [groupSummaries]);

  // Async function to update group summaries with individual expenses
  const updateGroupSummaries = useCallback(async (groups: GroupWithDetails[]) => {
    try {
      const newSummaries: Record<string, { totalAmount: number; memberCount: number; expenseCount: number; hasData: boolean }> = {};
      
      for (const group of groups) {
        let totalAmount = 0;
        let memberCount = group.member_count || group.members?.length || 0;
        let expenseCount = group.expense_count || group.expenses?.length || 0;

        // Calculate total amount from expenses_by_currency
        if (group.expenses_by_currency && Array.isArray(group.expenses_by_currency) && group.expenses_by_currency.length > 0) {
          totalAmount = group.expenses_by_currency.reduce((sum, expense) => {
            return sum + (expense.total_amount || 0);
          }, 0);
        } else {
          // If expenses_by_currency is empty, fetch individual expenses
          try {
            const { firebaseDataService } = await import('../../services/firebaseDataService');
            const individualExpenses = await firebaseDataService.expense.getGroupExpenses(group.id.toString());
            
            if (individualExpenses.length > 0) {
              // Calculate total from individual expenses
              const currencyTotals: Record<string, number> = {};
              
              individualExpenses.forEach(expense => {
                const currency = expense.currency || 'SOL';
                const amount = expense.amount || 0;
                
                if (!currencyTotals[currency]) {
                  currencyTotals[currency] = 0;
                }
                currencyTotals[currency] += amount;
              });
              
              // Convert to USD for display
              totalAmount = Object.entries(currencyTotals).reduce((sum, [currency, total]) => {
                const rate = currency === 'SOL' ? 200 : (currency === 'USDC' ? 1 : 100);
                return sum + (total * rate);
              }, 0);
              
              if (__DEV__) {
                console.log(`🔧 Dashboard: Calculated total from individual expenses for group "${group.name}": $${(totalAmount || 0).toFixed(2)}`);
              }
            }
          } catch (error) {
            console.error(`Error fetching individual expenses for group ${group.id}:`, error);
          }
        }

        const hasData = totalAmount > 0 || memberCount > 0 || expenseCount > 0;
        
        newSummaries[group.id] = {
          totalAmount,
          memberCount,
          expenseCount,
          hasData
        };
      }
      
      setGroupSummaries(newSummaries);
    } catch (error) {
      console.error('Error updating group summaries:', error);
    }
  }, []);

  // Convert amounts when groups change (similar to GroupsList)
  useEffect(() => {
    if (groups.length > 0) {
      convertGroupAmountsToUSD(groups);
      updateGroupSummaries(groups);
    }
  }, [groups]); // Remove convertGroupAmountsToUSD dependency to prevent infinite loops

  // Load data when component mounts or comes into focus - FIXED: Remove problematic dependencies
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && currentUser?.id) {
        // Only load groups if we don't have any or if they're stale
        if (groups.length === 0) {
          refreshGroups().then(() => {
            loadPaymentRequests();
          });
        } else {
          // Just load payment requests if groups are already cached
          loadPaymentRequests();
        }
      }
    }, [isAuthenticated, currentUser?.id, groups.length]) // Add groups.length to check if we need to load
  );

  // Load notifications when dashboard loads
  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      loadNotifications();
    }
  }, [isAuthenticated, currentUser?.id]); // Remove loadNotifications dependency

  const handleSendRequestFromDashboard = async (request: any) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      if (__DEV__) { console.log('🔥 Sending payment request from dashboard:', request); }

      // Create payment request using the new service
      const paymentRequest = await createPaymentRequest(
        currentUser.id, // senderId
        request.fromUserId, // recipientId
        request.amount,
        request.currency,
        request.message, // description
        request.groupId // optional groupId
      );

      if (__DEV__) { console.log('🔥 Payment request created:', paymentRequest); }

      if (paymentRequest && paymentRequest.id) {
        Alert.alert(
          'Request Sent!',
          `Payment request for ${request.amount} ${request.currency} has been sent to ${request.fromUser}.`,
          [{ text: 'OK' }]
        );

        // Refresh the payment requests and notifications
        await Promise.all([
          loadPaymentRequests(),
          loadNotifications(true)
        ]);
      } else {
        throw new Error('Failed to create payment request');
      }
    } catch (error) {
      console.error('Error sending payment request:', error);
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
        refreshNotifications(),
        refreshBalance(), // Add balance refresh to pull-to-refresh
      ]);
      loadPaymentRequests();
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
             {/*  {walletConnected && (
                <Text style={[styles.welcomeText, { fontSize: 12, color: colors.brandGreen }]}>
                  💰 External Wallet
                </Text>
              )}
             {!walletConnected && userCreatedWalletBalance && (
                <Text style={[styles.welcomeText, { fontSize: 12, color: colors.textLightSecondary }]}>
                  📱 App Wallet
                </Text>
              )}*/}

            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!walletConnected && (
              <TouchableOpacity
                style={{
                  padding: 8,
                  backgroundColor: connectingWallet ? colors.darkCard : colors.brandGreen,
                  borderRadius: 4,
                  marginRight: 8,
                  opacity: connectingWallet ? 0.7 : 1
                }}
                onPress={async () => {
                  if (connectingWallet) return;

                  try {
                    setConnectingWallet(true);
                    await connectWallet();
                    // The wallet connection will be handled by the WalletContext
                    // and the UI will update automatically
                  } catch (error) {
                    console.error('Error connecting wallet:', error);
                    // Error handling is already done in the WalletContext
                  } finally {
                    setConnectingWallet(false);
                  }
                }}
                disabled={connectingWallet}
              >
                <Text style={{
                  color: connectingWallet ? colors.textLight : colors.black,
                  fontSize: 12,
                  fontWeight: 'bold'
                }}>
                  {connectingWallet ? 'Connecting...' : 'Connect Wallet'}
                </Text>
              </TouchableOpacity>
            )}
            {__DEV__ && (
              <TouchableOpacity
                style={{ padding: 8, backgroundColor: '#444', borderRadius: 4, marginRight: 8 }}
                onPress={async () => {
                  try {
                    if (currentUser?.id) {
                      // Create a test payment request to yourself
                      await createPaymentRequest(
                        currentUser.id,
                        currentUser.id, // Send to yourself for testing
                        25.50,
                        'USDC',
                        'Test payment request from dashboard'
                      );
                      await Promise.all([
                        loadPaymentRequests(),
                        loadNotifications(true)
                      ]);
                      Alert.alert('Success', 'Test payment request created!');
                    }
                  } catch (error) {
                    console.error('Error creating test payment request:', error);
                    Alert.alert('Error', 'Failed to create test payment request');
                  }
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 12 }}>Test PR</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.bellContainer}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon
                name="bell"
                color={colors.white}
                style={styles.bellIcon}
              />
              {unreadNotifications > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <View style={[styles.balanceCard, { alignItems: 'flex-start' }]}>
                      <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>
              App Wallet Balance
              </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Refresh Balance Button */}
              {userCreatedWalletBalance && (
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primaryGreen + '20',
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    borderRadius: 8,
                    marginRight: 8,
                  }}
                  onPress={async () => {
                      await loadUserCreatedWalletBalance();
                  }}
                >
                  <Icon name="refresh-cw" size={14} color={colors.primaryGreen} />
                </TouchableOpacity>
              )}

                            {/* Wallet Selector Button */}
                            <TouchableOpacity
                style={{
                  backgroundColor: colors.primaryGreen + '20',
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  borderRadius: 8,
                  marginLeft: 8,
                }}
                onPress={() => setWalletSelectorVisible(true)}
              >
                <Icon name="settings" size={14} color={colors.primaryGreen} />
              </TouchableOpacity>

              {/* QR Code Button for Deposits */}
              <TouchableOpacity 
                style={styles.qrCodeIcon} 
                onPress={() => setQrCodeModalVisible(true)}
              >
                <Image
                  source={require('../../../assets/qr-code-scan.png')}
                  style={styles.qrCodeImage}
                />
              </TouchableOpacity>


            </View>
          </View>

          {priceLoading ? (
            <View style={styles.priceLoadingContainer}>
              <ActivityIndicator size="small" color={BG_COLOR} />
              <Text style={styles.priceLoadingText}>
                {loadingUserWallet ? 'Loading your wallet...' : 'Loading balance...'}
              </Text>
            </View>
          ) : (
            <View style={styles.balanceContainer}>
              {/* Balance Display */}
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Image
                    source={require('../../../assets/usdc-logo-black.png')}
                    style={styles.balanceUsdcLogo}
                  />
                  <Text style={[styles.balanceAmount, { textAlign: 'left', alignSelf: 'flex-start' }]}>
                    {(userCreatedWalletBalance?.totalUSD || 0).toFixed(2)}
                  </Text>
                </View>
               {/*} <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 4,
                }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.textLightSecondary,
                    marginRight: 6,
                  }} />
                  <Text style={{
                    fontSize: 12,
                    color: colors.textLightSecondary,
                    fontWeight: '500',
                  }}>
                    Your Balance
                  </Text>
                </View>*/}
              </View>
            </View>
          )}

          <Text style={styles.balanceLimitText}>
            Balance Limit $1000
          </Text>

          {/* {!walletConnected && userCreatedWalletBalance && (
            <TouchableOpacity
              style={[
                styles.connectWalletButton,
                connectingWallet && { opacity: 0.7, backgroundColor: colors.darkCard }
              ]}
              onPress={async () => {
                if (connectingWallet) return;

                try {
                  setConnectingWallet(true);
                  await connectWallet();
                  // The wallet connection will be handled by the WalletContext
                  // and the UI will update automatically
                } catch (error) {
                  console.error('Error connecting wallet:', error);
                  // Error handling is already done in the WalletContext
                } finally {
                  setConnectingWallet(false);
                }
              }}
              disabled={connectingWallet}
            >
              <Text style={[
                styles.connectWalletButtonText,
                connectingWallet && { color: colors.textLight }
              ]}>
                {connectingWallet ? 'Connecting...' : 'Connect External Wallet'}
              </Text>
            </TouchableOpacity>
          )}*/}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Send')}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/icon-send.png')}
                  style={styles.actionButtonIcon}
                />
              </View>
              <Text style={styles.actionButtonText}>Send to</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('RequestContacts')}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/icon-receive.png')}
                  style={styles.actionButtonIcon}
                />
              </View>
              <Text style={styles.actionButtonText}>Request</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Deposit')}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/icon-deposit.png')}
                  style={styles.actionButtonIcon}
                />
              </View>
              <Text style={styles.actionButtonText}>Top up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                navigation.navigate('WithdrawAmount');
              }}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/icon-withdraw.png')}
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
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.groupsGrid}
            >
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
                        {/* Background */}
                        <View style={styles.groupGridCardGradient} />
                        <View style={styles.groupGridCardGradientOverlay} />
                        <View style={styles.groupGridHeader}>
                          <GroupIcon
                            category={group.category || 'trip'}
                            color={group.color || '#A5EA15'}
                            size={40}
                          />
                          {/* Show USD-converted total */}
                          <View style={styles.groupGridAmountContainer}>
                            <Image
                              source={require('../../../assets/usdc-logo-black.png')}
                              style={styles.usdcLogo}
                            />
                            <Text style={styles.groupGridAmount}>
                              {(groupSummaries[group.id]?.totalAmount || groupAmountsInUSD[group.id] || 0).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.groupGridName}>{group.name}</Text>
                        <View style={styles.groupGridRoleContainer}>
                          <Icon
                            name={isOwner ? "award" : "users"}
                            size={16}
                            color={colors.black}
                            style={styles.groupGridRoleIcon}
                          />
                          <Text style={styles.groupGridRole}>
                            {isOwner ? 'Owner' : 'Member'}
                          </Text>
                        </View>
                        {summary.hasData ? (
                          <View style={styles.memberAvatars}>
                            {/* Show member avatars */}
                            {group.members && group.members.slice(0, 3).map((member, i) => (
                              <View key={member.id} style={styles.memberAvatar}>
                                {member.avatar && member.avatar.trim() !== '' ? (
                                  <Image
                                    source={{ uri: member.avatar }}
                                    style={styles.memberAvatarImage}
                                  />
                                ) : (
                                  <Text style={styles.memberAvatarText}>
                                    {((member.name || member.email || 'U') as string).charAt(0).toUpperCase()}
                                  </Text>
                                )}
                              </View>
                            ))}
                            {summary.memberCount > 3 && (
                              <View style={styles.memberAvatarMore}>
                                <Text style={styles.memberAvatarMoreText}>
                                  +{summary.memberCount - 3}
                                </Text>
                              </View>
                            )}

                          </View>
                        ) : (
                          <View style={styles.memberAvatars}>
                            <Text style={styles.inactiveText}>No activity yet</Text>
                          </View>
                        )}
                        {/* Navigation arrow */}
                        <View style={styles.groupGridArrow}>
                          <Icon name="chevron-right" size={20} color={colors.black} />
                        </View>
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
            </ScrollView>
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
                const senderName = request.data?.senderName || request.data?.fromUser || request.title || 'Unknown User';
                const amount = request.data?.amount || 0;
                const currency = request.data?.currency || 'USDC';
                const source = request.data?.groupName || 'group activity';
                const senderAvatar = request.data?.senderAvatar || null;

                return (
                  <View key={request.id || index} style={styles.requestItemNew}>
                    <View style={styles.requestAvatarNew}>
                      {senderAvatar && senderAvatar.trim() !== '' ? (
                        <Image
                          source={{ uri: senderAvatar }}
                          style={styles.requestAvatarImage}
                        />
                      ) : (
                        <Text style={styles.balanceAmountText}>
                          {(senderName || 'U').charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.requestContent}>
                      <Text style={styles.requestMessageWithAmount}>
                        <Text style={styles.requestSenderName}>{senderName}</Text> requested a payment of{' '}
                        <Text style={styles.requestAmountGreen}>
                          {amount.toFixed(1)} USDC
                        </Text>
                      </Text>
                      <Text style={styles.requestSource}>
                        from {source}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.requestSendButtonNew}
                      onPress={() => {
                        // Handle send payment logic here
                        Alert.alert('Send Payment', `Send ${amount.toFixed(2)} ${currency} to ${senderName}?`);
                      }}
                    >
                      <Text style={styles.requestSendButtonTextNew}>Send</Text>
                    </TouchableOpacity>
                  </View>
                );
              } catch (error) {
                console.error(`Error rendering request ${index}:`, error);
                return (
                  <View key={index} style={styles.requestItemNew}>
                    <View style={styles.requestAvatarNew}>
                      <Text style={styles.balanceAmountText}>E</Text>
                    </View>
                    <View style={styles.requestContent}>
                      <Text style={styles.requestSenderName}>Error loading request</Text>
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
            <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
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
                
                // Determine transaction type and icon based on group activity
                const transactionType = summary.expenseCount > 0 ? 'send' : 'request';
                const transactionTitle = summary.expenseCount > 0 ? `Send to ${group.name}` : `Request to ${group.name}`;
                const transactionNote = summary.expenseCount > 0 ? `Group expenses` : `Group activity`;
                const transactionTime = new Date(recentDate).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });

                return (
                  <TouchableOpacity
                    key={group.id}
                    style={styles.requestItemNew}
                                         onPress={() => {
                       // Open transaction modal for group details without navigation
                       const mockTransaction: Transaction = {
                         id: group.id.toString(),
                         type: transactionType === 'send' ? 'send' : 'receive',
                         amount: summary.totalAmount || 0,
                         currency: 'USDC',
                         from_user: currentUser?.id?.toString() || '',
                         to_user: group.name,
                         from_wallet: currentUser?.wallet_address || '',
                         to_wallet: group.name,
                         tx_hash: `group_${group.id}_${Date.now()}`,
                         note: transactionNote,
                         created_at: recentDate,
                         updated_at: recentDate,
                         status: 'completed'
                       };
                       setSelectedTransaction(mockTransaction);
                       setTransactionModalVisible(true);
                     }}
                  >
                    <View style={styles.transactionAvatarNew}>
                      <Image
                        source={
                          transactionType === 'send' 
                            ? require('../../../assets/icon-send.png')
                            : require('../../../assets/icon-receive.png')
                        }
                        style={styles.transactionIcon}
                      />
                    </View>
                    <View style={styles.requestContent}>
                      <Text style={styles.requestMessageWithAmount}>
                        <Text style={styles.requestSenderName}>{transactionTitle}</Text>
                      </Text>
                      <Text style={styles.requestSource}>
                        {transactionNote} • {transactionTime}
                      </Text>
                    </View>
                    <Text style={styles.requestAmountGreen}>
                      {(summary.totalAmount || 0).toFixed(2)} USDC
                    </Text>
                  </TouchableOpacity>
                );
              } catch (error) {
                console.error(`Error rendering transaction for group ${group.id}:`, error);
                return (
                  <View key={group.id} style={styles.requestItemNew}>
                    <View style={styles.requestAvatarNew}>
                      <Text style={styles.balanceAmountText}>E</Text>
                    </View>
                    <View style={styles.requestContent}>
                      <Text style={styles.requestSenderName}>Error loading transaction</Text>
                    </View>
                  </View>
                );
              }
            })
          )}
        </View>
        
      </ScrollView>

      {/* Wallet Selector Modal */}
      <WalletSelectorModal
        visible={walletSelectorVisible}
        onClose={() => setWalletSelectorVisible(false)}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        visible={qrCodeModalVisible}
        onClose={() => setQrCodeModalVisible(false)}
        qrValue={currentUser?.wallet_address || ''}
        title="Show QR code to your friend"
        displayName={currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
        isGroup={false}
      />

             {/* Transaction Modal */}
       <TransactionModal
         visible={transactionModalVisible}
         onClose={() => {
           setTransactionModalVisible(false);
           setSelectedTransaction(null);
         }}
         transaction={selectedTransaction}
       />

      <NavBar currentRoute="Dashboard" navigation={navigation} />
    </SafeAreaView>
  );
};

export default DashboardScreen; 