import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import { colors } from '../../theme';
import { DEFAULT_AVATAR_URL } from '../../config/constants';
import AuthGuard from '../../components/AuthGuard';
import NavBar from '../../components/NavBar';
import UserAvatar from '../../components/UserAvatar';
import WalletSelectorModal from '../../components/WalletSelectorModal';
import { QRCodeScreen } from '../QRCode';
import TransactionModal from '../../components/TransactionModal';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { useGroupList } from '../../hooks/useGroupData';
import { GroupWithDetails, Expense, GroupMember, Transaction } from '../../types';
import { formatCryptoAmount } from '../../utils/cryptoUtils';
import { getTotalSpendingInUSDC } from '../../services/priceService';
import { notificationService } from '../../services/notificationService';
import { createPaymentRequest, getReceivedPaymentRequests } from '../../services/firebasePaymentRequestService';
import { walletService, UserWalletBalance } from '../../services/WalletService';
import { firebaseTransactionService, firebaseDataService } from '../../services/firebaseDataService';
import { createUsdcRequestUri } from '@features/qr';
import { SplitStorageService } from '../../services/splitStorageService';
import { logger } from '../../services/loggingService';
import { db } from '../../config/firebase';
import { getDoc, doc } from 'firebase/firestore';

// Avatar component wrapper for backward compatibility
const AvatarComponent = ({ avatar, displayName, style }: { avatar?: string, displayName: string, style: any }) => {
  return (
    <UserAvatar
      avatarUrl={avatar}
      displayName={displayName}
      style={style}
    />
  );
};


