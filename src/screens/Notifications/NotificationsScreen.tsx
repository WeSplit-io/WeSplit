import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import { NotificationCard } from '../../components/notifications';
import RequestCard from '../../components/requests/RequestCard';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { collection, doc, getDoc, getDocs, query, where, serverTimestamp, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import { getReceivedPaymentRequests } from '../../services/payments/firebasePaymentRequestService';
import { Container } from '../../components/shared';
import Header from '../../components/shared/Header';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { 
  CheckCircle, 
  ArrowClockwise, 
  User, 
  HandCoins, 
  PiggyBank, 
  Warning, 
  WarningCircle 
} from 'phosphor-react-native';
import styles from './styles';

// Import the unified NotificationData interface
import { NotificationData } from '../../types/notifications';

const NotificationsScreen: React.FC<any> = ({ navigation }) => {
  const { state, notifications, loadNotifications, refreshNotifications, acceptSplitInvitation } = useApp();

  // State variables
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionStates, setActionStates] = useState<Record<string, any>>({});
  const [fadeAnimations, setFadeAnimations] = useState<Record<string, any>>({});
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationData[]>([]);

  // Function to fetch user data from Firebase
  const fetchUserData = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Function to standardize notification data
  const standardizeNotificationData = (notification: any) => {
    const data = notification.data || {};
    return {
      senderId: data.senderId || data.fromUser || data.userId || '',
      senderName: data.senderName || data.fromUserName || data.userName || 'Unknown User',
      amount: data.amount || 0,
      currency: data.currency || 'USDC',
      requestId: data.requestId || data.id || '',
      description: data.description || data.note || '',
      note: data.note || data.description || '',
      splitId: data.splitId || '',
      splitWalletId: data.splitWalletId || '',
      splitType: data.splitType || 'fair',
      billName: data.billName || '',
      participantAmount: data.participantAmount || 0,
      totalAmount: data.totalAmount || 0,
      transactionId: data.transactionId || '',
      transactionHash: data.transactionHash || '',
      status: data.status || 'pending',
      shareableLink: data.shareableLink || '',
      splitInvitationData: data.splitInvitationData || '',
      timestamp: data.timestamp || notification.created_at || new Date().toISOString()
    };
  };

  // Function to log notification data for debugging
  const logNotificationData = (data: any, context: string, type: string) => {
    console.log(`📱 ${context} - ${type}:`, {
      senderId: data.senderId,
      senderName: data.senderName,
      amount: data.amount,
      currency: data.currency,
      requestId: data.requestId,
      splitId: data.splitId,
      splitType: data.splitType,
      billName: data.billName,
      participantAmount: data.participantAmount,
      totalAmount: data.totalAmount
    });
  };

  // Function to show toast message
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Show alert for now - you can implement a toast library here
    Alert.alert(
      type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info',
      message,
      [{ text: 'OK' }]
    );
  };

  // Function to handle notification press
  const handleNotificationPress = async (notification: any) => {
    try {
      console.log('🔔 Handling notification press:', {
        type: notification.type,
        data: notification.data,
        id: notification.id
      });

      // Navigate based on notification type
      if (notification.type === 'split_invite') {
        // Handle split invitation by accepting it first, then navigating to split details
        const splitId = notification.data?.splitId;
        if (splitId && state.currentUser?.id) {
          try {
            // Call acceptSplitInvitation with correct parameters: notificationId first, then splitId
            if (acceptSplitInvitation) {
              await acceptSplitInvitation(notification.id, splitId);
            }
            showToast('Split invitation accepted!');
            // Navigate to splits list first, then to split details
            navigation.navigate('SplitsList');
            setTimeout(() => {
              navigation.navigate('SplitDetails', { 
                splitId,
                isFromNotification: true,
                notificationId: notification.id
              });
            }, 100);
          } catch (error) {
            console.error('Error accepting split invitation:', error);
            showToast('Failed to accept split invitation', 'error');
          }
        } else {
          console.error('Missing splitId or user not authenticated');
          showToast('Invalid invitation data', 'error');
        }
      } else if (notification.type === 'payment_request') {
        // Handle payment request notification
        try {
          console.log('💰 Processing payment request notification:', notification);
          
          const standardizedData = standardizeNotificationData(notification);
          console.log('📊 Standardized data:', standardizedData);
          
          logNotificationData(standardizedData, 'Payment request handling', notification.type);

          const { senderId: requesterId, amount, currency, requestId } = standardizedData;
          
          console.log('🔍 Extracted data:', { requesterId, amount, currency, requestId });

          if (!requesterId) {
            throw new Error('No requester ID found in notification data');
          }

          // Fetch user data for the requester
          console.log('👤 Fetching user data for requester:', requesterId);
          const requesterData = await fetchUserData(requesterId);
          console.log('👤 Fetched requester data:', requesterData);
          
          if (!requesterData) {
            throw new Error('Could not fetch requester data');
          }

          console.log('🚀 Navigating to Send screen with data:', {
            destinationType: 'friend',
            contact: {
              id: requesterId,
              name: requesterData.name || 'Unknown User',
              email: requesterData.email || '',
              wallet_address: requesterData.wallet_address || '',
              avatar: requesterData.avatar || null
            },
            prefilledAmount: amount,
            prefilledNote: `Payment request from ${requesterData.name}`,
            requestId: requestId
          });

          // Navigate to send screen with prefilled data
          navigation.navigate('Send', {
            destinationType: 'friend',
            contact: {
              id: requesterId,
              name: requesterData.name || 'Unknown User',
              email: requesterData.email || '',
              wallet_address: requesterData.wallet_address || '',
              avatar: requesterData.avatar || null
            },
            prefilledAmount: amount,
            prefilledNote: `Payment request from ${requesterData.name}`,
            requestId: requestId
          });
          
          console.log('✅ Successfully navigated to Send screen');
        } catch (error) {
          console.error('❌ Error handling payment request:', error);
          showToast(`Failed to process payment request: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
      } else if (notification.type === 'payment_sent' || notification.type === 'payment_received' || notification.type === 'money_sent' || notification.type === 'money_received') {
        // Handle payment sent/received notifications
        console.log('💸 Processing payment notification:', notification);
        
        const transactionId = notification.data?.transactionId || notification.data?.tx_hash || notification.data?.signature;
        console.log('🔍 Transaction ID found:', transactionId);
        
        if (transactionId) {
          console.log('🚀 Navigating to TransactionHistory with transactionId:', transactionId);
          // Navigate to transaction history
          navigation.navigate('TransactionHistory', { transactionId });
        } else {
          console.warn('⚠️ No transaction ID found in notification data:', notification.data);
          showToast('Transaction ID not found in notification', 'error');
        }
      } else if (notification.type === 'split_completed') {
        // Handle split completion notification
        const splitId = notification.data?.splitId;
        if (splitId) {
          // Navigate to splits list first, then to split details
          navigation.navigate('SplitsList');
          setTimeout(() => {
            navigation.navigate('SplitDetails', { splitId });
          }, 100);
        }
      } else if (notification.type === 'split_payment_required') {
        // Handle split payment required notification
        const splitId = notification.data?.splitId;
        if (splitId) {
          // Navigate to splits list first, then to split payment
          navigation.navigate('SplitsList');
          setTimeout(() => {
            navigation.navigate('SplitPayment', { splitId });
          }, 100);
        }
      } else {
        // Default handling for other notification types
        console.log('Unhandled notification type:', notification.type);
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
      showToast('Failed to process notification', 'error');
    }
  };

  // Function to mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        read_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Function to delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Function to get notification icon
  const getNotificationIcon = (type: string, size: number = 24) => {
    switch (type) {
      case 'payment_request':
        return <HandCoins size={size} color={colors.warning} weight="fill" />;
      case 'payment_sent':
        return <ArrowClockwise size={size} color={colors.info} weight="fill" />;
      case 'payment_received':
        return <CheckCircle size={size} color={colors.green} weight="fill" />;
      case 'split_invite':
        return <User size={size} color={colors.primaryGreen} weight="fill" />;
      case 'split_completed':
        return <CheckCircle size={size} color={colors.green} weight="fill" />;
      case 'split_payment_required':
        return <HandCoins size={size} color={colors.red} weight="fill" />;
      case 'split_lock_required':
        return <HandCoins size={size} color={colors.red} weight="fill" />;
      case 'payment_reminder':
        return <Warning size={size} color={colors.warning} weight="fill" />;
      case 'general':
        return <WarningCircle size={size} color={colors.GRAY} weight="fill" />;
      default:
        return <WarningCircle size={size} color={colors.GRAY} weight="fill" />;
    }
  };

  // Function to get notification color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment_request':
        return colors.warning;
      case 'payment_sent':
        return colors.info;
      case 'payment_received':
        return colors.green;
      case 'split_invite':
        return colors.primaryGreen;
      case 'split_completed':
        return colors.green;
      case 'split_payment_required':
        return colors.red;
      default:
        return colors.GRAY;
    }
  };

  // Function to format notification time
  const formatNotificationTime = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  // Function to load and process notifications
  const loadAndProcessNotifications = useCallback(async () => {
    try {
      const processedNotifications = await getDisplayNotifications();
      setFilteredNotifications(processedNotifications);
      console.log('🔍 Loaded notifications:', processedNotifications.length, 'Payment requests:', processedNotifications.filter(n => n.type === 'payment_request').length);
    } catch (error) {
      console.error('Error processing notifications:', error);
    }
  }, [notifications, state.currentUser?.id]);

  // Function to handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (refreshNotifications) {
        await refreshNotifications();
      }
      // Also reload and process notifications
      await loadAndProcessNotifications();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshNotifications, loadAndProcessNotifications]);

  // Function to handle refresh (alias for compatibility)
  const onRefresh = handleRefresh;

  // Function to handle notification actions
  const notificationActionHandler = useCallback(async (notification: NotificationData) => {
    try {
      // Handle different notification actions based on notification type
      if (notification.type === 'payment_request') {
        // Handle payment request
        console.log('Handling payment request:', notification.id);
      } else if (notification.type === 'split_invite') {
        // Handle split invitation - accept it and redirect to split details
        const splitId = notification.data?.splitId;
        if (splitId && state.currentUser?.id) {
          try {
            // Set action state to pending
            setActionStates(prev => ({ ...prev, [notification.id]: 'pending' }));
            
            // Call acceptSplitInvitation with correct parameters: notificationId first, then splitId
            if (acceptSplitInvitation) {
              await acceptSplitInvitation(notification.id, splitId);
            }
            
            // Set action state to completed
            setActionStates(prev => ({ ...prev, [notification.id]: 'completed' }));
            
            showToast('Split invitation accepted!');
            
            // Navigate to splits list first, then to split details
            navigation.navigate('SplitsList');
            setTimeout(() => {
              navigation.navigate('SplitDetails', { 
                splitId,
                isFromNotification: true,
                notificationId: notification.id
              });
            }, 100);
          } catch (error) {
            console.error('Error accepting split invitation:', error);
            // Set action state to error
            setActionStates(prev => ({ ...prev, [notification.id]: 'error' }));
            showToast('Failed to accept split invitation', 'error');
          }
        } else {
          console.error('Missing splitId or user not authenticated');
          showToast('Invalid invitation data', 'error');
        }
      } else {
        // Default action - mark as read
        await markAsRead(notification.id);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  }, [state.currentUser?.id, acceptSplitInvitation, navigation, showToast]);

  // Function to handle RequestCard send press
  const handleRequestCardSendPress = useCallback(async (request: any) => {
    try {
      console.log('🚀 Handling RequestCard send press:', request);
      
      // Use the same logic as handleNotificationPress for payment_request
      const standardizedData = standardizeNotificationData(request);
      const { senderId: requesterId, amount, currency, requestId } = standardizedData;
      
      if (!requesterId) {
        throw new Error('No requester ID found in request data');
      }

      // Fetch user data for the requester
      const requesterData = await fetchUserData(requesterId);
      
      if (!requesterData) {
        throw new Error('Could not fetch requester data');
      }

      // Navigate to send screen with prefilled data
      navigation.navigate('Send', {
        destinationType: 'friend',
        contact: {
          id: requesterId,
          name: requesterData.name || 'Unknown User',
          email: requesterData.email || '',
          wallet_address: requesterData.wallet_address || '',
          avatar: requesterData.avatar || null
        },
        prefilledAmount: amount,
        prefilledNote: `Payment request from ${requesterData.name}`,
        requestId: requestId
      });
      
      console.log('✅ Successfully navigated to Send screen from RequestCard');
    } catch (error) {
      console.error('❌ Error handling RequestCard send press:', error);
      showToast(`Failed to process payment request: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }, [navigation, fetchUserData, standardizeNotificationData, showToast]);

  // Load notifications on component mount
  useEffect(() => {
    const loadNotificationsData = async () => {
      setLoading(true);
      try {
        if (loadNotifications) {
          await loadNotifications();
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotificationsData();
  }, [loadNotifications]);

  // Process notifications when they change
  useEffect(() => {
    if (notifications && state.currentUser?.id) {
      loadAndProcessNotifications();
    }
  }, [notifications, state.currentUser?.id, loadAndProcessNotifications]);




  // Transform real notifications to match NotificationData interface and create unified timeline
  const getDisplayNotifications = async (): Promise<NotificationData[]> => {
    const realNotifications = notifications || [];
    
    // Load payment requests from Firebase (like DashboardScreen does)
    let firebasePaymentRequests: any[] = [];
    if (state.currentUser?.id) {
      try {
        firebasePaymentRequests = await getReceivedPaymentRequests(state.currentUser.id, 10);
        console.log('🔥 Loaded Firebase payment requests:', firebasePaymentRequests.length, firebasePaymentRequests);
      } catch (error) {
        console.error('Error loading Firebase payment requests:', error);
      }
    }
    
    // Transform Firebase payment requests to notification format
    const firebaseRequestNotifications: NotificationData[] = firebasePaymentRequests
      .filter(req => req.amount > 0 && req.status !== 'completed')
      .map(req => ({
        id: `firebase_${req.id}`,
        userId: state.currentUser?.id || '',
        user_id: state.currentUser?.id || '',
        type: 'payment_request' as const,
        title: 'Payment Request',
        message: `${req.senderName} has requested ${req.amount} ${req.currency}${req.description ? ` for ${req.description}` : ''}`,
        created_at: req.created_at,
        is_read: false,
        status: req.status,
        data: {
          requestId: req.id,
          senderId: req.senderId,
          senderName: req.senderName,
          amount: req.amount,
          currency: req.currency,
          description: req.description,
          status: req.status
        }
      }));
    
    // Transform real notifications to match NotificationData interface
    const transformedNotifications: NotificationData[] = realNotifications.map((notification: any) => {
      // Map notification types to match the expected interface
      let mappedType: NotificationData['type'] = 'general';
      
      switch (notification.type) {
        case 'payment_request':
          mappedType = 'payment_request';
          break;
        case 'payment_sent':
          mappedType = 'money_sent';
          break;
        case 'payment_received':
          mappedType = 'payment_received';
          break;
        case 'split_invite':
          mappedType = 'split_invite';
          break;
        case 'split_completed':
          mappedType = 'split_completed';
          break;
        case 'split_payment_required':
          mappedType = 'split_lock_required';
          break;
        case 'payment_reminder':
          mappedType = 'payment_reminder';
          break;
        default:
          mappedType = 'general';
      }

      return {
        id: notification.id,
        userId: notification.userId || notification.user_id || '',
        user_id: notification.userId || notification.user_id || '', // For backward compatibility
        type: mappedType,
        title: notification.title || '',
        message: notification.message || '',
        created_at: notification.created_at,
        is_read: notification.is_read || false,
        status: notification.data?.status || 'pending',
        data: notification.data || {}
      };
    });
    
    // Combine Firebase payment requests with regular notifications
    const processedIds = new Set<string>();
    const allNotifications: NotificationData[] = [];
    
    // Add Firebase payment requests first
    firebaseRequestNotifications.forEach(req => {
      if (req.data?.requestId) {
        processedIds.add(req.data.requestId);
        allNotifications.push(req);
      }
    });
    
    // Add regular notifications, avoiding duplicates
    transformedNotifications.forEach(notification => {
      if (notification.type === 'payment_request') {
        // Skip if we already have this payment request from Firebase
        if (processedIds.has(notification.data?.requestId)) {
          return;
        }
      }
      allNotifications.push(notification);
    });
    
    // Show all notifications including payment_request (no filtering by tabs)
    const filteredNotifications = allNotifications.filter((n: NotificationData) => {
      // Show payment_request if not completed
      if (n.type === 'payment_request') {
        return n.data?.status !== 'completed';
      }
      // Show all other notification types
      return true;
    });

    // Sort by timestamp (newest first)
    return filteredNotifications.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeB - timeA;
    });
  };

  // Debug: Log the notifications to understand what we're working with
  console.log('🔍 NotificationsScreen - Total:', notifications?.length || 0, 'Filtered:', filteredNotifications.length, 'Payment requests:', filteredNotifications.filter(n => n.type === 'payment_request').length);

  if (loading) {
    return (
      <Container>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      {/* Header */}
      <Header 
        title="Notifications"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <PhosphorIcon name="ArrowClockwise" size={20} color={colors.white} />
          </TouchableOpacity>
        }
      />


      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A5EA15"
            titleColor="#FFF"
          />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fnotif-empty-state.png?alt=media&token=c2a67bb0-0e1b-40b0-9467-6e239f41a166' }} style={styles.emptyStateIcon} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You have no notifications yet.
              Please come back later.
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification, index) => {
            // Use RequestCard for payment_request notifications
            if (notification.type === 'payment_request') {
              return (
                <RequestCard
                  key={notification.id}
                  request={notification}
                  index={index}
                  onSendPress={handleRequestCardSendPress}
                />
              );
            }
            
            // Use NotificationCard for all other notification types
            return (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onPress={handleNotificationPress}
                onActionPress={notificationActionHandler}
                actionState={actionStates[notification.id]}
                fadeAnimation={fadeAnimations[notification.id]}
              />
            );
          })
        )}
      </ScrollView>
    </Container>
  );
};


export default NotificationsScreen;