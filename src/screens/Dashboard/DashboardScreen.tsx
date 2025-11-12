import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { 
  PaperPlaneTilt, 
  HandCoins, 
  ArrowLineDown, 
  Link,
  QrCode,
  Bell
} from 'phosphor-react-native';
import { styles, BG_COLOR, GREEN } from './styles';
import { colors, spacing } from '../../theme';
import { AuthGuard } from '../../components/auth';
import NavBar from '../../components/shared/NavBar';
import Avatar from '../../components/shared/Avatar';
import { WalletSelectorModal } from '../../components/wallet';
import { Container, ModernLoader, ErrorScreen, Button } from '../../components/shared';
import { QRCodeScreen } from '../QRCode';
import { TransactionModal, TransactionItem } from '../../components/transactions';
import { useApp } from '../../context/AppContext';
import { Transaction } from '../../types';
import { getReceivedPaymentRequests } from '../../services/payments/firebasePaymentRequestService';
import { walletService, UserWalletBalance } from '../../services/blockchain/wallet';
import { firebaseDataService } from '../../services/data';
import { getUserDisplayName, preloadUserData } from '../../services/shared/dataUtils';
import { logger } from '../../services/analytics/loggingService';
import { db } from '../../config/firebase/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { RequestCard } from '../../components/requests';
import { useLiveBalance } from '../../hooks/useLiveBalance';
import { useWalletState } from '../../hooks/useWalletState';
import { secureVault, isVaultAuthenticated } from '../../services/security/secureVault';
import BadgeDisplay from '../../components/profile/BadgeDisplay';
import ProfileAssetDisplay from '../../components/profile/ProfileAssetDisplay';
import AsyncStorage from '@react-native-async-storage/async-storage';