interface DashboardScreenProps {
  navigation: any;
  route?: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation, route }) => {
  const { state, notifications, loadNotifications, refreshNotifications, updateUser } = useApp();
  const { currentUser, isAuthenticated } = state;

  // Function to fetch user data from Firebase
  const fetchUserData = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: userId,
          name: userData.name || userData.email || 'Unknown User',
          email: userData.email || '',
          wallet_address: userData.wallet_address || userData.wallet_public_key || '',
          avatar: userData.avatar || userData.photoURL || ''
        };
      }
    } catch (error) {
      logger.error('Error fetching user data', error, 'DashboardScreen');
    }
    
    // Return fallback data if user not found
    return {
      id: userId,
      name: 'Unknown User',
      email: '',
      wallet_address: '',
      avatar: ''
    };
  };
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
    groups: originalGroups,
    loading: groupsLoading,
    refreshing,
    refresh: refreshGroups
  } = useGroupList();

  // Use only dynamic groups from context
  const groups = originalGroups;

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
  const [showQRCodeScreen, setShowQRCodeScreen] = useState(false);
  const [groupSummaries, setGroupSummaries] = useState<Record<string, { totalAmount: number; memberCount: number; expenseCount: number; hasData: boolean }>>({});
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [realTransactions, setRealTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [groupTransactions, setGroupTransactions] = useState<any[]>([]);
  const [loadingGroupTransactions, setLoadingGroupTransactions] = useState(false);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  const [initialRequestsLoaded, setInitialRequestsLoaded] = useState(false);
  const [refreshBalance, setRefreshBalance] = useState<number | null>(null); // Local refresh balance
  const [balanceLoaded, setBalanceLoaded] = useState(false); // Track if balance has been loaded
  const [walletUnrecoverable, setWalletUnrecoverable] = useState(false); // Track if wallet is unrecoverable
  const [loadingSplits, setLoadingSplits] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0); // Track consecutive failures for circuit breaker
  const [recentSplits, setRecentSplits] = useState<any[]>([]);

  // Function to hash wallet address for display
  const hashWalletAddress = (address: string): string => {
    if (!address || address.length < 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Function to copy wallet address to clipboard
  const copyWalletAddress = async (address: string) => {
    try {
      await Clipboard.setStringAsync(address);
      Alert.alert('Copied', 'Wallet address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy wallet address:', error);
      Alert.alert('Error', 'Failed to copy wallet address');
    }
  };

  // Helper functions for split status
  const getSplitStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.primaryGreen;
      case 'locked':
        return colors.warning;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      case 'draft':
      default:
        return colors.textSecondary;
    }
  };

  const getSplitStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'locked':
        return 'Locked';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'draft':
      default:
        return 'Draft';
    }
  };

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

  // Load user's created wallet balance with auto-retry until successful
  const loadUserCreatedWalletBalance = useCallback(async (retryCount = 0) => {
    if (!currentUser?.id || loadingUserWallet) {
      return;
    }

    try {
      setLoadingUserWallet(true);
      logger.debug('Loading user wallet balance', { attempt: retryCount + 1 }, 'DashboardScreen');

      // First ensure the user has a wallet
      const walletResult = await walletService.ensureUserWallet(currentUser.id.toString());

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
        const balance = await walletService.getUserWalletBalance(currentUser.id.toString());

        // Check if we got a valid balance
        if (balance && balance.totalUSD !== undefined && balance.totalUSD !== null) {
          logger.debug('Balance loaded successfully', { totalUSD: balance.totalUSD }, 'DashboardScreen');
          setUserCreatedWalletBalance(balance);
          setBalanceLoaded(true);
          setConsecutiveFailures(0); // Reset failure counter on success
        } else {
          // Balance is invalid, retry
          throw new Error('Invalid balance received');
        }
      } else {
        // Keep error logging for debugging
        console.error('Failed to ensure wallet for dashboard:', walletResult.error);
        throw new Error(walletResult.error || 'Failed to ensure wallet');
      }
    } catch (error) {
      // Keep error logging for debugging
      console.error('Error loading user created wallet balance:', error);

      // Check if this is a critical error that should stop retry - don't retry for these
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('User not found') ||
        errorMessage.includes('User document not found') ||
        errorMessage.includes('Failed to ensure wallet') ||
        errorMessage.includes('timestamp.toDate is not a function') ||
        errorMessage.includes('toDate is not a function') ||
        errorMessage.includes('Wallet is already working') ||
        errorMessage.includes('Wallet is marked as unrecoverable') ||
        errorMessage.includes('unrecoverable') ||
        errorMessage.includes('FIRESTORE') && errorMessage.includes('INTERNAL ASSERTION FAILED')) {
        logger.error('Critical error detected, stopping retry loop', { errorMessage }, 'DashboardScreen');
        
        // Handle Firebase assertion failures more gracefully
        if (errorMessage.includes('FIRESTORE') && errorMessage.includes('INTERNAL ASSERTION FAILED')) {
          console.warn(' Dashboard: Firebase assertion failure detected, showing fallback UI');
          // Set a fallback balance to prevent infinite loading
          setUserCreatedWalletBalance({
            solBalance: 0,
            usdcBalance: 0,
            totalUSD: 0,
            address: currentUser?.wallet_address || '',
            isConnected: false
          });
        } else {
          setUserCreatedWalletBalance(null);
        }
        setBalanceLoaded(true);

        // Check if this is an unrecoverable wallet error
        if (errorMessage.includes('unrecoverable')) {
          setWalletUnrecoverable(true);
          // Show user-friendly alert for unrecoverable wallet
          Alert.alert(
            'Wallet Recovery Failed',
            'Your wallet cannot be recovered with the current seed phrase. You can create a new wallet, but any funds in the old wallet will be lost unless you can recover the private key.\n\nWould you like to create a new wallet?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  // User chose to cancel, keep the unrecoverable state
                  logger.debug('User chose not to create new wallet', null, 'DashboardScreen');
                }
              },
              {
                text: 'Create New Wallet',
                onPress: async () => {
                  try {
                    logger.debug('User chose to create new wallet', null, 'DashboardScreen');
                    // Call the new wallet creation method
                    const newWalletResult = await walletService.ensureUserWallet(currentUser.id.toString());

                    if (newWalletResult.success && newWalletResult.wallet) {
                      // Update user context with new wallet
                      await updateUser({
                        wallet_address: newWalletResult.wallet.address,
                        wallet_public_key: newWalletResult.wallet.publicKey
                      });

                      // Reset states and reload balance
                      setWalletUnrecoverable(false);
                      setBalanceLoaded(false);
                      loadUserCreatedWalletBalance(0);

                      Alert.alert(
                        'New Wallet Created',
                        `Your new wallet has been created successfully!\n\nAddress: ${newWalletResult.wallet.address}\n\nPlease save your seed phrase securely.`,
                        [{ text: 'OK' }]
                      );
                    } else {
                      Alert.alert(
                        'Error',
                        `Failed to create new wallet: ${newWalletResult.error}`,
                        [{ text: 'OK' }]
                      );
                    }
                  } catch (error) {
                    console.error('Error creating new wallet:', error);
                    Alert.alert(
                      'Error',
                      'Failed to create new wallet. Please try again or contact support.',
                      [{ text: 'OK' }]
                    );
                  }
                }
              }
            ]
          );
        }

        return;
      }

      // Circuit breaker: if we have too many consecutive failures, stop retrying
      if (consecutiveFailures >= 3) {
        console.error('❌ Dashboard: Circuit breaker triggered - too many consecutive failures');
        setUserCreatedWalletBalance(null);
        setBalanceLoaded(true);
        return;
      }

      // Auto-retry logic - but only for certain errors, not for User not found
      if (retryCount < 2) { // Reduced from 4 to 2 retries
        const delay = Math.min(1000 * Math.pow(2, retryCount), 3000); // Reduced max delay to 3 seconds
        logger.debug('Auto-retrying balance load', { delay, attempt: retryCount + 1, maxAttempts: 3 }, 'DashboardScreen');
        setConsecutiveFailures(prev => prev + 1);
        setTimeout(() => {
          loadUserCreatedWalletBalance(retryCount + 1);
        }, delay);
        return;
      } else {
        // Max retries reached, give up
        console.error('❌ Dashboard: Max retries reached for balance loading');
        setConsecutiveFailures(prev => prev + 1);
        setUserCreatedWalletBalance(null);
        setBalanceLoaded(true);
      }
    } finally {
      setLoadingUserWallet(false);
    }
  }, [currentUser?.id, currentUser?.wallet_address, updateUser, loadingUserWallet, consecutiveFailures]);

  // Reset balance loaded flag and unrecoverable state when user changes
  useEffect(() => {
    setBalanceLoaded(false);
    setWalletUnrecoverable(false);
    setConsecutiveFailures(0); // Reset failure counter when user changes
  }, [currentUser?.id]);

  // Note: Periodic balance refresh is now handled by WalletProvider to avoid duplicate calls

  // Consolidated effect to load user wallet balance - only run when necessary
  useEffect(() => {
    // Only load balance when user is authenticated and we have a user ID and haven't loaded yet
    if (currentUser?.id && isAuthenticated && !loadingUserWallet && !balanceLoaded) {
      logger.debug('Initial balance load triggered', null, 'DashboardScreen');
      loadUserCreatedWalletBalance();
    }
  }, [currentUser?.id, isAuthenticated, balanceLoaded, loadUserCreatedWalletBalance]); // Use balanceLoaded to prevent infinite loops

  // Convert group amounts to USD for display with proper currency handling
  const convertGroupAmountsToUSD = useCallback(async (groups: GroupWithDetails[]) => {
    try {
      const usdAmounts: Record<string | number, number> = {};

      for (const group of groups) {
        try {
          let totalUSD = 0;

          // Dynamic groups only – no test pool overrides

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
      logger.debug('Waiting for notifications to load', null, 'DashboardScreen');
      return;
    }

    // If we already have requests and this isn't a refresh, skip loading
    if (initialRequestsLoaded && paymentRequests.length > 0 && notifications.length === 0) {
      logger.debug('Skipping payment requests load - already loaded and no new notifications', null, 'DashboardScreen');
      return;
    }

    setLoadingPaymentRequests(true);

    try {
      logger.debug('Loading payment requests', null, 'DashboardScreen');
      // Get actual payment requests from Firebase
      const actualPaymentRequests = await getReceivedPaymentRequests(currentUser.id, 10);
      logger.debug('Firebase payment requests loaded', { count: actualPaymentRequests.length }, 'DashboardScreen');

      // Also include notifications of type 'payment_request', 'settlement_request' and 'payment_reminder'
      const notificationRequests = notifications ? notifications.filter(n =>
        n.type === 'payment_request' ||
        n.type === 'settlement_request' ||
        n.type === 'payment_reminder'
      ) : [];
      logger.debug('Notification requests loaded', { count: notificationRequests.length }, 'DashboardScreen');

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
          logger.debug('Added Firebase request', { requestId, senderName: req.senderName, amount: req.amount }, 'DashboardScreen');

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
            logger.debug('Skipping duplicate notification', { requestId, senderName: n.data?.senderName, amount }, 'DashboardScreen');
            return false; // Skip this notification as we already have the Firebase request
          }

          // Also check if we've already processed this notification ID
          const notificationId = String(n.id);
          if (processedNotificationIds.has(notificationId)) {
            logger.debug('Skipping duplicate notification ID', { notificationId, senderName: n.data?.senderName, amount }, 'DashboardScreen');
            return false;
          }

          // Add to processed set to prevent duplicates within notifications
          processedNotificationIds.add(notificationId);
          logger.debug('Added notification request', { id: n.id, senderName: n.data?.senderName, amount }, 'DashboardScreen');
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

      
      // Enrich requests with sender avatars if missing
      try {
        const senderIds = Array.from(new Set(
          allRequests
            .map(r => r.data?.senderId)
            .filter((id: any) => id !== undefined && id !== null)
            .map((id: any) => String(id))
        ));

        if (senderIds.length > 0) {
          const profiles = await Promise.all(
            senderIds.map(async (id) => {
              try {
                const profile = await firebaseDataService.user.getCurrentUser(id);
                return { id, avatar: profile?.avatar || '' };
              } catch (e) {
                return { id, avatar: '' };
              }
            })
          );

          const idToAvatar: Record<string, string> = {};
          profiles.forEach(p => { idToAvatar[p.id] = p.avatar; });

          allRequests.forEach(r => {
            if (!r.data) r.data = {};
            const sid = r.data.senderId ? String(r.data.senderId) : undefined;
            const existing = r.data.senderAvatar && r.data.senderAvatar.trim() !== '';
            if (!existing && sid && idToAvatar[sid]) {
              r.data.senderAvatar = idToAvatar[sid];
            }
          });
        }

        // Fallback: for any remaining without avatar, try group members
        const requestsNeedingAvatar = allRequests.filter(r => !r.data?.senderAvatar || r.data.senderAvatar.trim() === '');
        const groupIds = Array.from(new Set(
          requestsNeedingAvatar
            .map(r => r.data?.groupId)
            .filter((gid: any) => gid !== undefined && gid !== null)
            .map((gid: any) => String(gid))
        ));

        if (groupIds.length > 0) {
          // fetch members for each group once
          const groupMembersEntries = await Promise.all(groupIds.map(async (gid) => {
            try {
              const members = await firebaseDataService.group.getGroupMembers(gid);
              return [gid, members] as const;
            } catch (e) {
              return [gid, []] as const;
            }
          }));

          const groupIdToMembers: Record<string, any[]> = {};
          groupMembersEntries.forEach(([gid, members]) => { groupIdToMembers[gid] = Array.isArray(members) ? [...members] : []; });

          requestsNeedingAvatar.forEach(r => {
            const gid = r.data?.groupId ? String(r.data.groupId) : undefined;
            const sid = r.data?.senderId ? String(r.data.senderId) : undefined;
            if (!gid || !sid) return;
            const members = groupIdToMembers[gid] || [];
            const m = members.find((mm: any) => String(mm.id) === sid || String(mm.user_id) === sid);
            if (m && m.avatar && m.avatar.trim() !== '') {
              r.data.senderAvatar = m.avatar;
            }
          });
        }
      } catch (e) {
        logger.warn('Could not enrich sender avatars', { error: e.message }, 'DashboardScreen');
      }

      logger.info('Payment requests loaded successfully', { count: allRequests.length }, 'DashboardScreen');
      logger.debug('Final requests', { 
        requests: allRequests.map(r => ({
          id: r.id,
          sender: r.data?.senderName || r.data?.fromUser,
          amount: r.data?.amount,
          type: r.type
        }))
      }, 'DashboardScreen');
      setPaymentRequests(allRequests);

      // Mark as initially loaded if this is the first successful load
      if (!initialRequestsLoaded) {
        setInitialRequestsLoaded(true);
        logger.info('Initial payment requests loaded', null, 'DashboardScreen');
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


  // Improved group summary for dashboard display
  const getGroupSummary = useCallback((group: GroupWithDetails) => {
    // Dynamic groups only – no special casing
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
      // This effect will trigger when the balance changes
      logger.info('Balance updated', { totalUSD: userCreatedWalletBalance.totalUSD }, 'DashboardScreen');
    }
  }, [userCreatedWalletBalance?.totalUSD]); // Removed forceUpdate dependency to prevent excessive re-renders


  // Load data when component mounts or comes into focus - FIXED: Remove problematic dependencies
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && currentUser?.id) {
        // Load balance immediately and independently of app wallet
        if (!balanceLoaded && !loadingUserWallet) {
          logger.debug('Focus effect - loading balance immediately', null, 'DashboardScreen');
          loadUserCreatedWalletBalance();
        }

        // Initialize app wallet for the user (in parallel, not blocking balance)
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
    }, [isAuthenticated, currentUser?.id, groups.length, balanceLoaded, loadingUserWallet, loadUserCreatedWalletBalance]) // Simplified dependencies to prevent unnecessary re-runs
  );

  // Handle refreshBalance parameter from navigation
  useEffect(() => {
    if (route?.params?.refreshBalance && currentUser?.id) {
      // Clear the refreshBalance parameter to prevent infinite loops
      navigation.setParams({ refreshBalance: undefined });
      
      // Clear configuration cache to ensure latest network settings are used
      try {
        const { clearConfigCache } = require('../../config/unified');
        clearConfigCache();
        logger.info('Configuration cache cleared for balance refresh', null, 'DashboardScreen');
      } catch (error) {
        logger.warn('Failed to clear configuration cache', { error }, 'DashboardScreen');
      }
      
      // Force refresh the balance
      loadUserCreatedWalletBalance();
      logger.info('Balance refresh triggered from navigation parameter', null, 'DashboardScreen');
    }
  }, [route?.params?.refreshBalance, currentUser?.id, navigation, loadUserCreatedWalletBalance]);

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


  const onRefresh = async () => {
    if (!isAuthenticated || !currentUser?.id) return;

    try {
      logger.info('Manual refresh triggered', null, 'DashboardScreen');
      setBalanceLoaded(false); // Reset balance loaded flag to allow refresh

      // Clear configuration cache to ensure latest network settings are used
      try {
        const { clearConfigCache } = require('../../config/unified');
        clearConfigCache();
        logger.info('Configuration cache cleared during manual refresh', null, 'DashboardScreen');
      } catch (error) {
        logger.warn('Failed to clear configuration cache during refresh', { error }, 'DashboardScreen');
      }

      // Ensure wallet exists and refresh balance
      const walletResult = await walletService.ensureUserWallet(currentUser.id.toString());

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

      // Refresh the wallet balance directly
      if (walletResult.success && walletResult.wallet) {
        logger.info('Refreshing wallet balance', null, 'DashboardScreen');

        try {
          setLoadingUserWallet(true);

          // Get the balance directly from the service
          const balance = await walletService.getUserWalletBalance(currentUser.id.toString());

          if (balance) {
            logger.info('New balance detected', { totalUSD: balance.totalUSD ?? 0, currency: 'USD' }, 'DashboardScreen');

            // Simple state update without complex setTimeout logic
            setUserCreatedWalletBalance(balance);
            setRefreshBalance(balance.totalUSD ?? 0);
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
        loadRealTransactions(),
      ]);

      logger.info('Refresh completed successfully', null, 'DashboardScreen');

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
        return 'Deposit';
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

  // Load recent splits
  const loadRecentSplits = useCallback(async () => {
    if (!currentUser?.id) {
      return;
    }

    setLoadingSplits(true);
    try {
      logger.info('Loading recent splits for user', { userId: currentUser.id }, 'DashboardScreen');
      
      const result = await SplitStorageService.getUserSplits(currentUser.id.toString());
      
      if (result.success && result.splits) {
        // Get the 3 most recent splits
        const recentSplits = result.splits.slice(0, 3);
        
        logger.info('Loaded recent splits', {
          count: recentSplits.length,
          splits: recentSplits.map((s: any) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            totalAmount: s.totalAmount,
            date: s.date,
            createdAt: s.createdAt,
            participantsCount: s.participants.length
          }))
        });
        setRecentSplits(recentSplits);
      } else {
        logger.error('Failed to load splits', { error: result.error }, 'DashboardScreen');
        setRecentSplits([]);
      }
    } catch (error) {
      console.error('🔍 Dashboard: Error loading recent splits:', error);
      setRecentSplits([]);
    } finally {
      setLoadingSplits(false);
    }
  }, [currentUser?.id]);

  // Load recent splits when component mounts or user changes
  useEffect(() => {
    if (currentUser?.id && isAuthenticated) {
      loadRecentSplits();
    }
  }, [currentUser?.id, isAuthenticated]);

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
        style={styles.TransactionItemNew}
        onPress={() => {
          setSelectedTransaction(transaction);
          setTransactionModalVisible(true);
        }}
      >
        <View style={[
          styles.transactionAvatarNew,
        ]}>
          <Image
            source={getTransactionIcon(transaction)}
            style={[
              styles.transactionAvatar,
            ]}
          />
        </View>

        <View style={styles.transactionContent}>
          <Text style={styles.transactionMessageWithAmount}>
            <Text style={styles.transactionSenderName}>{getTransactionTitle(transaction)}</Text>
            {' '}
            
          </Text>
          <Text style={styles.transactionSource}>
            {getTransactionSource(transaction)} • {transactionTime}
          </Text>
        </View>
        <Text style={[
              styles.transactionAmountGreen,
              
            ]}>
              {isIncome ? '+' : '-'}{amount} USDC
            </Text>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return <AuthGuard navigation={navigation}>{null}</AuthGuard>;
  }

  if (groupsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Loading your groups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

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
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => navigation.navigate('Profile')}
          >
            <AvatarComponent
              avatar={currentUser?.avatar}
              displayName={currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
              style={styles.profileImage}
            />
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>
                {currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}!
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bellContainer}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Image
              source={require('../../../assets/bell-icon.png')}
              style={styles.bellIcon}
            />
            {unreadNotifications > 0 && (
              <LinearGradient
                colors={[colors.green, colors.greenBlue]}
                style={styles.bellBadge}
              />
            )}
          </TouchableOpacity>
        </View>



        {/* Balance Card */}
        <ImageBackground
          source={{uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwallet-bg-linear.png?alt=media&token=4347e0cd-056e-4681-a066-0fd74a563013'}}
          style={[styles.balanceCard, { alignItems: 'flex-start' }]}
          resizeMode="cover"
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>
              WeSplit Wallet
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Auto-refresh Status Indicator */}
              {/* Removed as per edit hint */}


              {/* QR Code Button for Profile Sharing */}
              <TouchableOpacity
                style={styles.qrCodeIcon}
                onPress={() => setShowQRCodeScreen(true)}
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
                  {/*<Image
                    source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fusdc-logo-black.png?alt=media&token=2b33d108-f3aa-471d-b7fe-6166c53c1d56' }}
                    style={styles.balanceUsdcLogo}
                  />*/}
                  <Text style={[styles.balanceAmount, { textAlign: 'left', alignSelf: 'flex-start' }]}>
                    $ {(refreshBalance !== null ? (refreshBalance ?? 0) : (appWalletBalance || userCreatedWalletBalance?.totalUSD || 0)).toFixed(2)}
                  </Text>
                </View>

              </View>
            </View>
          )}

          {/* Wallet Address with Copy Button */}
          <TouchableOpacity
            style={styles.walletAddressContainer}
            onPress={() => copyWalletAddress(appWalletAddress || currentUser?.wallet_address || '')}
          >
            <Text style={styles.balanceLimitText}>
              {hashWalletAddress(appWalletAddress || currentUser?.wallet_address || '')}
            </Text>
            <Image
              source={require('../../../assets/copy-icon.png')}
              style={styles.copyIcon}
            />
          </TouchableOpacity>

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
        </ImageBackground>

        {/* Action Buttons */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Send')}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={{uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmoney-send-new.png?alt=media&token=fa4e03f4-bd17-4596-bb92-a08965316743'}}
                  style={styles.actionButtonIconNoTint}
                />
              </View>
              <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('RequestContacts')}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={{uri:'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmoney-recive-new.png?alt=media&token=a45426d1-9bf2-4f65-8067-7f76d62216fa'}}
                  style={styles.actionButtonIconNoTint}
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
                  source={{uri:'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fcard-add-new.png?alt=media&token=8ca9ad64-c616-4f4c-9f3d-2be39c3091f2'}}
                  style={styles.actionButtonIconNoTint}
                />
              </View>
              <Text style={styles.actionButtonText}>Deposit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                navigation.navigate('LinkedCards');
              }}
            >
              <View style={styles.actionButtonCircle}>
                <Image
                  source={require('../../../assets/link-icon.png')}
                  style={styles.actionButtonIconNoTint}
                />
              </View>
              <Text style={styles.actionButtonText}>Linked Wallets</Text>
            </TouchableOpacity>
          </View>
        </View>


        

        {/* Requests Section (first) */}
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
                      <AvatarComponent
                        avatar={senderAvatar || ''}
                        displayName={senderName || 'U'}
                        style={styles.requestAvatarNew}
                      />
                      <View style={styles.requestContent}>
                        <Text style={styles.requestMessageWithAmount}>
                          <Text style={styles.requestSenderName}>{senderName}</Text> requested a payment of{' '}
                          <Text style={styles.requestAmountGreen}>
                            {amount.toFixed(1)} USDC
                          </Text>
                        </Text>
                        
                      </View>
                      <TouchableOpacity
                        style={styles.requestSendButtonNew}
                        onPress={async () => {
                          try {
                            logger.info('Send button pressed for request', {
                              requestId: request.id,
                              requestData: request.data,
                              amount,
                              currency,
                              senderName
                            });

                            // Get the sender ID from the request data
                            const senderId = request.data?.senderId || request.data?.requester || request.data?.sender;
                            if (!senderId) {
                              console.error('🔍 Dashboard: No sender ID found in request data:', request.data);
                              Alert.alert('Error', 'Unable to find sender information');
                              return;
                            }

                            logger.debug('Fetching user data for sender ID', { senderId }, 'DashboardScreen');
                            
                            // Fetch user data to get wallet address and other details
                            const contact = await fetchUserData(senderId);
                            
                            logger.debug('Fetched contact data', {
                              id: contact.id,
                              name: contact.name,
                              email: contact.email,
                              wallet: contact.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'No wallet'
                            });

                            // Validate that we have the necessary contact information
                            if (!contact.wallet_address) {
                              Alert.alert('Error', 'Recipient wallet address not found. Please ask them to set up their wallet.');
                              return;
                            }
                            
                            // Navigate to SendAmount screen with pre-filled data
                            logger.info('Navigating to SendAmount with data', {
                              contact: contact.name,
                              amount,
                              currency,
                              groupId: request.data?.groupId
                            });

                            navigation.navigate('SendAmount', {
                              destinationType: 'friend',
                              contact: contact,
                              groupId: request.data?.groupId,
                              prefilledAmount: amount,
                              prefilledNote: `Payment request from ${contact.name}`,
                              fromNotification: false,
                              requestId: request.data?.requestId || request.id
                            });
                          } catch (error) {
                            console.error('🔍 Dashboard: Error handling send payment:', error);
                            Alert.alert('Error', 'Failed to process payment request. Please try again.');
                          }
                        }}
                      >
                        <LinearGradient
                          colors={[colors.green, colors.greenLight]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.requestSendButtonGradient}
                        >
                          <Text style={styles.requestSendButtonTextNew}>Send</Text>
                        </LinearGradient>
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
                  <UserAvatar
                    displayName={paymentRequests[2].data?.senderName || 'U'}
                    size={40}
                    style={styles.requestAvatarNew}
                  />
                  <View style={[styles.requestContent, styles.requestPreviewContent]}>
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

        {/* Transactions Section (second) */}
        <View style={styles.requestsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {loadingTransactions || realTransactions.length === 0 ? (
            realTransactions.length === 0 ? (
              <View style={styles.emptyRequestsState}>
                <Text style={styles.emptyRequestsText}>No transactions</Text>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primaryGreen} />
                <Text style={styles.loadingText}>Loading transactions...</Text>
              </View>
            )
          ) : (
            <>
              {realTransactions.slice(0, 3).map(t => renderRealTransaction(t))}
            </>
          )}
        </View>

      </ScrollView>


      {/* Wallet Selector Modal */}
      <WalletSelectorModal
        visible={walletSelectorVisible}
        onClose={() => setWalletSelectorVisible(false)}
      />

      {/* QR Code Screen */}
      <Modal
        visible={showQRCodeScreen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowQRCodeScreen(false)}
      >
        <QRCodeScreen
          onBack={() => setShowQRCodeScreen(false)}
          userPseudo={currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
          userWallet={currentUser?.wallet_address || ''}
          qrValue={currentUser?.wallet_address || ''}
        />
      </Modal>

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



