import React, { useEffect, useState, useCallback } from 'react';
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
import { styles, BG_COLOR, GREEN } from './styles';
import { colors, spacing } from '../../theme';
import { AuthGuard } from '../../components/auth';
import NavBar from '../../components/shared/NavBar';
import UserAvatar from '../../components/UserAvatar';
import { WalletSelectorModal } from '../../components/wallet';
import { Container } from '../../components/shared';
import { QRCodeScreen } from '../QRCode';
import { TransactionModal } from '../../components/transactions';
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
  
  // Loading States
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  const [initialRequestsLoaded, setInitialRequestsLoaded] = useState(false);
  
  // Local wallet state (fallback when WalletContext fails)
  const [localAppWalletBalance, setLocalAppWalletBalance] = useState<number | null>(null);
  const [localAppWalletAddress, setLocalAppWalletAddress] = useState<string | null>(null);
  const [localAppWalletConnected, setLocalAppWalletConnected] = useState(false);

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
      });

      navigation.navigate('SendAmount', {
        destinationType: 'friend',
        contact: contact,
        prefilledAmount: amount,
        prefilledNote: `Payment request from ${contact.name}`,
        fromNotification: false,
        requestId: request.data?.requestId || request.id
      });
    } catch (error) {
      console.error('🔍 Dashboard: Error handling send payment:', error);
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

  // Simplified balance loading using the new wallet service
  const loadWalletBalance = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      logger.debug('Loading wallet balance with simplified service', null, 'DashboardScreen');
      
      // Ensure the user has a wallet (recover or create)
      const walletResult = await walletService.ensureUserWallet(currentUser.id.toString(), currentUser.wallet_address);
      
      if (walletResult.success && walletResult.wallet) {
        // Update user's wallet information if it's different
        if (currentUser.wallet_address !== walletResult.wallet.address) {
          try {
            const updateData: any = {
              wallet_address: walletResult.wallet.address,
              wallet_public_key: walletResult.wallet.publicKey
            };
            
            // Only include defined fields to avoid Firebase errors
            const cleanUpdateData = Object.fromEntries(
              Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null)
            );
            
            await updateUser(cleanUpdateData);
          } catch (updateError) {
            logger.warn('Failed to update user wallet info', updateError, 'DashboardScreen');
          }
        }
        
        // Get the balance
        const balance = await walletService.getUserWalletBalance(currentUser.id.toString());
        if (balance && balance.totalUSD !== undefined) {
          logger.debug('Balance loaded successfully', { totalUSD: balance.totalUSD }, 'DashboardScreen');
          // Update the local state
          setLocalAppWalletBalance(balance.totalUSD);
          setLocalAppWalletAddress(walletResult.wallet.address);
          setLocalAppWalletConnected(true);
        }
      } else {
        logger.error('Failed to ensure wallet', walletResult.error, 'DashboardScreen');
      }
    } catch (error) {
      logger.error('Error loading wallet balance', error, 'DashboardScreen');
    }
  }, [currentUser?.id, currentUser?.wallet_address, updateUser]);

  // Load wallet balance when user changes
  useEffect(() => {
    if (currentUser?.id && isAuthenticated) {
      loadWalletBalance();
    }
  }, [currentUser?.id, isAuthenticated, loadWalletBalance]);

  // Removed group amount conversion logic

  // Load payment requests
  const loadPaymentRequests = useCallback(async () => {
    if (!currentUser?.id || loadingPaymentRequests) return;

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
            if (!r.data) r.data = {};
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


  // Removed group summary logic

  // Removed group summaries update logic

  // Removed group-related effects

  // Load transactions
  const loadTransactions = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setLoadingTransactions(true);
      const userTransactions = await firebaseDataService.transaction.getUserTransactions(currentUser.id.toString());
      
      // Preload user data for all transaction participants
      const userIds = new Set<string>();
      userTransactions.forEach(transaction => {
        if (transaction.from_user) userIds.add(transaction.from_user);
        if (transaction.to_user) userIds.add(transaction.to_user);
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

  // Load data when component comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && currentUser?.id) {
        // Only load data once to prevent infinite loops
        loadWalletBalance();
        loadTransactions();
        loadPaymentRequests();
      }
    }, [isAuthenticated, currentUser?.id]) // Removed function dependencies to prevent infinite loops
  );

  // Handle refresh parameters from navigation
  useEffect(() => {
    if (currentUser?.id) {
      const shouldRefreshBalance = route?.params?.refreshBalance;
      const shouldRefreshRequests = route?.params?.refreshRequests;
      
      if (shouldRefreshBalance || shouldRefreshRequests) {
        // Clear the parameters to prevent infinite loops
        navigation.setParams({ 
          refreshBalance: undefined,
          refreshRequests: undefined 
        });
        
        // Trigger appropriate refreshes
        if (shouldRefreshBalance) {
          loadWalletBalance();
          logger.info('Balance refresh triggered from navigation parameter', null, 'DashboardScreen');
        }
        
        if (shouldRefreshRequests) {
          loadPaymentRequests();
          refreshNotifications();
          logger.info('Requests refresh triggered from navigation parameter', null, 'DashboardScreen');
        }
      }
    }
  }, [route?.params?.refreshBalance, route?.params?.refreshRequests, currentUser?.id, navigation, loadWalletBalance, loadPaymentRequests, refreshNotifications]);

  // Load notifications when dashboard loads
  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      loadNotifications();
    }
  }, [isAuthenticated, currentUser?.id, loadNotifications]);

  // Removed group loading logic


  const onRefresh = async () => {
    if (!isAuthenticated || !currentUser?.id) return;

    try {
      logger.info('Manual refresh triggered', null, 'DashboardScreen');
      
      await Promise.all([
        loadWalletBalance(),
        refreshNotifications(),
        loadTransactions(),
        loadPaymentRequests()
      ]);

      logger.info('Refresh completed successfully', null, 'DashboardScreen');
    } catch (error) {
      logger.error('Error during refresh', error, 'DashboardScreen');
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

  const getTransactionTitle = async (transaction: Transaction) => {
    if (!transaction || !transaction.type) {return 'Transaction';}
    
    switch (transaction.type) {
      case 'send':
        // Use stored recipient name if available, otherwise fetch from database
        if (transaction.recipient_name) {
          return `Send to ${transaction.recipient_name}`;
        }
        try {
          const recipientName = await getUserDisplayName(transaction.to_user);
          return `Send to ${recipientName}`;
        } catch (error) {
          return `Send to ${transaction.to_user || 'Unknown'}`;
        }
      case 'receive':
        // Use stored sender name if available, otherwise fetch from database
        if (transaction.sender_name) {
          return `Received from ${transaction.sender_name}`;
        }
        try {
          const senderName = await getUserDisplayName(transaction.from_user);
          return `Received from ${senderName}`;
        } catch (error) {
          return `Received from ${transaction.from_user || 'Unknown'}`;
        }
      case 'deposit':
        return 'Deposit';
      case 'withdraw':
        return 'Withdraw';
      default:
        return 'Transaction';
    }
  };

  const getTransactionSource = (transaction: Transaction) => {
    if (!transaction || !transaction.type) {return 'Unknown';}
    
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
        return 'Unknown';
    }
  };

  const getTransactionAmount = (transaction: Transaction) => {
    if (!transaction || transaction.amount === undefined || transaction.amount === null) {
      return {
        amount: '0.00',
        color: colors.textLight
      };
    }
    
    const amount = transaction.amount;
    const isIncome = transaction.type === 'receive' || transaction.type === 'deposit';

    return {
      amount: amount.toFixed(2),
      color: isIncome ? colors.primaryGreen : colors.textLight
    };
  };

  // Removed group expenses loading logic

  // Removed group transactions effect

  // Removed recent splits loading logic

  // Removed recent splits effect

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
            <Text style={styles.transactionSenderName}>
              {transaction.recipient_name || transaction.sender_name || 
               (transaction.type === 'send' ? `Send to ${transaction.to_user}` : 
                transaction.type === 'receive' ? `Received from ${transaction.from_user}` : 
                'Transaction')}
            </Text>
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
            <AvatarComponent
              avatar={currentUser?.avatar}
              displayName={currentUser?.name || currentUser?.email?.split('@')[0] || 'User'}
              style={styles.profileImage}
            />
            <View style={{ marginLeft: spacing.md }}>
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

          <View style={styles.balanceContainer}>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={[styles.balanceAmount, { textAlign: 'left', alignSelf: 'flex-start' }]}>
                $ {(localAppWalletBalance || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Wallet Address with Copy Button */}
          <TouchableOpacity
            style={styles.walletAddressContainer}
            onPress={() => copyWalletAddress(localAppWalletAddress || currentUser?.wallet_address || '')}
          >
            <Text style={styles.balanceLimitText}>
              {hashWalletAddress(localAppWalletAddress || currentUser?.wallet_address || '')}
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
              <Text style={styles.actionButtonText}>Link Wallet</Text>
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
              {paymentRequests.slice(0, 2).map((request, index) => (
                <RequestCard
                  key={request.id || index}
                  request={request}
                  index={index}
                  onSendPress={handleSendPress}
                  requestStyles={styles}
                />
              ))}

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
                      </Text>
                      <Text> requested a payment of </Text>
                      <Text style={styles.requestAmountGreen}>
                        {formatRequestAmount(paymentRequests[2].data?.amount || 0)} USDC
                      </Text>
                    </Text>
                    <Text style={styles.requestSource}>
                      from payment request
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
          userWallet={localAppWalletAddress || currentUser?.wallet_address || ''}
          qrValue={localAppWalletAddress || currentUser?.wallet_address || ''}
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

      {/* External Wallet Connection Modal */}
      {/* Removed as per edit hint */}

      <NavBar currentRoute="Dashboard" navigation={navigation} />
    </Container>
  );
};

export default DashboardScreen;