interface DashboardScreenProps {
  navigation: any;
  route?: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation, route }) => {
  const { state, notifications, loadNotifications, refreshNotifications, updateUser } = useApp();
  const { currentUser, isAuthenticated } = state;
  
  // Biometric authentication state
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authenticationError, setAuthenticationError] = useState<string | null>(null);
  const hasAuthenticatedRef = useRef(false);

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
  // Removed WalletContext usage to prevent infinite loading issues
  // Using simplified wallet service directly instead

  // Removed group-related logic

  // UI State
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [walletSelectorVisible, setWalletSelectorVisible] = useState(false);
  const [showQRCodeScreen, setShowQRCodeScreen] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [realTransactions, setRealTransactions] = useState<Transaction[]>([]);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  
  // Loading States
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [initialRequestsLoaded, setInitialRequestsLoaded] = useState(false);
  
  // Unified wallet state
  const { 
    address: walletAddress, 
    totalUSD: walletBalance, 
    isConnected: walletConnected,
    isLoading: walletLoading,
    error: walletError,
    refreshWallet
  } = useWalletState(currentUser?.id);

  // Authenticate with Face ID before rendering dashboard (only once per session)
  useEffect(() => {
    const authenticate = async () => {
      if (!isAuthenticated || !currentUser?.id) {
        setIsAuthenticating(false);
        hasAuthenticatedRef.current = false;
        return;
      }

      // If already authenticated, skip re-authentication
      if (hasAuthenticatedRef.current && isVaultAuthenticated()) {
        logger.debug('Dashboard: Already authenticated, skipping re-authentication', null, 'DashboardScreen');
        setIsAuthenticating(false);
        return;
      }

      try {
        setIsAuthenticating(true);
        setAuthenticationError(null);
        
        // Pre-authenticate to trigger Face ID/Touch ID OR device passcode once before any vault access
        // Note: This will use biometrics if available, otherwise fall back to device passcode
        // In simulators, Keychain won't work, but SecureStore fallback will still work
        // preAuthenticate() is idempotent - it won't prompt again if already authenticated
        const authenticated = await secureVault.preAuthenticate();
        
        if (authenticated) {
          logger.info('Authentication successful (biometrics or passcode)', null, 'DashboardScreen');
          hasAuthenticatedRef.current = true;
          setIsAuthenticating(false);
        } else {
          // Keychain authentication failed (common in simulators or if user cancels)
          // This is okay - SecureStore fallback will work for vault access
          // Don't block the user, just log and continue
          logger.info('Keychain authentication not available (using SecureStore fallback)', null, 'DashboardScreen');
          hasAuthenticatedRef.current = true; // Mark as done even if Keychain failed
          setIsAuthenticating(false);
          // No error - app will work with SecureStore fallback
        }
      } catch (error) {
        logger.error('Biometric authentication error', error, 'DashboardScreen');
        setAuthenticationError('Failed to authenticate. Please try again.');
        hasAuthenticatedRef.current = false; // Allow retry on error
        setIsAuthenticating(false);
      }
    };

    authenticate();
  }, [isAuthenticated, currentUser?.id]);

  // Function to hash wallet address for display
  const hashWalletAddress = (address: string): string => {
    if (!address || address.length < 8) {return address;}
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Function to copy wallet address to clipboard
  const copyWalletAddress = async (address: string) => {
    try {
      await Clipboard.setStringAsync(address);
      Alert.alert('Copied', 'Wallet address copied to clipboard');
    } catch (error) {
      logger.error('Failed to copy wallet address', error as Record<string, unknown>, 'DashboardScreen');
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

  // Helper function to format amount with appropriate decimal places
  const formatRequestAmount = (amount: number): string => {
    // If amount has decimal places, show up to 2 decimals
    if (amount % 1 !== 0) {
      return amount.toFixed(2);
    }
    // If it's a whole number, show with 1 decimal for consistency
    return amount.toFixed(1);
  };

  // Handle send payment from request
  const handleSendPress = async (request: any) => {
    try {
      const amount = request.data?.amount || 0;
      const currency = request.data?.currency || 'USDC';
      const senderName = request.data?.senderName || 'Unknown User';

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
        logger.error('No sender ID found in request data', { requestData: request.data }, 'DashboardScreen');
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
      
      // Get the original message from the request
      const requestDescription = request.data?.description || request.data?.note || '';
      const hasValidDescription = requestDescription && requestDescription.trim().length > 0;
      const prefilledNote = hasValidDescription 
        ? `"${requestDescription.trim()}"` 
        : `Payment request from ${contact.name}`;

      logger.info('Navigating to SendAmount with data', {
        contact: contact.name,
        amount,
        currency,
        requestDescription,
        hasValidDescription,
        prefilledNote
      });

      navigation.navigate('SendAmount', {
        destinationType: 'friend',
        contact: contact,
        prefilledAmount: amount,
        prefilledNote: prefilledNote,
        fromNotification: false,
        requestId: request.data?.requestId || request.id
      });
    } catch (error) {
      logger.error('Error handling send payment', error as Record<string, unknown>, 'DashboardScreen');
      Alert.alert('Error', 'Failed to process payment request. Please try again.');
    }
  };

  // Removed group-related balance calculations

  // Load notification count from context notifications
  useEffect(() => {
    if (notifications) {
      const unreadCount = notifications.filter(n => !n.is_read).length;
      setUnreadNotifications(unreadCount);
    }
  }, [notifications]);

  // Live balance updates
  const { balance: liveBalance, isLoading: liveBalanceLoading, error: liveBalanceError } = useLiveBalance(
    currentUser?.wallet_address || null,
    {
      enabled: !!currentUser?.wallet_address,
      onBalanceChange: (update) => {
        logger.info('Live balance update received', {
          address: update.address,
          usdcBalance: update.usdcBalance,
          solBalance: update.solBalance
        }, 'DashboardScreen');
        
        // Live balance updates are handled by useWalletState hook
        // No need to update local state here
      }
    }
  );

  // Calculate effective balance - use live balance as fallback when wallet state fails
  const effectiveBalance = React.useMemo(() => {
    // If wallet state has a valid balance, use it
    if (walletBalance && walletBalance > 0) {
      logger.debug('Using wallet balance', { walletBalance }, 'DashboardScreen');
      return walletBalance;
    }
    
    // If wallet state failed but we have live balance data, use it
    if (liveBalance && liveBalance.usdcBalance !== undefined) {
      logger.debug('Using live balance as fallback', { 
        liveBalance: liveBalance.usdcBalance, 
        walletBalance,
        walletError 
      }, 'DashboardScreen');
      return liveBalance.usdcBalance;
    }
    
    // Fallback to 0
    logger.debug('Using fallback balance of 0', { walletBalance, liveBalance }, 'DashboardScreen');
    return 0;
  }, [walletBalance, liveBalance, walletError]);

  // Wallet balance is now handled by useWalletState hook

  // Wallet state is automatically managed by useWalletState hook

  // Removed group amount conversion logic

  // Load payment requests
  const loadPaymentRequests = useCallback(async () => {
    if (!currentUser?.id || loadingPaymentRequests) {return;}

    setLoadingPaymentRequests(true);
    try {
      logger.debug('Loading payment requests', null, 'DashboardScreen');
      
      // Get payment requests from Firebase
      const firebaseRequests = await getReceivedPaymentRequests(currentUser.id, 10);
      
      // Get notification requests (exclude completed ones)
      const notificationRequests = notifications?.filter(n =>
        n.type === 'payment_request' &&
        (n.data?.amount || 0) > 0 &&
        n.data?.status !== 'completed' &&
        !n.is_read
      ) || [];

      // Combine and deduplicate requests
      const processedIds = new Set<string>();
      const allRequests: any[] = [];

      // Add Firebase requests first
      firebaseRequests
        .filter(req => req.amount > 0)
        .forEach(req => {
          processedIds.add(req.id);
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
              status: req.status
            },
            is_read: false,
            created_at: req.created_at
          });
        });

      // Add notification requests that don't duplicate Firebase requests
      notificationRequests
        .filter(n => {
          const requestId = n.data?.requestId;
          return !requestId || !processedIds.has(requestId);
        })
        .forEach(n => allRequests.push(n));

      // Sort by creation date (latest first)
      allRequests.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      // Enrich with sender avatars
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
            if (!r.data) {r.data = {};}
            const sid = r.data.senderId ? String(r.data.senderId) : undefined;
            const existing = r.data.senderAvatar && r.data.senderAvatar.trim() !== '';
            if (!existing && sid && idToAvatar[sid]) {
              r.data.senderAvatar = idToAvatar[sid];
            }
          });
        }
      } catch (e) {
        logger.warn('Could not enrich sender avatars', { error: e }, 'DashboardScreen');
      }

      setPaymentRequests(allRequests);
      if (!initialRequestsLoaded) {
        setInitialRequestsLoaded(true);
      }
      
      logger.info('Payment requests loaded successfully', { count: allRequests.length }, 'DashboardScreen');
    } catch (error) {
      logger.error('Error loading payment requests', error, 'DashboardScreen');
      // Fallback to notifications only
      if (notifications) {
        const requests = notifications
          .filter(n =>
            n.type === 'payment_request' &&
            (n.data?.amount || 0) > 0
          )
          .sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
          });
        setPaymentRequests(requests);
      }
    } finally {
      setLoadingPaymentRequests(false);
    }
  }, [currentUser?.id, notifications, loadingPaymentRequests, initialRequestsLoaded]);

  // Load user names when transactions change
  useEffect(() => {
    if (realTransactions.length > 0) {
      loadUserNames(realTransactions);
    }
  }, [realTransactions]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    if (!currentUser?.id) {return;}

    try {
      setLoadingTransactions(true);
      const userTransactions = await firebaseDataService.transaction.getUserTransactions(currentUser.id.toString());
      
      // Preload user data for all transaction participants
      const userIds = new Set<string>();
      userTransactions.forEach(transaction => {
        if (transaction.from_user) {userIds.add(transaction.from_user);}
        if (transaction.to_user) {userIds.add(transaction.to_user);}
      });
      
      if (userIds.size > 0) {
        await preloadUserData(Array.from(userIds));
      }
      
      setRealTransactions(userTransactions);
    } catch (error) {
      logger.error('Error loading transactions', error, 'DashboardScreen');
    } finally {
      setLoadingTransactions(false);
    }
  }, [currentUser?.id]);

  // Track if initial load has been completed
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const isInitialLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Consolidated data loading - runs once when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const currentUserId = currentUser?.id;
      
      logger.debug('useFocusEffect triggered', { 
        isAuthenticated, 
        userId: currentUserId, 
        hasInitialLoad, 
        isInitialLoading: isInitialLoadingRef.current,
        lastUserId: lastUserIdRef.current,
        refreshBalance: route?.params?.refreshBalance,
        refreshRequests: route?.params?.refreshRequests
      }, 'DashboardScreen');
      
      // Check if user changed (login/logout)
      const userChanged = lastUserIdRef.current !== currentUserId;
      if (userChanged) {
        hasLoadedRef.current = false;
        setHasInitialLoad(false);
        lastUserIdRef.current = currentUserId || null;
        logger.info('User changed, resetting load state', { 
          previousUserId: lastUserIdRef.current, 
          currentUserId 
        }, 'DashboardScreen');
      }
      
      if (isAuthenticated && currentUserId && !isInitialLoadingRef.current) {
        // Only load data if it hasn't been loaded yet or if explicitly requested
        const shouldRefreshBalance = route?.params?.refreshBalance;
        const shouldRefreshRequests = route?.params?.refreshRequests;
        
        if (!hasLoadedRef.current || shouldRefreshBalance || shouldRefreshRequests) {
          // Only log if actually loading for the first time
          if (!hasLoadedRef.current && __DEV__) {
            logger.debug('Starting initial data load', null, 'DashboardScreen');
          }
          
          isInitialLoadingRef.current = true;
          
          // Load all data once when screen comes into focus
          if (!hasLoadedRef.current) {
            Promise.allSettled([
              loadTransactions(),
              loadPaymentRequests(),
              loadNotifications()
            ]).finally(() => {
              setHasInitialLoad(true);
              hasLoadedRef.current = true;
              isInitialLoadingRef.current = false;
              // Removed excessive logging
            });
          } else {
            // Handle navigation refresh parameters
            if (shouldRefreshBalance || shouldRefreshRequests) {
              // Clear the parameters to prevent infinite loops
              navigation.setParams({ 
                refreshBalance: undefined,
                refreshRequests: undefined 
              });
              
              // Trigger appropriate refreshes
              if (shouldRefreshBalance) {
                walletService.clearUserCache(currentUserId);
                refreshWallet();
              }
              
              if (shouldRefreshRequests) {
                loadPaymentRequests();
                refreshNotifications();
              }
            }
            isInitialLoadingRef.current = false;
          }
        }
      }
    }, [isAuthenticated, currentUser?.id, route?.params?.refreshBalance, route?.params?.refreshRequests])
  );

  // Removed separate useEffect for route parameter changes - now handled in useFocusEffect
  // This prevents duplicate calls when both useFocusEffect and useEffect trigger

  // Removed group loading logic


  const onRefresh = async () => {
    if (!isAuthenticated || !currentUser?.id) return;

    try {
      logger.info('Manual refresh triggered', null, 'DashboardScreen');
      
      // Clear cache before refresh to ensure fresh data
      walletService.clearUserCache(currentUser.id);
      
      // Use Promise.allSettled to prevent one failure from stopping others
      const results = await Promise.allSettled([
        refreshWallet(),
        refreshNotifications(),
        loadTransactions(),
        loadPaymentRequests()
      ]);

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(`Refresh operation ${index} failed`, result.reason, 'DashboardScreen');
        }
      });

      logger.info('Refresh completed', null, 'DashboardScreen');
    } catch (error) {
      logger.error('Error during refresh', error, 'DashboardScreen');
    }
  };

  // Load user names for transactions
  const loadUserNames = async (transactions: Transaction[]) => {
    const userIds = new Set<string>();
    
    transactions.forEach(transaction => {
      if (transaction.from_user) {userIds.add(transaction.from_user);}
      if (transaction.to_user) {userIds.add(transaction.to_user);}
    });

    const newUserNames = new Map(userNames);
    
    for (const userId of userIds) {
      if (!newUserNames.has(userId)) {
        try {
          const userName = await getUserDisplayName(userId);
          newUserNames.set(userId, userName);
        } catch (error) {
          newUserNames.set(userId, 'Unknown User');
        }
      }
    }
    
    setUserNames(newUserNames);
  };

  // Combine and sort requests and transactions chronologically
  const getCombinedActivities = () => {
    const activities: {
      id: string;
      type: 'request' | 'transaction';
      data: any;
      timestamp: Date;
    }[] = [];

    // Add payment requests
    paymentRequests.forEach((request) => {
      // Try different timestamp fields for requests
      const timestamp = request.data?.created_at || 
                       request.data?.timestamp || 
                       request.created_at || 
                       request.timestamp ||
                       new Date(); // fallback to current time
      
      activities.push({
        id: request.id || `request-${Math.random()}`,
        type: 'request',
        data: request,
        timestamp: new Date(timestamp)
      });
    });

    // Add transactions - filter by user perspective
    realTransactions.forEach((transaction) => {
      // Only show transactions from the user's perspective
      // For 'send' transactions: show only if current user is the sender
      // For 'receive' transactions: show only if current user is the recipient
      const shouldShowTransaction = 
        (transaction.type === 'send' && transaction.from_user === currentUser?.id) ||
        (transaction.type === 'receive' && transaction.to_user === currentUser?.id) ||
        (transaction.type === 'deposit') ||
        (transaction.type === 'withdraw');

      if (shouldShowTransaction) {
        activities.push({
          id: transaction.id || `transaction-${Math.random()}`,
          type: 'transaction',
          data: transaction,
          timestamp: new Date(transaction.created_at)
        });
      }
    });

    // Sort by timestamp (most recent first)
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  if (!isAuthenticated) {
    return <AuthGuard navigation={navigation}>{null}</AuthGuard>;
  }

  // Show loading screen while authenticating with Face ID
  if (isAuthenticating) {
    return (
      <ModernLoader
        size="large"
        text="Authenticating..."
      />
    );
  }

  // Show error screen if authentication failed
  if (authenticationError) {
    return (
      <ErrorScreen
        title="Authentication Required"
        message={authenticationError}
        onRetry={async () => {
              setIsAuthenticating(true);
              setAuthenticationError(null);
              hasAuthenticatedRef.current = false; // Reset to allow retry
              try {
                // Force re-authentication on retry
                const authenticated = await secureVault.preAuthenticate(true);
                if (authenticated) {
                  hasAuthenticatedRef.current = true;
                  setIsAuthenticating(false);
                } else {
                  setAuthenticationError('Authentication failed. Please try again.');
                  setIsAuthenticating(false);
                }
              } catch (error) {
                setAuthenticationError('Failed to authenticate. Please try again.');
                hasAuthenticatedRef.current = false;
                setIsAuthenticating(false);
              }
            }}
        retryText="Try Again"
      />
    );
  }

  // Removed groups loading state

  return (
    <Container>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
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
            <Avatar
              userId={currentUser?.id}
              userName={currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
              avatarUrl={currentUser?.avatar}
              style={styles.profileImage}
              size={50}
            />
            <View style={{ marginLeft: spacing.md }}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>
                {currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}!
              </Text>
              {currentUser?.badges && currentUser.badges.length > 0 && (
                <BadgeDisplay
                  badges={currentUser.badges}
                  activeBadge={currentUser.active_badge}
                  showAll={false}
                />
              )}
              {currentUser?.active_profile_asset && (
                <ProfileAssetDisplay
                  userId={currentUser.id}
                  profileAssets={currentUser.profile_assets}
                  activeProfileAsset={currentUser.active_profile_asset}
                  showProfileAsset={true}
                />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bellContainer}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Bell
              size={24}
              color={colors.white}
              weight="regular"
            />
            {unreadNotifications > 0 && (
              <LinearGradient
                colors={[colors.green, colors.greenBlue]}
                style={styles.bellBadge}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Development Test Buttons - Wallet Persistence */}
        {__DEV__ && (
          <>
            <TouchableOpacity
              onPress={async () => {
                Alert.alert(
                  '🧪 Test 1: App Update Scenario',
                  'This will clear AsyncStorage to simulate an app update.\n\nYour wallet should persist via Keychain/SecureStore.\n\nAfter clearing:\n1. Close app completely\n2. Reopen app\n3. Log in with same email\n4. Check if wallet address is the same',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear AsyncStorage',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await AsyncStorage.clear();
                          Alert.alert(
                            '✅ AsyncStorage Cleared',
                            'AsyncStorage has been cleared.\n\nNow:\n1. Close the app completely\n2. Reopen the app\n3. Log in with the same email\n4. Check if your wallet address is the same\n\nIf the wallet address matches, the test PASSED! ✅',
                            [{ text: 'OK' }]
                          );
                        } catch (error) {
                          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to clear AsyncStorage');
                        }
                      }
                    }
                  ]
                );
              }}
              style={{
                backgroundColor: '#FF9500',
                padding: 12,
                marginHorizontal: 20,
                marginTop: 10,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#FF6B00',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                🧪 Test 1: Simulate App Update (Clear AsyncStorage)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                Alert.alert(
                  '⚠️ Test 2: App Deletion Scenario',
                  'This simulates app deletion/reinstallation:\n• Clears ALL data (AsyncStorage, Keychain, MMKV)\n• Wallet will be LOST\n• Requires cloud backup or seed phrase to recover\n\n⚠️ WARNING: This will delete your wallet from this device!\n\nYou will need:\n• Cloud backup (with password), OR\n• Seed phrase to restore\n\nContinue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Simulate App Deletion',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const { WalletPersistenceTester } = await import('../../utils/testing/walletPersistenceTester');
                          const userId = currentUser?.id || '';
                          const userEmail = currentUser?.email || '';
                          
                          if (!userId) {
                            Alert.alert('Error', 'User not logged in');
                            return;
                          }

                          const result = await WalletPersistenceTester.testCompleteDataClear(userId, userEmail);
                          
                          Alert.alert(
                            result.success ? '✅ All Data Cleared' : '⚠️ Partial Clear',
                            result.message + '\n\n' + 
                            'Now:\n' +
                            '1. Close the app completely\n' +
                            '2. Reopen the app\n' +
                            '3. Log in with same email\n' +
                            '4. Try to recover wallet:\n' +
                            '   • From cloud backup (if available)\n' +
                            '   • From seed phrase (if saved)\n\n' +
                            '⚠️ If no backup exists, wallet is LOST!',
                            [{ text: 'OK' }]
                          );
                        } catch (error) {
                          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to clear all data');
                        }
                      }
                    }
                  ]
                );
              }}
              style={{
                backgroundColor: '#FF3B30',
                padding: 12,
                marginHorizontal: 20,
                marginTop: 10,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#CC0000',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                ⚠️ Test 2: Simulate App Deletion (Clear ALL Data)
              </Text>
            </TouchableOpacity>
          </>
        )}

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
                <QrCode size={30} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.balanceContainer}>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              {walletLoading || liveBalanceLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.white} style={{ marginRight: 8 }} />
                
                </View>
              ) : (
                <Text style={[styles.balanceAmount, { textAlign: 'left', alignSelf: 'flex-start' }]}>
                  $ {effectiveBalance.toFixed(2)}
                </Text>
              )}
            </View>
          </View>

          {/* Wallet Address with Copy Button */}
          <TouchableOpacity
            style={styles.walletAddressContainer}
            onPress={() => copyWalletAddress(walletAddress || currentUser?.wallet_address || '')}
          >
            <Text style={styles.balanceLimitText}>
              {hashWalletAddress(walletAddress || currentUser?.wallet_address || '')}
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
                  logger.error('Error connecting wallet', error as Record<string, unknown>, 'DashboardScreen');
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
                <PaperPlaneTilt size={26} color={colors.white} />
              </View>
              <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('RequestContacts')}
            >
              <View style={styles.actionButtonCircle}>
                <HandCoins size={26} color={colors.white} />
              </View>
              <Text style={styles.actionButtonText}>Request</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Deposit')}
            >
              <View style={styles.actionButtonCircle}>
                <ArrowLineDown size={26} color={colors.white} />
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
                <Link size={26} color={colors.white} />
              </View>
              <Text style={styles.actionButtonText}>Link Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>


        


        {/* Combined Activities Section */}
        <View style={styles.requestsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          {loadingTransactions || (paymentRequests.length === 0 && realTransactions.length === 0) ? (
            paymentRequests.length === 0 && realTransactions.length === 0 ? (
              <View style={styles.emptyRequestsState}>
                <Text style={styles.emptyRequestsText}>No recent activity</Text>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <ModernLoader size="small" text="Loading..." />
              </View>
            )
          ) : (
            <>
              {getCombinedActivities().slice(0, 5).map((activity) => {
                if (activity.type === 'request') {
                  const request = activity.data;
                  const index = paymentRequests.findIndex(r => r.id === request.id);
                  return (
                    <RequestCard
                      key={activity.id}
                      request={request}
                      index={index}
                      onSendPress={handleSendPress}
                    />
                  );
                } else {
                  const transaction = activity.data;
                  return (
                    <TransactionItem
                      key={activity.id}
                      transaction={transaction}
                      recipientName={userNames.get(transaction.to_user)}
                      senderName={userNames.get(transaction.from_user)}
                      onPress={(transaction) => {
                        setSelectedTransaction(transaction);
                        setTransactionModalVisible(true);
                      }}
                    />
                  );
                }
              })}
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
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowQRCodeScreen(false)}
      >
        <QRCodeScreen
          onBack={() => setShowQRCodeScreen(false)}
          userPseudo={currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
          userWallet={walletAddress || currentUser?.wallet_address || ''}
          qrValue={walletAddress || currentUser?.wallet_address || ''}
          navigation={navigation}
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



      <NavBar currentRoute="Dashboard" navigation={navigation} />
    </Container>
  );
};

export default DashboardScreen;



