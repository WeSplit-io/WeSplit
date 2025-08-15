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
import { generateProfileLink } from '../../services/deepLinkHandler';

// Avatar component with loading state and error handling
const AvatarComponent = ({ avatar, displayName, style }: { avatar?: string, displayName: string, style: any }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (avatar && avatar.trim() !== '') {
      setIsLoading(true);
      setHasError(false);
    }
  }, [avatar]);

  if (!avatar || avatar.trim() === '' || hasError) {
    return (
      <View style={[style, { backgroundColor: colors.brandGreen, borderRadius: style.width / 2, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.darkBackground }}>
          {displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <View style={style}>
      {isLoading && (
        <View style={[style, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.darkBorder, borderRadius: style.width / 2, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="small" color={colors.primaryGreen} />
        </View>
      )}
      <Image 
        source={{ uri: avatar }} 
        style={[style, { opacity: isLoading ? 0 : 1 }]}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </View>
  );
};


const DashboardScreen: React.FC<any> = ({ navigation }) => {
  const { state, notifications, loadNotifications, refreshNotifications, updateUser } = useApp();
  const { currentUser, isAuthenticated } = state;
  const { 
    // App wallet state and actions
    appWalletAddress,
    appWalletBalance,
    appWalletConnected,
    ensureAppWallet,
    getAppWalletBalance
  } = useWallet();

  // Use efficient group list hook
  const {
    groups,
    loading: groupsLoading,
    refreshing,
    refresh: refreshGroups
  } = useGroupList();

  // Load groups when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadGroups = async () => {
        try {
          if (currentUser?.id) {
            await refreshGroups(); // Use the refresh function from useGroupList
          }
        } catch (err) {
          // Keep error logging for debugging
          console.error('❌ Dashboard: Error loading groups:', err);
        }
      };

      loadGroups();
    }, [currentUser?.id, refreshGroups])
  );

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
  const [realTransactions, setRealTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [groupTransactions, setGroupTransactions] = useState<any[]>([]);
  const [loadingGroupTransactions, setLoadingGroupTransactions] = useState(false);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  const [initialRequestsLoaded, setInitialRequestsLoaded] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render
  const [refreshBalance, setRefreshBalance] = useState<number | null>(null); // Local refresh balance


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
    // Note: Full balance calculation will be implemented when group details are available
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
      
      // First ensure the user has a wallet
      const walletResult = await userWalletService.ensureUserWallet(currentUser.id.toString());
      
      if (walletResult.success && walletResult.wallet) {
        // Update user's wallet information in app context if it's different
        if (currentUser.wallet_address !== walletResult.wallet.address) {
          try {
            await updateUser({
              wallet_address: walletResult.wallet.address,
              wallet_public_key: walletResult.wallet.publicKey
            });
          } catch (updateError) {
              // Keep error logging for debugging
            console.error('Failed to update user wallet info in app context:', updateError);
          }
        }
        
        // Now get the balance
        const balance = await userWalletService.getUserWalletBalance(currentUser.id.toString());
        setUserCreatedWalletBalance(balance);
      } else {
          // Keep error logging for debugging
        console.error('Failed to ensure wallet for dashboard:', walletResult.error);
        setUserCreatedWalletBalance(null);
      }
    } catch (error) {
      // Keep error logging for debugging
      console.error('Error loading user created wallet balance:', error);
      setUserCreatedWalletBalance(null);
    } finally {
      setLoadingUserWallet(false);
    }
  }, [currentUser?.id]);

  // Load user wallet balance when component mounts or wallet connection changes
  useEffect(() => {
    loadUserCreatedWalletBalance();
  }, [currentUser?.id, updateUser]); // Add updateUser dependency

  // Reload app wallet balance when app wallet state changes (for consistency)
  useEffect(() => {
    if (currentUser?.id) {
    loadUserCreatedWalletBalance();
    }
  }, [appWalletConnected, currentUser?.id, updateUser]); // Add updateUser dependency

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
              } catch (error) {
                // Keep error logging for debugging
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
                      // Keep warning for unknown currencies
                      console.warn(`Unknown currency: ${currency}, using rate 100`);
                      rate = 100;
                  }

                  totalUSD += expense.amount * rate;
                }
                }
              }
          }

          usdAmounts[group.id] = totalUSD;

        } catch (error) {
          // Keep error logging for debugging
          console.error(`Error processing group ${group.id}:`, error);
          usdAmounts[group.id] = 0;
        }
      }

      setGroupAmountsInUSD(usdAmounts);

    } catch (error) {
      // Keep error logging for debugging
      console.error('Error converting group amounts to USD:', error);
    }
  }, []);

  // Load payment requests and notifications from context
  const loadPaymentRequests = useCallback(async () => {
    if (!currentUser?.id) return;

    // Prevent duplicate calls
    if (loadingPaymentRequests) return;

    // Wait for notifications to be available
    if (!notifications) {
      console.log('⏳ Dashboard: Waiting for notifications to load...');
      return;
    }

    // If we already have requests and this isn't a refresh, skip loading
    if (initialRequestsLoaded && paymentRequests.length > 0 && notifications.length === 0) {
      console.log('⏭️ Dashboard: Skipping payment requests load - already loaded and no new notifications');
      return;
    }

    setLoadingPaymentRequests(true);

    try {
      console.log('🔄 Dashboard: Loading payment requests...');
      // Get actual payment requests from Firebase
      const actualPaymentRequests = await getReceivedPaymentRequests(currentUser.id, 10);
      console.log('📊 Dashboard: Firebase payment requests:', actualPaymentRequests.length);

      // Also include notifications of type 'payment_request', 'settlement_request' and 'payment_reminder'
      const notificationRequests = notifications ? notifications.filter(n =>
        n.type === 'payment_request' ||
        n.type === 'settlement_request' ||
        n.type === 'payment_reminder'
      ) : [];
      console.log('📊 Dashboard: Notification requests:', notificationRequests.length);

      // Create a map to track processed requests to avoid duplicates
      const processedRequestIds = new Set<string>();
      const processedNotificationIds = new Set<string>();
      const allRequests: any[] = [];

      // First, add actual payment requests from Firebase
      actualPaymentRequests
        .filter(req => req.amount > 0) // Filter out $0 requests
        .forEach(req => {
          const requestId = req.id;
          processedRequestIds.add(requestId);
          console.log('📝 Dashboard: Added Firebase request:', requestId, req.senderName, req.amount);
          
          allRequests.push({
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
          });
        });

      // Then, add notification requests that don't have corresponding Firebase payment requests
      notificationRequests
        .filter(n => {
          // Filter out notifications with $0 amounts
          const amount = n.data?.amount || 0;
          if (amount <= 0) return false;
          
          // Check if this notification corresponds to a Firebase payment request
          const requestId = n.data?.requestId;
          if (requestId && processedRequestIds.has(requestId)) {
            console.log('🚫 Dashboard: Skipping duplicate notification:', requestId, n.data?.senderName, amount);
            return false; // Skip this notification as we already have the Firebase request
          }
          
          // Also check if we've already processed this notification ID
          const notificationId = String(n.id);
          if (processedNotificationIds.has(notificationId)) {
            console.log('🚫 Dashboard: Skipping duplicate notification ID:', notificationId, n.data?.senderName, amount);
            return false;
          }
          
          // Add to processed set to prevent duplicates within notifications
          processedNotificationIds.add(notificationId);
          console.log('📝 Dashboard: Added notification request:', n.id, n.data?.senderName, amount);
          return true;
        })
        .forEach(n => {
          allRequests.push(n);
        });

      // Sort by creation date (latest first)
      allRequests.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Latest first
      });



      console.log('✅ Dashboard: Payment requests loaded successfully:', allRequests.length);
      console.log('📋 Dashboard: Final requests:', allRequests.map(r => ({
        id: r.id,
        sender: r.data?.senderName || r.data?.fromUser,
        amount: r.data?.amount,
        type: r.type
          })));
      setPaymentRequests(allRequests);
      
      // Mark as initially loaded if this is the first successful load
      if (!initialRequestsLoaded) {
        setInitialRequestsLoaded(true);
        console.log('🎯 Dashboard: Initial payment requests loaded');
      }
    } catch (error) {
      // Keep error logging for debugging
      console.error('Error loading payment requests:', error);
      // Fallback to notifications only
      if (notifications) {
        const requests = notifications
          .filter(n =>
            (n.type === 'settlement_request' ||
             n.type === 'payment_reminder' ||
             n.type === 'payment_request') &&
            (n.data?.amount || 0) > 0 // Filter out $0 requests
          )
          .sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA; // Latest first
          });
        setPaymentRequests(requests);
      }
    } finally {
      setLoadingPaymentRequests(false);
    }
  }, [notifications, currentUser?.id]);

  // Load settlement requests that the current user has sent to others
  const loadOutgoingSettlementRequests = async () => {
    if (!currentUser?.id) return [];

    try {
      const requests: any[] = [];

      // Simplified: For now, use notification-based requests instead of calculating from expenses
      // since individual expense data is not available in the groups list

      // This will be populated when full group details are implemented
      // For now, return empty array to prevent errors

      return requests;

    } catch (error) {
      // Keep error logging for debugging
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



      return {
        totalAmount,
        memberCount,
        expenseCount,
        hasData
      };
    } catch (error) {
      // Keep error logging for debugging
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
              

            }
          } catch (error) {
            // Keep error logging for debugging
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
      // Keep error logging for debugging
      console.error('Error updating group summaries:', error);
    }
  }, []);

  // Convert amounts when groups change (similar to GroupsList)
  useEffect(() => {
    if (groups.length > 0) {
      convertGroupAmountsToUSD(groups);
      updateGroupSummaries(groups);
    }
  }, [groups.length]); // Only depend on groups length to prevent unnecessary recalculations

  // Load real transactions from Firebase
  const loadRealTransactions = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setLoadingTransactions(true);
      
      const userTransactions = await firebaseTransactionService.getUserTransactions(currentUser.id.toString());
      
      setRealTransactions(userTransactions);
    } catch (error) {
      // Keep error logging for debugging
      console.error('🔥 Dashboard: Error loading real transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  }, [currentUser?.id]);

  // Load real transactions when component mounts or comes into focus
  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      loadRealTransactions();
    }
  }, [isAuthenticated, currentUser?.id, loadRealTransactions]); // Add loadRealTransactions dependency

  // Monitor balance changes and show notifications for new transactions
  useEffect(() => {
    if (userCreatedWalletBalance) {
      // This effect will trigger when the balance changes due to polling
      // You could add logic here to detect significant changes and show notifications
      console.log('💰 Dashboard: Balance updated:', userCreatedWalletBalance.totalUSD);
    }
  }, [userCreatedWalletBalance?.totalUSD, forceUpdate]); // Added forceUpdate dependency


  // Load data when component mounts or comes into focus - FIXED: Remove problematic dependencies
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && currentUser?.id) {
        // Initialize app wallet for the user
        ensureAppWallet(currentUser.id.toString()).then(async () => {
          // Get app wallet balance
          await getAppWalletBalance(currentUser.id.toString());
          
          // Update user's wallet information if it's different
          if (appWalletAddress && currentUser.wallet_address !== appWalletAddress) {
            try {
              await updateUser({
                wallet_address: appWalletAddress,
                wallet_public_key: appWalletAddress // For app wallet, use address as public key
              });
            } catch (updateError) {
              // Keep error logging for debugging
              console.error('Failed to update user app wallet info in focus effect:', updateError);
            }
          }
          
          // Also load user created wallet balance for backward compatibility
          loadUserCreatedWalletBalance();
        }).catch(error => {
          // Keep error logging for debugging
          console.error('Error initializing app wallet:', error);
        });

        // Always ensure groups are loaded when returning to dashboard
        // This handles the case where user logs out and comes back
        if (groups.length === 0 && !groupsLoading) {
          refreshGroups().then(() => {
            // Only load transactions here, payment requests will be loaded by the notifications effect
            loadRealTransactions(); // Load real transactions
          });
        } else {
          // Just load transactions if groups are already cached
          // Payment requests will be loaded by the notifications effect
          loadRealTransactions(); // Load real transactions
        }
      }
    }, [isAuthenticated, currentUser?.id, groups.length]) // Simplified dependencies to prevent unnecessary re-runs
  );

  // Load notifications when dashboard loads
  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      loadNotifications().then(() => {
        // Add a small delay to ensure notifications are fully processed
        setTimeout(() => {
        loadPaymentRequests();
        }, 500);
      });
    }
  }, [isAuthenticated, currentUser?.id, loadNotifications]); // Remove loadPaymentRequests from dependencies to prevent infinite loops

  // Note: Group loading is now handled by useGroupList hook to prevent infinite loops

  const handleSendRequestFromDashboard = async (request: any) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      // Create payment request using the new service
      const paymentRequest = await createPaymentRequest(
        currentUser.id, // senderId
        request.fromUserId, // recipientId
        request.amount,
        request.currency,
        request.message, // description
        request.groupId // optional groupId
      );

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
      // Keep error logging for debugging
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
      console.log('🔄 Dashboard: Manual refresh triggered');
      
      // Ensure wallet exists and refresh balance
      const walletResult = await userWalletService.ensureUserWallet(currentUser.id.toString());
      
      // Update user's wallet information if it changed
      if (walletResult.success && walletResult.wallet && currentUser.wallet_address !== walletResult.wallet.address) {
        try {
          await updateUser({
            wallet_address: walletResult.wallet.address,
            wallet_public_key: walletResult.wallet.publicKey
          });
        } catch (updateError) {
          console.error('Failed to update user wallet info in refresh:', updateError);
        }
      }
      
      // Force refresh the wallet balance directly
      if (walletResult.success && walletResult.wallet) {
        console.log('💰 Dashboard: Refreshing wallet balance directly...');
        console.log('💰 Dashboard: Current balance state:', userCreatedWalletBalance);
        
        try {
          setLoadingUserWallet(true);
          
          // Get the balance directly from the service
          const balance = await userWalletService.getUserWalletBalance(currentUser.id.toString());
          
          if (balance) {
            console.log('💰 Dashboard: New balance detected:', balance.totalUSD, 'USD');
            console.log('💰 Dashboard: USDC balance:', balance.usdcBalance, 'USDC');
            console.log('💰 Dashboard: Setting new balance...');
            
            // Update local refresh balance immediately
            setRefreshBalance(balance.totalUSD);
            console.log('💰 Dashboard: Local refresh balance set to:', balance.totalUSD);
            
            // Force immediate state update
            setUserCreatedWalletBalance(null); // Clear first
            setTimeout(() => {
              setUserCreatedWalletBalance(balance); // Set new value
              console.log('💰 Dashboard: Balance state after update:', balance);
            }, 50);
            
            // Force a re-render to update the UI
            setForceUpdate(prev => prev + 1);
            console.log('🔄 Dashboard: Forcing re-render...');
            
            // Alternative approach: force state update with minimal delay
            setTimeout(() => {
              console.log('⏰ Dashboard: Alternative force update...');
              setUserCreatedWalletBalance({...balance});
            }, 100);
          } else {
            console.error('❌ Dashboard: Failed to get wallet balance');
          }
        } catch (error) {
          console.error('❌ Dashboard: Error getting wallet balance:', error);
        } finally {
          setLoadingUserWallet(false);
        }
      }
      
      await Promise.all([
        refreshGroups(),
        refreshNotifications(),
        loadRealTransactions(), // Refresh real transactions
      ]);
      
      console.log('✅ Dashboard: Refresh completed successfully');
      
    } catch (error) {
      console.error('❌ Dashboard: Error during refresh:', error);
    }
  };



  // Enhanced transaction display functions (consistent with TransactionHistoryScreen)
  const getTransactionIcon = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-send.png?alt=media&token=d733fbce-e383-4cae-bd93-2fc16c36a2d9' };
      case 'receive':
        return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-receive.png?alt=media&token=c55d7c97-b027-4841-859e-38c46c2f36c5' };
      case 'deposit':
        return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-deposit.png?alt=media&token=d832bae5-dc8e-4347-bab5-cfa9621a5c55' };
      case 'withdraw':
        return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-withdraw.png?alt=media&token=8c0da99e-287c-4d19-8515-ba422430b71b' };
      default:
        return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-send.png?alt=media&token=d733fbce-e383-4cae-bd93-2fc16c36a2d9' };
    }
  };

  const getTransactionTitle = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        return `Send to ${transaction.to_user}`;
      case 'receive':
        return `Received from ${transaction.from_user}`;
      case 'deposit':
        return 'Top Up Wallet';
      case 'withdraw':
        return 'Withdraw';
      default:
        return 'Transaction';
    }
  };

  const getTransactionSource = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        return transaction.note || 'Payment';
      case 'receive':
        return transaction.note || 'Payment received';
      case 'deposit':
        return 'MoonPay';
      case 'withdraw':
        return 'Wallet';
      default:
        return '';
    }
  };

  const getTransactionAmount = (transaction: Transaction) => {
    const amount = transaction.amount;
    const isIncome = transaction.type === 'receive' || transaction.type === 'deposit';
    
    return {
      amount: amount.toFixed(2),
      color: isIncome ? colors.primaryGreen : colors.textLight
    };
  };

  // Load all individual expenses from all groups and create transaction list
  const loadAllGroupExpenses = useCallback(async () => {
    if (groups.length === 0) {
      setGroupTransactions([]);
      setLoadingGroupTransactions(false);
      return;
    }

    setLoadingGroupTransactions(true);
    const allExpenses: any[] = [];

    try {
      const { firebaseDataService } = await import('../../services/firebaseDataService');
      
      // Fetch all expenses from all groups
      for (const group of groups) {
        try {
          const groupExpenses = await firebaseDataService.expense.getGroupExpenses(group.id.toString());
          
          // Add group info to each expense
          const expensesWithGroupInfo = groupExpenses.map(expense => ({
            ...expense,
            groupName: group.name,
            groupId: group.id,
            groupCategory: group.category,
            groupColor: group.color
          }));
          
          allExpenses.push(...expensesWithGroupInfo);
        } catch (error) {
          console.error(`Error fetching expenses for group ${group.id}:`, error);
        }
      }

      // Sort all expenses by creation date (newest first)
      allExpenses.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      // Convert expenses to transaction components (limit to first 2 for dashboard, with preview of 3rd)
      const transactionComponents = await Promise.all(allExpenses.slice(0, 2).map(async (expense) => {
        const expenseTime = new Date(expense.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        // Get the actual user name who paid this expense
        let payerName = 'Member';
        if (String(expense.paid_by) === String(currentUser?.id)) {
          payerName = 'You';
        } else if (expense.paid_by_name) {
          payerName = expense.paid_by_name;
        } else {
          // Try to get user name from group members or contacts
          try {
            const { firebaseDataService } = await import('../../services/firebaseDataService');
            const groupMembers = await firebaseDataService.group.getGroupMembers(expense.groupId.toString());
            const payerMember = groupMembers.find(member => String(member.id) === String(expense.paid_by));
            if (payerMember) {
              payerName = payerMember.name || payerMember.email?.split('@')[0] || 'Member';
            }
          } catch (error) {
            console.error(`Error fetching payer details for expense ${expense.id}:`, error);
          }
        }

        // Determine if current user paid this expense
        const isCurrentUserPaid = String(expense.paid_by) === String(currentUser?.id);
        const transactionType = isCurrentUserPaid ? 'send' : 'receive';
        
        // Use "add an expense" for group expenses, "paid" for actual payments
        const actionText = 'added an expense in';
        const transactionTitle = isCurrentUserPaid 
          ? `You ${actionText} ${expense.description || 'expense'}`
          : `${payerName} ${actionText} ${expense.description || 'expense'}`;
        
        const transactionNote = `${expense.groupName} • ${expense.currency || 'USDC'}`;

        return (
          <TouchableOpacity
            key={`${expense.groupId}_${expense.id}`}
            style={styles.requestItemNew}
            onPress={() => {
              // Open transaction modal for expense details
              const mockTransaction: Transaction = {
                id: expense.id || `${expense.groupId}_${expense.id}`,
                type: transactionType,
                amount: expense.amount || 0,
                currency: expense.currency || 'USDC',
                from_user: isCurrentUserPaid ? (currentUser?.name || currentUser?.email?.split('@')[0] || 'You') : (expense.paid_by_name || 'Member'),
                to_user: expense.groupName,
                from_wallet: isCurrentUserPaid ? (currentUser?.wallet_address || '') : '',
                to_wallet: expense.groupName,
                tx_hash: `expense_${expense.id}_${Date.now()}`,
                note: expense.description || 'Group expense',
                created_at: expense.created_at,
                updated_at: expense.updated_at || expense.created_at,
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
                    ? { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-send.png?alt=media&token=d733fbce-e383-4cae-bd93-2fc16c36a2d9' }
                    : { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-receive.png?alt=media&token=c55d7c97-b027-4841-859e-38c46c2f36c5' }
                }
                style={styles.transactionAvatar}
              />
            </View>
            <View style={styles.requestContent}>
              <Text style={styles.requestMessageWithAmount}>
                <Text style={styles.requestSenderName}>{transactionTitle}</Text>
                {' '}
                <Text style={styles.requestAmountGreen}>
                  {(expense.amount || 0).toFixed(2)} {expense.currency || 'USDC'}
                </Text>
              </Text>
              <Text style={styles.requestSource}>
                {transactionNote} • {expenseTime}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }));

      // Add preview of 3rd transaction if available
      if (allExpenses.length > 2) {
        const thirdExpense = allExpenses[2];
        const expenseTime = new Date(thirdExpense.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        // Get the actual user name who paid this expense
        let payerName = 'Member';
        if (String(thirdExpense.paid_by) === String(currentUser?.id)) {
          payerName = 'You';
        } else if (thirdExpense.paid_by_name) {
          payerName = thirdExpense.paid_by_name;
        } else {
          // Try to get user name from group members or contacts
          try {
            const { firebaseDataService } = await import('../../services/firebaseDataService');
            const groupMembers = await firebaseDataService.group.getGroupMembers(thirdExpense.groupId.toString());
            const payerMember = groupMembers.find(member => String(member.id) === String(thirdExpense.paid_by));
            if (payerMember) {
              payerName = payerMember.name || payerMember.email?.split('@')[0] || 'Member';
            }
          } catch (error) {
            console.error(`Error fetching payer details for expense ${thirdExpense.id}:`, error);
          }
        }

        // Determine if current user paid this expense
        const isCurrentUserPaid = String(thirdExpense.paid_by) === String(currentUser?.id);
        const transactionType = isCurrentUserPaid ? 'send' : 'receive';
        
        // Use "add an expense" for group expenses, "paid" for actual payments
        const actionText = 'add an expense';
        const transactionTitle = isCurrentUserPaid 
          ? `You ${actionText} ${thirdExpense.description || 'expense'}`
          : `${payerName} ${actionText} ${thirdExpense.description || 'expense'}`;
        
        const transactionNote = `${thirdExpense.groupName} • ${thirdExpense.currency || 'USDC'}`;

        const previewComponent = (
          <TouchableOpacity
            key={`preview_${thirdExpense.groupId}_${thirdExpense.id}`}
            style={[styles.requestItemNew, styles.requestPreviewItem]}
            onPress={() => navigation.navigate('TransactionHistory')}
          >
            <View style={styles.transactionAvatarNew}>
              <Image
                source={
                  transactionType === 'send' 
                    ? { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-send.png?alt=media&token=d733fbce-e383-4cae-bd93-2fc16c36a2d9' }
                    : { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-receive.png?alt=media&token=c55d7c97-b027-4841-859e-38c46c2f36c5' }
                }
                style={styles.transactionAvatar}
              />
            </View>
            <View style={[styles.requestContent, styles.requestPreviewContent]}>
              <Text style={styles.requestMessageWithAmount}>
                <Text style={styles.requestSenderName}>{transactionTitle}</Text>
                {' '}
                <Text style={styles.requestAmountGreen}>
                  {(thirdExpense.amount || 0).toFixed(2)} {thirdExpense.currency || 'USDC'}
                </Text>
              </Text>
              <Text style={styles.requestSource}>
                {transactionNote} • {expenseTime}
              </Text>
            </View>
            <View style={styles.requestPreviewOverlay}>
              <Text style={styles.requestPreviewText}>+{allExpenses.length - 2} more</Text>
            </View>
          </TouchableOpacity>
        );

        transactionComponents.push(previewComponent);
      }

      setGroupTransactions(transactionComponents);
    } catch (error) {
      console.error('Error loading all group expenses:', error);
      setGroupTransactions([]);
    } finally {
      setLoadingGroupTransactions(false);
    }
  }, [groups, currentUser?.id]);

  // Load group transactions when groups change
  useEffect(() => {
    loadAllGroupExpenses();
  }, [loadAllGroupExpenses]);

  // Render real transaction from Firebase
  const renderRealTransaction = (transaction: Transaction) => {
    const transactionTime = new Date(transaction.created_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const { amount, color } = getTransactionAmount(transaction);
    const isIncome = transaction.type === 'receive' || transaction.type === 'deposit';

    return (
      <TouchableOpacity
        key={transaction.id}
        style={styles.requestItemNew}
        onPress={() => {
          setSelectedTransaction(transaction);
          setTransactionModalVisible(true);
        }}
      >
        <View style={[
          styles.transactionAvatarNew,
          isIncome && { backgroundColor: colors.primaryGreen + '20' }
        ]}>
          <Image
            source={getTransactionIcon(transaction)}
            style={[
              styles.transactionAvatar,
              isIncome && { tintColor: colors.primaryGreen }
            ]}
          />
        </View>
        <View style={styles.requestContent}>
          <Text style={styles.requestMessageWithAmount}>
            <Text style={styles.requestSenderName}>{getTransactionTitle(transaction)}</Text>
            {' '}
            <Text style={[
              styles.requestAmountGreen,
              { color: isIncome ? colors.primaryGreen : colors.textLight }
            ]}>
              {isIncome ? '+' : '-'}{amount} USDC
            </Text>
          </Text>
          <Text style={styles.requestSource}>
            {getTransactionSource(transaction)} • {transactionTime}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
              <AvatarComponent
                avatar={currentUser?.avatar}
                displayName={currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
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



        {/* Balance Card */}
        <View style={[styles.balanceCard, { alignItems: 'flex-start' }]}>
                      <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>
              App Wallet Balance
              </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Auto-refresh Status Indicator */}
              {/* Removed as per edit hint */}

            
              {/* QR Code Button for Profile Sharing */}
              <TouchableOpacity 
                style={styles.qrCodeIcon} 
                onPress={() => setQrCodeModalVisible(true)}
              >
                <Image
                  source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fqr-code-scan.png?alt=media&token=3fc388bd-fdf7-4863-a8b1-9313490d6382' }}
                  style={styles.qrCodeImage}
                />
              </TouchableOpacity>




            </View>
          </View>

          {priceLoading ? (
            <View style={styles.priceLoadingContainer}>
              <ActivityIndicator size="small" color={BG_COLOR} />
              <Text style={styles.priceLoadingText}>
                {loadingUserWallet ? 'Loading your app wallet...' : 'Loading balance...'}
              </Text>
            </View>
          ) : (
            <View style={styles.balanceContainer}>
              {/* App Wallet Balance Display */}
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Image
                    source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fusdc-logo-black.png?alt=media&token=2b33d108-f3aa-471d-b7fe-6166c53c1d56' }}
                    style={styles.balanceUsdcLogo}
                  />
                  <Text style={[styles.balanceAmount, { textAlign: 'left', alignSelf: 'flex-start' }]}>
                    {(refreshBalance !== null ? refreshBalance : (appWalletBalance || userCreatedWalletBalance?.totalUSD || 0)).toFixed(2)}
                  </Text>
                  {/* Force re-render with unique key */}
                  <Text style={{ display: 'none' }}>{forceUpdate}</Text>
                </View>
                
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
                  source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-send.png?alt=media&token=d733fbce-e383-4cae-bd93-2fc16c36a2d9' }}
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
                  source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-receive.png?alt=media&token=c55d7c97-b027-4841-859e-38c46c2f36c5' }}
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
                  source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-deposit.png?alt=media&token=d832bae5-dc8e-4347-bab5-cfa9621a5c55' }}
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
                  source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-withdraw.png?alt=media&token=8c0da99e-287c-4d19-8515-ba422430b71b' }}
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
                              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fusdc-logo-black.png?alt=media&token=2b33d108-f3aa-471d-b7fe-6166c53c1d56' }}
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
                              <View key={`${member.id}-${i}`} style={styles.memberAvatar}>
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
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {paymentRequests.length === 0 ? (
            <View style={styles.emptyRequestsState}>
              <Text style={styles.emptyRequestsText}>No payment requests</Text>

            </View>
          ) : (
            <>
              {/* Show first 2 requests */}
              {paymentRequests.slice(0, 2).map((request, index) => {
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
              })}
              
              {/* Show preview of 3rd request if it exists */}
              {paymentRequests.length > 2 && (
                <TouchableOpacity
                  style={[styles.requestItemNew, styles.requestPreviewItem]}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <View style={styles.requestAvatarNew}>
                    <Text style={styles.balanceAmountText}>
                      {(paymentRequests[2].data?.senderName || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.requestContent , styles.requestPreviewContent]}>
                    <Text style={styles.requestMessageWithAmount}>
                      <Text style={styles.requestSenderName}>
                        {paymentRequests[2].data?.senderName || 'Unknown User'}
                      </Text> requested a payment of{' '}
                      <Text style={styles.requestAmountGreen}>
                        {(paymentRequests[2].data?.amount || 0).toFixed(1)} USDC
                      </Text>
                    </Text>
                    <Text style={styles.requestSource}>
                      from {paymentRequests[2].data?.groupName || 'group activity'}
                    </Text>
                  </View>
                  <View style={styles.requestPreviewOverlay}>
                    <Text style={styles.requestPreviewText}>+{paymentRequests.length - 2} more</Text>
                  </View>
                </TouchableOpacity>
              )}
            </>
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

          {/* Show real transactions first, then group transactions as fallback */}
          {loadingTransactions ? (
            <View style={styles.emptyRequestsState}>
              <ActivityIndicator size="small" color={colors.primaryGreen} />
              <Text style={styles.emptyRequestsText}>Loading transactions...</Text>
            </View>
          ) : realTransactions.length > 0 ? (
            <>
              {/* Show first 2 real transactions */}
              {realTransactions.slice(0, 2).map(renderRealTransaction)}
              
              {/* Show preview of 3rd transaction if it exists */}
              {realTransactions.length > 2 && (
                <TouchableOpacity
                  style={[styles.requestItemNew, styles.requestPreviewItem]}
                  onPress={() => navigation.navigate('TransactionHistory')}
                >
                  <View style={styles.transactionAvatarNew}>
                    <Image
                      source={getTransactionIcon(realTransactions[2])}
                      style={styles.transactionAvatar}
                    />
                  </View>
                  <View style={[styles.requestContent, styles.requestPreviewContent]}>
                    <Text style={styles.requestMessageWithAmount}>
                      <Text style={styles.requestSenderName}>
                        {getTransactionTitle(realTransactions[2])}
                      </Text>
                      {' '}
                      <Text style={styles.requestAmountGreen}>
                        {getTransactionAmount(realTransactions[2]).amount} USDC
                      </Text>
                    </Text>
                    <Text style={styles.requestSource}>
                      {getTransactionSource(realTransactions[2])} • {new Date(realTransactions[2].created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>
                  </View>
                  <View style={styles.requestPreviewOverlay}>
                    <Text style={styles.requestPreviewText}>+{realTransactions.length - 2} more</Text>
                  </View>
                </TouchableOpacity>
              )}
            </>
          ) : groups.length > 0 ? (
            <>
              {/* Show group transactions as fallback */}
              {loadingGroupTransactions ? (
                <View style={styles.emptyRequestsState}>
                  <ActivityIndicator size="small" color={colors.primaryGreen} />
                  <Text style={styles.emptyRequestsText}>Loading group transactions...</Text>
                </View>
              ) : groupTransactions.length > 0 ? (
                groupTransactions
              ) : (
                <View style={styles.emptyRequestsState}>
                  <Text style={styles.emptyRequestsText}>No recent group transactions</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyRequestsState}>
              <Text style={styles.emptyRequestsText}>No recent transactions</Text>
            </View>
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
        qrValue={generateProfileLink(
          currentUser?.id?.toString() || '',
          currentUser?.name || currentUser?.email?.split('@')[0] || 'User',
          currentUser?.email,
          currentUser?.wallet_address
        )}
        title="Share your profile QR code"
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
         navigation={navigation}
       />

      {/* External Wallet Connection Modal */}
      {/* Removed as per edit hint */}

      <NavBar currentRoute="Dashboard" navigation={navigation} />
    </SafeAreaView>
  );
};

export default DashboardScreen; 